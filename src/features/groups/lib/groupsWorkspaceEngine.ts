import { FullGroupData, FullLessonData } from '@/lib/data/mockData';

export interface GroupPresentationItem {
  id: string;
  name: string;
  courseId: string;
  courseName: string;
  courseCategory: string;
  courseColorIndicator: string;
  teacherId: string;
  teacherName: string;
  schedule: string;
  scheduleBadges: Array<{ day: string; time: string }>;
  room: string;
  capacity: number;
  enrolledCount: number;
  freeSpots: number;
  freeSpotsLabel: string;
  occupancyPercent: number;
  isFull: boolean;
  status: 'active' | 'recruiting' | 'paused' | 'finished' | 'archived';
  statusBadge: { label: string; bg: string; text: string; border: string };
  isDeleted: boolean;
  nextLesson: {
    id: string;
    date: string;
    dateFormatted: string;
    dayOfWeekLabel: string;
    timeFormatted: string;
    topic?: string;
  } | null;
  href: string;
}

export type GroupSortOption = 'schedule' | 'name' | 'occupancy';

export interface GroupWorkspaceFilterParams {
  groups: FullGroupData[];
  allLessons?: FullLessonData[];
  tab?: 'all' | 'deleted';
  searchQuery?: string;
  courseFilter?: string;
  teacherFilter?: string;
  statusFilter?: string;
  sortBy?: GroupSortOption;
  nowMs?: number;
}

export interface GroupCapacityResult {
  capacity: number;
  enrolledCount: number;
  freeSpots: number;
  occupancyPercent: number;
  isFull: boolean;
  freeSpotsLabel: string;
}

/**
 * Format Russian pluralization for free spots
 */
export function formatFreeSpots(count: number): string {
  if (count <= 0) return 'Мест нет';
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `Свободно: ${count} мест`;
  if (mod10 === 1) return `Свободно: ${count} место`;
  if (mod10 >= 2 && mod10 <= 4) return `Свободно: ${count} места`;
  return `Свободно: ${count} мест`;
}

/**
 * Calculate capacity, enrolled count, free spots and occupancy for a group
 */
export function calculateGroupCapacity(group: FullGroupData): GroupCapacityResult {
  const capacity = group.capacity || (group as any).max_students || (group as any).maxStudents || 8;
  const enrolledCount = Array.isArray(group.students) ? group.students.length : 0;
  const freeSpots = Math.max(0, capacity - enrolledCount);
  const occupancyPercent = capacity > 0 ? Math.min(100, Math.round((enrolledCount / capacity) * 100)) : 0;
  const isFull = freeSpots === 0 || occupancyPercent >= 100;
  const freeSpotsLabel = formatFreeSpots(freeSpots);

  return {
    capacity,
    enrolledCount,
    freeSpots,
    occupancyPercent,
    isFull,
    freeSpotsLabel,
  };
}

/**
 * Parse a lesson date and time string into epoch milliseconds
 */
export function parseLessonDateMs(lesson: FullLessonData): number {
  if (!lesson.date) return 0;
  let isoDate = lesson.date;
  if (lesson.date.includes('.')) {
    const parts = lesson.date.split('.');
    if (parts.length === 3) {
      isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  const time = lesson.startTime && lesson.startTime.length >= 4 ? lesson.startTime : '00:00';
  const isoTime = time.length === 5 ? `${time}:00` : time;
  const parsed = new Date(`${isoDate}T${isoTime}`).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

const RU_DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/**
 * Determine the earliest upcoming lesson for a group
 */
export function getNextLessonForGroup(
  groupId: string,
  groupName: string,
  allLessons: FullLessonData[] = [],
  nowMs: number = Date.now()
): GroupPresentationItem['nextLesson'] {
  if (!allLessons || allLessons.length === 0) return null;

  const candidates = allLessons.filter((l) => {
    if (l.status === 'cancelled' || l.status === 'completed') return false;
    const cleanLGroupName = (l.groupName || '').split(' (')[0].trim();
    const cleanGName = (groupName || '').split(' (')[0].trim();
    const matchesGroup =
      (l.groupId && l.groupId === groupId) ||
      (cleanLGroupName && cleanGName && cleanLGroupName === cleanGName);

    if (!matchesGroup) return false;
    const lessonMs = parseLessonDateMs(l);
    return lessonMs > nowMs;
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => parseLessonDateMs(a) - parseLessonDateMs(b));
  const next = candidates[0];

  let dateFormatted = next.date;
  let dayOfWeekLabel = '';
  if (next.date.includes('-')) {
    const [y, m, d] = next.date.split('-');
    dateFormatted = `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`;
    const dt = new Date(`${next.date}T12:00:00`);
    if (!isNaN(dt.getTime())) {
      dayOfWeekLabel = RU_DAYS[dt.getDay()] || '';
    }
  } else if (next.date.includes('.')) {
    const [d, m, y] = next.date.split('.');
    dateFormatted = `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`;
    const dt = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00`);
    if (!isNaN(dt.getTime())) {
      dayOfWeekLabel = RU_DAYS[dt.getDay()] || '';
    }
  } else if (next.dateFormatted) {
    dateFormatted = next.dateFormatted;
  }

  const timeFormatted = next.startTime || '18:00';

  return {
    id: next.id,
    date: next.date,
    dateFormatted,
    dayOfWeekLabel,
    timeFormatted,
    topic: next.topic,
  };
}

/**
 * Return brand color indicator for course category
 */
export function getCourseSubjectColor(courseName: string = '', category: string = ''): string {
  const text = `${courseName} ${category}`.toLowerCase();
  if (text.includes('англ') || text.includes('english') || text.includes('язык')) {
    return '#2563EB'; // Blue
  }
  if (text.includes('робот') || text.includes('robot') || text.includes('it') || text.includes('програм')) {
    return '#8B5CF6'; // Purple
  }
  if (text.includes('матем') || text.includes('math') || text.includes('алгебр') || text.includes('логик')) {
    return '#F59E0B'; // Amber
  }
  if (text.includes('наук') || text.includes('science') || text.includes('биолог') || text.includes('физик')) {
    return '#10B981'; // Emerald
  }
  return '#3B82F6'; // Default brand blue
}

/**
 * Parse human schedule string into day badges
 */
export function parseScheduleBadges(scheduleStr: string = ''): Array<{ day: string; time: string }> {
  if (!scheduleStr) return [];
  // Example: "Пн, Чт • 17:00–18:30" or "Сб, Вс • 11:00–12:30"
  if (scheduleStr.includes('•')) {
    const [daysPart, timePart] = scheduleStr.split('•').map((s) => s.trim());
    const days = daysPart.split(',').map((d) => d.trim());
    return days.map((d) => ({ day: d, time: timePart || '' }));
  }
  return [{ day: scheduleStr, time: '' }];
}

/**
 * Compute status badge styles
 */
export function getStatusBadge(status: string, isDeleted: boolean) {
  if (isDeleted) {
    return {
      label: 'Удалена',
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-200',
    };
  }
  if (status === 'active') {
    return {
      label: 'Активна',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
    };
  }
  if (status === 'recruiting') {
    return {
      label: 'Идет набор',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
    };
  }
  if (status === 'paused') {
    return {
      label: 'Пауза',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
    };
  }
  if (status === 'finished') {
    return {
      label: 'Завершена',
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-200',
    };
  }
  if (status === 'archived') {
    return {
      label: 'Архив',
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-200',
    };
  }
  return {
    label: 'Активна',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  };
}

/**
 * Filter and sort groups pure engine
 */
export function filterAndSortGroups(params: GroupWorkspaceFilterParams): GroupPresentationItem[] {
  const {
    groups = [],
    allLessons = [],
    tab = 'all',
    searchQuery = '',
    courseFilter = 'all',
    teacherFilter = 'all',
    statusFilter = 'all',
    sortBy = 'schedule',
    nowMs = Date.now(),
  } = params;

  // 1. Tab partitioning (All vs Deleted)
  const tabFiltered = groups.filter((g) => {
    const isDel = Boolean(g.isDeleted || (g as any).is_deleted);
    return tab === 'deleted' ? isDel : !isDel;
  });

  // 2. Search query filter
  const query = searchQuery.trim().toLowerCase();
  const searchFiltered = tabFiltered.filter((g) => {
    if (!query) return true;
    const nameMatch = (g.name || '').toLowerCase().includes(query);
    const courseMatch = (g.courseName || '').toLowerCase().includes(query);
    const teacherMatch = (g.teacherName || '').toLowerCase().includes(query);
    return nameMatch || courseMatch || teacherMatch;
  });

  // 3. Dropdown filters (course, teacher, status)
  const dropdownFiltered = searchFiltered.filter((g) => {
    if (courseFilter !== 'all' && g.courseName !== courseFilter && g.courseId !== courseFilter) {
      return false;
    }
    if (teacherFilter !== 'all' && g.teacherName !== teacherFilter && g.teacherId !== teacherFilter) {
      return false;
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'finished') {
        if (g.status !== 'finished' && g.status !== 'archived') {
          return false;
        }
      } else if (g.status !== statusFilter) {
        return false;
      }
    }
    return true;
  });

  // 4. Map to presentation items with full computed invariants
  const presentationItems: GroupPresentationItem[] = dropdownFiltered.map((group) => {
    const cap = calculateGroupCapacity(group);
    const isDel = Boolean(group.isDeleted || (group as any).is_deleted);
    const status = (group.status || 'active') as GroupPresentationItem['status'];
    const statusBadge = getStatusBadge(status, isDel);
    const nextLesson = getNextLessonForGroup(group.id, group.name, allLessons, nowMs);
    const courseColorIndicator = getCourseSubjectColor(group.courseName);
    const scheduleBadges = parseScheduleBadges(group.schedule);

    return {
      id: group.id,
      name: group.name,
      courseId: group.courseId || '',
      courseName: group.courseName || 'Основной курс',
      courseCategory: group.courseName || 'Основной курс',
      courseColorIndicator,
      teacherId: group.teacherId || '',
      teacherName: group.teacherName || 'Преподаватель не назначен',
      schedule: group.schedule || 'Расписание уточняется',
      scheduleBadges,
      room: group.room || 'Онлайн (Zoom)',
      capacity: cap.capacity,
      enrolledCount: cap.enrolledCount,
      freeSpots: cap.freeSpots,
      freeSpotsLabel: cap.freeSpotsLabel,
      occupancyPercent: cap.occupancyPercent,
      isFull: cap.isFull,
      status,
      statusBadge,
      isDeleted: isDel,
      nextLesson,
      href: `/groups/${group.id}`,
    };
  });

  // 5. Sorting
  presentationItems.sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name, 'ru');
    }
    if (sortBy === 'occupancy') {
      return b.occupancyPercent - a.occupancyPercent;
    }
    // 'schedule' sort: earliest nextLesson first; if none, sort alphabetically
    if (sortBy === 'schedule') {
      const aTime = a.nextLesson ? parseLessonDateMs(a.nextLesson as any) : Number.MAX_SAFE_INTEGER;
      const bTime = b.nextLesson ? parseLessonDateMs(b.nextLesson as any) : Number.MAX_SAFE_INTEGER;
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      return a.name.localeCompare(b.name, 'ru');
    }
    return 0;
  });

  return presentationItems;
}
