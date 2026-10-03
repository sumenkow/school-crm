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

export {
  normalizePhone,
  formatPhone,
  formatE164,
  getCountryFromPhone,
  getWhatsAppLink,
  getTelLink,
} from './phoneHelper';
export type { CountryPhoneRule } from './phoneHelper';
