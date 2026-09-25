"use client";

import { useEffect, useRef, useState } from "react";

const zoomLevels = [80, 90, 100, 110, 120, 130, 140, 150, 165, 180];
const widthFor = (hourWidth: number) => `${170 + hourWidth * 24}px`;

export function PlannerTimeZoom() {
  const [hourWidth, setHourWidth] = useState(120);
  const lastTrackpadZoom = useRef(0);

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

  useEffect(() => {
    const calendar = document.querySelector<HTMLElement>(".calendar-scroll");
    if (!calendar) return;
    const zoomWithTrackpad = (event: WheelEvent) => {
      // A trackpad pinch is exposed as ctrl+wheel by Chromium. Capture it so
      // it enlarges the planning hours instead of the entire browser page.
      if (!event.ctrlKey) return;
      event.preventDefault();
      const now = Date.now();
      // Trackpads emit many small wheel events for a single pinch. Limit the
      // response so zooming feels deliberate instead of jumping several steps.
      if (now - lastTrackpadZoom.current < 280) return;
      const index = zoomLevels.indexOf(hourWidth);
      const nextIndex = event.deltaY < 0
        ? Math.min(zoomLevels.length - 1, index + 1)
        : Math.max(0, index - 1);
      if (nextIndex !== index) {
        lastTrackpadZoom.current = now;
        apply(zoomLevels[nextIndex]);
      }
    };
    calendar.addEventListener("wheel", zoomWithTrackpad, { passive: false });
    return () => calendar.removeEventListener("wheel", zoomWithTrackpad);
  }, [hourWidth]);

  const level = zoomLevels.indexOf(hourWidth);
  return <div className="planner-time-zoom" aria-label="Tijdschaal van de planning">
    <span>Tijdschaal</span>
    <button type="button" className="secondary-button" disabled={level <= 0} onClick={() => apply(zoomLevels[Math.max(0, level - 1)])}>− Uren smaller</button>
    <strong>{hourWidth}px per uur</strong>
    <button type="button" className="secondary-button" disabled={level >= zoomLevels.length - 1} onClick={() => apply(zoomLevels[Math.min(zoomLevels.length - 1, level + 1)])}>+ Uren groter</button>
    <small>Knijp met het trackpad boven de planning, of gebruik de knoppen.</small>
  </div>;
}
