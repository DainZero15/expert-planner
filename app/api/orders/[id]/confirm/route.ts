import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  const { id } = await params;
  const form = await request.formData();
  const appointmentId = String(form.get("appointmentId") || "");
  const { data: appointment } = await db.from("appointments")
    .select("id")
    .eq("id", appointmentId)
    .eq("order_id", id)
    .eq("status", "proposed")
    .maybeSingle();
  if (!appointment) return NextResponse.redirect(new URL(`/planning/order/${id}`, request.url), 303);

  await db.from("appointments").update({ status: "confirmed" }).eq("id", appointment.id);
  await db.from("appointments").delete().eq("order_id", id).eq("status", "proposed");
  await db.from("orders").update({ status: "confirmed" }).eq("id", id);
  return NextResponse.redirect(new URL("/planning", request.url), 303);
}
