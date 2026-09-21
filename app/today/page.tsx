import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { createClient } from "@/lib/supabase/server";
import { addDays, amsterdamDate, dateKey, formatTime } from "@/lib/planning/week";
import styles from "./today.module.css";

type Appointment = { id: string; customer_id: string; order_id: string | null; expert_id: string | null; starts_at: string; ends_at: string; status: string; selection_rank: number | null };
type Customer = { id: string; name: string; address_line: string; postal_code: string | null; city: string | null };
type Order = { id: string; work_type: string | null };
const dayName = new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long" });

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const today = /^\d{4}-\d{2}-\d{2}$/.test(params.date || "") ? params.date! : amsterdamDate(new Date());
  const date = new Date(`${today}T12:00:00Z`);
  const tomorrow = dateKey(addDays(date, 1));
  const yesterday = dateKey(addDays(date, -1));
  const { data: appointmentData } = await db.from("appointments").select("id,customer_id,order_id,expert_id,starts_at,ends_at,status,selection_rank").gte("starts_at", `${today}T00:00:00.000Z`).lt("starts_at", `${tomorrow}T00:00:00.000Z`).order("starts_at");
  const appointments = ((appointmentData || []) as Appointment[]).filter((appointment) => appointment.status === "confirmed" || appointment.selection_rank === 1);
  const customerIds = [...new Set(appointments.map((appointment) => appointment.customer_id))];
  const orderIds = [...new Set(appointments.map((appointment) => appointment.order_id).filter((id): id is string => Boolean(id)))];
  const [{ data: customerData }, { data: orderData }, { data: expertData }] = await Promise.all([
    customerIds.length ? db.from("customers").select("id,name,address_line,postal_code,city").in("id", customerIds) : Promise.resolve({ data: [] as Customer[] }),
    orderIds.length ? db.from("orders").select("id,work_type").in("id", orderIds) : Promise.resolve({ data: [] as Order[] }),
    db.from("experts").select("id,name"),
  ]);
  const customers = new Map((customerData || []).map((customer) => [customer.id, customer as Customer]));
  const orders = new Map((orderData || []).map((order) => [order.id, order as Order]));
  const experts = new Map((expertData || []).map((expert) => [expert.id, expert.name as string]));

  return <main className={`shell ${styles.shell}`}>
    <header className="topbar"><Link className="brand" href="/dashboard">Expert <span>Planner</span></Link><AppNavigation /></header>
    <section className={`card ${styles.hero}`}><div><div className="eyebrow">Mobiele dagweergave</div><h1>Vandaag</h1><p className="muted">{dayName.format(date)} · {appointments.length} afspraak{appointments.length === 1 ? "" : "en"}</p></div><Link className="secondary" href="/planning">Open weekplanning</Link></section>
    <nav className={styles.controls} aria-label="Andere dag openen"><Link href={`/today?date=${yesterday}` as never}>← Vorige dag</Link><strong>{dayName.format(date)}</strong><Link href={`/today?date=${tomorrow}` as never}>Volgende dag →</Link></nav>
    <section className={styles.schedule} aria-label="Dagschema">
      {appointments.length ? appointments.map((appointment) => {
        const customer = customers.get(appointment.customer_id);
        const order = appointment.order_id ? orders.get(appointment.order_id) : undefined;
        return <Link key={appointment.id} className={`${styles.visit} ${appointment.status === "confirmed" ? styles.confirmed : ""}`} href={(appointment.order_id ? `/planning/order/${appointment.order_id}` : `/planning/customer/${appointment.customer_id}`) as never}>
          <time>{formatTime(appointment.starts_at)}<small>–{formatTime(appointment.ends_at)}</small></time>
          <div><strong>{customer?.name || "Ingepland bezoek"}</strong><b>{order?.work_type || "Werkzaamheden nog bepalen"}</b><span>{[customer?.address_line, customer?.postal_code, customer?.city].filter(Boolean).join(", ") || "Adres nog controleren"}</span>{appointment.expert_id && <em>Monteur: {experts.get(appointment.expert_id) || "Nog te bepalen"}</em>}</div>
        </Link>;
      }) : <article className={`card ${styles.empty}`}><h2>Geen afspraken</h2><p className="muted">Er zijn geen afspraken zichtbaar op deze dag. Kies een andere dag of maak eerst een weekvoorstel.</p><Link className="import-button" href="/planning">Naar weekplanning</Link></article>}
    </section>
  </main>;
}
