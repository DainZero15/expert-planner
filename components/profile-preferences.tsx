"use client";

import { useEffect, useState } from "react";

const items = [
  ["home", "Overzicht"], ["import", "Orders importeren"], ["customers", "Klanten"], ["branches", "Vestigingen"], ["planning", "Weekplanning"], ["experts", "Experts"],
] as const;
type Key = typeof items[number][0];
type Navigation = Record<Key, boolean>;
const defaults = Object.fromEntries(items.map(([key]) => [key, true])) as Navigation;

export function ProfilePreferences() {
  const [navigation, setNavigation] = useState<Navigation>(defaults);
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [ready, setReady] = useState(false);
  const save = (nextNavigation: Navigation, nextDensity: "comfortable" | "compact") => {
    localStorage.setItem("expert-planner-navigation", JSON.stringify(nextNavigation));
    localStorage.setItem("expert-planner-density", nextDensity);
    document.documentElement.dataset.plannerDensity = nextDensity;
  };
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("expert-planner-navigation") || "{}") as Partial<Navigation>;
      const nextNavigation = { ...defaults, ...saved };
      const nextDensity = localStorage.getItem("expert-planner-density") === "compact" ? "compact" : "comfortable";
      setNavigation(nextNavigation); setDensity(nextDensity); save(nextNavigation, nextDensity);
    } finally { setReady(true); }
  }, []);
  return <section className="card profile-preferences">
    <div className="eyebrow">Mijn profiel</div><h1>Maak de planner van uzelf</h1>
    <p className="muted">Kies wat u bovenin wilt zien en hoeveel ruimte u prettig vindt. Uw keuzes worden meteen onthouden in deze browser.</p>
    <h2>Knoppen in de bovenbalk</h2>
    <div className="profile-choice-grid">{items.map(([key, label]) => <label key={key} className="profile-choice"><input type="checkbox" checked={navigation[key]} onChange={(event) => { const next = { ...navigation, [key]: event.target.checked }; setNavigation(next); save(next, density); }} /><span>{label}</span></label>)}</div>
    <h2>Weergave</h2>
    <div className="profile-choice-grid"><label className="profile-choice"><input type="radio" name="density" checked={density === "comfortable"} onChange={() => { setDensity("comfortable"); save(navigation, "comfortable"); }} /><span>Ruim - meer leesruimte</span></label><label className="profile-choice"><input type="radio" name="density" checked={density === "compact"} onChange={() => { setDensity("compact"); save(navigation, "compact"); }} /><span>Compact - meer informatie tegelijk</span></label></div>
    {ready && <p className="profile-saved">✓ Opgeslagen. De bovenbalk past zich direct aan.</p>}
  </section>;
}
