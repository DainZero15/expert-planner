import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { estimatedTravelMinutes, hasRoomForVisit, nextWorkableStart, workdayStart } from "@/lib/planning/workday";
import { estimatedDurationMinutes } from "@/lib/planning/duration";

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const timestamp = (day: string, minutes: number) => {
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  const remainder = String(minutes % 60).padStart(2, "0");
  return new Date(`${day}T${hours}:${remainder}:00+02:00`).toISOString();
};
const minutesInAmsterdam = (value: string) => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  return hour * 60 + minute;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Log opnieuw in." }, { status: 401 });

  const { id } = await params;
  const form = await request.formData();
  const day = String(form.get("date") || "");
  if (!isDate(day)) return NextResponse.json({ error: "Ongeldige dag." }, { status: 400 });

  const [{ data: order, error: orderError }, { data: appointment }] = await Promise.all([
    db.from("orders").select("id,customer_id,work_type,duration_minutes,status").eq("id", id).maybeSingle(),
    db.from("appointments").select("id,expert_id,starts_at,status").eq("order_id", id).eq("selection_rank", 1).maybeSingle(),
  ]);
  if (orderError || !order) return NextResponse.json({ error: "Order niet gevonden." }, { status: 404 });
  if (appointment?.status === "confirmed" || order.status === "confirmed") return NextResponse.json({ error: "Een definitieve afspraak kan alleen via de order worden gewijzigd." }, { status: 409 });

  let expertId = appointment?.expert_id;
  if (!expertId) {
    const { data: fallbackExpert } = await db.from("experts").select("id").order("name").limit(1).maybeSingle();
    expertId = fallbackExpert?.id;
  }
  if (!expertId) return NextResponse.json({ error: "Voeg eerst een expert toe." }, { status: 400 });
  const nextDay = new Date(`${day}T12:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const { data: otherAppointments, error: appointmentReadError } = await db.from("appointments")
    .select("id,ends_at")
    .eq("expert_id", expertId)
    .gte("starts_at", `${day}T00:00:00.000Z`)
    .lt("starts_at", `${nextDay.toISOString().slice(0, 10)}T00:00:00.000Z`)
    .neq("id", appointment?.id || "00000000-0000-0000-0000-000000000000");
  if (appointmentReadError) return NextResponse.json({ error: appointmentReadError.message }, { status: 500 });
  const duration = estimatedDurationMinutes(order.work_type, order.duration_minutes);
  const latestEnd = Math.max(workdayStart, ...(otherAppointments ?? []).map((item) => minutesInAmsterdam(item.ends_at) + estimatedTravelMinutes));
  const minutes = nextWorkableStart(latestEnd, duration);
  if (!hasRoomForVisit(minutes, duration)) return NextResponse.json({ error: "Geen vrije tijd meer voor deze monteur op deze dag." }, { status: 409 });
  const values = {
    customer_id: order.customer_id,
    starts_at: timestamp(day, minutes),
    ends_at: timestamp(day, minutes + duration),
    status: "proposed",
  };

  if (appointment) {
    const { error } = await db.from("appointments").update(values).eq("id", appointment.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await db.from("appointments").insert({ ...values, expert_id: expertId, order_id: order.id, selection_rank: 1 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
