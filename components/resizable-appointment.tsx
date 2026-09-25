"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

type Props = {
  href: string;
  className: string;
  left: string;
  top: string;
  maxWidth: number;
  durationMinutes: number;
  children: ReactNode;
};

// Appointment duration is determined by the order and the planner. The user
// changes the time scale for the whole calendar instead of stretching a single
// order, which would otherwise create confusing overlaps.
export function ResizableAppointment({ href, className, left, top, maxWidth, durationMinutes, children }: Props) {
  const router = useRouter();
  const width = Math.min(maxWidth, durationMinutes / 60 / 24 * 100);

  return <div
    className={className}
    role="link"
    tabIndex={0}
    onClick={() => router.push(href as never)}
    onKeyDown={(event) => { if (event.key === "Enter") router.push(href as never); }}
    style={{ left, top, width: `calc(${width}% - 7px)` }}
  >
    {children}
  </div>;
}
