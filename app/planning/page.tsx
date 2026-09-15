import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const norm = (value: string) => value.toLocaleLowerCase("nl-NL").trim();
const workType = (fields: unknown) => {
  if (!fields || typeof fields !== "object") return "";
  const value = (fields as { work_type?: unknown }).work_type;
  return typeof value === "string" ? value : "";
};
const skills = (fields: unknown) => {
  if (!fields || typeof fields !== "object") return [];
  const value = (fields as { skills?: unknown }).skills;
  return Array.isArray(value) ? value.filter((skill): skill is string => typeof skill === "string") : [];
};
const suitable = (type: string, expertSkills: string[]) => !type || expertSkills.some((skill) => norm(skill).includes(norm(type)) || norm(type).includes(norm(skill)));

export default async function PlanningPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: customerData }, { data: expertData }] = await Promise.all([
    db.from("customers").select("id,name,address_line,postal_code,city,priority,assigned_expert_id,extra_fields").order("priority").limit(500),
    db.from("experts").select("id,name,preferences").order("name"),
  ]);
  const customers = customerData ?? [];
  const experts = expertData ?? [];
  const assigned = customers.filter((customer) => customer.assigned_expert_id).length;
  return <main className="shell"><header className="topbar"><Link className="brand" href="/dashboard">Expert <span>Planner</span></Link><Link href="/experts">Experts beheren</Link></header><section className="card"><div className="eyebrow">Stap 1 van routeplanning</div><h1>Werkverdeling</h1><p className="muted">Koppel eerst ieder bezoek aan een expert die de juiste werksoort beheerst. Daarna bouwen we hierop de dagroute en de echte Plan A, B en C-opties. Er worden nu geen reistijden geschat.</p><div className="grid"><article><h2>{customers.length}</h2><p className="muted">klanten klaar voor verdeling</p></article><article><h2>{assigned}</h2><p className="muted">al aan expert gekoppeld</p></article><article><h2>{customers.length - assigned}</h2><p className="muted">nog te verdelen</p></article></div></section><section className="card" style={{ marginTop: 20 }}><h2>Klanten koppelen aan de juiste expert</h2>{!experts.length && <p className="error">Voeg eerst minstens één expert toe, inclusief werksoorten.</p>}<div style={{ overflowX: "auto" }}><table><thead><tr><th>Klant</th><th>Adres</th><th>Werksoort</th><th>Geschikte expert</th><th /></tr></thead><tbody>{customers.map((customer) => { const type = workType(customer.extra_fields); return <tr key={customer.id}><td><strong>{customer.name}</strong><br /><small>Prioriteit {customer.priority}</small></td><td>{[customer.address_line, customer.postal_code, customer.city].filter(Boolean).join(", ")}</td><td><form action="/api/planning" method="post" className="planning-form"><input type="hidden" name="customerId" value={customer.id} /><input name="workType" defaultValue={type} list="work-types" placeholder="Kies of typ werksoort" /><input type="hidden" name="expertId" value="" /><button className="secondary" type="submit">Werksoort opslaan</button></form></td><td><form action="/api/planning" method="post" className="planning-form"><input type="hidden" name="customerId" value={customer.id} /><input type="hidden" name="workType" value={type} /><select name="expertId" defaultValue={customer.assigned_expert_id || ""} disabled={!type}><option value="">{type ? "Kies expert" : "Vul eerst werksoort in"}</option>{experts.filter((expert) => suitable(type, skills(expert.preferences))).map((expert) => <option key={expert.id} value={expert.id}>{expert.name} ({skills(expert.preferences).join(", ") || "geen werksoorten"})</option>)}</select><button disabled={!type}>Toewijzen</button></form></td><td>{customer.assigned_expert_id ? <span className="tag">Toegewezen</span> : <span className="muted">Nog niet</span>}</td></tr>; })}</tbody></table></div><datalist id="work-types"><option value="Audio" /><option value="Witgoed" /><option value="Sonos installatie" /><option value="Inbouw" /></datalist>{!customers.length && <p className="muted">Importeer eerst klanten.</p>}</section></main>;
}
