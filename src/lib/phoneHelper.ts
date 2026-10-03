/**
 * Universal Phone Helper for International & E.164 Standards
 * Supports: Russia (+7), Ukraine (+380), Germany (+49), Austria (+43), Slovakia (+421),
 * Czech Republic (+420), Poland (+48), Cyprus (+357), USA (+1), UK (+44), and all others.
 */

export interface CountryPhoneRule {
  prefix: string; // e.g. "380", "421", "49", "7", "1"
  countryCode: string; // "UA", "SK", "DE", "RU", "US"
  countryName: string;
  flag: string;
  nationalLength: number; // expected digits after country code
  format: (nationalDigits: string, fullDigits: string) => string;
}

const COUNTRY_RULES: CountryPhoneRule[] = [
  // 3-digit country codes (checked first)
  {
    prefix: '380',
    countryCode: 'UA',
    countryName: 'Украина',
    flag: '🇺🇦',
    nationalLength: 9,
    format: (nat) => {
      if (nat.length === 9) {
        return `+380 ${nat.slice(0, 2)} ${nat.slice(2, 5)} ${nat.slice(5, 7)} ${nat.slice(7, 9)}`;
      }
      return `+380 ${chunkDigits(nat, [2, 3, 2, 2])}`;
    },
  },
  {
    prefix: '421',
    countryCode: 'SK',
    countryName: 'Словакия',
    flag: '🇸🇰',
    nationalLength: 9,
    format: (nat) => `+421 ${chunkDigits(nat, [3, 3, 3])}`,
  },
  {
    prefix: '420',
    countryCode: 'CZ',
    countryName: 'Чехия',
    flag: '🇨🇿',
    nationalLength: 9,
    format: (nat) => `+420 ${chunkDigits(nat, [3, 3, 3])}`,
  },
  {
    prefix: '357',
    countryCode: 'CY',
    countryName: 'Кипр',
    flag: '🇨🇾',
    nationalLength: 8,
    format: (nat) => `+357 ${chunkDigits(nat, [2, 6])}`,
  },
  {
    prefix: '375',
    countryCode: 'BY',
    countryName: 'Беларусь',
    flag: '🇧🇾',
    nationalLength: 9,
    format: (nat) => `+375 (${nat.slice(0, 2)}) ${nat.slice(2, 5)}-${nat.slice(5, 7)}-${nat.slice(7, 9)}`,
  },
  {
    prefix: '370',
    countryCode: 'LT',
    countryName: 'Литва',
    flag: '🇱🇹',
    nationalLength: 8,
    format: (nat) => `+370 ${chunkDigits(nat, [3, 5])}`,
  },
  {
    prefix: '371',
    countryCode: 'LV',
    countryName: 'Латвия',
    flag: '🇱🇻',
    nationalLength: 8,
    format: (nat) => `+371 ${chunkDigits(nat, [4, 4])}`,
  },
  {
    prefix: '372',
    countryCode: 'EE',
    countryName: 'Эстония',
    flag: '🇪🇪',
    nationalLength: 8,
    format: (nat) => `+372 ${chunkDigits(nat, [4, 4])}`,
  },
  {
    prefix: '995',
    countryCode: 'GE',
    countryName: 'Грузия',
    flag: '🇬🇪',
    nationalLength: 9,
    format: (nat) => `+995 ${chunkDigits(nat, [3, 2, 2, 2])}`,
  },
  {
    prefix: '374',
    countryCode: 'AM',
    countryName: 'Армения',
    flag: '🇦🇲',
    nationalLength: 8,
    format: (nat) => `+374 ${chunkDigits(nat, [2, 3, 3])}`,
  },
  {
    prefix: '994',
    countryCode: 'AZ',
    countryName: 'Азербайджан',
    flag: '🇦🇿',
    nationalLength: 9,
    format: (nat) => `+994 ${chunkDigits(nat, [2, 3, 2, 2])}`,
  },
  {
    prefix: '998',
    countryCode: 'UZ',
    countryName: 'Узбекистан',
    flag: '🇺🇿',
    nationalLength: 9,
    format: (nat) => `+998 ${chunkDigits(nat, [2, 3, 2, 2])}`,
  },
  {
    prefix: '971',
    countryCode: 'AE',
    countryName: 'ОАЭ',
    flag: '🇦🇪',
    nationalLength: 9,
    format: (nat) => `+971 ${chunkDigits(nat, [2, 3, 4])}`,
  },
  {
    prefix: '972',
    countryCode: 'IL',
    countryName: 'Израиль',
    flag: '🇮🇱',
    nationalLength: 9,
    format: (nat) => `+972 ${chunkDigits(nat, [2, 3, 4])}`,
  },

  // 2-digit country codes
  {
    prefix: '49',
    countryCode: 'DE',
    countryName: 'Германия',
    flag: '🇩🇪',
    nationalLength: 10,
    format: (nat) => {
      if (nat.startsWith('15') || nat.startsWith('16') || nat.startsWith('17')) {
        return `+49 ${nat.slice(0, 3)} ${nat.slice(3)}`;
      }
      if (nat.length <= 8) {
        return `+49 ${nat.slice(0, 2)} ${nat.slice(2)}`;
      }
      return `+49 ${nat.slice(0, 3)} ${nat.slice(3)}`;
    },
  },
  {
    prefix: '43',
    countryCode: 'AT',
    countryName: 'Австрия',
    flag: '🇦🇹',
    nationalLength: 10,
    format: (nat) => {
      if (nat.startsWith('6')) {
        return `+43 ${nat.slice(0, 3)} ${nat.slice(3)}`;
      }
      return `+43 ${chunkDigits(nat, [3, 4, 3])}`;
    },
  },
  {
    prefix: '48',
    countryCode: 'PL',
    countryName: 'Польша',
    flag: '🇵🇱',
    nationalLength: 9,
    format: (nat) => `+48 ${chunkDigits(nat, [3, 3, 3])}`,
  },
  {
    prefix: '44',
    countryCode: 'GB',
    countryName: 'Великобритания',
    flag: '🇬🇧',
    nationalLength: 10,
    format: (nat) => `+44 ${chunkDigits(nat, [4, 6])}`,
  },
  {
    prefix: '33',
    countryCode: 'FR',
    countryName: 'Франция',
    flag: '🇫🇷',
    nationalLength: 9,
    format: (nat) => `+33 ${chunkDigits(nat, [1, 2, 2, 2, 2])}`,
  },
  {
    prefix: '34',
    countryCode: 'ES',
    countryName: 'Испания',
    flag: '🇪🇸',
    nationalLength: 9,
    format: (nat) => `+34 ${chunkDigits(nat, [3, 2, 2, 2])}`,
  },
  {
    prefix: '39',
    countryCode: 'IT',
    countryName: 'Италия',
    flag: '🇮🇹',
    nationalLength: 10,
    format: (nat) => `+39 ${chunkDigits(nat, [3, 3, 4])}`,
  },
  {
    prefix: '41',
    countryCode: 'CH',
    countryName: 'Швейцария',
    flag: '🇨🇭',
    nationalLength: 9,
    format: (nat) => `+41 ${chunkDigits(nat, [2, 3, 2, 2])}`,
  },
  {
    prefix: '90',
    countryCode: 'TR',
    countryName: 'Турция',
    flag: '🇹🇷',
    nationalLength: 10,
    format: (nat) => `+90 ${chunkDigits(nat, [3, 3, 2, 2])}`,
  },

  // 1-digit country codes
  {
    prefix: '7',
    countryCode: 'RU',
    countryName: 'Россия / Казахстан',
    flag: '🇷🇺',
    nationalLength: 10,
    format: (nat) => {
      if (nat.length >= 10) {
        return `+7 (${nat.slice(0, 3)}) ${nat.slice(3, 6)}-${nat.slice(6, 8)}-${nat.slice(8, 10)}`;
      }
      return `+7 ${chunkDigits(nat, [3, 3, 2, 2])}`;
    },
  },
  {
    prefix: '1',
    countryCode: 'US',
    countryName: 'США / Канада',
    flag: '🇺🇸',
    nationalLength: 10,
    format: (nat) => {
      if (nat.length >= 10) {
        return `+1 (${nat.slice(0, 3)}) ${nat.slice(3, 6)}-${nat.slice(6, 10)}`;
      }
      return `+1 ${chunkDigits(nat, [3, 3, 4])}`;
    },
  },
];

function chunkDigits(str: string, lengths: number[]): string {
  const parts: string[] = [];
  let index = 0;
  for (const len of lengths) {
    if (index >= str.length) break;
    parts.push(str.slice(index, index + len));
    index += len;
  }
  if (index < str.length) {
    parts.push(str.slice(index));
  }
  return parts.join(' ').trim();
}

/**
 * Normalizes any phone representation into pure digits without leading plus.
 * Handles Russian national format (8XXXXXXXXXX -> 7XXXXXXXXXX).
 * Preserves country codes for international inputs.
 */
export function normalizePhone(phone?: string | number | null): string {
  if (!phone) return '';
  const str = String(phone).trim();
  let clean = str.replace(/\D/g, '');
  if (!clean) return '';

  // If starts with 8 and is 11 digits (typical Russian national input like 8 999 123 45 67)
  if (clean.length === 11 && clean.startsWith('8') && !str.startsWith('+')) {
    clean = '7' + clean.slice(1);
  }

  // If starts with 00 (international call prefix like 0049...), replace with standard digits
  if (clean.startsWith('00') && clean.length > 4) {
    clean = clean.slice(2);
  }

  return clean;
}

/**
 * Converts phone to strict E.164 format: +[country_code][national_number]
 * Example: +79991234567, +491512345678, +421912345678, +380501234567
 */
export function formatE164(phone?: string | number | null): string {
  const clean = normalizePhone(phone);
  if (!clean) return '';
  return `+${clean}`;
}

/**
 * Detects the matching country rule based on leading digits of normalized phone.
 */
export function getCountryFromPhone(phone?: string | number | null): CountryPhoneRule | null {
  const clean = normalizePhone(phone);
  if (!clean) return null;

  for (const rule of COUNTRY_RULES) {
    if (clean.startsWith(rule.prefix)) {
      return rule;
    }
  }
  return null;
}

/**
 * Formats a phone number into a clean, human-readable international format
 * based on its country code standard.
 *
 * Examples:
 * - 89991234567 -> +7 (999) 123-45-67
 * - +4915123456789 -> +49 151 23456789
 * - +380501234567 -> +380 50 123 45 67
 * - +421912345678 -> +421 912 345 678
 * - +436641234567 -> +43 664 1234567
 * - +420123456789 -> +420 123 456 789
 * - +35799123456 -> +357 99 123456
 */
export function formatPhone(phone?: string | number | null): string {
  if (!phone) return '—';
  const rawStr = String(phone).trim();
  if (rawStr === '—' || rawStr === '-' || rawStr === '') return '—';

  const clean = normalizePhone(rawStr);
  if (!clean || clean.length < 5) return rawStr;

  const matched = getCountryFromPhone(clean);
  if (matched) {
    const national = clean.slice(matched.prefix.length);
    return matched.format(national, clean);
  }

  // Fallback for any country not explicitly in the rules table:
  // Detect 2 or 3 digit country code and format cleanly
  if (clean.length > 10) {
    const code = clean.slice(0, 3);
    const rest = clean.slice(3);
    return `+${code} ${chunkDigits(rest, [3, 3, 4])}`;
  }
  if (clean.length > 7) {
    const code = clean.slice(0, 2);
    const rest = clean.slice(2);
    return `+${code} ${chunkDigits(rest, [3, 3, 4])}`;
  }

  return `+${clean}`;
}

/**
 * Returns a clean URL for WhatsApp: https://wa.me/[digits without +]
 */
export function getWhatsAppLink(phone?: string | number | null): string {
  const clean = normalizePhone(phone);
  if (!clean) return '#';
  return `https://wa.me/${clean}`;
}

/**
 * Returns a clean tel: URI in standard E.164: tel:+[digits]
 */
export function getTelLink(phone?: string | number | null): string {
  const e164 = formatE164(phone);
  if (!e164) return '#';
  return `tel:${e164}`;
}
