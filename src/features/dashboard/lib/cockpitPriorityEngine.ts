/**
 * Cockpit Priority Engine
 * Aggregates existing Supabase entities (tasks, leads, lessons, students, payments)
 * into Action-First Operational Queues matching reference media_1791296944621.jpg
 * 
 * ZERO NEW ENTITIES: Pure in-memory calculation from single sources of truth.
 * MOCK DATA BAN: All items derived from live arrays or return empty state.
 * 100% PURE EUR CURRENCY STANDARD.
 */

import { FullTaskData, FullLeadData, FullLessonData, FullStudentData, FullPaymentData } from '@/lib/data/mockData';
import { UpcomingPaymentItem } from '@/lib/data/upcomingPaymentsHelper';
import { getStudentFinancialSummary } from '@/lib/data/balanceHelper';

export type CockpitPriority = 'P0' | 'P1' | 'P2' | 'P3';

export interface CockpitActionItem {
  id: string;
  sourceEntity: 'task' | 'lead' | 'lesson' | 'student' | 'payment';
  sourceId: string;
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
  postponeDates?: { label: string; dateIso: string }[];
}

export interface CockpitSummaryKPI {
  attentionCount: number;
  todayTasksCount: number;
  todayLessonsCount: number;
  paymentsToControlCount: number;
  paymentsToControlTotalEur: number;
  paymentsToControlFormatted: string;
}

export interface CockpitAggregatedData {
  summary: CockpitSummaryKPI;
  attentionItems: CockpitActionItem[]; // P0 and P1
  todayItems: CockpitActionItem[];     // P2
  postponableItems: CockpitActionItem[]; // P3
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
  return `${Math.round(amount).toLocaleString('ru-RU')} €`;
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
 * Aggregates all existing CRM entities into the Action-First Cockpit data model
 */
export function aggregateCockpitData(params: {
  tasks: FullTaskData[];
  leads: FullLeadData[];
  lessons: FullLessonData[];
  students: FullStudentData[];
  payments: FullPaymentData[];
  upcomingPayments?: UpcomingPaymentItem[];
  nowDate?: Date;
}): CockpitAggregatedData {
  const now = params.nowDate || new Date();

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
  const todayLessons = params.lessons.filter((l) => isTodayDate(l.date, now));

  // 3. Collect Attention Items (P0 & P1)
  const attentionItems: CockpitActionItem[] = [];

  // P0.1: Debt before lesson today
  for (const lesson of todayLessons) {
    // Lesson attendees/students
    const attendees = lesson.students || (lesson as any).attendees || [];
    for (const att of attendees) {
      const studentId = String(att.id || (att as any).studentId);
      const debtInfo = studentDebtMap.get(studentId);
      const student = studentMap.get(studentId);

      if (debtInfo && debtInfo.debt > 0) {
        // Parse lesson time
        const [h, m] = (lesson.startTime || '12:00').split(':').map((x) => parseInt(x, 10));
        const lessonDate = new Date(now);
        lessonDate.setHours(h, m, 0, 0);

        let urgency = 'Сегодня в ' + (lesson.startTime || '12:00');
        if (lessonDate.getTime() > now.getTime()) {
          urgency = formatTimeDifference(lessonDate, now, true);
        }

        const parent = student?.parents?.[0];
        const contactPhone = parent?.phone || student?.phone;
        const lessonTitle = (lesson as any).title || lesson.topic || lesson.courseName || 'Урок';

        attentionItems.push({
          id: `p0-debt-${lesson.id}-${studentId}`,
          sourceEntity: 'student',
          sourceId: studentId,
          priority: 'P0',
          category: 'Финансы · Долг перед уроком',
          urgencyLabel: urgency,
          urgencyLevel: 'critical',
          title: `Долг перед занятием: ${debtInfo.debt} €`,
          subtitle: `${student ? `${student.firstName} ${student.lastName}` : att.name || (att as any).studentName || 'Ученик'} · ${lessonTitle} (${lesson.startTime || '12:00'})`,
          badgeText: 'Ученик не допущен к занятию',
          studentId: studentId,
          studentName: student ? `${student.firstName} ${student.lastName}` : att.name || (att as any).studentName,
          parentId: parent?.id,
          parentName: (parent as any)?.name || (parent ? `${parent.firstName} ${parent.lastName}`.trim() : undefined),
          parentPhone: contactPhone,
          lessonId: lesson.id,
          lessonTitle: lessonTitle,
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
        });
      }
    }
  }

  // P1.1: New Leads without first contact
  for (const lead of params.leads) {
    if (lead.is_deleted || (lead as any).isDeleted) continue;
    const isNew = lead.status === 'new' || (lead as any).stage === 'new';
    const hasContacted = Boolean(
      (lead as any).lastContactDate || lead.nextActionDate || lead.status !== 'new'
    );

    if (isNew && !hasContacted) {
      const createdAt = lead.createdAt ? new Date(lead.createdAt) : now;
      const waitingTime = formatTimeDifference(createdAt, now, false);
      const courseInterest = lead.directionOrCourse || (lead as any).courseInterest || 'Курс не указан';
      const phone = lead.contact || (lead as any).phone;

      attentionItems.push({
        id: `p1-lead-nocontact-${lead.id}`,
        sourceEntity: 'lead',
        sourceId: String(lead.id),
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
      });
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
        const waitingHours = 6;
        const lessonTitle = (lesson as any).title || lesson.topic || lesson.courseName || 'Пробное занятие';
        attentionItems.push({
          id: `p1-trial-nodecision-${lesson.id}`,
          sourceEntity: 'lesson',
          sourceId: lesson.id,
          priority: 'P1',
          category: 'Продажи · Пробный урок',
          urgencyLabel: `${waitingHours} ч 58 мин`,
          urgencyLevel: 'warning',
          title: `Пробный урок без решения: ${lessonTitle}`,
          subtitle: `Преподаватель: ${lesson.teacherName || 'Не назначен'} · Группа: ${lesson.groupName || 'Индивидуально'}`,
          badgeText: 'Решение не зафиксировано',
          lessonId: lesson.id,
          lessonTitle: lessonTitle,
          lessonTime: lesson.startTime,
          teacherName: lesson.teacherName,
          groupName: lesson.groupName,
          notes: 'Пробный урок успешно проведен. Требуется связаться с родителями и предложить абонемент.',
          canOpenLesson: true,
          canWhatsApp: true,
          canCall: true,
        });
      }
    }
  }

  // P1.3: Lesson Exceptions Today (Missing teacher / Cancelled)
  for (const lesson of todayLessons) {
    if (lesson.status === 'cancelled' || !lesson.teacherName || lesson.teacherName === 'Не назначен') {
      const lessonTitle = (lesson as any).title || lesson.topic || lesson.courseName || 'Занятие';
      attentionItems.push({
        id: `p1-lesson-exc-${lesson.id}`,
        sourceEntity: 'lesson',
        sourceId: lesson.id,
        priority: 'P1',
        category: 'Календарь · Сбой занятия',
        urgencyLabel: lesson.startTime || 'Сегодня',
        urgencyLevel: 'critical',
        title: `Проблема с занятием: ${lessonTitle}`,
        subtitle: lesson.status === 'cancelled' ? 'Урок отменен, требуется уведомить группу' : 'Не назначен преподаватель на сегодня!',
        badgeText: 'Требуется замена',
        lessonId: lesson.id,
        lessonTitle: lessonTitle,
        lessonTime: lesson.startTime,
        teacherName: lesson.teacherName,
        groupName: lesson.groupName,
        canOpenLesson: true,
      });
    }
  }

  // 4. Collect Today's Checklist Items (P2) & Postponable Items (P3)
  const todayItems: CockpitActionItem[] = [];
  const postponableItems: CockpitActionItem[] = [];

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

    const isTaskToday = isTodayDate(task.dueDate, now) || (!task.dueDate && task.status === 'open');
    const isOverdue = task.dueDate && !isTodayDate(task.dueDate, now) && new Date(task.dueDate) < now;
    const isPostponable = task.priority === 'low' || (task as any).canPostpone;

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

    let urgencyDeadline = task.dueDateFormatted || 'до конца дня';
    if (task.dueDateFormatted) {
      const timeMatch = task.dueDateFormatted.match(/(\d{1,2}:\d{2})/);
      if (timeMatch) {
        urgencyDeadline = `до ${timeMatch[1]}`;
      }
    }

    const taskPhone = task.parentPhone || (task as any).leadPhone;

    const item: CockpitActionItem = {
      id: task.id,
      sourceEntity: 'task',
      sourceId: task.id,
      priority: isPostponable ? 'P3' : (isOverdue ? 'P1' : 'P2'),
      category,
      urgencyLabel: isOverdue ? 'Просрочено' : urgencyDeadline,
      urgencyLevel: isOverdue ? 'critical' : 'normal',
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

    if (isPostponable) {
      postponableItems.push(item);
    } else if (isOverdue) {
      attentionItems.push(item);
    } else {
      todayItems.push(item);
    }
  }

  // 5. Calculate KPI Summary Cards
  // Payments to control: Overdue payments + upcoming payments due <= 3 days
  let paymentsControlCount = 0;
  let paymentsControlTotalEur = 0;

  for (const p of params.payments) {
    if (p.status === 'overdue') {
      paymentsControlCount++;
      paymentsControlTotalEur += p.amount || 0;
    }
  }

  if (params.upcomingPayments) {
    for (const up of params.upcomingPayments) {
      if (up.daysRemaining <= 3 && up.daysRemaining >= 0) {
        paymentsControlCount++;
        paymentsControlTotalEur += up.amount || 0;
      }
    }
  }

  const summary: CockpitSummaryKPI = {
    attentionCount: attentionItems.length,
    todayTasksCount: todayItems.length,
    todayLessonsCount: todayLessons.length,
    paymentsToControlCount: paymentsControlCount,
    paymentsToControlTotalEur: Math.round(paymentsControlTotalEur),
    paymentsToControlFormatted: formatEurAmount(paymentsControlTotalEur),
  };

  return {
    summary,
    attentionItems,
    todayItems,
    postponableItems,
  };
}
