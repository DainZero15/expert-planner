import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const { id } = await params;
  const form = await request.formData();
  const expertIds = [...new Set(form.getAll("expertId").filter((value): value is string => typeof value === "string"))];
  const { data: order } = await db.from("orders").select("required_people").eq("id", id).maybeSingle();
  if (!order || expertIds.length < order.required_people) return NextResponse.redirect(new URL(`/planning/order/${id}`, request.url), 303);
  await db.from("order_experts").delete().eq("order_id", id);
  await db.from("order_experts").insert(expertIds.map((expertId) => ({ order_id: id, expert_id: expertId })));
  return NextResponse.redirect(new URL(`/planning/order/${id}`, request.url), 303);
}
