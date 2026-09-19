const normalize = (value: string) => value.toLocaleLowerCase("nl-NL");

/**
 * Planning defaults based on common Dutch installation scopes. A supplied
 * duration from Vendit always wins; these are only a transparent fallback.
 */
export const estimatedDurationMinutes = (workType: string | null | undefined, suppliedDuration: number | null | undefined, expertDefault = 60) => {
  if (suppliedDuration && suppliedDuration > 0) return suppliedDuration;
  const work = normalize(workType || "");
  if (/(inbouw.*(vaatwasser|koelkast|vriezer|oven)|((vaatwasser|koelkast|vriezer|oven).*)inbouw)/.test(work)) return 120;
  if (/(inbouw|keuken|inbouwen)/.test(work)) return 180;
  if (/(sonos|home cinema)/.test(work)) return 120;
  if (/(audio|televisie|\btv\b)/.test(work)) return 90;
  if (/(koelkast|vriezer)/.test(work)) return 30;
  if (/(witgoed|wasmachine|droger|vaatwasser)/.test(work)) return 45;
  if (/(bezorg|lever)/.test(work)) return 30;
  if (/(reparatie|service)/.test(work)) return 60;
  return expertDefault > 0 ? expertDefault : 60;
};
