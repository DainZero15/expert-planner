import Link from "next/link";

export default function Home() {
  return <main className="shell"><header className="topbar"><Link className="brand" href="/">Expert <span>Planner</span></Link><Link href="/login">Inloggen</Link></header><section className="card hero"><div className="eyebrow">Fase 1 · Fundament</div><h1>Praktische planning voor iedere expert.</h1><p className="muted">Een veilige basis voor klanten, experts, routes en bezoekvoorstellen. De volgende fases voegen de dagelijkse plannerfuncties toe.</p><div className="grid"><article><h2>Veilig</h2><p className="muted">Inloggen en rolrechten via Supabase.</p></article><article><h2>Uitbreidbaar</h2><p className="muted">Datamodel voor de volledige routeplanning.</p></article><article><h2>Beheersbaar</h2><p className="muted">Instellingen blijven aanpasbaar in plaats van hardcoded.</p></article></div></section></main>;
}
