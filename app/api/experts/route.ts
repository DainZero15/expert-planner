import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const number = (value: FormDataEntryValue | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const places = (value: FormDataEntryValue | null) => String(value || "")
  .split(",")
  .map((place) => place.trim())
  .filter(Boolean);

export async function POST(request: Request) {
  const formData = await request.formData();
  const name = String(formData.get("name") || "").trim();
  const start = String(formData.get("start") || "").trim();
  const end = String(formData.get("end") || "").trim();

  if (!name || !start || !end) {
    return NextResponse.redirect(new URL("/experts", request.url), 303);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  await supabase.from("experts").insert({
    name,
    start_address: { address: start },
    end_address: { address: end },
    start_time: String(formData.get("startTime") || "08:00"),
    end_time: String(formData.get("endTime") || "17:00"),
    break_minutes: number(formData.get("breakMinutes"), 30),
    default_visit_minutes: number(formData.get("visitMinutes"), 60),
    service_areas: places(formData.get("areas")),
    excluded_areas: places(formData.get("excluded")),
    preferences: { notes: String(formData.get("preferences") || "") },
  });

  return NextResponse.redirect(new URL("/experts", request.url), 303);
}
