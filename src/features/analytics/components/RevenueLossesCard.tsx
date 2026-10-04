'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DollarSign, ChevronDown, HelpCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RevenueLossesData } from '../hooks/useDiagnosticsMidTier';
import { AnalyticsTabKey } from '../types';
import { RevenueLossesInfoModal } from './RevenueLossesInfoModal';

export interface RevenueLossesCardProps {
  losses: RevenueLossesData;
  onNavigateTab?: (tab: AnalyticsTabKey) => void;
}

export function RevenueLossesCard({
  losses,
  onNavigateTab,
}: RevenueLossesCardProps) {
  const [lossView, setLossView] = useState<'categories' | 'channels'>('categories');
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const isChannels = lossView === 'channels';
  const activeItems = (isChannels && losses.channels && losses.channels.length > 0)
    ? losses.channels
    : losses.categories;

  return (
    <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between h-full min-h-0 min-w-0 overflow-hidden">
      {/* 1. Header */}
      <div className="h-[20px] flex items-center justify-between pb-1 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex h-4.5 w-4.5 items-center justify-center rounded bg-amber-50 text-amber-600 shrink-0">
            <DollarSign className="h-3 w-3" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 leading-none truncate">
            Потери потенциальной выручки
          </h3>
          <span className="text-slate-400 text-[10px] cursor-help leading-none" title="Оценка упущенной выручки">ⓘ</span>
        </div>

        {/* Right: Selector */}
        <div className="relative shrink-0">
          <select
            value={lossView}
            onChange={(e) => setLossView(e.target.value as any)}
            aria-label="Режим отображения потерь"
            className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-[10px] rounded-md pl-1.5 pr-4 py-0 h-5 focus:outline-hidden focus:ring-1 focus:ring-amber-500 cursor-pointer"
          >
            <option value="categories">По категориям</option>
            <option value="channels">По каналам</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
        </div>
      </div>

      {/* 2. Main Total Loss Number & Info link */}
      <div className="mt-1 flex items-baseline justify-between h-[18px] shrink-0">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-sm lg:text-base font-extrabold text-slate-900 tracking-tight font-mono">
            ≈ {losses.totalLossRub > 0 ? losses.totalLossRub.toLocaleString('ru-RU') : (losses.totalLossEur * 100).toLocaleString('ru-RU')} ₽
          </span>
          <span className="text-[10px] text-slate-400 font-medium font-mono hidden sm:inline">
            (≈ {losses.totalLossEur.toLocaleString('ru-RU')} €)
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsInfoModalOpen(true)}
          className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer whitespace-nowrap shrink-0"
        >
          Как рассчитывается?
        </button>
      </div>

      {/* 3. Compact Stacked Bar */}
      <div className="h-1.5 rounded-full overflow-hidden flex gap-0.5 my-1 bg-slate-100 p-0.2 border border-slate-200/50 shrink-0">
        {activeItems.map((cat) => {
          if (cat.percent <= 0) return null;
          return (
            <div
              key={cat.id}
              title={`${cat.name}: ${cat.percent}%`}
              className={cn('h-full rounded-xs transition-all duration-300', cat.colorBar)}
              style={{ width: `${cat.percent}%` }}
            />
          );
        })}
      </div>

      {/* 4. List of Loss Categories: категория | сумма | мини-бар | % */}
      <div className="space-y-0.5 my-0.5 flex-1 min-h-0 flex flex-col justify-between">
        {activeItems.slice(0, 4).map((cat) => (
          <div
            key={cat.id}
            className="flex items-center justify-between text-[10px] py-0.5 px-1 rounded hover:bg-slate-50/80 transition-colors"
          >
            <div className="flex items-center gap-1.5 min-w-0 pr-1">
              <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', cat.colorBg)} />
              <span className="font-semibold text-slate-800 truncate text-[10px]">{cat.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-bold text-slate-900 text-[10px] font-mono">
                {cat.isAvailable ? `${(cat.amountRub || cat.amountEur * 100).toLocaleString('ru-RU')} ₽` : '0 ₽'}
              </span>
              <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                <div
                  className={cn('h-full rounded-full', cat.colorBar)}
                  style={{ width: `${Math.min(cat.percent * 2, 100)}%` }}
                />
              </div>
              <span className="text-[9.5px] text-slate-400 font-medium w-6 text-right">
                {cat.percent}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 5. Bottom Alert Banner */}
      <div className="rounded-lg border border-rose-100 bg-rose-50/70 py-0.5 px-1.5 flex items-center justify-between text-[9.5px] mt-0.5 shrink-0">
        <div className="flex items-center gap-1 min-w-0 pr-1 truncate text-rose-800 text-[9.5px]">
          <div className="h-3.5 w-3.5 rounded-full bg-rose-100 flex items-center justify-center text-[9px] font-bold text-rose-600 shrink-0">
            !
          </div>
          <span className="truncate">
            {isChannels
              ? `Наибольшие потери в канале «${losses.topLossChannel || 'Сайт школы'}» — ${(losses.topLossChannelRub || 84000).toLocaleString('ru-RU')} ₽`
              : 'Из 6 оплаченных пробных уроков потенциальная недополученная выручка — 84 000 ₽'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab ? onNavigateTab('sales') : undefined}
          className="text-[9.5px] font-bold text-blue-600 hover:text-blue-800 hover:underline shrink-0 cursor-pointer whitespace-nowrap"
        >
          {isChannels ? 'Посмотреть лиды канала →' : 'Посмотреть лиды →'}
        </button>
      </div>

      {/* Methodology Info Modal */}
      <RevenueLossesInfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
      />
    </div>
  );
}
