import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNavigation } from "@/components/app-navigation";
import { BranchForm } from "@/components/branch-form";

export default async function BranchesPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data: branches } = await db.from("branches").select("id,name,address_line,postal_code,city").order("name");

  return <main className="shell">
    <header className="topbar"><Link className="brand" href="/dashboard">Expert Planner</Link><AppNavigation /></header>
    <section className="card">
      <div className="eyebrow">Vestigingen</div>
      <h1>Vestigingen beheren</h1>
      <p className="muted">Voeg een winkel één keer toe. Nieuwe imports koppelen daarna automatisch orders aan de vestiging die in het bestand staat, bijvoorbeeld Drunen of Kaatsheuvel.</p>
      <BranchForm />
    </section>
    <section className="card" style={{ marginTop: 20 }}>
      <h2>Uw vestigingen</h2>
      {branches?.length ? <div className="branch-list">{branches.map((branch) => <article className="branch-row" key={branch.id}>
        <div><strong>{branch.name}</strong><span>{[branch.address_line, branch.postal_code, branch.city].filter(Boolean).join(", ") || "Adres nog aanvullen voor routeplanning"}</span></div>
        <form action="/api/branches" method="post"><input type="hidden" name="intent" value="delete" /><input type="hidden" name="id" value={branch.id} /><button className="danger">Verwijderen</button></form>
      </article>)}</div> : <p className="muted">Nog geen vestigingen. U kunt hier beginnen met Drunen en Kaatsheuvel.</p>}
    </section>
  </main>;
}
