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
}

export function StudentsAtRiskCard({
  students,
  totalCount,
  reasonFilter,
  onReasonFilterChange,
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

  const getBadgeStyle = (variant: 'danger' | 'warning' | 'muted') => {
    switch (variant) {
      case 'danger':
        return 'bg-rose-50 text-rose-700 border-rose-200/80';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200/80';
      case 'muted':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-4">
      {/* 1. Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100 shadow-2xs">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Ученики в зоне риска
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ученики с высокой вероятностью оттока
              </p>
            </div>
          </div>

          {/* Right: Selector */}
          <div className="relative">
            <select
              value={reasonFilter}
              onChange={(e) => onReasonFilterChange(e.target.value)}
              aria-label="Фильтр причин риска"
              className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl pl-3 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">Все причины</option>
              <option value="attendance">Низкая посещаемость</option>
              <option value="debt">Просрочен платеж</option>
              <option value="package">Пакет заканчивается</option>
              <option value="inactivity">Нет активности &gt; 20 дней</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        {/* 2. Students List */}
        <div className="mt-3.5 space-y-2">
          {students.slice(0, 5).map((st) => (
            <Link
              key={st.id}
              href={`/students/${st.id}`}
              className="group flex items-center justify-between p-2 rounded-xl bg-slate-50/70 hover:bg-slate-100/90 transition-colors border border-transparent hover:border-slate-200/60"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                {/* Avatar */}
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0',
                    getAvatarBg(st.initials)
                  )}
                >
                  {st.initials}
                </div>

                {/* Info */}
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {st.name}
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      · {st.groupName}
                    </span>

                    {/* Chips */}
                    {st.reasons.map((r, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          'text-[9.5px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider',
                          getBadgeStyle(r.variant)
                        )}
                      >
                        {r.label}
                      </span>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-500 truncate">
                    {st.details}
                  </p>
                </div>
              </div>

              {/* Right: Risk Level Badge & Arrow */}
              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                <span
                  className={cn(
                    'text-xs font-bold whitespace-nowrap',
                    st.riskLevel === 'high' ? 'text-rose-600' : 'text-amber-600'
                  )}
                >
                  {st.riskLevel === 'high' ? '↓ Высокий' : '↓ Средний'}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 3. Bottom Full-width Link */}
      <div className="pt-2 border-t border-slate-100 text-center">
        <Link
          href="/students?filter=absences"
          className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline py-1 transition-colors"
        >
          <span>Показать всех {totalCount} учеников в зоне риска</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
