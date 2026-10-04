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
    <div className="bg-white rounded-2xl p-3.5 lg:p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-3">
      {/* 1. Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
              <Layers className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="text-sm lg:text-base font-bold text-slate-900">
                Диагностика воронки продаж
              </h3>
              <p className="text-[11.5px] text-slate-400">
                Сравнение с {comparePeriodLabel ? `периодом: ${comparePeriodLabel}` : 'предыдущим периодом'}
              </p>
            </div>
          </div>

          {/* Right: Selector & Legend */}
          <div className="flex items-center gap-2.5">
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
                className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl pl-2.5 pr-6 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="stages">По этапам</option>
                <option value="channels">По каналам</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* 2. Stages List / Table */}
        <div className="mt-2.5 space-y-1.5">
          {/* Table Header */}
          <div className="grid grid-cols-12 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider px-2 pb-0.5">
            <span className="col-span-5">Этап</span>
            <span className="col-span-2 text-center">Сейчас</span>
            <span className="col-span-2 text-center">Было</span>
            <span className="col-span-3 text-right">Конверсия / Изм.</span>
          </div>

          {/* Table Rows */}
          {stages.map((st) => {
            const isProblemRow = st.id === 'paid' || st.name.toLowerCase().includes('оплат');
            return (
              <div
                key={st.id}
                className={cn(
                  'grid grid-cols-12 items-center py-1.5 px-2 rounded-xl transition-colors text-xs',
                  isProblemRow
                    ? 'bg-rose-50/80 border border-rose-200/70 hover:bg-rose-100/70'
                    : 'bg-slate-50/70 hover:bg-slate-100/80'
                )}
              >
                {/* Stage Name & Visual Volume Bar */}
                <div className="col-span-5 pr-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-0.5">
                    <span className="truncate">{st.name}</span>
                  </div>
                  {/* Visual Comparative Bars */}
                  <div className="h-1.5 w-full bg-slate-200/70 rounded-full overflow-hidden flex">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        isProblemRow ? 'bg-rose-500' : 'bg-blue-600'
                      )}
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
                      'inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded border',
                      st.deltaType === 'positive'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : st.deltaType === 'negative'
                        ? 'bg-rose-50 text-rose-600 border-rose-100'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    )}
                  >
                    {st.deltaType === 'positive' && <ArrowUpRight className="h-2.5 w-2.5" />}
                    {st.deltaType === 'negative' && <ArrowDownRight className="h-2.5 w-2.5" />}
                    {st.deltaText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Highlight Block «Главная проблема» */}
      <div className="rounded-xl border border-rose-200/80 bg-rose-50/70 p-2.5 space-y-1.5 text-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs">🔴</span>
            <span className="font-bold text-xs text-rose-950">
              Главная проблема: Конверсия «Пробный → Оплата» снизилась на {insight.dropPp || 41} п.п.
            </span>
            <span className="font-mono text-[11px] text-rose-700 font-semibold bg-rose-100/80 px-1.5 py-0.2 rounded">
              {insight.prevRate || 58}% → {insight.currRate || 17}%
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab ? onNavigateTab('sales') : undefined}
            className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-900 bg-white border border-rose-200 px-2.5 py-0.5 rounded-lg shadow-2xs hover:bg-rose-50 transition-all cursor-pointer"
          >
            <span>Посмотреть лиды</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <p className="text-[11.5px] text-rose-800">
          {insight.unpaidCount || 5} лидов не дошли до оплаты.
        </p>

        <div className="text-[11px] text-slate-600 pt-1 border-t border-rose-200/50 flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-slate-700">Причины:</span>
          <span className="bg-white/90 border border-rose-100 text-slate-700 px-1.5 py-0.2 rounded font-medium">Нет последующего контакта 40%</span>
          <span className="bg-white/90 border border-rose-100 text-slate-700 px-1.5 py-0.2 rounded font-medium">Не устроил график 30%</span>
          <span className="bg-white/90 border border-rose-100 text-slate-700 px-1.5 py-0.2 rounded font-medium">Высокая стоимость 30%</span>
        </div>
      </div>
    </div>
  );
}
