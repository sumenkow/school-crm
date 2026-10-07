'use client';

import { FullTaskData, TimelineInteraction, INITIAL_STUDENTS, INITIAL_LEADS, INITIAL_TASKS } from './mockData';
import { getStoredTasks, saveTaskToStorage } from './taskStorage';
import { getStoredStudents } from './studentStorage';
import { saveInteractionToStorage } from './timelineStorage';
import { notifyAdminOnTaskAssigned, notifyOwnerOnTaskStatusChange, notifyContactOnTask } from '@/lib/telegram/botNotifier';

export interface CreateTaskOptions {
  title: string;
  taskType?: FullTaskData['taskType'];
  priority?: FullTaskData['priority'];
  dueDate?: string;
  dueDateFormatted?: string;
  description?: string;
  assignedTo?: string;
  assignedToUserId?: string;
  studentId?: string;
  studentName?: string;
  parentId?: string;
  parentName?: string;
  leadId?: string;
  leadName?: string;
  createdByUserId?: string;
  createdByRole?: string;
  createdByName?: string;
  skipTimelineInteraction?: boolean;
  notifyAdminInTelegram?: boolean;
  notifyContactInTelegram?: boolean;
  contactTelegramChatId?: string;
}

/**
 * Creates a unified task with end-to-end linking to Student, Parent, and Lead.
 * Automatically saves to Supabase & localStorage, adds timeline logs, and sends Telegram alerts.
 */
export async function createUnifiedTask(options: CreateTaskOptions): Promise<FullTaskData> {
  const allStudents = typeof window !== 'undefined' ? getStoredStudents() : INITIAL_STUDENTS;

  let studentId = options.studentId;
  let studentName = options.studentName;
  let parentId = options.parentId;
  let parentName = options.parentName;
  let leadId = options.leadId;
  let leadName = options.leadName;

  // 1. Resolve Student & Parents link if studentId provided
  if (studentId && (!studentName || !parentId || !parentName)) {
    const student = allStudents.find((s) => String(s.id) === String(studentId));
    if (student) {
      if (!studentName) studentName = `${student.firstName} ${student.lastName}`.trim();
      if (!parentId && student.parents && student.parents.length > 0) {
        parentId = student.parents[0].id;
        parentName = `${student.parents[0].firstName} ${student.parents[0].lastName}`.trim();
      }
    }
  }

  // 2. Resolve Parent's children if parentId provided without student
  if (parentId && !parentName) {
    for (const s of allStudents) {
      const p = s.parents?.find((pr) => String(pr.id) === String(parentId));
      if (p) {
        parentName = `${p.firstName} ${p.lastName}`.trim() || 'Родитель';
        if (!studentId) {
          studentId = s.id;
          studentName = `${s.firstName} ${s.lastName}`.trim();
        }
        break;
      }
    }
  }

  // 3. Resolve Lead if leadId provided
  if (leadId && !leadName) {
    const lead = INITIAL_LEADS.find((l) => String(l.id) === String(leadId));
    if (lead) {
      leadName = lead.name;
      if (!studentId && lead.convertedStudentId) {
        studentId = lead.convertedStudentId;
        const st = allStudents.find((s) => String(s.id) === String(studentId));
        if (st) studentName = `${st.firstName} ${st.lastName}`.trim();
      }
    }
  }

  const dueDate = options.dueDate || new Date().toISOString().slice(0, 10);
  const dueDateFormatted = options.dueDateFormatted || new Date(dueDate).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });

  // Clean description of any legacy HTML comments
  const cleanDescription = options.description
    ? options.description.replace(/<!--[\s\S]*?-->/g, '').trim() || undefined
    : undefined;

  const createdByName = options.createdByName || options.assignedTo || 'Администратор школы';
  const createdByRole = options.createdByRole || 'admin';

  const newTask: FullTaskData = {
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: options.title,
    taskType: options.taskType || 'Retention',
    studentId,
    studentName,
    parentId,
    parentName,
    leadId,
    leadName,
    assignedTo: options.assignedTo || 'Елена Менеджер',
    assignedToUserId: options.assignedToUserId,
    dueDate,
    dueDateFormatted,
    status: 'open',
    priority: options.priority || 'medium',
    description: cleanDescription,
    createdByUserId: options.createdByUserId,
    createdByRole,
    createdByName,
    creator: createdByName,
    postponeCount: 0,
  };

  // 4. Save to Storage (localStorage + Supabase fire-and-forget)
  saveTaskToStorage(newTask);

  // 5. Create cross-entity Timeline interaction (unless skipped for auto-followup tasks)
  if (!options.skipTimelineInteraction) {
    const nowCreated = new Date();
    const padC = (n: number) => String(n).padStart(2, '0');
    const dateStrC = `${padC(nowCreated.getDate())}.${padC(nowCreated.getMonth() + 1)}.${nowCreated.getFullYear()}`;
    const timeNow = `${padC(nowCreated.getHours())}:${padC(nowCreated.getMinutes())}`;
    const timelineItem: TimelineInteraction = {
      id: `int_task_${Date.now()}`,
      studentId,
      studentName,
      parentId,
      parentName,
      occurredAt: `${dateStrC}, ${timeNow}`,
      createdAt: nowCreated.toISOString(),
      channel: 'other',
      type: 'organizational',
      author: options.createdByName || options.assignedTo || 'Система',
      content: `Поставлена задача: «${newTask.title}» (Срок: ${dueDateFormatted}, Отв: ${newTask.assignedTo})`,
      result: options.description || undefined,
    };

    saveInteractionToStorage(timelineItem);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed', { detail: timelineItem }));
    }
  }

  // 6. Additional events for timeline/notifications (crm-tasks-changed already dispatched by saveTaskToStorage)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed'));
  }

  // 7. Telegram Bot notification to Staff / Administrator
  if (options.notifyAdminInTelegram !== false) {
    notifyAdminOnTaskAssigned({
      title: newTask.title,
      assignedBy: options.createdByName || 'Администрация школы',
      assignedTo: newTask.assignedTo,
      dueDate: dueDateFormatted,
      priority: newTask.priority,
      studentName,
      parentName,
      leadName,
      description: options.description,
    }).catch((err) => console.warn('Failed to send admin task notification in Telegram:', err));
  }

  // 8. Telegram Bot notification directly to Contact (if requested)
  if (options.notifyContactInTelegram) {
    const targetRecipientType = studentId ? 'student' : leadId ? 'lead' : parentId ? 'parent' : null;
    const targetRecipientId = studentId || leadId || parentId;
    const targetRecipientName = studentName || leadName || parentName || 'Клиент';

    if (targetRecipientType && targetRecipientId) {
      notifyContactOnTask({
        recipientType: targetRecipientType,
        recipientId: targetRecipientId,
        recipientName: targetRecipientName,
        chatId: options.contactTelegramChatId,
        title: newTask.title,
        dueDate: dueDateFormatted,
        description: options.description,
      }).catch((err) => console.warn('Failed to send contact task reminder in Telegram:', err));
    }
  }

  return newTask;
}

export interface UpdateTaskStatusOptions {
  comment?: string;
  result?: string;
  completionResult?: string;
  newDueDate?: string;
  performedBy?: string;
  performedByUserId?: string;
  userRole?: string;
  rescheduledReason?: string;
  rescheduledBy?: string;
  rescheduledByUserId?: string;
}

/**
 * Updates task status (done, rescheduled, open, etc.) with real-time sync & timeline recording.
 */
export async function updateUnifiedTaskStatus(
  taskId: string,
  newStatus: FullTaskData['status'],
  options?: UpdateTaskStatusOptions
): Promise<FullTaskData | null> {
  const tasks = await getStoredTasks();
  let target = tasks.find((t) => t.id === taskId);
  if (!target) {
    target = INITIAL_TASKS.find((t) => t.id === taskId);
  }
  if (!target) return null;

  const oldStatus = target.status;
  const performerName = options?.performedBy || target.assignedTo || 'Администратор';
  const performerUserId = options?.performedByUserId;

  const isRescheduled = Boolean(options?.newDueDate || options?.rescheduledReason);
  const nowIso = new Date().toISOString();

  // 1. Completion metadata
  let completedAt = target.completedAt;
  let completedByName = target.completedByName || target.completedBy;
  let completedBy = completedByName;
  let completedByUserId = target.completedByUserId;
  let completionResult = target.completionResult || target.result;
  let result = completionResult;

  if (newStatus === 'done') {
    completedAt = nowIso;
    completedByName = performerName;
    completedBy = performerName;
    completedByUserId = performerUserId || target.completedByUserId;
    const finalResult = options?.completionResult || options?.result || options?.comment || target.completionResult || target.result || 'Задача выполнена';
    completionResult = finalResult.trim();
    result = finalResult.trim();
  } else if (newStatus === 'open') {
    completedAt = undefined;
    completedByName = undefined;
    completedBy = undefined;
    completedByUserId = undefined;
    completionResult = undefined;
    result = undefined;
  }

  // 2. Rescheduling metadata
  let dueDate = target.dueDate;
  let dueDateFormatted = target.dueDateFormatted;
  let rescheduledReason = target.rescheduledReason;
  let rescheduledBy = target.rescheduledBy;
  let rescheduledByUserId = target.rescheduledByUserId;
  let rescheduledAt = target.rescheduledAt;
  let postponeCount = target.postponeCount ?? 0;

  if (isRescheduled) {
    if (options?.newDueDate) {
      dueDate = options.newDueDate;
      if (dueDate.includes('-')) {
        const [y, m, d] = dueDate.slice(0, 10).split('-');
        dueDateFormatted = `${d}.${m}.${y}`;
      } else {
        dueDateFormatted = dueDate;
      }
    }
    const finalReason = options?.rescheduledReason || options?.comment || target.rescheduledReason;
    rescheduledReason = finalReason ? finalReason.trim() : undefined;
    rescheduledBy = options?.rescheduledBy || performerName;
    rescheduledByUserId = options?.rescheduledByUserId || performerUserId || target.rescheduledByUserId;
    rescheduledAt = nowIso;
    postponeCount = (target.postponeCount ?? 0) + 1;
  }

  const updatedTask: FullTaskData = {
    ...target,
    status: newStatus,
    dueDate,
    dueDateFormatted,
    isOverdue: newStatus === 'open' && new Date(dueDate) < new Date(new Date().setHours(0, 0, 0, 0)),
    completedAt,
    completedByUserId,
    completedByName,
    completedBy,
    completionResult,
    result,
    rescheduledReason,
    rescheduledBy,
    rescheduledByUserId,
    rescheduledAt,
    postponeCount,
  };

  if (isRescheduled) {
    (updatedTask as any).isRescheduled = true;
  }

  // 1. Save to Task Storage
  saveTaskToStorage(updatedTask);

  // 2. Add Timeline event with full cross-entity linking
  const statusLabels: Record<string, string> = {
    done: 'выполнена',
    in_progress: 'взята в работу',
    rescheduled: 'перенесена',
    cancelled: 'отменена',
    open: 'открыта заново',
  };
  const label = statusLabels[newStatus] || newStatus;

  // Resolve cross-entity links if missing
  let resolvedStudentId = target.studentId;
  let resolvedStudentName = target.studentName;
  let resolvedParentId = target.parentId;
  let resolvedParentName = target.parentName;
  const allStudents = typeof window !== 'undefined' ? getStoredStudents() : INITIAL_STUDENTS;

  if (resolvedStudentId && (!resolvedParentId || !resolvedParentName)) {
    const st = allStudents.find((s) => String(s.id) === String(resolvedStudentId));
    if (st && st.parents && st.parents.length > 0) {
      if (!resolvedParentId) resolvedParentId = st.parents[0].id;
      if (!resolvedParentName) resolvedParentName = `${st.parents[0].firstName} ${st.parents[0].lastName}`.trim();
    }
  } else if (resolvedParentId && (!resolvedStudentId || !resolvedStudentName)) {
    for (const st of allStudents) {
      const p = st.parents?.find((pr) => String(pr.id) === String(resolvedParentId));
      if (p) {
        if (!resolvedStudentId) resolvedStudentId = st.id;
        if (!resolvedStudentName) resolvedStudentName = `${st.firstName} ${st.lastName}`.trim();
        break;
      }
    }
  }

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const formattedDateTime = `${dateStr}, ${timeStr}`;

  // Formatted exact timeline strings per spec
  let taskContent = `Задача «${target.title}» отмечена как ${label}.`;
  if (newStatus === 'done') {
    if (completionResult && completionResult.trim()) {
      taskContent = `Задача закрыта: ${target.title} · Результат: ${completionResult.trim()}`;
    } else {
      taskContent = `Задача выполнена: ${target.title}. Выполнил: ${performerName}`;
    }
  } else if (isRescheduled) {
    const formattedNewDate = dueDateFormatted;
    taskContent = `Срок задачи "${target.title}" изменен на ${formattedNewDate}.${rescheduledReason ? ` Причина: ${rescheduledReason.trim()}` : ''}`;
  }

  const timelineItem: TimelineInteraction = {
    id: `int_task_status_${Date.now()}`,
    studentId: resolvedStudentId,
    studentName: resolvedStudentName,
    parentId: resolvedParentId,
    parentName: resolvedParentName,
    occurredAt: formattedDateTime,
    createdAt: nowIso,
    channel: 'other',
    type: 'status_change',
    author: performerName,
    content: taskContent,
    result: options?.completionResult || options?.result || options?.comment || (newStatus === 'done' ? (completionResult || 'Задача выполнена') : undefined),
    targetType: target.parentId ? 'parent' : 'student',
    targetName: target.parentId ? (resolvedParentName || 'Родитель') : (resolvedStudentName || 'Ученик'),
    targetRole: target.parentId ? 'Родитель' : 'Ученик',
  };

  (timelineItem as any).leadId = target.leadId;
  (timelineItem as any).leadName = target.leadName;

  saveInteractionToStorage(timelineItem);

  // 3. Dispatch events
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crm-tasks-changed', { detail: updatedTask }));
    window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed', { detail: timelineItem }));
    window.dispatchEvent(new CustomEvent('crm-notifications-changed', { detail: updatedTask }));
  }

  // 4. Notify Owner on task completion or rescheduling
  notifyOwnerOnTaskStatusChange({
    title: target.title,
    performedBy: options?.performedBy || 'Администратор',
    oldStatus,
    newStatus,
    studentName: resolvedStudentName || target.studentName,
    parentName: resolvedParentName || target.parentName,
    leadName: target.leadName,
    comment: options?.comment,
  }).catch(() => {});

  return updatedTask;
}

/**
 * Gets tasks associated with a specific student (and their parents).
 */
export async function getTasksForStudent(studentId: string): Promise<FullTaskData[]> {
  const allStudents = typeof window !== 'undefined' ? getStoredStudents() : INITIAL_STUDENTS;
  const st = allStudents.find((s) => String(s.id) === String(studentId));
  const parentIds = new Set(st?.parents?.map((p) => String(p.id)) || []);

  const tasks = await getStoredTasks();
  return tasks.filter((t) => 
    (t.studentId && String(t.studentId) === String(studentId)) || 
    (t.parentId && parentIds.has(String(t.parentId)))
  );
}

/**
 * Gets tasks associated with a parent and all their children.
 */
export async function getTasksForParent(parentId: string): Promise<FullTaskData[]> {
  const allStudents = typeof window !== 'undefined' ? getStoredStudents() : INITIAL_STUDENTS;
  const familyChildIds = new Set(
    allStudents
      .filter((s) => s.parents?.some((p) => String(p.id) === String(parentId)))
      .map((s) => String(s.id))
  );

  const tasks = await getStoredTasks();
  return tasks.filter((t) => 
    (t.parentId && String(t.parentId) === String(parentId)) || 
    (t.studentId && familyChildIds.has(String(t.studentId)))
  );
}

/**
 * Gets tasks associated with a lead (including converted student).
 */
export async function getTasksForLead(leadId: string): Promise<FullTaskData[]> {
  let convertedStudentId: string | undefined;
  if (typeof window !== 'undefined') {
    try {
      const storedLeads = localStorage.getItem('crm_leads_v2');
      const leads = storedLeads ? JSON.parse(storedLeads) : INITIAL_LEADS;
      const found = leads.find((l: any) => l.id === leadId);
      if (found) convertedStudentId = found.convertedStudentId;
    } catch {}
  }

  const tasks = await getStoredTasks();
  return tasks.filter((t) => t.leadId === leadId || (convertedStudentId && t.studentId === convertedStudentId));
}

/**
 * Computes today's operational task summary for reports & dashboards.
 */
export async function getTodayTaskSummary(): Promise<{
  totalToday: number;
  completedToday: number;
  rescheduledToday: number;
  overdueToday: number;
  openToday: number;
  tasksList: FullTaskData[];
}> {
  const tasks = await getStoredTasks();
  const todayStr = new Date().toISOString().slice(0, 10);

  const todayTasks = tasks.filter((t) => t.dueDate === todayStr);
  const overdueTasks = tasks.filter((t) => t.status === 'open' && t.dueDate && t.dueDate < todayStr);
  const completedToday = tasks.filter((t) => t.status === 'done' && t.dueDate === todayStr);

  return {
    totalToday: todayTasks.length,
    completedToday: completedToday.length,
    rescheduledToday: tasks.filter((t) => (t as any).isRescheduled && t.dueDate === todayStr).length,
    overdueToday: overdueTasks.length,
    openToday: todayTasks.filter((t) => t.status === 'open').length,
    tasksList: tasks,
  };
}
