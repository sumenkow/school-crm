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
    const student = allStudents.find((s) => s.id === studentId);
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
      const p = s.parents?.find((pr) => pr.id === parentId);
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
    const lead = INITIAL_LEADS.find((l) => l.id === leadId);
    if (lead) {
      leadName = lead.name;
      if (!studentId && lead.convertedStudentId) {
        studentId = lead.convertedStudentId;
        const st = allStudents.find((s) => s.id === studentId);
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
  const timeNow = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const timelineItem: TimelineInteraction = {
    id: `int_task_${Date.now()}`,
    studentId,
    studentName,
    parentId,
    parentName,
    occurredAt: `Сегодня, ${timeNow}`,
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
  const updatedTask: FullTaskData = {
    ...target,
    status: newStatus,
    dueDate: options?.newDueDate || target.dueDate,
    dueDateFormatted: options?.newDueDate
      ? new Date(options.newDueDate).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
      : target.dueDateFormatted,
  };

  // 1. Save to Task Storage
  saveTaskToStorage(updatedTask);

  // 2. Add Timeline event
  const statusLabels: Record<string, string> = {
    done: 'выполнена',
    in_progress: 'взята в работу',
    rescheduled: 'перенесена',
    cancelled: 'отменена',
    open: 'открыта заново',
  };
  const label = statusLabels[newStatus] || newStatus;
  const timeNow = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const timelineItem: TimelineInteraction = {
    id: `int_task_status_${Date.now()}`,
    studentId: target.studentId,
    studentName: target.studentName,
    parentId: target.parentId,
    parentName: target.parentName,
    occurredAt: `Сегодня, ${timeNow}`,
    channel: 'other',
    type: 'status_change',
    author: options?.performedBy || 'Администратор',
    content: `Задача «${target.title}» отмечена как ${label}.${options?.comment ? ` Комментарий: ${options.comment}` : ''}${options?.newDueDate ? ` Новый срок: ${updatedTask.dueDateFormatted}` : ''}`,
    result: options?.comment || undefined,
  };

  saveInteractionToStorage(timelineItem);

  // 3. Dispatch events
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crm-tasks-changed', { detail: updatedTask }));
    window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed', { detail: timelineItem }));
  }

  // 4. Notify Owner on task completion or rescheduling
  notifyOwnerOnTaskStatusChange({
    title: target.title,
    performedBy: options?.performedBy || 'Администратор',
    oldStatus,
    newStatus,
    studentName: target.studentName,
    parentName: target.parentName,
    leadName: target.leadName,
    comment: options?.comment,
  }).catch(() => {});

  return updatedTask;
}

/**
 * Gets tasks associated with a specific student.
 */
export async function getTasksForStudent(studentId: string): Promise<FullTaskData[]> {
  const tasks = await getStoredTasks();
  return tasks.filter((t) => t.studentId === studentId);
}

/**
 * Gets tasks associated with a parent and all their children.
 */
export async function getTasksForParent(parentId: string): Promise<FullTaskData[]> {
  const allStudents = typeof window !== 'undefined' ? getStoredStudents() : INITIAL_STUDENTS;
  const familyChildIds = new Set(
    allStudents.filter((s) => s.parents?.some((p) => p.id === parentId)).map((s) => s.id)
  );

  const tasks = await getStoredTasks();
  return tasks.filter((t) => t.parentId === parentId || (t.studentId && familyChildIds.has(t.studentId)));
}

/**
 * Gets tasks associated with a lead.
 */
export async function getTasksForLead(leadId: string): Promise<FullTaskData[]> {
  const tasks = await getStoredTasks();
  return tasks.filter((t) => t.leadId === leadId);
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
