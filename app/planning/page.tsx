import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addDays, amsterdamDate, dateKey, formatTime, mondayOfWeek, weekLabel } from "@/lib/planning/week";
import { normalizedOrderNumber } from "@/lib/import/order-number";
import { WeekProposalButton } from "@/components/week-proposal-button";
import { googleMapsRouteLinks, type RouteStop } from "@/lib/planning/google-maps";
import { PlanningDragList } from "@/components/planning-drag-list";
import { PlanningDropTarget } from "@/components/planning-drop-target";
import { ResizableAppointment } from "@/components/resizable-appointment";
import { PlannerDayControls } from "@/components/planner-day-controls";
import { PlannerTimeZoom } from "@/components/planner-time-zoom";
import { estimatedDurationMinutes } from "@/lib/planning/duration";
import { estimatedTravelMinutes, lunchMinutes, travelStartAfterVisit } from "@/lib/planning/workday";

const hours = Array.from({ length: 24 }, (_, index) => index);
const deliveryDays = [1, 2, 3, 4, 5, 6, 7];
const laneHeight = 102;
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

export default async function PlanningPage({ searchParams }: { searchParams: Promise<{ week?: string; proposal?: string; skipped?: string; duplicates?: string }> }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const monday = mondayOfWeek(validDate(params.week));
  const end = addDays(monday, 7);

  // Orders are deliberately read without a nested relation. This keeps the
  // backlog visible even while team selection is still being set up.
  const [{ data: orderData, error: orderError }, { data: appointmentData }, { data: expertData }] = await Promise.all([
    db.from("orders").select("id,source_order_number,customer_id,work_type,duration_minutes,required_people,status").neq("status", "archived").order("created_at", { ascending: false }).limit(500),
    db.from("appointments").select("id,order_id,customer_id,expert_id,starts_at,ends_at,selection_rank,status").gte("starts_at", `${dateKey(monday)}T00:00:00.000Z`).lt("starts_at", `${dateKey(end)}T00:00:00.000Z`).order("starts_at"),
    db.from("experts").select("id,name").order("name"),
  ]);

  const orders = (orderData ?? []) as Order[];
  const ordersById = new Map(orders.map((order) => [order.id, order]));
  const customerIds = [...new Set(orders.map((order) => order.customer_id))];
  const { data: customerData } = customerIds.length
    ? await db.from("customers").select("id,name,address_line,postal_code,city").in("id", customerIds)
    : { data: [] as Customer[] };
  const customers = new Map((customerData ?? []).map((customer) => [customer.id, customer as Customer]));

  const appointments = (appointmentData ?? []) as Appointment[];
  const expertNames = new Map((expertData ?? []).map((expert) => [expert.id, expert.name]));
  const confirmed = appointments.filter((appointment) => appointment.status === "confirmed" && (!appointment.order_id || ordersById.has(appointment.order_id)));
  const visibleAppointments = appointments.filter((appointment) => (appointment.status === "confirmed" || appointment.selection_rank === 1) && (!appointment.order_id || ordersById.has(appointment.order_id)));
  const confirmedOrderIds = new Set(confirmed.map((appointment) => appointment.order_id).filter(Boolean));
  const todo = orders.filter((order) => !confirmedOrderIds.has(order.id));
  const todoByNumber = new Map<string, Order>();
  for (const order of todo) {
    const orderKey = order.source_order_number ? normalizedOrderNumber(order.source_order_number) : order.id;
    if (!todoByNumber.has(orderKey)) todoByNumber.set(orderKey, order);
  }
  const uniqueOrders = [...todoByNumber.values()];
  const todoByCustomer = new Map<string, { order: Order; count: number; customer: Customer | undefined; tasks: string[] }>();
  for (const order of uniqueOrders) {
    const customer = customers.get(order.customer_id);
    const customerKey = customer
      ? [customer.name, customer.address_line, customer.postal_code, customer.city].map((value) => String(value || "").trim().toLocaleLowerCase("nl-NL").replace(/\s+/g, " ")).join("|")
      : order.id;
    const existing = todoByCustomer.get(customerKey);
    if (existing) {
      existing.count += 1;
      if (order.work_type && !existing.tasks.includes(order.work_type)) existing.tasks.push(order.work_type);
    } else todoByCustomer.set(customerKey, { order, count: 1, customer, tasks: order.work_type ? [order.work_type] : [] });
  }
  const todoGroups = [...todoByCustomer.values()];
  const draggableOrders = todoGroups.map(({ order, count, customer, tasks }) => ({
    id: order.id,
    title: customer?.name || "Klant zonder naam",
    detail: `${count} open order${count === 1 ? "" : "s"} · ${customer?.address_line || customer?.city || "adres onbekend"}`,
    tasks: tasks.length ? tasks.join(" · ") : "Werkzaamheden nog bepalen",
  }));
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
        ? "Het weekvoorstel kon niet in Supabase worden opgeslagen. Controleer de rechten voor de tabel appointments en probeer daarna opnieuw."
        : <>Voorstel klaar: <strong>{params.proposal}</strong> orders hebben Plan A, B en C gekregen, vanaf deze week en waar nodig in de volgende weken. {Number(params.duplicates || 0) > 0 && `${params.duplicates} dubbele order${Number(params.duplicates) === 1 ? " is" : "s zijn"} automatisch gearchiveerd.`} {Number(params.skipped || 0) > 0 && `${params.skipped} orders konden nog niet worden gekoppeld aan een beschikbare expert.`}</>}
    </section>}

    {orderError && <section className="card error" style={{ marginTop: 20 }}>
      Orders kunnen niet worden gelezen: {orderError.message}
    </section>}

    <section className="week-controls">
      <Link href={`/planning?week=${previous}` as never}>← Vorige week</Link>
      <strong>{weekLabel(monday)}</strong>
      <Link href={`/planning?week=${next}` as never}>Volgende week →</Link>
    </section>

    <div className="planner-board">
      <div className="calendar-scroll">
        <PlannerTimeZoom />
        <PlannerDayControls />
        <section className="week-calendar" aria-label="Weekplanner">
        <div className="calendar-head">
          <div className="day-label">Dag</div>
          {hours.map((hour) => <div key={hour}>{String(hour).padStart(2, "0")}:00</div>)}
        </div>
        {deliveryDays.map((weekDay) => {
          const day = addDays(monday, weekDay - 1);
          const key = dateKey(day);
          const items = byDay.get(key) || [];
          const dailyExpertIds = [...new Set(items.map((appointment) => appointment.expert_id || "team"))];
          const dailyExperts = dailyExpertIds.map((expertId) => expertId === "team" ? "Team" : expertNames.get(expertId) || "Expert");
          const routeLabel = (expertId: string) => expertId === "team" ? "Team" : expertNames.get(expertId) || "Expert";
          const travelSegments = items.flatMap((appointment) => {
            const expertId = appointment.expert_id || "team";
            const nextAppointment = items
              .filter((candidate) => (candidate.expert_id || "team") === expertId && candidate.starts_at > appointment.starts_at)
              .sort((left, right) => left.starts_at.localeCompare(right.starts_at))[0];
            if (!nextAppointment) return [];
            const [travelHours, travelMinutes] = formatTime(appointment.ends_at).split(":").map(Number);
            const [nextHours, nextMinutes] = formatTime(nextAppointment.starts_at).split(":").map(Number);
            const startMinutes = travelStartAfterVisit(travelHours * 60 + travelMinutes);
            const availableMinutes = nextHours * 60 + nextMinutes - startMinutes;
            const minutes = Math.min(estimatedTravelMinutes, availableMinutes);
            if (minutes <= 0) return [];
            return [{ id: `${appointment.id}-travel`, expertId, startMinutes, minutes }];
          });
          const lunchBlocks = dailyExpertIds.flatMap((expertId, lane) => {
            const expertItems = items.filter((item) => (item.expert_id || "team") === expertId).sort((left, right) => left.starts_at.localeCompare(right.starts_at));
            for (let index = 0; index < expertItems.length - 1; index += 1) {
              const current = expertItems[index];
              const next = expertItems[index + 1];
              const [endHours, endMinutes] = formatTime(current.ends_at).split(":").map(Number);
              const [nextHours, nextMinutes] = formatTime(next.starts_at).split(":").map(Number);
              const travelEnd = travelStartAfterVisit(endHours * 60 + endMinutes) + Math.min(estimatedTravelMinutes, nextHours * 60 + nextMinutes - (endHours * 60 + endMinutes));
              if (nextHours * 60 + nextMinutes - travelEnd >= lunchMinutes) return [{ expertId, lane, startMinutes: travelEnd }];
            }
            return [];
          });
          const isExceptionDay = weekDay === 1 || weekDay === 7;
          return <details className="planner-day" data-planner-day key={key} open={items.length > 0}>
            <summary className="calendar-row planner-day-summary">
              <div className="day-label">
                <strong>{dayName.format(day)}</strong>
                <span>{items.length ? `${items.length} afspraak${items.length === 1 ? "" : "en"}` : isExceptionDay ? "Op aanvraag" : "Vrij"}</span>
                {dailyExperts.length > 0 && <ul className="day-expert-list" aria-label="Monteurs"><li className="day-expert-heading">Monteurs</li>{dailyExperts.map((expert) => <li key={expert}>{expert}</li>)}</ul>}
                <small className="day-toggle">Routeplanning tonen</small>
              </div>
              <div className="day-summary-hint">{items.length ? `${dailyExpertIds.length} route${dailyExpertIds.length === 1 ? "" : "s"} · klik voor het dagoverzicht` : "Klik om deze dag te openen voor handmatige planning"}</div>
            </summary>
            <div className="calendar-row planner-day-detail" style={{ minHeight: `${Math.max(106, dailyExpertIds.length * laneHeight + 14)}px` }}>
              <div className="day-label day-route-labels">
                {dailyExpertIds.length
                  ? dailyExpertIds.map((expertId, lane) => {
                    const routeItems = items.filter((item) => (item.expert_id || "team") === expertId);
                    return <div className="day-route-label" key={expertId} style={{ minHeight: `${laneHeight}px` }}>
                      <small>Route {lane + 1}</small>
                      <strong>{routeLabel(expertId)}</strong>
                      <span>{routeItems.length} afspraak{routeItems.length === 1 ? "" : "en"}</span>
                    </div>;
                  })
                  : <div className="day-route-empty">Sleep een order hierheen om deze dag te vullen.</div>}
              </div>
              <PlanningDropTarget date={key}>
              {hours.map((hour) => <div className="hour-cell" key={hour} />)}
              {items.map((appointment) => {
                const [startHours, startMinutes] = formatTime(appointment.starts_at).split(":").map(Number);
                const start = startHours * 60 + startMinutes;
                const durationMinutes = Math.max(30, (new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime()) / 60_000);
                const order = appointment.order_id ? ordersById.get(appointment.order_id) : undefined;
                const estimatedMinutes = estimatedDurationMinutes(order?.work_type, order?.duration_minutes, durationMinutes);
                const expertLane = dailyExpertIds.indexOf(appointment.expert_id || "team");
                const href = appointment.order_id ? `/planning/order/${appointment.order_id}` : `/planning/customer/${appointment.customer_id}`;
                const left = `${Math.max(0, start) / 60 / hours.length * 100}%`;
                const maxWidth = 100 - Math.max(0, start) / 60 / hours.length * 100;
                return <ResizableAppointment key={appointment.id} href={href} className={`appointment ${appointment.status === "confirmed" ? "confirmed" : "proposal"}`} left={left} top={`${8 + expertLane * laneHeight}px`} maxWidth={maxWidth} durationMinutes={durationMinutes}>
                  <strong>{customers.get(appointment.customer_id)?.name || "Ingepland bezoek"}</strong>
                  <span className="appointment-task">{order?.work_type || "Werkzaamheden nog bepalen"}</span>
                  <span className="appointment-meta">{estimatedMinutes} min · {formatTime(appointment.starts_at)}–{formatTime(appointment.ends_at)}</span>
                </ResizableAppointment>;
              })}
              {travelSegments.map((travel) => <div key={travel.id} title={`Geschatte reistijd: ${travel.minutes} minuten`} className="travel-block" style={{ left: `${Math.max(0, travel.startMinutes) / 60 / hours.length * 100}%`, top: `${8 + dailyExpertIds.indexOf(travel.expertId) * laneHeight}px`, width: `calc(${travel.minutes / 60 / hours.length * 100}% - 2px)` }}>
                Reis ±{travel.minutes}m
              </div>)}
              {lunchBlocks.map((lunch) => <div key={`${lunch.expertId}-lunch`} className="lunch-block" style={{ left: `${lunch.startMinutes / 60 / hours.length * 100}%`, top: `${76 + lunch.lane * laneHeight}px`, width: `calc(${lunchMinutes / 60 / hours.length * 100}% - 3px)` }}>Pauze · 60m</div>)}
              </PlanningDropTarget>
            </div>
          </details>;
        })}
        </section>
      </div>
      <PlanningDragList orders={draggableOrders} />
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
