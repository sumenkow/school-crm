'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { FullPaymentData } from '@/lib/data/mockData';
import { AnalyticsPeriod, aggregateRevenueByPeriod } from '../lib/analyticsHelpers';
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  ChevronRight,
  ExternalLink,
  Coins
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RevenueChartWidgetProps {
  payments: FullPaymentData[];
  period: AnalyticsPeriod;
  isLoading?: boolean;
}

export function RevenueChartWidget({
  payments,
  period,
  isLoading = false,
}: RevenueChartWidgetProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    data,
    totalRevenueEur,
    avgMonthlyRevenueEur,
    previousPeriodTotalEur,
    deltaPercent,
  } = useMemo(() => {
    return aggregateRevenueByPeriod(payments, period);
  }, [payments, period]);

  const hasAnyRevenue = totalRevenueEur > 0;

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs">
        <div className="h-6 w-48 bg-slate-100 rounded animate-pulse" />
        <div className="h-64 bg-slate-50 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Coins className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-900">Динамика выручки</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Фактически поступившие оплаты за выбранный период
          </p>
        </div>

        {/* Totals & Delta */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-right sm:text-right">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {totalRevenueEur.toLocaleString('ru-RU')} €
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Среднемес: {avgMonthlyRevenueEur.toLocaleString('ru-RU')} €
            </div>
          </div>

          {/* Previous period delta - OMITTED if comparative data does not exist */}
          {deltaPercent !== null && (
            <div className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border',
              deltaPercent >= 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            )}>
              {deltaPercent >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{deltaPercent > 0 ? `+${deltaPercent}%` : `${deltaPercent}%`}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => router.push('/finance')}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Перейти в финансы"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="p-5 flex-1 min-h-[260px]">
        {!hasAnyRevenue ? (
          <div className="flex flex-col items-center justify-center h-56 text-center text-slate-400">
            <CreditCard className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs font-semibold">Нет зафиксированных оплат за этот период</p>
          </div>
        ) : !isMounted ? (
          <div className="h-56 bg-slate-50 rounded-xl animate-pulse" />
        ) : (
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(val) => `${val} €`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs space-y-1">
                          <p className="font-bold text-slate-200">{label}</p>
                          <p className="text-sm font-black text-blue-400">
                            {item.revenueEur.toLocaleString('ru-RU')} €
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Транзакций: {item.count}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenueEur"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#revenueGradient)"
                  dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 6, fill: '#1d4ed8', strokeWidth: 2, stroke: '#ffffff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
