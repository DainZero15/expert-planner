import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ExpertsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: experts } = await supabase
    .from("experts")
    .select("id, name, start_time, end_time, default_visit_minutes")
    .order("name");

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/dashboard">Expert <span>Planner</span></Link>
      </header>

      <form action="/api/experts" method="post" className="card">
        <h1>Expert toevoegen</h1>
        <label>Naam<input name="name" required /></label>
        <label>Startadres<input name="start" required /></label>
        <label>Eindadres<input name="end" required /></label>
        <div className="grid">
          <label>Begintijd<input name="startTime" type="time" defaultValue="08:00" /></label>
          <label>Eindtijd<input name="endTime" type="time" defaultValue="17:00" /></label>
          <label>Pauze minuten<input name="breakMinutes" type="number" defaultValue="30" /></label>
        </div>
        <label>Standaard bezoektijd minuten<input name="visitMinutes" type="number" defaultValue="60" /></label>
        <label>Werkgebieden, gescheiden door komma<textarea name="areas" /></label>
        <label>Uitgesloten gebieden<textarea name="excluded" /></label>
        <label>Voorkeuren<textarea name="preferences" /></label>
        <button type="submit">Expert opslaan</button>
      </form>

      <section className="card" style={{ marginTop: 20 }}>
        <h1>Experts</h1>
        {experts?.length ? experts.map((expert) => (
          <p key={expert.id}>
            <strong>{expert.name}</strong> · {String(expert.start_time).slice(0, 5)}–{String(expert.end_time).slice(0, 5)} · {expert.default_visit_minutes} min bezoek
          </p>
        )) : <p>Geen experts.</p>}
      </section>
    </main>
  );
}
