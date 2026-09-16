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
  const file = form.get("file");
  if (!(file instanceof File) || !/\.(csv|xlsx|xls)$/i.test(file.name)) return NextResponse.json({ error: "Kies een CSV- of Excelbestand." }, { status: 400 });
  try { return NextResponse.json({ filename: file.name, ...parseFile(await file.arrayBuffer()) }); }
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
  if (newOrders.length) {
    const { error } = await db.from("orders").insert(newOrders.map((row) => ({ source_order_number: row.orderNumber, customer_id: customerIds.get(customerKey(row)), work_type: row.workType, duration_minutes: row.durationMinutes, required_people: row.requiredPeople || 1, metadata: { imported_via: "vendit" } })));
    if (error) return NextResponse.json({ error: `Orders opslaan mislukt: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ customers: newCustomers.size, orders: newOrders.length, skipped: parsed.data.length - newOrders.length });
}
