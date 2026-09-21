import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { ProfilePreferences } from "@/components/profile-preferences";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  return <main className="shell"><header className="topbar"><Link className="brand" href="/dashboard">Expert Planner</Link><AppNavigation /></header><ProfilePreferences /></main>;
}
