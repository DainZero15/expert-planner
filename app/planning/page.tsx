import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addDays, amsterdamDate, dateKey, formatTime, mondayOfWeek, weekLabel } from "@/lib/planning/week";

const hours = Array.from({ length: 10 }, (_, index) => index + 8);
const days = [2, 3, 4, 5, 6];
const dayName = new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "short" });
const dateFrom = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : amsterdamDate(new Date());

export default async function PlanningPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const monday = mondayOfWeek(dateFrom(params.week));
  const end = addDays(monday, 7);
  const previous = dateKey(addDays(monday, -7));
  const next = dateKey(addDays(monday, 7));
  const [{ data: customerData }, { data: appointmentData }] = await Promise.all([
    db.from("customers").select("id,name,address_line,postal_code,city,priority").order("priority").limit(500),
    db.from("appointments").select("id,customer_id,expert_id,starts_at,ends_at,status,customers(name,address_line,city),experts(name)").gte("starts_at", `${dateKey(monday)}T00:00:00.000Z`).lt("starts_at", `${dateKey(end)}T00:00:00.000Z`).order("starts_at"),
  ]);
  const customers = customerData ?? [];
  const appointments = appointmentData ?? [];
  const confirmed = appointments.filter((appointment) => appointment.status === "confirmed");
  const plannedCustomerIds = new Set(confirmed.map((appointment) => appointment.customer_id));
  const todo = customers.filter((customer) => !plannedCustomerIds.has(customer.id));
  const byDay = new Map<string, typeof appointments>();
  for (const appointment of appointments) {
    const key = amsterdamDate(new Date(appointment.starts_at));
    byDay.set(key, [...(byDay.get(key) || []), appointment]);
  }

  return <main className="shell planning-shell"><header className="topbar"><Link className="brand" href="/dashboard">Expert <span>Planner</span></Link><nav className="header-links"><Link href="/import">Orders importeren</Link><Link href="/experts">Experts</Link></nav></header><section className="card planner-intro"><div><div className="eyebrow">Weekplanner</div><h1>Uw week in één oogopslag</h1><p className="muted">Dagen staan onder elkaar en uren lopen van links naar rechts. Maandag en zondag zijn standaard gesloten.</p></div><Link className="import-button" href="/import">+ Orders importeren</Link></section><section className="week-controls"><Link href={`/planning?week=${previous}` as never}>← Vorige week</Link><strong>{weekLabel(monday)}</strong><Link href={`/planning?week=${next}` as never}>Volgende week →</Link></section><div className="calendar-scroll"><section className="week-calendar" aria-label="Weekplanner"><div className="calendar-head"><div className="day-label">Dag</div>{hours.map((hour) => <div key={hour}>{String(hour).padStart(2, "0")}:00</div>)}</div>{days.map((weekDay) => { const day = addDays(monday, weekDay - 1); const key = dateKey(day); const items = byDay.get(key) || []; return <div className="calendar-row" key={key}><div className="day-label"><strong>{dayName.format(day)}</strong><span>{items.length ? `${items.length} afspraak${items.length === 1 ? "" : "en"}` : "Vrij"}</span></div><div className="calendar-track">{hours.map((hour) => <div className="hour-cell" key={hour} />)}{items.map((appointment) => { const start = Number(formatTime(appointment.starts_at).slice(0, 2)); const left = Math.max(0, start - 8) * 10; const customer = appointment.customers as unknown as { name?: string; address_line?: string; city?: string } | null; const expert = appointment.experts as unknown as { name?: string } | null; return <Link key={appointment.id} href={`/planning/customer/${appointment.customer_id}` as never} className={`appointment ${appointment.status === "confirmed" ? "confirmed" : "proposal"}`} style={{ left: `${left}%` }}><strong>{customer?.name || "Klant"}</strong><span>{formatTime(appointment.starts_at)} · {expert?.name || "Expert"}</span></Link>; })}</div></div>; })}</section></div><section className="planner-lists"><article className="card"><div className="eyebrow">Definitief</div><h2>Definitief ingepland ({confirmed.length})</h2>{confirmed.length ? <ul className="customer-list">{confirmed.map((appointment) => { const customer = appointment.customers as unknown as { name?: string } | null; return <li key={appointment.id}><strong>{customer?.name || "Klant"}</strong><span>{formatTime(appointment.starts_at)}</span></li>; })}</ul> : <p className="muted">Nog geen definitieve afspraken deze week.</p>}</article><article className="card"><div className="eyebrow">Nog te doen</div><h2>Nog niet definitief ({todo.length})</h2>{todo.length ? <ul className="customer-list">{todo.slice(0, 20).map((customer) => <li key={customer.id}><Link href={`/planning/customer/${customer.id}` as never}><strong>{customer.name}</strong></Link><span>{[customer.city, `prioriteit ${customer.priority}`].filter(Boolean).join(" · ")}</span></li>)}</ul> : <p className="muted">Alles is definitief ingepland.</p>}</article></section></main>;
}
