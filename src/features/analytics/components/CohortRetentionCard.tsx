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

  const getHeatmapColor = (val: number | null) => {
    if (val === null) return 'text-slate-300';
    if (val >= 92) return 'bg-emerald-50 text-emerald-800 font-semibold';
    if (val >= 88) return 'bg-blue-50 text-blue-800 font-semibold';
    if (val >= 80) return 'bg-amber-50/70 text-amber-800 font-semibold';
    return 'bg-rose-50 text-rose-700 font-bold border border-rose-100/80';
  };

  return (
    <div className="bg-white rounded-2xl p-3.5 lg:p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-3">
      {/* 1. Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
              <PieChart className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="text-sm lg:text-base font-bold text-slate-900">
                Удержание учеников
              </h3>
              <p className="text-[11.5px] text-slate-400">
                Когортный анализ по месяцам обучения
              </p>
            </div>
          </div>

          {/* Right Selectors */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as any)}
                aria-label="Период когорт"
                className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl pl-2.5 pr-6 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="months">По месяцам</option>
                <option value="quarters">По кварталам</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="relative">
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value as any)}
                aria-label="Направление"
                className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl pl-2.5 pr-6 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">Все направления</option>
                <option value="english">Английский</option>
                <option value="robotics">Робототехника</option>
                <option value="math">Математика</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* 2. Cohort Matrix Table */}
        <div className="mt-2.5 overflow-x-auto no-scrollbar">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-1.5 pl-1.5 pr-2">Когорта</th>
                <th className="py-1.5 px-1.5 text-center">M0</th>
                <th className="py-1.5 px-1.5 text-center">M1</th>
                <th className="py-1.5 px-1.5 text-center">M2</th>
                <th className="py-1.5 px-1.5 text-center">M3</th>
                <th className="py-1.5 px-1.5 text-center">M4</th>
                <th className="py-1.5 px-1.5 text-center">M5</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {cohorts.map((c, i) => (
                <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-1.5 pl-1.5 pr-2 font-semibold text-slate-900 whitespace-nowrap text-xs">
                    {c.month}{' '}
                    <span className="text-[10px] font-normal text-slate-400">
                      ({c.size})
                    </span>
                  </td>
                  <td className="py-1 px-1 text-center">
                    <span className={cn('inline-block w-11 py-0.5 rounded text-[11px]', getHeatmapColor(c.m0Num))}>
                      {c.m0}
                    </span>
                  </td>
                  <td className="py-1 px-1 text-center">
                    <span className={cn('inline-block w-11 py-0.5 rounded text-[11px]', getHeatmapColor(c.m1Num))}>
                      {c.m1}
                    </span>
                  </td>
                  <td className="py-1 px-1 text-center">
                    <span className={cn('inline-block w-11 py-0.5 rounded text-[11px]', getHeatmapColor(c.m2Num))}>
                      {c.m2}
                    </span>
                  </td>
                  <td className="py-1 px-1 text-center">
                    <span className={cn('inline-block w-11 py-0.5 rounded text-[11px]', getHeatmapColor(c.m3Num))}>
                      {c.m3}
                    </span>
                  </td>
                  <td className="py-1 px-1 text-center">
                    <span className={cn('inline-block w-11 py-0.5 rounded text-[11px]', getHeatmapColor(c.m4Num))}>
                      {c.m4}
                    </span>
                  </td>
                  <td className="py-1 px-1 text-center">
                    <span className={cn('inline-block w-11 py-0.5 rounded text-[11px]', getHeatmapColor(c.m5Num))}>
                      {c.m5}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Bottom Anomaly Alert */}
      <div className="rounded-xl border border-rose-200/80 bg-rose-50/70 p-2.5 flex items-center justify-between gap-2 text-xs text-rose-900">
        <p className="leading-snug flex items-center gap-1.5 min-w-0 pr-2 truncate">
          <span className="text-xs shrink-0">⚠️</span>
          <span className="truncate">{anomalyText}</span>
        </p>
        <button
          type="button"
          onClick={() => onNavigateTab ? onNavigateTab('retention') : undefined}
          className="inline-flex items-center gap-1 font-bold text-rose-700 hover:text-rose-950 hover:underline shrink-0 cursor-pointer whitespace-nowrap text-xs"
        >
          <span>Посмотреть ушедших</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
