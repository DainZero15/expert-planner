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
};

const defaultSkills = [
  "TV installatie", "TV wandmontage", "Audio & speakers", "Sonos & home cinema", "Beeld & video",
  "Witgoed", "Wasmachine & droger", "Koelkast & vriezer", "Vaatwasser", "Inbouwapparatuur",
  "Oven & magnetron", "Fornuis & kookplaat", "Afzuigkap", "Drempellevering",
];
const normalized = (value: string) => value.trim().toLocaleLowerCase("nl-NL");

export function ExpertFields({ expert = {} }: { expert?: ExpertValues }) {
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
    <label>Startadres<input name="start" required defaultValue={expert.start} /></label>
    <label>Eindadres<input name="end" required defaultValue={expert.end} /></label>
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
