'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FullPaymentData, FullStudentData } from '@/lib/data/mockData';
import { getDashboardFinanceMetrics } from '../lib/analyticsHelpers';

export interface QuickFinanceWidgetProps {
  payments: FullPaymentData[];
  students?: FullStudentData[];
  isLoading?: boolean;
}

export function QuickFinanceWidget({
  payments,
  students = [],
  isLoading = false,
}: QuickFinanceWidgetProps) {
  const router = useRouter();

  const financeSummary = useMemo(() => {
    return getDashboardFinanceMetrics(payments, students);
  }, [payments, students]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm space-y-3 animate-pulse h-[190px]" />
    );
  }

  return (
    <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex flex-col justify-between h-[190px]">
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-50">
        <h3 className="font-bold text-slate-900 text-sm">Финансы</h3>
        <button
          type="button"
          onClick={() => router.push('/finance')}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          Открыть финансы →
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 my-0.5">
        <div className="space-y-1">
          <div>
            <span className="text-[10px] text-slate-400 block capitalize leading-none">Выручка за {financeSummary.currentMonthName}</span>
            <span className="text-base font-bold text-slate-900 leading-tight">
              {financeSummary.paidEur.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </span>
          </div>
          <div className="text-[11px] space-y-0.5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Оплачено:</span>
              <span className="font-semibold text-slate-800">
                {financeSummary.paidConfirmed.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Ожидается:</span>
              <span className="font-semibold text-slate-800">
                {financeSummary.expectedEur.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Просрочено:</span>
              <span className="font-semibold text-rose-600">
                {financeSummary.overdueEur.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50/70 p-2.5 rounded-xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block leading-none">Прогноз месяца</span>
            <span className="text-sm font-bold text-slate-900 leading-tight">
              {financeSummary.forecast.toLocaleString('ru-RU')} €
            </span>
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
              <span>Цель: {financeSummary.monthlyTarget.toLocaleString('ru-RU')} €</span>
              <span className="font-bold">{financeSummary.goalPercent}%</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div className="bg-purple-600 h-full rounded-full transition-all duration-500" style={{ width: `${financeSummary.goalPercent}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

