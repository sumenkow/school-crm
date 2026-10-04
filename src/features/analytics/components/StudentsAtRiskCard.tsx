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
    <div className="bg-white rounded-2xl p-3.5 lg:p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-3">
      {/* 1. Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100 shadow-2xs">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="text-sm lg:text-base font-bold text-slate-900">
                Ученики в зоне риска
              </h3>
              <p className="text-[11.5px] text-slate-400">
                Высокая вероятность оттока
              </p>
            </div>
          </div>

          {/* Right: Selector */}
          <div className="relative">
            <select
              value={reasonFilter}
              onChange={(e) => onReasonFilterChange(e.target.value)}
              aria-label="Фильтр причин риска"
              className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl pl-2.5 pr-6 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">Все причины</option>
              <option value="attendance">Низкая посещаемость</option>
              <option value="debt">Просрочен платеж</option>
              <option value="package">Пакет заканчивается</option>
              <option value="inactivity">Нет активности &gt; 20 дней</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        {/* 2. Students List: max 5 rows, ~48-52px each */}
        <div className="mt-2.5 space-y-1.5">
          {students.slice(0, 5).map((st) => {
            const getReasonTag = () => {
              const primary = st.primaryReason;
              const reasonLabels = st.reasons?.map((r) => r.label).join(' ') || '';
              const d = `${reasonLabels} ${st.details || ''}`.toLowerCase();

              if (primary === 'package' || d.includes('пакет') || d.includes('заканч')) {
                return { label: 'ПАКЕТ ЗАКАНЧИВАЕТСЯ', color: 'bg-rose-50 text-rose-700 border-rose-200/70' };
              }
              if (primary === 'debt' || d.includes('долг') || d.includes('платеж') || d.includes('баланс')) {
                return { label: 'ПРОСРОЧЕН ПЛАТЕЖ', color: 'bg-rose-50 text-rose-700 border-rose-200/70' };
              }
              if (d.includes('динамик') || d.includes('снизил')) {
                return { label: 'СНИЗИЛАСЬ АКТИВНОСТЬ', color: 'bg-amber-50 text-amber-700 border-amber-200/70' };
              }
              if (primary === 'inactivity' || d.includes('активност') || d.includes('дней')) {
                return { label: 'НЕТ АКТИВНОСТИ', color: 'bg-amber-50 text-amber-700 border-amber-200/70' };
              }
              return { label: 'НИЗКАЯ ПОСЕЩАЕМОСТЬ', color: 'bg-rose-50 text-rose-700 border-rose-200/70' };
            };

            const tag = getReasonTag();

            return (
              <Link
                key={st.id}
                href={`/students/${st.id}`}
                className="group flex items-center justify-between py-1.5 px-2 rounded-xl bg-slate-50/70 hover:bg-slate-100/90 transition-colors border border-transparent hover:border-slate-200/60"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  {/* Avatar */}
                  <div
                    className={cn(
                      'h-7 w-7 rounded-full flex items-center justify-center font-bold text-[10.5px] shrink-0',
                      getAvatarBg(st.initials)
                    )}
                  >
                    {st.initials}
                  </div>

                  {/* Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs truncate">
                      <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {st.name}
                      </span>
                      <span
                        className={cn(
                          'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border shrink-0',
                          tag.color
                        )}
                      >
                        {tag.label}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
                      <span className="text-slate-600 font-medium">{st.groupName}</span> · {st.details}
                    </p>
                  </div>
                </div>

                {/* Right: Risk Level with arrow & chevron */}
                <div className="flex items-center gap-1.5 shrink-0 pl-1.5">
                  <div className="text-right">
                    <span className="text-[9.5px] text-slate-400 block leading-none mb-0.5">
                      Риск оттока
                    </span>
                    <span
                      className={cn(
                        'text-xs font-bold inline-flex items-center gap-0.5',
                        st.riskLevel === 'high' ? 'text-rose-600' : 'text-amber-600'
                      )}
                    >
                      <span>↓</span>
                      <span>{st.riskLevel === 'high' ? 'Высокий' : 'Средний'}</span>
                    </span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 3. Bottom Full-width Action Link */}
      <div className="pt-2 border-t border-slate-100 text-right">
        <button
          type="button"
          onClick={() => onNavigateTab ? onNavigateTab('retention') : undefined}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors cursor-pointer"
        >
          <span>Показать всех {totalCount || 7} учеников в зоне риска</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
