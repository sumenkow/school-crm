import { NextRequest, NextResponse } from 'next/server';
import {
  getTelegramSettingsServer,
  saveTelegramSettingsServer,
  maskBotToken,
  TelegramBotSettings,
} from '@/lib/telegram/settings';
import { setTelegramChatMenuButton } from '@/lib/telegram/telegramClient';
import { logAuditEvent } from '@/lib/audit/auditLogger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getTelegramSettingsServer();
    const safeSettings: TelegramBotSettings = {
      ...settings,
      botToken: maskBotToken(settings.botToken),
    };

    return NextResponse.json({
      success: true,
      settings: safeSettings,
    });
  } catch (error: any) {
    console.error('Error fetching Telegram settings:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      botToken,
      adminChatId,
      ownerChatId,
      botUsername,
      webhookUrl,
      notificationsEnabled,
      syncMenuButton,
    } = body;

    const updated = await saveTelegramSettingsServer({
      botToken,
      adminChatId,
      ownerChatId,
      botUsername,
      webhookUrl,
      notificationsEnabled,
    });

    const safeSettings: TelegramBotSettings = {
      ...updated,
      botToken: maskBotToken(updated.botToken),
    };

    // Synchronize global Telegram Menu Button for the Mini App
    let menuButtonSynced = false;
    let menuButtonError: string | null = null;

    if (updated.botToken) {
      const host = request.headers.get('host');
      const proto = request.headers.get('x-forwarded-proto') || 'https';
      const origin = host ? `${proto}://${host}` : 'https://youeuropecrmtest.vercel.app';
      const baseUrl = updated.webhookUrl
        ? updated.webhookUrl.replace(/\/api\/telegram\/webhook\/?$/, '')
        : (process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : origin));
      const miniAppUrl = `${baseUrl}/mini-app`;

      try {
        const menuRes = await setTelegramChatMenuButton({
          token: updated.botToken,
          miniAppUrl,
          buttonText: 'Запись онлайн 📱',
        });
        menuButtonSynced = menuRes.success;
        if (!menuRes.success) {
          menuButtonError = menuRes.error || null;
        }
      } catch (err: any) {
        menuButtonError = err?.message || 'Failed to set chat menu button';
      }
    }

    await logAuditEvent({
      action: 'TELEGRAM_SETTINGS_UPDATE',
      entityType: 'telegram',
      entityId: 'settings',
      entityNameSnapshot: botUsername || 'Telegram Bot',
      description: `Обновлены настройки Telegram-бота (@${botUsername || 'youeuropeservicebot'})`,
      afterData: {
        ...safeSettings,
        menuButtonSynced,
      },
      source: 'WEB',
      req: request,
    });

    return NextResponse.json({
      success: true,
      message: 'Настройки Telegram бота успешно сохранены в Supabase',
      settings: safeSettings,
      menuButtonSynced,
      menuButtonError,
    });
  } catch (error: any) {
    console.error('Error saving Telegram settings:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to save settings' },
      { status: 500 }
    );
  }
}

