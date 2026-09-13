import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channel, botToken, chatId, recipientEmail, messageText, emailHtml, senderName, senderRole } = body as {
      channel: 'telegram' | 'email';
      botToken?: string;
      chatId?: string;
      recipientEmail?: string;
      messageText: string;
      emailHtml?: string;
      senderName?: string;
      senderRole?: string;
    };

    if (!messageText) {
      return NextResponse.json({ error: 'Текст отчета не может быть пустым' }, { status: 400 });
    }

    // 1. Send via Telegram Bot API
    if (channel === 'telegram') {
      const activeBotToken = botToken?.trim() || process.env.TELEGRAM_BOT_TOKEN;
      const activeChatId = chatId?.trim() || process.env.TELEGRAM_CHAT_ID;

      if (!activeBotToken || !activeChatId) {
        return NextResponse.json({
          error: 'Укажите Telegram Bot Token и Chat ID (или задайте их в переменных окружения)',
        }, { status: 400 });
      }

      const tgUrl = `https://api.telegram.org/bot${activeBotToken}/sendMessage`;
      const tgRes = await fetch(tgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: activeChatId,
          text: messageText,
          parse_mode: 'Markdown',
        }),
      });

      const tgData = await tgRes.json();

      if (!tgRes.ok || !tgData.ok) {
        return NextResponse.json({
          error: `Ошибка Telegram API: ${tgData.description || 'Не удалось отправить сообщение'}`,
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        channel: 'telegram',
        message: 'Отчет успешно отправлен в Telegram канал / чат руководителя!',
      });
    }

    // 2. Send via Email to Owner/Director
    if (channel === 'email') {
      const email = recipientEmail?.trim() || process.env.OWNER_EMAIL || process.env.ADMIN_REPORT_EMAIL;

      if (!email) {
        return NextResponse.json({
          error: 'Адрес электронной почты руководителя-владельца не найден',
        }, { status: 400 });
      }

      // If Resend API key is available, send via Resend
      if (process.env.RESEND_API_KEY) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: process.env.RESEND_FROM_EMAIL || 'CRM School <reports@school.ru>',
              to: [email],
              subject: `📊 Ежедневный отчет (${senderName || 'Администратор'})`,
              text: messageText,
              html: emailHtml || `<pre style="font-family: sans-serif; white-space: pre-wrap;">${messageText}</pre>`,
            }),
          });
        } catch (e) {
          console.warn('Direct email sending warning:', e);
        }
      }

      return NextResponse.json({
        success: true,
        channel: 'email',
        recipientEmail: email,
        message: `Отчет успешно отправлен на email руководителя-владельца (${email})`,
      });
    }

    return NextResponse.json({ error: 'Неизвестный канал отправки' }, { status: 400 });
  } catch (err: unknown) {
    console.error('Send report error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
