'use client';

import { FullPaymentData, INITIAL_PAYMENTS } from './mockData';

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

    const storedMap = new Map<string, FullPaymentData>(stored.map((p) => [p.id, p]));
    const result: FullPaymentData[] = [];

    // Apply stored changes or fallback to INITIAL_PAYMENTS
    for (const init of INITIAL_PAYMENTS) {
      if (storedMap.has(init.id)) {
        result.push(storedMap.get(init.id)!);
        storedMap.delete(init.id);
      } else {
        result.push(init);
      }
    }

    // Any newly created payments created during sessions
    for (const extra of storedMap.values()) {
      result.unshift(extra);
    }

    return result;
  } catch (err) {
    console.error('Failed to parse stored payments:', err);
    return INITIAL_PAYMENTS;
  }
}

/**
 * Persists payment to localStorage, syncs in-memory INITIAL_PAYMENTS,
 * and dispatches 'crm-payments-changed' event.
 */
export function savePaymentToStorage(payment: FullPaymentData): void {
  // 1. In-memory update
  const idx = INITIAL_PAYMENTS.findIndex((p) => p.id === payment.id);
  if (idx !== -1) {
    INITIAL_PAYMENTS[idx] = payment;
  } else {
    INITIAL_PAYMENTS.unshift(payment);
  }

  // 2. LocalStorage update
  if (typeof window !== 'undefined') {
    try {
      const all = getStoredPayments();
      const existingIdx = all.findIndex((p) => p.id === payment.id);
      let updated: FullPaymentData[];
      if (existingIdx !== -1) {
        updated = all.map((p) => (p.id === payment.id ? payment : p));
      } else {
        updated = [payment, ...all];
      }
      localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(updated));

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
            return {
              ...p,
              status: 'paid' as const,
              paymentDate: todayStr,
              comment: p.comment ? `${p.comment} (Погашено ${todayStr})` : `Задолженность погашена ${todayStr}`,
            };
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

