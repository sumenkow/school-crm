'use client';

import React, { useState } from 'react';
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
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-4">
      {/* 1. Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100 shadow-2xs">
              <DollarSign className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Потери потенциальной выручки
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Оценка упущенной выручки на основе текущих данных
              </p>
            </div>
          </div>

          {/* Right: Selector & Info Link */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={lossView}
                onChange={(e) => setLossView(e.target.value as any)}
                aria-label="Режим отображения потерь"
                className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl pl-3 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value="categories">По категориям</option>
                <option value="directions">По направлениям</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            <button
              type="button"
              onClick={() => setIsInfoModalOpen(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline px-1.5 py-1 cursor-pointer whitespace-nowrap"
            >
              Как рассчитывается?
            </button>
          </div>
        </div>

        {/* 2. Main Total Loss Number */}
        <div className="mt-4">
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
            ≈ {losses.totalLossEur.toLocaleString('ru-RU')} € / {losses.totalLossRub.toLocaleString('ru-RU')} ₽
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Потенциальные потери в этом месяце
          </p>
        </div>

        {/* 3. Multi-colored Horizontal Segmented Progress Bar */}
        <div className="h-3 rounded-full overflow-hidden flex gap-0.5 my-3.5 bg-slate-100 p-0.5 border border-slate-200/50">
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

        {/* 4. List of Loss Categories */}
        <div className="space-y-2.5">
          {losses.categories.map((cat) => (
            <div key={cat.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={cn('h-2 w-2 rounded-full shrink-0', cat.colorBg)} />
                  <span className="font-semibold text-slate-800">{cat.name}:</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {cat.countInfo}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 font-mono text-[11.5px]">
                  {cat.isAvailable ? (
                    <>
                      <span>{cat.amountEur.toLocaleString('ru-RU')} €</span>
                      <span className="text-slate-400 font-normal">/</span>
                      <span className="text-slate-500 font-normal">{cat.amountRub.toLocaleString('ru-RU')} ₽</span>
                      <span className="text-[10px] text-slate-400 font-bold ml-1">({cat.percent}%)</span>
                    </>
                  ) : (
                    <span className="text-slate-400 font-normal">—</span>
                  )}
                </div>
              </div>

              {/* Mini progress bar */}
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-300', cat.colorBar)}
                  style={{ width: `${cat.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Bottom Banner Conclusion */}
      <div className="rounded-xl border border-amber-200/60 bg-amber-50/70 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-amber-900 mt-2">
        <p className="leading-snug">
          Из <span className="font-bold text-amber-950">{losses.trialLeadsCount}</span> оплаченных пробных уроков потенциальная недополученная выручка —{' '}
          <span className="font-bold text-amber-950">
            ≈ {losses.potentialFromTrialEur.toLocaleString('ru-RU')} € / {losses.potentialFromTrialRub.toLocaleString('ru-RU')} ₽
          </span>.
        </p>
        <button
          type="button"
          onClick={() => onNavigateTab ? onNavigateTab('sales') : window.location.assign('/crm')}
          className="inline-flex items-center gap-1 font-bold text-amber-900 hover:text-amber-950 hover:underline shrink-0 cursor-pointer"
        >
          <span>Посмотреть лиды</span>
          <ArrowRight className="h-3.5 w-3.5" />
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
