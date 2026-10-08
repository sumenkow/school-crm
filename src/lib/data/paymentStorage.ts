'use client';

import { FullPaymentData, INITIAL_PAYMENTS } from './mockData';
import { getEurRubRate, getCurrencyRateMeta } from './currencyHelper';
import { persistEntityToCloud } from './cloudSync';
import { recordClientAuditEvent } from '@/lib/audit/clientAudit';

const PAYMENTS_STORAGE_KEY = 'crm_payments_v2';

/**
 * Loads all payments from localStorage merged with INITIAL_PAYMENTS.
 * Any newly recorded or updated payments take priority.
 */
export function getStoredPayments(): FullPaymentData[] {
  if (typeof window === 'undefined') return INITIAL_PAYMENTS;
  try {
    const raw = localStorage.getItem(PAYMENTS_STORAGE_KEY);
    if (!raw) return INITIAL_PAYMENTS;
    const stored: FullPaymentData[] = JSON.parse(raw);
    if (!Array.isArray(stored) || stored.length === 0) return INITIAL_PAYMENTS;

    const seenIds = new Set<string>();
    const result: FullPaymentData[] = [];
    let hasMigrated = false;

    for (const p of stored) {
      if (!p || !p.id) continue;
      if (seenIds.has(p.id)) continue;
      seenIds.add(p.id);

      let payment = p;
      if (typeof p.amount === 'number' && p.amount > 500) {
        const converted = Math.round(p.amount / 100);
        payment = {
          ...p,
          amount: converted,
          amountFormatted: `${converted.toLocaleString('ru-RU')} €`,
          currency: 'EUR',
          comment: p.comment ? p.comment.replace(/(\d+[\s\d]*)\s*₽/g, (_, val) => {
            const num = parseInt(val.replace(/\s/g, ''), 10);
            return !isNaN(num) ? `${Math.round(num / 100)} €` : `${converted} €`;
          }) : p.comment,
        };
        hasMigrated = true;
      }
      result.push(payment);
    }

    if (hasMigrated) {
      try {
        localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(result));
      } catch (e) {
        // Ignore storage write error
      }
    }

    return result;
  } catch (err) {
    console.error('Failed to parse stored payments:', err);
    return INITIAL_PAYMENTS;
  }
}

/**
 * Loads all payments from Supabase cloud database and merges with in-memory state.
 */
export async function fetchPaymentsFromSupabase(): Promise<FullPaymentData[]> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { data: dbPayments, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && dbPayments && dbPayments.length > 0) {
      for (const p of dbPayments) {
        const existingIdx = INITIAL_PAYMENTS.findIndex((ip) => ip.id === p.id);
        const amt = Number(p.amount) || 0;
        const mappedPayment: FullPaymentData = {
          id: p.id,
          studentId: p.student_id || '1',
          studentName: 'Ученик',
          parentId: p.parent_id || undefined,
          parentName: undefined,
          courseName: 'Курс школы',
          groupName: 'Основная группа',
          amount: amt,
          amountFormatted: `${amt.toLocaleString('ru-RU')} €`,
          paymentDate: p.payment_date ? new Date(p.payment_date).toLocaleDateString('ru-RU') : new Date().toLocaleDateString('ru-RU'),
          periodLabel: p.period_label || 'Оплата',
          status: (p.status as any) || 'paid',
          paymentMethod: (p.payment_method as any) || 'cash',
          currency: 'EUR',
          paymentType: 'subscription',
          recordedBy: 'Администратор',
          comment: p.comment || undefined,
        };

        if (existingIdx !== -1) {
          INITIAL_PAYMENTS[existingIdx] = { ...INITIAL_PAYMENTS[existingIdx], ...mappedPayment };
        } else {
          INITIAL_PAYMENTS.unshift(mappedPayment);
        }
      }
    }
  } catch (err) {
    console.warn('Supabase payments fetch warning:', err);
  }

  return getStoredPayments();
}

/**
 * Persists payment directly to Supabase cloud database and in-memory store.
 * Dispatches 'crm-payments-changed' event.
 */
export function savePaymentToStorage(payment: FullPaymentData): void {
  // 1. Ensure exchangeRate is captured at payment time
  const currentRate = payment.exchangeRate || getEurRubRate();
  const currentRateSource = payment.exchangeRateSource || getCurrencyRateMeta()?.source || 'ЦБ РФ';
  const paymentWithRate: FullPaymentData = {
    ...payment,
    exchangeRate: currentRate,
    exchangeRateSource: currentRateSource,
  };

  // In-memory update
  const idx = INITIAL_PAYMENTS.findIndex((p) => p.id === paymentWithRate.id);
  if (idx !== -1) {
    INITIAL_PAYMENTS[idx] = paymentWithRate;
  } else {
    INITIAL_PAYMENTS.unshift(paymentWithRate);
  }

  // 2. Direct Supabase Cloud DB write via sync layer
  if (typeof window !== 'undefined') {
    try {
      persistEntityToCloud('payment', paymentWithRate);

      // Audit Trail
      recordClientAuditEvent({
        action: idx !== -1 ? 'PAYMENT_UPDATE' : 'PAYMENT_CREATE',
        entityType: 'payments',
        entityId: paymentWithRate.id,
        entityNameSnapshot: `Оплата ${paymentWithRate.amountFormatted || `${paymentWithRate.amount} €`}`,
        actorName: paymentWithRate.recordedBy,
        description: `Зафиксирована оплата: ${paymentWithRate.amountFormatted || `${paymentWithRate.amount} €`} (${paymentWithRate.studentName || 'Ученик'}, ${paymentWithRate.periodLabel || 'Абонемент'})`,
        afterData: paymentWithRate,
      });

      // Notify all views
      window.dispatchEvent(new CustomEvent('crm-payments-changed', { detail: payment }));
    } catch (err) {
      console.error('Failed to save payment to storage:', err);
    }
  }
}

/**
 * Automatically settles overdue payment records for a student when a payment is made.
 * Updates the payment status from 'overdue' to 'paid', reducing the school's total overdue debt
 * so that only remaining debts from other clients are counted.
 */
export function settleOverduePayments(
  studentId: string,
  amountPaid?: number,
  parentId?: string
): { settledCount: number; settledAmount: number } {
  let settledCount = 0;
  let settledAmount = 0;
  const todayStr = new Date().toLocaleDateString('ru-RU');

  if (typeof window !== 'undefined') {
    try {
      const all = getStoredPayments();
      let remainingBudget = typeof amountPaid === 'number' && amountPaid > 0 ? amountPaid : Infinity;

      const updated = all.map((p) => {
        const isMatch =
          p.status === 'overdue' &&
          (p.studentId ? p.studentId === studentId : (parentId && p.parentId === parentId));

        if (isMatch && remainingBudget > 0) {
          const debt = typeof p.amount === 'number'
            ? p.amount
            : parseFloat(String(p.amount).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;

          if (debt <= 0) return p;

          if (remainingBudget >= debt) {
            remainingBudget -= debt;
            settledCount++;
            settledAmount += debt;
            const settledRecord = {
              ...p,
              status: 'paid' as const,
              paymentDate: todayStr,
              comment: p.comment ? `${p.comment} (Погашено ${todayStr})` : `Задолженность погашена ${todayStr}`,
            };
            persistEntityToCloud('payment', settledRecord);
            return settledRecord;
          }
        }
        return p;
      });

      if (settledCount > 0) {
        localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(updated));
        for (const up of updated) {
          const idx = INITIAL_PAYMENTS.findIndex((x) => x.id === up.id);
          if (idx !== -1) {
            INITIAL_PAYMENTS[idx] = up;
          }
        }
        window.dispatchEvent(new CustomEvent('crm-payments-changed'));
      }
    } catch (err) {
      console.error('Failed to settle overdue payments:', err);
    }
  }

  return { settledCount, settledAmount };
}

