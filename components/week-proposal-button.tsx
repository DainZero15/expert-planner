"use client";

import { useState } from "react";

export function WeekProposalButton({ week }: { week: string }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return <form action="/api/week-proposal" method="post" className="proposal-confirmation">
      <input type="hidden" name="week" value={week} />
      <p><strong>Let op:</strong> alleen ongeplande orders krijgen nieuwe voorstellen. Definitieve afspraken blijven onveranderd.</p>
      <div className="actions">
        <button type="submit">Ja, maak het weekvoorstel</button>
        <button className="secondary-button" type="button" onClick={() => setConfirming(false)}>Annuleren</button>
      </div>
    </form>;
  }

  return <button type="button" className="proposal-button" onClick={() => setConfirming(true)}>
    Maak weekvoorstel
  </button>;
}
