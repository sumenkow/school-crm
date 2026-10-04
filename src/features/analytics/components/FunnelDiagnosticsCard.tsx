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
  channels?: FunnelStageData[];
  channelInsight?: FunnelInsightData;
  comparePeriodLabel?: string;
  onNavigateTab?: (tab: AnalyticsTabKey) => void;
}

export function FunnelDiagnosticsCard({
  stages,
  insight,
  channels,
  channelInsight,
  comparePeriodLabel,
  onNavigateTab,
}: FunnelDiagnosticsCardProps) {
  const [funnelView, setFunnelView] = useState<'stages' | 'channels'>('stages');

  const isChannels = funnelView === 'channels';
  const displayItems = isChannels && channels && channels.length > 0 ? channels : stages;
  const activeInsight = isChannels && channelInsight ? channelInsight : insight;

  return (
    <div className="bg-white rounded-2xl p-3.5 lg:p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between h-full">
      {/* 1. Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
              <Layers className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h3 className="text-sm lg:text-base font-bold text-slate-900">
                  Диагностика воронки продаж
                </h3>
                <span className="text-slate-400 text-xs cursor-help" title="Воронка лидов и конверсия">ⓘ</span>
              </div>
              <p className="text-[11.5px] text-slate-400">
                Сравнение с прошлым периодом
              </p>
            </div>
          </div>

          {/* Right: Selector & Legend */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                Текущий период
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                Прошлый период
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

        {/* 2. Side-by-side: Stages Table (left) and Highlight Alert Box (right) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-3 items-stretch">
          {/* Left: Stages or Channels Table (~58%) */}
          <div className="md:col-span-7 flex flex-col justify-between">
            {/* Table Header */}
            <div className="grid grid-cols-12 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-1 border-b border-slate-100">
              <span className="col-span-5">{isChannels ? 'Канал' : 'Этап'}</span>
              <span className="col-span-2 text-center">{isChannels ? 'Лиды' : 'Сейчас'}</span>
              <span className="col-span-2 text-center">Было</span>
              <span className="col-span-3 text-right">{isChannels ? 'Конв. в оплату' : 'Конверсия / Изм.'}</span>
            </div>

            {/* Table Rows */}
            <div className="space-y-1 mt-1">
              {displayItems.map((st) => {
                const isProblemRow = isChannels
                  ? st.deltaType === 'negative' || st.id === 'website'
                  : st.id === 'paid' || st.name.toLowerCase().includes('оплат');
                return (
                  <div
                    key={st.id}
                    className={cn(
                      'grid grid-cols-12 items-center py-1 px-1.5 rounded-lg transition-colors text-xs',
                      isProblemRow
                        ? 'bg-rose-50/70 border border-rose-200/60'
                        : 'hover:bg-slate-50'
                    )}
                  >
                    {/* Stage / Channel Name & Visual Volume Bar */}
                    <div className="col-span-5 pr-1 min-w-0">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-0.5 truncate">
                        <span className="truncate">{st.name}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
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
                    <div className="col-span-2 text-center font-bold text-slate-900 text-xs">
                      {st.countCurrent}
                    </div>

                    {/* Было */}
                    <div className="col-span-2 text-center text-slate-400 font-medium text-xs">
                      {st.countPrevious}
                    </div>

                    {/* Конверсия & Дельта */}
                    <div className="col-span-3 flex items-center justify-end gap-1">
                      <span className="font-semibold text-slate-700 text-[11px]">
                        {st.conversionStep}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center text-[10px] font-bold px-1 py-0.2 rounded',
                          st.deltaType === 'positive'
                            ? 'text-emerald-700'
                            : st.deltaType === 'negative'
                            ? 'text-rose-600'
                            : 'text-slate-600'
                        )}
                      >
                        {st.deltaType === 'positive' && '↑ '}
                        {st.deltaType === 'negative' && '↓ '}
                        {st.deltaText}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Problem Alert Box (~42%) */}
          <div className="md:col-span-5 bg-rose-50/50 border border-rose-100/90 rounded-xl p-3 flex flex-col justify-between text-xs">
            <div>
              <div className="flex items-center gap-1.5 text-rose-600 font-bold text-xs">
                <div className="h-4 w-4 rounded-full bg-rose-100 flex items-center justify-center text-[10px] font-bold">
                  !
                </div>
                <span>{activeInsight.title || (isChannels ? 'Проблемный канал' : 'Главная проблема')}</span>
              </div>

              <h4 className="font-bold text-xs text-slate-900 mt-2 leading-tight">
                {activeInsight.metricLabel ||
                  `Конверсия «Пробный → Оплата» снизилась на ${activeInsight.dropPp || 18} п.п.`}
              </h4>

              <div className="mt-1.5">
                <span className="inline-block bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded text-xs">
                  {activeInsight.prevRate || 58}% → {activeInsight.currRate || 40}%
                </span>
              </div>

              <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                {isChannels
                  ? `${activeInsight.unpaidCount || 4} заявок с канала не дошли до оплаты`
                  : `${activeInsight.unpaidCount || 6} лидов не дошли до оплаты после пробного урока`}
              </p>

              <button
                type="button"
                onClick={() => onNavigateTab ? onNavigateTab('sales') : undefined}
                className="w-full mt-2.5 py-1.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition-colors cursor-pointer text-center"
              >
                {isChannels ? 'Посмотреть лиды канала →' : 'Посмотреть лиды →'}
              </button>
            </div>

            <div className="pt-2 mt-2 border-t border-rose-100 text-[11px] space-y-0.5 text-slate-600">
              <p className="font-semibold text-slate-700 mb-1">Частые причины:</p>
              {activeInsight.frequentReasons.map((r, i) => (
                <p key={i} className="text-slate-500">• {r}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
