import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { customerAddress } from "@/lib/customers/duplicates";

export default async function DuplicateCustomersPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await db.from("customers").select("id,customer_number,name,address_line,postal_code,city,phone,email").eq("status", "archived").order("name").limit(1000);
  const customers = data ?? [];
  const groups = new Map<string, typeof customers>();
  for (const customer of customers) { const key = `${customer.name}|${customer.address_line}|${customer.postal_code || ""}|${customer.city || ""}`.toLocaleLowerCase("nl-NL"); groups.set(key, [...(groups.get(key) || []), customer]); }
  const archivedGroups = [...groups.values()];
  return <main className="shell"><header className="topbar"><Link className="brand" href="/dashboard">Expert <span>Planner</span></Link><Link href="/customers">Terug naar klanten</Link></header><section className="card"><div className="eyebrow">Orderarchief</div><h1>Samengevoegde klantregels</h1><p className="muted">{customers.length} oude klantregels in {archivedGroups.length} groep{archivedGroups.length === 1 ? "" : "en"}. De bijbehorende ordernummers blijven behouden als losse orders; de klant verschijnt maar één keer in de gewone klantenlijst.</p>{!archivedGroups.length && <p>Nog geen samengevoegde klantregels.</p>}{archivedGroups.map((group) => <article className="duplicate-group" key={group[0].id}><h2>{group[0].name}</h2><p>{customerAddress(group[0])}</p><p className="muted">{group.length} oude importregels</p><ul>{group.map((customer) => <li key={customer.id}>Vorig ordernummer: {customer.customer_number || "geen nummer"} · {customer.phone || customer.email || "geen contactgegevens"}</li>)}</ul></article>)}</section></main>;
}
