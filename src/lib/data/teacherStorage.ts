'use client';

import { FullTeacherData, INITIAL_TEACHERS } from './mockData';
import { getStoredGroups } from './groupStorage';

const TEACHERS_STORAGE_KEY = 'crm_teachers_v1';

/**
 * Returns dynamic list of teachers from localStorage,
 * augmented with INITIAL_TEACHERS and any teachers referenced in groups.
 */
export function getStoredTeachers(): FullTeacherData[] {
  if (typeof window === 'undefined') {
    return INITIAL_TEACHERS;
  }

  let teachersMap = new Map<string, FullTeacherData>();

  // 1. Seed with INITIAL_TEACHERS
  for (const t of INITIAL_TEACHERS) {
    teachersMap.set(t.id, { ...t });
  }

  // 2. Read stored teachers from localStorage
  try {
    const raw = localStorage.getItem(TEACHERS_STORAGE_KEY);
    if (raw) {
      const parsed: FullTeacherData[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const t of parsed) {
          if (t && t.id) {
            teachersMap.set(t.id, {
              ...teachersMap.get(t.id),
              ...t,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to parse crm_teachers_v1 from localStorage', err);
  }

  // 3. Inspect groups for any custom or modified teachers
  try {
    const groups = getStoredGroups();
    for (const g of groups) {
      if (g.teacherId && !teachersMap.has(g.teacherId)) {
        teachersMap.set(g.teacherId, {
          id: g.teacherId,
          name: g.teacherName || 'Преподаватель',
          role: `Преподаватель курса «${g.courseName || g.name}»`,
          phone: '',
          telegram: '',
          email: '',
          bio: '',
          status: 'active',
          weeklyHours: 10,
          lessonsPerWeek: 5,
          studentsCount: g.students?.length || 0,
          activeGroups: [
            {
              id: g.id,
              name: g.name,
              courseName: g.courseName || g.name,
              schedule: g.schedule || '',
              studentsCount: g.students?.length || 0,
            },
          ],
        });
      }
    }
  } catch {
    // Ignore group storage parsing error if in SSR
  }

  return Array.from(teachersMap.values());
}

/**
 * Persists a teacher record to localStorage and dispatches a sync event.
 */
export function saveTeacherToStorage(teacher: FullTeacherData): void {
  if (typeof window === 'undefined') return;

  try {
    const current = getStoredTeachers();
    const existingIdx = current.findIndex((t) => t.id === teacher.id);
    let updated: FullTeacherData[];
    if (existingIdx >= 0) {
      updated = [...current];
      updated[existingIdx] = teacher;
    } else {
      updated = [teacher, ...current];
    }

    localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('crm-teachers-changed', { detail: teacher }));
  } catch (err) {
    console.error('Failed to save teacher to localStorage', err);
  }
}
