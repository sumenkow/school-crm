'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  CreditCard,
  QrCode,
  User,
  Search,
} from 'lucide-react';
import {
  EuropeanInvoiceData,
  getNextInvoiceNumber,
  saveInvoice,
} from '@/lib/data/invoiceStorage';
import { getSchoolSettings } from '@/lib/data/schoolSettingsStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { FullStudentData, INITIAL_STUDENTS } from '@/lib/data/mockData';
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
  studentId,
  studentName,
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

  // Students list
  const [students, setStudents] = useState<FullStudentData[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [currentStudentName, setCurrentStudentName] = useState<string>('');
  const [currentParentId, setCurrentParentId] = useState<string | undefined>(undefined);
  const [currentParentName, setCurrentParentName] = useState<string | undefined>(undefined);
  const [currentParentTelegram, setCurrentParentTelegram] = useState<string | undefined>(undefined);
  const [currentParentEmail, setCurrentParentEmail] = useState<string | undefined>(undefined);
  const [currentParentPhone, setCurrentParentPhone] = useState<string | undefined>(undefined);

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

  const applyStudentData = (st: FullStudentData) => {
    setSelectedStudentId(st.id);
    const fullName = `${st.firstName} ${st.lastName}`.trim();
    setCurrentStudentName(fullName);

    const primaryParent = st.parents?.[0];
    if (primaryParent) {
      setCurrentParentId(primaryParent.id);
      setCurrentParentName(`${primaryParent.firstName || ''} ${primaryParent.lastName || ''}`.trim() || undefined);
      setCurrentParentTelegram(primaryParent.telegram || st.telegram);
      setCurrentParentEmail(primaryParent.email || st.email);
      setCurrentParentPhone(primaryParent.phone || st.phone);
    } else {
      setCurrentParentId(undefined);
      setCurrentParentName(undefined);
      setCurrentParentTelegram(st.telegram);
      setCurrentParentEmail(st.email);
      setCurrentParentPhone(st.phone);
    }

    // Auto-detect course name in German
    const detectedCourse = st.groups?.[0]?.courseName || st.groups?.[0]?.name;
    if (detectedCourse) {
      setCourseName(detectedCourse);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const allStudents = typeof window !== 'undefined' ? getStoredStudents() : INITIAL_STUDENTS;
      setStudents(allStudents);

      // Determine initial active student
      let activeSt: FullStudentData | undefined;
      if (studentId) {
        activeSt = allStudents.find((s) => s.id === studentId);
      }
      if (!activeSt && studentName) {
        activeSt = allStudents.find((s) => `${s.firstName} ${s.lastName}`.toLowerCase().includes(studentName.toLowerCase()));
      }
      if (!activeSt && allStudents.length > 0) {
        activeSt = allStudents[0];
      }

      if (activeSt) {
        applyStudentData(activeSt);
      } else {
        setSelectedStudentId(studentId || 'st_1');
        setCurrentStudentName(studentName || 'Schüler');
        setCurrentParentId(parentId);
        setCurrentParentName(parentName);
        setCurrentParentTelegram(parentTelegram);
        setCurrentParentEmail(parentEmail);
        setCurrentParentPhone(parentPhone);
      }

      const nextNum = getNextInvoiceNumber();
      setInvoiceNumber(nextNum);

      if (defaultCourseName && !activeSt?.groups?.[0]?.courseName) {
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
  }, [isOpen, studentId, studentName, parentId, parentName, parentTelegram, parentEmail, parentPhone, defaultCourseName, defaultAmountEUR]);

  if (!isOpen) return null;

  const finalTotal = Math.max(0, amountEUR - discountEUR);

  const handleSubmit = async (e?: React.FormEvent, action: 'save_open' | 'send_telegram' = 'save_open') => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    try {
      const latinStudentName = transliterateIso(currentStudentName);
      const latinParentName = currentParentName ? transliterateIso(currentParentName) : undefined;

      const newInvoice: EuropeanInvoiceData = {
        id: `inv_${invoiceNumber}`,
        invoiceNumber,
        variableSymbol: String(invoiceNumber),
        issueDate,
        dueDate,
        periodLabel,
        courseName: courseName.trim() || 'EPD Vorbereitung',
        studentId: selectedStudentId || studentId || 'st_1',
        studentName: latinStudentName,
        parentId: currentParentId || parentId,
        parentName: latinParentName || latinStudentName,
        parentTelegram: currentParentTelegram || parentTelegram,
        parentEmail: currentParentEmail || parentEmail,
        parentPhone: currentParentPhone || parentPhone,
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
        const tgChatId = currentParentTelegram || parentTelegram;
        if (tgChatId) {
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
              <FileText className="h-5 w-5" />
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

          {/* Section 2: Student Selector & Course */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Выберите ученика / плательщика <span className="text-rose-500">*</span>
              </label>
              {students.length > 0 ? (
                <select
                  value={selectedStudentId}
                  onChange={(e) => {
                    const val = e.target.value;
                    const st = students.find((s) => s.id === val);
                    if (st) applyStudentData(st);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                >
                  {students.map((st) => {
                    const grp = st.groups?.[0]?.name || st.groups?.[0]?.courseName || 'Без группы';
                    const par = st.parents?.[0] ? ` • Род.: ${st.parents[0].firstName}` : '';
                    return (
                      <option key={st.id} value={st.id}>
                        {st.firstName} {st.lastName} ({grp}{par})
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900">
                  {currentStudentName || 'Ученик'}
                </div>
              )}
              {currentParentName && currentParentName !== currentStudentName && (
                <p className="text-[11px] text-slate-500 mt-1 pl-0.5 truncate">
                  Представитель: <strong className="text-slate-700 font-semibold">{currentParentName}</strong>
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Название курса (на немецком) <span className="text-rose-500">*</span>
              </label>
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
                min="0"
                value={amountEUR}
                onChange={(e) => setAmountEUR(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Скидка (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountEUR}
                onChange={(e) => setDiscountEUR(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 text-emerald-600"
              />
            </div>
          </div>

          {/* Section 4: Bank Details Summary */}
          <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 space-y-1 text-xs">
            <div className="flex items-center justify-between text-blue-900 font-bold">
              <span className="flex items-center gap-1.5">
                <CreditCard size={14} className="text-blue-600" />
                Реквизиты Tatra banka:
              </span>
              <span className="font-mono text-sm text-blue-800 font-black">{finalTotal.toFixed(2)} €</span>
            </div>
            <p className="text-[11px] text-blue-800/80 font-mono">
              IBAN: {school.iban || 'SK34 1100 0000 0029 3766 3128'} • SWIFT: {school.swiftBic || 'TATRSKBX'}
            </p>
            <p className="text-[10px] text-slate-500">
              Получатель: <strong>{school.accountHolder || 'Ekaterina Nezhenkina'}</strong> • VS: <strong className="font-mono">{invoiceNumber}</strong>
            </p>
          </div>

          {/* Section 5: Dispatch Options */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sendViaTelegram}
                onChange={(e) => setSendViaTelegram(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-semibold text-slate-800">
                Отправить счёт в Telegram-бот {currentParentTelegram ? `(${currentParentTelegram})` : ''}
              </span>
            </label>
            {!currentParentTelegram && sendViaTelegram && (
              <p className="text-[11px] text-amber-600 pl-6">
                ⚠️ У плательщика не указан Telegram. Счёт будет сохранен для ручной отправки или печати.
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <QrCode size={14} />
              {isSubmitting ? 'Формирование...' : 'Сформировать счёт (Faktúra)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
