'use client';

import { TimelineInteraction, INITIAL_STUDENTS } from './mockData';
import { getStoredStudents } from './studentStorage';

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

    // Supabase dual-write (fire-and-forget)
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient();
      supabase.from('interactions').upsert({
        id: item.id,
        student_id: item.studentId || null,
        parent_id: item.parentId || null,
        lead_id: item.leadId || null,
        type: item.type || 'comment',
        title: item.title,
        description: item.description || null,
        created_at: item.date || new Date().toISOString(),
        is_mock_data: false,
      }).then(() => {}).catch(() => {});
    }).catch(() => {});

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
  const allKnownStudents = typeof window !== 'undefined'
    ? [...INITIAL_STUDENTS, ...getStoredStudents()]
    : INITIAL_STUDENTS;

  allKnownStudents.forEach((st) => {
    if (st.parents?.some((p) => parentIds.includes(p.id)) || st.id === studentId) {
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

  // Also scan all students (INITIAL_STUDENTS and getStoredStudents) for children belonging to this parent
  const allKnownStudents = typeof window !== 'undefined'
    ? [...INITIAL_STUDENTS, ...getStoredStudents()]
    : INITIAL_STUDENTS;

  allKnownStudents.forEach((st) => {
    if (childrenIds.includes(st.id) || st.parents?.some((p) => p.id === parentId)) {
      (st.interactions || []).forEach((i) => {
        map.set(i.id, i);
      });
    }
  });

  return Array.from(map.values());
}

export interface InteractionTargetInfo {
  name: string;
  role: 'student' | 'parent';
  roleLabel: string;
}

/**
 * Determines whether an interaction was performed with the student or with a parent,
 * returning the exact Full Name and formatted status badge ("Ученик" or "Родитель").
 */
export function getInteractionTargetInfo(
  int: TimelineInteraction,
  contextStudent?: { firstName: string; lastName: string; parents?: Array<{ id: string; firstName: string; lastName: string; relationshipType?: string }> },
  contextParent?: { firstName: string; lastName: string }
): InteractionTargetInfo {
  // 1. If targetType is explicitly 'parent'
  if (int.targetType === 'parent') {
    return {
      name: int.targetName || int.parentName || (contextParent ? `${contextParent.firstName} ${contextParent.lastName}` : 'Родитель'),
      role: 'parent',
      roleLabel: int.targetRole || 'Родитель',
    };
  }

  // 2. If targetType is explicitly 'student'
  if (int.targetType === 'student') {
    return {
      name: int.targetName || int.studentName || (contextStudent ? `${contextStudent.firstName} ${contextStudent.lastName}` : 'Ученик'),
      role: 'student',
      roleLabel: 'Ученик',
    };
  }

  // 3. Heuristic matching for older records or external additions:
  const contentLower = (int.content || '').toLowerCase();
  const isParentContent =
    contentLower.includes('родителем') ||
    contentLower.includes('маме') ||
    contentLower.includes('папе') ||
    contentLower.includes('мамы') ||
    contentLower.includes('папы') ||
    contentLower.includes('семьей') ||
    contentLower.includes('родител');

  if (isParentContent || (int.parentId && !int.studentId)) {
    let pName = int.parentName || int.targetName;
    let rel = int.targetRole || 'Родитель';

    if (!pName && contextStudent?.parents) {
      const match = contextStudent.parents.find((p) => p.id === int.parentId);
      if (match) {
        pName = `${match.firstName} ${match.lastName}`;
        rel = match.relationshipType ? `Родитель (${match.relationshipType})` : 'Родитель';
      }
    }

    if (!pName && contextParent) {
      pName = `${contextParent.firstName} ${contextParent.lastName}`;
    }

    return {
      name: pName || 'Родитель',
      role: 'parent',
      roleLabel: rel,
    };
  }

  // Student default
  const sName = int.studentName || int.targetName || (contextStudent ? `${contextStudent.firstName} ${contextStudent.lastName}` : 'Ученик');
  return {
    name: sName,
    role: 'student',
    roleLabel: 'Ученик',
  };
}
