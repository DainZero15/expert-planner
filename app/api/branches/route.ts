import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const clean = (value: FormDataEntryValue | null) => String(value || "").trim();

export async function POST(request: Request) {
  const data = await request.formData();
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  const id = clean(data.get("id"));
  if (data.get("intent") === "delete") {
    if (id) await db.from("branches").delete().eq("id", id);
    return NextResponse.redirect(new URL("/branches", request.url), 303);
  }

  const name = clean(data.get("name"));
  if (!name) return NextResponse.redirect(new URL("/branches", request.url), 303);
  const values = {
    name,
    address_line: clean(data.get("address")) || null,
    postal_code: clean(data.get("postalCode")) || null,
    city: clean(data.get("city")) || null,
  };
  if (id) await db.from("branches").update(values).eq("id", id);
  else await db.from("branches").insert(values);
  return NextResponse.redirect(new URL("/branches", request.url), 303);
}
