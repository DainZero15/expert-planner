import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: (items: { name: string; value: string; options: CookieOptions }[]) => { try { items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* called from Server Component */ } } }
  });
}
