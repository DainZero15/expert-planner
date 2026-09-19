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

export function ExpertFields({ expert = {} }: { expert?: ExpertValues }) {
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
    <label>Werksoorten waarin deze expert goed is<input name="skills" placeholder="Bijvoorbeeld: TV, TV wandmontage, Audio, Sonos, Witgoed, Inbouw, Fornuis" defaultValue={expert.skills?.join(", ")} /></label>
    <label>Werkgebieden, gescheiden door komma<textarea name="areas" defaultValue={expert.areas?.join(", ")} /></label>
    <label>Uitgesloten gebieden<textarea name="excluded" defaultValue={expert.excluded?.join(", ")} /></label>
    <label>Voorkeuren / opmerkingen<textarea name="preferences" defaultValue={expert.notes} /></label>
  </>;
}
