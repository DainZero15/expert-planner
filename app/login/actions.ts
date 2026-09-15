"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };
const loginSchema = z.object({ email: z.string().email("Vul een geldig e-mailadres in."), password: z.string().min(8, "Wachtwoord moet minstens 8 tekens hebben.") });
export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Inloggen is niet gelukt. Controleer uw gegevens." };
  redirect("/dashboard");
}
