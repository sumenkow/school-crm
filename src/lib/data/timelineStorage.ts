import { TimelineInteraction, INITIAL_STUDENTS } from './mockData';
import { getStoredStudents } from './studentStorage';
import { persistEntityToCloud } from './cloudSync';

export type { TimelineInteraction };

export const TIMELINE_STORAGE_KEY = 'crm_timeline_interactions_v1';

/**
 * Deterministic mock ↔ UUID equivalence map (mirrors server-side toUUID).
 * Returns a Set of all known aliases for a given entity ID so that
 * timeline lookups work regardless of whether the page was loaded with
 * a legacy short ID or a Supabase UUID.
 */
const MOCK_UUID_PAIRS: [string, string][] = [
  ['1', 'b1111111-1111-4111-8111-111111111111'],
  ['2', 'b2222222-2222-4222-8222-222222222222'],
  ['3', 'b3333333-3333-4333-8333-333333333333'],
  ['4', 'b4444444-4444-4444-8444-444444444444'],
  ['5', 'b5555555-5555-4555-8555-555555555555'],
  ['6', 'b6666666-6666-4666-8666-666666666666'],
  ['st_1', 'b1111111-1111-4111-8111-111111111111'],
  ['st_2', 'b2222222-2222-4222-8222-222222222222'],
  ['st_3', 'b3333333-3333-4333-8333-333333333333'],
  ['st_4', 'b4444444-4444-4444-8444-444444444444'],
  ['st_5', 'b5555555-5555-4555-8555-555555555555'],
  ['s1', 'b1111111-1111-4111-8111-111111111111'],
  ['s2', 'b2222222-2222-4222-8222-222222222222'],
  ['s3', 'b3333333-3333-4333-8333-333333333333'],
  ['s4', 'b4444444-4444-4444-8444-444444444444'],
  ['s5', 'b5555555-5555-4555-8555-555555555555'],
  ['s6', 'b6666666-6666-4666-8666-666666666666'],
  ['p1', 'a1111111-1111-4111-8111-111111111111'],
  ['p2', 'a2222222-2222-4222-8222-222222222222'],
  ['p3', 'a3333333-3333-4333-8333-333333333333'],
  ['p4', 'a4444444-4444-4444-8444-444444444444'],
  ['p5', 'a5555555-5555-4555-8555-555555555555'],
  ['p6', 'a6666666-6666-4666-8666-666666666666'],
  ['lead_1', 'd1111111-1111-4111-8111-111111111111'],
  ['lead_2', 'd2222222-2222-4222-8222-222222222222'],
  ['lead_3', 'd3333333-3333-4333-8333-333333333333'],
];

export function getEquivalentIds(id: string): Set<string> {
  if (!id) return new Set<string>();
  const idStr = String(id).trim();
  const result = new Set<string>([idStr]);

  // Strip prefix s, st_, par_, p
  const numericPart = idStr.replace(/^(?:st_|s|par_|p)/, '');
  if (numericPart && numericPart !== idStr) {
    result.add(numericPart);
    result.add(`st_${numericPart}`);
    result.add(`s${numericPart}`);
    result.add(`p${numericPart}`);
  }

  for (const [mock, uuid] of MOCK_UUID_PAIRS) {
    if (idStr === mock || idStr === uuid || result.has(mock) || result.has(uuid)) {
      result.add(mock);
      result.add(uuid);
    }
  }
  return result;
}

/**
 * Normalizes a mock short ID to its canonical UUID form.
 * Unknown IDs are returned as-is.
 */
function normalizeIdToUUID(id?: string): string {
  if (!id) return '';
  for (const [mock, uuid] of MOCK_UUID_PAIRS) {
    if (id === mock) return uuid;
  }
  return id;
}

/**
 * Universal date parser that reliably converts ISO dates, Russian date formats
 * (DD.MM.YYYY, HH:mm), YYYY-MM-DD, or timestamps to a standard ISO 8601 string.
 * Never overrides an existing valid date with NOW.
 */
export function parseDateToISO(val?: string | number | null): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'number') {
    const d = new Date(val < 10000000000 ? val * 1000 : val);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  const str = String(val).trim();
  if (!str) return new Date().toISOString();

  // 1. If already valid ISO
  if (str.includes('T') || (str.includes('-') && str.endsWith('Z'))) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // 2. Russian format: DD.MM.YYYY, HH:mm or DD.MM.YYYY
  const ruMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (ruMatch) {
    const day = parseInt(ruMatch[1], 10);
    const month = parseInt(ruMatch[2], 10) - 1;
    const year = parseInt(ruMatch[3], 10);
    const hours = ruMatch[4] ? parseInt(ruMatch[4], 10) : 12;
    const minutes = ruMatch[5] ? parseInt(ruMatch[5], 10) : 0;
    const seconds = ruMatch[6] ? parseInt(ruMatch[6], 10) : 0;
    const d = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // 3. ISO Date format: YYYY-MM-DD or YYYY-MM-DD HH:mm:ss
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (isoMatch) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // 4. Standard Date.parse
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }

  return new Date().toISOString();
}

/**
 * Normalizes text content for duplicate detection by stripping chat prefixes,
 * brackets, quotes, and redundant whitespace.
 */
export function normalizeInteractionText(content?: string): string {
  if (!content) return '';
  return content
    .toLowerCase()
    .replace(/^(?:✈️\s*)?сообщение\s+в\s+telegram:\s*[«"']?/i, '')
    .replace(/^(?:💬\s*)?входящее\s+в\s+telegram:\s*[«"']?/i, '')
    .replace(/[»"']\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses interaction date and time into a precise Unix timestamp (in milliseconds)
 * to ensure strict chronological sorting (newest on top, oldest at the bottom).
 */
export function parseInteractionTimestamp(item: TimelineInteraction): number {
  if (!item) return 0;

  // 1. Check explicit ISO/date fields if present
  const explicitDate = (item as any).created_at || (item as any).createdAt || (item as any).date;
  if (explicitDate) {
    const d = new Date(parseDateToISO(explicitDate));
    if (!isNaN(d.getTime())) return d.getTime();
  }

  const str = (item.occurredAt || '').trim();

  // 2. Check if ID embeds a Unix millisecond timestamp
  const idMatch = (item.id || '').match(/(\d{10,13})/);
  const idTimestamp = idMatch ? parseInt(idMatch[1], 10) : null;
  const idTimeMs = idTimestamp ? (idTimestamp < 10000000000 ? idTimestamp * 1000 : idTimestamp) : null;

  if (!str) return idTimeMs || 0;

  // 3. Handle "DD.MM.YYYY, HH:mm" or "DD.MM.YYYY"
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

  // 4. Fallback to Date.parse
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    return parsed;
  }

  return idTimeMs || 0;
}

/**
 * Intelligent deduplication of timeline interactions.
 * Combines items sharing identical ID or same recipient + channel + normalized text within 5 mins.
 */
export function deduplicateTimelineInteractions(interactions: TimelineInteraction[]): TimelineInteraction[] {
  const result: TimelineInteraction[] = [];

  for (const item of interactions) {
    if (!item) continue;

    const normText = normalizeInteractionText(item.content);
    const itemTime = parseInteractionTimestamp(item);
    const targetKey = `${normalizeIdToUUID(item.studentId)}_${normalizeIdToUUID(item.parentId)}_${normalizeIdToUUID((item as any).leadId)}`;

    // Look for an existing match in result list
    const existingIdx = result.findIndex((existing) => {
      // 1. Direct ID match
      if (existing.id && item.id && existing.id === item.id) return true;

      // 2. Semantic match for identical message sent to same recipient
      const existingTargetKey = `${normalizeIdToUUID(existing.studentId)}_${normalizeIdToUUID(existing.parentId)}_${normalizeIdToUUID((existing as any).leadId)}`;
      if (existingTargetKey !== targetKey) return false;

      const existingNorm = normalizeInteractionText(existing.content);
      if (!normText || !existingNorm || existingNorm !== normText) return false;

      const existingTime = parseInteractionTimestamp(existing);
      // Within 5 minutes window (300,000 ms) or exact same timestamp
      const timeDiff = Math.abs(existingTime - itemTime);
      return timeDiff < 300000;
    });

    if (existingIdx === -1) {
      result.push(item);
    } else {
      // Merge into canonical item: prefer UUID format for ID and richer metadata
      const existing = result[existingIdx];
      const isItemUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id || '');
      const isExistingUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(existing.id || '');

      result[existingIdx] = {
        ...existing,
        ...item,
        id: isExistingUUID ? existing.id : (isItemUUID ? item.id : (existing.id || item.id)),
        content: (item.content && item.content.length > (existing.content || '').length) ? item.content : existing.content,
        result: item.result || existing.result,
        occurredAt: existing.occurredAt || item.occurredAt,
        createdAt: (existing as any).createdAt || (item as any).createdAt,
      };
    }
  }

  return sortTimelineChronologicalDesc(result);
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
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? deduplicateTimelineInteractions(parsed) : [];
  } catch (err) {
    console.error('Failed to parse stored interactions:', err);
    return [];
  }
}

/**
 * Saves a new interaction to localStorage and syncs with INITIAL_STUDENTS in-memory.
 */
export function saveInteractionToStorage(
  item: TimelineInteraction,
  options?: { skipCloudSync?: boolean }
): void {
  if (typeof window === 'undefined') return;
  try {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    // Freeze exact date and time permanently — never leave relative strings
    if (!item.occurredAt || item.occurredAt === 'Только что') {
      item.occurredAt = `${todayStr}, ${timeStr}`;
    } else if (item.occurredAt.toLowerCase().startsWith('сегодня')) {
      item.occurredAt = item.occurredAt.replace(/сегодня/i, todayStr);
    }

    const isoCreatedAt = parseDateToISO((item as any).created_at || (item as any).createdAt || (item as any).date || item.occurredAt);
    (item as any).createdAt = isoCreatedAt;
    (item as any).created_at = isoCreatedAt;

    const existing = getStoredInteractions();
    const updated = deduplicateTimelineInteractions([item, ...existing.filter((i) => i.id !== item.id)]);
    localStorage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify(updated));

    // Also sync with INITIAL_STUDENTS in-memory if studentId is provided
    if (item.studentId) {
      const idx = INITIAL_STUDENTS.findIndex((s) => s.id === item.studentId);
      if (idx !== -1) {
        const studentInteractions = INITIAL_STUDENTS[idx].interactions || [];
        INITIAL_STUDENTS[idx].interactions = deduplicateTimelineInteractions([item, ...studentInteractions]);
      }
    }

    // Supabase Cloud DB write via sync layer (unless explicitly skipped)
    if (!options?.skipCloudSync) {
      persistEntityToCloud('interaction', item);
    }

    // Dispatch global event for reactive UI update
    window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed', { detail: item }));
  } catch (err) {
    console.error('Failed to save interaction to storage:', err);
  }
}

/**
 * Retrieves full unified timeline for a lead, sorted newest on top with duplicate filtering.
 */
export function getCombinedLeadTimeline(
  leadId: string,
  baseInteractions: TimelineInteraction[] = [],
  convertedStudentId?: string
): TimelineInteraction[] {
  const stored = getStoredInteractions();
  const list: TimelineInteraction[] = [...baseInteractions];

  const leadIdSet = getEquivalentIds(leadId);
  const studentIdSet = convertedStudentId ? getEquivalentIds(convertedStudentId) : new Set<string>();

  stored.forEach((i) => {
    if (
      ((i as any).leadId && leadIdSet.has(String((i as any).leadId))) ||
      (i.studentId && studentIdSet.has(String(i.studentId)))
    ) {
      list.push(i);
    }
  });

  return deduplicateTimelineInteractions(list);
}

/**
 * Helper to identify routine timeline noise (routine lesson attendance and micro per-lesson deductions)
 * so they are excluded from the main Timeline feed.
 */
export function isRoutineTimelineNoise(item: TimelineInteraction): boolean {
  if (!item || !item.content) return false;
  const contentLower = item.content.toLowerCase();

  // Explicit teacher comments and notes should never be treated as noise
  if (contentLower.includes('комментарий') || contentLower.includes('заметка') || contentLower.includes('обратная связь') || contentLower.includes('дз') || contentLower.includes('домашнее задание')) {
    return false;
  }

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
 * Retrieves full unified timeline for a student, sorted newest on top with deduplication.
 */
export function getCombinedStudentTimeline(
  studentId: string,
  baseInteractions: TimelineInteraction[] = [],
  parentIds: string[] = []
): TimelineInteraction[] {
  const stored = getStoredInteractions();
  const list: TimelineInteraction[] = [];

  // Build equivalence sets so mock IDs ('1', 'p1') and UUIDs match each other
  const studentIdSet = getEquivalentIds(studentId);
  const parentIdSets = new Set<string>();
  for (const pid of parentIds) {
    for (const eq of getEquivalentIds(pid)) parentIdSets.add(eq);
  }

  const allKnownStudents = typeof window !== 'undefined'
    ? [...INITIAL_STUDENTS, ...getStoredStudents()]
    : INITIAL_STUDENTS;

  const currentStudent = allKnownStudents.find((s) => s.id === studentId || studentIdSet.has(s.id));
  const studentFullName = currentStudent ? `${currentStudent.firstName || ''} ${currentStudent.lastName || ''}`.trim().toLowerCase() : '';
  const studentReversedName = currentStudent ? `${currentStudent.lastName || ''} ${currentStudent.firstName || ''}`.trim().toLowerCase() : '';

  // Base student interactions
  baseInteractions.forEach((i) => {
    if (!isRoutineTimelineNoise(i)) {
      list.push(i);
    }
  });

  // Stored interactions matching student, lead, or parents
  stored.forEach((i) => {
    const isStudentIdMatch = i.studentId && studentIdSet.has(String(i.studentId));
    const isStudentNameMatch = Boolean(
      studentFullName && i.studentName &&
      (i.studentName.trim().toLowerCase() === studentFullName || i.studentName.trim().toLowerCase() === studentReversedName)
    );
    const isParentMatch = i.parentId && parentIdSets.has(String(i.parentId));
    const isLeadMatch = (i as any).leadId && (i as any).convertedStudentId && studentIdSet.has(String((i as any).convertedStudentId));

    if ((isStudentIdMatch || isStudentNameMatch || isParentMatch || isLeadMatch) && !isRoutineTimelineNoise(i)) {
      list.push(i);
    }
  });

  allKnownStudents.forEach((st) => {
    if (st.parents?.some((p) => parentIdSets.has(String(p.id))) || studentIdSet.has(String(st.id))) {
      (st.interactions || []).forEach((i) => {
        const isStudentIdMatch = i.studentId && studentIdSet.has(String(i.studentId));
        const isStudentNameMatch = Boolean(
          studentFullName && i.studentName &&
          (i.studentName.trim().toLowerCase() === studentFullName || i.studentName.trim().toLowerCase() === studentReversedName)
        );
        const isParentMatch = i.parentId && parentIdSets.has(String(i.parentId));
        if ((isStudentIdMatch || isStudentNameMatch || isParentMatch) && !isRoutineTimelineNoise(i)) {
          list.push(i);
        }
      });
    }
  });

  return deduplicateTimelineInteractions(list);
}

/**
 * Retrieves full unified timeline for a parent, sorted newest on top with deduplication.
 */
export function getCombinedParentTimeline(
  parentId: string,
  childrenIds: string[] = [],
  baseInteractions: TimelineInteraction[] = []
): TimelineInteraction[] {
  const stored = getStoredInteractions();
  const list: TimelineInteraction[] = [...baseInteractions];

  // Build equivalence sets for cross-format matching
  const parentIdSet = getEquivalentIds(parentId);
  const childIdSets = new Set<string>();
  for (const cid of childrenIds) {
    for (const eq of getEquivalentIds(cid)) childIdSets.add(eq);
  }

  const allKnownStudents = typeof window !== 'undefined'
    ? [...INITIAL_STUDENTS, ...getStoredStudents()]
    : INITIAL_STUDENTS;

  stored.forEach((i) => {
    if (
      (i.parentId && parentIdSet.has(String(i.parentId))) ||
      (i.studentId && childIdSets.has(String(i.studentId)))
    ) {
      list.push(i);
    }
  });

  allKnownStudents.forEach((st) => {
    if (childIdSets.has(st.id) || st.parents?.some((p) => parentIdSet.has(p.id))) {
      (st.interactions || []).forEach((i) => {
        list.push(i);
      });
    }
  });

  return deduplicateTimelineInteractions(list);
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
