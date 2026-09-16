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
 * Formats amount in dual currency with primary and converted secondary currency.
 * E.g.: "15 600 ₽ (≈ 156 €)" or "156 € (≈ 15 600 ₽)"
 */
export function formatDualCurrency(
  amount: number,
  baseCurrency: 'RUB' | 'EUR' = 'RUB',
  customRate?: number
): string {
  const rate = customRate || getEurRubRate();

  if (baseCurrency === 'RUB') {
    const eur = convertRubToEur(amount, rate);
    const rubFormatted = `${amount.toLocaleString('ru-RU')} ₽`;
    const eurFormatted = `${eur.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;
    return `${rubFormatted} (≈ ${eurFormatted})`;
  } else {
    const rub = convertEurToRub(amount, rate);
    const eurFormatted = `${amount.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;
    const rubFormatted = `${rub.toLocaleString('ru-RU')} ₽`;
    return `${eurFormatted} (≈ ${rubFormatted})`;
  }
}

/**
 * Formats dual currency specifically for executive reports where EUR is base.
 * E.g.: "156 € (15 600 ₽)"
 */
export function formatExecutiveDualCurrency(
  amountRub: number,
  customRate?: number
): { rubFormatted: string; eurFormatted: string; fullLabel: string } {
  const rate = customRate || getEurRubRate();
  const eur = convertRubToEur(amountRub, rate);
  const rubFormatted = `${amountRub.toLocaleString('ru-RU')} ₽`;
  const eurFormatted = `${eur.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;

  return {
    rubFormatted,
    eurFormatted,
    fullLabel: `${eurFormatted} (${rubFormatted})`,
  };
}
