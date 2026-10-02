'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, ArrowRight } from 'lucide-react';
import { FullGroupData } from '@/lib/data/mockData';
import { getTopOccupiedGroups } from '../lib/analyticsHelpers';

export interface GroupOccupancyWidgetProps {
  groups: FullGroupData[];
  isLoading?: boolean;
}

export function GroupOccupancyWidget({
  groups,
  isLoading = false,
}: GroupOccupancyWidgetProps) {
  const router = useRouter();

  const groupsSummary = useMemo(() => {
    const active = groups.filter(g => g.status === 'active' && !g.is_deleted && !g.isDeleted);
    const recruiting = groups.filter(g => g.status === 'recruiting' && !g.is_deleted && !g.isDeleted);

    let totalEnrolled = 0;
    let totalCapacity = 0;

    active.forEach(g => {
      totalEnrolled += g.students?.length || 0;
      totalCapacity += g.capacity || 8;
    });

    const averageRate = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 84;

    const attentionList = active.filter(g => (g.students?.length || 0) < (g.capacity || 8)).slice(0, 2);

    return {
      activeCount: active.length || 8,
      recruitingCount: recruiting.length || 2,
      averageRate: averageRate || 84,
      attentionList,
    };
  }, [groups]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3 animate-pulse h-[260px]" />
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between h-[260px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Группы</h3>
        </div>
        <button
          type="button"
          onClick={() => router.push('/groups')}
          className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>Открыть группы</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Top section: Donut + stats */}
      <div className="flex items-center justify-between gap-3 pt-1">
        {/* Donut circle */}
        <div className="w-14 h-14 shrink-0 relative flex items-center justify-center">
          <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
            <path
              className="text-slate-100"
              strokeWidth="4"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-teal-500"
              strokeDasharray={`${groupsSummary.averageRate}, 100`}
              strokeWidth="4"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="absolute font-black text-xs text-slate-900">{groupsSummary.averageRate}%</span>
        </div>

        <div className="min-w-0 flex-1 pl-1">
          <p className="text-[11px] text-slate-400 font-medium">Средняя загрузка</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full">
              ↑ +6%
            </span>
            <span className="text-[10px] text-slate-400">к прошлому месяцу</span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-sm font-bold text-slate-900">{groupsSummary.activeCount} <span className="text-[11px] font-normal text-slate-500">активных</span></div>
          <div className="text-sm font-bold text-slate-900">{groupsSummary.recruitingCount} <span className="text-[11px] font-normal text-slate-500">в наборе</span></div>
        </div>
      </div>

      {/* Bottom section: Требуют внимания */}
      <div className="pt-2 border-t border-slate-50 space-y-1.5">
        <p className="text-[11px] font-bold text-slate-800">Требуют внимания</p>

        {/* Group 1 */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-800 text-[11px] truncate w-24">
            Python P-12
          </span>
          <span className="text-[11px] text-slate-500 font-bold shrink-0">6/8</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: '75%' }} />
          </div>
          <button
            type="button"
            onClick={() => router.push('/groups')}
            className="px-2 py-0.5 rounded text-[10px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors shrink-0"
          >
            Заполнить
          </button>
        </div>

        {/* Group 2 */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-800 text-[11px] truncate w-24">
            English B1
          </span>
          <span className="text-[11px] text-slate-500 font-bold shrink-0">5/8</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: '62%' }} />
          </div>
          <button
            type="button"
            onClick={() => router.push('/groups')}
            className="px-2 py-0.5 rounded text-[10px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors shrink-0"
          >
            Заполнить
          </button>
        </div>
      </div>
    </div>
  );
}
