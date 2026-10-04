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
    <div className="bg-white rounded-2xl p-3.5 lg:p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-3">
      {/* 1. Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100 shadow-2xs">
              <DollarSign className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="text-sm lg:text-base font-bold text-slate-900">
                Потери потенциальной выручки
              </h3>
              <p className="text-[11.5px] text-slate-400">
                Оценка упущенной выручки по текущим данным
              </p>
            </div>
          </div>

          {/* Right: Selector & Info Link */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsInfoModalOpen(true)}
              className="text-[11.5px] font-semibold text-blue-600 hover:text-blue-700 hover:underline px-1 py-0.5 cursor-pointer whitespace-nowrap"
            >
              Как рассчитывается?
            </button>
          </div>
        </div>

        {/* 2. Main Total Loss Number */}
        <div className="mt-2.5">
          <div className="flex items-baseline gap-2">
            <span className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight">
              ≈ {losses.totalLossEur.toLocaleString('ru-RU')} €
            </span>
            <span className="text-xs text-slate-400 font-medium font-mono">
              ≈ {losses.totalLossRub.toLocaleString('ru-RU')} ₽
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Оценка суммарных упущенных возможностей за выбранный период
          </p>
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

        {/* 4. List of Loss Categories: категория | сумма | % */}
        <div className="space-y-1.5 mt-2">
          {losses.categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50/60 hover:bg-slate-100/70 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className={cn('h-2 w-2 rounded-full shrink-0', cat.colorBg)} />
                <span className="font-semibold text-slate-800 truncate">{cat.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 font-mono text-[11.5px]">
                <span className="font-bold text-slate-900">
                  {cat.isAvailable ? `${cat.amountEur.toLocaleString('ru-RU')} €` : '0 €'}
                </span>
                <span className="text-[11px] text-slate-400 font-medium w-9 text-right">
                  {cat.percent}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Bottom Banner Conclusion */}
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-2.5 flex items-center justify-between gap-2 text-xs text-amber-900">
        <p className="leading-snug text-[11.5px] font-medium truncate">
          <span>Основная потеря — </span>
          <span className="font-bold text-amber-950">недозаполненные группы.</span>
        </p>
        <button
          type="button"
          onClick={() => onNavigateTab ? onNavigateTab('groups') : undefined}
          className="inline-flex items-center gap-1 font-bold text-amber-900 hover:text-amber-950 hover:underline shrink-0 cursor-pointer text-xs"
        >
          <span>Посмотреть группы</span>
          <ArrowRight className="h-3 w-3" />
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
