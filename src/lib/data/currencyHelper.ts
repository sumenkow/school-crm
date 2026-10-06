'use client';

export const DEFAULT_EUR_RUB_RATE = 100; // 1 EUR = 100 RUB (конверсионный курс по умолчанию)
const EUR_RATE_STORAGE_KEY = 'crm_eur_rub_rate';
const EUR_RATE_META_KEY = 'crm_eur_rub_rate_meta';

export interface CurrencyRateMeta {
  rate: number;
  source: string;
  updatedAt: string;
  isAuto: boolean;
}

/**
 * Fetches live exchange rate from /api/currency/rate (CBR / Open FX).
 */
export async function fetchLiveEurRubRate(): Promise<CurrencyRateMeta> {
  try {
    const res = await fetch('/api/currency/rate');
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.rate === 'number' && data.rate > 0) {
        const meta: CurrencyRateMeta = {
          rate: data.rate,
          source: data.source || 'ЦБ РФ',
          updatedAt: data.updatedAt || new Date().toISOString(),
          isAuto: true,
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem(EUR_RATE_STORAGE_KEY, String(data.rate));
          localStorage.setItem(EUR_RATE_META_KEY, JSON.stringify(meta));
          window.dispatchEvent(new CustomEvent('crm-currency-rate-changed', { detail: { rate: data.rate, meta } }));
        }
        return meta;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch live EUR rate:', err);
  }

  const fallbackRate = getEurRubRate();
  return {
    rate: fallbackRate,
    source: 'Сохраненный / Базовый',
    updatedAt: new Date().toISOString(),
    isAuto: false,
  };
}

/**
 * Returns metadata about the current rate if available.
 */
export function getCurrencyRateMeta(): CurrencyRateMeta | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(EUR_RATE_META_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    // Ignore error
  }
  return null;
}

/**
 * Returns current exchange rate (RUB per 1 EUR).
 */
export function getEurRubRate(): number {
  if (typeof window === 'undefined') return DEFAULT_EUR_RUB_RATE;
  try {
    const stored = localStorage.getItem(EUR_RATE_STORAGE_KEY);
    if (stored) {
      const num = parseFloat(stored);
      if (!isNaN(num) && num > 0) return num;
    }
  } catch (e) {
    // Ignore error in non-browser context
  }
  return DEFAULT_EUR_RUB_RATE;
}

/**
 * Persists exchange rate (RUB per 1 EUR).
 */
export function setEurRubRate(rate: number, source: string = 'Пользовательский'): void {
  if (typeof window === 'undefined') return;
  if (rate > 0) {
    const meta: CurrencyRateMeta = {
      rate,
      source,
      updatedAt: new Date().toISOString(),
      isAuto: false,
    };
    localStorage.setItem(EUR_RATE_STORAGE_KEY, String(rate));
    localStorage.setItem(EUR_RATE_META_KEY, JSON.stringify(meta));
    window.dispatchEvent(new CustomEvent('crm-currency-rate-changed', { detail: { rate, meta } }));
  }
}

/**
 * Converts RUB amount to EUR based on exchange rate.
 */
export function convertRubToEur(amountRub: number, customRate?: number): number {
  const rate = customRate || getEurRubRate();
  if (rate <= 0) return amountRub / DEFAULT_EUR_RUB_RATE;
  return Math.round((amountRub / rate) * 100) / 100;
}

/**
 * Converts EUR amount to RUB based on exchange rate.
 */
export function convertEurToRub(amountEur: number, customRate?: number): number {
  const rate = customRate || getEurRubRate();
  return Math.round(amountEur * rate);
}

/**
 * Formats a single currency amount without floating-point artefacts.
 * - Default currency: EUR
 * - EUR: without decimals by default for integers, or formatted with decimals if options specify → "80 €", "74,13 €"
 * - RUB: Math.round, non-breaking space thousands separator → "15\u00A0600 ₽"
 */
export interface FormatCurrencyOptions {
  decimals?: number;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export function formatCurrency(
  amount: number,
  currency: 'RUB' | 'EUR' = 'EUR',
  options?: FormatCurrencyOptions
): string {
  if (currency === 'EUR') {
    if (options?.decimals !== undefined) {
      return `${amount.toLocaleString('ru-RU', {
        minimumFractionDigits: options.decimals,
        maximumFractionDigits: options.decimals,
      })} €`;
    }
    if (options?.minimumFractionDigits !== undefined || options?.maximumFractionDigits !== undefined) {
      return `${amount.toLocaleString('ru-RU', {
        minimumFractionDigits: options.minimumFractionDigits,
        maximumFractionDigits: options.maximumFractionDigits,
      })} €`;
    }
    const rounded = Math.round(amount * 100) / 100;
    return `${rounded.toLocaleString('ru-RU')} €`;
  }
  // Use Math.round to eliminate floating-point fractions (e.g. 776 589,317 → 776 589)
  return `${Math.round(amount).toLocaleString('ru-RU').replace(/\s/g, '\u00A0')} ₽`;
}

/**
 * Formats amount in dual currency with primary and converted secondary currency.
 * In EUR-first mode, returns clean formatted EUR amount without appending ruble conversion.
 * E.g.: "156 €"
 */
export function formatDualCurrency(
  amount: number,
  baseCurrency: 'RUB' | 'EUR' = 'EUR',
  customRate?: number
): string {
  const rate = customRate || getEurRubRate();
  const amountEur = baseCurrency === 'RUB' ? convertRubToEur(amount, rate) : amount;
  return `${Math.round(amountEur).toLocaleString('ru-RU')} €`;
}

/**
 * Formats dual currency specifically for executive reports where EUR is base.
 * Returns primaryEur and empty secondaryRub, with fullLabel matching primaryEur.
 */
export function formatExecutiveDualCurrency(
  amountRub: number,
  customRate?: number
): {
  primaryEur: string;
  secondaryRub: string;
  fullLabel: string;
  rubFormatted: string;
  eurFormatted: string;
} {
  const rate = customRate || getEurRubRate();
  const eur = amountRub <= 500 ? amountRub : convertRubToEur(amountRub, rate);
  const primaryEur = formatCurrency(eur, 'EUR');

  return {
    primaryEur,
    secondaryRub: '',
    fullLabel: primaryEur,
    rubFormatted: '',
    eurFormatted: primaryEur,
  };
}

export interface MultiCurrencyTotals {
  totalEur: number;
  totalRub: number;
  eurDirect: number;
  rubDirect: number;
  rubInEur: number;
  eurInRub: number;
  rate: number;
  count: number;
  eurCount: number;
  rubCount: number;
  formattedTotalEur: string;
  formattedTotalRub: string;
  formattedPrimaryWithSecondary: string;
  breakdownSummary: string;
}

/**
 * Calculates unified EUR primary totals with converted RUB and breakdown.
 */
export function calculateMultiCurrencyTotals(
  items: Array<{ amount: number | string; currency?: string }>,
  customRate?: number
): MultiCurrencyTotals {
  const rate = customRate || getEurRubRate();

  let eurDirect = 0;
  let rubDirect = 0;
  let eurCount = 0;
  let rubCount = 0;

  for (const item of items) {
    const rawVal = typeof item.amount === 'number'
      ? item.amount
      : parseFloat(String(item.amount).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    
    if (rawVal <= 0) continue;

    const curr = (item.currency || '').toUpperCase();
    if (curr === 'RUB' || curr === '₽') {
      rubDirect += rawVal;
      rubCount++;
    } else {
      // Default currency is EUR
      eurDirect += rawVal;
      eurCount++;
    }
  }

  const rubInEur = rate > 0 ? Math.round((rubDirect / rate) * 100) / 100 : 0;
  const eurInRub = Math.round(eurDirect * rate);

  const totalEur = Math.round((eurDirect + rubInEur) * 100) / 100;
  const totalRub = rubDirect + eurInRub;

  const formattedTotalEur = formatCurrency(totalEur, 'EUR');
  const formattedTotalRub = formatCurrency(totalRub, 'RUB');
  const formattedPrimaryWithSecondary = formattedTotalEur;

  let breakdownSummary = '';
  if (totalEur > 0) {
    breakdownSummary = `${totalEur.toLocaleString('ru-RU')} €`;
  } else {
    breakdownSummary = '0 €';
  }

  return {
    totalEur,
    totalRub,
    eurDirect,
    rubDirect,
    rubInEur,
    eurInRub,
    rate,
    count: items.length,
    eurCount,
    rubCount,
    formattedTotalEur,
    formattedTotalRub,
    formattedPrimaryWithSecondary,
    breakdownSummary,
  };
}

/**
 * Robust helper to parse any payment amount into base EUR.
 * Converts RUB values only if string explicitly contains 'RUB' or '₽' / 'руб'.
 * Guards against concatenated string outliers (> 10000 EUR).
 */
export function parsePaymentAmountEUR(val: any, defaultVal = 120, customRate?: number): number {
  if (val === null || val === undefined) return defaultVal;

  const effectiveRate = customRate || (defaultVal > 30 && defaultVal < 300 ? defaultVal : getEurRubRate());

  if (typeof val === 'number') {
    if (isNaN(val) || val <= 0) return defaultVal;
    if (val > 10000) {
      // Outlier protection against concatenated strings or internal IDs
      return defaultVal;
    }
    return val;
  }

  const str = String(val).trim();
  if (!str) return defaultVal;

  const isEur = str.includes('€') || str.toLowerCase().includes('eur');
  const isRub = !isEur && (str.includes('₽') || str.toLowerCase().includes('руб') || str.toUpperCase().includes('RUB'));

  if (isEur) {
    const matchEur = str.match(/([\d\s.,]+)\s*€/);
    if (matchEur) {
      const num = parseFloat(matchEur[1].replace(/[^\d.,]/g, '').replace(',', '.'));
      if (!isNaN(num) && num > 0 && num <= 10000) return num;
    }
  }

  const cleaned = str.replace(/[^\d.,]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed) || parsed <= 0) return defaultVal;

  if (parsed > 10000) {
    return defaultVal;
  }

  if (isRub) {
    return convertRubToEur(parsed, effectiveRate);
  }

  return parsed;
}

/**
 * Converts a payment amount to base EUR using its historical exchangeRate if recorded.
 */
export function convertPaymentToEur(payment: {
  amount: number;
  currency?: string;
  exchangeRate?: number;
}): number {
  if (!payment) return 0;
  if (payment.currency === 'EUR') return payment.amount;
  const rate = payment.exchangeRate && payment.exchangeRate > 0 ? payment.exchangeRate : getEurRubRate();
  return rate > 0 ? payment.amount / rate : payment.amount;
}



