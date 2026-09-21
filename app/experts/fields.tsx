"use client";

import { useState } from "react";

type ExpertValues = {
  id?: string;
  name?: string;
  start?: string;
  end?: string;
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
  visitMinutes?: number;
  areas?: string[];
  excluded?: string[];
  skills?: string[];
  notes?: string;
  startBranchId?: string | null;
  lunchBranchId?: string | null;
  endBranchId?: string | null;
};

type Branch = { id: string; name: string; address_line?: string | null; postal_code?: string | null; city?: string | null };

const defaultSkills = [
  "TV installatie", "TV wandmontage", "Audio & speakers", "Sonos & home cinema", "Beeld & video",
  "Witgoed", "Wasmachine & droger", "Koelkast & vriezer", "Vaatwasser", "Inbouwapparatuur",
  "Oven & magnetron", "Fornuis & kookplaat", "Afzuigkap", "Drempellevering",
];
const normalized = (value: string) => value.trim().toLocaleLowerCase("nl-NL");

export function ExpertFields({ expert = {}, branches = [] }: { expert?: ExpertValues; branches?: Branch[] }) {
  const savedSkills = expert.skills || [];
  const [newSkill, setNewSkill] = useState("");
  const [extraSkills, setExtraSkills] = useState(() => savedSkills.filter((skill) => !defaultSkills.some((item) => normalized(item) === normalized(skill))));
  const addSkill = () => {
    const value = newSkill.trim();
    if (!value || [...defaultSkills, ...extraSkills].some((skill) => normalized(skill) === normalized(value))) return;
    setExtraSkills((current) => [...current, value]);
    setNewSkill("");
  };

  return <>
    {expert.id && <input type="hidden" name="id" value={expert.id} />}
    <label>Naam<input name="name" required defaultValue={expert.name} /></label>
    <fieldset className="branch-assignment">
      <legend>Vestigingen van deze expert</legend>
      <p className="muted">Kies waar de monteur ’s ochtends start, tijdens de pauze de bus kan laden en aan het eind van de dag terugkomt.</p>
      <div className="grid">
        <label>Start vestiging<select name="startBranchId" defaultValue={expert.startBranchId || ""}><option value="">Los startadres gebruiken</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <label>Pauze / bijladen<select name="lunchBranchId" defaultValue={expert.lunchBranchId || ""}><option value="">Geen vaste vestiging</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <label>Eind vestiging<select name="endBranchId" defaultValue={expert.endBranchId || ""}><option value="">Los eindadres gebruiken</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
      </div>
    </fieldset>
    <label>Los startadres <small className="muted">Alleen nodig als er geen startvestiging is gekozen.</small><input name="start" defaultValue={expert.start} /></label>
    <label>Los eindadres <small className="muted">Alleen nodig als er geen eindvestiging is gekozen.</small><input name="end" defaultValue={expert.end} /></label>
    <div className="grid">
      <label>Begintijd<input name="startTime" type="time" defaultValue={expert.startTime || "08:00"} /></label>
      <label>Eindtijd<input name="endTime" type="time" defaultValue={expert.endTime || "17:00"} /></label>
      <label>Pauze minuten<input name="breakMinutes" type="number" defaultValue={expert.breakMinutes ?? 30} /></label>
    </div>
    <label>Standaard bezoektijd minuten<input name="visitMinutes" type="number" defaultValue={expert.visitMinutes ?? 60} /></label>

    <fieldset className="skill-picker">
      <legend>Werksoorten waarin deze expert goed is</legend>
      <p className="muted">Vink alle passende werksoorten aan. De planner gebruikt deze bij het automatisch verdelen van orders.</p>
      <div className="skill-options">
        {defaultSkills.map((skill) => <label className="skill-option" key={skill}>
          <input name="skills" type="checkbox" value={skill} defaultChecked={savedSkills.some((item) => normalized(item) === normalized(skill))} />
          <span>{skill}</span>
        </label>)}
        {extraSkills.map((skill) => <label className="skill-option skill-option-custom" key={skill}>
          <input name="skills" type="checkbox" value={skill} defaultChecked />
          <span>{skill}</span>
          <button type="button" aria-label={`${skill} verwijderen`} onClick={() => setExtraSkills((current) => current.filter((item) => item !== skill))}>×</button>
        </label>)}
      </div>
      <div className="skill-add">
        <input value={newSkill} onChange={(event) => setNewSkill(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSkill(); } }} placeholder="Eigen werksoort, bijvoorbeeld: Airco" />
        <button type="button" onClick={addSkill}>+ Werksoort toevoegen</button>
      </div>
    </fieldset>

    <label>Werkgebieden, gescheiden door komma<textarea name="areas" defaultValue={expert.areas?.join(", ")} /></label>
    <label>Uitgesloten gebieden<textarea name="excluded" defaultValue={expert.excluded?.join(", ")} /></label>
    <label>Voorkeuren / opmerkingen<textarea name="preferences" defaultValue={expert.notes} /></label>
  </>;
}
