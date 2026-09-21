"use client";

import { useState } from "react";

export type ArchivedCustomer = { id: string; name: string; addressLine: string; city: string | null };

export function CustomerTrash({ customers }: { customers: ArchivedCustomer[] }) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const all = customers.length > 0 && selected.length === customers.length;
  const toggleAll = () => setSelected(all ? [] : customers.map((customer) => customer.id));

  if (!customers.length) return <p className="muted">De prullenbak is leeg.</p>;
  return <>
    <div className="trash-actions">
      <button type="button" className="secondary-button" onClick={() => { setEditing((value) => !value); setSelected([]); }}>{editing ? "Klaar" : "Wijzig selectie"}</button>
      {editing && <form action="/api/customers/trash" method="post"><input type="hidden" name="intent" value="empty" /><button className="danger" type="submit" onClick={(event) => { if (!window.confirm("Weet u zeker dat u alle klanten in de prullenbak definitief wilt verwijderen?")) event.preventDefault(); }}>Prullenbak leegmaken</button></form>}
    </div>
    <form action="/api/customers/trash" method="post">
      <div className="trash-list">
        {editing && <label className="trash-select-all"><input type="checkbox" checked={all} onChange={toggleAll} /> Alles selecteren</label>}
        {customers.map((customer) => <label className="trash-row" key={customer.id}>
          {editing && <input type="checkbox" name="customerId" value={customer.id} checked={selected.includes(customer.id)} onChange={() => toggle(customer.id)} />}
          <span><strong>{customer.name}</strong><small>{[customer.addressLine, customer.city].filter(Boolean).join(", ")}</small></span>
        </label>)}
      </div>
      {editing && <div className="trash-actions">
        <button name="intent" value="restore" disabled={!selected.length}>Geselecteerde terugzetten</button>
        <button className="danger" name="intent" value="delete" disabled={!selected.length} onClick={(event) => { if (!window.confirm("Deze klanten en hun orders worden definitief verwijderd. Doorgaan?")) event.preventDefault(); }}>Definitief verwijderen</button>
      </div>}
    </form>
  </>;
}
