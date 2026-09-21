"use client";

import Link from "next/link";
import { useState } from "react";

type Row = {
  name: string;
  addressLine: string;
  customerNumber: string | null;
  orderNumber: string | null;
  postalCode: string | null;
  city: string | null;
  branch: string | null;
  documentType: "order" | "repair" | "invoice";
  issues: string[];
};

type ImportPreview = {
  filename: string;
  columns: string[];
  drafts: Row[];
};

export default function ImportClient() {
  const [previewData, setPreviewData] = useState<ImportPreview>();
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  async function preview(formData: FormData) {
    setIsBusy(true);
    setIsSaved(false);
    const response = await fetch("/api/import", { method: "POST", body: formData });
    const data = await response.json();
    setIsBusy(false);

    if (!response.ok) {
      setMessage(data.error);
      return;
    }

    setMessage("");
    setPreviewData(data);
  }

  async function save() {
    if (!previewData) return;

    setIsBusy(true);
    const response = await fetch("/api/import", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rows: previewData.drafts }),
    });
    const data = await response.json();
    setIsBusy(false);

    if (!response.ok) {
      setMessage(data.error);
      return;
    }

    setMessage(`${data.orders} orders opgeslagen bij ${data.customers} nieuwe klanten${data.branches ? ` en ${data.branches} nieuwe vestiging${data.branches === 1 ? "" : "en"}` : ""}; ${data.skipped} overgeslagen.`);
    setPreviewData(undefined);
    setIsSaved(true);
  }

  const invalidRows = previewData?.drafts.filter((row) => row.issues.length).length || 0;

  return <>
    <form action={preview} className="card">
      <h1>Orders importeren</h1>
      <p className="muted">Upload een CSV, Excelbestand of originele PDF-order, reparatiebon of factuur. De app leest eerst de tekst uit en laat altijd een controle zien voordat iets wordt opgeslagen.</p>
      <label>Bestand<input name="file" type="file" accept=".csv,.xlsx,.xls,.pdf,application/pdf" required /></label>
      <button disabled={isBusy}>{isBusy ? "Controleren…" : "Bestand controleren"}</button>
    </form>

    {message && <section className="card import-result">
      <p>{message}</p>
      {isSaved && <Link className="import-button" href="/planning">Naar weekplanning →</Link>}
    </section>}

    {previewData && <section className="card" style={{ marginTop: 20 }}>
      <h2>Controle vóór import</h2>
      <p>{previewData.drafts.length} regels gevonden. {invalidRows} regels met fouten worden overgeslagen.</p>
      <p className="muted">Kolommen: {previewData.columns.join(", ")}</p>
      <table>
        <thead><tr><th>Soort</th><th>Order</th><th>Klant</th><th>Vestiging</th><th>Adres</th><th>Controle</th></tr></thead>
        <tbody>{previewData.drafts.slice(0, 50).map((row, index) => <tr key={index}>
          <td>{row.documentType === "repair" ? "Reparatie" : row.documentType === "invoice" ? "Factuur" : "Order"}</td>
          <td>{row.orderNumber || "—"}</td>
          <td>{row.name || "—"}</td>
          <td>{row.branch || "—"}</td>
          <td>{[row.addressLine, row.postalCode, row.city].filter(Boolean).join(", ") || "—"}</td>
          <td>{row.issues.join("; ") || "Klaar"}</td>
        </tr>)}</tbody>
      </table>
      <button onClick={save} disabled={isBusy}>{isBusy ? "Opslaan…" : "Geldige orders importeren"}</button>
    </section>}
  </>;
}
