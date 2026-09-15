import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExpertFields } from "../fields";

export default async function EditExpertPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const { data: expert } = await db.from("experts").select("*").eq("id", id).maybeSingle();
  if (!expert) notFound();
  const profile = expert.preferences && typeof expert.preferences === "object" ? expert.preferences as { skills?: string[]; notes?: string } : {};
  return <main className="shell"><header className="topbar"><Link className="brand" href="/dashboard">Expert <span>Planner</span></Link><Link href="/experts">Terug naar experts</Link></header><form action="/api/experts" method="post" className="card"><div className="eyebrow">Expert beheren</div><h1>{expert.name} wijzigen</h1><ExpertFields expert={{ id: expert.id, name: expert.name, start: String((expert.start_address as { address?: string })?.address || ""), end: String((expert.end_address as { address?: string })?.address || ""), startTime: String(expert.start_time).slice(0, 5), endTime: String(expert.end_time).slice(0, 5), breakMinutes: expert.break_minutes, visitMinutes: expert.default_visit_minutes, areas: expert.service_areas, excluded: expert.excluded_areas, skills: profile.skills, notes: profile.notes }} /><button type="submit">Wijzigingen opslaan</button></form></main>;
}
