'use client';

import React from 'react';
import { BarChart2, Clock, AlertCircle, Wallet } from 'lucide-react';

interface FinanceTopKpisProps {
  revenueEur: number;
  paidPaymentsCount: number;
  expectedEur: number;
  expectedCount: number;
  debtEur: number;
  debtorsCount: number;
  depositBalanceEur: number;
  depositStudentsCount: number;
  onSelectTab?: (tab: 'invoices' | 'payments' | 'subscriptions' | 'debts') => void;
}

export function FinanceTopKpis({
  revenueEur,
  paidPaymentsCount,
  expectedEur,
  expectedCount,
  debtEur,
  debtorsCount,
  depositBalanceEur,
  depositStudentsCount,
  onSelectTab,
}: FinanceTopKpisProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Общая выручка */}
      <div
        onClick={() => onSelectTab?.('payments')}
        className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <BarChart2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-slate-500 block truncate">
              Общая выручка
            </span>
            <div className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight mt-0.5">
              {Math.round(revenueEur).toLocaleString('ru-RU')} €
            </div>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <span className="text-emerald-700 font-bold">↑ +12% к сентябрю</span>
          <span className="text-slate-400 font-medium">
            {paidPaymentsCount} {paidPaymentsCount === 1 ? 'платеж' : paidPaymentsCount < 5 ? 'платежа' : 'платежей'}
          </span>
        </div>
      </div>

      {/* 2. Ожидаемые поступления */}
      <div
        onClick={() => onSelectTab?.('invoices')}
        className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Clock className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-slate-500 block truncate">
              Ожидаемые поступления
            </span>
            <div className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight mt-0.5">
              {Math.round(expectedEur).toLocaleString('ru-RU')} €
            </div>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <span className="text-slate-500 font-medium">К оплате</span>
          <span className="text-slate-400 font-medium">
            {expectedCount} {expectedCount === 1 ? 'счет' : expectedCount < 5 ? 'счета' : 'счетов'}
          </span>
        </div>
      </div>

      {/* 3. Общий долг */}
      <div
        onClick={() => onSelectTab?.('debts')}
        className="rounded-2xl border border-rose-200/80 bg-rose-50/20 p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-rose-800 block truncate">
              Общий долг
            </span>
            <div className="text-xl font-extrabold text-rose-700 tracking-tight leading-tight mt-0.5">
              {Math.round(debtEur).toLocaleString('ru-RU')} €
            </div>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-rose-100 flex items-center justify-between text-[11px]">
          <span className="text-rose-700 font-bold">Просрочено</span>
          <span className="text-rose-600 font-semibold">
            {debtorsCount} {debtorsCount === 1 ? 'должник' : debtorsCount < 5 ? 'должника' : 'должников'}
          </span>
        </div>
      </div>

      {/* 4. Баланс учеников */}
      <div
        onClick={() => onSelectTab?.('payments')}
        className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-slate-500 block truncate">
              Баланс учеников
            </span>
            <div className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight mt-0.5">
              {Math.round(depositBalanceEur).toLocaleString('ru-RU')} €
            </div>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <span className="text-emerald-700 font-bold">Депозиты</span>
          <span className="text-slate-400 font-medium">
            {depositStudentsCount} {depositStudentsCount === 1 ? 'ученик' : depositStudentsCount < 5 ? 'ученика' : 'учеников'}
          </span>
        </div>
      </div>
    </div>
  );
}
