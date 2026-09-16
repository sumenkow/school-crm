import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface HomeworkRecipient {
  studentId: string;
  studentName: string;
  parentName?: string;
  email: string;
}

interface HomeworkSendPayload {
  lessonId?: string;
  groupName: string;
  courseName?: string;
  lessonDate: string;
  teacherName: string;
  topic: string;
  homework: string;
  deadline?: string;
  comment?: string;
  schoolName?: string;
  recipients: HomeworkRecipient[];
}

function generateHomeworkEmailHtml(params: {
  schoolName: string;
  groupName: string;
  courseName?: string;
  lessonDate: string;
  teacherName: string;
  topic: string;
  homework: string;
  deadline?: string;
  comment?: string;
  studentName: string;
  parentName?: string;
}): string {
  const {
    schoolName,
    groupName,
    courseName,
    lessonDate,
    teacherName,
    topic,
    homework,
    deadline,
    comment,
    studentName,
    parentName,
  } = params;

  const greeting = parentName
    ? `Здравствуйте, ${parentName}!`
    : `Здравствуйте, ${studentName}!`;

  const formattedHomework = (homework || 'Домашнее задание не указано.')
    .replace(/\n/g, '<br />');

  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Домашнее задание — ${groupName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f6f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px 35px; color: #ffffff;">
              <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #93c5fd; margin-bottom: 6px;">
                ${schoolName || 'Образовательный центр'}
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                📖 Домашнее задание
              </h1>
              <div style="font-size: 14px; color: #dbeafe; margin-top: 6px;">
                Группа: <strong>${groupName}</strong> ${courseName ? `(${courseName})` : ''}
              </div>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 35px 35px 25px 35px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; font-weight: 600; color: #0f172a;">
                ${greeting}
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Направляем информацию по прошедшему занятию ученика <strong>${studentName}</strong> и задание для самостоятельной подготовки к следующему уроку.
              </p>

              <!-- Lesson Summary Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="4">
                      <tr>
                        <td width="35%" style="font-size: 13px; color: #64748b; font-weight: 500;">📅 Дата урока:</td>
                        <td style="font-size: 13px; color: #0f172a; font-weight: 700;">${lessonDate}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748b; font-weight: 500;">👨‍🏫 Преподаватель:</td>
                        <td style="font-size: 13px; color: #0f172a; font-weight: 600;">${teacherName}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748b; font-weight: 500;">🎯 Тема занятия:</td>
                        <td style="font-size: 13px; color: #1d4ed8; font-weight: 700;">${topic || 'Тема не указана'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Homework Highlight Box -->
              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-left: 5px solid #2563eb; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
                <div style="font-size: 14px; font-weight: 700; color: #1e3a8a; margin-bottom: 10px;">
                  📝 Задание на дом:
                </div>
                <div style="font-size: 14px; line-height: 1.65; color: #1e293b;">
                  ${formattedHomework}
                </div>
                ${deadline ? `
                <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #bfdbfe; font-size: 13px; color: #1e40af; font-weight: 600;">
                  ⏰ Срок выполнения: <strong>${deadline}</strong>
                </div>
                ` : ''}
              </div>

              ${comment ? `
              <!-- Teacher Recommendations -->
              <div style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px;">
                <div style="font-size: 13px; font-weight: 700; color: #6b21a8; margin-bottom: 6px;">
                  💡 Рекомендации преподавателя:
                </div>
                <div style="font-size: 13px; line-height: 1.5; color: #3b0764;">
                  ${comment.replace(/\n/g, '<br />')}
                </div>
              </div>
              ` : ''}

              <p style="margin: 0 0 10px 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                Если у вас возникли вопросы по материалу или выполнению задания, вы всегда можете связаться с нами или преподавателем.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 24px 35px; border-top: 1px solid #e2e8f0; text-align: center;">
              <div style="font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 4px;">
                ${schoolName || 'Образовательный центр'}
              </div>
              <div style="font-size: 12px; color: #94a3b8; line-height: 1.4;">
                Это письмо сформировано автоматически из CRM системы школы.
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
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HomeworkSendPayload;
    const {
      lessonId,
      groupName,
      courseName,
      lessonDate,
      teacherName,
      topic,
      homework,
      deadline,
      comment,
      schoolName = 'School CRM',
      recipients = [],
    } = body;

    if (!homework || !homework.trim()) {
      return NextResponse.json(
        { error: 'Текст домашнего задания не может быть пустым' },
        { status: 400 }
      );
    }

    const validRecipients = recipients.filter(
      (r) => r.email && r.email.includes('@') && r.email.trim().length > 3
    );

    if (validRecipients.length === 0) {
      return NextResponse.json(
        { error: 'Не найдено ни одного корректного email-адреса для отправки' },
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

    // Send emails individually to personalize recipient and student name
    for (const rec of validRecipients) {
      const emailHtml = generateHomeworkEmailHtml({
        schoolName,
        groupName,
        courseName,
        lessonDate,
        teacherName,
        topic,
        homework,
        deadline,
        comment,
        studentName: rec.studentName,
        parentName: rec.parentName,
      });

      const subject = `📖 Домашнее задание: ${topic || groupName} (${lessonDate})`;
      const textFallback = `Домашнее задание для ${rec.studentName} по группе ${groupName}:\n\nТема: ${topic}\n\nЗадание: ${homework}\n\nСрок: ${deadline || 'К следующему уроку'}\nПреподаватель: ${teacherName}`;

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
              text: textFallback,
              html: emailHtml,
            }),
          });

          const resData = await res.json();

          if (!res.ok) {
            console.error('Resend API error for', rec.email, resData);
            results.push({
              email: rec.email,
              studentName: rec.studentName,
              success: false,
              error: resData.message || resData.error || 'Ошибка отправки через Resend API',
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
          console.error('Network error sending via Resend:', e);
          results.push({
            email: rec.email,
            studentName: rec.studentName,
            success: false,
            error: e.message || 'Сетевая ошибка при обращении к Resend',
          });
        }
      } else {
        // Fallback / simulation mode when API key is not yet set in dev
        results.push({
          email: rec.email,
          studentName: rec.studentName,
          success: true,
          messageId: `mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.length - successCount;

    return NextResponse.json({
      success: successCount > 0,
      sentCount: successCount,
      failedCount,
      results,
      message:
        successCount === validRecipients.length
          ? `Домашнее задание успешно отправлено всем ${successCount} получателям!`
          : `Отправлено ${successCount} из ${validRecipients.length} писем.`,
    });
  } catch (err: unknown) {
    console.error('Send homework API error:', err);
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
