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

  return (
    <div className="bg-white rounded-2xl p-3.5 lg:p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between h-full">
      {/* 1. Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100 shadow-2xs">
              <DollarSign className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h3 className="text-sm lg:text-base font-bold text-slate-900">
                  Потери потенциальной выручки
                </h3>
                <span className="text-slate-400 text-xs cursor-help" title="Оценка упущенной выручки">ⓘ</span>
              </div>
              <p className="text-[11.5px] text-slate-400">
                Оценка упущенной выручки на основе текущих данных
              </p>
            </div>
          </div>

          {/* Right: Selector */}
          <div className="relative">
            <select
              value={lossView}
              onChange={(e) => setLossView(e.target.value as any)}
              aria-label="Режим отображения потерь"
              className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl pl-2.5 pr-6 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="categories">По категориям</option>
              <option value="channels">По каналам</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        {/* 2. Main Total Loss Number & Info link */}
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                ≈ {losses.totalLossRub > 0 ? losses.totalLossRub.toLocaleString('ru-RU') : (losses.totalLossEur * 100).toLocaleString('ru-RU')} ₽
              </span>
              <span className="text-xs text-slate-400 font-medium font-mono">
                (≈ {losses.totalLossEur.toLocaleString('ru-RU')} €)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Потенциальные потери в этом месяце
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsInfoModalOpen(true)}
            className="text-[11.5px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer whitespace-nowrap"
          >
            Как рассчитывается?
          </button>
        </div>

        {/* 3. Compact Stacked Bar */}
        <div className="h-2 rounded-full overflow-hidden flex gap-0.5 my-2.5 bg-slate-100 p-0.5 border border-slate-200/50">
          {losses.categories.map((cat) => {
            if (cat.percent <= 0) return null;
            return (
              <div
                key={cat.id}
                title={`${cat.name}: ${cat.percent}%`}
                className={cn('h-full rounded-sm transition-all duration-300', cat.colorBar)}
                style={{ width: `${cat.percent}%` }}
              />
            );
          })}
        </div>

        {/* 4. List of Loss Categories: категория | сумма | мини-бар | % */}
        <div className="space-y-1.5 mt-2">
          {losses.categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className={cn('h-2 w-2 rounded-full shrink-0', cat.colorBg)} />
                <span className="font-semibold text-slate-800 truncate text-xs">{cat.name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-bold text-slate-900 text-xs font-mono">
                  {cat.isAvailable ? `${(cat.amountRub || cat.amountEur * 100).toLocaleString('ru-RU')} ₽` : '0 ₽'}
                </span>
                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                  <div
                    className={cn('h-full rounded-full', cat.colorBar)}
                    style={{ width: `${Math.min(cat.percent * 2, 100)}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-400 font-medium w-7 text-right">
                  {cat.percent}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Bottom Alert Banner */}
      <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-2.5 flex items-center justify-between gap-2 text-xs mt-3">
        <div className="flex items-center gap-1.5 min-w-0 pr-2 truncate text-rose-800 text-[11px]">
          <div className="h-4 w-4 rounded-full bg-rose-100 flex items-center justify-center text-[10px] font-bold text-rose-600 shrink-0">
            !
          </div>
          <span className="truncate">
            Из 6 оплаченных пробных уроков потенциальная недополученная выручка — 84 000 ₽
          </span>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab ? onNavigateTab('sales') : undefined}
          className="font-bold text-blue-600 hover:text-blue-800 hover:underline shrink-0 cursor-pointer text-xs whitespace-nowrap"
        >
          Посмотреть лиды →
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
