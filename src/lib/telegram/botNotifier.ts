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

/**
 * Notifies Administrator regarding an upcoming payment deadline.
 */
export async function notifyAdminOnUpcomingPayment(params: {
  studentName: string;
  parentName?: string;
  parentPhone?: string;
  courseName: string;
  amountFormatted: string;
  dueDate: string;
  daysRemaining: number;
}) {
  const urgencyEmoji = params.daysRemaining <= 1 ? '🚨' : params.daysRemaining <= 3 ? '⏳' : '📅';
  const timeLabel =
    params.daysRemaining <= 0
      ? '*Срок оплаты сегодня!*'
      : params.daysRemaining === 1
      ? '*Срок оплаты завтра!*'
      : `*Осталось дней: ${params.daysRemaining}*`;

  const message = `${urgencyEmoji} *НАПОМИНАНИЕ АДМИНИСТРАТОРУ: СРОК ОПЛАТЫ*

🎓 *Ученик:* ${params.studentName}
📚 *Курс:* ${params.courseName}
💰 *Сумма к оплате:* *${params.amountFormatted}*
📅 *Дата платежа:* ${params.dueDate} (${timeLabel})
${params.parentName ? `👨‍👩‍👧 *Родитель:* ${params.parentName}\n` : ''}${params.parentPhone ? `📞 *Телефон:* ${params.parentPhone}\n` : ''}
⚡ _Свяжитесь с родителем для подтверждения продления абонемента._`;

  return sendTelegramNotification({
    recipient: 'admin',
    title: 'Подходящий срок оплаты',
    message,
  });
}

/**
 * Sends a summary digest of all upcoming payments to administrators via Telegram bot.
 */
export async function sendUpcomingPaymentsDigestToTelegram(items: Array<{
  studentName: string;
  courseName: string;
  amountFormatted: string;
  dueDate: string;
  daysRemaining: number;
}>) {
  if (items.length === 0) return { success: true };

  const list = items
    .slice(0, 7)
    .map((item, idx) => `${idx + 1}. *${item.studentName}* (${item.courseName}) — *${item.amountFormatted}* (срок: ${item.dueDate})`)
    .join('\n');

  const totalSum = items.reduce((sum, i) => {
    const num = parseFloat(i.amountFormatted.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    return sum + num;
  }, 0);

  const message = `🔔 *СВОДКА АДМИНИСТРАТОРУ: ПРИБЛИЖАЮЩИЕСЯ ОПЛАТЫ*

Всего оплат к сбору в ближайшие дни: *${items.length}*
💰 Ожидаемая сумма поступлений: *${totalSum.toLocaleString('ru-RU')} ₽*

${list}${items.length > 7 ? `\n...и ещё ${items.length - 7} платежей` : ''}

📲 _Рекомендуется отправить ссылки на оплату и напомнить родителям о продлении абонементов._`;

  return sendTelegramNotification({
    recipient: 'admin',
    title: 'Сводка приближающихся оплат',
    message,
  });
}
