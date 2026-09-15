import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { customerAddress, splitDuplicates } from "@/lib/customers/duplicates";

export default async function DuplicateCustomersPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await db.from("customers").select("id,customer_number,name,address_line,postal_code,city,phone,email").order("name").limit(1000);
  const customers = data ?? [];
  const { duplicates, duplicateRows } = splitDuplicates(customers);
  return <main className="shell"><header className="topbar"><Link className="brand" href="/dashboard">Expert <span>Planner</span></Link><Link href="/customers">Terug naar klanten</Link></header><section className="card"><div className="eyebrow">Controlelijst</div><h1>Mogelijke dubbelen</h1><p className="muted">{duplicateRows} klantregels in {duplicates.length} groep{duplicates.length === 1 ? "" : "en"}. Dit zijn alleen dezelfde naam én hetzelfde adres; er is niets verwijderd.</p>{!duplicates.length && <p>Geen mogelijke dubbelen gevonden.</p>}{duplicates.map((group) => <article className="duplicate-group" key={group[0].id}><h2>{group[0].name}</h2><p>{customerAddress(group[0])}</p><p className="muted">{group.length} keer geïmporteerd</p><ul>{group.map((customer) => <li key={customer.id}>Klantnummer: {customer.customer_number || "geen nummer"} · {customer.phone || customer.email || "geen contactgegevens"}</li>)}</ul></article>)}</section></main>;
}
