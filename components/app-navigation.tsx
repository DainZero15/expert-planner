"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

type IconName = "home" | "import" | "customers" | "planning" | "experts" | "branches" | "profile";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
    import: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 21h16" /></>,
    customers: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-2a6 6 0 0 1 12 0v2" /><path d="M17 11a3 3 0 1 0-1-5.83" /><path d="M18 21v-2a6 6 0 0 0-3-5.2" /></>,
    planning: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /><path d="M8 14h3M13 14h3M8 18h3" /></>,
    experts: <><circle cx="12" cy="8" r="3" /><path d="M5 21a7 7 0 0 1 14 0" /><path d="M19 4v4M17 6h4" /></>,
    branches: <><path d="M4 21V7l8-4 8 4v14" /><path d="M3 21h18M8 10h2M14 10h2M8 14h2M14 14h2M11 21v-4h2" /></>,
    profile: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06-2.1 2.1-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.55V20h-3v-.08A1.7 1.7 0 0 0 10.7 18.4a1.7 1.7 0 0 0-1.87.34l-.06.06-2.1-2.1.06-.06A1.7 1.7 0 0 0 7.07 14.8a1.7 1.7 0 0 0-1.55-1.03H5.5v-3h.08A1.7 1.7 0 0 0 7.1 9.74a1.7 1.7 0 0 0-.34-1.87L6.7 7.8l2.1-2.1.06.06a1.7 1.7 0 0 0 1.87.34 1.7 1.7 0 0 0 1.03-1.55V4.5h3v.08a1.7 1.7 0 0 0 1.03 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06 2.1 2.1-.06.06a1.7 1.7 0 0 0-.34 1.87 1.7 1.7 0 0 0 1.55 1.03h.08v3h-.08A1.7 1.7 0 0 0 19.4 15Z" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

type NavigationKey = "home" | "import" | "customers" | "branches" | "planning" | "experts";
const links: { href: string; label: string; icon: NavigationKey }[] = [
  { href: "/dashboard", label: "Overzicht", icon: "home" }, { href: "/import", label: "Orders importeren", icon: "import" }, { href: "/customers", label: "Klanten", icon: "customers" }, { href: "/branches", label: "Vestigingen", icon: "branches" }, { href: "/planning", label: "Weekplanning", icon: "planning" }, { href: "/experts", label: "Experts", icon: "experts" },
];

export function AppNavigation() {
  const [visible, setVisible] = useState<Record<string, boolean> | null>(null);
  useEffect(() => {
    try { setVisible(JSON.parse(localStorage.getItem("expert-planner-navigation") || "{}") as Record<string, boolean>); } catch { setVisible({}); }
  }, []);
  return <nav className="app-navigation" aria-label="Hoofdmenu">{links.filter((link) => visible?.[link.icon] !== false).map((link) => <Link key={link.href} href={link.href as never}><Icon name={link.icon} /><span>{link.label}</span></Link>)}<Link href={"/profile" as never}><Icon name="profile" /><span>Profiel</span></Link></nav>;
}
