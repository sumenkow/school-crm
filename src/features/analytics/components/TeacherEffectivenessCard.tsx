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
}

export function TeacherEffectivenessCard({
  teachers,
  allCount,
  filter,
  onFilterChange,
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
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
      {/* 1. Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-2xs">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Эффективность преподавателей
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Анализ ключевых показателей и отклонений
              </p>
            </div>
          </div>

          {/* Right: Selector */}
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => onFilterChange(e.target.value as any)}
              aria-label="Фильтр преподавателей"
              className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl pl-3 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="anomalies">Показать отклонения</option>
              <option value="all">Все преподаватели</option>
              <option value="high">Высокие показатели</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        {/* 2. Compact Table */}
        <div className="mt-3.5 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2 pl-1 pr-2">Преподаватель</th>
                <th className="py-2 px-1.5 text-center">Группы</th>
                <th className="py-2 px-1.5 text-center">Заполнение</th>
                <th className="py-2 px-1.5 text-center">Посещаемость</th>
                <th className="py-2 px-1.5 text-center">Retention</th>
                <th className="py-2 px-1.5 text-center">Конверсия пробных</th>
                <th className="py-2 pr-1.5 pl-1.5 text-right">Динамика</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    Нет преподавателей по выбранному фильтру
                  </td>
                </tr>
              ) : (
                teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Преподаватель (Аватар + ФИО + Направление) */}
                    <td className="py-2 pl-1 pr-2">
                      <Link
                        href={`/teachers/${t.id}`}
                        className="flex items-center gap-2 min-w-[130px] group"
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
                          <p className="text-[10px] text-slate-400 truncate">
                            {t.role}
                          </p>
                        </div>
                      </Link>
                    </td>

                    {/* Группы */}
                    <td className="py-2 px-1 text-center font-semibold text-slate-700 whitespace-nowrap text-xs">
                      {t.groupsCount}
                    </td>

                    {/* Заполнение */}
                    <td className="py-2 px-1 text-center whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold',
                          t.isLowOccupancy
                            ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200/80'
                            : 'text-slate-800'
                        )}
                      >
                        {t.occupancyRate}%
                      </span>
                    </td>

                    {/* Посещаемость */}
                    <td className="py-2 px-1 text-center whitespace-nowrap font-medium text-slate-700 text-xs">
                      {t.attendanceRate}%
                    </td>

                    {/* Retention */}
                    <td className="py-2 px-1 text-center whitespace-nowrap font-medium text-slate-700 text-xs">
                      {t.retentionRate}%
                    </td>

                    {/* Конверсия пробных */}
                    <td className="py-2 px-1 text-center whitespace-nowrap font-medium text-slate-700 text-xs">
                      {t.trialConversionRate}%
                    </td>

                    {/* Динамика */}
                    <td className="py-2 pr-1 pl-1 text-right whitespace-nowrap">
                      {t.dynamicsType === 'positive' ? (
                        <span className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                          <ArrowUpRight className="h-3 w-3" />
                          <span>{t.dynamicsText}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/60">
                          <ArrowDownRight className="h-3 w-3" />
                          <span>{t.dynamicsText}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Bottom Alert / Link */}
      <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-700 mt-2">
        <p className="leading-snug flex items-center gap-1.5 min-w-0 pr-2">
          <span className="shrink-0 text-amber-600 font-bold">⚠️</span>
          <span>
            {anomaliesCount > 0
              ? `Выявлены отклонения у ${anomaliesCount} из ${allCount} преподавателей`
              : `Показатели всех ${allCount} преподавателей находятся в пределах нормы`}
          </span>
        </p>
        <Link
          href="/schedule"
          className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 hover:underline shrink-0 whitespace-nowrap"
        >
          <span>Перейти к расписанию</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
