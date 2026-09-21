import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const list = (value: FormDataEntryValue | null) => String(value || "").split(",").map((part) => part.trim()).filter(Boolean);
const selectedSkills = (data: FormData) => [...new Set(data.getAll("skills").map((value) => String(value).trim()).filter(Boolean))];
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
  const startBranchId = String(data.get("startBranchId") || "").trim() || null;
  const lunchBranchId = String(data.get("lunchBranchId") || "").trim() || null;
  const endBranchId = String(data.get("endBranchId") || "").trim() || null;
  const selectedBranchIds = [startBranchId, lunchBranchId, endBranchId].filter((branchId): branchId is string => Boolean(branchId));
  const { data: branchData } = selectedBranchIds.length ? await db.from("branches").select("id,address_line,postal_code,city").in("id", selectedBranchIds) : { data: [] };
  const branchAddress = (branchId: string | null) => {
    const branch = branchData?.find((item) => item.id === branchId);
    return branch ? [branch.address_line, branch.postal_code, branch.city].filter(Boolean).join(", ") : "";
  };
  const start = branchAddress(startBranchId) || String(data.get("start") || "").trim();
  const end = branchAddress(endBranchId) || String(data.get("end") || "").trim();
  // A fixed depot is optional. Most teams start where the day makes sense,
  // so the planner may begin with the first assigned customer instead.
  if (!name) return NextResponse.redirect(new URL(id ? `/experts/${id}` : "/experts", request.url), 303);
  const values = { name, start_branch_id: startBranchId, lunch_branch_id: lunchBranchId, end_branch_id: endBranchId, start_address: { address: start }, end_address: { address: end }, start_time: String(data.get("startTime") || "08:00"), end_time: String(data.get("endTime") || "17:00"), break_minutes: number(data.get("breakMinutes"), 30), default_visit_minutes: number(data.get("visitMinutes"), 60), service_areas: list(data.get("areas")), excluded_areas: list(data.get("excluded")), preferences: { skills: selectedSkills(data), notes: String(data.get("preferences") || "") } };
  if (id) await db.from("experts").update(values).eq("id", id); else await db.from("experts").insert(values);
  return NextResponse.redirect(new URL("/experts", request.url), 303);
}
