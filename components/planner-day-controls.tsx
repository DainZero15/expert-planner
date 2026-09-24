"use client";

import { useState } from "react";

export function PlannerDayControls() {
  const [expanded, setExpanded] = useState(true);

  const setDays = (open: boolean) => {
    document.querySelectorAll<HTMLDetailsElement>("details[data-planner-day]").forEach((day) => {
      day.open = open;
    });
    setExpanded(open);
  };

  return <div className="planner-day-controls" aria-label="Dagen tonen of verbergen">
    <span>Monteurs per dag</span>
    <button type="button" className="secondary-button" onClick={() => setDays(true)}>Alles uitklappen</button>
    <button type="button" className="secondary-button" onClick={() => setDays(false)}>Alles inklappen</button>
    <small>{expanded ? "Klik links bij een dag om alleen die dag in of uit te klappen." : "Klap een dag links uit om de monteurs en blokken te zien."}</small>
  </div>;
}
