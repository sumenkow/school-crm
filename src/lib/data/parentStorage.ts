'use client';

import { getDeletedParentIds } from './studentStorage';

export interface ChildDetails {
  id: string;
  name: string;
  group: string;
  studentType?: string;
  nextLesson?: string;
  teacherName?: string;
  isNew?: boolean;
}

export interface ParentRecord {
  id: string;
  name: string;
  phone: string;
  telegram?: string;
  whatsapp?: string;
  email?: string;
  preferredChannel: string;
  notifyWhatsapp?: boolean;
  notifyTelegram?: boolean;
  notifyEmail?: boolean;
  relationshipType?: string;
  children: ChildDetails[];
  totalPaid: string;
  totalPaidEUR?: number;
  balanceStatus: string;
  depositFormatted?: string;
  depositBalance?: number;
  debtFormatted?: string;
  debtBalance?: number;
  isDeleted?: boolean;
  isNew?: boolean;
  createdAt?: string;
  isNewUntil?: string;
}

const PARENTS_STORAGE_KEY = 'crm_parents_v1';

export { getDeletedParentIds };

export function getStoredParents(): ParentRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PARENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const deleted = getDeletedParentIds();
    return parsed.filter((p) => p && p.id && !deleted.has(p.id));
  } catch (err) {
    console.error('Failed to read stored parents:', err);
    return [];
  }
}

export function saveParentToStorage(parent: ParentRecord): void {
  if (typeof window === 'undefined' || !parent || !parent.id) return;
  try {
    const current = getStoredParents();
    const index = current.findIndex((p) => p.id === parent.id);
    let updated: ParentRecord[];
    if (index >= 0) {
      updated = [...current];
      updated[index] = { ...updated[index], ...parent };
    } else {
      updated = [parent, ...current];
    }
    localStorage.setItem(PARENTS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('crm-parents-changed'));
  } catch (err) {
    console.error('Failed to save parent to storage:', err);
  }
}

export function deleteParentFromStorage(parentId: string): void {
  if (typeof window === 'undefined' || !parentId) return;
  try {
    const current = getStoredParents();
    const updated = current.filter((p) => p.id !== parentId);
    localStorage.setItem(PARENTS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('crm-parents-changed'));
  } catch (err) {
    console.error('Failed to delete parent from storage:', err);
  }
}
