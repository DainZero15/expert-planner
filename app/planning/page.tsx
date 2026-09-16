import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addDays, amsterdamDate, dateKey, formatTime, mondayOfWeek, weekLabel } from "@/lib/planning/week";
import { normalizedOrderNumber } from "@/lib/import/customers";
import { WeekProposalButton } from "@/components/week-proposal-button";
import { googleMapsRouteLinks, type RouteStop } from "@/lib/planning/google-maps";

const hours = Array.from({ length: 24 }, (_, index) => index);
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
  address_line: string;
  postal_code: string | null;
  city: string | null;
};

type Appointment = {
  id: string;
  order_id: string | null;
  customer_id: string;
  expert_id: string | null;
  starts_at: string;
  ends_at: string;
  selection_rank: number | null;
  status: string;
};

export default async function PlanningPage({ searchParams }: { searchParams: Promise<{ week?: string; proposal?: string; skipped?: string }> }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const monday = mondayOfWeek(validDate(params.week));
  const end = addDays(monday, 7);

  // Orders are deliberately read without a nested relation. This keeps the
  // backlog visible even while team selection is still being set up.
  const [{ data: orderData, error: orderError }, { data: appointmentData }, { data: expertData }] = await Promise.all([
    db.from("orders").select("id,source_order_number,customer_id,work_type,duration_minutes,required_people,status").order("created_at", { ascending: false }).limit(500),
    db.from("appointments").select("id,order_id,customer_id,expert_id,starts_at,ends_at,selection_rank,status").gte("starts_at", `${dateKey(monday)}T00:00:00.000Z`).lt("starts_at", `${dateKey(end)}T00:00:00.000Z`).order("starts_at"),
    db.from("experts").select("id,name").order("name"),
  ]);

  const orders = (orderData ?? []) as Order[];
  const customerIds = [...new Set(orders.map((order) => order.customer_id))];
  const { data: customerData } = customerIds.length
    ? await db.from("customers").select("id,name,address_line,postal_code,city").in("id", customerIds)
    : { data: [] as Customer[] };
  const customers = new Map((customerData ?? []).map((customer) => [customer.id, customer as Customer]));

  const appointments = (appointmentData ?? []) as Appointment[];
  const expertNames = new Map((expertData ?? []).map((expert) => [expert.id, expert.name]));
  const confirmed = appointments.filter((appointment) => appointment.status === "confirmed");
  const visibleAppointments = appointments.filter((appointment) => appointment.status === "confirmed" || appointment.selection_rank === 1);
  const confirmedOrderIds = new Set(confirmed.map((appointment) => appointment.order_id).filter(Boolean));
  const todo = orders.filter((order) => !confirmedOrderIds.has(order.id));
  const todoByNumber = new Map<string, Order>();
  for (const order of todo) {
    const orderKey = order.source_order_number ? normalizedOrderNumber(order.source_order_number) : order.id;
    if (!todoByNumber.has(orderKey)) todoByNumber.set(orderKey, order);
  }
  const uniqueOrders = [...todoByNumber.values()];
  const todoByCustomer = new Map<string, { order: Order; count: number; customer: Customer | undefined }>();
  for (const order of uniqueOrders) {
    const customer = customers.get(order.customer_id);
    const customerKey = customer
      ? [customer.name, customer.address_line, customer.postal_code, customer.city].map((value) => String(value || "").trim().toLocaleLowerCase("nl-NL").replace(/\s+/g, " ")).join("|")
      : order.id;
    const existing = todoByCustomer.get(customerKey);
    if (existing) existing.count += 1;
    else todoByCustomer.set(customerKey, { order, count: 1, customer });
  }
  const todoGroups = [...todoByCustomer.values()];
  const hiddenDuplicates = todo.length - todoGroups.length;
  const byDay = new Map<string, typeof visibleAppointments>();
  for (const appointment of visibleAppointments) {
    const key = amsterdamDate(new Date(appointment.starts_at));
    byDay.set(key, [...(byDay.get(key) || []), appointment]);
  }
  const routeGroups = new Map<string, { date: string; expertName: string; stops: RouteStop[] }>();
  for (const appointment of visibleAppointments) {
    const customer = customers.get(appointment.customer_id);
    if (!customer?.address_line) continue;
    const date = amsterdamDate(new Date(appointment.starts_at));
    const groupKey = `${date}:${appointment.expert_id || "team"}`;
    const group: { date: string; expertName: string; stops: RouteStop[] } = routeGroups.get(groupKey) || { date, expertName: appointment.expert_id ? expertNames.get(appointment.expert_id) || "Expert" : "Team", stops: [] };
    group.stops.push({ addressLine: customer.address_line, postalCode: customer.postal_code, city: customer.city });
    routeGroups.set(groupKey, group);
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
        <p className="muted">Dagen staan onder elkaar en alle 24 uren lopen van links naar rechts. Scroll horizontaal voor 00:00–00:00; maandag en zondag zijn beschikbaar voor uitzonderingen.</p>
      </div>
      <div className="planner-actions">
        <WeekProposalButton week={dateKey(monday)} />
        <Link className="import-button" href="/import">+ Orders importeren</Link>
      </div>
    </section>

    {params.proposal && <section className={params.proposal === "error" ? "card error" : "card proposal-result"} style={{ marginTop: 20 }}>
      {params.proposal === "error"
        ? "Het weekvoorstel kon niet worden opgeslagen. Controleer of er experts met werksoorten zijn ingesteld."
        : <>Voorstel klaar: <strong>{params.proposal}</strong> orders hebben Plan A, B en C gekregen, vanaf deze week en waar nodig in de volgende weken. {Number(params.skipped || 0) > 0 && `${params.skipped} orders konden nog niet worden gekoppeld aan een beschikbare expert.`}</>}
    </section>}

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
                const durationMinutes = Math.max(30, (new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime()) / 60_000);
                const href = appointment.order_id ? `/planning/order/${appointment.order_id}` : `/planning/customer/${appointment.customer_id}`;
                return <Link key={appointment.id} href={href as never} className={`appointment ${appointment.status === "confirmed" ? "confirmed" : "proposal"}`} style={{ left: `${Math.max(0, start) / hours.length * 100}%`, width: `calc(${Math.min(100 - Math.max(0, start) / hours.length * 100, durationMinutes / 60 / hours.length * 100)}% - 7px)` }}>
                  <strong>Ingepland bezoek</strong>
                  <span>{formatTime(appointment.starts_at)}</span>
                </Link>;
              })}
            </div>
          </div>;
        })}
      </section>
    </div>

    {routeGroups.size > 0 && <section className="card route-links">
      <div className="eyebrow">Navigatie</div>
      <h2>Google Maps dagroutes</h2>
      <p className="muted">De stops staan in dezelfde volgorde als het voorstel. Google Maps opent vanaf de actuele locatie; lange routes worden automatisch verdeeld in korte delen.</p>
      <div className="route-link-list">{[...routeGroups.values()].map((group) => googleMapsRouteLinks(group.stops).map((route) => <a key={`${group.date}-${group.expertName}-${route.part}`} className="button-link" href={route.href} target="_blank" rel="noreferrer">Open {group.expertName} · {dayName.format(new Date(`${group.date}T12:00:00Z`))} · deel {route.part} ({route.stopCount} stops)</a>))}</div>
    </section>}

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
        <h2>Nog niet definitief ({todoGroups.length})</h2>
        {hiddenDuplicates > 0 && <p className="muted">{hiddenDuplicates} dubbele regel{hiddenDuplicates === 1 ? "" : "s"} is samengevoegd; iedere klant en ieder adres staat maar één keer in deze lijst.</p>}
        {todoGroups.length ? <ul className="customer-list">{todoGroups.slice(0, 100).map(({ order, count, customer }) => {
          return <li key={order.id}>
            <Link href={`/planning/order/${order.id}` as never}>
              <strong>{customer?.name || "Klant"}</strong>
            </Link>
            <span>{count} open order{count === 1 ? "" : "s"} · {order.source_order_number || "zonder nummer"} · {customer?.city || "plaats onbekend"}</span>
          </li>;
        })}</ul> : <p className="muted">Geen open orders gevonden. Importeer een nieuw bestand of controleer de melding hierboven.</p>}
      </article>
    </section>
  </main>;
}
