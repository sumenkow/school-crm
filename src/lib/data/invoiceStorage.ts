'use client';

import { getSchoolSettings, SchoolProfileData } from './schoolSettingsStorage';
import { savePaymentToStorage } from './paymentStorage';
import { FullPaymentData } from './mockData';
import { saveInteractionToStorage, TimelineInteraction } from './timelineStorage';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceEUR: number;
  amountEUR: number;
}

export interface EuropeanInvoiceData {
  id: string;
  invoiceNumber: number; // e.g. 20260342
  variableSymbol: string; // "20260342"
  issueDate: string; // "01.10.2026"
  dueDate: string; // "04.10.2026"
  periodLabel: string; // "Oktober 2026"
  courseName: string; // "EPD Vorbereitung"
  groupName?: string;
  studentId: string;
  studentName: string;
  parentId?: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  parentTelegram?: string;
  items: InvoiceItem[];
  subtotalEUR: number;
  discountEUR: number;
  totalAmountEUR: number; // 270.00
  currency: 'EUR';
  status: 'pending' | 'paid' | 'cancelled' | 'overdue';
  paidAt?: string;
  paymentMethod?: string;
  bankDetails: {
    accountHolder: string;
    bankName: string;
    iban: string;
    swiftBic: string;
    vatNote: string;
  };
  language: 'de' | 'ru' | 'en';
  notes?: string;
  createdAt: string;
}

const INVOICES_STORAGE_KEY = 'crm_invoices_v1';

/**
 * Initial sample invoice to ensure historical consistency with user's invoice #20260341
 */
export const INITIAL_INVOICES: EuropeanInvoiceData[] = [
  {
    id: 'inv_20260341',
    invoiceNumber: 20260341,
    variableSymbol: '20260341',
    issueDate: '01.10.2026',
    dueDate: '03.10.2026',
    periodLabel: 'Oktober 2026',
    courseName: 'EPD Vorbereitung',
    groupName: 'EPD Gruppe A',
    studentId: 'b6666666-6666-4666-8666-666666666666',
    studentName: 'Вася Пупкин',
    parentId: 'a7777777-7777-4777-8777-777777777777',
    parentName: 'Петр Пупкин',
    parentTelegram: '140515453',
    parentPhone: '+7 (999) 777-88-99',
    parentEmail: 'pupkin@example.com',
    items: [
      {
        id: 'item_1',
        description: 'Der Kurs „EPD Vorbereitung“ (Oktober 2026)',
        quantity: 1,
        unitPriceEUR: 270.0,
        amountEUR: 270.0,
      },
    ],
    subtotalEUR: 270.0,
    discountEUR: 0,
    totalAmountEUR: 270.0,
    currency: 'EUR',
    status: 'pending',
    bankDetails: {
      accountHolder: 'Ekaterina Nezhenkina',
      bankName: 'Tatra banka, a.s.',
      iban: 'SK34 1100 0000 0029 3766 3128',
      swiftBic: 'TATRSKBX',
      vatNote: 'Nicht umsatzsteuerpflichtig / Neplatiteľ DPH',
    },
    language: 'de',
    createdAt: '2026-10-01T12:00:00.000Z',
  },
];

/**
 * Loads all invoices from storage.
 */
export function getStoredInvoices(): EuropeanInvoiceData[] {
  if (typeof window === 'undefined') return INITIAL_INVOICES;

  try {
    const raw = localStorage.getItem(INVOICES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(INITIAL_INVOICES));
      return INITIAL_INVOICES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_INVOICES;
  } catch (e) {
    console.error('Failed to parse invoices from storage:', e);
    return INITIAL_INVOICES;
  }
}

/**
 * Automatically calculates the next invoice number (Faktur Nummer / VS).
 * Uses YYYY + sequential counter e.g. 20260341 -> 20260342.
 */
export function getNextInvoiceNumber(): number {
  const currentYear = new Date().getFullYear();
  const baseYearPrefix = currentYear * 10000; // e.g. 20260000

  const school = getSchoolSettings();
  const configuredNext = school.nextInvoiceNumber || (baseYearPrefix + 342);

  const existingInvoices = getStoredInvoices();
  let maxFound = configuredNext - 1;

  for (const inv of existingInvoices) {
    if (typeof inv.invoiceNumber === 'number' && inv.invoiceNumber > maxFound) {
      maxFound = inv.invoiceNumber;
    }
  }

  return Math.max(configuredNext, maxFound + 1);
}

/**
 * Saves a new or updated invoice into storage.
 * Dispatches 'crm-invoices-changed' event.
 */
export function saveInvoice(invoice: EuropeanInvoiceData): void {
  if (typeof window === 'undefined') return;

  try {
    const current = getStoredInvoices();
    const idx = current.findIndex((i) => i.id === invoice.id || i.invoiceNumber === invoice.invoiceNumber);

    let updated: EuropeanInvoiceData[];
    if (idx !== -1) {
      updated = [...current];
      updated[idx] = invoice;
    } else {
      updated = [invoice, ...current];
    }

    localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('crm-invoices-changed', { detail: invoice }));
  } catch (err) {
    console.error('Failed to save invoice:', err);
  }
}

/**
 * Marks an invoice as paid, records a corresponding payment in Finance module,
 * and adds an interaction to the Timeline.
 */
export function markInvoiceAsPaid(invoiceId: string, paymentMethod = 'Bankový prevod (Tatra banka)'): EuropeanInvoiceData | null {
  const invoices = getStoredInvoices();
  const target = invoices.find((i) => i.id === invoiceId);
  if (!target) return null;

  const nowIso = new Date().toISOString();
  const todayStr = new Date().toLocaleDateString('ru-RU');
  const timeStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const updatedInvoice: EuropeanInvoiceData = {
    ...target,
    status: 'paid',
    paidAt: nowIso,
    paymentMethod,
  };

  saveInvoice(updatedInvoice);

  // 1. Record payment in Finance
  const newPayment: FullPaymentData = {
    id: `pay_${target.invoiceNumber}_${Date.now()}`,
    studentId: target.studentId,
    studentName: target.studentName,
    parentId: target.parentId,
    parentName: target.parentName,
    courseName: target.courseName,
    groupName: target.groupName || 'Основная группа',
    amount: target.totalAmountEUR,
    amountFormatted: `${target.totalAmountEUR.toFixed(2)} €`,
    paymentDate: todayStr,
    periodLabel: target.periodLabel,
    status: 'paid',
    paymentMethod: 'bank_transfer',
    currency: 'EUR',
    paymentType: 'subscription',
    recordedBy: 'Администратор школы',
    comment: `Оплата счёта № ${target.invoiceNumber} (VS: ${target.variableSymbol}) через ${paymentMethod}`,
  };
  savePaymentToStorage(newPayment);

  // 2. Add Timeline event
  const timelineEvent: TimelineInteraction = {
    id: `int_pay_${target.invoiceNumber}_${Date.now()}`,
    studentId: target.studentId,
    parentId: target.parentId,
    studentName: target.studentName,
    parentName: target.parentName,
    targetType: target.parentId ? 'parent' : 'student',
    targetName: target.studentName,
    occurredAt: `${todayStr}, ${timeStr}`,
    createdAt: nowIso,
    channel: 'other',
    type: 'payment',
    author: 'Банк / Бухгалтерия',
    content: `Оплачен счёт № ${target.invoiceNumber} (VS: ${target.variableSymbol}) на сумму ${target.totalAmountEUR.toFixed(2)} € за курс «${target.courseName}» (${target.periodLabel}).`,
    result: `Оплата зачислена на счёт ${target.bankDetails.iban}`,
  };
  saveInteractionToStorage(timelineEvent);

  return updatedInvoice;
}
