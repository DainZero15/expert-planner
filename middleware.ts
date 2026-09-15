import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { cookies: { getAll: () => request.cookies.getAll(), setAll: (items: { name: string; value: string; options: CookieOptions }[]) => items.forEach(({ name, value, options }) => { request.cookies.set(name, value); response.cookies.set(name, value, options); }) } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && (request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/import") || request.nextUrl.pathname.startsWith("/customers") || request.nextUrl.pathname.startsWith("/experts"))) return NextResponse.redirect(new URL("/login", request.url));
  return response;
}
export const config = { matcher: ["/dashboard/:path*", "/import/:path*", "/customers/:path*", "/experts/:path*"] };
