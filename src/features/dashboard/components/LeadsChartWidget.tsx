'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { FullLeadData } from '@/lib/data/mockData';
import { AnalyticsPeriod, aggregateLeadsByPeriod } from '../lib/analyticsHelpers';
import {
  UserCheck,
  Users,
  ChevronRight,
  TrendingUp,
  Percent
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LeadsChartWidgetProps {
  leads: FullLeadData[];
  period: AnalyticsPeriod;
  isLoading?: boolean;
}

export function LeadsChartWidget({
  leads,
  period,
  isLoading = false,
}: LeadsChartWidgetProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    data,
    totalLeads,
    totalPaid,
    overallConversionRate,
  } = useMemo(() => {
    return aggregateLeadsByPeriod(leads, period);
  }, [leads, period]);

  const hasLeads = totalLeads > 0;

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
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
              <UserCheck className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-900">Поступление и конверсия лидов</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Динамика новых обращений и успешных оплат
          </p>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold">
              Всего: {totalLeads}
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              Оплачено: {totalPaid}
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
              Конверсия: {overallConversionRate}%
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push('/crm')}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Перейти в CRM"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="p-5 flex-1 min-h-[260px]">
        {!hasLeads ? (
          <div className="flex flex-col items-center justify-center h-56 text-center text-slate-400">
            <Users className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs font-semibold">Нет зафиксированных заявок за выбранный период</p>
          </div>
        ) : !isMounted ? (
          <div className="h-56 bg-slate-50 rounded-xl animate-pulse" />
        ) : (
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs space-y-1">
                          <p className="font-bold text-slate-200">{label}</p>
                          <p className="text-slate-300">
                            Всего заявок: <span className="font-bold text-purple-400">{item.totalLeads}</span>
                          </p>
                          <p className="text-slate-300">
                            Оплачено: <span className="font-bold text-emerald-400">{item.paidLeads}</span>
                          </p>
                          <p className="text-[10px] text-slate-400 border-t border-slate-800 pt-1 mt-1">
                            Конверсия: <span className="font-bold text-white">{item.conversionRate}%</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="totalLeads"
                  name="Всего обращений"
                  fill="#c084fc"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Bar
                  dataKey="paidLeads"
                  name="Оплатили"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
