'use client';

import { FullStudentData, INITIAL_STUDENTS } from './mockData';

const STUDENTS_STORAGE_KEY = 'crm_students_v2';

/**
 * Loads all students from localStorage merged with INITIAL_STUDENTS.
 * Any edits or status/type changes saved in localStorage take priority.
 */
export function getStoredStudents(): FullStudentData[] {
  if (typeof window === 'undefined') return INITIAL_STUDENTS;
  try {
    const raw = localStorage.getItem(STUDENTS_STORAGE_KEY);
    if (!raw) return INITIAL_STUDENTS;
    const stored: FullStudentData[] = JSON.parse(raw);
    if (!Array.isArray(stored) || stored.length === 0) return INITIAL_STUDENTS;

    const storedMap = new Map<string, FullStudentData>(stored.map((s) => [s.id, s]));
    const result: FullStudentData[] = [];

    // Apply stored changes or fallback to INITIAL_STUDENTS
    for (const init of INITIAL_STUDENTS) {
      if (storedMap.has(init.id)) {
        result.push(storedMap.get(init.id)!);
        storedMap.delete(init.id);
      } else {
        result.push(init);
      }
    }

    // Any newly created students created during sessions
    for (const extra of storedMap.values()) {
      result.unshift(extra);
    }

    return result;
  } catch (err) {
    console.error('Failed to parse stored students:', err);
    return INITIAL_STUDENTS;
  }
}

/**
 * Persists student data to localStorage and syncs in-memory INITIAL_STUDENTS.
 * Dispatches a custom window event 'crm-students-changed' so all views sync in real time.
 */
export function saveStudentToStorage(student: FullStudentData): void {
  // 1. Update in-memory INITIAL_STUDENTS
  const idx = INITIAL_STUDENTS.findIndex((s) => s.id === student.id);
  if (idx !== -1) {
    INITIAL_STUDENTS[idx] = student;
  } else {
    INITIAL_STUDENTS.unshift(student);
  }

  // 2. Persist to localStorage
  if (typeof window !== 'undefined') {
    try {
      const all = getStoredStudents();
      const existingIdx = all.findIndex((s) => s.id === student.id);
      let updated: FullStudentData[];
      if (existingIdx !== -1) {
        updated = all.map((s) => (s.id === student.id ? student : s));
      } else {
        updated = [student, ...all];
      }
      localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(updated));

      // Notify other views
      window.dispatchEvent(new CustomEvent('crm-students-changed', { detail: student }));
    } catch (err) {
      console.error('Failed to save student to storage:', err);
    }
  }
}

/**
 * Finds student by id from unified storage.
 */
export function getStudentById(id: string): FullStudentData | undefined {
  const list = getStoredStudents();
  return list.find((s) => s.id === id);
}
