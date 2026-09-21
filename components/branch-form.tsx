"use client";

import { useState } from "react";
import { expertStores, type ExpertStoreOption } from "@/lib/expert-stores";

type ExpertStore = {
  name: string;
  address: string;
  postalCode: string;
  city: string;
  sourceUrl: string;
};

export function BranchForm() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [found, setFound] = useState<ExpertStore | null>(null);
  const [message, setMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const suggestions = name.trim().length < 2 ? [] : expertStores.filter((store) => [store.name, store.city, ...(store.aliases || [])].some((value) => value.toLocaleLowerCase("nl-NL").includes(name.trim().toLocaleLowerCase("nl-NL")))).slice(0, 7);

  async function findExpertStore(store?: ExpertStoreOption) {
    const query = store?.city || name.trim() || city.trim();
    if (!query) {
      setMessage("Vul eerst bijvoorbeeld ‘Kaatsheuvel’ in bij naam of plaats.");
      return;
    }
    setSearching(true);
    setMessage("");
    setFound(null);
    try {
      const response = await fetch(`/api/branches/expert-store?slug=${encodeURIComponent(store?.slug || query)}`);
      const result = await response.json() as { store?: ExpertStore; error?: string };
      if (!response.ok || !result.store) {
        setMessage(result.error || "Geen Expert-vestiging gevonden. Vul het adres handmatig in.");
        return;
      }
      setFound(result.store);
      setName(result.store.name);
      setAddress(result.store.address);
      setPostalCode(result.store.postalCode);
      setCity(result.store.city);
      setMessage("Adres gevonden en ingevuld. Controleer het even voordat u opslaat.");
    } catch {
      setMessage("Zoeken lukt nu niet. U kunt het adres ook zelf invullen.");
    } finally {
      setSearching(false);
    }
  }

  return <form action="/api/branches" method="post" className="branch-form">
    <label className="branch-store-search">Zoek Expert-vestiging<input name="name" value={name} onChange={(event) => { setName(event.target.value); setFound(null); setMessage(""); }} placeholder="Typ Drunen, Kaatsheuvel of Van de Griendt" required autoComplete="off" />
      {suggestions.length > 0 && <div className="branch-suggestions">{suggestions.map((store) => <button key={store.slug} type="button" onClick={() => findExpertStore(store)}><strong>{store.name}</strong>{store.aliases?.length ? <span>Ook gevonden op: {store.aliases[0]}</span> : <span>{store.city}</span>}</button>)}</div>}
    </label>
    <div className="branch-lookup">
      <button type="button" className="secondary-button" onClick={() => findExpertStore()} disabled={searching}>{searching ? "Zoeken…" : "Zoek gekozen Expert"}</button>
      <span>De lijst kent alle Expert-plaatsen. Kies een suggestie om het adres direct in te vullen.</span>
    </div>
    <label>Adres<input name="address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Straat en huisnummer" /></label>
    <div className="grid"><label>Postcode<input name="postalCode" value={postalCode} onChange={(event) => setPostalCode(event.target.value)} /></label><label>Plaats<input name="city" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Drunen" /></label></div>
    <button type="submit">+ Vestiging toevoegen</button>
    {message && <p className={found ? "branch-lookup-success" : "error"}>{message}{found && <> <a href={found.sourceUrl} target="_blank" rel="noreferrer">Controleer op Expert.nl ↗</a></>}</p>}
  </form>;
}
