import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns true if an entity was created or converted within the last 24 hours (1 day).
 * Supports explicit `isNewUntil` ISO date string, or `createdAt` / `joinedAt` timestamps.
 */
export function isEntityNew(createdAt?: string, isNewUntil?: string): boolean {
  if (isNewUntil) {
    const until = new Date(isNewUntil).getTime();
    if (!isNaN(until)) return until > Date.now();
  }
  if (!createdAt) return false;
  const createdTime = new Date(createdAt).getTime();
  if (isNaN(createdTime)) return false;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const age = Date.now() - createdTime;
  return age >= 0 && age <= ONE_DAY_MS;
}

export function normalizePhone(phone?: string | number): string {
  if (!phone) return '';
  const str = String(phone).trim();
  let clean = str.replace(/\D/g, '');
  if (clean.length === 11 && (clean.startsWith('8') || clean.startsWith('7'))) {
    clean = '7' + clean.slice(1);
  }
  return clean;
}

export function formatPhone(phone?: string | number): string {
  if (!phone) return '—';
  const clean = normalizePhone(phone);
  if (!clean) return String(phone);
  if (clean.length === 11 && clean.startsWith('7')) {
    return `+7 (${clean.slice(1, 4)}) ${clean.slice(4, 7)}-${clean.slice(7, 9)}-${clean.slice(9, 11)}`;
  }
  if (clean.length > 6) {
    return `+${clean.slice(0, 1)} (${clean.slice(1, 4)}) ${clean.slice(4, 7)}-${clean.slice(7, 9)}-${clean.slice(9)}`;
  }
  return String(phone);
}
