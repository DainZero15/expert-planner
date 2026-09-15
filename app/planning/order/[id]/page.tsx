import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatTime } from "@/lib/planning/week";

export default async function OrderPlanningPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const [{ data: order }, { data: expertData }, { data: optionData }] = await Promise.all([
    db.from("orders").select("id,source_order_number,work_type,duration_minutes,required_people,status,customers(name,address_line,postal_code,city,phone,notes),order_experts(expert_id)").eq("id", id).maybeSingle(),
    db.from("experts").select("id,name,preferences").order("name"),
    db.from("appointments").select("id,starts_at,selection_rank,status,experts(name)").eq("order_id", id).in("selection_rank", [1, 2, 3]).order("selection_rank"),
  ]);
  if (!order) notFound();
  const experts = expertData ?? [];
  const options = optionData ?? [];
  const selected = new Set((order.order_experts as unknown as { expert_id: string }[] | null || []).map((teamMember) => teamMember.expert_id));
  const customer = order.customers as unknown as { name?: string; address_line?: string; postal_code?: string; city?: string; phone?: string; notes?: string } | null;
  return <main className="shell"><header className="topbar"><Link className="brand" href="/dashboard">Expert <span>Planner</span></Link><Link href="/planning">Terug naar weekplanner</Link></header><section className="card"><div className="eyebrow">Order {order.source_order_number || "zonder nummer"}</div><h1>{customer?.name || "Klant"}</h1><p>{[customer?.address_line, customer?.postal_code, customer?.city].filter(Boolean).join(", ")}</p><p><strong>{order.work_type || "Werksoort nog bepalen"}</strong> · {order.duration_minutes || 60} minuten · {order.required_people} persoon{order.required_people === 1 ? "" : "en"} nodig</p></section><section className="card" style={{ marginTop: 20 }}><h2>Team voor deze order</h2><p className="muted">Kies {order.required_people} monteur{order.required_people === 1 ? "" : "s"}. Bij een tweepersoonslevering worden beide monteurs aan dezelfde order gekoppeld.</p><form action={`/api/orders/${order.id}/team`} method="post"><div className="team-list">{experts.map((expert) => <label className="team-choice" key={expert.id}><input type="checkbox" name="expertId" value={expert.id} defaultChecked={selected.has(expert.id)} /><span><strong>{expert.name}</strong><br /><small>{((expert.preferences as { skills?: string[] } | null)?.skills || []).join(", ") || "werksoorten nog invullen"}</small></span></label>)}</div><button type="submit">Team opslaan</button></form></section><section className="card" style={{ marginTop: 20 }}><h2>Plan A, B en C</h2><p className="muted">Zodra de route-engine is gekoppeld, maakt de knop ‘Weekvoorstel maken’ drie haalbare opties met dit volledige team. Er wordt nooit een voorstel getoond op basis van gegokte reistijden.</p>{options.length ? <div className="option-grid">{options.map((option) => { const expert = option.experts as unknown as { name?: string } | null; return <article className="option" key={option.id}><strong>Plan {String.fromCharCode(64 + (option.selection_rank || 1))}</strong><p>{formatTime(option.starts_at)} · {expert?.name || "Expert"}</p></article>; })}</div> : <p className="muted">Nog geen routevoorstel voor deze order.</p>}</section></main>;
}
