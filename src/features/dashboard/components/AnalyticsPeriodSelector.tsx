'use client';

import React from 'react';
import { AnalyticsPeriod } from '../lib/analyticsHelpers';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';

export interface AnalyticsPeriodSelectorProps {
  period: AnalyticsPeriod;
  onChange: (period: AnalyticsPeriod) => void;
  className?: string;
}

export function AnalyticsPeriodSelector({
  period,
  onChange,
  className,
}: AnalyticsPeriodSelectorProps) {
  const options: Array<{ key: AnalyticsPeriod; label: string }> = [
    { key: '6m', label: '6 месяцев' },
    { key: '12m', label: '12 месяцев' },
    { key: 'year', label: 'Этот год' },
  ];

  return (
    <div className={cn('flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/70 shadow-2xs', className)}>
      <div className="flex items-center gap-1 pl-1.5 pr-1 text-slate-400">
        <Calendar className="w-3.5 h-3.5" />
      </div>
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
            period === opt.key
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
