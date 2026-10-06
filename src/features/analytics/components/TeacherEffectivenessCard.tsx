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
  const teacherList = teachers || [];
  const anomaliesCount = teacherList.filter((t) => t.hasAnomaly).length;

  const getAvatarBg = (initials?: string) => {
    const s = initials || 'ПР';
    const charCode = (s.charCodeAt(0) || 65) + (s.charCodeAt(1) || 0);
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
    <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between h-full min-h-0 min-w-0 overflow-hidden">
      {/* 1. Header */}
      <div className="h-[20px] flex items-center justify-between pb-1 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex h-4.5 w-4.5 items-center justify-center rounded bg-emerald-50 text-emerald-600 shrink-0">
            <GraduationCap className="h-3 w-3" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 leading-none truncate">
            Эффективность преподавателей
          </h3>
        </div>

        {/* Right: Selector */}
        <div className="relative shrink-0">
          <select
            value={filter}
            onChange={(e) => onFilterChange(e.target.value as any)}
            aria-label="Фильтр преподавателей"
            className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-[10px] rounded-md pl-1.5 pr-4 py-0 h-5 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="anomalies">Показать отклонения</option>
            <option value="all">Все преподаватели</option>
            <option value="high">Высокие показатели</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
        </div>
      </div>

      {/* 2. Compact Table */}
      <div className="mt-1 overflow-x-auto no-scrollbar flex-1 min-h-0">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-0.5 px-0.5">Преподаватель</th>
              <th className="py-0.5 px-0.5 text-center">Группы</th>
              <th className="py-0.5 px-0.5 text-center">Заполнение</th>
              <th className="py-0.5 px-0.5 text-center">Посещаемость</th>
              <th className="py-0.5 px-0.5 text-center">Retention</th>
              <th className="py-0.5 px-0.5 text-center whitespace-nowrap">Конв. пробных</th>
              <th className="py-0.5 px-0.5 text-right">Динамика</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {teacherList.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-4 text-center text-[10px] text-slate-400">
                  Нет преподавателей по выбранному фильтру
                </td>
              </tr>
            ) : (
              teacherList.slice(0, 5).map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70 transition-colors py-0.5 text-[10px]">
                  {/* Преподаватель (Аватар + ФИО) */}
                  <td className="py-0.5 pl-0.5 pr-1">
                    <Link
                      href={`/teachers/${t.id}`}
                      className="flex items-center gap-1 max-w-[100px] group"
                    >
                      <div
                        className={cn(
                          'h-4 w-4 rounded-full flex items-center justify-center font-bold text-[8.5px] shrink-0',
                          getAvatarBg(t.initials)
                        )}
                      >
                        {t.initials || (t.name ? t.name.slice(0, 2).toUpperCase() : 'ПР')}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-[10.5px] truncate max-w-[100px] group-hover:text-blue-600 transition-colors">
                          {t.name}
                        </p>
                      </div>
                    </Link>
                  </td>

                  {/* Группы */}
                  <td className="py-0.5 px-0.5 text-center font-medium text-slate-700 whitespace-nowrap text-[10px]">
                    {t.groupsCount}
                  </td>

                  {/* Заполнение */}
                  <td className="py-0.5 px-0.5 text-center whitespace-nowrap text-[10px]">
                    <span
                      className={cn(
                        'inline-flex items-center font-medium px-1 py-0 rounded',
                        t.occupancyRate < 70
                          ? 'text-rose-700 bg-rose-50'
                          : t.occupancyRate >= 85
                          ? 'text-emerald-700'
                          : 'text-slate-800'
                      )}
                    >
                      {t.occupancyRate}%
                    </span>
                  </td>

                  {/* Посещаемость */}
                  <td className="py-0.5 px-0.5 text-center whitespace-nowrap text-[10px]">
                    <span
                      className={cn(
                        'inline-flex items-center font-medium px-1 py-0 rounded',
                        t.attendanceRate < 85
                          ? 'text-rose-700 bg-rose-50'
                          : t.attendanceRate >= 92
                          ? 'text-emerald-700'
                          : 'text-slate-700'
                      )}
                    >
                      {t.attendanceRate}%
                    </span>
                  </td>

                  {/* Retention */}
                  <td className="py-0.5 px-0.5 text-center whitespace-nowrap text-[10px]">
                    <span
                      className={cn(
                        'inline-flex items-center font-medium px-1 py-0 rounded',
                        t.retentionRate < 80
                          ? 'text-rose-700 bg-rose-50'
                          : t.retentionRate >= 92
                          ? 'text-emerald-700'
                          : 'text-slate-700'
                      )}
                    >
                      {t.retentionRate}%
                    </span>
                  </td>

                  {/* Конверсия пробных */}
                  <td className="py-0.5 px-0.5 text-center whitespace-nowrap font-medium text-slate-700 text-[10px]">
                    {t.trialConversionRate}%
                  </td>

                  {/* Динамика */}
                  <td className="py-0.5 pr-0.5 pl-0.5 text-right whitespace-nowrap text-[10px] font-bold">
                    <span
                      className={cn(
                        t.dynamicsType === 'positive'
                          ? 'text-emerald-600'
                          : t.dynamicsType === 'negative'
                          ? 'text-rose-600'
                          : 'text-slate-500'
                      )}
                    >
                      {t.dynamicsType === 'positive' && '↑ '}
                      {t.dynamicsType === 'negative' && '↓ '}
                      {t.dynamicsText || (t.hasAnomaly ? '-12%' : '+6%')}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
