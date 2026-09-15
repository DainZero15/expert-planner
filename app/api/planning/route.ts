import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const norm = (value: string) => value.toLocaleLowerCase("nl-NL").trim();
const expertSkills = (preferences: unknown) => preferences && typeof preferences === "object" && Array.isArray((preferences as { skills?: unknown }).skills) ? (preferences as { skills: unknown[] }).skills.filter((skill): skill is string => typeof skill === "string") : [];

export async function POST(request: Request) {
  const form = await request.formData();
  const customerId = String(form.get("customerId") || "");
  const expertId = String(form.get("expertId") || "");
  const workType = String(form.get("workType") || "").trim();
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  if (!customerId) return NextResponse.redirect(new URL("/planning", request.url), 303);
  const { data: customer } = await db.from("customers").select("extra_fields").eq("id", customerId).maybeSingle();
  const extra = customer?.extra_fields && typeof customer.extra_fields === "object" ? customer.extra_fields : {};
  if (!expertId) {
    await db.from("customers").update({ extra_fields: { ...extra, work_type: workType } }).eq("id", customerId);
    return NextResponse.redirect(new URL("/planning", request.url), 303);
  }
  const { data: expert } = await db.from("experts").select("preferences").eq("id", expertId).maybeSingle();
  const canDoWork = expertSkills(expert?.preferences).some((skill) => norm(skill).includes(norm(workType)) || norm(workType).includes(norm(skill)));
  if (workType && canDoWork) await db.from("customers").update({ assigned_expert_id: expertId, extra_fields: { ...extra, work_type: workType } }).eq("id", customerId);
  return NextResponse.redirect(new URL("/planning", request.url), 303);
}
