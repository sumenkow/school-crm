import { FullTaskData } from '@/lib/data/mockData';

export type DirectionalTab = 'all' | 'assigned_to_me' | 'created_by_me';
export type TaskSortMode = 'priority' | 'date_asc' | 'created_desc';

export interface TasksKpiSummary {
  total: number;
  overdue: number;
  today: number;
  completed: number;
}

export interface UserContext {
  userId?: string;
  userName?: string;
  role?: string;
}

export interface TaskFilterCriteria {
  tab?: DirectionalTab;
  searchQuery?: string;
  priority?: 'all' | 'high' | 'medium' | 'low';
  dueDate?: 'all' | 'today' | 'overdue' | 'week';
  sortMode?: TaskSortMode;
  userContext?: UserContext;
}

export interface TaskDeadlineBadgeInfo {
  badge: string;
  badgeClass: string;
  timeText: string;
  accentBorder: string;
  isOverdue: boolean;
  isToday: boolean;
}

/**
 * Returns current ISO date formatted as YYYY-MM-DD.
 * Fully defensive against null/undefined or invalid Date inputs.
 */
export function getTodayIso(d?: Date | null): string {
  const target = (d instanceof Date && !isNaN(d.getTime())) ? d : new Date();
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates 4 dynamic KPI metrics from task list.
 * - total: all non-cancelled tasks
 * - overdue: non-done, non-cancelled tasks with past due date
 * - today: non-done, non-cancelled tasks with today's due date
 * - completed: all done tasks
 *
 * Fully defensive against:
 * - null/undefined array input
 * - sparse array holes or null/undefined items (T1.08)
 * - ISO timestamps with time component (T3.05)
 */
export function calculateTasksKpis(
  tasks: FullTaskData[],
  todayIso = getTodayIso()
): TasksKpiSummary {
  let total = 0;
  let overdue = 0;
  let today = 0;
  let completed = 0;

  if (!Array.isArray(tasks) || tasks.length === 0) {
    return { total: 0, overdue: 0, today: 0, completed: 0 };
  }

  const effectiveTodayIso = (typeof todayIso === 'string' && todayIso)
    ? todayIso.slice(0, 10)
    : getTodayIso();

  for (const t of tasks) {
    if (!t || typeof t !== 'object') continue;
    if (t.status === 'cancelled') continue;
    total++;

    if (t.status === 'done') {
      completed++;
      continue;
    }

    const taskDateIso = t.dueDate ? String(t.dueDate).slice(0, 10) : '';

    const isOverdue = Boolean(
      t.isOverdue ||
      (taskDateIso && taskDateIso < effectiveTodayIso) ||
      (typeof t.dueDateFormatted === 'string' && t.dueDateFormatted.toLowerCase().includes('просрочено'))
    );

    if (isOverdue) {
      overdue++;
      continue;
    }

    const isToday = Boolean(
      (taskDateIso && taskDateIso === effectiveTodayIso) ||
      (typeof t.dueDateFormatted === 'string' && t.dueDateFormatted.toLowerCase().includes('сегодня'))
    );

    if (isToday) {
      today++;
    }
  }

  return { total, overdue, today, completed };
}

/**
 * Deduplicates tasks by unique task.id while preserving order.
 * Defensive against null/undefined arrays and invalid items (T1.02, T1.06).
 */
export function deduplicateTasks(tasks: FullTaskData[]): FullTaskData[] {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return [];
  }
  const seen = new Set<string>();
  const result: FullTaskData[] = [];
  for (const task of tasks) {
    if (!task || typeof task !== 'object' || !task.id) continue;
    if (!seen.has(task.id)) {
      seen.add(task.id);
      result.push(task);
    }
  }
  return result;
}

/**
 * Filters tasks according to directional navigation tab:
 * - 'all': all non-cancelled tasks
 * - 'assigned_to_me': assigned to current user (ID prioritized over name)
 * - 'created_by_me': created by current user or owner (strictly isolated to owner session)
 *
 * Defensive against:
 * - null/undefined array input
 * - sparse array holes or null/undefined items (T1.09)
 * - null/undefined userContext
 */
export function filterTasksByDirection(
  tasks: FullTaskData[],
  tab: DirectionalTab = 'all',
  userContext: UserContext = {}
): FullTaskData[] {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return [];
  }

  const activeTasks = tasks.filter(
    (t) => Boolean(t) && typeof t === 'object' && t.status !== 'cancelled'
  );

  if (tab === 'all') {
    return activeTasks;
  }

  const ctx = userContext || {};
  const userName = (ctx.userName || '').trim().toLowerCase();
  const userId = (ctx.userId || '').trim();
  const userRole = (ctx.role || '').trim().toLowerCase();

  if (tab === 'assigned_to_me') {
    return activeTasks.filter((t) => {
      // 1. Primary match: explicit assignee user ID (prioritized over name to prevent identity collisions)
      if (userId && t.assignedToUserId) {
        return t.assignedToUserId === userId;
      }

      // 2. Name fallback when assignedToUserId is absent or userContext lacks userId
      const assigned = (t.assignedTo || '').trim().toLowerCase();
      if (userName && assigned === userName) return true;

      // 3. Fallback for default admin demo account when context is completely empty
      if (!userName && !userId && (assigned === 'андрей волков' || assigned.includes('волков'))) return true;
      return false;
    });
  }

  if (tab === 'created_by_me') {
    return activeTasks.filter((t) => {
      // 1. Primary match: creator user ID
      if (userId && t.createdByUserId === userId) return true;

      // 2. Secondary match: creator display name
      const createdByName = (t.createdByName || t.creator || '').trim().toLowerCase();
      if (userName && createdByName === userName) return true;

      // 3. Role-based match: strictly only if CURRENT user has owner role (T4.07)
      if (userRole === 'owner' && (t.createdByRole === 'owner' || (t.title && t.title.toLowerCase().includes('поруч')))) return true;

      return false;
    });
  }

  return activeTasks;
}

/**
 * Filters tasks by multi-criteria: tab, priority, dueDate, search query.
 * Defensive against:
 * - null/undefined array input
 * - sparse array holes or null/undefined items (T1.10)
 * - null/undefined filters object
 * - ISO timestamps with time component in due dates
 */
export function filterTasksByCriteria(
  tasks: FullTaskData[],
  filters: TaskFilterCriteria = {},
  todayIso = getTodayIso()
): FullTaskData[] {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return [];
  }

  const effectiveTodayIso = (typeof todayIso === 'string' && todayIso)
    ? todayIso.slice(0, 10)
    : getTodayIso();

  const f = filters || {};

  let list = tasks.filter(
    (t) => Boolean(t) && typeof t === 'object' && t.status !== 'cancelled'
  );

  // Directional tab
  if (f.tab && f.tab !== 'all') {
    list = filterTasksByDirection(list, f.tab, f.userContext);
  }

  // Priority
  if (f.priority && f.priority !== 'all') {
    list = list.filter((t) => t.priority === f.priority);
  }

  // Due Date
  if (f.dueDate && f.dueDate !== 'all') {
    if (f.dueDate === 'today') {
      list = list.filter((t) => {
        if (t.status === 'done') return false;
        const taskDateIso = t.dueDate ? String(t.dueDate).slice(0, 10) : '';
        return (
          taskDateIso === effectiveTodayIso ||
          Boolean(typeof t.dueDateFormatted === 'string' && t.dueDateFormatted.toLowerCase().includes('сегодня'))
        );
      });
    } else if (f.dueDate === 'overdue') {
      list = list.filter((t) => {
        if (t.status === 'done') return false;
        const taskDateIso = t.dueDate ? String(t.dueDate).slice(0, 10) : '';
        return Boolean(
          t.isOverdue ||
          (taskDateIso && taskDateIso < effectiveTodayIso) ||
          (typeof t.dueDateFormatted === 'string' && t.dueDateFormatted.toLowerCase().includes('просрочено'))
        );
      });
    } else if (f.dueDate === 'week') {
      const curr = new Date(effectiveTodayIso + 'T00:00:00');
      const nextWeek = new Date(curr);
      nextWeek.setDate(curr.getDate() + 7);
      const nextWeekIso = getTodayIso(nextWeek);

      list = list.filter((t) => {
        if (!t.dueDate) return false;
        const taskDateIso = String(t.dueDate).slice(0, 10);
        return taskDateIso >= effectiveTodayIso && taskDateIso <= nextWeekIso;
      });
    }
  }

  // Search
  if (f.searchQuery && f.searchQuery.trim()) {
    const q = f.searchQuery.trim().toLowerCase();
    list = list.filter((t) => {
      return (
        (typeof t.title === 'string' && t.title.toLowerCase().includes(q)) ||
        (typeof t.description === 'string' && t.description.toLowerCase().includes(q)) ||
        (typeof t.studentName === 'string' && t.studentName.toLowerCase().includes(q)) ||
        (typeof t.parentName === 'string' && t.parentName.toLowerCase().includes(q)) ||
        (typeof t.leadName === 'string' && t.leadName.toLowerCase().includes(q)) ||
        (typeof t.assignedTo === 'string' && t.assignedTo.toLowerCase().includes(q)) ||
        (typeof t.createdByName === 'string' && t.createdByName.toLowerCase().includes(q)) ||
        (typeof t.creator === 'string' && t.creator.toLowerCase().includes(q)) ||
        (typeof t.tag === 'string' && t.tag.toLowerCase().includes(q)) ||
        (typeof t.subTag === 'string' && t.subTag.toLowerCase().includes(q)) ||
        (typeof t.taskType === 'string' && t.taskType.toLowerCase().includes(q))
      );
    });
  }

  return list;
}

/**
 * Sorts tasks by priority (high > medium > low), date_asc, or created_desc.
 * Defensive against null/undefined arrays, malformed items, and mutations.
 */
export function sortTasks(
  tasks: FullTaskData[],
  mode: TaskSortMode = 'priority',
  todayIso = getTodayIso()
): FullTaskData[] {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return [];
  }

  // Strip nullish items and create shallow copy for immutability
  const list = tasks.filter((t) => Boolean(t) && typeof t === 'object');
  if (list.length <= 1) {
    return list;
  }

  const effectiveTodayIso = (typeof todayIso === 'string' && todayIso)
    ? todayIso.slice(0, 10)
    : getTodayIso();

  if (mode === 'priority') {
    const priorityMap: Record<string, number> = {
      high: 1,
      medium: 2,
      low: 3,
    };

    return list.sort((a, b) => {
      const aDone = a.status === 'done' ? 1 : 0;
      const bDone = b.status === 'done' ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;

      const aDateIso = a.dueDate ? String(a.dueDate).slice(0, 10) : '';
      const bDateIso = b.dueDate ? String(b.dueDate).slice(0, 10) : '';

      const aOverdue = Boolean(a.isOverdue || (aDateIso && aDateIso < effectiveTodayIso)) ? 0 : 1;
      const bOverdue = Boolean(b.isOverdue || (bDateIso && bDateIso < effectiveTodayIso)) ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;

      const pa = priorityMap[a.priority || 'medium'] || 4;
      const pb = priorityMap[b.priority || 'medium'] || 4;
      if (pa !== pb) return pa - pb;

      return (a.dueDate || '').localeCompare(b.dueDate || '');
    });
  }

  if (mode === 'date_asc') {
    return list.sort((a, b) => {
      const da = a.dueDate || '9999-99-99';
      const db = b.dueDate || '9999-99-99';
      return da.localeCompare(db);
    });
  }

  if (mode === 'created_desc') {
    return list.sort((a, b) => {
      return (b.id || '').localeCompare(a.id || '');
    });
  }

  return list;
}

/**
 * Orchestrates deduplication, filtering, and sorting in a single deterministic pipeline.
 */
export function filterAndSortTasks(
  tasks: FullTaskData[],
  criteria: TaskFilterCriteria = {},
  todayIso = getTodayIso()
): FullTaskData[] {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return [];
  }
  const crit = criteria || {};
  const deduped = deduplicateTasks(tasks);
  const filtered = filterTasksByCriteria(deduped, crit, todayIso);
  return sortTasks(filtered, crit.sortMode || 'priority', todayIso);
}

/**
 * Resolves visual badge and border classes for task due date.
 * Fully defensive against null/undefined task and malformed dates.
 */
export function getCardDateDisplay(
  task: FullTaskData,
  todayIso = getTodayIso()
): TaskDeadlineBadgeInfo {
  if (!task || typeof task !== 'object') {
    return {
      badge: 'В плане',
      badgeClass: 'bg-slate-100 text-slate-700',
      timeText: '',
      accentBorder: 'border-l-4 border-l-transparent',
      isOverdue: false,
      isToday: false,
    };
  }

  const effectiveTodayIso = (typeof todayIso === 'string' && todayIso)
    ? todayIso.slice(0, 10)
    : getTodayIso();

  if (task.status === 'done') {
    let formattedDoneDate = 'Выполнено';
    if (task.completedAt) {
      const d = new Date(task.completedAt);
      if (!isNaN(d.getTime())) {
        formattedDoneDate = d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
      }
    }
    return {
      badge: 'Выполнено',
      badgeClass: 'bg-emerald-100 text-emerald-700',
      timeText: formattedDoneDate,
      accentBorder: 'border-l-4 border-l-transparent',
      isOverdue: false,
      isToday: false,
    };
  }

  const taskDateIso = task.dueDate ? String(task.dueDate).slice(0, 10) : '';

  const isOverdue = Boolean(
    task.isOverdue ||
    (taskDateIso && taskDateIso < effectiveTodayIso) ||
    task.dueDateFormatted?.toLowerCase().includes('просрочено')
  );

  const isToday = Boolean(
    (taskDateIso && taskDateIso === effectiveTodayIso) ||
    (task.dueDateFormatted && task.dueDateFormatted.toLowerCase().includes('сегодня'))
  );

  let timeStr = '';
  if (task.dueDateFormatted) {
    const m = task.dueDateFormatted.match(/(до\s+\d{1,2}:\d{2}|\b\d{1,2}:\d{2}\b)/);
    if (m) timeStr = m[0];
  }

  if (isOverdue) {
    let sub = 'Вчера';
    if (taskDateIso) {
      const parts = taskDateIso.split('-');
      if (parts.length === 3) sub = `${parts[2]}.${parts[1]}`;
    }
    return {
      badge: 'Просрочено',
      badgeClass: 'bg-rose-100 text-rose-700',
      timeText: sub,
      accentBorder: 'border-l-4 border-l-rose-500',
      isOverdue: true,
      isToday: false,
    };
  }

  if (isToday) {
    return {
      badge: 'Сегодня',
      badgeClass: 'bg-amber-100 text-amber-800',
      timeText: timeStr || 'до 18:00',
      accentBorder: 'border-l-4 border-l-amber-400',
      isOverdue: false,
      isToday: true,
    };
  }

  let dateBadge = '';
  if (taskDateIso) {
    const dt = new Date(taskDateIso + 'T00:00:00');
    if (!isNaN(dt.getTime())) {
      dateBadge = dt.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
    }
  }

  return {
    badge: dateBadge || 'В плане',
    badgeClass: 'bg-slate-100 text-slate-700',
    timeText: timeStr || (task.dueDateFormatted?.match(/\b\d{1,2}:\d{2}\b/)?.[0] || ''),
    accentBorder: 'border-l-4 border-l-transparent',
    isOverdue: false,
    isToday: false,
  };
}

/**
 * Returns consistent Category badge styling matching brand guidelines.
 * Safe against non-string category inputs.
 */
export function getCategoryBadgeStyle(category?: string): string {
  const cat = typeof category === 'string' ? category.toLowerCase() : '';
  if (cat.includes('продаж') || cat.includes('сделк')) {
    return 'bg-purple-50 text-purple-700 border-purple-200/60';
  }
  if (cat.includes('финанс') || cat.includes('оплат')) {
    return 'bg-amber-50 text-amber-700 border-amber-200/60';
  }
  if (cat.includes('расписан')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
  }
  if (cat.includes('документ')) {
    return 'bg-blue-50 text-blue-700 border-blue-200/60';
  }
  if (cat.includes('учеб') || cat.includes('орг')) {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200/60';
  }
  if (cat.includes('retention') || cat.includes('забот')) {
    return 'bg-rose-50 text-rose-700 border-rose-200/60';
  }
  return 'bg-slate-100 text-slate-700 border-slate-200/60';
}

/**
 * Extracts initials for user avatars.
 * Safe against empty, whitespace, and non-string values.
 */
export function getInitials(name?: string): string {
  if (!name || typeof name !== 'string') return 'АВ';
  const trimmed = name.trim();
  if (!trimmed) return 'АВ';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2 && parts[0][0] && parts[1][0]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}
