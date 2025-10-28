import { format, toZonedTime } from "date-fns-tz";

const SPAIN_TIMEZONE = "Europe/Madrid";

/**
 * Convierte un timestamp UTC a hora española
 */
export function utcToSpanishTime(utcDate: Date | string): Date {
  const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
  return toZonedTime(date, SPAIN_TIMEZONE);
}

/**
 * Formatea un timestamp UTC como string en hora española
 */
export function formatSpanishTime(utcDate: Date | string, formatStr: string = "yyyy-MM-dd HH:mm:ss"): string {
  const spanishDate = utcToSpanishTime(utcDate);
  return format(spanishDate, formatStr, { timeZone: SPAIN_TIMEZONE });
}

/**
 * Obtiene la fecha en formato YYYY-MM-DD en hora española
 */
export function getSpanishDate(utcDate: Date | string): string {
  return formatSpanishTime(utcDate, "yyyy-MM-dd");
}

/**
 * Obtiene la hora en formato HH:mm en hora española
 */
export function getSpanishTime(utcDate: Date | string): string {
  return formatSpanishTime(utcDate, "HH:mm");
}
