'use client';

export interface TelegramNotificationPayload {
  recipient: 'admin' | 'owner' | 'both';
  title: string;
  message: string;
  taskDetails?: {
    id?: string;
    title: string;
    dueDate?: string;
    assignedTo?: string;
    priority?: string;
    status?: string;
    studentName?: string;
    parentName?: string;
    leadName?: string;
  };
  customChatId?: string;
  botToken?: string;
}

/**
 * Sends telegram alert through the backend route.
 * Automatically pulls configured bot token and chat IDs from localStorage or server env.
 */
export async function sendTelegramNotification(payload: TelegramNotificationPayload): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: 'SSR environment' };

  try {
    const botToken = payload.botToken || localStorage.getItem('crm_tg_bot_token') || '';
    const adminChatId = localStorage.getItem('crm_tg_admin_chat_id') || localStorage.getItem('crm_tg_chat_id') || '';
    const ownerChatId = localStorage.getItem('crm_tg_owner_chat_id') || localStorage.getItem('crm_tg_chat_id') || '';

    // Check if notifications are enabled
    const tgEnabled = localStorage.getItem('crm_tg_notifications_enabled') !== 'false';
    if (!tgEnabled && !payload.botToken) {
      return { success: true }; // Silently skip if disabled
    }

    const res = await fetch('/api/telegram/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        botToken: botToken || undefined,
        adminChatId: adminChatId || undefined,
        ownerChatId: ownerChatId || undefined,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('Failed to send Telegram notification:', err);
    return { success: false, error: err?.message || 'Network error' };
  }
}

/**
 * Notifies Administrator when a task or lead is assigned by the Leader/Owner.
 */
export async function notifyAdminOnTaskAssigned(params: {
  title: string;
  assignedBy: string;
  assignedTo: string;
  dueDate: string;
  priority: string;
  studentName?: string;
  parentName?: string;
  leadName?: string;
  description?: string;
}) {
  const priorityEmoji = params.priority === 'high' ? '🔥' : params.priority === 'medium' ? '⚡' : '📝';
  const entityInfo = params.studentName
    ? `🎓 *Ученик:* ${params.studentName}`
    : params.leadName
    ? `🎯 *Лид:* ${params.leadName}`
    : params.parentName
    ? `👨‍👩‍👧 *Родитель:* ${params.parentName}`
    : '';

  const message = `📌 *НОВАЯ ЗАДАЧА ОТ РУКОВОДИТЕЛЯ*

${priorityEmoji} *Заголовок:* ${params.title}
👤 *Поручил:* ${params.assignedBy}
🎯 *Исполнитель:* ${params.assignedTo}
📅 *Срок выполнения:* ${params.dueDate}
${entityInfo ? `${entityInfo}\n` : ''}${params.description ? `💬 *Описание:* ${params.description}\n` : ''}
⚡ _Пожалуйста, возьмите задачу в работу._`;

  return sendTelegramNotification({
    recipient: 'admin',
    title: 'Новая задача от руководителя',
    message,
    taskDetails: {
      title: params.title,
      dueDate: params.dueDate,
      assignedTo: params.assignedTo,
      priority: params.priority,
      status: 'open',
      studentName: params.studentName,
      parentName: params.parentName,
      leadName: params.leadName,
    },
  });
}

/**
 * Notifies Owner/Leader when a task status changes (completed, cancelled, or rescheduled).
 */
export async function notifyOwnerOnTaskStatusChange(params: {
  title: string;
  performedBy: string;
  oldStatus: string;
  newStatus: string;
  studentName?: string;
  parentName?: string;
  leadName?: string;
  comment?: string;
}) {
  const statusLabels: Record<string, string> = {
    done: '✅ Выполнено',
    in_progress: '⏳ В работе',
    rescheduled: '🗓 Перенесено',
    cancelled: '❌ Отменено',
    open: '📌 Открыто заново',
  };

  const statusLabel = statusLabels[params.newStatus] || params.newStatus;
  const entityInfo = params.studentName
    ? `🎓 *Ученик:* ${params.studentName}`
    : params.leadName
    ? `🎯 *Лид:* ${params.leadName}`
    : params.parentName
    ? `👨‍👩‍👧 *Родитель:* ${params.parentName}`
    : '';

  const message = `🔔 *ОБНОВЛЕНИЕ СТАТУСА ЗАДАЧИ*

📌 *Задача:* ${params.title}
📊 *Новый статус:* *${statusLabel}*
👤 *Сотрудник:* ${params.performedBy}
${entityInfo ? `${entityInfo}\n` : ''}${params.comment ? `💬 *Комментарий:* ${params.comment}\n` : ''}
⏱ _Время фиксации: ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}_`;

  return sendTelegramNotification({
    recipient: 'owner',
    title: 'Обновление статуса задачи',
    message,
    taskDetails: {
      title: params.title,
      status: params.newStatus,
      studentName: params.studentName,
      parentName: params.parentName,
      leadName: params.leadName,
    },
  });
}

/**
 * Notifies Owner/Leader regarding today's overdue/missed tasks.
 */
export async function notifyOwnerOnOverdueTasks(overdueTasks: Array<{
  title: string;
  assignedTo: string;
  dueDate: string;
  studentName?: string;
  leadName?: string;
}>) {
  if (overdueTasks.length === 0) return { success: true };

  const taskList = overdueTasks
    .slice(0, 5)
    .map((t, idx) => `${idx + 1}. *${t.title}* (${t.assignedTo}) — ${t.studentName || t.leadName || 'Без привязки'}`)
    .join('\n');

  const message = `⚠️ *ВНИМАНИЕ РУКОВОДИТЕЛЮ: ПРОСРОЧЕННЫЕ ЗАДАЧИ*

Всего невыполненных задач с истекшим сроком: *${overdueTasks.length}*

${taskList}${overdueTasks.length > 5 ? `\n...и ещё ${overdueTasks.length - 5} задач` : ''}

🔍 _Рекомендуется провести контроль исполнительской дисциплины._`;

  return sendTelegramNotification({
    recipient: 'owner',
    title: 'Просроченные задачи',
    message,
  });
}
