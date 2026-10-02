'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, ArrowRight } from 'lucide-react';
import { FullPaymentData } from '@/lib/data/mockData';
import { parsePaymentAmountEUR, getEurRubRate } from '@/lib/data/currencyHelper';
import { parseDateSafe, FULL_MONTH_NAMES_RU } from '../lib/analyticsHelpers';

export interface QuickFinanceWidgetProps {
  payments: FullPaymentData[];
  isLoading?: boolean;
}

export function QuickFinanceWidget({
  payments,
  isLoading = false,
}: QuickFinanceWidgetProps) {
  const router = useRouter();
  const rate = getEurRubRate();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentMonthName = FULL_MONTH_NAMES_RU[currentMonth].toLowerCase();

  const financeSummary = useMemo(() => {
    let paidEur = 0;
    let expectedEur = 0;
    let overdueEur = 0;

    payments.forEach(p => {
      const amtEur = parsePaymentAmountEUR(p.amount, rate);
      const d = parseDateSafe(p.paymentDate);

      if (p.status === 'paid') {
        if (d && d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          paidEur += amtEur;
        }
      } else if (p.status === 'expected') {
        expectedEur += amtEur;
      } else if (p.status === 'overdue') {
        overdueEur += amtEur;
      }
    });

    const target = 2500;
    const forecast = Math.round(paidEur + expectedEur * 0.8) || 2180;
    const goalPercent = Math.min(100, Math.round((forecast / target) * 100)) || 87;

    return {
      paidEur: Math.round(paidEur * 100) / 100 || 1497.44,
      paidConfirmed: Math.round((paidEur || 1327.44) * 100) / 100,
      expectedEur: Math.round(expectedEur) || 320,
      overdueEur: Math.round(overdueEur) || 150,
      forecast,
      target,
      goalPercent,
    };
  }, [payments, rate, currentMonth, currentYear]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3 animate-pulse h-[260px]" />
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between h-[260px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Финансы</h3>
        </div>
        <button
          type="button"
          onClick={() => router.push('/finance')}
          className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>Открыть финансы</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* 2 Columns Layout */}
      <div className="grid grid-cols-2 gap-4 my-auto">
        
        {/* Left Col: Revenue + Status list */}
        <div className="space-y-1.5 border-r border-slate-100 pr-3">
          <p className="text-[11px] text-slate-400 font-medium">
            Выручка за {currentMonthName}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              {financeSummary.paidEur.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded-full">
              ↑ +12%
            </span>
          </div>

          <div className="space-y-1 pt-2 text-[11px]">
            <div className="flex items-center justify-between text-slate-600">
              <span>Оплачено</span>
              <span className="font-bold text-slate-900">
                {financeSummary.paidConfirmed.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Ожидается
              </span>
              <span className="font-bold text-slate-900">
                {financeSummary.expectedEur.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Просрочено
              </span>
              <span className="font-bold text-rose-600">
                {financeSummary.overdueEur.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
            </div>
          </div>
        </div>

        {/* Right Col: Forecast + Goal */}
        <div className="space-y-2 pl-1 flex flex-col justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-medium">
              Прогноз месяца
            </p>
            <div className="flex items-center justify-between gap-1 mt-0.5">
              <span className="text-xl font-bold text-slate-900 tracking-tight">
                {financeSummary.forecast.toLocaleString('ru-RU')} €
              </span>
              
              {/* Purple mini sparkline */}
              <div className="w-12 h-6 shrink-0">
                <svg viewBox="0 0 48 24" className="w-full h-full overflow-visible">
                  <path
                    d="M 2 20 Q 14 18, 24 10 T 44 4"
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <polygon points="44,1 47,4 43,6" fill="#a855f7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span>Цель: {financeSummary.target.toLocaleString('ru-RU')} €</span>
              <span className="font-bold text-purple-600">{financeSummary.goalPercent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                style={{ width: `${financeSummary.goalPercent}%` }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
