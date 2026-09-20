'use client';

import { TimelineInteraction, INITIAL_STUDENTS } from './mockData';
import { getStoredStudents } from './studentStorage';

export type { TimelineInteraction };

const TIMELINE_STORAGE_KEY = 'crm_timeline_interactions_v1';

/**
 * Parses interaction date and time into a precise Unix timestamp (in milliseconds)
 * to ensure strict chronological sorting (newest on top, oldest at the bottom).
 */
export function parseInteractionTimestamp(item: TimelineInteraction): number {
  if (!item) return 0;

  // 1. Check if ID embeds a Unix millisecond timestamp (e.g., int_1726485000000, int_deduct_1726485000000)
  const idMatch = (item.id || '').match(/(\d{10,13})/);
  const idTimestamp = idMatch ? parseInt(idMatch[1], 10) : null;
  const idTimeMs = idTimestamp ? (idTimestamp < 10000000000 ? idTimestamp * 1000 : idTimestamp) : null;

  // 2. Check explicit ISO/date fields if present
  const explicitDate = (item as any).created_at || (item as any).date;
  if (explicitDate && !isNaN(new Date(explicitDate).getTime())) {
    return new Date(explicitDate).getTime();
  }

  const str = (item.occurredAt || '').trim();

  // If "Только что", prefer the ID timestamp if created recently, otherwise current time
  if (!str || str.toLowerCase().includes('только что') || str.toLowerCase().includes('just now')) {
    return idTimeMs || Date.now();
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();

  // Handle "Сегодня, HH:mm"
  if (str.toLowerCase().startsWith('сегодня') || str.toLowerCase().startsWith('today')) {
    const timeMatch = str.match(/(\d{1,2}):(\d{2})/);
    const hours = timeMatch ? parseInt(timeMatch[1], 10) : now.getHours();
    const minutes = timeMatch ? parseInt(timeMatch[2], 10) : now.getMinutes();
    const d = new Date(currentYear, currentMonth, currentDate, hours, minutes, 0, 0);
    return d.getTime();
  }

  // Handle "Вчера, HH:mm"
  if (str.toLowerCase().startsWith('вчера') || str.toLowerCase().startsWith('yesterday')) {
    const timeMatch = str.match(/(\d{1,2}):(\d{2})/);
    const hours = timeMatch ? parseInt(timeMatch[1], 10) : 12;
    const minutes = timeMatch ? parseInt(timeMatch[2], 10) : 0;
    const d = new Date(currentYear, currentMonth, currentDate - 1, hours, minutes, 0, 0);
    return d.getTime();
  }

  // Handle "DD.MM.YYYY, HH:mm" or "DD.MM.YYYY" or "YYYY-MM-DD"
  const ddmmyyyyMatch = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:,\s*(\d{1,2}):(\d{2}))?/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
    const year = parseInt(ddmmyyyyMatch[3], 10);
    const hours = ddmmyyyyMatch[4] ? parseInt(ddmmyyyyMatch[4], 10) : 12;
    const minutes = ddmmyyyyMatch[5] ? parseInt(ddmmyyyyMatch[5], 10) : 0;
    const d = new Date(year, month, day, hours, minutes, 0, 0);
    return d.getTime();
  }

  // Fallback to Date.parse
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    return parsed;
  }

  // Fallback to id timestamp or 0
  return idTimeMs || 0;
}

/**
 * Sorts interactions in strictly chronological descending order (newest first, oldest last).
 */
export function sortTimelineChronologicalDesc(interactions: TimelineInteraction[]): TimelineInteraction[] {
  return [...interactions].sort((a, b) => {
    const timeA = parseInteractionTimestamp(a);
    const timeB = parseInteractionTimestamp(b);
    if (timeB !== timeA) {
      return timeB - timeA;
    }
    // Tiebreaker by ID
    return (b.id || '').localeCompare(a.id || '');
  });
}

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
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    // Never leave relative 'Только что' or 'Сегодня' unpersisted — freeze exact date and time
    if (!item.occurredAt || item.occurredAt === 'Только что') {
      item.occurredAt = `${todayStr}, ${timeStr}`;
    } else if (item.occurredAt.toLowerCase().startsWith('сегодня')) {
      item.occurredAt = item.occurredAt.replace(/сегодня/i, todayStr);
    }

    const isoCreatedAt = (item as any).created_at || (item as any).createdAt || (item as any).date || now.toISOString();
    (item as any).createdAt = isoCreatedAt;
    (item as any).created_at = isoCreatedAt;

    const existing = getStoredInteractions();
    const updated = [item, ...existing.filter((i) => i.id !== item.id)];
    localStorage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify(updated));

    // Also sync with INITIAL_STUDENTS in-memory if studentId is provided
    if (item.studentId) {
      const idx = INITIAL_STUDENTS.findIndex((s) => s.id === item.studentId);
      if (idx !== -1) {
        const studentInteractions = INITIAL_STUDENTS[idx].interactions || [];
        if (!studentInteractions.some((i) => i.id === item.id)) {
          INITIAL_STUDENTS[idx].interactions = sortTimelineChronologicalDesc([item, ...studentInteractions]);
        }
      }
    }

    // Supabase dual-write (fire-and-forget)
    import('@/lib/supabase/client').then(({ createClient }) => {
      try {
        const supabase = createClient();
        supabase.from('interactions').upsert({
          id: item.id,
          student_id: item.studentId || null,
          parent_id: item.parentId || null,
          lead_id: (item as any).leadId || null,
          type: (item.type as any) || 'comment',
          title: (item as any).title || item.content?.slice(0, 50) || 'Заметка',
          description: item.content || (item as any).description || null,
          created_at: isoCreatedAt,
          is_mock_data: false,
        }).then(() => {}, () => {});
      } catch {}
    }).catch(() => {});

    // Dispatch global event for reactive UI update
    window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed', { detail: item }));
  } catch (err) {
    console.error('Failed to save interaction to storage:', err);
  }
}

/**
 * Retrieves full unified timeline for a lead, sorted newest on top.
 */
export function getCombinedLeadTimeline(
  leadId: string,
  baseInteractions: TimelineInteraction[] = [],
  convertedStudentId?: string
): TimelineInteraction[] {
  const stored = getStoredInteractions();
  const map = new Map<string, TimelineInteraction>();

  baseInteractions.forEach((i) => map.set(i.id, i));

  stored.forEach((i) => {
    if (
      (i as any).leadId === leadId ||
      (convertedStudentId && i.studentId === convertedStudentId)
    ) {
      map.set(i.id, i);
    }
  });

  return sortTimelineChronologicalDesc(Array.from(map.values()));
}

/**
 * Helper to identify routine timeline noise (routine lesson attendance and micro per-lesson deductions)
 * so they are excluded from the main Timeline feed.
 */
export function isRoutineTimelineNoise(item: TimelineInteraction): boolean {
  if (!item || !item.content) return false;
  const contentLower = item.content.toLowerCase();

  // Routine lesson attendance checks (without explicit absence notes)
  if (
    (contentLower.includes('был на занятии') || contentLower.includes('был на уроке') || contentLower.includes('посетил урок') || contentLower.includes('присутствовал')) &&
    !contentLower.includes('пропуск') && !contentLower.includes('не был') && !contentLower.includes('отсутств')
  ) {
    return true;
  }

  // Micro per-lesson deduction checks (routine per-lesson auto-deductions)
  if (
    (contentLower.includes('поурочное списание') || contentLower.includes('списание за урок') || contentLower.includes('микросписание')) &&
    !contentLower.includes('оплата') && !contentLower.includes('пополнение')
  ) {
    return true;
  }

  return false;
}

/**
 * Retrieves full unified timeline for a student, sorted newest on top.
 * Includes direct student interactions PLUS interactions with any of the student's parents
 * AND historical lead interactions from before conversion.
 */
export function getCombinedStudentTimeline(
  studentId: string,
  baseInteractions: TimelineInteraction[] = [],
  parentIds: string[] = []
): TimelineInteraction[] {
  const stored = getStoredInteractions();
  const map = new Map<string, TimelineInteraction>();
  
  // Base student interactions
  baseInteractions.forEach((i) => {
    if (!isRoutineTimelineNoise(i)) {
      map.set(i.id, i);
    }
  });

  // Check stored interactions matching student, lead, or parents
  stored.forEach((i) => {
    const isStudentMatch = i.studentId && String(i.studentId) === String(studentId);
    const isParentMatch = i.parentId && parentIds.map(String).includes(String(i.parentId));
    const isLeadMatch = (i as any).leadId && (i as any).convertedStudentId === studentId;

    if ((isStudentMatch || isParentMatch || isLeadMatch) && !isRoutineTimelineNoise(i)) {
      map.set(i.id, i);
    }
  });

  // Check all known students for matching student or parent interactions
  const allKnownStudents = typeof window !== 'undefined'
    ? [...INITIAL_STUDENTS, ...getStoredStudents()]
    : INITIAL_STUDENTS;

  allKnownStudents.forEach((st) => {
    if (st.parents?.some((p) => parentIds.map(String).includes(String(p.id))) || String(st.id) === String(studentId)) {
      (st.interactions || []).forEach((i) => {
        const isStudentMatch = i.studentId && String(i.studentId) === String(studentId);
        const isParentMatch = i.parentId && parentIds.map(String).includes(String(i.parentId));
        if ((isStudentMatch || isParentMatch) && !isRoutineTimelineNoise(i)) {
          map.set(i.id, i);
        }
      });
    }
  });

  return sortTimelineChronologicalDesc(Array.from(map.values()));
}

/**
 * Retrieves full unified timeline for a parent, sorted newest on top.
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

  return sortTimelineChronologicalDesc(Array.from(map.values()));
}

export interface InteractionTargetInfo {
  name: string;
  role: 'student' | 'parent' | 'lead';
  roleLabel: string;
}

/**
 * Determines whether an interaction was performed with the student, parent, or lead,
 * returning the exact Full Name and formatted status badge ("Ученик", "Родитель", "Лид").
 */
export function getInteractionTargetInfo(
  int: TimelineInteraction,
  contextStudent?: { firstName: string; lastName: string; parents?: Array<{ id: string; firstName: string; lastName: string; relationshipType?: string }> },
  contextParent?: { firstName: string; lastName: string }
): InteractionTargetInfo {
  // 0. If targetType is explicitly 'lead' or item has leadId without studentId
  if (int.targetType === 'lead' || ((int as any).leadId && !int.studentId && !int.parentId)) {
    return {
      name: (int as any).leadName || int.targetName || 'Лид',
      role: 'lead',
      roleLabel: 'Лид',
    };
  }

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
