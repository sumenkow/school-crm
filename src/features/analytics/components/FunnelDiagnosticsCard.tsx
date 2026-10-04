'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  AlertOctagon,
  ChevronDown,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FunnelStageData, FunnelInsightData } from '../hooks/useDiagnosticsMidTier';
import { AnalyticsTabKey } from '../types';

export interface FunnelDiagnosticsCardProps {
  stages: FunnelStageData[];
  insight: FunnelInsightData;
  comparePeriodLabel?: string;
  onNavigateTab?: (tab: AnalyticsTabKey) => void;
}

export function FunnelDiagnosticsCard({
  stages,
  insight,
  comparePeriodLabel,
  onNavigateTab,
}: FunnelDiagnosticsCardProps) {
  const [funnelView, setFunnelView] = useState<'stages' | 'channels'>('stages');

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-4">
      {/* 1. Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Диагностика воронки продаж
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Сравнение с: {comparePeriodLabel || 'прошлым периодом'}
              </p>
            </div>
          </div>

          {/* Right: Selector & Legend */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                Сейчас
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                Было
              </span>
            </div>

            <div className="relative">
              <select
                value={funnelView}
                onChange={(e) => setFunnelView(e.target.value as any)}
                aria-label="Режим отображения воронки продаж"
                className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl pl-3 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="stages">По этапам</option>
                <option value="channels">По каналам</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* 2. Stages List / Table */}
        <div className="mt-4 space-y-2.5">
          {/* Table Header */}
          <div className="grid grid-cols-12 text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 pb-1">
            <span className="col-span-5">Этап</span>
            <span className="col-span-2 text-center">Сейчас</span>
            <span className="col-span-2 text-center">Было</span>
            <span className="col-span-3 text-right">Конверсия / Изм.</span>
          </div>

          {/* Table Rows */}
          {stages.map((st) => (
            <div
              key={st.id}
              className="grid grid-cols-12 items-center p-2 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 transition-colors text-xs"
            >
              {/* Stage Name & Visual Volume Bar */}
              <div className="col-span-5 pr-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1">
                  <span className="truncate">{st.name}</span>
                </div>
                {/* Visual Comparative Bars */}
                <div className="h-1.5 w-full bg-slate-200/70 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${st.relativePercent}%` }}
                  />
                </div>
              </div>

              {/* Сейчас */}
              <div className="col-span-2 text-center font-bold text-slate-900">
                {st.countCurrent}
              </div>

              {/* Было */}
              <div className="col-span-2 text-center text-slate-400 font-medium">
                {st.countPrevious}
              </div>

              {/* Конверсия & Дельта */}
              <div className="col-span-3 flex items-center justify-end gap-1.5">
                <span className="font-semibold text-slate-700 font-mono text-[11px]">
                  {st.conversionStep}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 text-[10.5px] font-bold px-1.5 py-0.5 rounded-md border',
                    st.deltaType === 'positive'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : st.deltaType === 'negative'
                      ? 'bg-rose-50 text-rose-600 border-rose-100'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  )}
                >
                  {st.deltaType === 'positive' && <ArrowUpRight className="h-3 w-3" />}
                  {st.deltaType === 'negative' && <ArrowDownRight className="h-3 w-3" />}
                  {st.deltaText}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Highlight Block «Главная проблема» */}
      <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3.5 mt-3 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-rose-600 text-white shadow-2xs">
              <AlertOctagon className="h-3.5 w-3.5" />
            </span>
            <span className="font-bold text-xs text-rose-950">
              Главная проблема: Конверсия «Пробный → Оплата» снизилась на {insight.dropPp} п.п. ({insight.prevRate}% → {insight.currRate}%)
            </span>
          </div>
          <Link
            href="/crm"
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-white border border-rose-200/80 px-2.5 py-1 rounded-lg shadow-2xs hover:bg-rose-50 transition-all cursor-pointer"
          >
            <span>Посмотреть лиды</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <p className="text-xs text-rose-800">
          {insight.unpaidCount} лидов не дошли до оплаты после пробного урока.
        </p>

        <div className="text-[11px] text-slate-500 pt-1 border-t border-rose-100 flex flex-wrap gap-2">
          <span className="font-semibold text-slate-700">Частые причины:</span>
          {insight.frequentReasons.map((reason, idx) => (
            <span
              key={idx}
              className="bg-white/90 border border-rose-100 text-slate-600 px-1.5 py-0.5 rounded-md"
            >
              {reason}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
