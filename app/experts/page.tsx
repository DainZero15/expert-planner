import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExpertFields } from "./fields";
import { AppNavigation } from "@/components/app-navigation";

export default async function ExpertsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: expertData }, { data: branchData }] = await Promise.all([
    supabase.from("experts").select("id,name,start_time,end_time,default_visit_minutes,preferences,start_branch_id,lunch_branch_id,end_branch_id").order("name"),
    supabase.from("branches").select("id,name,address_line,postal_code,city").order("name"),
  ]);
  const experts = expertData ?? [];
  const branches = branchData ?? [];
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));
  return <main className="shell"><header className="topbar"><Link className="brand" href="/dashboard">Expert <span>Planner</span></Link><AppNavigation /></header><form action="/api/experts" method="post" className="card"><h1>Expert toevoegen</h1><ExpertFields branches={branches}/><button type="submit">Expert opslaan</button></form><section className="card" style={{ marginTop: 20 }}><h1>Experts</h1>{experts.length ? experts.map((expert) => { const profile = expert.preferences && typeof expert.preferences === "object" ? expert.preferences as { skills?: string[] } : {}; const route = [expert.start_branch_id && branchNames.get(expert.start_branch_id), expert.lunch_branch_id && branchNames.get(expert.lunch_branch_id), expert.end_branch_id && branchNames.get(expert.end_branch_id)].filter(Boolean).join(" → "); return <article className="expert-row" key={expert.id}><div><strong>{expert.name}</strong><br /><span className="muted">{String(expert.start_time).slice(0, 5)}–{String(expert.end_time).slice(0, 5)} · {expert.default_visit_minutes} min · {profile.skills?.join(", ") || "werksoorten nog invullen"}{route && <><br />Vestigingen: {route}</>}</span></div><div className="actions"><Link className="button-link" href={`/experts/${expert.id}` as never}>Wijzigen</Link><form action="/api/experts" method="post"><input type="hidden" name="intent" value="delete" /><input type="hidden" name="id" value={expert.id} /><button className="danger">Verwijderen</button></form></div></article>; }) : <p>Geen experts.</p>}</section></main>;
}
