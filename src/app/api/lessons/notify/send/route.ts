import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export type NotificationType = 'schedule' | 'reschedule' | 'attendance_report' | 'homework';

interface RecipientData {
  studentId: string;
  studentName: string;
  parentName?: string;
  email?: string;
  telegram?: string;
  channel?: 'email' | 'telegram' | 'both';
  attendanceStatus?: string;
  studentNote?: string;
}

interface NotificationPayload {
  type: NotificationType;
  groupName: string;
  courseName?: string;
  lessonDate: string;
  lessonTime?: string;
  room?: string;
  onlineMeetingUrl?: string;
  teacherName: string;
  topic?: string;
  homework?: string;
  deadline?: string;
  rescheduleInfo?: {
    previousDate: string;
    previousTime: string;
    newDate: string;
    newTime: string;
    reason?: string;
  };
  customMessage?: string;
  schoolName?: string;
  recipients: RecipientData[];
}

function buildTelegramMarkdown(payload: NotificationPayload, recipient: RecipientData): string {
  const {
    type,
    groupName,
    lessonDate,
    lessonTime,
    room,
    onlineMeetingUrl,
    teacherName,
    topic,
    homework,
    deadline,
    rescheduleInfo,
    customMessage,
    schoolName = 'School CRM',
  } = payload;

  const parentGreeting = recipient.parentName
    ? `Здравствуйте, *${recipient.parentName}*!`
    : `Здравствуйте, *${recipient.studentName}*!`;

  if (type === 'homework') {
    return [
      `📚 *Домашнее задание*`,
      parentGreeting,
      ``,
      `👤 *Ученик:* ${recipient.studentName}`,
      `👥 *Группа:* ${groupName}`,
      `👨‍🏫 *Преподаватель:* ${teacherName}`,
      `📅 *Дата занятия:* ${lessonDate}`,
      topic ? `🎯 *Тема:* ${topic}` : '',
      ``,
      `📝 *Задание:*`,
      homework || 'Выполнить задания по пройденной теме',
      deadline ? `⏰ *Срок выполнения:* ${deadline}` : '',
      customMessage ? `💬 *Комментарий преподавателя:* ${customMessage}` : '',
      ``,
      `🏫 _${schoolName}_`,
    ].filter(Boolean).join('\n');
  }

  if (type === 'schedule') {
    return [
      `📅 *Напоминание о занятии*`,
      parentGreeting,
      ``,
      `👤 *Ученик:* ${recipient.studentName}`,
      `👥 *Группа:* ${groupName}`,
      `📅 *Дата и время:* ${lessonDate} ${lessonTime ? `(${lessonTime})` : ''}`,
      `👨‍🏫 *Преподаватель:* ${teacherName}`,
      `📍 *Место:* ${room || 'Онлайн'}`,
      onlineMeetingUrl ? `🔗 *Ссылка на урок:* ${onlineMeetingUrl}` : '',
      topic ? `🎯 *Тема:* ${topic}` : '',
      ``,
      `🏫 _${schoolName}_`,
    ].filter(Boolean).join('\n');
  }

  if (type === 'reschedule') {
    return [
      `⚠️ *Внимание: Перенос занятия!*`,
      parentGreeting,
      ``,
      `👤 *Ученик:* ${recipient.studentName}`,
      `👥 *Группа:* ${groupName}`,
      `❌ *Прежнее время:* ${rescheduleInfo?.previousDate || '—'} (${rescheduleInfo?.previousTime || '—'})`,
      `✨ *Новое время:* ${rescheduleInfo?.newDate || lessonDate} (${rescheduleInfo?.newTime || lessonTime || ''})`,
      rescheduleInfo?.reason ? `💬 *Причина:* ${rescheduleInfo.reason}` : '',
      `👨‍🏫 *Преподаватель:* ${teacherName}`,
      ``,
      `🏫 _${schoolName}_`,
    ].filter(Boolean).join('\n');
  }

  // Attendance report
  return [
    `📊 *Отчёт о посещаемости*`,
    parentGreeting,
    ``,
    `👤 *Ученик:* ${recipient.studentName}`,
    `👥 *Группа:* ${groupName}`,
    `📅 *Дата:* ${lessonDate}`,
    `📌 *Статус:* ${recipient.attendanceStatus === 'present' ? '✅ Присутствовал(а)' : recipient.attendanceStatus === 'rescheduled' ? '🔄 Перенос' : '❌ Пропуск'}`,
    recipient.studentNote ? `💬 *Комментарий преподавателя:* ${recipient.studentNote}` : '',
    topic ? `🎯 *Тема:* ${topic}` : '',
    homework ? `📝 *Домашнее задание:* ${homework}` : '',
    ``,
    `🏫 _${schoolName}_`,
  ].filter(Boolean).join('\n');
}

function buildEmailHtml(payload: NotificationPayload, recipient: RecipientData): { subject: string; html: string; text: string } {
  const {
    type,
    groupName,
    courseName,
    lessonDate,
    lessonTime,
    room,
    onlineMeetingUrl,
    teacherName,
    topic,
    homework,
    deadline,
    rescheduleInfo,
    customMessage,
    schoolName = 'School CRM',
  } = payload;

  const parentGreeting = recipient.parentName
    ? `Здравствуйте, ${recipient.parentName}!`
    : `Здравствуйте, ${recipient.studentName}!`;

  let subject = '';
  let title = '';
  let badgeText = '';
  let bannerColor = 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)';
  let mainContentHtml = '';
  let textFallback = '';

  if (type === 'schedule') {
    subject = `📅 Напоминание о занятии: ${groupName} (${lessonDate} в ${lessonTime || ''})`;
    title = '📅 Информация о занятии';
    badgeText = 'Расписание уроков';
    bannerColor = 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)';

    mainContentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #0f172a;">${parentGreeting}</p>
      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
        Напоминаем о предстоящем занятии ученика <strong>${recipient.studentName}</strong> в группе <strong>${groupName}</strong>.
      </p>

      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 16px 20px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="5">
              <tr>
                <td width="35%" style="font-size: 13px; color: #64748b; font-weight: 500;">📅 Дата и время:</td>
                <td style="font-size: 14px; color: #1e40af; font-weight: 700;">${lessonDate} ${lessonTime ? `(${lessonTime})` : ''}</td>
              </tr>
              <tr>
                <td style="font-size: 13px; color: #64748b; font-weight: 500;">👨‍🏫 Преподаватель:</td>
                <td style="font-size: 13px; color: #0f172a; font-weight: 600;">${teacherName}</td>
              </tr>
              <tr>
                <td style="font-size: 13px; color: #64748b; font-weight: 500;">📍 Место / Аудитория:</td>
                <td style="font-size: 13px; color: #0f172a; font-weight: 600;">${room || 'Онлайн'}</td>
              </tr>
              ${topic ? `
              <tr>
                <td style="font-size: 13px; color: #64748b; font-weight: 500;">🎯 Планируемая тема:</td>
                <td style="font-size: 13px; color: #0f172a; font-weight: 600;">${topic}</td>
              </tr>
              ` : ''}
            </table>
          </td>
        </tr>
      </table>

      ${onlineMeetingUrl ? `
      <div style="background-color: #eef2ff; border: 1px solid #c7d2fe; border-radius: 10px; padding: 16px; margin-bottom: 20px; text-align: center;">
        <div style="font-size: 13px; font-weight: 700; color: #3730a3; margin-bottom: 8px;">🔗 Ссылка для онлайн-подключения:</div>
        <a href="${onlineMeetingUrl}" target="_blank" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 700;">
          Войти в онлайн-класс
        </a>
      </div>
      ` : ''}
    `;

    textFallback = `Напоминание о занятии ${groupName}\nУченик: ${recipient.studentName}\nДата: ${lessonDate} ${lessonTime || ''}\nПреподаватель: ${teacherName}\nМесто: ${room || 'Онлайн'}`;
  } else if (type === 'reschedule') {
    subject = `⚠️ Перенос занятия: ${groupName} (Новая дата: ${rescheduleInfo?.newDate || lessonDate})`;
    title = '⚠️ Уведомление о переносе занятия';
    badgeText = 'Изменение в расписании';
    bannerColor = 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)';

    mainContentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #0f172a;">${parentGreeting}</p>
      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
        Обращаем ваше внимание, что занятие группы <strong>${groupName}</strong> для ученика <strong>${recipient.studentName}</strong> перенесено.
      </p>

      <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 5px solid #d97706; border-radius: 10px; padding: 18px; margin-bottom: 20px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="4">
          <tr>
            <td width="35%" style="font-size: 13px; color: #92400e; font-weight: 600;">Прежнее время:</td>
            <td style="font-size: 13px; color: #b45309; text-decoration: line-through;">${rescheduleInfo?.previousDate || '—'} (${rescheduleInfo?.previousTime || '—'})</td>
          </tr>
          <tr>
            <td style="font-size: 13px; color: #92400e; font-weight: 700;">✨ Новая дата и время:</td>
            <td style="font-size: 14px; color: #78350f; font-weight: 800;">${rescheduleInfo?.newDate || lessonDate} (${rescheduleInfo?.newTime || lessonTime || ''})</td>
          </tr>
          ${rescheduleInfo?.reason ? `
          <tr>
            <td style="font-size: 13px; color: #92400e; font-weight: 600;">Причина переноса:</td>
            <td style="font-size: 13px; color: #451a03; font-style: italic;">${rescheduleInfo.reason}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="font-size: 13px; color: #92400e; font-weight: 600;">Преподаватель:</td>
            <td style="font-size: 13px; color: #451a03; font-weight: 600;">${teacherName}</td>
          </tr>
        </table>
      </div>
    `;

    textFallback = `Перенос занятия ${groupName}\nУченик: ${recipient.studentName}\nНовое время: ${rescheduleInfo?.newDate || lessonDate} (${rescheduleInfo?.newTime || lessonTime || ''})\nПреподаватель: ${teacherName}`;
  } else if (type === 'attendance_report') {
    const isPresent = recipient.attendanceStatus === 'present';
    const isRescheduled = recipient.attendanceStatus === 'rescheduled';

    subject = `📊 Отчёт о занятии: ${groupName} (${lessonDate})`;
    title = '📊 Отчёт о прошедшем занятии';
    badgeText = 'Отчёт по уроку';
    bannerColor = 'linear-gradient(135deg, #059669 0%, #10b981 100%)';

    mainContentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #0f172a;">${parentGreeting}</p>
      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
        Направляем отчёт о прошедшем уроке ученика <strong>${recipient.studentName}</strong> в группе <strong>${groupName}</strong>.
      </p>

      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 16px 20px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="5">
              <tr>
                <td width="35%" style="font-size: 13px; color: #64748b; font-weight: 500;">📅 Дата урока:</td>
                <td style="font-size: 13px; color: #0f172a; font-weight: 600;">${lessonDate}</td>
              </tr>
              <tr>
                <td style="font-size: 13px; color: #64748b; font-weight: 500;">📌 Статус посещения:</td>
                <td style="font-size: 13px; font-weight: 700; color: ${isPresent ? '#059669' : isRescheduled ? '#d97706' : '#dc2626'};">
                  ${isPresent ? '✅ Присутствовал(а)' : isRescheduled ? '🔄 Перенос занятия' : '❌ Пропуск занятия'}
                </td>
              </tr>
              ${topic ? `
              <tr>
                <td style="font-size: 13px; color: #64748b; font-weight: 500;">🎯 Тема урока:</td>
                <td style="font-size: 13px; color: #0f172a; font-weight: 600;">${topic}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="font-size: 13px; color: #64748b; font-weight: 500;">👨‍🏫 Преподаватель:</td>
                <td style="font-size: 13px; color: #0f172a; font-weight: 600;">${teacherName}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      ${recipient.studentNote ? `
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #1d4ed8; margin-bottom: 6px;">
          💬 Комментарий преподавателя к уроку:
        </div>
        <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #1e3a8a;">
          ${recipient.studentNote}
        </p>
      </div>
      ` : ''}

      ${homework ? `
      <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #a16207; margin-bottom: 6px;">
          📝 Домашнее задание:
        </div>
        <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #713f12; white-space: pre-line;">
          ${homework}
        </p>
      </div>
      ` : ''}
    `;

    textFallback = `Отчёт по уроку ${groupName} от ${lessonDate}\nУченик: ${recipient.studentName}\nСтатус: ${isPresent ? 'Присутствовал' : 'Отсутствовал'}\nПреподаватель: ${teacherName}${recipient.studentNote ? `\nКомментарий: ${recipient.studentNote}` : ''}`;
  } else {
    // homework
    subject = `📚 Домашнее задание: ${groupName} (${lessonDate})`;
    title = '📚 Домашнее задание к следующему уроку';
    badgeText = 'Домашнее задание';
    bannerColor = 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)';

    mainContentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #0f172a;">${parentGreeting}</p>
      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
        Направляем домашнее задание для ученика <strong>${recipient.studentName}</strong> по группе <strong>${groupName}</strong>.
      </p>

      <div style="background-color: #eef2ff; border: 1px solid #c7d2fe; border-left: 5px solid #4f46e5; border-radius: 10px; padding: 18px; margin-bottom: 20px;">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #3730a3; margin-bottom: 8px;">
          📖 Текст домашнего задания:
        </div>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #1e1b4b; white-space: pre-line; font-weight: 500;">
          ${homework || 'Выполнить задания по пройденной теме.'}
        </p>
        ${deadline ? `
        <div style="margin-top: 12px; font-size: 12px; color: #4338ca; font-weight: 600;">
          ⏰ Срок сдачи: ${deadline}
        </div>
        ` : ''}
      </div>

      ${topic ? `
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 14px 18px;">
            <span style="font-size: 12px; color: #64748b; font-weight: 500;">🎯 Пройденная тема на занятии: </span>
            <strong style="font-size: 13px; color: #0f172a;">${topic}</strong>
          </td>
        </tr>
      </table>
      ` : ''}

      ${customMessage ? `
      <div style="background-color: #f1f5f9; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
        <span style="font-size: 12px; font-weight: 600; color: #475569;">Преподаватель ${teacherName}: </span>
        <span style="font-size: 12px; color: #334155; font-style: italic;">«${customMessage}»</span>
      </div>
      ` : ''}
    `;

    textFallback = `Домашнее задание ${groupName}\nУченик: ${recipient.studentName}\nЗадание: ${homework}\nСрок: ${deadline || 'К следующему занятию'}\nПреподаватель: ${teacherName}`;
  }

  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
          
          <!-- Banner Header -->
          <tr>
            <td style="background: ${bannerColor}; padding: 28px 32px; color: #ffffff;">
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.85); margin-bottom: 6px;">
                ${schoolName} • ${badgeText}
              </div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                ${title}
              </h1>
              <div style="font-size: 13px; color: rgba(255,255,255,0.9); margin-top: 6px;">
                Группа: <strong>${groupName}</strong> ${courseName ? `• ${courseName}` : ''}
              </div>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 30px 32px 20px 32px;">
              ${mainContentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 18px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #64748b;">
                ${schoolName}
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                Это автоматическое сервисное уведомление по обучению. При возникновении вопросов свяжитесь с администрацией школы.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html, text: textFallback };
}

export async function POST(req: NextRequest) {
  try {
    const payload: NotificationPayload = await req.json();
    const { recipients = [] } = payload;

    const validRecipients = recipients.filter(
      (r) => (r.email && r.email.includes('@')) || (r.telegram && r.telegram.trim().length > 1)
    );

    if (validRecipients.length === 0) {
      return NextResponse.json(
        { error: 'Не указано ни одного корректного адреса (Email или Telegram) получателя' },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'School CRM <onboarding@resend.dev>';
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;

    const results: Array<{
      recipient: string;
      studentName: string;
      channel: string;
      success: boolean;
      error?: string;
      messageId?: string;
    }> = [];

    for (const rec of validRecipients) {
      const isTelegramPref = rec.channel === 'telegram' || (!rec.email && rec.telegram);
      const isEmailPref = rec.channel === 'email' || (!rec.telegram && rec.email);
      const isBoth = rec.channel === 'both' || (!rec.channel && rec.email && rec.telegram);

      // 1. Send via Email if applicable
      if ((isEmailPref || isBoth) && rec.email && rec.email.includes('@')) {
        const { subject, html, text } = buildEmailHtml(payload, rec);

        if (resendApiKey) {
          try {
            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: fromEmail,
                to: [rec.email.trim()],
                subject,
                text,
                html,
              }),
            });

            const resData = await res.json();

            if (!res.ok) {
              results.push({
                recipient: rec.email,
                studentName: rec.studentName,
                channel: 'email',
                success: false,
                error: resData.message || 'Ошибка Resend API',
              });
            } else {
              results.push({
                recipient: rec.email,
                studentName: rec.studentName,
                channel: 'email',
                success: true,
                messageId: resData.id,
              });
            }
          } catch (e: any) {
            results.push({
              recipient: rec.email,
              studentName: rec.studentName,
              channel: 'email',
              success: false,
              error: e.message || 'Сетевая ошибка при отправке email',
            });
          }
        } else {
          // Dev fallback simulation
          results.push({
            recipient: rec.email,
            studentName: rec.studentName,
            channel: 'email',
            success: true,
            messageId: `mock_email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          });
        }
      }

      // 2. Send via Telegram if applicable
      if ((isTelegramPref || isBoth) && rec.telegram) {
        const tgMessage = buildTelegramMarkdown(payload, rec);

        if (telegramBotToken) {
          try {
            // If chatId looks numeric or handle provided
            const chatId = rec.telegram.replace(/^@/, '');
            const tgRes = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: tgMessage,
                parse_mode: 'Markdown',
              }),
            });

            const tgData = await tgRes.json();
            if (!tgRes.ok || !tgData.ok) {
              results.push({
                recipient: rec.telegram,
                studentName: rec.studentName,
                channel: 'telegram',
                success: false,
                error: tgData.description || 'Ошибка Telegram API',
              });
            } else {
              results.push({
                recipient: rec.telegram,
                studentName: rec.studentName,
                channel: 'telegram',
                success: true,
                messageId: String(tgData.result?.message_id),
              });
            }
          } catch (e: any) {
            results.push({
              recipient: rec.telegram,
              studentName: rec.studentName,
              channel: 'telegram',
              success: false,
              error: e.message || 'Сетевая ошибка при отправке Telegram',
            });
          }
        } else {
          // Dev fallback simulation
          results.push({
            recipient: rec.telegram,
            studentName: rec.studentName,
            channel: 'telegram',
            success: true,
            messageId: `mock_tg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          });
        }
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: successCount > 0,
      sentCount: successCount,
      failedCount: results.length - successCount,
      results,
      message: `Уведомление успешно отправлено ${successCount} из ${results.length} сообщений!`,
    });
  } catch (err: unknown) {
    console.error('Lesson notification API error:', err);
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
