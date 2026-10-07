'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet } from 'lucide-react';
import { FullPaymentData, FullStudentData } from '@/lib/data/mockData';
import { getDashboardFinanceMetrics } from '../lib/analyticsHelpers';
import { cn } from '@/lib/utils';

export interface QuickFinanceWidgetProps {
  payments: FullPaymentData[];
  students?: FullStudentData[];
  selectedDate?: Date;
  isLoading?: boolean;
}

export function QuickFinanceWidget({
  payments,
  students = [],
  selectedDate,
  isLoading = false,
}: QuickFinanceWidgetProps) {
  const router = useRouter();
  const activeDate = selectedDate || new Date();

  const financeSummary = useMemo(() => {
    return getDashboardFinanceMetrics(payments, students, activeDate);
  }, [payments, students, activeDate]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3 animate-pulse h-full min-h-[190px]" />
    );
  }

  const monthlyRevenueFormatted = `${financeSummary.paidEur.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  const paidAmountFormatted = `${financeSummary.paidConfirmed.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  const pendingAmountFormatted = `${financeSummary.expectedEur.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  const overdueAmountFormatted = `${financeSummary.overdueEur.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  const forecastFormatted = `${financeSummary.forecast.toLocaleString('ru-RU')} €`;
  const goalFormatted = `${financeSummary.monthlyTarget.toLocaleString('ru-RU')} €`;
  const goalProgressPercent = financeSummary.goalPercent;
  const deltaPercent = financeSummary.deltaPercent;
  const currentMonthName = financeSummary.currentMonthName;

  const onOpenFinance = () => {
    router.push('/finance');
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col justify-between h-full min-h-[190px]">
      {/* Шапка карточки */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Wallet className="w-3.5 h-3.5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Финансы</h3>
        </div>
        <button
          type="button"
          onClick={onOpenFinance}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
        >
          Открыть финансы <span>→</span>
        </button>
      </div>

      {/* Основное содержимое: 2 колонки */}
      <div className="grid grid-cols-2 gap-3 my-auto pt-2.5">
        
        {/* ЛЕВАЯ КОЛОНКА: Выручка и разбивка оплат */}
        <div className="flex flex-col justify-between pr-1">
          <div>
            <span className="text-[11px] text-slate-400 font-medium block mb-0.5 capitalize">Выручка за {currentMonthName}</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{monthlyRevenueFormatted}</span>
              {deltaPercent !== null && (
                <span
                  className={cn(
                    'inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                    deltaPercent >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                  )}
                >
                  {deltaPercent >= 0 ? `↑ +${deltaPercent}%` : `↓ ${Math.abs(deltaPercent)}%`}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5 mt-3 text-xs">
            {/* Оплачено */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium text-[11px]">Оплачено</span>
              <span className="font-bold text-slate-900 text-xs">{paidAmountFormatted}</span>
            </div>

            {/* Ожидается */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-slate-500 font-medium text-[11px]">
                <span className="w-1.5 h-1.5 rounded-[2px] bg-amber-400 shrink-0"></span>
                Ожидается
              </span>
              <span className="font-bold text-slate-900 text-xs">{pendingAmountFormatted}</span>
            </div>

            {/* Просрочено */}
            <div
              onClick={() => router.push('/finance?tab=debts')}
              className="flex items-center justify-between cursor-pointer group/debt hover:opacity-80 transition-opacity"
              title="Открыть раздел задолженностей"
            >
              <span className="flex items-center gap-1 text-slate-500 font-medium text-[11px] group-hover/debt:text-rose-600 transition-colors">
                <span className="w-1.5 h-1.5 rounded-[2px] bg-rose-500 shrink-0"></span>
                Просрочено
              </span>
              <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md text-[11px] group-hover/debt:bg-rose-100 transition-colors">
                {overdueAmountFormatted}
              </span>
            </div>
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА: Обособленный блок прогноза */}
        <div className="bg-slate-50/80 border border-slate-100/80 rounded-2xl p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <span className="text-[11px] text-slate-500 font-medium block leading-tight">Прогноз месяца</span>
                <span className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5 block truncate leading-tight">{forecastFormatted}</span>
              </div>
              
              {/* SVG-график восходящего прогноза с градиентом и стрелкой */}
              <div className="w-14 h-8 relative shrink-0">
                <svg viewBox="0 0 64 40" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#A855F7" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#A855F7" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 4 36 L 24 24 L 40 24 L 58 10 L 58 36 Z"
                    fill="url(#purpleGrad)"
                  />
                  <path
                    d="M 4 36 L 24 24 L 40 24 L 58 10"
                    fill="none"
                    stroke="#A855F7"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Наконечник стрелки */}
                  <polyline
                    points="52,10 58,10 58,16"
                    fill="none"
                    stroke="#A855F7"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Цель и плотный прогресс-бар */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500 font-medium text-[11px]">Цель: {goalFormatted}</span>
              <span className="font-bold text-purple-600 text-[11px]">{goalProgressPercent}%</span>
            </div>
            <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-500"
                style={{ width: `${Math.min(goalProgressPercent, 100)}%` }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export { QuickFinanceWidget as FinancePanel };

