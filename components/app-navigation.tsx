import Link from "next/link";
import type { ReactNode } from "react";

type IconName = "home" | "import" | "customers" | "planning" | "experts";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
    import: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 21h16" /></>,
    customers: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-2a6 6 0 0 1 12 0v2" /><path d="M17 11a3 3 0 1 0-1-5.83" /><path d="M18 21v-2a6 6 0 0 0-3-5.2" /></>,
    planning: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /><path d="M8 14h3M13 14h3M8 18h3" /></>,
    experts: <><circle cx="12" cy="8" r="3" /><path d="M5 21a7 7 0 0 1 14 0" /><path d="M19 4v4M17 6h4" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

const links: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Overzicht", icon: "home" },
  { href: "/import", label: "Orders importeren", icon: "import" },
  { href: "/customers", label: "Klanten", icon: "customers" },
  { href: "/planning", label: "Weekplanning", icon: "planning" },
  { href: "/experts", label: "Experts", icon: "experts" },
];

export function AppNavigation() {
  return <nav className="app-navigation" aria-label="Hoofdmenu">{links.map((link) => <Link key={link.href} href={link.href as never}><Icon name={link.icon} /><span>{link.label}</span></Link>)}</nav>;
}
