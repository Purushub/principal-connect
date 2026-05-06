export const SLOTS = [
  { index: 0, label: "9:00 – 9:20" },
  { index: 1, label: "9:20 – 9:40" },
  { index: 2, label: "9:40 – 10:00" },
  { index: 3, label: "10:00 – 10:20" },
  { index: 4, label: "10:20 – 10:40" },
] as const;

export function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
