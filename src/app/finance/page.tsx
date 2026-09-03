'use client';

import React, { useState } from 'react';
import { Plus, DollarSign, Clock, AlertCircle, CheckCircle2, CreditCard, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<'payments' | 'subscriptions'>('payments');

  const payments = [
    {
      id: '1',
      student: 'Иван Смирнов',
      parent: 'Ольга Смирнова',
      course: 'English B1 Teens',
      amount: '7 600 ₽',
      date: '01.09.2026',
      period: 'Сентябрь 2026',
      method: 'Банковская карта',
      status: 'paid',
    },
    {
      id: '2',
      student: 'Мария Кузнецова',
      parent: 'Дмитрий Кузнецов',
      course: 'Robotics Junior',
      amount: '8 400 ₽',
      date: '25.08.2026',
      period: 'Сентябрь 2026',
      method: 'Перевод по СБП',
      status: 'overdue',
    },
    {
      id: '3',
      student: 'Екатерина Морозова',
      parent: 'Игорь Морозов',
      course: 'Kids Math Safari',
      amount: '6 800 ₽',
      date: '02.09.2026',
      period: 'Сентябрь 2026',
      method: 'Безналичный счет',
      status: 'paid',
    },
    {
      id: '4',
      student: 'Анна Васильева',
      parent: 'Елена Васильева',
      course: 'Kids English A1',
      amount: '7 200 ₽',
      date: '05.09.2026',
      period: 'Сентябрь 2026',
      method: 'Ожидается',
      status: 'expected',
    },
  ];

  const subscriptions = [
    {
      id: '1',
      student: 'Иван Смирнов',
      course: 'English B1 Teens',
      period: '01.09.2026 – 30.09.2026',
      price: '7 600 ₽',
      status: 'active',
      lessonsAttended: '2 из 8 занятий',
    },
    {
      id: '2',
      student: 'Мария Кузнецова',
      course: 'Robotics Junior',
      period: '01.09.2026 – 30.09.2026',
      price: '8 400 ₽',
      status: 'expired',
      lessonsAttended: '0 из 8 занятий',
    },
    {
      id: '3',
      student: 'Сергей Попов',
      course: 'English B1 Teens',
      period: '15.09.2026 – 15.10.2026',
      price: '7 600 ₽',
      status: 'frozen',
      lessonsAttended: '1 из 8 занятий',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Финансы и Абонементы</h1>
          <p className="text-sm text-slate-500">
            Раздельный учет фактических оплат и периодов обучения (абонементов)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" />
            + Внести платеж
          </button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Получено за месяц</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-600">840 000 ₽</p>
          <p className="mt-1 text-xs text-slate-400">112 платежей</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Ожидается к поступлению</p>
          <p className="mt-1 text-2xl font-extrabold text-blue-600">180 000 ₽</p>
          <p className="mt-1 text-xs text-slate-400">24 выставленных счета</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Задолженность / Просрочено</p>
          <p className="mt-1 text-2xl font-extrabold text-rose-600">42 000 ₽</p>
          <p className="mt-1 text-xs text-slate-400">3 клиента с долгом</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex border-b border-slate-200 px-4 pt-2 gap-4">
          <button
            onClick={() => setActiveTab('payments')}
            className={cn(
              'pb-3 text-sm font-semibold border-b-2 transition-all',
              activeTab === 'payments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
            )}
          >
            История платежей
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={cn(
              'pb-3 text-sm font-semibold border-b-2 transition-all',
              activeTab === 'subscriptions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
            )}
          >
            Абонементы учеников
          </button>
        </div>

        {activeTab === 'payments' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="py-3.5 pl-4 pr-3">Ученик / Плательщик</th>
                  <th className="px-3 py-3.5">Курс</th>
                  <th className="px-3 py-3.5">Период</th>
                  <th className="px-3 py-3.5">Сумма</th>
                  <th className="px-3 py-3.5">Способ оплаты</th>
                  <th className="px-3 py-3.5">Статус</th>
                  <th className="py-3.5 pl-3 pr-4 text-right">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="py-3 pl-4 pr-3 font-semibold text-slate-900">
                      <div>{p.student}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{p.parent}</div>
                    </td>
                    <td className="px-3 py-3">{p.course}</td>
                    <td className="px-3 py-3 text-slate-600">{p.period}</td>
                    <td className="px-3 py-3 font-bold text-slate-900">{p.amount}</td>
                    <td className="px-3 py-3 text-slate-500">{p.method}</td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 font-semibold text-[10px]',
                          p.status === 'paid' && 'bg-emerald-100 text-emerald-800',
                          p.status === 'overdue' && 'bg-rose-100 text-rose-800',
                          p.status === 'expected' && 'bg-amber-100 text-amber-800'
                        )}
                      >
                        {p.status === 'paid' && 'Оплачено'}
                        {p.status === 'overdue' && 'Просрочено'}
                        {p.status === 'expected' && 'Ожидается'}
                      </span>
                    </td>
                    <td className="py-3 pl-3 pr-4 text-right text-slate-500">{p.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="py-3.5 pl-4 pr-3">Ученик</th>
                  <th className="px-3 py-3.5">Курс</th>
                  <th className="px-3 py-3.5">Срок абонемента</th>
                  <th className="px-3 py-3.5">Стоимость</th>
                  <th className="px-3 py-3.5">Посещено</th>
                  <th className="py-3.5 pl-3 pr-4 text-right">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="py-3 pl-4 pr-3 font-semibold text-slate-900">{s.student}</td>
                    <td className="px-3 py-3">{s.course}</td>
                    <td className="px-3 py-3 text-slate-600">{s.period}</td>
                    <td className="px-3 py-3 font-bold text-slate-900">{s.price}</td>
                    <td className="px-3 py-3 text-slate-600">{s.lessonsAttended}</td>
                    <td className="py-3 pl-3 pr-4 text-right">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 font-semibold text-[10px]',
                          s.status === 'active' && 'bg-emerald-100 text-emerald-800',
                          s.status === 'frozen' && 'bg-amber-100 text-amber-800',
                          s.status === 'expired' && 'bg-rose-100 text-rose-800'
                        )}
                      >
                        {s.status === 'active' && 'Активен'}
                        {s.status === 'frozen' && 'Заморожен'}
                        {s.status === 'expired' && 'Истек'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
