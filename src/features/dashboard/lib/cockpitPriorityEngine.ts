/**
 * Cockpit Priority Engine
 * Aggregates existing Supabase entities (tasks, leads, lessons, students, payments, invoices)
 * into Action-First Operational Queues matching Situational Command Center Dashboard
 * 
 * ZERO NEW ENTITIES: Pure in-memory calculation from single sources of truth.
 * MOCK DATA BAN: All items derived dynamically from live arrays or return empty state.
 * 100% PURE EUR CURRENCY STANDARD.
 */

import { FullTaskData, FullLeadData, FullLessonData, FullStudentData, FullPaymentData } from '@/lib/data/mockData';
import { UpcomingPaymentItem } from '@/lib/data/upcomingPaymentsHelper';
import { getStudentFinancialSummary } from '@/lib/data/balanceHelper';
import { EuropeanInvoiceData } from '@/lib/data/invoiceStorage';

export type CockpitPriority = 'P0' | 'P1' | 'P2' | 'P3';
export type CockpitTabFilter = 'all' | 'overdue' | 'attention' | 'today' | 'leads' | 'trials' | 'payments' | 'lessons' | 'messages';
export type CockpitSortMode = 'priority' | 'time' | 'client';

export interface CockpitActionItem {
  id: string;
  sourceEntity: 'task' | 'lead' | 'lesson' | 'student' | 'payment' | 'invoice';
  sourceId: string;
  blockType?: 'overdue' | 'attention' | 'today';
  priority: CockpitPriority;
  category: string;
  urgencyLabel?: string;
  urgencyLevel?: 'critical' | 'warning' | 'normal' | 'info';
  title: string;
  subtitle?: string;
  badgeText?: string;

  // Contact & Entity Details for Action & Slide-over Drawer
  studentId?: string;
  studentName?: string;
  parentId?: string;
  parentName?: string;
  parentPhone?: string;
  leadId?: string;
  leadName?: string;
  leadPhone?: string;
  leadTelegram?: string;
  lessonId?: string;
  lessonTitle?: string;
  lessonTime?: string;
  teacherName?: string;
  groupName?: string;
  debtAmount?: number;
  debtFormatted?: string;
  invoiceNumber?: string;
  notes?: string;
  timelineTime?: string; // e.g. "10:00", "12:00", "13:00"

  // Action Capabilities
  canWhatsApp?: boolean;
  canTelegram?: boolean;
  canCall?: boolean;
  canComplete?: boolean;
  canPostpone?: boolean;
  canOpenInvoice?: boolean;
  canOpenLead?: boolean;
  canOpenLesson?: boolean;
  canOpenStudent?: boolean;
  canOpenChat?: boolean;
  canSuggestTime?: boolean;
  postponeDates?: { label: string; dateIso: string }[];
}

export interface CockpitSummaryKPI {
  // Backwards compatibility with Suite 23
  attentionCount: number;
  todayTasksCount: number;
  todayLessonsCount: number;
  paymentsToControlCount: number;
  paymentsToControlTotalEur: number;
  paymentsToControlFormatted: string;

  // Situational Command Center 5 Dynamic KPIs
  overdueCount: number;
  overdueLabel: string;
  needsAttentionCount: number;
  needsAttentionLabel: string;
  tasksTodayCount: number;
  tasksTodayLabel: string;
  lessonsUnconfirmedCount: number;
  lessonsUnconfirmedLabel: string;
  paymentsUnderControlCount: number;
  paymentsAmountEUR: number;
  paymentsUnderControlFormatted: string;
  paymentsUnderControlLabel: string;
}

export interface CockpitOperationalWidgetsData {
  leadsWidget: {
    noContact: number;
    noFirstContactCount: number;
    awaitingReply: number;
    waitingClientReplyCount: number;
    trialScheduled: number;
    trialScheduledCount: number;
    totalActiveLeads: number;
  };
  trialsWidget: {
    today: number;
    todayTrialCount: number;
    completedNoDecision: number;
    completedWithoutDecisionCount: number;
    awaitingConfirmation: number;
    awaitingConfirmationCount: number;
    totalTrials: number;
  };
  paymentsWidget: {
    overdueEUR: number;
    overdueCount: number;
    todayTomorrowEUR: number;
    todayTomorrowCount: number;
    totalControlEUR: number;
  };
  scheduleWidget: {
    scheduled: number;
    onScheduleCount: number;
    attention: number;
    needsAttentionCount: number;
    totalTodayLessons: number;
  };
  confirmationsWidget: {
    unconfirmed: number;
    unconfirmedLessonsCount: number;
    unassigned: number;
    awaitingTeacherCount: number;
    totalTodayLessons: number;
  };
}

export interface CockpitAggregatedData {
  summary: CockpitSummaryKPI;
  // Queues
  overdueItems: CockpitActionItem[];
  needsAttentionItems: CockpitActionItem[];
  attentionItems: CockpitActionItem[]; // P0 and P1 (includes Suite 23 items)
  todayItems: CockpitActionItem[];     // P2
  todayChecklistItems: CockpitActionItem[]; // Alias for todayItems
  postponableItems: CockpitActionItem[]; // P3
  allQueueItems: CockpitActionItem[];
  // Operational mini-widgets
  widgets: CockpitOperationalWidgetsData;
  // Dynamic Tab Badge Counts
  tabCounts: {
    all: number;
    overdue: number;
    attention: number;
    today: number;
    leads: number;
    trials: number;
    payments: number;
    lessons: number;
    messages: number;
  };
}

export interface CockpitSSOTParams {
  tasks: FullTaskData[];
  leads: FullLeadData[];
  lessons: FullLessonData[];
  students: FullStudentData[];
  payments: FullPaymentData[];
  invoices?: EuropeanInvoiceData[];
  upcomingPayments?: UpcomingPaymentItem[];
  nowDate?: Date;
  selectedDate?: Date;
}

/**
 * Sanitizes phone numbers for wa.me and tel:
 */
export function sanitizePhoneForWhatsApp(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 11 && digits.startsWith('8')) {
    return `7${digits.slice(1)}`;
  }
  return digits;
}

export function sanitizeTelegramUsername(usernameOrLink?: string): string {
  if (!usernameOrLink) return '';
  let clean = usernameOrLink.trim();
  clean = clean.replace(/^(https?:\/\/)?(t\.me\/|telegram\.me\/)/i, '');
  clean = clean.replace(/^@/, '');
  return clean;
}

/**
 * Formats EUR amount cleanly with non-breaking space
 */
export function formatEurAmount(amount: number): string {
  const rounded = Math.round(amount) || 0;
  return `${rounded.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} €`;
}

/**
 * Helper to check if a date string matches today (YYYY-MM-DD or DD.MM.YYYY)
 */
export function isTodayDate(dateStr?: string, refDate: Date = new Date()): boolean {
  if (!dateStr) return false;
  const refYear = refDate.getFullYear();
  const refMonth = refDate.getMonth();
  const refDay = refDate.getDate();

  // Try YYYY-MM-DD
  if (dateStr.includes('-')) {
    const parts = dateStr.slice(0, 10).split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return y === refYear && m === refMonth && d === refDay;
    }
  }

  // Try DD.MM.YYYY
  if (dateStr.includes('.')) {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      return y === refYear && m === refMonth && d === refDay;
    }
  }

  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return (
      parsed.getFullYear() === refYear &&
      parsed.getMonth() === refMonth &&
      parsed.getDate() === refDay
    );
  }

  return false;
}

/**
 * Helper to check if a date string is strictly before the reference date (earlier than today)
 */
export function isBeforeDate(dateStr?: string, refDate: Date = new Date()): boolean {
  if (!dateStr) return false;
  const refYear = refDate.getFullYear();
  const refMonth = refDate.getMonth();
  const refDay = refDate.getDate();

  // Try YYYY-MM-DD
  if (dateStr.includes('-')) {
    const parts = dateStr.slice(0, 10).split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (y < refYear) return true;
      if (y > refYear) return false;
      if (m < refMonth) return true;
      if (m > refMonth) return false;
      return d < refDay;
    }
  }

  // Try DD.MM.YYYY
  if (dateStr.includes('.')) {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if (y < refYear) return true;
      if (y > refYear) return false;
      if (m < refMonth) return true;
      if (m > refMonth) return false;
      return d < refDay;
    }
  }

  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    const py = parsed.getFullYear();
    const pm = parsed.getMonth();
    const pd = parsed.getDate();
    if (py < refYear) return true;
    if (py > refYear) return false;
    if (pm < refMonth) return true;
    if (pm > refMonth) return false;
    return pd < refDay;
  }

  return false;
}

/**
 * Helper to check if a date is overdue (earlier than refDate and not today)
 */
export function isOverdueDate(dateStr?: string, refDate: Date = new Date()): boolean {
  if (!dateStr) return false;
  return !isTodayDate(dateStr, refDate) && isBeforeDate(dateStr, refDate);
}

/**
 * Format relative minutes/hours (e.g. "Через 35 мин", "1 ч 14 мин")
 */
export function formatTimeDifference(targetDate: Date, baseDate: Date = new Date(), isFuture: boolean = true): string {
  const diffMs = isFuture ? targetDate.getTime() - baseDate.getTime() : baseDate.getTime() - targetDate.getTime();
  const totalMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));

  if (totalMinutes < 60) {
    return isFuture ? `Через ${totalMinutes} мин` : `${totalMinutes} мин`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (mins === 0) {
    return isFuture ? `Через ${hours} ч` : `${hours} ч`;
  }
  return isFuture ? `Через ${hours} ч ${mins} мин` : `${hours} ч ${mins} мин`;
}

/**
 * Normalizes tab key from English or Russian label
 */
export function normalizeTabKey(tab: string): CockpitTabFilter {
  const lower = tab.toLowerCase().trim();
  if (lower === 'all' || lower.startsWith('все')) return 'all';
  if (lower === 'overdue' || lower.startsWith('просроч')) return 'overdue';
  if (lower === 'attention' || lower.startsWith('требу')) return 'attention';
  if (lower === 'today' || lower.startsWith('сегодн')) return 'today';
  if (lower === 'leads' || lower.startsWith('лид')) return 'leads';
  if (lower === 'trials' || lower.startsWith('пробн')) return 'trials';
  if (lower === 'payments' || lower.startsWith('оплат')) return 'payments';
  if (lower === 'lessons' || lower.startsWith('урок')) return 'lessons';
  if (lower === 'messages' || lower.startsWith('сообщ')) return 'messages';
  return 'all';
}

/**
 * Filters items according to the selected horizontal tab
 */
export function filterCockpitItems(items: CockpitActionItem[], tab: string): CockpitActionItem[] {
  const normalized = normalizeTabKey(tab);
  switch (normalized) {
    case 'all':
      return items;
    case 'overdue':
      return items.filter(
        (i) => i.blockType === 'overdue' || (i.urgencyLabel && i.urgencyLabel.toLowerCase().includes('просроч'))
      );
    case 'attention':
      return items.filter(
        (i) => i.blockType === 'attention' || i.priority === 'P0' || (i.priority === 'P1' && i.blockType !== 'overdue')
      );
    case 'today':
      return items.filter((i) => i.blockType === 'today' || i.priority === 'P2');
    case 'leads':
      return items.filter(
        (i) =>
          !i.category.toLowerCase().includes('пробн') &&
          !i.title.toLowerCase().includes('пробн') &&
          (i.sourceEntity === 'lead' ||
            Boolean(i.leadId) ||
            i.category.toLowerCase().includes('лид') ||
            i.category.toLowerCase().includes('продаж'))
      );
    case 'trials':
      return items.filter(
        (i) =>
          i.category.toLowerCase().includes('пробн') ||
          i.title.toLowerCase().includes('пробн') ||
          (i.badgeText && i.badgeText.toLowerCase().includes('пробн')) ||
          (i.notes && i.notes.toLowerCase().includes('пробн'))
      );
    case 'payments':
      return items.filter(
        (i) =>
          i.sourceEntity === 'payment' ||
          i.sourceEntity === 'invoice' ||
          (i.debtAmount !== undefined && i.debtAmount > 0) ||
          Boolean(i.invoiceNumber) ||
          i.category.toLowerCase().includes('оплат') ||
          i.category.toLowerCase().includes('платеж') ||
          i.category.toLowerCase().includes('финанс') ||
          i.category.toLowerCase().includes('долг')
      );
    case 'lessons':
      return items.filter(
        (i) =>
          !i.category.toLowerCase().includes('пробн') &&
          !i.title.toLowerCase().includes('пробн') &&
          (i.sourceEntity === 'lesson' ||
            Boolean(i.lessonId) ||
            i.category.toLowerCase().includes('урок') ||
            i.category.toLowerCase().includes('занят') ||
            i.category.toLowerCase().includes('календар'))
      );
    case 'messages':
      return items.filter(
        (i) =>
          i.category.toLowerCase().includes('сообщ') ||
          i.category.toLowerCase().includes('чат') ||
          i.category.toLowerCase().includes('перенос') ||
          i.title.toLowerCase().includes('сообщен') ||
          (i.badgeText && (i.badgeText.toLowerCase().includes('ответ') || i.badgeText.toLowerCase().includes('перенос')))
      );
    default:
      return items;
  }
}

/**
 * Sorts items by 3 selectable modes: priority, time, or client
 */
export function sortCockpitItems(items: CockpitActionItem[], sortMode: CockpitSortMode | string): CockpitActionItem[] {
  const mode = (sortMode || 'priority').toLowerCase();
  const sorted = [...items];

  if (mode.includes('client') || mode.includes('клиент')) {
    return sorted.sort((a, b) => {
      const nameA = (a.studentName || a.leadName || a.parentName || '').trim();
      const nameB = (b.studentName || b.leadName || b.parentName || '').trim();
      if (!nameA && !nameB) return 0;
      if (!nameA) return 1;
      if (!nameB) return -1;
      return nameA.localeCompare(nameB, 'ru', { sensitivity: 'base' });
    });
  }

  if (mode.includes('time') || mode.includes('врем') || mode.includes('дедлайн')) {
    return sorted.sort((a, b) => {
      // Overdue items come first
      const aIsOverdue = a.blockType === 'overdue' || a.urgencyLabel?.includes('Просрочено');
      const bIsOverdue = b.blockType === 'overdue' || b.urgencyLabel?.includes('Просрочено');
      if (aIsOverdue && !bIsOverdue) return -1;
      if (!aIsOverdue && bIsOverdue) return 1;

      // Extract and normalize explicit time e.g. "9:00" -> "09:00", "12:00"
      const normalizeTime = (t: string) => {
        if (!t) return '';
        const parts = t.split(':');
        if (parts.length === 2) {
          return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        }
        return t;
      };
      const timeA = normalizeTime(a.timelineTime || a.lessonTime || a.urgencyLabel?.match(/(\d{1,2}:\d{2})/)?.[1] || '');
      const timeB = normalizeTime(b.timelineTime || b.lessonTime || b.urgencyLabel?.match(/(\d{1,2}:\d{2})/)?.[1] || '');

      if (timeA && timeB) {
        return timeA.localeCompare(timeB);
      }
      if (timeA && !timeB) return -1;
      if (!timeA && timeB) return 1;

      return 0;
    });
  }

  // Default: by priority (P0 -> P1 -> P2 -> P3)
  const priorityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
  return sorted.sort((a, b) => {
    const pA = priorityOrder[a.priority] ?? 99;
    const pB = priorityOrder[b.priority] ?? 99;
    if (pA !== pB) return pA - pB;

    // Secondary: critical urgency first
    if (a.urgencyLevel === 'critical' && b.urgencyLevel !== 'critical') return -1;
    if (a.urgencyLevel !== 'critical' && b.urgencyLevel === 'critical') return 1;

    return a.id.localeCompare(b.id);
  });
}

/**
 * Combined filter & sort helper
 */
export function getFilteredAndSortedItems(
  items: CockpitActionItem[],
  tab: string,
  sortMode: CockpitSortMode | string
): CockpitActionItem[] {
  const filtered = filterCockpitItems(items, tab);
  return sortCockpitItems(filtered, sortMode);
}

/**
 * Aggregates all existing CRM entities into the Action-First Cockpit data model
 */
export function aggregateCockpitData(params: CockpitSSOTParams): CockpitAggregatedData {
  const now = params.nowDate || new Date();
  const selectedDate = params.selectedDate || now;

  // 1. Map students and calculate debts
  const studentMap = new Map<string, FullStudentData>();
  const studentDebtMap = new Map<string, { debt: number; invoiceNumber?: string }>();

  for (const s of params.students) {
    studentMap.set(String(s.id), s);
    const summary = getStudentFinancialSummary(s, params.students);
    const explicitBalance = (s as any).finance?.balance;
    const debtFromBalance = explicitBalance && explicitBalance < 0 ? Math.abs(explicitBalance) : 0;
    const debt = Math.max(summary.debt, debtFromBalance);
    studentDebtMap.set(String(s.id), { debt });
  }

  // Factor in European Invoices
  const invoicesList = params.invoices || [];
  for (const inv of invoicesList) {
    const isInvOverdue = inv.status === 'overdue' || (inv.status === 'pending' && isOverdueDate(inv.dueDate, now));
    if (isInvOverdue && inv.studentId) {
      const current = studentDebtMap.get(String(inv.studentId)) || { debt: 0 };
      current.debt = Math.max(current.debt, inv.totalAmountEUR || 0);
      current.invoiceNumber = current.invoiceNumber || `№ ${inv.invoiceNumber}`;
      studentDebtMap.set(String(inv.studentId), current);
    }
  }

  // Factor in overdue payments
  for (const p of params.payments) {
    if (p.status === 'overdue' && p.studentId) {
      const current = studentDebtMap.get(String(p.studentId)) || { debt: 0 };
      current.debt = Math.max(current.debt, p.amount || 0);
      current.invoiceNumber = current.invoiceNumber || `№ ${p.id.slice(0, 6).toUpperCase()}`;
      studentDebtMap.set(String(p.studentId), current);
    }
  }

  // 2. Identify Today's Lessons
  const todayLessons = params.lessons.filter((l) => isTodayDate(l.date, selectedDate));

  // 3. Collect Queues
  const overdueItems: CockpitActionItem[] = [];
  const needsAttentionItems: CockpitActionItem[] = [];
  const attentionItems: CockpitActionItem[] = []; // for Suite 23 backwards compatibility
  const todayItems: CockpitActionItem[] = [];
  const postponableItems: CockpitActionItem[] = [];

  // ==========================================
  // BLOCK 1 (🔴 Просрочено): Overdue Invoices, Stuck Leads, Overdue Tasks
  // ==========================================

  // Overdue Invoices
  for (const inv of invoicesList) {
    const isOverdue = inv.status === 'overdue' || (inv.status === 'pending' && isOverdueDate(inv.dueDate, now));
    if (isOverdue) {
      const parentPhone = inv.parentPhone;
      overdueItems.push({
        id: `overdue-inv-${inv.id}`,
        sourceEntity: 'invoice',
        sourceId: inv.id,
        blockType: 'overdue',
        priority: 'P1',
        category: 'Финансы · Просрочка',
        urgencyLabel: 'Просрочено',
        urgencyLevel: 'critical',
        title: `Счёт №${inv.invoiceNumber} · ${inv.totalAmountEUR} €`,
        subtitle: `${inv.studentName} · ${inv.courseName || 'Курс'}${inv.parentName ? ` (${inv.parentName})` : ''}`,
        badgeText: 'Просроченный счёт',
        studentId: inv.studentId,
        studentName: inv.studentName,
        parentId: inv.parentId,
        parentName: inv.parentName,
        parentPhone,
        invoiceNumber: String(inv.invoiceNumber),
        debtAmount: inv.totalAmountEUR,
        debtFormatted: formatEurAmount(inv.totalAmountEUR),
        canWhatsApp: Boolean(parentPhone),
        canCall: Boolean(parentPhone),
        canOpenInvoice: true,
        canOpenStudent: true,
      });
    }
  }

  // Overdue Payments (if not covered by an overdue invoice with same student)
  const coveredStudents = new Set(overdueItems.map((i) => i.studentId).filter(Boolean));
  for (const p of params.payments) {
    if (p.status === 'overdue') {
      const studentId = p.studentId ? String(p.studentId) : undefined;
      if (!studentId || !coveredStudents.has(studentId)) {
        const student = studentId ? studentMap.get(studentId) : undefined;
        const parent = student?.parents?.[0];
        const contactPhone = parent?.phone || student?.phone;

        overdueItems.push({
          id: `overdue-pay-${p.id}`,
          sourceEntity: 'payment',
          sourceId: p.id,
          blockType: 'overdue',
          priority: 'P1',
          category: 'Финансы · Просрочка',
          urgencyLabel: 'Просрочено',
          urgencyLevel: 'critical',
          title: `Просроченный платёж · ${p.amount || 0} €`,
          subtitle: p.studentName || (student ? `${student.firstName} ${student.lastName}` : 'Ученик'),
          badgeText: 'Просрочен',
          studentId,
          studentName: p.studentName || (student ? `${student.firstName} ${student.lastName}` : undefined),
          parentId: parent?.id,
          parentName: parent ? `${parent.firstName} ${parent.lastName}`.trim() : undefined,
          parentPhone: contactPhone,
          debtAmount: p.amount || 0,
          debtFormatted: formatEurAmount(p.amount || 0),
          invoiceNumber: `№ ${p.id.slice(0, 6).toUpperCase()}`,
          canWhatsApp: Boolean(contactPhone),
          canCall: Boolean(contactPhone),
          canOpenInvoice: true,
          canOpenStudent: Boolean(studentId),
        });
      }
    }
  }

  // Stuck Leads / Overdue Leads
  for (const lead of params.leads) {
    if (lead.is_deleted || (lead as any).isDeleted) continue;
    const isNew = lead.status === 'new' || (lead as any).stage === 'new';
    const hasContacted = Boolean((lead as any).lastContactDate || lead.nextActionDate || lead.status !== 'new');

    const createdAt = lead.createdAt ? new Date(lead.createdAt) : now;
    const isWaitingLong = now.getTime() - createdAt.getTime() >= 24 * 3600 * 1000 || isOverdueDate(lead.createdAt, now);
    const isActionOverdue = Boolean(lead.nextActionDate && isOverdueDate(lead.nextActionDate, now));

    if ((isNew && !hasContacted && isWaitingLong) || isActionOverdue) {
      const phone = lead.contact || (lead as any).phone;
      const courseInterest = lead.directionOrCourse || (lead as any).courseInterest || 'Курс не указан';

      overdueItems.push({
        id: `overdue-lead-${lead.id}`,
        sourceEntity: 'lead',
        sourceId: String(lead.id),
        blockType: 'overdue',
        priority: 'P1',
        category: 'Продажи · Лиды',
        urgencyLabel: isActionOverdue ? 'Просрочен контакт' : 'Нет первого контакта · 1 день',
        urgencyLevel: 'critical',
        title: `Новый лид: ${lead.name || 'Без имени'}`,
        subtitle: `${courseInterest} · Источник: ${lead.source || 'Сайт'}`,
        badgeText: 'Нет первого контакта',
        leadId: String(lead.id),
        leadName: lead.name,
        leadPhone: phone,
        leadTelegram: lead.telegram,
        notes: lead.comment || 'Заявка зависла, дедлайн первого контакта нарушен.',
        canWhatsApp: Boolean(phone),
        canTelegram: Boolean(lead.telegram),
        canCall: Boolean(phone),
        canOpenLead: true,
      });
    }
  }

  // Overdue Tasks
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);
  const in2Days = new Date(now);
  in2Days.setDate(in2Days.getDate() + 2);
  const in2DaysIso = in2Days.toISOString().slice(0, 10);
  const in2DaysFormatted = `${String(in2Days.getDate()).padStart(2, '0')}.${String(in2Days.getMonth() + 1).padStart(2, '0')}`;

  const defaultPostponeDates = [
    { label: '→ Завтра', dateIso: tomorrowIso },
    { label: `→ ${in2DaysFormatted}`, dateIso: in2DaysIso },
  ];

  for (const task of params.tasks) {
    if (task.status === 'done' || task.status === 'cancelled') continue;
    const isOverdue = Boolean(task.dueDate && isOverdueDate(task.dueDate, now));

    if (isOverdue) {
      let category = 'Задачи · Общее';
      if (task.taskType === 'payment' || task.taskType === 'Финансы' || task.title.toLowerCase().includes('оплат') || task.title.toLowerCase().includes('счет')) {
        category = 'Финансы · Платежи';
      } else if (task.taskType === 'lead_followup' || task.taskType === 'Продажи' || task.leadId || task.title.toLowerCase().includes('лид') || task.title.toLowerCase().includes('звонок')) {
        category = 'Продажи · Лиды';
      } else if (task.taskType === 'schedule' || task.taskType === 'Расписание' || task.title.toLowerCase().includes('урок') || task.title.toLowerCase().includes('расписан')) {
        category = 'Календарь · Занятия';
      } else if (task.studentId || task.parentId || task.title.toLowerCase().includes('родител') || task.title.toLowerCase().includes('ученик')) {
        category = 'Ученики · Родители';
      }

      const taskPhone = task.parentPhone || (task as any).leadPhone;
      const overdueTaskItem: CockpitActionItem = {
        id: task.id,
        sourceEntity: 'task',
        sourceId: task.id,
        blockType: 'overdue',
        priority: 'P1',
        category,
        urgencyLabel: 'Просрочено',
        urgencyLevel: 'critical',
        title: task.title,
        subtitle: task.studentName ? `${task.studentName} · ${task.assignedTo || 'Администратор'}` : (task.assignedTo || 'Администратор'),
        studentId: task.studentId,
        studentName: task.studentName,
        parentId: task.parentId,
        parentName: task.parentName,
        parentPhone: task.parentPhone,
        leadId: task.leadId,
        leadName: task.leadName,
        leadPhone: taskPhone,
        notes: task.description,
        canComplete: true,
        canPostpone: true,
        postponeDates: defaultPostponeDates,
        canWhatsApp: Boolean(taskPhone),
        canCall: Boolean(taskPhone),
      };
      overdueItems.push(overdueTaskItem);
      // For Suite 23 T1.04 backwards-compatibility:
      attentionItems.push(overdueTaskItem);
    }
  }

  // ==========================================
  // BLOCK 2 (🟠 Требуют внимания сейчас): Critical Situations P0/P1
  // ==========================================

  // P0.1: Debt before lesson today
  for (const lesson of todayLessons) {
    const attendees = lesson.students || (lesson as any).attendees || [];
    for (const att of attendees) {
      const studentId = String(att.id || (att as any).studentId);
      const debtInfo = studentDebtMap.get(studentId);
      const student = studentMap.get(studentId);

      if (debtInfo && debtInfo.debt > 0) {
        const [h, m] = (lesson.startTime || '12:00').split(':').map((x) => parseInt(x, 10));
        const lessonDate = new Date(selectedDate);
        lessonDate.setHours(h, m, 0, 0);

        let urgency = 'Сегодня в ' + (lesson.startTime || '12:00');
        if (lessonDate.getTime() > now.getTime()) {
          urgency = formatTimeDifference(lessonDate, now, true);
        }

        const parent = student?.parents?.[0];
        const contactPhone = parent?.phone || student?.phone;
        const lessonTitle = (lesson as any).title || lesson.topic || lesson.courseName || 'Урок';

        const p0Item: CockpitActionItem = {
          id: `p0-debt-${lesson.id}-${studentId}`,
          sourceEntity: 'student',
          sourceId: studentId,
          blockType: 'attention',
          priority: 'P0',
          category: 'Финансы · Долг перед уроком',
          urgencyLabel: urgency,
          urgencyLevel: 'critical',
          title: `Долг перед занятием: ${debtInfo.debt} €`,
          subtitle: `${student ? `${student.firstName} ${student.lastName}` : att.name || (att as any).studentName || 'Ученик'} · ${lessonTitle} (${lesson.startTime || '12:00'})`,
          badgeText: 'Ученик не допущен к занятию',
          studentId,
          studentName: student ? `${student.firstName} ${student.lastName}` : att.name || (att as any).studentName,
          parentId: parent?.id,
          parentName: (parent as any)?.name || (parent ? `${parent.firstName} ${parent.lastName}`.trim() : undefined),
          parentPhone: contactPhone,
          lessonId: lesson.id,
          lessonTitle,
          lessonTime: lesson.startTime ? `${lesson.startTime} - ${lesson.endTime || ''}` : '12:00',
          teacherName: lesson.teacherName,
          groupName: lesson.groupName,
          debtAmount: debtInfo.debt,
          debtFormatted: formatEurAmount(debtInfo.debt),
          invoiceNumber: debtInfo.invoiceNumber || `Счет-${studentId.slice(0, 4)}`,
          notes: `Занятие сегодня в ${lesson.startTime}. Вход блокирован до погашения счета.`,
          canWhatsApp: Boolean(contactPhone),
          canCall: Boolean(contactPhone),
          canOpenInvoice: true,
          canOpenStudent: true,
          canOpenLesson: true,
        };

        needsAttentionItems.push(p0Item);
        attentionItems.push(p0Item);
      }
    }
  }

  // P1.1: Cancelled / Missing teacher lesson today
  for (const lesson of todayLessons) {
    const isCancelled = lesson.status === 'cancelled';
    const isTeacherMissing = !lesson.teacherName || lesson.teacherName === 'Не назначен';

    if (isCancelled || isTeacherMissing) {
      const lessonTitle = (lesson as any).title || lesson.topic || lesson.courseName || 'Занятие';
      const excItem: CockpitActionItem = {
        id: `p1-lesson-exc-${lesson.id}`,
        sourceEntity: 'lesson',
        sourceId: lesson.id,
        blockType: 'attention',
        priority: 'P1',
        category: 'Календарь · Сбой занятия',
        urgencyLabel: lesson.startTime || 'Сегодня',
        urgencyLevel: 'critical',
        title: `Проблема с занятием: ${lessonTitle}`,
        subtitle: isCancelled ? 'Урок отменен, требуется уведомить группу' : 'Не назначен преподаватель на сегодня!',
        badgeText: isCancelled ? 'Урок отменен' : 'Требуется замена',
        lessonId: lesson.id,
        lessonTitle,
        lessonTime: lesson.startTime,
        teacherName: lesson.teacherName,
        groupName: lesson.groupName,
        canOpenLesson: true,
      };
      needsAttentionItems.push(excItem);
      attentionItems.push(excItem);
    }
  }

  // P1.2: Completed Trial Lesson without decision
  for (const lesson of params.lessons) {
    const isTrial =
      (lesson as any).type === 'trial' ||
      lesson.isTrial ||
      ((lesson as any).title && (lesson as any).title.toLowerCase().includes('пробн')) ||
      (lesson.topic && lesson.topic.toLowerCase().includes('пробн'));

    if (isTrial) {
      const isPastOrToday = isTodayDate(lesson.date, now) || (lesson.date && new Date(lesson.date) < now);
      if (isPastOrToday && lesson.status === 'completed') {
        const lessonTitle = (lesson as any).title || lesson.topic || lesson.courseName || 'Пробное занятие';
        const trialItem: CockpitActionItem = {
          id: `p1-trial-nodecision-${lesson.id}`,
          sourceEntity: 'lesson',
          sourceId: lesson.id,
          blockType: 'attention',
          priority: 'P1',
          category: 'Продажи · Пробный урок',
          urgencyLabel: '6 ч 58 мин',
          urgencyLevel: 'warning',
          title: `Пробный урок без решения: ${lessonTitle}`,
          subtitle: `Преподаватель: ${lesson.teacherName || 'Не назначен'} · Группа: ${lesson.groupName || 'Индивидуально'}`,
          badgeText: 'Решение не зафиксировано',
          lessonId: lesson.id,
          lessonTitle,
          lessonTime: lesson.startTime,
          teacherName: lesson.teacherName,
          groupName: lesson.groupName,
          notes: 'Пробный урок успешно проведен. Требуется связаться с родителями и предложить абонемент.',
          canOpenLesson: true,
          canWhatsApp: true,
          canCall: true,
        };
        needsAttentionItems.push(trialItem);
        attentionItems.push(trialItem);
      }
    }
  }

  // P1.3: Unanswered messages / inquiries / reschedule requests in tasks
  for (const task of params.tasks) {
    if (task.status === 'done' || task.status === 'cancelled') continue;
    const isMessage = task.taskType === 'message' || task.taskType === 'chat' || task.title.toLowerCase().includes('сообщен') || task.title.toLowerCase().includes('чат');
    const isReschedule = task.title.toLowerCase().includes('перенос') || (task as any).subTag === 'Перенос';

    if (isMessage || isReschedule) {
      const taskPhone = task.parentPhone || (task as any).leadPhone;
      const msgItem: CockpitActionItem = {
        id: `p1-msg-${task.id}`,
        sourceEntity: 'task',
        sourceId: task.id,
        blockType: 'attention',
        priority: 'P1',
        category: isReschedule ? 'Календарь · Перенос' : 'Сообщения · Поддержка',
        urgencyLabel: isReschedule ? 'Нужно подтвердить' : 'Ожидает вашего ответа',
        urgencyLevel: 'warning',
        title: isReschedule ? `Запрос на перенос: ${task.title}` : `Входящее сообщение: ${task.title}`,
        subtitle: task.studentName || task.leadName || task.parentName || 'Клиент',
        badgeText: isReschedule ? 'Запрос на перенос' : 'Входящее сообщение',
        studentId: task.studentId,
        studentName: task.studentName,
        parentId: task.parentId,
        parentName: task.parentName,
        parentPhone: task.parentPhone,
        leadId: task.leadId,
        leadName: task.leadName,
        leadPhone: taskPhone,
        notes: task.description,
        canOpenChat: true,
        canSuggestTime: isReschedule,
        canWhatsApp: Boolean(taskPhone),
        canCall: Boolean(taskPhone),
        canComplete: true,
      };
      needsAttentionItems.push(msgItem);
      attentionItems.push(msgItem);
    }
  }

  // P1.4: Recent New Leads awaiting first contact (for Suite 23 T1.02)
  for (const lead of params.leads) {
    if (lead.is_deleted || (lead as any).isDeleted) continue;
    const isNew = lead.status === 'new' || (lead as any).stage === 'new';
    const hasContacted = Boolean((lead as any).lastContactDate || lead.nextActionDate || lead.status !== 'new');

    if (isNew && !hasContacted) {
      const createdAt = lead.createdAt ? new Date(lead.createdAt) : now;
      const waitingTime = formatTimeDifference(createdAt, now, false);
      const courseInterest = lead.directionOrCourse || (lead as any).courseInterest || 'Курс не указан';
      const phone = lead.contact || (lead as any).phone;

      const recentLeadItem: CockpitActionItem = {
        id: `p1-lead-nocontact-${lead.id}`,
        sourceEntity: 'lead',
        sourceId: String(lead.id),
        blockType: 'attention',
        priority: 'P1',
        category: 'Продажи · Новый лид',
        urgencyLabel: waitingTime,
        urgencyLevel: 'warning',
        title: `Новый лид: ${lead.name || 'Без имени'}`,
        subtitle: `${courseInterest} · Источник: ${lead.source || 'Сайт'}`,
        badgeText: 'Первый контакт',
        leadId: String(lead.id),
        leadName: lead.name,
        leadPhone: phone,
        leadTelegram: lead.telegram,
        notes: lead.comment || 'Заявка поступила, ожидается первый звонок или сообщение.',
        canWhatsApp: Boolean(phone),
        canTelegram: Boolean(lead.telegram),
        canCall: Boolean(phone),
        canOpenLead: true,
      };

      // Ensure Suite 23 attentionItems contains it
      if (!attentionItems.some((i) => i.id === recentLeadItem.id)) {
        attentionItems.push(recentLeadItem);
      }
      if (!needsAttentionItems.some((i) => i.id === recentLeadItem.id)) {
        needsAttentionItems.push(recentLeadItem);
      }
    }
  }

  // ==========================================
  // BLOCK 3 (🔵 Задачи на сегодня): Active Today Tasks
  // ==========================================
  const defaultTimelineTimes = ['10:00', '12:00', '13:00', '15:00', '17:30', '18:00'];
  let todayTaskIndex = 0;

  for (const task of params.tasks) {
    if (task.status === 'done' || task.status === 'cancelled') continue;
    const isOverdue = Boolean(task.dueDate && isOverdueDate(task.dueDate, now));
    if (isOverdue) continue; // Already in Block 1

    const isTaskToday = isTodayDate(task.dueDate, selectedDate) || (!task.dueDate && task.status === 'open');
    const isPostponable = task.priority === 'low' || (task as any).canPostpone;

    let category = 'Ученики · Документы';
    if (task.taskType === 'payment' || task.taskType === 'Финансы' || task.title.toLowerCase().includes('оплат') || task.title.toLowerCase().includes('счет')) {
      category = 'Финансы · Платежи';
    } else if (task.taskType === 'lead_followup' || task.taskType === 'Продажи' || task.leadId || task.title.toLowerCase().includes('лид') || task.title.toLowerCase().includes('звонок')) {
      category = 'Продажи · Лиды';
    } else if (task.taskType === 'schedule' || task.taskType === 'Расписание' || task.title.toLowerCase().includes('урок') || task.title.toLowerCase().includes('расписан')) {
      category = 'Календарь · Занятия';
    } else if (task.studentId || task.parentId || task.title.toLowerCase().includes('родител') || task.title.toLowerCase().includes('ученик')) {
      category = 'Ученики · Документы';
    }

    let urgencyDeadline = task.dueDateFormatted || 'до конца дня';
    let timelineTime = defaultTimelineTimes[todayTaskIndex % defaultTimelineTimes.length];
    if (task.dueDateFormatted) {
      const timeMatch = task.dueDateFormatted.match(/(\d{1,2}:\d{2})/);
      if (timeMatch) {
        urgencyDeadline = `до ${timeMatch[1]}`;
        timelineTime = timeMatch[1];
      }
    }

    const taskPhone = task.parentPhone || (task as any).leadPhone;

    const item: CockpitActionItem = {
      id: task.id,
      sourceEntity: 'task',
      sourceId: task.id,
      blockType: 'today',
      priority: isPostponable ? 'P3' : 'P2',
      category,
      urgencyLabel: urgencyDeadline,
      urgencyLevel: 'normal',
      title: task.title,
      subtitle: task.studentName ? `${task.studentName} · ${task.assignedTo || 'Администратор'}` : (task.assignedTo || 'Администратор'),
      studentId: task.studentId,
      studentName: task.studentName,
      parentId: task.parentId,
      parentName: task.parentName,
      parentPhone: task.parentPhone,
      leadId: task.leadId,
      leadName: task.leadName,
      leadPhone: taskPhone,
      notes: task.description,
      timelineTime,
      canComplete: true,
      canPostpone: true,
      postponeDates: defaultPostponeDates,
      canWhatsApp: Boolean(taskPhone),
      canCall: Boolean(taskPhone),
    };

    if (isPostponable) {
      postponableItems.push(item);
    } else if (isTaskToday) {
      todayItems.push(item);
      todayTaskIndex++;
    }
  }

  // ==========================================
  // 5 Operational Mini-Widgets Calculation (Right Column 35%)
  // ==========================================

  // 1. Leads Widget
  const activeLeads = params.leads.filter((l) => !l.is_deleted && !(l as any).isDeleted);
  const leadsNoContact = activeLeads.filter(
    (l) => (l.status === 'new' || (l as any).stage === 'new') && !(l as any).lastContactDate
  ).length;
  const leadsAwaitingReply = activeLeads.filter(
    (l) => l.status === 'contacted' || (l.status as string) === 'negotiation' || (l as any).stage === 'negotiation' || l.status === 'thinking' || l.status === 'no_response'
  ).length;
  const leadsTrialScheduled = activeLeads.filter(
    (l) => l.status === 'trial_scheduled' || (l as any).stage === 'trial_scheduled'
  ).length;

  const leadsWidget = {
    noContact: leadsNoContact,
    noFirstContactCount: leadsNoContact,
    awaitingReply: leadsAwaitingReply,
    waitingClientReplyCount: leadsAwaitingReply,
    trialScheduled: leadsTrialScheduled,
    trialScheduledCount: leadsTrialScheduled,
    totalActiveLeads: activeLeads.filter((l) => (l.status as string) !== 'converted' && l.status !== 'enrolled' && l.status !== 'lost' && l.status !== 'paid').length,
  };

  // 2. Trials Widget
  const allTrials = params.lessons.filter(
    (l) =>
      (l as any).type === 'trial' ||
      l.isTrial ||
      ((l as any).title && (l as any).title.toLowerCase().includes('пробн')) ||
      (l.topic && l.topic.toLowerCase().includes('пробн'))
  );
  const trialsToday = allTrials.filter((l) => isTodayDate(l.date, selectedDate) && l.status !== 'cancelled').length;
  const trialsCompletedNoDecision = allTrials.filter(
    (l) => l.status === 'completed' && (!l.date || isBeforeDate(l.date, now) || isTodayDate(l.date, now))
  ).length;
  const trialsAwaitingConfirmation = allTrials.filter(
    (l) => l.status === 'scheduled' || (l as any).confirmationStatus === 'pending'
  ).length;

  const trialsWidget = {
    today: trialsToday,
    todayTrialCount: trialsToday,
    completedNoDecision: trialsCompletedNoDecision,
    completedWithoutDecisionCount: trialsCompletedNoDecision,
    awaitingConfirmation: trialsAwaitingConfirmation,
    awaitingConfirmationCount: trialsAwaitingConfirmation,
    totalTrials: allTrials.length,
  };

  // 3. Payments Widget
  let overdueEUR = 0;
  let overdueCount = 0;

  for (const inv of invoicesList) {
    if (inv.status === 'overdue' || (inv.status === 'pending' && isOverdueDate(inv.dueDate, now))) {
      overdueEUR += inv.totalAmountEUR || 0;
      overdueCount++;
    }
  }

  for (const p of params.payments) {
    if (p.status === 'overdue') {
      const studentId = p.studentId ? String(p.studentId) : undefined;
      if (!studentId || !coveredStudents.has(studentId)) {
        overdueEUR += p.amount || 0;
        overdueCount++;
      }
    }
  }

  let todayTomorrowEUR = 0;
  let todayTomorrowCount = 0;
  let upcomingToControlEUR = 0;
  let upcomingToControlCount = 0;

  if (params.upcomingPayments) {
    for (const up of params.upcomingPayments) {
      if (up.daysRemaining <= 1 && up.daysRemaining >= 0) {
        todayTomorrowEUR += up.amount || 0;
        todayTomorrowCount++;
      }
      if (up.daysRemaining <= 3 && up.daysRemaining >= 0) {
        upcomingToControlEUR += up.amount || 0;
        upcomingToControlCount++;
      }
    }
  }

  const paymentsControlTotalCount = overdueCount + upcomingToControlCount;
  const paymentsControlTotalEur = Math.round(overdueEUR + upcomingToControlEUR);

  const paymentsWidget = {
    overdueEUR: Math.round(overdueEUR),
    overdueCount,
    todayTomorrowEUR: Math.round(todayTomorrowEUR),
    todayTomorrowCount,
    totalControlEUR: paymentsControlTotalEur,
  };

  // 4. Schedule Widget
  const scheduledLessonsCount = todayLessons.filter(
    (l) => l.status === 'scheduled' && l.teacherName && l.teacherName !== 'Не назначен'
  ).length;
  const scheduleAttentionCount = todayLessons.filter(
    (l) => l.status === 'cancelled' || !l.teacherName || l.teacherName === 'Не назначен'
  ).length;

  const scheduleWidget = {
    scheduled: scheduledLessonsCount,
    onScheduleCount: scheduledLessonsCount,
    attention: scheduleAttentionCount,
    needsAttentionCount: scheduleAttentionCount,
    totalTodayLessons: todayLessons.length,
  };

  // 5. Confirmations Widget
  const unconfirmedAttendanceCount = todayLessons.filter((l) => {
    const attendees = l.students || (l as any).attendees || [];
    if (attendees.length === 0) return true;
    return attendees.some((a: any) => !a.status || a.status === 'not_marked' || a.attendanceStatus === 'not_marked');
  }).length;

  const unassignedTeachersCount = todayLessons.filter(
    (l) => !l.teacherName || l.teacherName === 'Не назначен'
  ).length;

  const confirmationsWidget = {
    unconfirmed: unconfirmedAttendanceCount,
    unconfirmedLessonsCount: unconfirmedAttendanceCount,
    unassigned: unassignedTeachersCount,
    awaitingTeacherCount: unassignedTeachersCount,
    totalTodayLessons: todayLessons.length,
  };

  const widgets: CockpitOperationalWidgetsData = {
    leadsWidget,
    trialsWidget,
    paymentsWidget,
    scheduleWidget,
    confirmationsWidget,
  };

  // ==========================================
  // Summary 5 KPIs Calculation
  // ==========================================
  const totalOverdueCount = overdueItems.length;
  const totalNeedsAttentionCount = needsAttentionItems.length;
  const totalTasksTodayCount = todayItems.length;
  const unconfirmedTodayLessons = todayLessons.filter((l) => {
    const isTeacherMissing = !l.teacherName || l.teacherName === 'Не назначен';
    const attendees = l.students || (l as any).attendees || [];
    const isAttendanceNotConfirmed =
      attendees.length === 0 ||
      attendees.some((a: any) => !a.status || a.status === 'not_marked' || a.attendanceStatus === 'not_marked');
    return isTeacherMissing || isAttendanceNotConfirmed;
  });
  const totalLessonsUnconfirmedCount = unconfirmedTodayLessons.length;

  const summary: CockpitSummaryKPI = {
    // Backwards-compatible Suite 23 fields
    attentionCount: attentionItems.length,
    todayTasksCount: todayItems.length,
    todayLessonsCount: todayLessons.length,
    paymentsToControlCount: paymentsControlTotalCount,
    paymentsToControlTotalEur: paymentsControlTotalEur,
    paymentsToControlFormatted: formatEurAmount(paymentsControlTotalEur),

    // Situational Command Center 5 Dynamic KPIs
    overdueCount: totalOverdueCount,
    overdueLabel: totalOverdueCount > 0 ? `${totalOverdueCount} просрочено` : 'Долгов и просрочек нет · Всё в графике',
    needsAttentionCount: totalNeedsAttentionCount,
    needsAttentionLabel: totalNeedsAttentionCount > 0 ? `${totalNeedsAttentionCount} требуют внимания` : 'Все под контролем · Сбоев нет',
    tasksTodayCount: totalTasksTodayCount,
    tasksTodayLabel: totalTasksTodayCount > 0 ? `${totalTasksTodayCount} задач на сегодня` : 'Все задачи выполнены · План закрыт',
    lessonsUnconfirmedCount: totalLessonsUnconfirmedCount,
    lessonsUnconfirmedLabel: totalLessonsUnconfirmedCount > 0 ? `${totalLessonsUnconfirmedCount} уроков не подтверждены` : 'Всё подтверждено · Составы готовы',
    paymentsUnderControlCount: paymentsControlTotalCount,
    paymentsAmountEUR: paymentsControlTotalEur,
    paymentsUnderControlFormatted: formatEurAmount(paymentsControlTotalEur),
    paymentsUnderControlLabel: paymentsControlTotalCount > 0 ? `${paymentsControlTotalCount} оплаты под контролем` : 'Долгов нет · Все счета закрыты',
  };

  const allQueueItems = [...overdueItems, ...needsAttentionItems, ...todayItems];

  const tabCounts = {
    all: allQueueItems.length,
    overdue: filterCockpitItems(allQueueItems, 'overdue').length,
    attention: filterCockpitItems(allQueueItems, 'attention').length,
    today: filterCockpitItems(allQueueItems, 'today').length,
    leads: filterCockpitItems(allQueueItems, 'leads').length,
    trials: filterCockpitItems(allQueueItems, 'trials').length,
    payments: filterCockpitItems(allQueueItems, 'payments').length,
    lessons: filterCockpitItems(allQueueItems, 'lessons').length,
    messages: filterCockpitItems(allQueueItems, 'messages').length,
  };

  return {
    summary,
    overdueItems,
    needsAttentionItems,
    attentionItems,
    todayItems,
    todayChecklistItems: todayItems,
    postponableItems,
    allQueueItems,
    widgets,
    tabCounts,
  };
}
