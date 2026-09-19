'use client';

import { FullTaskData, TimelineInteraction, INITIAL_STUDENTS, INITIAL_LEADS } from './mockData';
import { getStoredTasks, saveTaskToStorage } from './taskStorage';
import { getStoredStudents } from './studentStorage';
import { saveInteractionToStorage } from './timelineStorage';
import { notifyAdminOnTaskAssigned, notifyOwnerOnTaskStatusChange } from '@/lib/telegram/botNotifier';

export interface CreateTaskOptions {
  title: string;
  taskType?: FullTaskData['taskType'];
  priority?: FullTaskData['priority'];
  dueDate?: string;
  dueDateFormatted?: string;
  description?: string;
  assignedTo?: string;
  studentId?: string;
  studentName?: string;
  parentId?: string;
  parentName?: string;
  leadId?: string;
  leadName?: string;
  createdByRole?: string;
  createdByName?: string;
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
    dueDate,
    dueDateFormatted,
    status: 'open',
    priority: options.priority || 'medium',
    description: options.description || undefined,
  };

  // 4. Save to Storage (localStorage + Supabase fire-and-forget)
  saveTaskToStorage(newTask);

  // 5. Create cross-entity Timeline interaction
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

  // 6. Notify windows
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crm-tasks-changed', { detail: newTask }));
    window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed', { detail: timelineItem }));
  }

  // 7. Telegram Bot notification (if task created by Owner/Leader, notify Admin)
  if (options.createdByRole === 'owner' || options.createdByRole === 'developer') {
    notifyAdminOnTaskAssigned({
      title: newTask.title,
      assignedBy: options.createdByName || 'Руководитель школы',
      assignedTo: newTask.assignedTo,
      dueDate: dueDateFormatted,
      priority: newTask.priority,
      studentName,
      parentName,
      leadName,
      description: options.description,
    }).catch(() => {});
  }

  return newTask;
}

/**
 * Updates task status (done, rescheduled, open, etc.) with real-time sync & timeline recording.
 */
export async function updateUnifiedTaskStatus(
  taskId: string,
  newStatus: FullTaskData['status'],
  options?: {
    comment?: string;
    newDueDate?: string;
    performedBy?: string;
    userRole?: string;
  }
): Promise<FullTaskData | null> {
  const tasks = typeof window !== 'undefined' ? await getStoredTasks() : [];
  const target = tasks.find((t) => t.id === taskId);
  if (!target) return null;

  const oldStatus = target.status;
  const performerName = options?.performedBy || target.assignedTo || 'Администратор';

  const updatedTask: FullTaskData = {
    ...target,
    status: newStatus,
    dueDate: options?.newDueDate || target.dueDate,
    dueDateFormatted: options?.newDueDate
      ? (options.newDueDate.includes('-') ? options.newDueDate.split('-').reverse().join('.') : options.newDueDate)
      : target.dueDateFormatted,
    completedAt: newStatus === 'done' ? new Date().toISOString() : (newStatus === 'open' ? undefined : target.completedAt),
    completedBy: newStatus === 'done' ? performerName : (newStatus === 'open' ? undefined : target.completedBy),
    result: options?.comment && newStatus === 'done' ? options.comment : target.result,
    rescheduledReason: options?.newDueDate && options?.comment ? options.comment : (target as any).rescheduledReason,
  };

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
    if (options?.comment && options.comment.trim()) {
      taskContent = `Задача закрыта: ${target.title} · Результат: ${options.comment.trim()}`;
    } else {
      taskContent = `Задача выполнена: ${target.title}. Выполнил: ${performerName}`;
    }
  } else if (options?.newDueDate) {
    const formattedNewDate = options.newDueDate.includes('-')
      ? options.newDueDate.split('-').reverse().join('.')
      : options.newDueDate;
    taskContent = `Срок задачи "${target.title}" изменен на ${formattedNewDate}.${options.comment ? ` Причина: ${options.comment.trim()}` : ''}`;
  }

  const timelineItem: TimelineInteraction = {
    id: `int_task_status_${Date.now()}`,
    studentId: resolvedStudentId,
    studentName: resolvedStudentName,
    parentId: resolvedParentId,
    parentName: resolvedParentName,
    occurredAt: formattedDateTime,
    createdAt: now.toISOString(),
    channel: 'other',
    type: 'status_change',
    author: performerName,
    content: taskContent,
    result: options?.comment || (newStatus === 'done' ? 'Задача выполнена' : undefined),
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
