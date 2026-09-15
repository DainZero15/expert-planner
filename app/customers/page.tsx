import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CustomerForm from "./customer-form";
import { removeCustomer } from "./actions";
import { customerAddress, splitDuplicates } from "@/lib/customers/duplicates";

export default async function Customers() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await db.from("customers").select("id,customer_number,name,address_line,postal_code,city,phone,email,priority,status,geocode_status").neq("status", "archived").order("created_at", { ascending: false }).limit(200);
  const customers = data ?? [];
  const { regular, duplicates, duplicateRows } = splitDuplicates(customers);
  return <main className="shell"><header className="topbar"><Link className="brand" href="/dashboard">Expert <span>Planner</span></Link><nav className="header-links"><Link href="/import">Importeren</Link><Link href={"/customers/dubbelen" as never}>Mogelijke dubbelen ({duplicateRows})</Link></nav></header><CustomerForm/><section className="card" style={{ marginTop: 20 }}><h1>Klanten</h1><p className="muted">{regular.length} unieke klanten. {duplicates.length ? `${duplicateRows} regels staan apart bij mogelijke dubbelen.` : "Geen dubbele naam- en adrescombinaties gevonden."}</p><div style={{ overflowX: "auto" }}><table><thead><tr><th>Klant</th><th>Adres</th><th>Contact</th><th>Prioriteit</th><th>Status</th><th /></tr></thead><tbody>{regular.map((customer) => <tr key={customer.id}><td>{customer.name}{customer.customer_number && <><br /><small>{customer.customer_number}</small></>}</td><td>{customerAddress(customer)}</td><td>{customer.phone || customer.email || "—"}</td><td>{customer.priority}</td><td>{customer.geocode_status === "pending" ? "Adres te controleren" : customer.status}</td><td><form action={removeCustomer.bind(null, customer.id)}><button className="danger">Verwijderen</button></form></td></tr>)}</tbody></table>{!regular.length && <p className="muted">Nog geen unieke klanten. Mogelijke dubbelen staan apart.</p>}</div></section></main>;
}
