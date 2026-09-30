import * as XLSX from "xlsx";
import { z } from "zod";
import { normalizedOrderNumber } from "@/lib/import/order-number";

export const draftSchema = z.object({
  name: z.string().min(1).max(300), addressLine: z.string().min(1).max(500), customerNumber: z.string().nullable(), orderNumber: z.string().nullable(), postalCode: z.string().nullable(), city: z.string().nullable(), email: z.string().email().nullable(), phone: z.string().nullable(), workType: z.string().nullable(), branch: z.string().nullable(), documentType: z.enum(["order", "repair", "invoice"]).default("order"), documentSource: z.enum(["standard", "work_order"]).default("standard"), seller: z.string().nullable().default(null), memo: z.string().nullable().default(null), products: z.array(z.string()).default([]), locationDetails: z.string().nullable().default(null), durationMinutes: z.number().int().positive().nullable(), requiredPeople: z.number().int().min(1).max(4).nullable(), issues: z.array(z.string()),
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

const workOrderHeaders = (text: string) => [...text.matchAll(/(?:rittenlijst\s*(?:planning)?\s*[-–:]?|planning\s+)([A-Za-zÀ-ÿ' .-]{2,80})(?=\s*(?:\n|\d|$))/gi)]
  .map((match) => ({ index: match.index || 0, branch: match[1].replace(/\s+/g, " ").trim() }))
  .filter((header) => header.branch.length > 1);

const branchAtPosition = (headers: { index: number; branch: string }[], position: number) => {
  const preceding = headers.filter((header) => header.index <= position);
  return preceding.length ? preceding[preceding.length - 1].branch : null;
};

const cleanMemo = (value: string) => value.replace(/\bXXX\b\s*[:\-]?\s*/gi, "").replace(/\s+/g, " ").trim();

type AddressDetails = { addressLine: string; postalCode: string | null; city: string | null; nearbyName: string | null };

const ignoredNameLines = /^(?:klant(?:gegevens)?|afleveradres|bezorgadres|factuuradres|adres|contact(?:persoon)?|gegevens|pagina\s+\d+|order(?:nummer)?|werkbon|omschrijving)$/i;

// PDF exports often put a customer block on separate lines instead of using
// labels such as "Klantnaam". Read that block as a human would: find a Dutch
// postcode, then the street on or directly above that line and finally the
// preceding name. This is deliberately independent of one supplier template.
const addressFromPdfText = (text: string): AddressDetails | null => {
  const lines = text.split("\n").map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  for (let index = 0; index < lines.length; index += 1) {
    const postal = /\b(\d{4}\s?[A-Z]{2})\b/i.exec(lines[index]);
    if (!postal) continue;
    const afterPostal = lines[index].slice((postal.index || 0) + postal[0].length).replace(/^[,;\- ]+/, "").trim();
    const inlineStreet = lines[index].slice(0, postal.index).replace(/[,:;\- ]+$/, "").trim();
    const nearby = [inlineStreet, lines[index - 1] || "", lines[index - 2] || ""];
    const addressLine = nearby.find((line) => /\d/.test(line) && !ignoredNameLines.test(line)) || "";
    if (!addressLine) continue;
    const streetIndex = lines.indexOf(addressLine);
    const rawName = streetIndex > 0 ? lines[streetIndex - 1].replace(/^(?:naam|klant|geadresseerde|aan)\s*[:\-]?\s*/i, "").trim() : "";
    const nearbyName = rawName && !ignoredNameLines.test(rawName) && !/\d{4}\s?[A-Z]{2}|\d{3,}/i.test(rawName) ? rawName : null;
    return { addressLine, postalCode: postal[1].toUpperCase(), city: afterPostal || null, nearbyName };
  }
  return null;
};

const broadOrderNumber = (text: string) => firstMatch(text, [
  /(?:order(?:nummer|\s*(?:nr\.?|no\.?|id))?|verkooporder|sales\s*order|opdracht(?:nummer|\s*(?:nr\.?|id))?|referentie(?:nummer)?|kenmerk|documentnummer|bon(?:nummer|\s*nr\.?)|factuurnummer|reparatienummer|werkbonnummer)\s*[:#\-]?\s*([A-Za-z]{0,4}[A-Za-z0-9][A-Za-z0-9./_-]{3,80})/i,
  /\b([A-Z]{1,4}[-_/]\d{4,}(?:[./-]\d+)?)\b/i,
  /\b([1-9]\d{6,}(?:[./-]\d+)?)\b/,
]);

const workOrderDetails = (chunk: string) => {
  const xxxLines = [...chunk.matchAll(/(?:^|\n)\s*XXX\s*[:\-]?\s*([^\n]{3,500})/gim)].map((match) => cleanMemo(match[1]));
  const memoLabel = firstMatch(chunk, [/(?:memo|opmerking(?:en)?|instructie(?:s)?|bijzonderheden)\s*[:\-]\s*([^\n]{3,500})/i]);
  const memo = [...xxxLines, memoLabel].filter((item, index, items) => Boolean(item) && items.indexOf(item) === index).join(" · ") || null;
  const locationDetails = firstMatch(chunk, [/((?:begane\s+grond|\d+(?:e|de|ste)?\s*verdieping|etage|trap(?:pen)?|lift|kelder|zolder)[^\n]{0,180})/i]);
  const products = [...new Set([
    ...[...chunk.matchAll(/(?:product|apparaat|model|artikel)\s*[:\-]\s*([^\n]{3,180})/gi)].map((match) => cleanMemo(match[1])),
    ...[...chunk.matchAll(/(?:AEG|Bosch|Siemens|Miele|LG|Samsung|Sonos|Inventum)\s+[A-Z0-9][A-Z0-9._/-]{2,}/gi)].map((match) => match[0].trim()),
  ].filter(Boolean))].slice(0, 12);
  return { memo, products, locationDetails };
};

const estimatePeople = (documentType: "order" | "repair" | "invoice", text: string) => {
  if (documentType === "repair") return 1;
  if (/\b2\s*(?:man|personen|monteurs)\b|(?:droger|wasdroger).{0,70}(?:op|boven).{0,70}(?:wasmachine|wm)|(?:wasmachine|wm).{0,70}(?:droger|wasdroger)|stapelkit/i.test(text)) return 2;
  return null;
};

const tableWorkOrderStarts = (text: string) => [...text.matchAll(/(?:^|\n)\s*(?:\d{2}-\d{2}-\d{2}\s+)?[OR]\s*(?:E-\d{6,}|\d{7,})\b/gim)].map((match) => match.index || 0);

const workOrderIdentity = (chunk: string) => {
  const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
  const lineIndex = lines.findIndex((line) => /\b[OR]\s*(?:E-\d{6,}|\d{7,})\b/i.test(line));
  const firstLine = lineIndex >= 0 ? lines[lineIndex] : "";
  const match = /\b([OR])\s*(E-\d{6,}|\d{7,})\s+([A-Z][A-Z-]{1,})\s+(.+)/i.exec(firstLine);
  if (!match) return null;

  const [, kind, number, seller, rawRest] = match;
  const following = lines.slice(lineIndex + 1, Math.min(lines.length, lineIndex + 4));
  const postcodeLine = following.find((line) => /\b\d{4}\s?[A-Z]{2}\b/i.test(line)) || "";
  const postalMatch = /\b(\d{4}\s?[A-Z]{2})\s+(.+?)(?:\s+(?:0\d[\d -]{7,}|\d{10,}))?$/i.exec(postcodeLine);
  const phones = [...`${firstLine} ${postcodeLine}`.matchAll(/(?:\+31|0)\d[\d ()-]{7,}/g)].map((item) => item[0].replace(/\s+/g, " ").trim());
  const rest = rawRest.replace(/(?:\+31|0)\d[\d ()-]{7,}/g, "").trim();
  const addressMatch = /^(.+?)\s+((?:[A-ZÀ-Ý][A-Za-zÀ-ÿ'.-]*\s*){1,4}(?:,\s*(?:Burg\.?|Sint|St\.?)\s*)?\d+[A-Za-z0-9/-]*)$/u.exec(rest);
  let name = addressMatch?.[1]?.trim() || "";
  let addressLine = addressMatch?.[2]?.replace(/\s+/g, " ").trim() || "";
  // In a table export an initial is sometimes positioned directly in front of
  // the street column (for example "Albers, A  Zivaert 12"). Keep that
  // initial with the customer instead of treating it as part of the street.
  const trailingInitial = name.endsWith(",") ? /^((?:[A-Z]\.?){1,3})\s+(.+)$/.exec(addressLine) : null;
  if (trailingInitial) {
    name = `${name} ${trailingInitial[1]}`;
    addressLine = trailingInitial[2];
  }
  return {
    documentType: kind.toUpperCase() === "R" ? "repair" as const : "order" as const,
    orderNumber: `${kind.toUpperCase() === "R" ? "R-" : ""}${number}`,
    seller,
    name,
    addressLine,
    postalCode: postalMatch?.[1]?.toUpperCase() || null,
    city: postalMatch?.[2]?.trim() || null,
    phone: phones.length ? [...new Set(phones)].join(" / ") : null,
  };
};

const parsePdfChunk = (chunk: string, workOrderBranch: string | null = null): ImportDraft => {
  const isWorkOrder = Boolean(workOrderBranch) || /rittenlijst|werkbon|\bxxx\b/i.test(chunk);
  const tableIdentity = isWorkOrder ? workOrderIdentity(chunk) : null;
  const documentType = tableIdentity?.documentType || (/(?:^|\n)\s*R\s*\d{7,}\b|reparatie|servicebon|storingsbon|reparatiebon/i.test(chunk) ? "repair" as const : /factuur|invoice/i.test(chunk) ? "invoice" as const : "order" as const);
  const addressMatch = /\b([A-ZÀ-Ý][A-Za-zÀ-ÿ' .-]{1,70}?\s+\d+[A-Za-z0-9/-]*)\s*[\n,; ]+\s*(\d{4}\s?[A-Z]{2})\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ' .-]{1,60})/mi.exec(chunk);
  const blockAddress = addressFromPdfText(chunk);
  const name = tableIdentity?.name || firstMatch(chunk, [/(?:contactpersoon|klant(?:naam|gegevens)?|naam|geadresseerde|relatie|afnemer|tenaamstelling|afleveradres)\s*[:\-]?\s*([^\n]{2,120})/i]) || blockAddress?.nearbyName || "";
  const orderNumber = tableIdentity?.orderNumber || broadOrderNumber(chunk);
  const product = firstMatch(chunk, [/(?:werkzaamheden|werksoort|taak|omschrijving|product|apparaat|reparatie|dienst|artikel(?:omschrijving)?)\s*[:\-]\s*([^\n]{2,180})/i]);
  const workType = documentType === "repair" ? `Reparatie${product ? ` - ${product}` : ""}` : product;
  const branch = firstMatch(chunk, [/(?:filiaal|vestiging|winkel|afkomstig van)\s*[:\-]\s*([^\n]{2,100})/i]) || workOrderBranch;
  const phone = tableIdentity?.phone || firstMatch(chunk, [/(?:telefoon|tel\.?|mobiel)\s*[:\-]\s*([+0-9() /-]{7,30})/i]);
  const email = firstMatch(chunk, [/(?:e-?mail(?:adres)?)\s*[:\-]\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i]);
  const seller = tableIdentity?.seller || firstMatch(chunk, [/(?:verkoper|medewerker|verkoopcontact)\s*[:\-]\s*([^\n]{2,120})/i]);
  const details = workOrderDetails(chunk);
  const issues: string[] = [];
  if (!name) issues.push("Klantnaam ontbreekt in PDF");
  if (!addressMatch && !blockAddress && !tableIdentity?.addressLine) issues.push("Adres ontbreekt in PDF");
  if (!orderNumber) issues.push("Ordernummer ontbreekt in PDF");
  return {
    name,
    addressLine: tableIdentity?.addressLine || addressMatch?.[1] || blockAddress?.addressLine || "",
    customerNumber: null,
    orderNumber,
    postalCode: tableIdentity?.postalCode || addressMatch?.[2]?.toUpperCase() || blockAddress?.postalCode || null,
    city: tableIdentity?.city || addressMatch?.[3] || blockAddress?.city || null,
    email,
    phone,
    workType,
    branch,
    documentType,
    documentSource: isWorkOrder ? "work_order" : "standard",
    seller,
    memo: details.memo,
    products: details.products,
    locationDetails: details.locationDetails,
    durationMinutes: null,
    requiredPeople: estimatePeople(documentType, `${workType || ""} ${details.memo || ""} ${details.products.join(" ")}`),
    issues,
  };
};

const aiRowsSchema = z.object({
  rows: z.array(z.object({
    index: z.number().int().nonnegative(),
    orderNumber: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    addressLine: z.string().nullable().optional(),
    postalCode: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    workType: z.string().nullable().optional(),
    memo: z.string().nullable().optional(),
    documentType: z.enum(["order", "repair", "invoice"]).optional(),
  })).max(5000),
});

const usable = (value: string | null | undefined) => value?.replace(/\s+/g, " ").trim() || null;

// This second pass handles layouts that do not use known headings. It is
// server-only, never invents information, and quietly falls back to the local
// recogniser if an AI key is not configured or a document cannot be analysed.
async function refinePdfDraftsWithAi(chunks: { text: string }[], drafts: ImportDraft[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !drafts.length) return { drafts, aiUsed: false };
  const source = chunks.map((chunk, index) => `DOCUMENT ${index}\n${chunk.text.slice(0, 7000)}`).join("\n\n").slice(0, 120000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_IMPORT_MODEL || "gpt-4.1-mini",
        input: `Extract only explicitly present customer and order details from these Dutch sales orders, work orders, invoices or repair forms. Return one row per DOCUMENT. Never make up a name, address or order number. A customer name is a person or company, not a seller, shop or heading.\n\n${source}`,
        text: { format: { type: "json_schema", name: "import_fields", strict: true, schema: {
          type: "object", additionalProperties: false, required: ["rows"], properties: {
            rows: { type: "array", items: { type: "object", additionalProperties: false, required: ["index", "orderNumber", "name", "addressLine", "postalCode", "city", "workType", "memo", "documentType"], properties: {
              index: { type: "integer" }, orderNumber: { type: ["string", "null"] }, name: { type: ["string", "null"] }, addressLine: { type: ["string", "null"] }, postalCode: { type: ["string", "null"] }, city: { type: ["string", "null"] }, workType: { type: ["string", "null"] }, memo: { type: ["string", "null"] }, documentType: { type: "string", enum: ["order", "repair", "invoice"] },
            } } },
          },
        } } },
      }),
    });
    if (!response.ok) return { drafts, aiUsed: false };
    const payload = await response.json() as { output_text?: string };
    const checked = aiRowsSchema.safeParse(payload.output_text ? JSON.parse(payload.output_text) : null);
    if (!checked.success) return { drafts, aiUsed: false };
    const patches = new Map(checked.data.rows.map((row) => [row.index, row]));
    const refined = drafts.map((draft, index) => {
      const patch = patches.get(index);
      if (!patch) return draft;
      const name = draft.name || usable(patch.name) || "";
      const addressLine = draft.addressLine || usable(patch.addressLine) || "";
      const orderNumber = draft.orderNumber || usable(patch.orderNumber);
      const issues = draft.issues.filter((issue) => !(
        (issue.includes("Klantnaam") && name) ||
        (issue.includes("Adres") && addressLine) ||
        (issue.includes("Ordernummer") && orderNumber)
      ));
      return { ...draft, name, addressLine, orderNumber, postalCode: draft.postalCode || usable(patch.postalCode), city: draft.city || usable(patch.city), workType: draft.workType || usable(patch.workType), memo: draft.memo || usable(patch.memo), documentType: patch.documentType || draft.documentType, issues };
    });
    return { drafts: refined, aiUsed: true };
  } catch {
    return { drafts, aiUsed: false };
  }
}

async function parsePdfFile(buffer: ArrayBuffer) {
  // pdf-parse v2 uses the current PDF.js reader. It copes with more variants of
  // PDF exports than the legacy parser (including many original order exports).
  // A new byte array is deliberately created: PDF.js takes ownership of typed data.
  // Loading is deliberately deferred until a PDF is uploaded. This keeps the
  // normal planner and spreadsheet-import routes independent from the PDF engine.
  // The package worker installs the CanvasFactory and browser primitives before
  // PDF.js loads, which is required in Vercel's serverless Node runtime.
  const { CanvasFactory } = await import("pdf-parse/worker");
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer.slice(0)), CanvasFactory });
  let parsed: { text: string; total: number };
  try {
    // Keep page boundaries: many supplier exports contain one order per page
    // but no repeated "ordernummer" heading.
    parsed = await parser.getText({ pageJoiner: "\n<<<PAGE page_number>>>\n", cellSeparator: "\t" });
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
  const isWorkOrder = /rittenlijst|werkbon/i.test(text);
  const headers = isWorkOrder ? workOrderHeaders(text) : [];
  const labelledStarts = [...text.matchAll(/(?:ordernummer|order\s*(?:nr\.?|no\.?|id)?|verkooporder|sales\s*order|opdrachtnummer|opdracht\s*(?:nr\.?|id)?|referentie(?:nummer)?|kenmerk|identificatie|reparatienummer|bonnummer|werkbonnummer|factuurnummer)\s*[:#\-]?\s*[A-Za-z0-9][A-Za-z0-9./_-]{2,80}/gi)].map((match) => match.index || 0);
  // Some suppliers print a bare order number at the start of every row, with
  // no "ordernummer" label. It still identifies a separate customer record.
  const bareNumberStarts = [...text.matchAll(/(?:^|\n)\s*(?:[A-Z]{1,4}[-_/])?[1-9]\d{6,}(?:[./-]\d+)?\b/gm)].map((match) => (match.index || 0) + (match[0].startsWith("\n") ? 1 : 0));
  const workOrderStarts = isWorkOrder
    ? tableWorkOrderStarts(text)
    : [];
  // A workbon has its own table rows. Do not also split it on arbitrary
  // "opdrachtnummer" text in a memo: that would create a false extra order.
  const starts = [...new Set(isWorkOrder ? workOrderStarts : [...labelledStarts, ...bareNumberStarts])].sort((left, right) => left - right);
  const splitPages = text.split(/<<<PAGE\s+\d+>>>/i).map((page) => page.trim()).filter(Boolean);
  const pageChunksLookIndependent = splitPages.length > 1 && splitPages.every((page) => Boolean(broadOrderNumber(page)) || Boolean(addressFromPdfText(page)));
  const chunks = starts.length
    ? starts.map((start, index) => ({ start, text: text.slice(start, starts[index + 1] || text.length) }))
    : pageChunksLookIndependent
      ? splitPages.map((page, index) => ({ start: index, text: page }))
      : [{ start: 0, text }];
  if (chunks.length > 5000) throw Error("PDF bevat te veel opdrachten.");
  const seenOrders = new Set<string>();
  const drafts: ImportDraft[] = chunks.map((chunk) => parsePdfChunk(chunk.text, branchAtPosition(headers, chunk.start))).map((row) => {
    if (row.orderNumber && seenOrders.has(normalizedOrderNumber(row.orderNumber))) row.issues.push("Dubbel ordernummer in PDF");
    if (row.orderNumber) seenOrders.add(normalizedOrderNumber(row.orderNumber));
    return row;
  });
  const analysed = await refinePdfDraftsWithAi(chunks, drafts);
  return { columns: [`PDF - ${parsed.total} pagina${parsed.total === 1 ? "" : "'s"}`, analysed.aiUsed ? "AI-documentcontrole" : "Slimme documentcontrole"], drafts: analysed.drafts, aiUsed: analysed.aiUsed };
}

export async function parseFile(buffer: ArrayBuffer, filename = ""): Promise<{ columns: string[]; drafts: ImportDraft[]; aiUsed?: boolean }> {
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
    return { name, addressLine, customerNumber: text(row, "customerNumber"), orderNumber, postalCode: text(row, "postalCode"), city: text(row, "city"), email, phone: text(row, "phone"), workType: text(row, "workType"), branch: text(row, "branch"), documentType: "order" as const, documentSource: "standard" as const, seller: null, memo: null, products: [], locationDetails: null, durationMinutes, requiredPeople, issues };
  });
  return { columns, drafts };
}
