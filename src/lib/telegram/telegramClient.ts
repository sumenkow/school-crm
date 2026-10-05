/**
 * Telegram Bot API client helpers for Omnichannel CRM communications.
 */

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface TelegramWebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  ip_address?: string;
}

/**
 * Resolves the active Telegram Bot Token from options or environment variables.
 */
export function resolveBotToken(customToken?: string): string {
  if (customToken && customToken.trim().length > 10) {
    return customToken.trim();
  }
  return process.env.TELEGRAM_BOT_TOKEN || '';
}

/**
 * Fetches information about the configured bot via getMe.
 */
export async function getTelegramBotMe(token: string): Promise<{ success: boolean; bot?: TelegramBotInfo; error?: string }> {
  try {
    const cleanToken = token.trim();
    if (!cleanToken) return { success: false, error: 'Token is empty' };

    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    const data = await res.json();
    if (!data.ok) {
      return { success: false, error: data.description || 'Failed to get bot info' };
    }

    return { success: true, bot: data.result };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error contacting Telegram' };
  }
}

/**
 * Registers or updates webhook URL with Telegram.
 */
export async function setTelegramWebhook(token: string, webhookUrl: string): Promise<{ success: boolean; description?: string; error?: string }> {
  try {
    const cleanToken = token.trim();
    if (!cleanToken) return { success: false, error: 'Token is empty' };

    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: false,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      return { success: false, error: data.description || 'Failed to set webhook' };
    }

    return { success: true, description: data.description };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error setting webhook' };
  }
}

/**
 * Retrieves current webhook status and pending updates from Telegram.
 */
export async function getTelegramWebhookInfo(token: string): Promise<{ success: boolean; info?: TelegramWebhookInfo; error?: string }> {
  try {
    const cleanToken = token.trim();
    if (!cleanToken) return { success: false, error: 'Token is empty' };

    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/getWebhookInfo`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    const data = await res.json();
    if (!data.ok) {
      return { success: false, error: data.description || 'Failed to get webhook info' };
    }

    return { success: true, info: data.result };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error retrieving webhook info' };
  }
}

/**
 * Sends a direct message to a chat ID using the Telegram Bot API.
 */
export async function sendTelegramDirectMessage(params: {
  token: string;
  chatId: string | number;
  text: string;
  parseMode?: 'Markdown' | 'HTML';
  replyMarkup?: any;
}): Promise<{ success: boolean; messageId?: number; error?: string }> {
  try {
    const { token, chatId, text, parseMode = 'Markdown', replyMarkup } = params;
    const cleanToken = token.trim();
    if (!cleanToken) return { success: false, error: 'Bot token not provided' };
    if (!chatId) return { success: false, error: 'Chat ID is required' };
    if (!text || !text.trim()) return { success: false, error: 'Message text is empty' };

    const payload: any = {
      chat_id: chatId,
      text: text,
      parse_mode: parseMode,
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!data.ok) {
      const desc = data.description || '';
      if (desc.includes('chat not found')) {
        if (String(chatId).startsWith('@') || /[a-zA-Z]/.test(String(chatId))) {
          return {
            success: false,
            error: `Для личных сообщений в Telegram Bot API требуется числовой Chat ID (например, 123456789), а не @username ${chatId}. Узнайте свой ID в @userinfobot и нажмите кнопку Start в вашем боте.`,
          };
        }
        return {
          success: false,
          error: `Чат ${chatId} не найден ботом. Убедитесь, что получатель запустил бота командой /start.`,
        };
      }
      if (desc.includes('bot was blocked by the user')) {
        return {
          success: false,
          error: `Бот заблокирован пользователем (${chatId}). Нажмите «Запустить» в диалоге с ботом.`,
        };
      }
      return { success: false, error: desc || 'Failed to send message' };
    }

    return { success: true, messageId: data.result?.message_id };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error sending direct Telegram message' };
  }
}

/**
 * Constructs a deep link for a student, lead, or parent to connect to the bot.
 * Example: https://t.me/MySchoolBot?start=st_12345
 */
export function generateTelegramDeeplink(
  botUsername: string,
  targetType: 'st' | 'lead' | 'par',
  targetId: string
): string {
  const cleanUsername = (botUsername || '').replace(/^@/, '').replace('https://t.me/', '').trim();
  const cleanId = String(targetId).trim();
  if (!cleanUsername) return '';
  return `https://t.me/${cleanUsername}?start=${targetType}_${cleanId}`;
}
