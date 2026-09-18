'use client';

import React, { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  ArrowUpRight,
  Filter,
  MessageSquare,
  CheckSquare,
  Snowflake,
  RotateCcw,
  Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { INITIAL_PAYMENTS, INITIAL_SUBSCRIPTIONS, FullPaymentData, FullSubscriptionData } from '@/lib/data/mockData';
import { getStoredPayments, savePaymentToStorage } from '@/lib/data/paymentStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { calculateMultiCurrencyTotals, getEurRubRate, convertRubToEur } from '@/lib/data/currencyHelper';
import { RecordPaymentModal } from '@/components/finance/RecordPaymentModal';
import { CreateSubscriptionModal } from '@/components/finance/CreateSubscriptionModal';
import { triggerWhatsAppContact, triggerTelegramContact } from '@/lib/data/contactWorkflows';
import { useLanguage } from '@/context/LanguageContext';
import { useRole } from '@/context/RoleContext';

function getRenewalDate(endDateStr?: string): string {
  if (!endDateStr) return '—';
  const parts = endDateStr.split('.');
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    const date = new Date(y, m, d);
    date.setDate(date.getDate() - 2);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  return endDateStr;
}

function getSubscriptionComputedStatus(s: FullSubscriptionData): 'active' | 'frozen' | 'expired' {
  if (s.status === 'frozen') return 'frozen';
  if (s.lessonsAttended >= s.lessonsTotal) return 'expired';
  const parts = s.endDate?.split('.');
  if (parts && parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    const expiry = new Date(y, m, d, 23, 59, 59);
    const refDate = new Date(2026, 8, 2);
    if (refDate > expiry) return 'expired';
  }
  return 'active';
}

function FinanceContent() {
  const { role } = useRole();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter');
  const rate = getEurRubRate();
  const [students, setStudents] = useState(() => (typeof window !== 'undefined' ? getStoredStudents() : []));

  const [activeTab, setActiveTab] = useState<'payments' | 'subscriptions' | 'debts'>(
    filterParam === 'overdue' ? 'debts' : 'payments'
  );
  const [payments, setPayments] = useState<FullPaymentData[]>(() => {
    return typeof window !== 'undefined' ? getStoredPayments() : INITIAL_PAYMENTS;
  });
  const [subscriptions, setSubscriptions] = useState<FullSubscriptionData[]>(INITIAL_SUBSCRIPTIONS);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');

  useEffect(() => {
    const sync = () => {
      setPayments(getStoredPayments());
    };
    sync();
    window.addEventListener('crm-payments-changed', sync);
    window.addEventListener('crm-students-changed', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('crm-payments-changed', sync);
      window.removeEventListener('crm-students-changed', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  useEffect(() => {
    if (filterParam === 'overdue') {
      setActiveTab('debts');
    }
  }, [filterParam]);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<string | undefined>();
  const [selectedParentForPayment, setSelectedParentForPayment] = useState<string | undefined>();
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  const handlePaymentRecorded = (newPayment: FullPaymentData) => {
    savePaymentToStorage(newPayment);
    setPayments(getStoredPayments());
  };

  const handleSubCreated = (newSub: FullSubscriptionData) => {
    setSubscriptions((prev) => [newSub, ...prev]);
  };

  const handleFreezeSub = (id: string) => {
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: s.status === 'frozen' ? 'active' : 'frozen' } : s))
    );
  };

  // Multi-Currency KPIs
  const paidPayments = payments.filter((p) => p.status === 'paid');
  const paidTotals = calculateMultiCurrencyTotals(paidPayments, rate);
  const expectedTotals = calculateMultiCurrencyTotals(
    payments.filter((p) => p.status === 'expected'),
    rate
  );
  const overdueTotals = calculateMultiCurrencyTotals(
    payments.filter((p) => p.status === 'overdue'),
    rate
  );
  const overduePayments = payments.filter((p) => p.status === 'overdue');

  const filteredPaidPayments = paidPayments.filter((p) => {
    if (paymentMethodFilter === 'all') return true;
    return p.paymentMethod === paymentMethodFilter;
  });

  // Debts aggregated by family (Requirement 3.4: prevent duplicate reminders to the same parent)
  interface FamilyDebtGroup {
    familyKey: string;
    parentId?: string;
    parentName: string;
    contactPhone: string;
    studentNames: string[];
    payments: FullPaymentData[];
    totalRub: number;
    totalEur: number;
  }

  const familyDebtsMap = new Map<string, FamilyDebtGroup>();
  for (const p of overduePayments) {
    const matchedStudent = students.find((st) => st.id === p.studentId);
    const parent = matchedStudent?.parents?.[0];
    const contactPhone = parent?.phone || matchedStudent?.parentPhone || matchedStudent?.phone || '+7 (999) 234-56-78';
    const parentName = p.parentName || (parent ? `${parent.firstName} ${parent.lastName}` : 'Родитель');
    const familyKey = p.parentId || parent?.id || contactPhone;

    const numAmount = typeof p.amount === 'number'
      ? p.amount
      : parseFloat(String(p.amount).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    const isEur = p.currency === 'EUR' || p.amountFormatted?.includes('€');
    const eurVal = isEur ? numAmount : convertRubToEur(numAmount, rate);
    const rubVal = isEur ? Math.round(numAmount * rate) : numAmount;

    const existing = familyDebtsMap.get(familyKey);
    if (existing) {
      existing.payments.push(p);
      if (!existing.studentNames.includes(p.studentName)) {
        existing.studentNames.push(p.studentName);
      }
      existing.totalRub += rubVal;
      existing.totalEur += eurVal;
    } else {
      familyDebtsMap.set(familyKey, {
        familyKey,
        parentId: p.parentId || parent?.id,
        parentName,
        contactPhone,
        studentNames: [p.studentName],
        payments: [p],
        totalRub: rubVal,
        totalEur: eurVal,
      });
    }
  }

  const aggregatedFamilyDebts = Array.from(familyDebtsMap.values());

  if (role === 'teacher') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white rounded-2xl border border-slate-200 shadow-xs max-w-lg mx-auto my-8">
        <div className="h-14 w-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Доступ ограничен</h2>
        <p className="text-xs text-slate-500 max-w-sm mb-5">
          У вас активна роль Преподавателя. Раздел финансов, оплат и задолженностей доступен только администраторам и владельцу школы.
        </p>
        <Link
          href="/schedule"
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
        >
          Перейти к расписанию
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('finance.title', 'Финансы и Абонементы')}</h1>
          <p className="text-sm text-slate-500">
            {t('finance.subtitle', 'Мультивалютный учет (EUR / RUB), касса и периоды обучения')} • 1 € = {rate} ₽
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            {t('finance.recordPayment', 'Внести оплату')}
          </button>
          <button
            onClick={() => setIsSubModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            {t('finance.newSubscription', 'Оформить абонемент')}
          </button>
        </div>
      </div>

      {/* KPI Section: Mobile Horizontal Bar (< 768px) per Requirement 3.4 */}
      <div className="sm:hidden grid grid-cols-3 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-xs">
        <div>
          <span className="text-[10px] font-semibold text-slate-500 block">Касса</span>
          <p className="text-sm font-extrabold text-emerald-700 mt-0.5">{paidTotals.formattedTotalEur}</p>
          <p className="text-[9px] text-slate-400">≈ {paidTotals.formattedTotalRub}</p>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-slate-500 block">Ожидаем</span>
          <p className="text-sm font-extrabold text-blue-700 mt-0.5">{expectedTotals.formattedTotalEur}</p>
          <p className="text-[9px] text-slate-400">≈ {expectedTotals.formattedTotalRub}</p>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-rose-700 block">Долг</span>
          <p className="text-sm font-extrabold text-rose-700 mt-0.5">{overdueTotals.formattedTotalEur}</p>
          <p className="text-[9px] text-rose-500">≈ {overdueTotals.formattedTotalRub}</p>
        </div>
      </div>

      {/* KPI Cards: Desktop (>= 768px) */}
      <div className="hidden sm:grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{t('finance.totalRevenue', 'Фактическая выручка (Касса)')}</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{paidTotals.formattedTotalEur}</p>
          <p className="text-xs text-emerald-700 font-semibold mt-0.5">≈ {paidTotals.formattedTotalRub}</p>
          <p className="text-[11px] text-slate-500 mt-1">{paidTotals.breakdownSummary}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{t('finance.expectedRevenue', 'Ожидается к поступлению')}</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{expectedTotals.formattedTotalEur}</p>
          <p className="text-xs text-blue-700 font-semibold mt-0.5">≈ {expectedTotals.formattedTotalRub}</p>
          <p className="text-[11px] text-slate-500 mt-1">{expectedTotals.breakdownSummary}</p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800">{t('finance.overdueDebt', 'Просроченная задолженность')}</span>
            <div className="rounded-lg bg-rose-100 p-2 text-rose-700">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-1 text-2xl font-extrabold text-rose-700">{overdueTotals.formattedTotalEur}</p>
          <p className="text-xs text-rose-800 font-semibold mt-0.5">≈ {overdueTotals.formattedTotalRub}</p>
          <p className="text-[11px] text-rose-600 mt-1 font-medium">
            {overduePayments.length} • {overdueTotals.breakdownSummary}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('payments')}
          className={cn(
            'px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer',
            activeTab === 'payments'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          {t('finance.tabPayments', 'История платежей')} ({paidPayments.length})
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={cn(
            'px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer',
            activeTab === 'subscriptions'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          {t('finance.tabSubscriptions', 'Абонементы')} ({subscriptions.length})
        </button>
        <button
          onClick={() => setActiveTab('debts')}
          className={cn(
            'px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer',
            activeTab === 'debts'
              ? 'border-rose-600 text-rose-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <span>{t('finance.tabDebts', 'Долги и задолженности')}</span>
          <span className="rounded-full bg-rose-100 text-rose-800 px-1.5 py-0.2 text-[10px] font-bold">
            {overduePayments.length}
          </span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Filter className="h-3.5 w-3.5" />
              <span>Способ оплаты:</span>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Все способы</option>
                <option value="card">Банковская карта</option>
                <option value="bank_transfer">Перевод по СБП</option>
                <option value="cash">Наличные</option>
                <option value="invoice">По счету (ООО)</option>
              </select>
            </div>
            <span className="text-xs text-slate-500">
              Отображаются только подтвержденные оплаты ({filteredPaidPayments.length})
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            {/* Mobile Payments Cards List (< 768px) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredPaidPayments.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Нет подтвержденных платежей
                </div>
              ) : (
                filteredPaidPayments.map((p) => {
                  const numAmount = typeof p.amount === 'number'
                    ? p.amount
                    : parseFloat(String(p.amount).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
                  const eurAmount = convertRubToEur(numAmount, rate);

                  return (
                    <div key={p.id} className="p-3.5 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link href={`/students/${p.studentId}`} className="font-bold text-slate-900 text-xs hover:text-blue-600 truncate block">
                            {p.studentName}
                          </Link>
                          <p className="text-[10px] text-slate-500 truncate">
                            {p.parentName} • {p.courseName} ({p.groupName})
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-extrabold text-xs text-slate-900 block">{p.amountFormatted}</span>
                          <span className="text-[10px] text-slate-500 block">
                            (~{eurAmount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>{p.paymentDate} • {p.periodLabel}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.2 text-[10px] font-bold">
                            Оплачено
                          </span>
                          <button
                            onClick={() => alert(`Чек для ${p.studentName} отправлен на печать`)}
                            className="rounded p-1 text-slate-400 hover:text-slate-700"
                            title="Печать чека"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600">
                  <tr>
                    <th className="py-3 pl-4 pr-3">Ученик / Родитель</th>
                    <th className="px-3 py-3">Курс / Группа</th>
                    <th className="px-3 py-3 text-right">Сумма (RUB / EUR)</th>
                    <th className="px-3 py-3">Дата</th>
                    <th className="px-3 py-3">Период</th>
                    <th className="px-3 py-3">Способ</th>
                    <th className="px-3 py-3">Статус</th>
                    <th className="px-3 py-3 text-center">Чек</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPaidPayments.map((p) => {
                    const numAmount = typeof p.amount === 'number'
                      ? p.amount
                      : parseFloat(String(p.amount).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
                    const eurAmount = convertRubToEur(numAmount, rate);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 pl-4 pr-3">
                          <Link href={`/students/${p.studentId}`} className="font-semibold text-slate-900 hover:text-blue-600">
                            {p.studentName}
                          </Link>
                          <p className="text-[11px] text-slate-500">{p.parentName}</p>
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {p.courseName}
                          <span className="block text-[11px] text-slate-500">{p.groupName}</span>
                        </td>
                        <td className="px-3 py-3 font-bold text-slate-900 text-right">
                          <span>{p.amountFormatted}</span>
                          <span className="block text-[11px] font-normal text-slate-500">
                            (~{eurAmount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €)
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{p.paymentDate}</td>
                        <td className="px-3 py-3 text-slate-600">{p.periodLabel}</td>
                        <td className="px-3 py-3 text-slate-600">
                          {p.paymentMethod === 'card' && 'Банковская карта'}
                          {p.paymentMethod === 'cash' && 'Наличные'}
                          {p.paymentMethod === 'bank_transfer' && 'Перевод по СБП'}
                          {p.paymentMethod === 'invoice' && 'По счету (ООО)'}
                          {(p.paymentMethod as any) === 'deposit_deduction' && 'Списание с депозита'}
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold inline-block bg-emerald-100 text-emerald-800">
                            Оплачено
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => alert(`Чек для ${p.studentName} отправлен на печать`)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            title="Печать фискального чека"
                          >
                            <Receipt className="h-4 w-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'subscriptions' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          {/* Mobile Subscriptions Cards List (< 768px) */}
          <div className="md:hidden divide-y divide-slate-100">
            {subscriptions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">Нет активных абонементов</div>
            ) : (
              subscriptions.map((s) => {
                const computedStatus = getSubscriptionComputedStatus(s);
                const computedRenewalDate = s.renewalDate || getRenewalDate(s.endDate);
                return (
                  <div key={s.id} className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/students/${s.studentId}`} className="font-bold text-slate-900 text-xs hover:text-blue-600 truncate block">
                          {s.studentName}
                        </Link>
                        <p className="text-[10px] text-slate-500 truncate">{s.courseName} • {s.groupName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-xs text-slate-900 block">{s.priceFormatted}</span>
                        <span className="text-[10px] font-semibold text-blue-700 block">Продление: {computedRenewalDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                      <span>{s.lessonsAttended} из {s.lessonsTotal} зан.</span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.2 text-[9px] font-bold',
                            computedStatus === 'active' && 'bg-emerald-100 text-emerald-800',
                            computedStatus === 'frozen' && 'bg-blue-100 text-blue-800',
                            computedStatus === 'expired' && 'bg-slate-100 text-slate-700'
                          )}
                        >
                          {computedStatus === 'active' ? 'Активен' : computedStatus === 'frozen' ? 'Заморожен' : 'Истек'}
                        </span>
                        <button
                          onClick={() => handleFreezeSub(s.id)}
                          className="rounded border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                        >
                          {s.status === 'frozen' ? 'Разморозить' : 'Заморозка'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table (>= 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600">
                <tr>
                  <th className="py-3 pl-4 pr-3">Ученик</th>
                  <th className="px-3 py-3">Курс / Группа</th>
                  <th className="px-3 py-3">Срок действия</th>
                  <th className="px-3 py-3 text-right">Посещено</th>
                  <th className="px-3 py-3">Следующее продление</th>
                  <th className="px-3 py-3 text-right">Стоимость</th>
                  <th className="px-3 py-3">Статус</th>
                  <th className="px-3 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((s) => {
                  const computedStatus = getSubscriptionComputedStatus(s);
                  const computedRenewalDate = s.renewalDate || getRenewalDate(s.endDate);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 pl-4 pr-3">
                        <Link href={`/students/${s.studentId}`} className="font-semibold text-slate-900 hover:text-blue-600">
                          {s.studentName}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {s.courseName}
                        <span className="block text-[11px] text-slate-500">{s.groupName}</span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {s.startDate} – {s.endDate}
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-900 text-right">
                        {s.lessonsAttended} из {s.lessonsTotal} зан.
                      </td>
                      <td className="px-3 py-3 text-slate-700 font-medium">{computedRenewalDate}</td>
                      <td className="px-3 py-3 font-bold text-slate-900 text-right">{s.priceFormatted}</td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-bold inline-block',
                            computedStatus === 'active' && 'bg-emerald-100 text-emerald-800',
                            computedStatus === 'frozen' && 'bg-blue-100 text-blue-800',
                            computedStatus === 'expired' && 'bg-slate-100 text-slate-700'
                          )}
                        >
                          {computedStatus === 'active' && 'Активен'}
                          {computedStatus === 'frozen' && 'Заморожен'}
                          {computedStatus === 'expired' && 'Истек'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => handleFreezeSub(s.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          <Snowflake className="h-3 w-3 text-blue-500" />
                          {s.status === 'frozen' ? 'Разморозить' : 'Заморозка'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'debts' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-rose-950">
                  Семьи с просроченными платежами ({aggregatedFamilyDebts.length} {aggregatedFamilyDebts.length === 1 ? 'семья' : 'семей'}, {overduePayments.length} {overduePayments.length === 1 ? 'долг' : 'долгов'})
                </p>
                <p className="text-xs text-rose-800 mt-0.5">
                  Общая сумма задолженности составляет <strong>{overdueTotals.totalEur.toLocaleString('ru-RU')} € (≈ {overdueTotals.totalRub.toLocaleString('ru-RU')} ₽)</strong>. Долги по детям одной семьи объединены для отправки единого вежливого напоминания.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-xs">
            {aggregatedFamilyDebts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Задолженностей нет — все платежи внесены вовремя!
              </div>
            ) : (
              aggregatedFamilyDebts.map((fam) => {
                const reminderMsg = `Здравствуйте, ${fam.parentName || 'уважаемый родитель'}! Напоминаем об оплате обучения ваших детей (${fam.studentNames.join(', ')}) на общую сумму ${fam.totalEur.toLocaleString('ru-RU')} € (≈ ${fam.totalRub.toLocaleString('ru-RU')} ₽). Подскажите, пожалуйста, удалось ли ознакомиться со счетом?`;

                return (
                  <div key={fam.familyKey} className="p-4 space-y-3">
                    {/* Family Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">
                            Семья: {fam.parentName}
                          </span>
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                            {fam.payments.length > 1 ? `${fam.payments.length} долга` : 'Просрочка'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Дети: <strong className="text-slate-700">{fam.studentNames.join(', ')}</strong> • Тел: {fam.contactPhone}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 sm:self-center">
                        <div className="text-right">
                          <span className="text-base font-black text-rose-700 block">
                            {fam.totalEur.toLocaleString('ru-RU')} €
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            ≈ {fam.totalRub.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              triggerWhatsAppContact({
                                phone: fam.contactPhone,
                                template: reminderMsg,
                                parentId: fam.parentId,
                                clientName: fam.parentName,
                                targetRole: 'Родитель',
                              })
                            }
                            className="rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            title="Отправить единое напоминание в WhatsApp"
                          >
                            <span>WA</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              triggerTelegramContact({
                                phone: fam.contactPhone,
                                parentId: fam.parentId,
                                clientName: fam.parentName,
                                targetRole: 'Родитель',
                              })
                            }
                            className="rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 p-2 transition-colors cursor-pointer"
                            title="Написать родителю в Telegram"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                          <Link
                            href="/tasks"
                            className="rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 transition-colors"
                            title="Поставить задачу по долгу семьи"
                          >
                            <CheckSquare className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Children Breakdown */}
                    <div className="space-y-2 pl-1 sm:pl-2">
                      {fam.payments.map((p) => (
                        <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
                          <div className="min-w-0">
                            <Link href={`/students/${p.studentId}`} className="font-bold text-slate-900 hover:text-blue-600">
                              {p.studentName}
                            </Link>
                            <span className="text-slate-500 ml-2">Группа: {p.groupName} • Период: {p.periodLabel}</span>
                            {p.comment && <p className="text-[11px] text-rose-700 mt-0.5">{p.comment}</p>}
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                            <span className="font-bold text-rose-700">{p.amountFormatted}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudentForPayment(p.studentId);
                                setSelectedParentForPayment(fam.parentId);
                                setIsPaymentModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-2xs"
                              title="Погасить долг"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              Погасить
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedStudentForPayment(undefined);
          setSelectedParentForPayment(undefined);
        }}
        initialStudentId={selectedStudentForPayment}
        initialParentId={selectedParentForPayment}
        onRecorded={handlePaymentRecorded}
      />

      <CreateSubscriptionModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        onCreated={handleSubCreated}
      />
    </div>
  );
}

export default function FinancePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Загрузка финансов...</div>}>
      <FinanceContent />
    </Suspense>
  );
}
