"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

type Props = {
  appointmentId: string;
  orderId: string | null;
  href: string;
  className: string;
  left: string;
  top: string;
  maxWidth: number;
  durationMinutes: number;
  children: ReactNode;
};

const minimumMinutes = 15;
const pixelsPerMinute = 80 / 60;

export function ResizableAppointment({ appointmentId, orderId, href, className, left, top, maxWidth, durationMinutes, children }: Props) {
  const router = useRouter();
  const [minutes, setMinutes] = useState(durationMinutes);
  const [saving, setSaving] = useState(false);
  const resize = useRef<{ pointerId: number; clientX: number; initialMinutes: number; latestMinutes: number } | null>(null);
  const width = Math.min(maxWidth, minutes / 60 / 24 * 100);

  const finishResize = async () => {
    const current = resize.current;
    resize.current = null;
    if (!current || current.latestMinutes === durationMinutes || !orderId) return;
    setSaving(true);
    const response = await fetch(`/api/orders/${orderId}/duration`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ appointmentId, durationMinutes: current.latestMinutes }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      window.alert(body.error || "De duur kon niet worden aangepast.");
      setMinutes(durationMinutes);
      return;
    }
    router.refresh();
  };

  return <div
    className={`${className} resizable-appointment`}
    role="link"
    tabIndex={0}
    onClick={() => { if (!resize.current) router.push(href as never); }}
    onKeyDown={(event) => { if (event.key === "Enter") router.push(href as never); }}
    style={{ left, top, width: `calc(${width}% - 7px)` }}
  >
    {children}
    {orderId && <button
      type="button"
      className="appointment-resize-handle"
      title="Sleep om de benodigde tijd aan te passen"
      aria-label="Benodigde tijd aanpassen"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => {
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        resize.current = { pointerId: event.pointerId, clientX: event.clientX, initialMinutes: minutes, latestMinutes: minutes };
      }}
      onPointerMove={(event) => {
        const current = resize.current;
        if (!current || current.pointerId !== event.pointerId) return;
        const next = Math.max(minimumMinutes, Math.round((current.initialMinutes + (event.clientX - current.clientX) / pixelsPerMinute) / 5) * 5);
        const maximum = Math.floor(maxWidth * 24 * 60 / 100 / 5) * 5;
        const bounded = Math.min(maximum, next);
        setMinutes(bounded);
        resize.current = { ...current, latestMinutes: bounded };
      }}
      onPointerUp={finishResize}
      onPointerCancel={() => { resize.current = null; setMinutes(durationMinutes); }}
    ><span>{saving ? "…" : "↔"}</span></button>}
  </div>;
}
