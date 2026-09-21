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
  "Reparatie witgoed", "Reparatie beeld & geluid", "Reparatie inbouwapparatuur", "Diagnose & service",
];
const normalized = (value: string) => value.trim().toLocaleLowerCase("nl-NL");

export function ExpertFields({ expert = {}, branches = [] }: { expert?: ExpertValues; branches?: Branch[] }) {
  const savedSkills = expert.skills || [];
  const [newSkill, setNewSkill] = useState("");
  const [extraSkills, setExtraSkills] = useState(() => savedSkills.filter((skill) => !defaultSkills.some((item) => normalized(item) === normalized(skill))));
  const [useFixedLocations, setUseFixedLocations] = useState(Boolean(expert.startBranchId || expert.lunchBranchId || expert.endBranchId || expert.start || expert.end));
  const addSkill = () => {
    const value = newSkill.trim();
    if (!value || [...defaultSkills, ...extraSkills].some((skill) => normalized(skill) === normalized(value))) return;
    setExtraSkills((current) => [...current, value]);
    setNewSkill("");
  };

  return <>
    {expert.id && <input type="hidden" name="id" value={expert.id} />}
    <label>Naam<input name="name" required defaultValue={expert.name} /></label>
    <section className="optional-locations">
      <div><strong>Start- en eindlocatie</strong><p className="muted">Standaard kiest de planner automatisch de beste route. Een vaste locatie is alleen nodig als u die op een bepaalde dag wilt afdwingen.</p></div>
      <button type="button" className="secondary-button" onClick={() => setUseFixedLocations((current) => !current)}>{useFixedLocations ? "Vaste locaties verbergen" : "+ Vaste locaties instellen"}</button>
    </section>
    {useFixedLocations && <fieldset className="branch-assignment">
      <legend>Vaste locaties - optioneel</legend>
      <p className="muted">Kies alleen een vestiging als deze expert daar echt moet beginnen, tijdens pauze moet bijladen of moet eindigen.</p>
      <div className="grid">
        <label>Start vestiging<select name="startBranchId" defaultValue={expert.startBranchId || ""}><option value="">Automatisch laten bepalen</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <label>Pauze / bijladen<select name="lunchBranchId" defaultValue={expert.lunchBranchId || ""}><option value="">Automatisch laten bepalen</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <label>Eind vestiging<select name="endBranchId" defaultValue={expert.endBranchId || ""}><option value="">Automatisch laten bepalen</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
      </div>
      <div className="grid"><label>Los startadres<input name="start" defaultValue={expert.start} /></label><label>Los eindadres<input name="end" defaultValue={expert.end} /></label></div>
    </fieldset>}
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
