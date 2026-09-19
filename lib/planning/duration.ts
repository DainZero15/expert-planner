const normalize = (value: string) => value.toLocaleLowerCase("nl-NL");

/**
 * Planning defaults based on common Dutch installation scopes. A supplied
 * duration from Vendit always wins; these are only a transparent fallback.
 */
export const estimatedDurationMinutes = (workType: string | null | undefined, suppliedDuration: number | null | undefined, expertDefault = 60) => {
  if (suppliedDuration && suppliedDuration > 0) return suppliedDuration;
  const work = normalize(workType || "");

  // Expert's installation services can involve a few very different scopes.
  // Keep the detailed matches above the broad product groups below.
  if (/(inmeet|inmeten)/.test(work)) return 120;
  if (/(televisie|\btv\b).*(draaibaar|draai|bestaand.*(beugel|wand)|demonter|vervang.*beugel)/.test(work)) return 120;
  if (/((wand|muur|beugel).*(televisie|\btv\b)|(televisie|\btv\b).*(wand|muur|beugel))/.test(work)) return 90;
  if (/(sonos|home cinema|surround).*(in.?wall|in.?ceiling|inbouw|plafond|wand)/.test(work)) return 180;
  if (/(sonos|home cinema|surround)/.test(work)) return 120;
  if (/(audio|wifi.?speaker|luidspreker|soundbar)/.test(work)) return 60;
  if (/(stapelkit|stapelen|trekschakelaar|wasdroger.*wasmachine|wasmachine.*wasdroger)/.test(work)) return 75;
  if (/(inbouw.*(vaatwasser|koelkast|vriezer|oven)|((vaatwasser|koelkast|vriezer|oven).*)inbouw)/.test(work)) return 120;
  if (/(afzuigkap|schouwkap|afzuiger)/.test(work)) return 180;
  if (/(fornuis|kookplaat)/.test(work)) return 60;
  if (/(inbouw|keuken|inbouwen)/.test(work)) return 180;
  if (/(televisie|\btv\b)/.test(work)) return 60;
  if (/(koelkast|vriezer)/.test(work)) return 30;
  if (/(witgoed|wasmachine|droger|vaatwasser)/.test(work)) return 45;
  if (/(bezorg|lever)/.test(work)) return 30;
  if (/(reparatie|service)/.test(work)) return 60;
  return expertDefault > 0 ? expertDefault : 60;
};
