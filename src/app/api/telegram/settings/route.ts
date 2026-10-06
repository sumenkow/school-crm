import { NextRequest, NextResponse } from 'next/server';
import {
  getTelegramSettingsServer,
  saveTelegramSettingsServer,
  maskBotToken,
  TelegramBotSettings,
} from '@/lib/telegram/settings';
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

    await logAuditEvent({
      action: 'TELEGRAM_SETTINGS_UPDATE',
      entityType: 'telegram',
      entityId: 'settings',
      entityNameSnapshot: botUsername || 'Telegram Bot',
      description: `Обновлены настройки Telegram-бота (@${botUsername || 'youeuropeservicebot'})`,
      afterData: safeSettings,
      source: 'WEB',
      req: request,
    });

    return NextResponse.json({
      success: true,
      message: 'Настройки Telegram бота успешно сохранены в Supabase',
      settings: safeSettings,
    });
  } catch (error: any) {
    console.error('Error saving Telegram settings:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to save settings' },
      { status: 500 }
    );
  }
}
