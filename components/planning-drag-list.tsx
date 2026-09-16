"use client";

import { useState } from "react";

export type DraggableOrder = {
  id: string;
  title: string;
  detail: string;
};

export function PlanningDragList({ orders }: { orders: DraggableOrder[] }) {
  const [dragging, setDragging] = useState<string | null>(null);

  return <aside className="card draggable-orders">
    <div className="eyebrow">Handmatig plannen</div>
    <h2>Klantgroepen slepen ({orders.length})</h2>
    <p className="muted">Dezelfde klant op hetzelfde adres staat hier één keer. Sleep de groep naar de gewenste dag in de weekplanner.</p>
    <div className="draggable-order-list">
      {orders.map((order) => <article
        className={`draggable-order ${dragging === order.id ? "is-dragging" : ""}`}
        draggable
        key={order.id}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", order.id);
          setDragging(order.id);
        }}
        onDragEnd={() => setDragging(null)}
      >
        <strong>{order.title}</strong>
        <span>{order.detail}</span>
      </article>)}
    </div>
  </aside>;
}
