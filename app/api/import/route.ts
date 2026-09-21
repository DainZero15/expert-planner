import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { normalizedOrderNumber, parseFile, draftSchema } from "@/lib/import/customers";

const customerKey = (row: { name: string; addressLine: string; postalCode: string | null; city: string | null }) => [row.name, row.addressLine, row.postalCode, row.city].map((value) => String(value || "").trim().toLocaleLowerCase("nl-NL").replace(/\s+/g, " ")).join("|");

export async function POST(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const form = await request.formData();
  const files = form.getAll("file").filter((file): file is File => file instanceof File);
  if (!files.length || files.some((file) => !/\.(csv|xlsx|xls|pdf)$/i.test(file.name))) return NextResponse.json({ error: "Kies CSV-, Excel- of PDF-bestanden." }, { status: 400 });
  if (files.length > 30) return NextResponse.json({ error: "Kies maximaal 30 bestanden tegelijk." }, { status: 400 });
  if (files.some((file) => file.size > 12 * 1024 * 1024) || files.reduce((total, file) => total + file.size, 0) > 30 * 1024 * 1024) return NextResponse.json({ error: "Elk bestand mag maximaal 12 MB zijn; samen maximaal 30 MB." }, { status: 400 });
  try {
    const parsedFiles = await Promise.all(files.map(async (file) => ({ filename: file.name, parsed: await parseFile(await file.arrayBuffer(), file.name) })));
    const seenOrders = new Set<string>();
    const drafts = parsedFiles.flatMap(({ parsed }) => parsed.drafts).map((row) => {
      if (row.orderNumber && seenOrders.has(normalizedOrderNumber(row.orderNumber))) row.issues.push("Dubbel ordernummer in geselecteerde bestanden");
      if (row.orderNumber) seenOrders.add(normalizedOrderNumber(row.orderNumber));
      return row;
    });
    return NextResponse.json({ filenames: parsedFiles.map((item) => item.filename), columns: [...new Set(parsedFiles.flatMap((item) => item.parsed.columns))], drafts });
  }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Bestand niet leesbaar" }, { status: 400 }); }
}

export async function PUT(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const body = await request.json();
  const parsed = z.array(draftSchema).max(5000).safeParse(body.rows);
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige import" }, { status: 400 });
  const rows = parsed.data.filter((row) => !row.issues.length);
  const { data: existingData, error: customerReadError } = await db.from("customers").select("id,name,address_line,postal_code,city").neq("status", "archived").limit(5000);
  if (customerReadError) return NextResponse.json({ error: `Klanten controleren mislukt: ${customerReadError.message}` }, { status: 500 });
  const customerIds = new Map((existingData || []).map((customer) => [customerKey({ name: customer.name, addressLine: customer.address_line, postalCode: customer.postal_code, city: customer.city }), customer.id]));
  const newCustomers = new Map<string, typeof rows[number]>();
  for (const row of rows) { const key = customerKey(row); if (!customerIds.has(key)) newCustomers.set(key, row); }
  if (newCustomers.size) {
    const { data: created, error } = await db.from("customers").insert([...newCustomers.values()].map((row) => ({ customer_number: row.customerNumber, name: row.name, address_line: row.addressLine, postal_code: row.postalCode, city: row.city, email: row.email, phone: row.phone, desired_visit_minutes: row.durationMinutes, extra_fields: {}, geocode_status: "pending" }))).select("id,name,address_line,postal_code,city");
    if (error) return NextResponse.json({ error: `Klanten opslaan mislukt: ${error.message}` }, { status: 500 });
    for (const customer of created || []) customerIds.set(customerKey({ name: customer.name, addressLine: customer.address_line, postalCode: customer.postal_code, city: customer.city }), customer.id);
  }
  const { data: existingOrders, error: orderReadError } = await db.from("orders").select("source_order_number").limit(5000);
  if (orderReadError) return NextResponse.json({ error: `Orders controleren mislukt: ${orderReadError.message}` }, { status: 500 });
  const knownOrders = new Set((existingOrders || []).flatMap((order) => order.source_order_number ? [normalizedOrderNumber(order.source_order_number)] : []));
  const newOrders = rows.filter((row) => {
    if (!row.orderNumber) return false;
    const orderKey = normalizedOrderNumber(row.orderNumber);
    if (knownOrders.has(orderKey)) return false;
    knownOrders.add(orderKey);
    return true;
  });
  const { data: branchData, error: branchReadError } = await db.from("branches").select("id,name").limit(1000);
  if (branchReadError) return NextResponse.json({ error: `Vestigingen controleren mislukt: ${branchReadError.message}` }, { status: 500 });
  const branchIds = new Map((branchData || []).map((branch) => [normalizedOrderNumber(branch.name), branch.id]));
  const newBranchNames = [...new Set(newOrders.map((row) => row.branch).filter((branch): branch is string => Boolean(branch)).filter((branch) => !branchIds.has(normalizedOrderNumber(branch))))];
  if (newBranchNames.length) {
    const { data: createdBranches, error: branchCreateError } = await db.from("branches").insert(newBranchNames.map((name) => ({ name }))).select("id,name");
    if (branchCreateError) return NextResponse.json({ error: `Vestigingen opslaan mislukt: ${branchCreateError.message}` }, { status: 500 });
    for (const branch of createdBranches || []) branchIds.set(normalizedOrderNumber(branch.name), branch.id);
  }
  if (newOrders.length) {
    const { error } = await db.from("orders").insert(newOrders.map((row) => ({ source_order_number: row.orderNumber, customer_id: customerIds.get(customerKey(row)), branch_id: row.branch ? branchIds.get(normalizedOrderNumber(row.branch)) || null : null, work_type: row.workType, duration_minutes: row.durationMinutes, required_people: row.requiredPeople || 1, metadata: { imported_via: "vendit", document_type: row.documentType, source_branch: row.branch || null } })));
    if (error) return NextResponse.json({ error: `Orders opslaan mislukt: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ customers: newCustomers.size, orders: newOrders.length, branches: newBranchNames.length, skipped: parsed.data.length - newOrders.length });
}
