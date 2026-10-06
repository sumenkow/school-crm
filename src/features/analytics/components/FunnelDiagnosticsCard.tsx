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
  const fallbackInsight: FunnelInsightData = {
    title: isChannels ? 'Проблемный канал' : 'Главная проблема',
    metricLabel: '',
    dropPp: 0,
    prevRate: 0,
    currRate: 0,
    unpaidCount: 0,
    frequentReasons: [],
  };
  const activeInsight = (isChannels && channelInsight ? channelInsight : insight) || fallbackInsight;
  const frequentReasonsText =
    Array.isArray(activeInsight?.frequentReasons) && activeInsight.frequentReasons.length > 0
      ? activeInsight.frequentReasons?.join(', ')
      : '—';

  return (
    <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between h-full min-h-0 min-w-0 overflow-hidden">
      {/* 1. Header */}
      {/* 1. Header */}
      <div className="h-[20px] flex items-center justify-between pb-1 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex h-4.5 w-4.5 items-center justify-center rounded bg-blue-50 text-blue-600 shrink-0">
            <Layers className="h-3 w-3" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 leading-none truncate">
            Диагностика воронки продаж
          </h3>
          <span className="text-slate-400 text-[10px] cursor-help leading-none" title="Воронка лидов и конверсия">ⓘ</span>
        </div>

        {/* Right: Selector & Legend */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Текущий
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              Прошлый
            </span>
          </div>

          <div className="relative">
            <select
              value={funnelView}
              onChange={(e) => setFunnelView(e.target.value as any)}
              aria-label="Режим отображения воронки продаж"
              className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-[10px] rounded-md pl-1.5 pr-4 py-0 h-5 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="stages">По этапам</option>
              <option value="channels">По каналам</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
          </div>
        </div>
      </div>

      {/* 2. Side-by-side: Stages Table (left) and Highlight Alert Box (right) */}
      <div className="grid grid-cols-12 gap-2 mt-1 flex-1 min-h-0 items-stretch">
        {/* Left: Stages or Channels Table (~58%) */}
        <div className="col-span-7 flex flex-col justify-between min-h-0">
          {/* Table Header */}
          <div className="grid grid-cols-12 text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-0.5 border-b border-slate-100">
            <span className="col-span-5">{isChannels ? 'Канал' : 'Этап'}</span>
            <span className="col-span-2 text-center">{isChannels ? 'Лиды' : 'Сейчас'}</span>
            <span className="col-span-2 text-center">Было</span>
            <span className="col-span-3 text-right">{isChannels ? 'Конв. в оплату' : 'Конверсия'}</span>
          </div>

          {/* Table Rows: 4 stage rows py-0.5 px-1 text-[10.5px] leading-tight */}
          <div className="space-y-0.5 mt-0.5 flex-1 min-h-0 flex flex-col justify-between">
            {displayItems.slice(0, 4).map((st) => {
              const isProblemRow = isChannels
                ? st.deltaType === 'negative' || st.id === 'website'
                : st.id === 'paid' || st.name.toLowerCase().includes('оплат');
              return (
                <div
                  key={st.id}
                  className={cn(
                    'grid grid-cols-12 items-center py-0.5 px-1 rounded transition-colors text-[10.5px] leading-tight',
                    isProblemRow
                      ? 'bg-rose-50/70 border border-rose-200/60'
                      : 'hover:bg-slate-50'
                  )}
                >
                  {/* Stage / Channel Name & Visual Volume Bar */}
                  <div className="col-span-5 pr-1 min-w-0">
                    <div className="flex items-center justify-between text-[10.5px] font-semibold text-slate-800 truncate">
                      <span className="truncate">{st.name}</span>
                    </div>
                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden flex mt-0.5">
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
                  <div className="col-span-2 text-center font-bold text-slate-900 text-[10.5px]">
                    {st.countCurrent}
                  </div>

                  {/* Было */}
                  <div className="col-span-2 text-center text-slate-400 font-medium text-[10.5px]">
                    {st.countPrevious}
                  </div>

                  {/* Конверсия & Дельта */}
                  <div className="col-span-3 flex items-center justify-end gap-1 text-[10px]">
                    <span className="font-semibold text-slate-700">
                      {st.conversionStep}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center font-bold px-0.5 py-0 rounded text-[9.5px]',
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
        <div className="col-span-5 bg-rose-50/50 border border-rose-100/90 rounded-lg p-1.5 flex flex-col justify-between min-h-0 text-[10.5px] leading-tight">
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-rose-600 font-bold text-[10px]">
              <div className="h-3.5 w-3.5 rounded-full bg-rose-100 flex items-center justify-center text-[9px] font-bold">
                !
              </div>
              <span className="truncate">{activeInsight.title || (isChannels ? 'Проблемный канал' : 'Главная проблема')}</span>
            </div>

            <h4 className="font-bold text-[10.5px] text-slate-900 mt-1 leading-snug line-clamp-2">
              {activeInsight.metricLabel ||
                `Конверсия «Пробный → Оплата» снизилась на ${activeInsight.dropPp || 18} п.п.`}
            </h4>

            <div className="mt-0.5">
              <span className="inline-block bg-rose-100 text-rose-700 font-bold px-1.5 py-0.2 rounded text-[10px]">
                {activeInsight.prevRate || 58}% → {activeInsight.currRate || 40}%
              </span>
            </div>

            <p className="text-[9.5px] text-slate-500 mt-0.5 leading-tight truncate">
              {isChannels
                ? `${activeInsight.unpaidCount || 4} заявок с канала не дошли до оплаты`
                : `${activeInsight.unpaidCount || 6} лидов не дошли до оплаты после пробного урока`}
            </p>
          </div>

          <div className="space-y-1 mt-1 pt-1 border-t border-rose-100/80">
            <button
              type="button"
              onClick={() => onNavigateTab ? onNavigateTab('sales') : undefined}
              className="w-full py-0.5 px-2 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[10px] transition-colors cursor-pointer text-center"
            >
              {isChannels ? 'Посмотреть лиды канала →' : 'Посмотреть лиды →'}
            </button>

            <div
              className="text-[9px] text-slate-500 truncate cursor-help"
              title={frequentReasonsText}
            >
              Частые причины: {frequentReasonsText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
