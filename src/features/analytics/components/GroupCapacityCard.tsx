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
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200/80 whitespace-nowrap">
            <span>🔴</span>
            <span>Недозаполнена</span>
          </span>
        );
      case 'almost_full':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 whitespace-nowrap">
            <span>🟡</span>
            <span>Почти заполнена</span>
          </span>
        );
      case 'full':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 whitespace-nowrap">
            <span>🟢</span>
            <span>Заполнена</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl p-3.5 lg:p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-3">
      {/* 1. Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
              <Users className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="text-sm lg:text-base font-bold text-slate-900">
                Загрузка групп
              </h3>
              <p className="text-[11.5px] text-slate-400">
                Группы с низкой загрузкой и потенциалом роста
              </p>
            </div>
          </div>

          {/* Right: Selector */}
          <div className="relative">
            <select
              value={subjectFilter}
              onChange={(e) => onSubjectFilterChange(e.target.value)}
              aria-label="Фильтр по направлениям"
              className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl pl-2.5 pr-6 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
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

        {/* 2. Compact Table: Группа | Заполнение | Потенциал | Статус */}
        <div className="mt-2.5 overflow-x-auto no-scrollbar">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-1.5 pl-1 pr-2">Группа</th>
                <th className="py-1.5 px-1.5 text-center">Заполнение</th>
                <th className="py-1.5 px-1.5 text-right">Потенциал</th>
                <th className="py-1.5 pr-1 pl-1 text-right">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-xs text-slate-400">
                    Нет групп по выбранному фильтру
                  </td>
                </tr>
              ) : (
                groups.slice(0, 5).map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Группа */}
                    <td className="py-1.5 pl-1 pr-2">
                      <Link
                        href={`/groups/${g.id}`}
                        className="group block min-w-[120px]"
                      >
                        <p className="font-semibold text-slate-900 text-xs group-hover:text-blue-600 transition-colors truncate">
                          {g.name}
                        </p>
                      </Link>
                    </td>

                    {/* Заполнение */}
                    <td className="py-1.5 px-1.5 text-center whitespace-nowrap text-xs font-semibold text-slate-800">
                      {g.enrolled} / {g.capacity}
                    </td>

                    {/* Потенциал */}
                    <td className="py-1.5 px-1.5 text-right whitespace-nowrap font-mono text-xs">
                      {g.potentialEur > 0 ? (
                        <span className="font-bold text-emerald-600">
                          +{g.potentialEur.toLocaleString('ru-RU')} €
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">0 €</span>
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

      {/* 3. Bottom Summary / Link */}
      <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5 flex items-center justify-between gap-2 text-xs text-slate-700">
        <p className="leading-snug flex items-center gap-1.5 min-w-0 pr-2 truncate">
          <span className="font-medium">Потенциал добора: </span>
          <strong className="text-emerald-700 font-bold">
            +{totalPotentialEur.toLocaleString('ru-RU')} €
          </strong>
        </p>
        <button
          type="button"
          onClick={() => onNavigateTab ? onNavigateTab('groups') : undefined}
          className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 hover:underline shrink-0 whitespace-nowrap cursor-pointer text-xs"
        >
          <span>Перейти к группам</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
