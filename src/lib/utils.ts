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

/**
 * Format a Date to "YYYY-MM-DD" in local time.
 * Unlike `date.toISOString().split('T')[0]`, this does NOT shift to UTC,
 * so a local April 8 stays April 8 regardless of timezone.
 */
export function formatDateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Determine the effective visual status of an account based on its due date
 * relative to today. Accounts with status 'pendente'/'parcial' whose
 * dataVencimento is in the past are treated as 'vencido'.
 */
export function getEffectiveStatus(
  dbStatus: string,
  dataVencimento: string | null | undefined
): 'vencido' | 'pendente' | 'parcial' | 'liquidado' | 'cancelado' | string {
  if (dbStatus === 'liquidado' || dbStatus === 'cancelado' || dbStatus === 'vencido') return dbStatus;
  if ((dbStatus === 'pendente' || dbStatus === 'parcial') && dataVencimento) {
    const todayStr = formatDateToISO(new Date());
    if (dataVencimento < todayStr) return 'vencido';
  }
  return dbStatus;
}
