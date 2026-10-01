import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendTelegramDirectMessage, resolveBotToken } from '@/lib/telegram/telegramClient';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      chatId,
      recipientType, // 'student' | 'lead' | 'parent'
      recipientId,
      recipientName,
      message,
      authorName,
      customBotToken,
    } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Текст сообщения не может быть пустым' },
        { status: 400 }
      );
    }

    const token = resolveBotToken(customBotToken);
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Telegram Bot Token не настроен. Укажите токен в Настройках CRM.' },
        { status: 400 }
      );
    }

    let targetChatId = chatId;

    // If targetChatId not supplied, try to fetch from Supabase by recipientId
    if (!targetChatId && recipientId && recipientType) {
      try {
        if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
          const supabase = createAdminClient();
          const table = recipientType === 'student' ? 'students' : recipientType === 'lead' ? 'leads' : 'parents';
          const { data } = await supabase.from(table).select('telegram').eq('id', recipientId).maybeSingle();
          if (data && data.telegram) {
            targetChatId = data.telegram;
          }
        }
      } catch (dbErr) {
        console.warn('Could not retrieve recipient chat_id from Supabase:', dbErr);
      }
    }

    if (!targetChatId) {
      return NextResponse.json(
        { success: false, error: 'У получателя не привязан Telegram (Chat ID не найден). Отправьте ссылку на подключение бота.' },
        { status: 400 }
      );
    }

    // Send direct message via Telegram Bot API
    const sendResult = await sendTelegramDirectMessage({
      token,
      chatId: targetChatId,
      text: message.trim(),
      parseMode: 'Markdown',
    });

    if (!sendResult.success) {
      return NextResponse.json(
        { success: false, error: sendResult.error || 'Ошибка отправки в Telegram' },
        { status: 502 }
      );
    }

    // Dual-write outbound interaction to Supabase
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const supabase = createAdminClient();
        await supabase.from('interactions').insert({
          id: `int_tg_out_${Date.now()}`,
          student_id: recipientType === 'student' ? recipientId : null,
          lead_id: recipientType === 'lead' ? recipientId : null,
          parent_id: recipientType === 'parent' ? recipientId : null,
          type: 'follow_up',
          title: `Исходящее сообщение в Telegram (${recipientName || 'Клиент'})`,
          description: message.trim(),
          created_at: new Date().toISOString(),
          is_mock_data: false,
        });
      }
    } catch (dbErr) {
      console.warn('DB logging error during outbound Telegram send:', dbErr);
    }

    return NextResponse.json({
      success: true,
      messageId: sendResult.messageId,
      sentAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in /api/telegram/send:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
