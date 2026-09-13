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
import { RecordPaymentModal } from '@/components/finance/RecordPaymentModal';
import { CreateSubscriptionModal } from '@/components/finance/CreateSubscriptionModal';

function FinanceContent() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter');

  const [activeTab, setActiveTab] = useState<'payments' | 'subscriptions' | 'debts'>(
    filterParam === 'overdue' ? 'debts' : 'payments'
  );
  const [payments, setPayments] = useState<FullPaymentData[]>(() => {
    return typeof window !== 'undefined' ? getStoredPayments() : INITIAL_PAYMENTS;
  });
  const [subscriptions, setSubscriptions] = useState<FullSubscriptionData[]>(INITIAL_SUBSCRIPTIONS);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'expected' | 'overdue'>(
    filterParam === 'overdue' ? 'overdue' : 'all'
  );

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
      setStatusFilter('overdue');
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

  // KPIs
  const totalPaid = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalExpected = payments
    .filter((p) => p.status === 'expected')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalOverdue = payments
    .filter((p) => p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0);

  const overduePayments = payments.filter((p) => p.status === 'overdue');

  const filteredPayments = payments.filter((p) => {
    if (statusFilter === 'all') return true;
    return p.status === statusFilter;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Финансы и Абонементы</h1>
          <p className="text-sm text-slate-500">
            Раздельный учет фактических оплат (касса) и периодов обучения (абонементы)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Внести оплату
          </button>
          <button
            onClick={() => setIsSubModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Оформить абонемент
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Фактическая выручка (Касса)</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{totalPaid.toLocaleString('ru-RU')} ₽</p>
          <p className="text-xs text-emerald-600 mt-1">Оплаченные счета за текущий период</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Ожидается к поступлению</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{totalExpected.toLocaleString('ru-RU')} ₽</p>
          <p className="text-xs text-slate-500 mt-1">Выставленные счета до наступления срока</p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800">Просроченная задолженность</span>
            <div className="rounded-lg bg-rose-100 p-2 text-rose-700">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-1 text-2xl font-extrabold text-rose-700">{totalOverdue.toLocaleString('ru-RU')} ₽</p>
          <p className="text-xs text-rose-600 mt-1 font-medium">
            {overduePayments.length} клиентов с просрочкой
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('payments')}
          className={cn(
            'px-4 py-2.5 text-xs font-semibold border-b-2 transition-all',
            activeTab === 'payments'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          История платежей ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={cn(
            'px-4 py-2.5 text-xs font-semibold border-b-2 transition-all',
            activeTab === 'subscriptions'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          Абонементы ({subscriptions.length})
        </button>
        <button
          onClick={() => setActiveTab('debts')}
          className={cn(
            'px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5',
            activeTab === 'debts'
              ? 'border-rose-600 text-rose-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <span>Долги и просрочки</span>
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
              <span>Статус:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'paid' | 'expected' | 'overdue')}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Все</option>
                <option value="paid">Оплачено</option>
                <option value="expected">Ожидается</option>
                <option value="overdue">Просрочено</option>
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600">
                <tr>
                  <th className="py-3 pl-4 pr-3">Ученик / Родитель</th>
                  <th className="px-3 py-3">Курс / Группа</th>
                  <th className="px-3 py-3">Сумма</th>
                  <th className="px-3 py-3">Дата</th>
                  <th className="px-3 py-3">Период</th>
                  <th className="px-3 py-3">Способ</th>
                  <th className="px-3 py-3">Статус</th>
                  <th className="px-3 py-3">Чек</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((p) => (
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
                    <td className="px-3 py-3 font-bold text-slate-900">
                      {p.amountFormatted}
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
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold inline-block',
                          p.status === 'paid' && 'bg-emerald-100 text-emerald-800',
                          p.status === 'expected' && 'bg-blue-100 text-blue-800',
                          p.status === 'overdue' && 'bg-rose-100 text-rose-800',
                        )}
                      >
                        {p.status === 'paid' && 'Оплачено'}
                        {p.status === 'expected' && 'Ожидается'}
                        {p.status === 'overdue' && 'Просрочено'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {p.status === 'paid' && (
                        <button
                          onClick={() => alert(`Чек для ${p.studentName} отправлен на печать`)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          title="Печать фискального чека"
                        >
                          <Receipt className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
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
                <th className="px-3 py-3">Посещено</th>
                <th className="px-3 py-3">Следующее продление</th>
                <th className="px-3 py-3">Стоимость</th>
                <th className="px-3 py-3">Статус</th>
                <th className="px-3 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions.map((s) => (
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
                  <td className="px-3 py-3 font-semibold text-slate-900">
                    {s.lessonsAttended} из {s.lessonsTotal} зан.
                  </td>
                  <td className="px-3 py-3 text-slate-700 font-medium">{s.renewalDate}</td>
                  <td className="px-3 py-3 font-bold text-slate-900">{s.priceFormatted}</td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold inline-block',
                        s.status === 'active' && 'bg-emerald-100 text-emerald-800',
                        s.status === 'frozen' && 'bg-blue-100 text-blue-800',
                        s.status === 'expired' && 'bg-slate-100 text-slate-700',
                      )}
                    >
                      {s.status === 'active' && 'Активен'}
                      {s.status === 'frozen' && 'Заморожен'}
                      {s.status === 'expired' && 'Истек'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={() => handleFreezeSub(s.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Snowflake className="h-3 w-3 text-blue-500" />
                      {s.status === 'frozen' ? 'Разморозить' : 'Заморозка'}
                    </button>
                  </td>
                </tr>
              ))}
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
                  Общая сумма задолженности составляет <strong>{totalOverdue.toLocaleString('ru-RU')} ₽</strong>. Вы можете в 1 клик написать клиенту в WhatsApp/Telegram или создать задачу для менеджера.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-xs">
            {overduePayments.map((p) => (
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
                    Родитель: <strong>{p.parentName}</strong> • Группа: {p.groupName}
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
                      href="https://t.me/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 transition-colors"
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
            ))}
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
