'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, ArrowRight, TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { FullPaymentData } from '@/lib/data/mockData';
import { parsePaymentAmountEUR, getEurRubRate } from '@/lib/data/currencyHelper';
import { parseDateSafe } from '../lib/analyticsHelpers';
import { cn } from '@/lib/utils';

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

  const financeSummary = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    let paidEur = 0;
    let paidCount = 0;
    let expectedEur = 0;
    let expectedCount = 0;
    let overdueEur = 0;
    let overdueCount = 0;

    payments.forEach(p => {
      const amtEur = parsePaymentAmountEUR(p.amount, rate);
      const d = parseDateSafe(p.paymentDate);

      if (p.status === 'paid') {
        if (d && d.getFullYear() === curYear && d.getMonth() === curMonth) {
          paidEur += amtEur;
          paidCount += 1;
        }
      } else if (p.status === 'expected') {
        expectedEur += amtEur;
        expectedCount += 1;
      } else if (p.status === 'overdue') {
        overdueEur += amtEur;
        overdueCount += 1;
      }
    });

    return {
      paidEur: Math.round(paidEur),
      paidCount,
      expectedEur: Math.round(expectedEur),
      expectedCount,
      overdueEur: Math.round(overdueEur),
      overdueCount,
    };
  }, [payments, rate]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs">
        <div className="h-5 w-40 bg-slate-100 rounded animate-pulse" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Финансовый обзор</h3>
            <p className="text-[11px] text-slate-500">Счета и денежные потоки месяца</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push('/finance')}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>В финансы</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
        {/* Paid */}
        <div
          onClick={() => router.push('/finance?filter=paid')}
          className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition-all cursor-pointer bg-white shadow-2xs flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Получено оплат</p>
              <p className="text-[11px] text-slate-400">{financeSummary.paidCount} транзакций</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-black text-emerald-700">
              {financeSummary.paidEur.toLocaleString('ru-RU')} €
            </p>
            <p className="text-[10px] text-slate-400">текущий месяц</p>
          </div>
        </div>

        {/* Expected */}
        <div
          onClick={() => router.push('/finance?filter=expected')}
          className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition-all cursor-pointer bg-white shadow-2xs flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Ожидается к оплате</p>
              <p className="text-[11px] text-slate-400">{financeSummary.expectedCount} выставленных счетов</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-black text-blue-700">
              {financeSummary.expectedEur.toLocaleString('ru-RU')} €
            </p>
            <p className="text-[10px] text-slate-400">до конца месяца</p>
          </div>
        </div>

        {/* Overdue */}
        <div
          onClick={() => router.push('/finance?filter=overdue')}
          className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition-all cursor-pointer bg-white shadow-2xs flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              financeSummary.overdueEur > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'
            )}>
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Просроченная задолженность</p>
              <p className="text-[11px] text-slate-400">
                {financeSummary.overdueCount > 0 ? `${financeSummary.overdueCount} счетов просрочено` : 'Просрочек нет'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={cn(
              'text-sm font-black',
              financeSummary.overdueEur > 0 ? 'text-rose-600' : 'text-slate-700'
            )}>
              {financeSummary.overdueEur.toLocaleString('ru-RU')} €
            </p>
            <p className="text-[10px] text-slate-400">требует внимания</p>
          </div>
        </div>
      </div>
    </div>
  );
}
