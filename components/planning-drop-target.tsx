"use client";

import { type ReactNode, useState } from "react";

export function PlanningDropTarget({ date, children }: { date: string; children: ReactNode }) {
  const [dropping, setDropping] = useState(false);

  return <div
    className={`calendar-track calendar-drop-target ${dropping ? "is-drop-target" : ""}`}
    onDragOver={(event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDropping(true);
    }}
    onDragLeave={() => setDropping(false)}
    onDrop={async (event) => {
      event.preventDefault();
      setDropping(false);
      const orderId = event.dataTransfer.getData("text/plain");
      if (!orderId) return;
      const response = await fetch(`/api/orders/${orderId}/move`, {
        method: "POST",
        body: new URLSearchParams({ date }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        window.alert(body.error || "De order kon niet worden verplaatst.");
        return;
      }
      window.location.reload();
    }}
  >{children}</div>;
}
