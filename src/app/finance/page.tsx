'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
import { RecordPaymentModal } from '@/components/finance/RecordPaymentModal';
import { CreateSubscriptionModal } from '@/components/finance/CreateSubscriptionModal';

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<'payments' | 'subscriptions' | 'debts'>('payments');
  const [payments, setPayments] = useState<FullPaymentData[]>(INITIAL_PAYMENTS);
  const [subscriptions, setSubscriptions] = useState<FullSubscriptionData[]>(INITIAL_SUBSCRIPTIONS);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'expected' | 'overdue'>('all');

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  const handlePaymentRecorded = (newPayment: FullPaymentData) => {
    setPayments((prev) => [newPayment, ...prev]);
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
            onClick={() => setIsSubModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Clock className="h-4 w-4 text-blue-600" />
            + Оформить абонемент
          </button>
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            + Внести платёж
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Получено за месяц</span>
            <Receipt className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-1 text-2xl font-extrabold text-emerald-600">{totalPaid.toLocaleString('ru-RU')} ₽</p>
          <p className="mt-1 text-xs text-slate-400">
            {payments.filter((p) => p.status === 'paid').length} подтверждённых оплат
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Ожидается к поступлению</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-1 text-2xl font-extrabold text-blue-600">{totalExpected.toLocaleString('ru-RU')} ₽</p>
          <p className="mt-1 text-xs text-slate-400">
            {payments.filter((p) => p.status === 'expected').length} выставленных счетов
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-rose-700 font-bold">
            <span>Задолженность / Просрочено</span>
            <AlertCircle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-1 text-2xl font-extrabold text-rose-700">{totalOverdue.toLocaleString('ru-RU')} ₽</p>
          <p className="mt-1 text-xs text-rose-600">
            {overduePayments.length} клиентов с просрочкой
          </p>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 px-4 pt-2 gap-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('payments')}
              className={cn(
                'pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all',
                activeTab === 'payments' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-900'
              )}
            >
              История платежей ({payments.length})
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={cn(
                'pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all',
                activeTab === 'subscriptions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
              )}
            >
              Абонементы ({subscriptions.length})
            </button>
            <button
              onClick={() => setActiveTab('debts')}
              className={cn(
                'pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all',
                activeTab === 'debts' ? 'border-rose-600 text-rose-700' : 'border-transparent text-slate-500 hover:text-slate-900'
              )}
            >
              Долги и просрочки ({overduePayments.length})
            </button>
          </div>

          {activeTab === 'payments' && (
            <div className="flex items-center gap-1.5 pb-2 text-xs">
              <span className="text-slate-400">Статус:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'paid' | 'expected' | 'overdue')}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none"
              >
                <option value="all">Все</option>
                <option value="paid">Оплачено</option>
                <option value="expected">Ожидается</option>
                <option value="overdue">Просрочено</option>
              </select>
            </div>
          )}
        </div>

        {/* TAB 1: ПЛАТЕЖИ (ФАКТИЧЕСКИЕ ДЕНЬГИ) */}
        {activeTab === 'payments' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="py-3.5 pl-4 pr-3">Ученик / Плательщик</th>
                  <th className="px-3 py-3.5">Курс и группа</th>
                  <th className="px-3 py-3.5">Период</th>
                  <th className="px-3 py-3.5 font-bold text-slate-900">Сумма</th>
                  <th className="px-3 py-3.5">Способ оплаты</th>
                  <th className="px-3 py-3.5">Статус</th>
                  <th className="py-3.5 pl-3 pr-4 text-right">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="py-3 pl-4 pr-3 font-semibold text-slate-900">
                      <Link href={`/students/${p.studentId}`} className="hover:text-blue-600">
                        {p.studentName}
                      </Link>
                      {p.parentName && (
                        <div className="text-[11px] text-slate-400 font-normal">{p.parentName}</div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div>{p.groupName}</div>
                      <div className="text-[11px] text-slate-400">{p.courseName}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-600 font-medium">{p.periodLabel}</td>
                    <td className="px-3 py-3 font-bold text-slate-900">{p.amountFormatted}</td>
                    <td className="px-3 py-3 text-slate-500">
                      {p.paymentMethod === 'card' && 'Банковская карта'}
                      {p.paymentMethod === 'bank_transfer' && 'Перевод СБП'}
                      {p.paymentMethod === 'cash' && 'Наличные'}
                      {p.paymentMethod === 'invoice' && 'Безналичный счет'}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 font-semibold text-[10px]',
                          p.status === 'paid' && 'bg-emerald-100 text-emerald-800',
                          p.status === 'overdue' && 'bg-rose-100 text-rose-800',
                          p.status === 'expected' && 'bg-blue-100 text-blue-800'
                        )}
                      >
                        {p.status === 'paid' && 'Оплачено'}
                        {p.status === 'overdue' && 'Просрочено'}
                        {p.status === 'expected' && 'Ожидается'}
                      </span>
                    </td>
                    <td className="py-3 pl-3 pr-4 text-right text-slate-500">{p.paymentDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: АБОНЕМЕНТЫ */}
        {activeTab === 'subscriptions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="py-3.5 pl-4 pr-3">Ученик</th>
                  <th className="px-3 py-3.5">Группа / Курс</th>
                  <th className="px-3 py-3.5">Срок действия</th>
                  <th className="px-3 py-3.5">Стоимость</th>
                  <th className="px-3 py-3.5 text-center">Уроки</th>
                  <th className="px-3 py-3.5">Продление до</th>
                  <th className="px-3 py-3.5">Статус</th>
                  <th className="py-3.5 pl-3 pr-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="py-3 pl-4 pr-3 font-semibold text-slate-900">
                      <Link href={`/students/${s.studentId}`} className="hover:text-blue-600">
                        {s.studentName}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <div>{s.groupName}</div>
                      <div className="text-[11px] text-slate-400">{s.courseName}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {s.startDate} – {s.endDate}
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-900">{s.priceFormatted}</td>
                    <td className="px-3 py-3 text-center font-semibold text-slate-800">
                      {s.lessonsAttended} из {s.lessonsTotal}
                    </td>
                    <td className="px-3 py-3 font-medium text-blue-600">{s.renewalDate}</td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 font-semibold text-[10px]',
                          s.status === 'active' && 'bg-emerald-100 text-emerald-800',
                          s.status === 'frozen' && 'bg-amber-100 text-amber-800',
                          s.status === 'expired' && 'bg-rose-100 text-rose-800'
                        )}
                      >
                        {s.status === 'active' && 'Активен'}
                        {s.status === 'frozen' && 'Заморожен'}
                        {s.status === 'expired' && 'Истёк'}
                      </span>
                    </td>
                    <td className="py-3 pl-3 pr-4 text-right">
                      <button
                        onClick={() => handleFreezeSub(s.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-blue-600"
                        title="Заморозить или разморозить"
                      >
                        <Snowflake className="h-3 w-3" />
                        {s.status === 'frozen' ? 'Разморозить' : 'Заморозить'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: ДОЛГИ И ПРОСРОЧКИ */}
        {activeTab === 'debts' && (
          <div className="p-4 space-y-4">
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-900 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Клиенты с просроченными платежами ({overduePayments.length})</p>
                <p className="mt-0.5 text-rose-800">
                  Общая сумма задолженности составляет <strong>{totalOverdue.toLocaleString('ru-RU')} ₽</strong>. Вы можете в 1 клик написать клиенту в WhatsApp/Telegram или создать задачу для менеджера.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {overduePayments.map((p) => (
                <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/students/${p.studentId}`} className="font-bold text-slate-900 text-sm hover:text-blue-600">
                        {p.studentName}
                      </Link>
                      <span className="text-xs text-slate-500">• {p.groupName}</span>
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                        Долг {p.amountFormatted}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Плательщик: <strong>{p.parentName}</strong> • Период: {p.periodLabel}
                    </p>
                    {p.comment && (
                      <p className="text-[11px] text-rose-600 mt-0.5 font-medium">Примечание: {p.comment}</p>
                    )}
                  </div>

                  {/* Actions in 1 click */}
                  <div className="flex items-center gap-2">
                    <Link
                      href="/tasks"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
                    >
                      <CheckSquare className="h-3.5 w-3.5 text-slate-500" />
                      Создать задачу
                    </Link>
                    <button
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Погасить долг
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
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
