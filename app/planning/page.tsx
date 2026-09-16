import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addDays, amsterdamDate, dateKey, formatTime, mondayOfWeek, weekLabel } from "@/lib/planning/week";
import { normalizedOrderNumber } from "@/lib/import/customers";

const hours = Array.from({ length: 10 }, (_, index) => index + 8);
const deliveryDays = [1, 2, 3, 4, 5, 6, 7];
const dayName = new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "short" });
const validDate = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : amsterdamDate(new Date());

type Order = {
  id: string;
  source_order_number: string | null;
  customer_id: string;
  work_type: string | null;
  duration_minutes: number | null;
  required_people: number;
  status: string;
};

type Customer = {
  id: string;
  name: string;
  city: string | null;
};

export default async function PlanningPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const monday = mondayOfWeek(validDate(params.week));
  const end = addDays(monday, 7);

  // Orders are deliberately read without a nested relation. This keeps the
  // backlog visible even while team selection is still being set up.
  const [{ data: orderData, error: orderError }, { data: appointmentData }] = await Promise.all([
    db.from("orders").select("id,source_order_number,customer_id,work_type,duration_minutes,required_people,status").order("created_at", { ascending: false }).limit(500),
    db.from("appointments").select("id,order_id,customer_id,starts_at,ends_at,status").gte("starts_at", `${dateKey(monday)}T00:00:00.000Z`).lt("starts_at", `${dateKey(end)}T00:00:00.000Z`).order("starts_at"),
  ]);

  const orders = (orderData ?? []) as Order[];
  const customerIds = [...new Set(orders.map((order) => order.customer_id))];
  const { data: customerData } = customerIds.length
    ? await db.from("customers").select("id,name,city").in("id", customerIds)
    : { data: [] as Customer[] };
  const customers = new Map((customerData ?? []).map((customer) => [customer.id, customer as Customer]));

  const appointments = appointmentData ?? [];
  const confirmed = appointments.filter((appointment) => appointment.status === "confirmed");
  const confirmedOrderIds = new Set(confirmed.map((appointment) => appointment.order_id).filter(Boolean));
  const todo = orders.filter((order) => !confirmedOrderIds.has(order.id));
  const todoByNumber = new Map<string, Order>();
  for (const order of todo) {
    const orderKey = order.source_order_number ? normalizedOrderNumber(order.source_order_number) : order.id;
    if (!todoByNumber.has(orderKey)) todoByNumber.set(orderKey, order);
  }
  const uniqueTodo = [...todoByNumber.values()];
  const hiddenDuplicates = todo.length - uniqueTodo.length;
  const byDay = new Map<string, typeof appointments>();
  for (const appointment of appointments) {
    const key = amsterdamDate(new Date(appointment.starts_at));
    byDay.set(key, [...(byDay.get(key) || []), appointment]);
  }

  const previous = dateKey(addDays(monday, -7));
  const next = dateKey(addDays(monday, 7));

  return <main className="shell planning-shell">
    <header className="topbar">
      <Link className="brand" href="/dashboard">Expert <span>Planner</span></Link>
      <nav className="header-links"><Link href="/import">Orders importeren</Link><Link href="/experts">Experts</Link></nav>
    </header>

    <section className="card planner-intro">
      <div>
        <div className="eyebrow">Weekplanner</div>
        <h1>Uw week in één oogopslag</h1>
        <p className="muted">Dagen staan onder elkaar en uren lopen van links naar rechts. Maandag en zondag zijn beschikbaar voor uitzonderingen.</p>
      </div>
      <Link className="import-button" href="/import">+ Orders importeren</Link>
    </section>

    {orderError && <section className="card error" style={{ marginTop: 20 }}>
      Orders kunnen niet worden gelezen: {orderError.message}
    </section>}

    <section className="week-controls">
      <Link href={`/planning?week=${previous}` as never}>← Vorige week</Link>
      <strong>{weekLabel(monday)}</strong>
      <Link href={`/planning?week=${next}` as never}>Volgende week →</Link>
    </section>

    <div className="calendar-scroll">
      <section className="week-calendar" aria-label="Weekplanner">
        <div className="calendar-head">
          <div className="day-label">Dag</div>
          {hours.map((hour) => <div key={hour}>{String(hour).padStart(2, "0")}:00</div>)}
        </div>
        {deliveryDays.map((weekDay) => {
          const day = addDays(monday, weekDay - 1);
          const key = dateKey(day);
          const items = byDay.get(key) || [];
          const isExceptionDay = weekDay === 1 || weekDay === 7;
          return <div className="calendar-row" key={key}>
            <div className="day-label">
              <strong>{dayName.format(day)}</strong>
              <span>{items.length ? `${items.length} afspraak${items.length === 1 ? "" : "en"}` : isExceptionDay ? "Op aanvraag" : "Vrij"}</span>
            </div>
            <div className="calendar-track">
              {hours.map((hour) => <div className="hour-cell" key={hour} />)}
              {items.map((appointment) => {
                const start = Number(formatTime(appointment.starts_at).slice(0, 2));
                const href = appointment.order_id ? `/planning/order/${appointment.order_id}` : `/planning/customer/${appointment.customer_id}`;
                return <Link key={appointment.id} href={href as never} className={`appointment ${appointment.status === "confirmed" ? "confirmed" : "proposal"}`} style={{ left: `${Math.max(0, start - 8) * 10}%` }}>
                  <strong>Ingepland bezoek</strong>
                  <span>{formatTime(appointment.starts_at)}</span>
                </Link>;
              })}
            </div>
          </div>;
        })}
      </section>
    </div>

    <section className="planner-lists">
      <article className="card">
        <div className="eyebrow">Definitief</div>
        <h2>Definitief ingepland ({confirmed.length})</h2>
        {confirmed.length ? <ul className="customer-list">{confirmed.map((appointment) => <li key={appointment.id}>
          <strong>Ingepland bezoek</strong><span>{formatTime(appointment.starts_at)}</span>
        </li>)}</ul> : <p className="muted">Nog geen definitieve afspraken deze week.</p>}
      </article>

      <article className="card">
        <div className="eyebrow">Nog te doen</div>
        <h2>Nog niet definitief ({uniqueTodo.length})</h2>
        {hiddenDuplicates > 0 && <p className="muted">{hiddenDuplicates} dubbele importregel{hiddenDuplicates === 1 ? "" : "s"} is verborgen; elk ordernummer staat maar één keer in deze lijst.</p>}
        {uniqueTodo.length ? <ul className="customer-list">{uniqueTodo.slice(0, 100).map((order) => {
          const customer = customers.get(order.customer_id);
          return <li key={order.id}>
            <Link href={`/planning/order/${order.id}` as never}>
              <strong>{order.source_order_number || "Order zonder nummer"} · {customer?.name || "Klant"}</strong>
            </Link>
            <span>{customer?.city || "plaats onbekend"} · {order.required_people} persoon{order.required_people === 1 ? "" : "en"} · {order.work_type || "werksoort onbekend"}</span>
          </li>;
        })}</ul> : <p className="muted">Geen open orders gevonden. Importeer een nieuw bestand of controleer de melding hierboven.</p>}
      </article>
    </section>
  </main>;
}
