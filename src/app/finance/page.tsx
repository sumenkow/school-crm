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
import { useLanguage } from '@/context/LanguageContext';

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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
      )}

      {activeTab === 'subscriptions' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
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
                          computedStatus === 'expired' && 'bg-slate-100 text-slate-700',
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
      )}

      {activeTab === 'debts' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-rose-950">Клиенты с просроченными платежами ({overduePayments.length})</p>
                <p className="text-xs text-rose-800 mt-0.5">
                  Общая сумма задолженности составляет <strong>{overdueTotals.totalEur.toLocaleString('ru-RU')} € (≈ {overdueTotals.totalRub.toLocaleString('ru-RU')} ₽)</strong>. Вы можете в 1 клик написать клиенту в WhatsApp/Telegram или создать задачу для менеджера.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-xs">
            {overduePayments.map((p) => {
              const matchedStudent = students.find((st) => st.id === p.studentId);
              const contactPhone = matchedStudent?.parentPhone || matchedStudent?.phone || '+7 (999) 234-56-78';
              const digitsOnly = contactPhone.replace(/\D/g, '');
              const reminderMsg = encodeURIComponent(
                `Здравствуйте, ${p.parentName || 'уважаемый родитель'}! Напоминаем об оплате обучения ${p.studentName} за ${p.periodLabel || 'период'} в размере ${p.amountFormatted || `${p.amount} ₽`}. Подскажите, пожалуйста, удалось ли ознакомиться со счетом?`
              );

              return (
                <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/students/${p.studentId}`} className="font-bold text-slate-900 hover:text-blue-600">
                        {p.studentName}
                      </Link>
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                        Просрочка
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Родитель: <strong>{p.parentName}</strong> ({contactPhone}) • Группа: {p.groupName}
                    </p>
                    <p className="text-xs text-rose-700 mt-0.5 font-medium">{p.comment}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-rose-700 block">{p.amountFormatted}</span>
                      <span className="text-[11px] text-slate-500">с {p.paymentDate}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudentForPayment(p.studentId);
                          setSelectedParentForPayment(p.parentId);
                          setIsPaymentModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
                        title="Внести оплату и погасить задолженность"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Погасить долг
                      </button>
                      <a
                        href={`https://wa.me/${digitsOnly}?text=${reminderMsg}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-emerald-50 px-2 py-1.5 text-emerald-700 hover:bg-emerald-100 transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Напомнить в WhatsApp с готовым текстом"
                      >
                        <span>WA</span>
                      </a>
                      <a
                        href={`https://t.me/+${digitsOnly}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                        title="Написать в Telegram"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </a>
                      <Link
                        href="/tasks"
                        className="rounded-lg bg-slate-100 p-2 text-slate-700 hover:bg-slate-200 transition-colors"
                        title="Поставить задачу по долгу"
                      >
                        <CheckSquare className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
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
