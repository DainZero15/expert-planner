import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNavigation } from "@/components/app-navigation";

type DashboardIcon = "import" | "planning" | "experts" | "customers" | "arrow";

function Icon({ name }: { name: DashboardIcon }) {
  const paths: Record<DashboardIcon, React.ReactNode> = {
    import: <><path d="M12 3v11" /><path d="m7.5 10 4.5 4.5 4.5-4.5" /><path d="M4 21h16" /></>,
    planning: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M8 14h3M13 14h3M8 18h3" /></>,
    experts: <><circle cx="12" cy="8" r="3" /><path d="M5 21a7 7 0 0 1 14 0M19 4v4M17 6h4" /></>,
    customers: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-2a6 6 0 0 1 12 0v2M17 11a3 3 0 1 0-1-5.83M18 21v-2a6 6 0 0 0-3-5.2" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

const steps: { href: string; icon: DashboardIcon; number: string; title: string; text: string; action: string }[] = [
  { href: "/import", icon: "import", number: "01", title: "Orders importeren", text: "Upload een Vendit-, Excel- of CSV-bestand en controleer de regels eerst.", action: "Bestand importeren" },
  { href: "/experts", icon: "experts", number: "02", title: "Team instellen", text: "Voeg experts toe met werktijden, werkgebied en werksoorten.", action: "Experts beheren" },
  { href: "/planning", icon: "planning", number: "03", title: "Weekvoorstel maken", text: "Bekijk de week, sleep orders handmatig of laat een voorstel maken.", action: "Open weekplanning" },
  { href: "/customers", icon: "customers", number: "04", title: "Klanten bekijken", text: "Bekijk unieke klanten en houd mogelijke dubbele regels apart.", action: "Naar klanten" },
];

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [ordersResult, expertsResult, customersResult] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).neq("status", "archived"),
    supabase.from("experts").select("id", { count: "exact", head: true }),
    supabase.from("customers").select("id", { count: "exact", head: true }).neq("status", "archived"),
  ]);
  const orders = ordersResult.count || 0;
  const experts = expertsResult.count || 0;
  const customers = customersResult.count || 0;

  return <main className="shell dashboard-shell">
    <header className="topbar">
      <Link className="brand" href="/dashboard">Expert <span>Planner</span></Link>
      <AppNavigation />
      <span className="user-email">{user.email}</span>
    </header>

    <section className="dashboard-hero">
      <div>
        <div className="eyebrow">Expert Planner · werkoverzicht</div>
        <h1>Uw planning, helder geregeld.</h1>
        <p>Van geïmporteerde order tot een werkbare route voor uw experts.</p>
        <div className="dashboard-hero-actions">
          <Link className="dashboard-primary-action" href="/planning">Naar weekplanning <Icon name="arrow" /></Link>
          <Link className="dashboard-secondary-action" href="/import">+ Orders importeren</Link>
        </div>
      </div>
      <div className="dashboard-status" aria-label="Huidige gegevens">
        <div><strong>{orders}</strong><span>openstaande orders</span></div>
        <div><strong>{experts}</strong><span>experts</span></div>
        <div><strong>{customers}</strong><span>unieke klanten</span></div>
      </div>
    </section>

    <section className="dashboard-section" aria-labelledby="start-heading">
      <div className="dashboard-section-heading"><div><div className="eyebrow">Snel starten</div><h2 id="start-heading">Wat wilt u doen?</h2></div><p>Volg de stappen van links naar rechts, of spring direct naar de planning.</p></div>
      <div className="dashboard-actions-grid">
        {steps.map((step) => <Link className="dashboard-action-card" href={step.href as never} key={step.href}>
          <div className="dashboard-card-top"><span className="dashboard-icon"><Icon name={step.icon} /></span><span className="dashboard-number">{step.number}</span></div>
          <h3>{step.title}</h3>
          <p>{step.text}</p>
          <span className="dashboard-card-link">{step.action} <Icon name="arrow" /></span>
        </Link>)}
      </div>
    </section>
  </main>;
}
