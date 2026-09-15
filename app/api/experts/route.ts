import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const list = (value: FormDataEntryValue | null) => String(value || "").split(",").map((part) => part.trim()).filter(Boolean);
const number = (value: FormDataEntryValue | null, fallback: number) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export async function POST(request: Request) {
  const data = await request.formData();
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const id = String(data.get("id") || "");
  if (data.get("intent") === "delete") {
    if (id) await db.from("experts").delete().eq("id", id);
    return NextResponse.redirect(new URL("/experts", request.url), 303);
  }
  const name = String(data.get("name") || "").trim();
  const start = String(data.get("start") || "").trim();
  const end = String(data.get("end") || "").trim();
  if (!name || !start || !end) return NextResponse.redirect(new URL(id ? `/experts/${id}` : "/experts", request.url), 303);
  const values = { name, start_address: { address: start }, end_address: { address: end }, start_time: String(data.get("startTime") || "08:00"), end_time: String(data.get("endTime") || "17:00"), break_minutes: number(data.get("breakMinutes"), 30), default_visit_minutes: number(data.get("visitMinutes"), 60), service_areas: list(data.get("areas")), excluded_areas: list(data.get("excluded")), preferences: { skills: list(data.get("skills")), notes: String(data.get("preferences") || "") } };
  if (id) await db.from("experts").update(values).eq("id", id); else await db.from("experts").insert(values);
  return NextResponse.redirect(new URL("/experts", request.url), 303);
}
