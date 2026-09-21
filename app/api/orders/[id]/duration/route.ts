import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  const body = await request.json().catch(() => ({}));
  const appointmentId = typeof body.appointmentId === "string" ? body.appointmentId : "";
  const durationMinutes = Number(body.durationMinutes);
  if (!appointmentId || !Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 480) return NextResponse.json({ error: "Kies een duur tussen 15 en 480 minuten." }, { status: 400 });

  const { data: appointment, error: appointmentError } = await db.from("appointments")
    .select("id,expert_id,starts_at,status,selection_rank")
    .eq("id", appointmentId).eq("order_id", id).maybeSingle();
  if (appointmentError || !appointment) return NextResponse.json({ error: "Afspraak niet gevonden." }, { status: 404 });
  if (appointment.status === "confirmed") return NextResponse.json({ error: "Een definitieve afspraak kan alleen handmatig via de order worden gewijzigd." }, { status: 409 });

  const day = appointment.starts_at.slice(0, 10);
  const nextDay = new Date(`${day}T12:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const { data: neighbours, error: neighboursError } = await db.from("appointments")
    .select("starts_at,status,selection_rank")
    .eq("expert_id", appointment.expert_id)
    .gte("starts_at", `${day}T00:00:00.000Z`)
    .lt("starts_at", `${nextDay.toISOString().slice(0, 10)}T00:00:00.000Z`)
    .or("selection_rank.eq.1,status.eq.confirmed")
    .neq("id", appointment.id);
  if (neighboursError) return NextResponse.json({ error: neighboursError.message }, { status: 500 });

  const start = minutesInAmsterdam(appointment.starts_at);
  const nextStart = Math.min(18 * 60, ...(neighbours || []).map((item) => {
    const candidate = minutesInAmsterdam(item.starts_at);
    return candidate > start ? candidate : 18 * 60;
  }));
  if (start + durationMinutes > nextStart) return NextResponse.json({ error: "Deze duur raakt de volgende afspraak. Maak het blok korter of verplaats eerst de volgende afspraak." }, { status: 409 });

  const endsAt = new Date(new Date(appointment.starts_at).getTime() + durationMinutes * 60_000).toISOString();
  const [{ error: orderError }, { error: updateError }] = await Promise.all([
    db.from("orders").update({ duration_minutes: durationMinutes }).eq("id", id),
    db.from("appointments").update({ ends_at: endsAt }).eq("id", appointment.id),
  ]);
  if (orderError || updateError) return NextResponse.json({ error: orderError?.message || updateError?.message || "Opslaan mislukt." }, { status: 500 });
  return NextResponse.json({ ok: true, durationMinutes });
}
