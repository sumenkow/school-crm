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
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200/80 whitespace-nowrap">
            Недозаполнена
          </span>
        );
      case 'almost_full':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 whitespace-nowrap">
            Почти заполнена
          </span>
        );
      case 'full':
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 whitespace-nowrap">
            Заполнена
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl p-3.5 lg:p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between h-full">
      {/* 1. Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-2xs">
              <Users className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h3 className="text-sm lg:text-base font-bold text-slate-900">
                  Загрузка групп
                </h3>
                <span className="text-slate-400 text-xs cursor-help" title="Загрузка групп и потенциал">ⓘ</span>
              </div>
              <p className="text-[11.5px] text-slate-400">
                Группы с низкой и высокой загрузкой
              </p>
            </div>
          </div>

          {/* Right: Selector */}
          <div className="relative">
            <select
              value={subjectFilter}
              onChange={(e) => onSubjectFilterChange(e.target.value)}
              aria-label="Фильтр по направлениям"
              className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl pl-2.5 pr-6 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">Все направления</option>
              {subjectOptions.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        {/* 2. Compact Table: Группа | Направление | Заполнено | Потенциал выручки | Статус */}
        <div className="mt-2.5 overflow-x-auto no-scrollbar">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-1.5 pl-1 pr-1.5">Группа</th>
                <th className="py-1.5 px-1">Направление</th>
                <th className="py-1.5 px-1 text-center">Заполнено</th>
                <th className="py-1.5 px-1 text-right">Потенциал выручки</th>
                <th className="py-1.5 pr-1 pl-1 text-right">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-slate-400">
                    Нет групп по выбранному фильтру
                  </td>
                </tr>
              ) : (
                groups.slice(0, 5).map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Группа */}
                    <td className="py-1.5 pl-1 pr-1.5">
                      <Link
                        href={`/groups/${g.id}`}
                        className="group block max-w-[125px]"
                      >
                        <p className="font-semibold text-slate-900 text-xs group-hover:text-blue-600 transition-colors truncate">
                          {g.name}
                        </p>
                      </Link>
                    </td>

                    {/* Направление */}
                    <td className="py-1.5 px-1 text-slate-500 text-xs truncate max-w-[90px]">
                      {g.courseName || 'Общее'}
                    </td>

                    {/* Заполнено */}
                    <td className="py-1.5 px-1 text-center whitespace-nowrap text-xs font-medium text-slate-800">
                      {g.enrolled} / {g.capacity}
                    </td>

                    {/* Потенциал выручки */}
                    <td className="py-1.5 px-1 text-right whitespace-nowrap font-mono text-xs">
                      {g.potentialRub > 0 || g.potentialEur > 0 ? (
                        <span className="font-bold text-emerald-600">
                          +{(g.potentialRub || g.potentialEur * 100).toLocaleString('ru-RU')} ₽
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">0 ₽</span>
                      )}
                    </td>

                    {/* Статус */}
                    <td className="py-1.5 pr-1 pl-1 text-right whitespace-nowrap">
                      {getStatusBadge(g.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
