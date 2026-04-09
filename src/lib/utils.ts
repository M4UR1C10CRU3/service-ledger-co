import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parse a "YYYY-MM-DD" date string into a local Date object.
 * Using `new Date("2026-04-08")` treats it as UTC midnight, which can
 * shift back one day in timezones behind UTC. This function avoids that
 * by constructing the date with explicit year/month/day in local time.
 */
export function parseLocalDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1; // months are 0-indexed
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  // Fallback — append time to avoid UTC interpretation
  return new Date(dateStr + 'T00:00:00');
}
