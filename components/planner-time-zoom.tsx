"use client";

import { useEffect, useState } from "react";

const zoomLevels = [80, 100, 120, 150, 180];
const widthFor = (hourWidth: number) => `${170 + hourWidth * 24}px`;

export function PlannerTimeZoom() {
  const [hourWidth, setHourWidth] = useState(120);

  const apply = (nextWidth: number) => {
    document.documentElement.style.setProperty("--planner-hour-width", `${nextWidth}px`);
    document.documentElement.style.setProperty("--planner-calendar-width", widthFor(nextWidth));
    window.localStorage.setItem("expert-planner-hour-width", String(nextWidth));
    setHourWidth(nextWidth);
  };

  useEffect(() => {
    const saved = Number(window.localStorage.getItem("expert-planner-hour-width"));
    if (zoomLevels.includes(saved)) apply(saved);
  }, []);

  const level = zoomLevels.indexOf(hourWidth);
  return <div className="planner-time-zoom" aria-label="Tijdschaal van de planning">
    <span>Tijdschaal</span>
    <button type="button" className="secondary-button" disabled={level <= 0} onClick={() => apply(zoomLevels[Math.max(0, level - 1)])}>− Uren smaller</button>
    <strong>{hourWidth}px per uur</strong>
    <button type="button" className="secondary-button" disabled={level >= zoomLevels.length - 1} onClick={() => apply(zoomLevels[Math.min(zoomLevels.length - 1, level + 1)])}>+ Uren groter</button>
    <small>Vergroot de uren voor meer ruimte in alle afspraakblokken.</small>
  </div>;
}
