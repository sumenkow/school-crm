'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Receipt,
  Building2,
  Calendar,
  DollarSign,
  Send,
  Printer,
  Sparkles,
  CheckCircle2,
  Bot,
  Mail,
  FileText,
  CreditCard,
  QrCode,
} from 'lucide-react';
import {
  EuropeanInvoiceData,
  getNextInvoiceNumber,
  saveInvoice,
} from '@/lib/data/invoiceStorage';
import { getSchoolSettings } from '@/lib/data/schoolSettingsStorage';
import { DatePicker } from '@/components/common/DatePicker';
import { transliterateIso } from '@/lib/data/transliteration';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: string;
  studentName?: string;
  parentId?: string;
  parentName?: string;
  parentTelegram?: string;
  parentEmail?: string;
  parentPhone?: string;
  defaultCourseName?: string;
  defaultAmountEUR?: number;
  onInvoiceCreated?: (invoice: EuropeanInvoiceData) => void;
}

export function CreateInvoiceModal({
  isOpen,
  onClose,
  studentId = 'b6666666-6666-4666-8666-666666666666',
  studentName = 'Вася Пупкин',
  parentId,
  parentName,
  parentTelegram,
  parentEmail,
  parentPhone,
  defaultCourseName = 'EPD Vorbereitung',
  defaultAmountEUR = 270.0,
  onInvoiceCreated,
}: CreateInvoiceModalProps) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const school = getSchoolSettings();

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState<number>(() => getNextInvoiceNumber());
  const [courseName, setCourseName] = useState(defaultCourseName);
  const [periodLabel, setPeriodLabel] = useState('Oktober 2026');
  const [amountEUR, setAmountEUR] = useState<number>(defaultAmountEUR);
  const [discountEUR, setDiscountEUR] = useState<number>(0);
  const [dueDate, setDueDate] = useState('04.10.2026');
  const [issueDate, setIssueDate] = useState('01.10.2026');
  const [language, setLanguage] = useState<'de' | 'ru' | 'en'>('de');

  // Dispatch channel
  const [sendViaTelegram, setSendViaTelegram] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const nextNum = getNextInvoiceNumber();
      setInvoiceNumber(nextNum);
      if (defaultCourseName) {
        setCourseName(defaultCourseName);
      }
      if (defaultAmountEUR) {
        setAmountEUR(defaultAmountEUR);
      }
      const now = new Date();
      setIssueDate(now.toLocaleDateString('ru-RU'));

      const due = new Date();
      due.setDate(due.getDate() + 3);
      setDueDate(due.toLocaleDateString('ru-RU'));
    }
  }, [isOpen, defaultCourseName, defaultAmountEUR]);

  if (!isOpen) return null;

  const finalTotal = Math.max(0, amountEUR - discountEUR);

  const handleSubmit = async (e?: React.FormEvent, action: 'save_open' | 'send_telegram' = 'save_open') => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    try {
      const latinStudentName = transliterateIso(studentName);
      const latinParentName = parentName ? transliterateIso(parentName) : undefined;

      const newInvoice: EuropeanInvoiceData = {
        id: `inv_${invoiceNumber}`,
        invoiceNumber,
        variableSymbol: String(invoiceNumber),
        issueDate,
        dueDate,
        periodLabel,
        courseName: courseName.trim() || 'EPD Vorbereitung',
        studentId,
        studentName: latinStudentName,
        parentId,
        parentName: latinParentName || latinStudentName,
        parentTelegram,
        parentEmail,
        parentPhone,
        items: [
          {
            id: `item_${Date.now()}`,
            description: `Der Kurs „${courseName.trim()}“ (${periodLabel})`,
            quantity: 1,
            unitPriceEUR: amountEUR,
            amountEUR: amountEUR,
          },
        ],
        subtotalEUR: amountEUR,
        discountEUR,
        totalAmountEUR: finalTotal,
        currency: 'EUR',
        status: 'pending',
        bankDetails: {
          accountHolder: school.accountHolder || 'Ekaterina Nezhenkina',
          bankName: school.bankName || 'Tatra banka, a.s.',
          iban: school.iban || 'SK34 1100 0000 0029 3766 3128',
          swiftBic: school.swiftBic || 'TATRSKBX',
          vatNote: school.vatNote || 'Nicht umsatzsteuerpflichtig gem. Kleinunternehmerregelung / Steuerbefreit',
        },
        language,
        createdAt: new Date().toISOString(),
      };

      // 1. Save locally and dispatch event
      saveInvoice(newInvoice);
      onInvoiceCreated?.(newInvoice);

      // 2. Send via Telegram if requested
      if (action === 'send_telegram' || sendViaTelegram) {
        if (parentTelegram) {
          try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('crm_tg_bot_token') : '';
            await fetch('/api/invoices/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                invoice: newInvoice,
                channel: 'telegram',
                customBotToken: token || undefined,
              }),
            });
            success(`Счёт № ${invoiceNumber} успешно выставлен и отправлен в Telegram!`);
          } catch (tgErr) {
            console.warn('Telegram send warning:', tgErr);
            success(`Счёт № ${invoiceNumber} сохранён!`);
          }
        } else {
          success(`Счёт № ${invoiceNumber} сохранён!`);
        }
      } else {
        success(`Счёт № ${invoiceNumber} успешно создан!`);
      }

      onClose();

      // Open detail page
      router.push(`/invoices/${newInvoice.id}`);
    } catch (err: any) {
      showError(err.message || 'Ошибка создания счёта');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Выставить счёт на оплату (Faktúra)</h3>
              <p className="text-xs text-slate-500">Автоматический сбор данных и генерация SEPA QR-кода Tatra banka</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={(e) => handleSubmit(e, 'save_open')} className="space-y-4 text-xs">
          {/* Section 1: Number & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Faktur № (VS)
              </label>
              <input
                type="number"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Дата счёта
              </label>
              <input
                type="text"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <DatePicker
                label="Срок оплаты (до)"
                value={dueDate}
                onChange={(iso, display) => setDueDate(display || iso)}
                required
              />
            </div>
          </div>

          {/* Section 2: Student & Course */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Плательщик / Ученик</label>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900">
                {studentName} {parentName && parentName !== studentName ? `(${parentName})` : ''}
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Название курса (на немецком)</label>
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="EPD Vorbereitung"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {['Deutsch A1', 'Deutsch A2', 'Deutsch B1', 'Deutsch B2', 'Texteschreiben', 'Grammatik', 'EPD Vorbereitung'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCourseName(c)}
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer border',
                      courseName === c
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Amount, Period & Discount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Период обучения</label>
              <input
                type="text"
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                placeholder="Oktober 2026"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Тариф за период (€)</label>
              <input
                type="number"
                step="0.01"
                value={amountEUR}
                onChange={(e) => setAmountEUR(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Скидка (€)</label>
              <input
                type="number"
                step="0.01"
                value={discountEUR}
                onChange={(e) => setDiscountEUR(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Bank Summary Preview */}
          <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-3 space-y-1.5 text-xs text-slate-700">
            <div className="flex items-center justify-between font-bold text-slate-900 border-b border-blue-100 pb-1">
              <span>Реквизиты Tatra banka:</span>
              <span className="text-emerald-700 font-extrabold text-sm">Итого: {finalTotal.toFixed(2)} €</span>
            </div>
            <p className="text-[11px] text-slate-600">
              <strong>Kontoinhaber:</strong> {school.accountHolder || 'Ekaterina Nezhenkina'} • <strong>IBAN:</strong> {school.iban || 'SK34 1100 0000 0029 3766 3128'}
            </p>
            <p className="text-[11px] text-slate-600">
              <strong>Variabilný symbol (VS):</strong> <span className="font-mono text-blue-700 font-bold">{invoiceNumber}</span> • <strong>SWIFT/BIC:</strong> {school.swiftBic || 'TATRSKBX'}
            </p>
          </div>

          {/* Telegram Send Option */}
          {parentTelegram && (
            <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100/80 transition-colors">
              <input
                type="checkbox"
                checked={sendViaTelegram}
                onChange={(e) => setSendViaTelegram(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Bot size={14} className="text-[#229ED9]" />
                  Сразу отправить счёт в Telegram клиенту
                </span>
                <p className="text-[11px] text-slate-500">
                  Бот отправит реквизиты, сумму и ссылку на оплату в чат клиенту
                </p>
              </div>
            </label>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Send size={14} className={cn(isSubmitting && 'animate-spin')} />
              {sendViaTelegram && parentTelegram ? 'Выставить и отправить в Telegram' : 'Выставить счёт и открыть'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
