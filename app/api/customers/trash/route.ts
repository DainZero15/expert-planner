import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const form = await request.formData();
  const intent = String(form.get("intent") || "");
  const selected = [...new Set(form.getAll("customerId").map((value) => String(value)).filter(Boolean))];
  const requestedIds = intent === "empty"
    ? (await db.from("customers").select("id").eq("status", "archived")).data?.map((customer) => customer.id) || []
    : selected;
  if (!requestedIds.length) return NextResponse.redirect(new URL("/customers/prullenbak", request.url), 303);

  const { data: archived } = await db.from("customers").select("id").eq("status", "archived").in("id", requestedIds);
  const ids = (archived || []).map((customer) => customer.id);
  if (!ids.length) return NextResponse.redirect(new URL("/customers/prullenbak", request.url), 303);

  if (intent === "restore") {
    const [customerResult, orderResult] = await Promise.all([
      db.from("customers").update({ status: "active" }).in("id", ids),
      db.from("orders").update({ status: "new" }).or(`customer_id.in.(${ids.join(",")}),imported_customer_id.in.(${ids.join(",")})`).eq("status", "archived"),
    ]);
    if (customerResult.error || orderResult.error) return NextResponse.redirect(new URL("/customers/prullenbak?error=restore", request.url), 303);
  } else if (intent === "delete" || intent === "empty") {
    const { error: appointmentError } = await db.from("appointments").delete().in("customer_id", ids);
    if (!appointmentError) await db.from("customers").delete().in("id", ids);
  }
  revalidatePath("/customers");
  revalidatePath("/customers/prullenbak");
  revalidatePath("/planning");
  if (intent === "restore") return NextResponse.redirect(new URL(`/planning?restored=${ids.length}`, request.url), 303);
  return NextResponse.redirect(new URL("/customers/prullenbak", request.url), 303);
}
