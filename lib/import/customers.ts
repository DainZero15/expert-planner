import * as XLSX from "xlsx";
import { z } from "zod";
import { normalizedOrderNumber } from "@/lib/import/order-number";

export const draftSchema = z.object({
  name: z.string().min(1).max(300), addressLine: z.string().min(1).max(500), customerNumber: z.string().nullable(), orderNumber: z.string().nullable(), postalCode: z.string().nullable(), city: z.string().nullable(), email: z.string().email().nullable(), phone: z.string().nullable(), workType: z.string().nullable(), branch: z.string().nullable(), documentType: z.enum(["order", "repair", "invoice"]).default("order"), durationMinutes: z.number().int().positive().nullable(), requiredPeople: z.number().int().min(1).max(4).nullable(), issues: z.array(z.string()),
});
export type ImportDraft = z.infer<typeof draftSchema>;

const aliases: Record<string, string[]> = {
  name: ["naam", "klantnaam", "bedrijfsnaam", "contactpersoon", "contact persoon", "contactnaam", "naam contactpersoon", "voor en achternaam", "volledige naam"], addressLine: ["adres", "straat", "address"], customerNumber: ["klantnummer", "debiteurnummer"], orderNumber: ["ordernummer", "opdrachtnummer", "opdrachtid", "opdracht-id", "order id", "identificatie"], postalCode: ["postcode"], city: ["plaats", "woonplaats", "city"], email: ["email", "emailadres", "mailadres", "e-mailadres"], phone: ["telefoon", "telefoonnummer", "phone"], workType: ["taak", "werkzaamheden", "werksoort", "soort werkzaamheden", "type werk"], branch: ["filiaal", "vestiging", "winkel", "winkelnaam", "order filiaal", "order vestiging", "afkomstig van", "bron vestiging"], durationMinutes: ["duur min", "duur minuten", "duur(min)", "duur"], requiredPeople: ["personen nodig", "aantal personen", "monteurs nodig"],
};
const key = (value: string) => value.toLocaleLowerCase("nl-NL").replace(/[^a-z0-9]/g, "");

const cleanPdfText = (value: string) => value.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
const firstMatch = (text: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) return match[1].replace(/\s+/g, " ").trim();
  }
  return null;
};

const parsePdfChunk = (chunk: string): ImportDraft => {
  const documentType = /reparatie|servicebon|storingsbon|reparatiebon/i.test(chunk) ? "repair" as const : /factuur|invoice/i.test(chunk) ? "invoice" as const : "order" as const;
  const addressMatch = /\b([A-ZÀ-Ý][A-Za-zÀ-ÿ' .-]{1,70}?\s+\d+[A-Za-z0-9/-]*)\s*[\n, ]+\s*(\d{4}\s?[A-Z]{2})\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ' .-]{1,60})/m.exec(chunk);
  const name = firstMatch(chunk, [/(?:contactpersoon|klant(?:naam)?|naam)\s*[:\-]\s*([^\n]{2,120})/i]) || "";
  const orderNumber = firstMatch(chunk, [/(?:ordernummer|order\s*nr\.?|opdrachtnummer|opdracht\s*nr\.?|identificatie|reparatienummer|bonnummer|factuurnummer)\s*[:#\-]?\s*([A-Za-z0-9][A-Za-z0-9./_-]{2,80})/i]);
  const product = firstMatch(chunk, [/(?:werkzaamheden|werksoort|taak|omschrijving|product|apparaat|reparatie)\s*[:\-]\s*([^\n]{2,180})/i]);
  const workType = documentType === "repair" ? `Reparatie${product ? ` - ${product}` : ""}` : product;
  const branch = firstMatch(chunk, [/(?:filiaal|vestiging|winkel|afkomstig van)\s*[:\-]\s*([^\n]{2,100})/i]);
  const phone = firstMatch(chunk, [/(?:telefoon|tel\.?|mobiel)\s*[:\-]\s*([+0-9() /-]{7,30})/i]);
  const email = firstMatch(chunk, [/(?:e-?mail(?:adres)?)\s*[:\-]\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i]);
  const issues: string[] = [];
  if (!name) issues.push("Klantnaam ontbreekt in PDF");
  if (!addressMatch) issues.push("Adres ontbreekt in PDF");
  if (!orderNumber) issues.push("Ordernummer ontbreekt in PDF");
  return {
    name,
    addressLine: addressMatch?.[1] || "",
    customerNumber: null,
    orderNumber,
    postalCode: addressMatch?.[2]?.toUpperCase() || null,
    city: addressMatch?.[3] || null,
    email,
    phone,
    workType,
    branch,
    documentType,
    durationMinutes: null,
    requiredPeople: documentType === "repair" ? 1 : null,
    issues,
  };
};

async function parsePdfFile(buffer: ArrayBuffer) {
  // pdf-parse v2 uses the current PDF.js reader. It copes with more variants of
  // PDF exports than the legacy parser (including many original order exports).
  // A new byte array is deliberately created: PDF.js takes ownership of typed data.
  // Loading is deliberately deferred until a PDF is uploaded. This keeps the
  // normal planner and spreadsheet-import routes independent from the PDF engine.
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer.slice(0)) });
  let parsed: { text: string; total: number };
  try {
    parsed = await parser.getText();
  } catch (error) {
    const details = error instanceof Error ? error.message : "";
    if (/xref|cross-reference|invalid pdf|malformed/i.test(details)) {
      throw Error("Deze PDF heeft een afwijkende technische opbouw en kon niet automatisch worden hersteld. Exporteer de order in Vendit nogmaals als PDF (via Afdrukken > Bewaar als PDF) en probeer die versie.");
    }
    throw Error("Deze PDF kon niet worden gelezen. Controleer of het bestand een niet-beveiligde PDF is en probeer het opnieuw.");
  } finally {
    await parser.destroy();
  }
  const text = cleanPdfText(parsed.text);
  if (!text) throw Error("Deze PDF bevat geen selecteerbare tekst. Gebruik een PDF met tekst of exporteer hem eerst vanuit Vendit.");
  const starts = [...text.matchAll(/(?:ordernummer|order\s*nr\.?|opdrachtnummer|identificatie|reparatienummer|bonnummer|factuurnummer)\s*[:#\-]?\s*[A-Za-z0-9][A-Za-z0-9./_-]{2,80}/gi)].map((match) => match.index || 0);
  const chunks = starts.length ? starts.map((start, index) => text.slice(start, starts[index + 1] || text.length)) : [text];
  if (chunks.length > 5000) throw Error("PDF bevat te veel opdrachten.");
  const seenOrders = new Set<string>();
  const drafts: ImportDraft[] = chunks.map(parsePdfChunk).map((row) => {
    if (row.orderNumber && seenOrders.has(normalizedOrderNumber(row.orderNumber))) row.issues.push("Dubbel ordernummer in PDF");
    if (row.orderNumber) seenOrders.add(normalizedOrderNumber(row.orderNumber));
    return row;
  });
  return { columns: [`PDF - ${parsed.total} pagina${parsed.total === 1 ? "" : "'s"}`, "Automatisch herkende velden"], drafts };
}

export async function parseFile(buffer: ArrayBuffer, filename = ""): Promise<{ columns: string[]; drafts: ImportDraft[] }> {
  if (/\.pdf$/i.test(filename)) return parsePdfFile(buffer);
  const workbook = XLSX.read(buffer, { type: "array", raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw Error("Geen werkblad gevonden.");
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (!records.length || records.length > 5000) throw Error("Bestand moet tussen 1 en 5.000 regels bevatten.");
  const columns = Object.keys(records[0]);
  const findColumn = (field: string) => columns.find((name) => aliases[field].map(key).includes(key(name)));
  const mapping = Object.fromEntries(Object.keys(aliases).map((field) => [field, findColumn(field)]));
  const text = (row: Record<string, unknown>, field: string) => {
    const column = mapping[field];
    return column ? String(row[column] ?? "").trim() || null : null;
  };
  const seenOrders = new Set<string>();
  const drafts: ImportDraft[] = records.map((row) => {
    const name = text(row, "name") || "";
    const addressLine = text(row, "addressLine") || "";
    const orderNumber = text(row, "orderNumber");
    const email = text(row, "email");
    const durationValue = text(row, "durationMinutes");
    const durationMinutes = durationValue && Number.isFinite(Number(durationValue)) ? Number(durationValue) : null;
    const peopleValue = text(row, "requiredPeople");
    const requiredPeople = peopleValue && Number.isFinite(Number(peopleValue)) ? Math.min(4, Math.max(1, Number(peopleValue))) : null;
    const issues: string[] = [];
    if (!name) issues.push("Naam ontbreekt");
    if (!addressLine) issues.push("Adres ontbreekt");
    if (!orderNumber) issues.push("Ordernummer ontbreekt");
    if (email && !z.string().email().safeParse(email).success) issues.push("E-mailadres is ongeldig");
    if (orderNumber && seenOrders.has(normalizedOrderNumber(orderNumber))) issues.push("Dubbel ordernummer in bestand");
    if (orderNumber) seenOrders.add(normalizedOrderNumber(orderNumber));
    return { name, addressLine, customerNumber: text(row, "customerNumber"), orderNumber, postalCode: text(row, "postalCode"), city: text(row, "city"), email, phone: text(row, "phone"), workType: text(row, "workType"), branch: text(row, "branch"), documentType: "order" as const, durationMinutes, requiredPeople, issues };
  });
  return { columns, drafts };
}
