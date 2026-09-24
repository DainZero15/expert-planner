import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatTime } from "@/lib/planning/week";

const dateLabel = new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long" });

type Customer = {
  name: string;
  address_line: string;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  notes: string | null;
};

type WorkBonMetadata = {
  imported_via?: string;
  seller?: string | null;
  technician_memo?: string | null;
  products?: string[];
  location_details?: string | null;
  team_size_suggestion?: number | null;
};

export default async function OrderPlanningPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const { data: order } = await db.from("orders")
    .select("id,source_order_number,customer_id,work_type,duration_minutes,required_people,status,metadata")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const [{ data: customerData }, { data: expertData }, { data: teamData }, { data: optionData }] = await Promise.all([
    db.from("customers").select("name,address_line,postal_code,city,phone,notes").eq("id", order.customer_id).maybeSingle(),
    db.from("experts").select("id,name,preferences").order("name"),
    db.from("order_experts").select("expert_id").eq("order_id", id),
    db.from("appointments").select("id,starts_at,selection_rank,status").eq("order_id", id).in("selection_rank", [1, 2, 3]).order("selection_rank"),
  ]);

  const customer = customerData as Customer | null;
  const experts = expertData ?? [];
  const options = optionData ?? [];
  const selected = new Set((teamData ?? []).map((teamMember) => teamMember.expert_id));
  const workBon = (order.metadata || {}) as WorkBonMetadata;

  return <main className="shell">
    <header className="topbar">
      <Link className="brand" href="/dashboard">Expert <span>Planner</span></Link>
      <Link href="/planning">Terug naar weekplanner</Link>
    </header>

    <section className="card">
      <div className="eyebrow">Order {order.source_order_number || "zonder nummer"}</div>
      <h1>{customer?.name || "Klant"}</h1>
      <p>{[customer?.address_line, customer?.postal_code, customer?.city].filter(Boolean).join(", ")}</p>
      {customer?.phone && <p>Telefoon: {customer.phone}</p>}
      <p><strong>{order.work_type || "Werksoort nog bepalen"}</strong> · {order.duration_minutes || 60} minuten · {order.required_people} persoon{order.required_people === 1 ? "" : "en"} nodig</p>
      {(workBon.seller || workBon.technician_memo || workBon.products?.length || workBon.location_details) && <div className="workbon-details">
        <h2>Werkbon</h2>
        {workBon.seller && <p><strong>Verkoper:</strong> {workBon.seller} <span className="muted">(geen monteur)</span></p>}
        {workBon.products?.length ? <p><strong>Producten:</strong> {workBon.products.join(" · ")}</p> : null}
        {workBon.location_details && <p><strong>Locatie:</strong> {workBon.location_details}</p>}
        {workBon.technician_memo && <p><strong>Instructie voor de monteur:</strong> {workBon.technician_memo}</p>}
      </div>}
    </section>

    <section className="card" style={{ marginTop: 20 }}>
      <h2>Team voor deze order</h2>
      <p className="muted">Kies minimaal {order.required_people} monteur{order.required_people === 1 ? "" : "s"}. Bij een tweepersoonslevering worden beide monteurs aan dezelfde order gekoppeld.</p>
      <form action={`/api/orders/${order.id}/team`} method="post">
        <div className="team-list">{experts.map((expert) => <label className="team-choice" key={expert.id}>
          <input type="checkbox" name="expertId" value={expert.id} defaultChecked={selected.has(expert.id)} />
          <span><strong>{expert.name}</strong><br /><small>{((expert.preferences as { skills?: string[] } | null)?.skills || []).join(", ") || "werksoorten nog invullen"}</small></span>
        </label>)}</div>
        <button type="submit">Team opslaan</button>
      </form>
    </section>

    <section className="card" style={{ marginTop: 20 }}>
      <h2>Plan A, B en C</h2>
      <p className="muted">Plan A is de gunstigste beschikbare routevolgorde. B en C bieden andere dagen en tijden. Definitief bevestigde afspraken worden nooit automatisch verplaatst.</p>
      {options.length ? <div className="option-grid">{options.map((option) => <article className="option" key={option.id}>
        <strong>Plan {String.fromCharCode(64 + (option.selection_rank || 1))}</strong>
        <p>{dateLabel.format(new Date(option.starts_at))}</p>
        <p><strong>{formatTime(option.starts_at)}</strong></p>
        {option.selection_rank === 1 && <span className="route-best">Beste route</span>}
        {option.status === "confirmed"
          ? <span className="tag">Definitief</span>
          : <form action={`/api/orders/${order.id}/confirm`} method="post"><input type="hidden" name="appointmentId" value={option.id} /><button type="submit">Deze optie bevestigen</button></form>}
      </article>)}</div> : <p className="muted">Nog geen routevoorstel voor deze order.</p>}
    </section>
  </main>;
}
