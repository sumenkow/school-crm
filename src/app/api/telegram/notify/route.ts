import { NextRequest, NextResponse } from 'next/server';
import { getTelegramSettingsServer } from '@/lib/telegram/settings';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      recipient, // 'admin' | 'owner' | 'both'
      message,
      botToken: customBotToken,
      adminChatId: customAdminChatId,
      ownerChatId: customOwnerChatId,
      customChatId,
    } = body;

    const serverSettings = await getTelegramSettingsServer();
    const token = (customBotToken && customBotToken.trim().length > 10 && !customBotToken.includes('•••'))
      ? customBotToken.trim()
      : (serverSettings.botToken || process.env.TELEGRAM_BOT_TOKEN || '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Telegram Bot Token не настроен' },
        { status: 400 }
      );
    }

    const defaultChatId = process.env.TELEGRAM_CHAT_ID;
    const adminChatId = customAdminChatId || serverSettings.adminChatId || process.env.TELEGRAM_ADMIN_CHAT_ID || defaultChatId;
    const ownerChatId = customOwnerChatId || serverSettings.ownerChatId || process.env.TELEGRAM_OWNER_CHAT_ID || defaultChatId;

    const targetChatIds = new Set<string>();

    if (customChatId) {
      targetChatIds.add(customChatId);
    } else {
      if ((recipient === 'admin' || recipient === 'both') && adminChatId) {
        targetChatIds.add(adminChatId);
      }
      if ((recipient === 'owner' || recipient === 'both') && ownerChatId) {
        targetChatIds.add(ownerChatId);
      }
    }

    if (targetChatIds.size === 0) {
      return NextResponse.json(
        { success: false, error: 'Не указан Chat ID получателя' },
        { status: 400 }
      );
    }

    const errors: string[] = [];

    for (const chatId of Array.from(targetChatIds)) {
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
          }),
        });

        const tgData = await tgRes.json();
        if (!tgData.ok) {
          const desc = tgData.description || '';
          if (desc.includes('chat not found')) {
            if (String(chatId).startsWith('@') || /[a-zA-Z]/.test(String(chatId))) {
              errors.push(`Для личных сообщений в Telegram Bot API требуется числовой Chat ID (например, 123456789), а не username ${chatId}. Узнайте свой ID в боте @userinfobot и отправьте вашему боту команду /start.`);
            } else {
              errors.push(`Чат ${chatId} не найден ботом. Убедитесь, что вы написали боту команду /start.`);
            }
          } else if (desc.includes('bot was blocked by the user')) {
            errors.push(`Бот заблокирован пользователем (${chatId}). Нажмите «Запустить» в диалоге с ботом.`);
          } else {
            errors.push(`Chat ${chatId}: ${desc || 'Failed to send'}`);
          }
        }
      } catch (e: any) {
        errors.push(`Chat ${chatId}: ${e?.message || 'Network error'}`);
      }
    }

    if (errors.length > 0 && errors.length === targetChatIds.size) {
      return NextResponse.json({ success: false, error: errors.join('\n') }, { status: 502 });
    }

    return NextResponse.json({ success: true, sentToCount: targetChatIds.size - errors.length });
  } catch (error: any) {
    console.error('Error in /api/telegram/notify:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
