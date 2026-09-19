import Link from "next/link";

const benefits = [
  ["↗", "Snel overzicht", "Orders, klanten en monteurs op één vertrouwde plek."],
  ["◷", "Rust in de planning", "Maak een weekvoorstel en houd zelf de controle."],
  ["✓", "Klaar voor de werkdag", "Van import tot route: duidelijk en praktisch."],
];

export default function Home() {
  return (
    <main className="shell landing-shell">
      <header className="topbar"><Link className="brand" href="/">Expert Planner</Link><Link className="landing-login" href="/login">Inloggen <span>→</span></Link></header>

      <section className="landing-hero">
        <div className="landing-copy">
          <div className="eyebrow">Expert Planner</div>
          <h1>De werkdag begint met een heldere planning.</h1>
          <p>Plan klanten, verdeel werk over uw monteurs en houd iedere route overzichtelijk. Alles wat u nodig heeft, zonder gedoe.</p>
          <div className="landing-actions">
            <Link className="landing-primary" href="/login">Naar de planner <span>→</span></Link>
            <span>Veilig inloggen voor uw team</span>
          </div>
        </div>

        <div className="landing-preview" aria-label="Voorbeeld van een dagplanning">
          <div className="landing-preview-head"><span>Vandaag</span><strong>Vrijdag 19 sep</strong></div>
          <div className="landing-preview-row"><time>09:00</time><div><b>TV installatie</b><span>Anna Vermeer · Waalwijk</span></div></div>
          <div className="landing-preview-route"><span>↗</span> Reistijd · 15 min</div>
          <div className="landing-preview-row"><time>10:45</time><div><b>Wasmachine aansluiten</b><span>Bas de Vries · Drunen</span></div></div>
          <div className="landing-preview-route"><span>☼</span> Pauze · 60 min</div>
          <div className="landing-preview-row is-last"><time>13:15</time><div><b>Oven inbouwen</b><span>Femke Bakker · Heusden</span></div></div>
        </div>
      </section>

      <section className="landing-benefits" aria-label="Voordelen">
        {benefits.map(([icon, title, description]) => <article key={title}><span>{icon}</span><div><h2>{title}</h2><p>{description}</p></div></article>)}
      </section>
    </main>
  );
}
