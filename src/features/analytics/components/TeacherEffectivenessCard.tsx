'use client';

import React from 'react';
import Link from 'next/link';
import { GraduationCap, ChevronDown, ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TeacherPerformanceItem } from '../hooks/useDiagnosticsTeachersAndGroups';

export interface TeacherEffectivenessCardProps {
  teachers: TeacherPerformanceItem[];
  allCount: number;
  filter: 'all' | 'anomalies' | 'high';
  onFilterChange: (val: 'all' | 'anomalies' | 'high') => void;
  onNavigateTab?: (tab: any) => void;
}

export function TeacherEffectivenessCard({
  teachers,
  allCount,
  filter,
  onFilterChange,
  onNavigateTab,
}: TeacherEffectivenessCardProps) {
  const anomaliesCount = teachers.filter((t) => t.hasAnomaly).length;

  const getAvatarBg = (initials: string) => {
    const charCode = (initials.charCodeAt(0) || 65) + (initials.charCodeAt(1) || 0);
    const colors = [
      'bg-indigo-100 text-indigo-700',
      'bg-blue-100 text-blue-700',
      'bg-emerald-100 text-emerald-700',
      'bg-amber-100 text-amber-700',
      'bg-purple-100 text-purple-700',
      'bg-rose-100 text-rose-700',
    ];
    return colors[charCode % colors.length];
  };

  return (
    <div className="bg-white rounded-2xl p-3.5 lg:p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-3">
      {/* 1. Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-2xs">
              <GraduationCap className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="text-sm lg:text-base font-bold text-slate-900">
                Эффективность преподавателей
              </h3>
              <p className="text-[11.5px] text-slate-400">
                Ключевые отклонения
              </p>
            </div>
          </div>

          {/* Right: Selector */}
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => onFilterChange(e.target.value as any)}
              aria-label="Фильтр преподавателей"
              className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl pl-2.5 pr-6 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="anomalies">Показать отклонения</option>
              <option value="all">Все преподаватели</option>
              <option value="high">Высокие показатели</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        {/* 2. Compact Table: Преподаватель | Группы | Заполнение | Посещ. | Retention | Пробные */}
        <div className="mt-2.5 overflow-x-auto no-scrollbar">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-1.5 pl-1 pr-2">Преподаватель</th>
                <th className="py-1.5 px-1.5 text-center">Группы</th>
                <th className="py-1.5 px-1.5 text-center">Заполнение</th>
                <th className="py-1.5 px-1.5 text-center">Посещ.</th>
                <th className="py-1.5 px-1.5 text-center">Retention</th>
                <th className="py-1.5 pr-1 pl-1 text-right">Пробные</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                    Нет преподавателей по выбранному фильтру
                  </td>
                </tr>
              ) : (
                teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Преподаватель (Аватар + ФИО + Направление) */}
                    <td className="py-1.5 pl-1 pr-2">
                      <Link
                        href={`/teachers/${t.id}`}
                        className="flex items-center gap-1.5 min-w-[120px] group"
                      >
                        <div
                          className={cn(
                            'h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0',
                            getAvatarBg(t.initials)
                          )}
                        >
                          {t.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-xs truncate group-hover:text-blue-600 transition-colors">
                            {t.name}
                          </p>
                        </div>
                      </Link>
                    </td>

                    {/* Группы */}
                    <td className="py-1.5 px-1.5 text-center font-semibold text-slate-700 whitespace-nowrap text-xs">
                      {t.groupsCount}
                    </td>

                    {/* Заполнение */}
                    <td className="py-1.5 px-1.5 text-center whitespace-nowrap text-xs">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 font-semibold',
                          t.occupancyRate < 70
                            ? 'text-rose-700'
                            : t.occupancyRate >= 85
                            ? 'text-emerald-700'
                            : 'text-slate-800'
                        )}
                      >
                        {t.occupancyRate < 70 && <span>🔴</span>}
                        {t.occupancyRate >= 85 && <span>🟢</span>}
                        <span>{t.occupancyRate}%</span>
                      </span>
                    </td>

                    {/* Посещ. */}
                    <td className="py-1.5 px-1.5 text-center whitespace-nowrap text-xs">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 font-semibold',
                          t.attendanceRate < 80
                            ? 'text-rose-700'
                            : t.attendanceRate >= 90
                            ? 'text-emerald-700'
                            : 'text-slate-700'
                        )}
                      >
                        {t.attendanceRate < 80 && <span>🔴</span>}
                        {t.attendanceRate >= 90 && <span>🟢</span>}
                        <span>{t.attendanceRate}%</span>
                      </span>
                    </td>

                    {/* Retention */}
                    <td className="py-1.5 px-1.5 text-center whitespace-nowrap text-xs">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 font-semibold',
                          t.retentionRate < 80
                            ? 'text-rose-700'
                            : t.retentionRate >= 90
                            ? 'text-emerald-700'
                            : 'text-slate-700'
                        )}
                      >
                        {t.retentionRate < 80 && <span>🔴</span>}
                        {t.retentionRate >= 90 && <span>🟢</span>}
                        <span>{t.retentionRate}%</span>
                      </span>
                    </td>

                    {/* Пробные */}
                    <td className="py-1.5 pr-1 pl-1 text-right whitespace-nowrap font-medium text-slate-700 text-xs">
                      {t.trialConversionRate}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Bottom Alert / Link */}
      <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5 flex items-center justify-between gap-2 text-xs text-slate-700">
        <p className="leading-snug flex items-center gap-1.5 min-w-0 pr-2 truncate">
          <span className="shrink-0 text-amber-600 font-bold text-xs">⚠️</span>
          <span className="truncate">
            {anomaliesCount > 0
              ? `Выявлены отклонения у ${anomaliesCount} из ${allCount} преподавателей`
              : `Показатели всех ${allCount} преподавателей в норме`}
          </span>
        </p>
        <button
          type="button"
          onClick={() => onNavigateTab ? onNavigateTab('teachers') : undefined}
          className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 hover:underline shrink-0 whitespace-nowrap cursor-pointer text-xs"
        >
          <span>Посмотреть преподавателей</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
