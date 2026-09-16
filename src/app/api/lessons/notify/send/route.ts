import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export type NotificationType = 'schedule' | 'reschedule' | 'attendance_report' | 'homework';

interface RecipientData {
  studentId: string;
  studentName: string;
  parentName?: string;
  email: string;
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

    textFallback = `Внимание! Перенос занятия ${groupName}.\nУченик: ${recipient.studentName}\nНовое время: ${rescheduleInfo?.newDate} ${rescheduleInfo?.newTime}\nПричина: ${rescheduleInfo?.reason || 'По согласованию'}`;
  } else {
    // Attendance Report & Homework
    subject = `📊 Отчет по уроку и ДЗ: ${topic || groupName} (${lessonDate})`;
    title = '📊 Отчет по прошедшему занятию';
    badgeText = 'Отчет преподавателя';
    bannerColor = 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)';

    const statusMap: Record<string, string> = {
      present: '✅ Присутствовал',
      absent: '❌ Отсутствовал',
      excused: '🏥 Болел / Уважительная причина',
      rescheduled: '🔄 Перенос занятия',
    };
    const attLabel = statusMap[recipient.attendanceStatus || 'present'] || '✅ Присутствовал';

    mainContentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #0f172a;">${parentGreeting}</p>
      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
        Направляем вам отчёт преподавателя <strong>${teacherName}</strong> по прошедшему занятию ученика <strong>${recipient.studentName}</strong>.
      </p>

      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 16px 20px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="5">
              <tr>
                <td width="35%" style="font-size: 13px; color: #64748b; font-weight: 500;">📅 Дата урока:</td>
                <td style="font-size: 13px; color: #0f172a; font-weight: 700;">${lessonDate}</td>
              </tr>
              <tr>
                <td style="font-size: 13px; color: #64748b; font-weight: 500;">Посещаемость:</td>
                <td style="font-size: 13px; font-weight: 700; color: ${recipient.attendanceStatus === 'absent' ? '#e11d48' : '#059669'};">${attLabel}</td>
              </tr>
              <tr>
                <td style="font-size: 13px; color: #64748b; font-weight: 500;">🎯 Тема урока:</td>
                <td style="font-size: 13px; color: #0f766e; font-weight: 700;">${topic || 'Учебный план'}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      ${recipient.studentNote ? `
      <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
        <div style="font-size: 13px; font-weight: 700; color: #5b21b6; margin-bottom: 6px;">💬 Комментарий преподавателя к ученику:</div>
        <div style="font-size: 13px; line-height: 1.5; color: #2e1065;">${recipient.studentNote}</div>
      </div>
      ` : ''}

      ${homework ? `
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-left: 5px solid #2563eb; border-radius: 10px; padding: 18px; margin-bottom: 20px;">
        <div style="font-size: 14px; font-weight: 700; color: #1e3a8a; margin-bottom: 8px;">📝 Домашнее задание:</div>
        <div style="font-size: 14px; line-height: 1.6; color: #1e293b;">${homework.replace(/\n/g, '<br />')}</div>
        ${deadline ? `
        <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #bfdbfe; font-size: 13px; color: #1e40af; font-weight: 600;">
          ⏰ Срок выполнения: <strong>${deadline}</strong>
        </div>
        ` : ''}
      </div>
      ` : ''}
    `;

    textFallback = `Отчет по уроку ${groupName}\nУченик: ${recipient.studentName}\nПосещаемость: ${attLabel}\nТема: ${topic || ''}\nДЗ: ${homework || 'не задано'}`;
  }

  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f6f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: ${bannerColor}; padding: 28px 32px; color: #ffffff;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: rgba(255, 255, 255, 0.8); margin-bottom: 6px;">
                ${schoolName} • ${badgeText}
              </div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                ${title}
              </h1>
              <div style="font-size: 13px; color: rgba(255, 255, 255, 0.9); margin-top: 6px;">
                Группа: <strong>${groupName}</strong> ${courseName ? `(${courseName})` : ''}
              </div>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 30px 32px 20px 32px;">
              ${mainContentHtml}

              ${customMessage ? `
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 20px; font-size: 13px; color: #334155;">
                ${customMessage.replace(/\n/g, '<br />')}
              </div>
              ` : ''}

              <p style="margin: 15px 0 0 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                С уважением,<br /><strong>${schoolName}</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <div style="font-size: 12px; color: #94a3b8; line-height: 1.4;">
                Автоматическое уведомление из CRM системы школы.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, html, text: textFallback };
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as NotificationPayload;
    const { recipients = [] } = payload;

    const validRecipients = recipients.filter(
      (r) => r.email && r.email.includes('@') && r.email.trim().length > 3
    );

    if (validRecipients.length === 0) {
      return NextResponse.json(
        { error: 'Не указано ни одного корректного email адреса получателя' },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'School CRM <onboarding@resend.dev>';

    const results: Array<{
      email: string;
      studentName: string;
      success: boolean;
      error?: string;
      messageId?: string;
    }> = [];

    for (const rec of validRecipients) {
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
              email: rec.email,
              studentName: rec.studentName,
              success: false,
              error: resData.message || 'Ошибка Resend API',
            });
          } else {
            results.push({
              email: rec.email,
              studentName: rec.studentName,
              success: true,
              messageId: resData.id,
            });
          }
        } catch (e: any) {
          results.push({
            email: rec.email,
            studentName: rec.studentName,
            success: false,
            error: e.message || 'Сетевая ошибка при отправке',
          });
        }
      } else {
        // Dev fallback simulation
        results.push({
          email: rec.email,
          studentName: rec.studentName,
          success: true,
          messageId: `mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: successCount > 0,
      sentCount: successCount,
      failedCount: results.length - successCount,
      results,
      message: `Уведомление успешно отправлено ${successCount} из ${validRecipients.length} получателей!`,
    });
  } catch (err: unknown) {
    console.error('Lesson notification API error:', err);
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
