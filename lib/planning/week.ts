const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" });

export const amsterdamDate = (value: Date) => {
  const parts = formatter.formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

export const parseDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date();

export const mondayOfWeek = (value: string) => {
  const date = parseDate(value);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date;
};

export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);
export const dateKey = (date: Date) => date.toISOString().slice(0, 10);
export const weekLabel = (monday: Date) => `Week van ${new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long" }).format(monday)}`;
export const formatTime = (iso: string) => new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
