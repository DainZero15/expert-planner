import * as XLSX from "xlsx";
import { z } from "zod";

export const draftSchema = z.object({
  name: z.string().min(1).max(300), addressLine: z.string().min(1).max(500), customerNumber: z.string().nullable(), postalCode: z.string().nullable(), city: z.string().nullable(), email: z.string().email().nullable(), phone: z.string().nullable(), workType: z.string().nullable(), issues: z.array(z.string()),
});

const aliases: Record<string, string[]> = {
  name: ["naam", "klantnaam", "bedrijfsnaam"], addressLine: ["adres", "straat", "address"], customerNumber: ["klantnummer", "debiteurnummer", "nummer", "ordernummer", "opdrachtid", "opdracht-id"], postalCode: ["postcode"], city: ["plaats", "woonplaats", "city"], email: ["email", "emailadres", "mailadres", "e-mailadres"], phone: ["telefoon", "telefoonnummer", "phone"], workType: ["taak", "werkzaamheden", "werksoort", "soort werkzaamheden", "type werk"],
};
const key = (value: string) => value.toLocaleLowerCase("nl-NL").replace(/[^a-z0-9]/g, "");

export function parseFile(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: "array", raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw Error("Geen werkblad gevonden.");
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (!records.length || records.length > 5000) throw Error("Bestand moet tussen 1 en 5.000 regels bevatten.");
  const columns = Object.keys(records[0]);
  const column = (field: string) => columns.find((name) => aliases[field].map(key).includes(key(name)));
  const mapping = Object.fromEntries(Object.keys(aliases).map((field) => [field, column(field)]));
  const text = (row: Record<string, unknown>, field: string) => {
    const mapped = mapping[field];
    return mapped ? String(row[mapped] ?? "").trim() || null : null;
  };
  const seen = new Set<string>();
  const drafts = records.map((row) => {
    const name = text(row, "name") || "";
    const addressLine = text(row, "addressLine") || "";
    const customerNumber = text(row, "customerNumber");
    const email = text(row, "email");
    const issues: string[] = [];
    if (!name) issues.push("Naam ontbreekt");
    if (!addressLine) issues.push("Adres ontbreekt");
    if (email && !z.string().email().safeParse(email).success) issues.push("E-mailadres is ongeldig");
    const duplicateKey = (customerNumber || `${name}|${addressLine}`).toLocaleLowerCase();
    if (seen.has(duplicateKey)) issues.push("Dubbele klant in bestand");
    seen.add(duplicateKey);
    return { name, addressLine, customerNumber, postalCode: text(row, "postalCode"), city: text(row, "city"), email, phone: text(row, "phone"), workType: text(row, "workType"), issues };
  });
  return { columns, drafts };
}
