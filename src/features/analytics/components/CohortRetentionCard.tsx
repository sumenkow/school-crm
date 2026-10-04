'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PieChart, ChevronDown, ArrowRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CohortRow } from '../hooks/useDiagnosticsRetentionAndRisks';
import { AnalyticsTabKey } from '../types';

export interface CohortRetentionCardProps {
  cohorts: CohortRow[];
  anomalyText: string;
  onNavigateTab?: (tab: AnalyticsTabKey) => void;
}

export function CohortRetentionCard({
  cohorts,
  anomalyText,
  onNavigateTab,
}: CohortRetentionCardProps) {
  const [periodFilter, setPeriodFilter] = useState<'months' | 'quarters'>('months');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'english' | 'robotics' | 'math'>('all');

  const getHeatmapColor = (val: number | null, isM0: boolean = false) => {
    if (val === null) return 'text-slate-300';
    if (isM0) return 'bg-blue-600 text-white font-semibold shadow-2xs';
    if (val < 87 && val > 0) return 'bg-rose-100/90 text-rose-700 font-bold border border-rose-200/80';
    if (val >= 92) return 'bg-blue-100/80 text-blue-900 font-semibold';
    if (val >= 88) return 'bg-blue-50 text-blue-800 font-medium';
    return 'bg-slate-50 text-slate-700';
  };

  return (
    <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between h-full min-h-0 min-w-0 overflow-hidden">
      {/* 1. Header */}
      <div className="h-[20px] flex items-center justify-between pb-1 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex h-4.5 w-4.5 items-center justify-center rounded bg-indigo-50 text-indigo-600 shrink-0">
            <PieChart className="h-3 w-3" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 leading-none truncate">
            Удержание учеников (Retention)
          </h3>
          <span className="text-slate-400 text-[10px] cursor-help leading-none" title="Когортный анализ">ⓘ</span>
        </div>

        {/* Right Selectors */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as any)}
              aria-label="Период когорт"
              className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-[10px] rounded-md pl-1.5 pr-4 py-0 h-5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="months">По месяцам</option>
              <option value="quarters">По кварталам</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
          </div>

          <div className="relative">
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value as any)}
              aria-label="Направление"
              className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-[10px] rounded-md pl-1.5 pr-4 py-0 h-5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Все направления</option>
              <option value="english">Английский</option>
              <option value="robotics">Робототехника</option>
              <option value="math">Математика</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
          </div>
        </div>
      </div>

      {/* 2. Cohort Matrix Table */}
      <div className="mt-1 overflow-x-auto no-scrollbar flex-1 min-h-0">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-0.5 px-0.5">Когорта</th>
              <th className="py-0.5 px-0.5 text-center">M0</th>
              <th className="py-0.5 px-0.5 text-center">M1</th>
              <th className="py-0.5 px-0.5 text-center">M2</th>
              <th className="py-0.5 px-0.5 text-center">M3</th>
              <th className="py-0.5 px-0.5 text-center">M4</th>
              <th className="py-0.5 px-0.5 text-center">M5</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {cohorts.slice(0, 5).map((c, i) => (
              <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-0.2 pl-1 pr-1 font-semibold text-slate-900 whitespace-nowrap text-[10px]">
                  {c.month}{' '}
                  <span className="text-[9px] font-normal text-slate-400">
                    ({c.size})
                  </span>
                </td>
                <td className="py-0.2 px-0.5 text-center">
                  <span className={cn('inline-block w-11 py-0.2 rounded text-[9.5px]', getHeatmapColor(c.m0Num, true))}>
                    {c.m0}
                  </span>
                </td>
                <td className="py-0.2 px-0.5 text-center">
                  <span className={cn('inline-block w-11 py-0.2 rounded text-[9.5px]', getHeatmapColor(c.m1Num))}>
                    {c.m1}
                  </span>
                </td>
                <td className="py-0.2 px-0.5 text-center">
                  <span className={cn('inline-block w-11 py-0.2 rounded text-[9.5px]', getHeatmapColor(c.m2Num))}>
                    {c.m2}
                  </span>
                </td>
                <td className="py-0.2 px-0.5 text-center">
                  <span className={cn('inline-block w-11 py-0.2 rounded text-[9.5px]', getHeatmapColor(c.m3Num))}>
                    {c.m3}
                  </span>
                </td>
                <td className="py-0.2 px-0.5 text-center">
                  <span className={cn('inline-block w-11 py-0.2 rounded text-[9.5px]', getHeatmapColor(c.m4Num))}>
                    {c.m4}
                  </span>
                </td>
                <td className="py-0.2 px-0.5 text-center">
                  <span className={cn('inline-block w-11 py-0.2 rounded text-[9.5px]', getHeatmapColor(c.m5Num))}>
                    {c.m5}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3. Bottom Anomaly Alert */}
      <div className="rounded-lg border border-rose-100 bg-rose-50/70 py-0.5 px-1.5 flex items-center justify-between text-[9.5px] mt-0.5 shrink-0">
        <div className="flex items-center gap-1 min-w-0 pr-1 truncate text-rose-950 font-semibold text-[9.5px]">
          <div className="h-3.5 w-3.5 rounded-full bg-rose-100 flex items-center justify-center text-[9px] font-bold text-rose-600 shrink-0">
            !
          </div>
          <span className="truncate">
            {anomalyText || 'Июльская когорта теряет учеников быстрее нормы (86.6% vs 90.4%)'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab ? onNavigateTab('retention') : undefined}
          className="text-[9.5px] font-bold text-blue-600 hover:underline shrink-0 whitespace-nowrap cursor-pointer"
        >
          Посмотреть ушедших →
        </button>
      </div>
    </div>
  );
}
