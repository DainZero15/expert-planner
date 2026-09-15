import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatTime } from "@/lib/planning/week";

export default async function CustomerPlanningPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const [{ data: customer }, { data: optionData }] = await Promise.all([
    db.from("customers").select("id,name,address_line,postal_code,city,phone,notes").eq("id", id).maybeSingle(),
    db.from("appointments").select("id,starts_at,ends_at,selection_rank,status,experts(name)").eq("customer_id", id).in("selection_rank", [1, 2, 3]).order("selection_rank"),
  ]);
  if (!customer) notFound();
  const options = optionData ?? [];
  return <main className="shell"><header className="topbar"><Link className="brand" href="/dashboard">Expert <span>Planner</span></Link><Link href="/planning">Terug naar weekplanner</Link></header><section className="card"><div className="eyebrow">Klant plannen</div><h1>{customer.name}</h1><p>{[customer.address_line, customer.postal_code, customer.city].filter(Boolean).join(", ")}</p>{customer.phone && <p>Telefoon: {customer.phone}</p>}{customer.notes && <p>Opmerking: {customer.notes}</p>}</section><section className="card" style={{ marginTop: 20 }}><h2>Bezoekmogelijkheden</h2><p className="muted">Plan A, B en C worden hier getoond zodra de route-engine de volledige week heeft doorgerekend. We tonen alleen haalbare opties op basis van echte reistijden, werktijden en andere afspraken.</p>{options.length ? <div className="option-grid">{options.map((option) => { const expert = option.experts as unknown as { name?: string } | null; return <article className="option" key={option.id}><strong>Plan {String.fromCharCode(64 + (option.selection_rank || 1))}</strong><p>{new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long" }).format(new Date(option.starts_at))}</p><p>{formatTime(option.starts_at)} · {expert?.name || "Expert"}</p><span className={option.status === "confirmed" ? "tag" : "muted"}>{option.status === "confirmed" ? "Definitief" : "Voorstel"}</span></article>; })}</div> : <p className="muted">Nog geen routevoorstel voor deze klant.</p>}</section></main>;
}
