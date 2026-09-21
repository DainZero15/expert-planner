import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const slugify = (value: string) => value
  .toLocaleLowerCase("nl-NL")
  .replace(/^expert\s+/i, "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const decode = (value: string) => value
  .replace(/&amp;/g, "&")
  .replace(/&#39;/g, "'")
  .replace(/&quot;/g, "\"")
  .trim();

const knownStores: Record<string, { name: string; address: string; postalCode: string; city: string }> = {
  drunen: { name: "Expert Van de Griendt Drunen", address: "Torenstraat 5", postalCode: "5151 JJ", city: "Drunen" },
  kaatsheuvel: { name: "Expert Kaatsheuvel", address: "Hoofdstraat 77", postalCode: "5171 DK", city: "Kaatsheuvel" },
};

export async function GET(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Log opnieuw in om een vestiging te zoeken." }, { status: 401 });

  const query = new URL(request.url).searchParams.get("slug")?.trim() || "";
  const slug = slugify(query);
  if (!slug) return NextResponse.json({ error: "Vul een plaatsnaam in." }, { status: 400 });

  const sourceUrl = `https://www.expert.nl/winkels/${slug}`;
  const known = knownStores[slug];
  if (known) return NextResponse.json({ store: { ...known, sourceUrl } });
  try {
    const response = await fetch(sourceUrl, {
      headers: { "User-Agent": "Expert-Planner branch lookup" },
      next: { revalidate: 86_400 },
    });
    if (!response.ok) return NextResponse.json({ error: "Deze Expert-vestiging is niet gevonden." }, { status: 404 });
    const html = await response.text();
    const structured = /"streetAddress"\s*:\s*"([^"\\]+(?:\\.[^"\\]*)*)"[\s\S]{0,600}?"postalCode"\s*:\s*"([^"\\]+)"[\s\S]{0,600}?"addressLocality"\s*:\s*"([^"\\]+)"/.exec(html);
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    const visible = /(?:Expert\s+)?[^]{0,900}?\b([A-Z][A-Za-zÀ-ÿ' .-]{2,70}?\s+\d+[A-Za-z0-9/-]*)\s+(\d{4}\s?[A-Z]{2})\s+([A-Z][A-Za-zÀ-ÿ' .-]{2,60})/i.exec(text);
    const address = structured ? decode(structured[1].replace(/\\n/g, " ")) : visible ? decode(visible[1]) : "";
    const postalCode = structured ? decode(structured[2]) : visible ? visible[2].toUpperCase() : "";
    const city = structured ? decode(structured[3]) : visible ? decode(visible[3]) : "";
    if (!address || !postalCode || !city) return NextResponse.json({ error: "Het Expert-adres kon niet automatisch worden gelezen. Vul het eenmaal handmatig in." }, { status: 422 });
    return NextResponse.json({ store: { name: `Expert ${city}`, address, postalCode, city, sourceUrl } });
  } catch {
    return NextResponse.json({ error: "Het ophalen van Expert.nl lukt nu niet. Probeer het later opnieuw." }, { status: 502 });
  }
}
