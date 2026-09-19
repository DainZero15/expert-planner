import Link from "next/link";
import { LoginForm } from "./login-form";
export default function LoginPage() {
  return <main className="shell login-shell">
    <header className="topbar"><Link className="brand" href="/">Expert <span>Planner</span></Link></header>
    <section className="login-layout">
      <aside className="login-welcome">
        <div className="eyebrow">Welkom terug</div>
        <h1>Een rustige start van uw werkdag.</h1>
        <p>Log in en houd orders, experts en routes overzichtelijk bij elkaar.</p>
        <div className="login-benefits">
          <div><span>1</span><p><strong>Orders op één plek</strong><br />Importeer en controleer uw werkvoorraad.</p></div>
          <div><span>2</span><p><strong>Een duidelijke week</strong><br />Plan experts en afspraken in één overzicht.</p></div>
          <div><span>3</span><p><strong>Altijd aanpasbaar</strong><br />Maak een voorstel en houd zelf de regie.</p></div>
        </div>
      </aside>
      <div className="login-card-wrap"><LoginForm /></div>
    </section>
  </main>;
}
