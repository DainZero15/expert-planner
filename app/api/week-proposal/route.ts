import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addDays, amsterdamDate, dateKey, mondayOfWeek } from "@/lib/planning/week";

type Expert = {
  id: string;
  work_days: number[];
  start_time: string;
  end_time: string;
  break_minutes: number;
  default_visit_minutes: number;
  preferences: unknown;
};

type Order = {
  id: string;
  customer_id: string;
  work_type: string | null;
  duration_minutes: number | null;
  required_people: number;
};

type Customer = {
  id: string;
  available_days: number[];
};

const baseProposalDays = [2, 3, 4, 5, 6];
const proposalWeeks = 12;
const minuteOfDay = (time: string) => {
  const [hours = "8", minutes = "0"] = time.slice(0, 5).split(":");
  return Number(hours) * 60 + Number(minutes);
};
const hasSkill = (expert: Expert, workType: string | null) => {
  const skills = expert.preferences && typeof expert.preferences === "object" && Array.isArray((expert.preferences as { skills?: unknown }).skills)
    ? (expert.preferences as { skills: unknown[] }).skills.filter((skill): skill is string => typeof skill === "string")
    : [];
  // An expert without configured work types is intentionally treated as a
  // general expert. That makes the planner useful while the team is still
  // being set up, without overriding an explicit specialist mismatch.
  if (!workType || skills.length === 0) return true;
  const work = workType.toLocaleLowerCase("nl-NL").trim();
  return skills.some((skill) => skill.toLocaleLowerCase("nl-NL").includes(work) || work.includes(skill.toLocaleLowerCase("nl-NL")));
};
const timestamp = (day: string, minutes: number) => {
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  const remainder = String(minutes % 60).padStart(2, "0");
  return new Date(`${day}T${hours}:${remainder}:00+02:00`).toISOString();
};

export async function POST(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  const form = await request.formData();
  const weekValue = String(form.get("week") || amsterdamDate(new Date()));
  const monday = mondayOfWeek(weekValue);
  const week = dateKey(monday);

  const [{ data: orderData, error: orderError }, { data: expertData }, { data: confirmedData }] = await Promise.all([
    db.from("orders").select("id,customer_id,work_type,duration_minutes,required_people").limit(1000),
    db.from("experts").select("id,work_days,start_time,end_time,break_minutes,default_visit_minutes,preferences").order("name"),
    db.from("appointments").select("id,order_id,expert_id,starts_at,ends_at,status").eq("status", "confirmed"),
  ]);
  if (orderError) return NextResponse.redirect(new URL(`/planning?week=${week}&proposal=error`, request.url), 303);

  const confirmed = confirmedData ?? [];
  const confirmedOrderIds = new Set(confirmed.map((appointment) => appointment.order_id).filter(Boolean));
  const orders = ((orderData ?? []) as Order[]).filter((order) => !confirmedOrderIds.has(order.id));
  const experts = (expertData ?? []) as Expert[];
  const customerIds = [...new Set(orders.map((order) => order.customer_id))];
  const { data: customerData } = customerIds.length
    ? await db.from("customers").select("id,available_days").in("id", customerIds)
    : { data: [] as Customer[] };
  const customers = new Map((customerData ?? []).map((customer) => [customer.id, customer as Customer]));

  await db.from("appointments").delete().in("order_id", orders.map((order) => order.id)).eq("status", "proposed");

  // A full order backlog rarely fits in one week. Create a proposal from the
  // selected week onward, so the planner continues into following weeks while
  // confirmed appointments remain untouched.
  const days = Array.from({ length: proposalWeeks }, (_, weekIndex) => baseProposalDays.map((dayNumber) => ({
    dayNumber,
    date: dateKey(addDays(monday, weekIndex * 7 + dayNumber - 1)),
  }))).flat();
  const nextAvailable = new Map<string, Map<string, number>>();
  for (const expert of experts) {
    const expertSlots = new Map<string, number>();
    for (const day of days) expertSlots.set(day.date, minuteOfDay(expert.start_time));
    nextAvailable.set(expert.id, expertSlots);
  }
  for (const appointment of confirmed) {
    const day = amsterdamDate(new Date(appointment.starts_at));
    const expertSlots = nextAvailable.get(appointment.expert_id);
    if (!expertSlots?.has(day)) continue;
    const end = new Date(appointment.ends_at);
    const endMinutes = end.getUTCHours() * 60 + end.getUTCMinutes();
    expertSlots.set(day, Math.max(expertSlots.get(day) || 0, endMinutes));
  }

  let planned = 0;
  let skipped = 0;
  const proposals: Array<{ customer_id: string; expert_id: string; order_id: string; starts_at: string; ends_at: string; selection_rank: number; status: string }> = [];

  for (const order of orders) {
    const customer = customers.get(order.customer_id);
    const candidates = experts.filter((expert) => hasSkill(expert, order.work_type));
    let choice: { expert: Expert; dayIndex: number; start: number; duration: number } | undefined;

    for (const expert of candidates) {
      for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
        const day = days[dayIndex];
        // Older expert records may not have work_days yet. In that case use
        // the normal Tuesday–Saturday proposal days instead of skipping them.
        if (expert.work_days?.length && !expert.work_days.includes(day.dayNumber)) continue;
        if (customer?.available_days?.length && !customer.available_days.includes(day.dayNumber)) continue;
        const start = nextAvailable.get(expert.id)?.get(day.date) || minuteOfDay(expert.start_time);
        const duration = order.duration_minutes || expert.default_visit_minutes;
        if (start + duration > minuteOfDay(expert.end_time)) continue;
        if (!choice || start < choice.start) choice = { expert, dayIndex, start, duration };
      }
    }

    if (!choice) {
      skipped += 1;
      continue;
    }

    const { expert, dayIndex, start, duration } = choice;
    const slots = nextAvailable.get(expert.id);
    const day = days[dayIndex];
    slots?.set(day.date, start + duration + expert.break_minutes);

    for (let rank = 1; rank <= 3; rank += 1) {
      const optionDay = days[(dayIndex + rank - 1) % days.length];
      const optionStart = rank === 1 ? start : minuteOfDay(expert.start_time);
      proposals.push({
        customer_id: order.customer_id,
        expert_id: expert.id,
        order_id: order.id,
        starts_at: timestamp(optionDay.date, optionStart),
        ends_at: timestamp(optionDay.date, optionStart + duration),
        selection_rank: rank,
        status: "proposed",
      });
    }
    planned += 1;
  }

  if (proposals.length) await db.from("appointments").insert(proposals);
  return NextResponse.redirect(new URL(`/planning?week=${week}&proposal=${planned}&skipped=${skipped}`, request.url), 303);
}
