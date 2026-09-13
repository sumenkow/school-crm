'use client';

import { TimelineInteraction, INITIAL_STUDENTS } from './mockData';

const TIMELINE_STORAGE_KEY = 'crm_timeline_interactions_v1';

/**
 * Reads custom stored interactions from localStorage.
 */
export function getStoredInteractions(): TimelineInteraction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TIMELINE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse stored interactions:', err);
    return [];
  }
}

/**
 * Saves a new interaction to localStorage and syncs with INITIAL_STUDENTS in-memory.
 */
export function saveInteractionToStorage(item: TimelineInteraction): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getStoredInteractions();
    const updated = [item, ...existing.filter((i) => i.id !== item.id)];
    localStorage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify(updated));

    // Also sync with INITIAL_STUDENTS in-memory if studentId is provided
    if (item.studentId) {
      const idx = INITIAL_STUDENTS.findIndex((s) => s.id === item.studentId);
      if (idx !== -1) {
        const studentInteractions = INITIAL_STUDENTS[idx].interactions || [];
        if (!studentInteractions.some((i) => i.id === item.id)) {
          INITIAL_STUDENTS[idx].interactions = [item, ...studentInteractions];
        }
      }
    }
  } catch (err) {
    console.error('Failed to save interaction to storage:', err);
  }
}

/**
 * Retrieves full unified timeline for a student.
 * Includes direct student interactions PLUS interactions with any of the student's parents.
 */
export function getCombinedStudentTimeline(
  studentId: string,
  baseInteractions: TimelineInteraction[] = [],
  parentIds: string[] = []
): TimelineInteraction[] {
  const stored = getStoredInteractions();
  
  // Combine stored interactions + baseInteractions
  const map = new Map<string, TimelineInteraction>();
  
  // Base interactions
  baseInteractions.forEach((i) => map.set(i.id, i));
  
  // Stored interactions matching this student or any of their parents
  stored.forEach((i) => {
    if (
      i.studentId === studentId ||
      (i.parentId && parentIds.includes(i.parentId))
    ) {
      map.set(i.id, i);
    }
  });

  // Also check if any parent interaction was logged on other students in the family
  INITIAL_STUDENTS.forEach((st) => {
    if (st.parents.some((p) => parentIds.includes(p.id))) {
      (st.interactions || []).forEach((i) => {
        if (i.studentId === studentId || (i.parentId && parentIds.includes(i.parentId))) {
          map.set(i.id, i);
        }
      });
    }
  });

  return Array.from(map.values());
}

/**
 * Retrieves full unified timeline for a parent.
 * Includes direct parent interactions PLUS interactions with all of the parent's children.
 */
export function getCombinedParentTimeline(
  parentId: string,
  childrenIds: string[] = [],
  baseInteractions: TimelineInteraction[] = []
): TimelineInteraction[] {
  const stored = getStoredInteractions();
  const map = new Map<string, TimelineInteraction>();

  // Base interactions
  baseInteractions.forEach((i) => map.set(i.id, i));

  // Stored interactions matching parent or children
  stored.forEach((i) => {
    if (
      i.parentId === parentId ||
      (i.studentId && childrenIds.includes(i.studentId))
    ) {
      map.set(i.id, i);
    }
  });

  // Also scan INITIAL_STUDENTS for children belonging to this parent
  INITIAL_STUDENTS.forEach((st) => {
    if (childrenIds.includes(st.id) || st.parents.some((p) => p.id === parentId)) {
      (st.interactions || []).forEach((i) => {
        map.set(i.id, i);
      });
    }
  });

  return Array.from(map.values());
}
