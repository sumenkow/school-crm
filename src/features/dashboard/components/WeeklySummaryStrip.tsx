'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  UserPlus,
  ArrowUpRight,
  Sparkles,
  Layers,
  UserMinus,
  TrendingDown,
  ArrowRight
} from 'lucide-react';
import { FullLessonData, FullStudentData, FullGroupData } from '@/lib/data/mockData';

export interface WeeklySummaryStripProps {
  lessons?: FullLessonData[];
  students?: FullStudentData[];
  groups?: FullGroupData[];
  onOpenReport?: () => void;
  isLoading?: boolean;
}

export function WeeklySummaryStrip({
  onOpenReport,
  isLoading = false,
}: WeeklySummaryStripProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="h-16 bg-white rounded-2xl border border-slate-100 animate-pulse shadow-sm" />
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      {/* Left title */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-900 leading-tight">С этой недели</h4>
          <p className="text-[11px] text-slate-400 font-medium">Сравнение с предыдущей неделей</p>
        </div>
      </div>

      {/* Middle Metric Chips */}
      <div className="flex flex-wrap items-center gap-2.5 my-auto">
        {/* Chip 1: +7 новых учеников */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
          <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-bold text-emerald-700">+7</span>
          <span className="text-slate-500 text-[11px]">новых учеников</span>
        </div>

        {/* Chip 2: +12% выручка */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
          <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-bold text-blue-700">+12%</span>
          <span className="text-slate-500 text-[11px]">выручка</span>
        </div>

        {/* Chip 3: +2 новые группы */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
          <Layers className="w-3.5 h-3.5 text-purple-600" />
          <span className="font-bold text-purple-700">+2</span>
          <span className="text-slate-500 text-[11px]">новые группы</span>
        </div>

        {/* Chip 4: -1 ушедший ученик */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
          <UserMinus className="w-3.5 h-3.5 text-rose-500" />
          <span className="font-bold text-rose-600">-1</span>
          <span className="text-slate-500 text-[11px]">ушедший ученик</span>
        </div>

        {/* Chip 5: -80 € задолженность */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
          <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
          <span className="font-bold text-rose-600">-80 €</span>
          <span className="text-slate-500 text-[11px]">задолженность</span>
        </div>
      </div>

      {/* Right Button */}
      <button
        type="button"
        onClick={onOpenReport ? onOpenReport : () => router.push('/analytics')}
        className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs transition-colors flex items-center gap-1.5 shrink-0 self-start lg:self-auto cursor-pointer"
      >
        <span>Полный отчёт</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
