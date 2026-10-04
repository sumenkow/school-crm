'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronDown, ChevronRight, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StudentAtRisk } from '../hooks/useDiagnosticsRetentionAndRisks';

export interface StudentsAtRiskCardProps {
  students: StudentAtRisk[];
  totalCount: number;
  reasonFilter: string;
  onReasonFilterChange: (val: string) => void;
  onNavigateTab?: (tab: any) => void;
}

export function StudentsAtRiskCard({
  students,
  totalCount,
  reasonFilter,
  onReasonFilterChange,
  onNavigateTab,
}: StudentsAtRiskCardProps) {
  const getAvatarBg = (initials: string) => {
    const charCode = initials.charCodeAt(0) || 65;
    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-indigo-100 text-indigo-700',
      'bg-amber-100 text-amber-700',
      'bg-purple-100 text-purple-700',
      'bg-rose-100 text-rose-700',
      'bg-emerald-100 text-emerald-700',
    ];
    return colors[charCode % colors.length];
  };

  return (
    <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between h-full min-h-0 min-w-0 overflow-hidden">
      {/* 1. Header */}
      <div className="h-[20px] flex items-center justify-between pb-1 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex h-4.5 w-4.5 items-center justify-center rounded bg-amber-50 text-amber-600 shrink-0">
            <AlertTriangle className="h-3 w-3" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 leading-none truncate">
            Ученики в зоне риска
          </h3>
        </div>

        {/* Right: Selector */}
        <div className="relative shrink-0">
          <select
            value={reasonFilter}
            onChange={(e) => onReasonFilterChange(e.target.value)}
            aria-label="Фильтр причин риска"
            className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-[10px] rounded-md pl-1.5 pr-4 py-0 h-5 focus:outline-hidden focus:ring-1 focus:ring-amber-500 cursor-pointer"
          >
            <option value="all">Все причины</option>
            <option value="attendance">Низкая посещаемость</option>
            <option value="debt">Просрочен платеж</option>
            <option value="package">Пакет заканчивается</option>
            <option value="inactivity">Нет активности &gt; 20 дней</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
        </div>
      </div>

      {/* 2. Students List: 5 single-line rows */}
      <div className="space-y-0.5 mt-1 flex-1 min-h-0 flex flex-col justify-between">
        {students.slice(0, 5).map((st) => {
          const getReasonTag = () => {
            const primary = st.primaryReason;
            const reasonLabels = st.reasons?.map((r) => r.label).join(' ') || '';
            const d = `${reasonLabels} ${st.details || ''}`.toLowerCase();

            if (primary === 'package' || d.includes('пакет') || d.includes('заканч')) {
              return { label: 'ПАКЕТ', color: 'bg-rose-50 text-rose-700 border-rose-200/70' };
            }
            if (primary === 'debt' || d.includes('долг') || d.includes('платеж') || d.includes('баланс')) {
              return { label: 'ДОЛГ', color: 'bg-rose-50 text-rose-700 border-rose-200/70' };
            }
            if (d.includes('динамик') || d.includes('снизил')) {
              return { label: 'АКТИВН', color: 'bg-amber-50 text-amber-700 border-amber-200/70' };
            }
            if (primary === 'inactivity' || d.includes('активност') || d.includes('дней')) {
              return { label: 'АКТИВН', color: 'bg-amber-50 text-amber-700 border-amber-200/70' };
            }
            return { label: 'ПОСЕЩ', color: 'bg-rose-50 text-rose-700 border-rose-200/70' };
          };

          const tag = getReasonTag();

          return (
            <Link
              key={st.id}
              href={`/students/${st.id}`}
              className="h-[21px] flex items-center justify-between py-0 px-1.5 rounded-md bg-slate-50/70 hover:bg-slate-100/90 transition-colors border border-transparent hover:border-slate-200/60 group text-[10.5px]"
            >
              <div className="flex items-center min-w-0 pr-1">
                {/* Micro avatar */}
                <div
                  className={cn(
                    'h-4 w-4 rounded-full flex items-center justify-center font-bold text-[8.5px] shrink-0 mr-1.5',
                    getAvatarBg(st.initials)
                  )}
                >
                  {st.initials}
                </div>

                {/* Info */}
                <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors text-[10.5px] truncate max-w-[95px]">
                  {st.name}
                </span>
                <span className="text-[9.5px] text-slate-400 truncate max-w-[100px] hidden sm:inline ml-1">
                  {st.groupName}
                </span>
                <span
                  className={cn(
                    'text-[8px] font-bold uppercase tracking-wider px-1 py-0 rounded border shrink-0 ml-1',
                    tag.color
                  )}
                >
                  {tag.label}
                </span>
              </div>

              {/* Right: Risk indicator */}
              <div className="flex items-center gap-0.5 shrink-0 pl-1">
                <span
                  className={cn(
                    'text-[9.5px] font-bold inline-flex items-center gap-0.5',
                    st.riskLevel === 'high' ? 'text-rose-600' : 'text-amber-600'
                  )}
                >
                  <span>↓</span>
                  <span>{st.riskLevel === 'high' ? 'Высокий' : 'Средний'}</span>
                </span>
                <ChevronRight className="h-2.5 w-2.5 text-slate-300 group-hover:text-slate-500 shrink-0 ml-0.5" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* 3. Bottom Full-width Action Link */}
      <div className="pt-0.5 border-t border-slate-100 flex items-center justify-end text-[9.5px] text-blue-600 font-semibold h-[16px] shrink-0">
        <button
          type="button"
          onClick={() => onNavigateTab ? onNavigateTab('retention') : undefined}
          className="hover:underline cursor-pointer inline-flex items-center gap-0.5"
        >
          <span>Показать всех {totalCount || 7} учеников в зоне риска →</span>
        </button>
      </div>
    </div>
  );
}
