/**
 * Sensitive data redaction engine for production audit logging.
 * Strips secrets, passwords, tokens, API keys and credentials before persistence.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'new_password',
  'current_password',
  'old_password',
  'password_hash',
  'token',
  'bottoken',
  'bot_token',
  'apikey',
  'api_key',
  'secret',
  'client_secret',
  'refreshtoken',
  'refresh_token',
  'accesstoken',
  'access_token',
  'cookie',
  'cookies',
  'authorization',
  'bearer',
  'private_key',
  'privatekey',
]);

const TELEGRAM_BOT_TOKEN_REGEX = /\d{8,11}:[A-Za-z0-9_-]{30,}/g;

export const REDACTED_PLACEHOLDER = '[REDACTED]';

export function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
  return SENSITIVE_KEYS.has(normalized);
}

function sanitizeString(val: string): string {
  return val.replace(/\d{8,11}:[A-Za-z0-9_-]{30,}/g, REDACTED_PLACEHOLDER);
}

/**
 * Recursively redacts sensitive fields in an object or primitive.
 * Pure function: does not mutate the source data.
 */
export function redactSensitiveData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return sanitizeString(data) as unknown as T;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item)) as unknown as T;
  }

  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (isSensitiveKey(key)) {
      result[key] = REDACTED_PLACEHOLDER;
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitiveData(value);
    } else if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
