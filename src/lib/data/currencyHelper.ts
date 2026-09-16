'use client';

export const DEFAULT_EUR_RUB_RATE = 100; // 1 EUR = 100 RUB (конверсионный курс по умолчанию)
const EUR_RATE_STORAGE_KEY = 'crm_eur_rub_rate';

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
export function setEurRubRate(rate: number): void {
  if (typeof window === 'undefined') return;
  if (rate > 0) {
    localStorage.setItem(EUR_RATE_STORAGE_KEY, String(rate));
    window.dispatchEvent(new CustomEvent('crm-currency-rate-changed', { detail: { rate } }));
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
