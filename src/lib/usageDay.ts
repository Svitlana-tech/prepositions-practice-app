/** Today's date in Kyiv time as "2026-10-17" — the key of a DailyStat row. */
export function kyivDay(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv" }).format(date);
}
