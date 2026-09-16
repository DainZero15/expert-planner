const normalize = (value: string) => value.toLocaleLowerCase("nl-NL");

/** A transparent fallback while no measured job history is available yet. */
export const estimatedDurationMinutes = (workType: string | null | undefined, suppliedDuration: number | null | undefined, expertDefault = 60) => {
  if (suppliedDuration && suppliedDuration > 0) return suppliedDuration;
  const work = normalize(workType || "");
  if (/(inbouw|keuken|inbouwen)/.test(work)) return 180;
  if (/(sonos|home cinema)/.test(work)) return 120;
  if (/(audio|televisie|\btv\b)/.test(work)) return 90;
  if (/(witgoed|wasmachine|droger|vaatwasser|koelkast)/.test(work)) return 75;
  if (/(bezorg|lever)/.test(work)) return 30;
  if (/(reparatie|service)/.test(work)) return 60;
  return expertDefault > 0 ? expertDefault : 60;
};
