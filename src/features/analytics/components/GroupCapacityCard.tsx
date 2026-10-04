'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Users, ChevronDown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GroupCapacityItem } from '../hooks/useDiagnosticsTeachersAndGroups';

export interface GroupCapacityCardProps {
  groups: GroupCapacityItem[];
  allCount: number;
  subjectFilter: string;
  onSubjectFilterChange: (val: string) => void;
  onNavigateTab?: (tab: any) => void;
}

export function GroupCapacityCard({
  groups,
  allCount,
  subjectFilter,
  onSubjectFilterChange,
  onNavigateTab,
}: GroupCapacityCardProps) {
  // Compute distinct subjects for dropdown
  const subjectOptions = useMemo(() => {
    const set = new Set<string>();
    groups.forEach((g) => {
      if (g.courseName) set.add(g.courseName);
    });
    return Array.from(set);
  }, [groups]);

  // Compute total upside potential
  const totalPotentialEur = useMemo(() => {
    return groups.reduce((acc, g) => acc + g.potentialEur, 0);
  }, [groups]);

  const getStatusBadge = (status: GroupCapacityItem['status']) => {
    switch (status) {
      case 'underfilled':
        return (
          <span className="inline-flex items-center px-1 py-0 rounded text-[8.5px] font-semibold text-rose-700 bg-rose-50 border border-rose-200/80 whitespace-nowrap">
            Недозаполнена
          </span>
        );
      case 'almost_full':
        return (
          <span className="inline-flex items-center px-1 py-0 rounded text-[8.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 whitespace-nowrap">
            Почти
          </span>
        );
      case 'full':
      default:
        return (
          <span className="inline-flex items-center px-1 py-0 rounded text-[8.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 whitespace-nowrap">
            Заполнена
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between h-full min-h-0 min-w-0 overflow-hidden">
      {/* 1. Header */}
      <div className="h-[20px] flex items-center justify-between pb-1 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex h-4.5 w-4.5 items-center justify-center rounded bg-emerald-50 text-emerald-600 shrink-0">
            <Users className="h-3 w-3" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 leading-none truncate">
            Загрузка групп
          </h3>
          <span className="text-slate-400 text-[10px] cursor-help leading-none" title="Загрузка групп и потенциал">ⓘ</span>
        </div>

        {/* Right: Selector */}
        <div className="relative shrink-0">
          <select
            value={subjectFilter}
            onChange={(e) => onSubjectFilterChange(e.target.value)}
            aria-label="Фильтр по направлениям"
            className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-[10px] rounded-md pl-1.5 pr-4 py-0 h-5 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="all">Все направления</option>
            {subjectOptions.map((subj) => (
              <option key={subj} value={subj}>
                {subj}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
        </div>
      </div>

      {/* 2. Compact Table: Группа | Направление | Заполнено | Потенциал выручки | Статус */}
      <div className="mt-1 overflow-x-auto no-scrollbar flex-1 min-h-0">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-0.5 px-0.5">Группа</th>
              <th className="py-0.5 px-0.5">Направление</th>
              <th className="py-0.5 px-0.5 text-center">Заполнено</th>
              <th className="py-0.5 px-0.5 text-right">Потенциал</th>
              <th className="py-0.5 px-0.5 text-right">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {groups.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-[10px] text-slate-400">
                  Нет групп по выбранному фильтру
                </td>
              </tr>
            ) : (
              groups.slice(0, 5).map((g) => (
                <tr key={g.id} className="hover:bg-slate-50/70 transition-colors py-0.5 text-[10px]">
                  {/* Группа */}
                  <td className="py-0.5 pl-0.5 pr-1">
                    <Link
                      href={`/groups/${g.id}`}
                      className="group block max-w-[110px]"
                    >
                      <p className="font-semibold text-slate-900 text-[10.5px] group-hover:text-blue-600 transition-colors truncate max-w-[110px]">
                        {g.name}
                      </p>
                    </Link>
                  </td>

                  {/* Направление */}
                  <td className="py-0.5 px-0.5 text-slate-500 text-[10px] truncate max-w-[85px]">
                    {g.courseName || 'Общее'}
                  </td>

                  {/* Заполнено */}
                  <td className="py-0.5 px-0.5 text-center whitespace-nowrap text-[10px] font-medium text-slate-800">
                    {g.enrolled} / {g.capacity}
                  </td>

                  {/* Потенциал выручки */}
                  <td className="py-0.5 px-0.5 text-right whitespace-nowrap font-mono text-[10px]">
                    {g.potentialRub > 0 || g.potentialEur > 0 ? (
                      <span className="font-bold text-emerald-600">
                        +{(g.potentialRub || g.potentialEur * 100).toLocaleString('ru-RU')} ₽
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium">0 ₽</span>
                    )}
                  </td>

                  {/* Статус */}
                  <td className="py-0.5 pr-0.5 pl-0.5 text-right whitespace-nowrap">
                    {getStatusBadge(g.status)}
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
