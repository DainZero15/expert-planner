import * as XLSX from "xlsx";
import { z } from "zod";

export const draftSchema = z.object({
  name: z.string().min(1).max(300), addressLine: z.string().min(1).max(500), customerNumber: z.string().nullable(), orderNumber: z.string().nullable(), postalCode: z.string().nullable(), city: z.string().nullable(), email: z.string().email().nullable(), phone: z.string().nullable(), workType: z.string().nullable(), durationMinutes: z.number().int().positive().nullable(), requiredPeople: z.number().int().min(1).max(4).nullable(), issues: z.array(z.string()),
});

const aliases: Record<string, string[]> = {
  name: ["naam", "klantnaam", "bedrijfsnaam", "contactpersoon", "contact persoon", "contactnaam", "naam contactpersoon", "voor en achternaam", "volledige naam"], addressLine: ["adres", "straat", "address"], customerNumber: ["klantnummer", "debiteurnummer"], orderNumber: ["ordernummer", "opdrachtnummer", "opdrachtid", "opdracht-id", "order id", "identificatie"], postalCode: ["postcode"], city: ["plaats", "woonplaats", "city"], email: ["email", "emailadres", "mailadres", "e-mailadres"], phone: ["telefoon", "telefoonnummer", "phone"], workType: ["taak", "werkzaamheden", "werksoort", "soort werkzaamheden", "type werk"], durationMinutes: ["duur min", "duur minuten", "duur(min)", "duur"], requiredPeople: ["personen nodig", "aantal personen", "monteurs nodig"],
};
const key = (value: string) => value.toLocaleLowerCase("nl-NL").replace(/[^a-z0-9]/g, "");

export function parseFile(buffer: ArrayBuffer) {
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
  const drafts = records.map((row) => {
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
    if (orderNumber && seenOrders.has(orderNumber.toLocaleLowerCase("nl-NL"))) issues.push("Dubbel ordernummer in bestand");
    if (orderNumber) seenOrders.add(orderNumber.toLocaleLowerCase("nl-NL"));
    return { name, addressLine, customerNumber: text(row, "customerNumber"), orderNumber, postalCode: text(row, "postalCode"), city: text(row, "city"), email, phone: text(row, "phone"), workType: text(row, "workType"), durationMinutes, requiredPeople, issues };
  });
  return { columns, drafts };
}
