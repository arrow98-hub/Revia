import { TZDate } from "@date-fns/tz";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

/** "Hoy" en la zona horaria del usuario, como fecha ISO (YYYY-MM-DD). */
export function todayISO(timezone: string, now: Date = new Date()): string {
  return format(new TZDate(now, timezone), "yyyy-MM-dd");
}

/** Hora local (0–23) y minutos en la zona horaria dada. */
export function localTime(timezone: string, now: Date = new Date()) {
  const d = new TZDate(now, timezone);
  return { hour: d.getHours(), minute: d.getMinutes() };
}

export function addDaysISO(iso: string, days: number): string {
  return format(addDays(parseISO(iso), days), "yyyy-MM-dd");
}

/** Días de calendario desde `fromISO` hasta `toISO` (positivo si `toISO` es posterior). */
export function daysBetween(fromISO: string, toISO: string): number {
  return differenceInCalendarDays(parseISO(toISO), parseISO(fromISO));
}

/** "18 nov" */
export function shortDate(iso: string): string {
  return format(parseISO(iso), "d MMM", { locale: es }).replace(".", "");
}

/** "miércoles, 18 de noviembre" */
export function longDate(iso: string): string {
  return format(parseISO(iso), "EEEE, d 'de' MMMM", { locale: es });
}

/** "18 de noviembre de 2026" */
export function fullDate(iso: string): string {
  return format(parseISO(iso), "d 'de' MMMM 'de' yyyy", { locale: es });
}

/** Fecha y hora de un timestamp en la zona del usuario: "18 nov 2026, 3:45 p. m." */
export function dateTimeInTz(ts: string, timezone: string): string {
  return format(new TZDate(new Date(ts), timezone), "d MMM yyyy, h:mm a", { locale: es }).replace(".", "");
}

/** Fecha relativa amable: "Hoy", "Mañana", "Ayer", "en 3 días", "hace 2 días". */
export function relativeDay(iso: string, today: string): string {
  const diff = daysBetween(today, iso);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  if (diff > 1) return `En ${diff} días`;
  return `Hace ${Math.abs(diff)} días`;
}

/** Saludo según la hora local. */
export function greeting(timezone: string, now: Date = new Date()): string {
  const { hour } = localTime(timezone, now);
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
