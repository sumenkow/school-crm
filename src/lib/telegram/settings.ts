import { createAdminClient } from '@/lib/supabase/admin';

export interface TelegramBotSettings {
  botToken?: string;
  hasBotToken: boolean;
  adminChatId: string;
  ownerChatId: string;
  botUsername: string;
  webhookUrl: string;
  notificationsEnabled: boolean;
  status: 'connected' | 'not_configured' | 'error';
  updatedAt: string;
}

export const DEFAULT_TELEGRAM_SETTINGS: TelegramBotSettings = {
  botToken: '',
  hasBotToken: false,
  adminChatId: '184920491',
  ownerChatId: '928374921',
  botUsername: 'youeuropeservicebot',
  webhookUrl: 'https://youeuropecrmtest.vercel.app/api/telegram/webhook',
  notificationsEnabled: true,
  status: 'connected',
  updatedAt: new Date().toISOString(),
};

// In-memory cache for serverless invocation / test environments
let cachedSettings: TelegramBotSettings | null = null;

export function maskBotToken(token?: string): string {
  if (!token || !token.trim()) return '';
  return '••••••••';
}

/**
 * Server-only helper to fetch Telegram Bot settings from Supabase system_settings.
 * Gracefully falls back to environment variables and in-memory cache.
 */
export async function getTelegramSettingsServer(): Promise<TelegramBotSettings> {
  const envToken = process.env.TELEGRAM_BOT_TOKEN || '';
  const envAdminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '';
  const envOwnerChatId = process.env.TELEGRAM_OWNER_CHAT_ID || '';
  const envBotUsername = process.env.TELEGRAM_BOT_USERNAME || process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'youeuropeservicebot';

  let dbSettings: Partial<TelegramBotSettings> = {};

  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('system_settings')
        .select('value, updated_at')
        .eq('key', 'telegram_bot_settings')
        .maybeSingle();

      if (!error && data?.value) {
        dbSettings = data.value;
        if (data.updated_at) {
          dbSettings.updatedAt = data.updated_at;
        }
      }
    }
  } catch (err) {
    console.warn('Could not read telegram_bot_settings from Supabase, using fallback:', err);
  }

  const resolvedToken = dbSettings.botToken || cachedSettings?.botToken || envToken || '';
  const resolvedAdminChatId = dbSettings.adminChatId || cachedSettings?.adminChatId || envAdminChatId || DEFAULT_TELEGRAM_SETTINGS.adminChatId;
  const resolvedOwnerChatId = dbSettings.ownerChatId || cachedSettings?.ownerChatId || envOwnerChatId || DEFAULT_TELEGRAM_SETTINGS.ownerChatId;
  const resolvedBotUsername = (dbSettings.botUsername || cachedSettings?.botUsername || envBotUsername || 'youeuropeservicebot')
    .replace(/^@/, '')
    .trim();
  const resolvedWebhookUrl = dbSettings.webhookUrl || cachedSettings?.webhookUrl || DEFAULT_TELEGRAM_SETTINGS.webhookUrl;
  const resolvedNotifications = dbSettings.notificationsEnabled !== undefined
    ? dbSettings.notificationsEnabled
    : (cachedSettings?.notificationsEnabled !== undefined ? cachedSettings.notificationsEnabled : true);

  const hasBotToken = Boolean(resolvedToken && resolvedToken.trim().length > 10);

  const merged: TelegramBotSettings = {
    botToken: resolvedToken,
    hasBotToken,
    adminChatId: resolvedAdminChatId,
    ownerChatId: resolvedOwnerChatId,
    botUsername: resolvedBotUsername,
    webhookUrl: resolvedWebhookUrl,
    notificationsEnabled: resolvedNotifications,
    status: hasBotToken || Boolean(dbSettings.status === 'connected') ? 'connected' : 'not_configured',
    updatedAt: dbSettings.updatedAt || cachedSettings?.updatedAt || new Date().toISOString(),
  };

  cachedSettings = merged;
  return merged;
}

/**
 * Server-only helper to atomically save Telegram Bot settings to Supabase system_settings.
 */
export async function saveTelegramSettingsServer(
  newSettings: Partial<TelegramBotSettings>
): Promise<TelegramBotSettings> {
  const current = await getTelegramSettingsServer();

  let finalToken = current.botToken;
  if (newSettings.botToken !== undefined) {
    const trimmed = newSettings.botToken.trim();
    // Do not overwrite existing secret token if placeholder mask was sent back
    if (trimmed && trimmed !== '••••••••') {
      finalToken = trimmed;
    } else if (trimmed === '') {
      finalToken = '';
    }
  }

  const updated: TelegramBotSettings = {
    ...current,
    ...newSettings,
    botToken: finalToken,
    hasBotToken: Boolean(finalToken && finalToken.trim().length > 10),
    botUsername: (newSettings.botUsername || current.botUsername || 'youeuropeservicebot').replace(/^@/, '').trim(),
    updatedAt: new Date().toISOString(),
    status: (finalToken && finalToken.trim().length > 10) ? 'connected' : 'not_configured',
  };

  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = createAdminClient();
      await supabase
        .from('system_settings')
        .upsert(
          {
            key: 'telegram_bot_settings',
            value: updated,
            updated_at: updated.updatedAt,
          },
          { onConflict: 'key' }
        );
    }
  } catch (err) {
    console.warn('Could not persist telegram_bot_settings to Supabase, cached in-memory:', err);
  }

  cachedSettings = updated;
  return updated;
}
