import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNavigation } from "@/components/app-navigation";
import { CustomerTrash } from "@/components/customer-trash";

export default async function CustomerTrashPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await db.from("customers").select("id,name,address_line,city").eq("status", "archived").order("created_at", { ascending: false });
  const customers = (data || []).map((customer) => ({ id: customer.id, name: customer.name, addressLine: customer.address_line, city: customer.city }));
  return <main className="shell"><header className="topbar"><Link className="brand" href="/dashboard">Expert Planner</Link><AppNavigation /><Link className="archive-link" href="/customers">Terug naar klanten</Link></header><section className="card"><div className="eyebrow">Prullenbak</div><h1>Gearchiveerde klanten</h1><p className="muted">Een klant verdwijnt eerst uit de planner. Kies daarna zelf welke klanten u terugzet of definitief verwijdert.</p><CustomerTrash customers={customers} /></section></main>;
}
