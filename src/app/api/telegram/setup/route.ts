import { NextRequest, NextResponse } from 'next/server';
import {
  resolveBotToken,
  getTelegramBotMe,
  getTelegramWebhookInfo,
  setTelegramWebhook,
  setTelegramChatMenuButton,
} from '@/lib/telegram/telegramClient';
import {
  getTelegramSettingsServer,
  saveTelegramSettingsServer,
} from '@/lib/telegram/settings';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const customToken = url.searchParams.get('token') || undefined;
    let token = resolveBotToken(customToken);

    if (!token) {
      const serverSettings = await getTelegramSettingsServer();
      token = serverSettings.botToken || '';
    }

    if (!token) {
      return NextResponse.json({
        configured: false,
        error: 'Telegram Bot Token не настроен',
      });
    }

    const [botRes, webhookRes] = await Promise.all([
      getTelegramBotMe(token),
      getTelegramWebhookInfo(token),
    ]);

    return NextResponse.json({
      configured: true,
      bot: botRes.bot || null,
      botError: botRes.error || null,
      webhook: webhookRes.info || null,
      webhookError: webhookRes.error || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { configured: false, error: error?.message || 'Failed to check bot status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customBotToken, webhookUrl } = body;

    let token = resolveBotToken(customBotToken);
    if (!token) {
      const serverSettings = await getTelegramSettingsServer();
      token = serverSettings.botToken || '';
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Telegram Bot Token не указан' },
        { status: 400 }
      );
    }

    if (!webhookUrl) {
      return NextResponse.json(
        { success: false, error: 'Webhook URL не указан' },
        { status: 400 }
      );
    }

    const res = await setTelegramWebhook(token, webhookUrl);

    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || 'Не удалось зарегистрировать Webhook' },
        { status: 502 }
      );
    }

    // Persist webhookUrl to Supabase system_settings
    try {
      await saveTelegramSettingsServer({ webhookUrl });
    } catch (saveErr) {
      console.warn('Could not save webhookUrl to system_settings:', saveErr);
    }

    // Automatically configure Menu Button for the Mini App
    try {
      const miniAppUrl = webhookUrl.replace('/api/telegram/webhook', '/mini-app');
      await setTelegramChatMenuButton({
        token,
        miniAppUrl,
        buttonText: 'Запись онлайн 📱',
      });
    } catch (menuErr) {
      console.warn('Could not set chat menu button:', menuErr);
    }

    return NextResponse.json({
      success: true,
      description: res.description || 'Webhook успешно зарегистрирован в Telegram',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
