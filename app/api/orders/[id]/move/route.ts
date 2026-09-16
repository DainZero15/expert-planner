import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const timestamp = (day: string, minutes: number) => {
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  const remainder = String(minutes % 60).padStart(2, "0");
  return new Date(`${day}T${hours}:${remainder}:00+02:00`).toISOString();
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
    db.from("orders").select("id,customer_id,duration_minutes,status").eq("id", id).maybeSingle(),
    db.from("appointments").select("id,expert_id,starts_at,status").eq("order_id", id).eq("selection_rank", 1).maybeSingle(),
  ]);
  if (orderError || !order) return NextResponse.json({ error: "Order niet gevonden." }, { status: 404 });
  if (appointment?.status === "confirmed" || order.status === "confirmed") return NextResponse.json({ error: "Een definitieve afspraak kan alleen via de order worden gewijzigd." }, { status: 409 });

  const minutes = appointment ? new Date(appointment.starts_at).getUTCHours() * 60 + new Date(appointment.starts_at).getUTCMinutes() : 8 * 60;
  const values = {
    customer_id: order.customer_id,
    starts_at: timestamp(day, minutes),
    ends_at: timestamp(day, minutes + (order.duration_minutes || 60)),
    status: "proposed",
  };

  if (appointment) {
    const { error } = await db.from("appointments").update(values).eq("id", appointment.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { data: expert } = await db.from("experts").select("id").order("name").limit(1).maybeSingle();
    if (!expert) return NextResponse.json({ error: "Voeg eerst een expert toe." }, { status: 400 });
    const { error } = await db.from("appointments").insert({ ...values, expert_id: expert.id, order_id: order.id, selection_rank: 1 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
