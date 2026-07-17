import { format, parseISO } from "date-fns";

export function isoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseDateInput(value: string): Date {
  return parseISO(`${value}T00:00:00.000Z`);
}
