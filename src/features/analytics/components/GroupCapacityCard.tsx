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
}

export function GroupCapacityCard({
  groups,
  allCount,
  subjectFilter,
  onSubjectFilterChange,
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

  const totalPotentialRub = useMemo(() => {
    return groups.reduce((acc, g) => acc + g.potentialRub, 0);
  }, [groups]);

  const getStatusBadge = (status: GroupCapacityItem['status'], label: string) => {
    switch (status) {
      case 'underfilled':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap">
            {label}
          </span>
        );
      case 'almost_full':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 whitespace-nowrap">
            {label}
          </span>
        );
      case 'full':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">
            {label}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-4">
      {/* 1. Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Загрузка групп
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
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
              className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl pl-3 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Все направления</option>
              {subjectOptions.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        {/* 2. Compact Table */}
        <div className="mt-3.5 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2 pl-1 pr-1.5">Группа</th>
                <th className="py-2 px-1">Направление</th>
                <th className="py-2 px-1 text-center">Заполнено</th>
                <th className="py-2 px-1 text-right">Потенциал</th>
                <th className="py-2 pr-1 pl-1 text-right">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                    Нет групп по выбранному фильтру
                  </td>
                </tr>
              ) : (
                groups.slice(0, 6).map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Группа */}
                    <td className="py-2 pl-1 pr-1.5">
                      <Link
                        href={`/groups?groupId=${g.id}`}
                        className="group block min-w-[110px]"
                      >
                        <p className="font-semibold text-slate-900 text-[11.5px] group-hover:text-blue-600 transition-colors truncate">
                          {g.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {g.teacherName}
                        </p>
                      </Link>
                    </td>

                    {/* Направление */}
                    <td className="py-2 px-1 text-slate-600 whitespace-nowrap text-[11px]">
                      {g.courseName}
                    </td>

                    {/* Заполнено */}
                    <td className="py-2 px-1 text-center whitespace-nowrap">
                      <div className="inline-flex flex-col items-center">
                        <span className="font-semibold text-slate-800 text-[10.5px]">
                          {g.enrolled} / {g.capacity}
                        </span>
                        <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden mt-0.5">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              g.occupancyPercent >= 85
                                ? 'bg-emerald-500'
                                : g.occupancyPercent >= 50
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            )}
                            style={{ width: `${Math.min(100, g.occupancyPercent)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Потенциал выручки */}
                    <td className="py-2 px-1 text-right whitespace-nowrap font-mono text-[11px]">
                      {g.potentialEur > 0 ? (
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-emerald-600">
                            +{g.potentialEur.toLocaleString('ru-RU')} €
                          </span>
                          <span className="text-[9.5px] text-emerald-500 font-medium">
                            +{g.potentialRub.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium">—</span>
                      )}
                    </td>

                    {/* Статус */}
                    <td className="py-2 pr-1 pl-1 text-right whitespace-nowrap">
                      {getStatusBadge(g.status, g.statusLabel)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Bottom Summary / Link */}
      <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-700 mt-2">
        <p className="leading-snug flex items-center gap-1.5 min-w-0 pr-2">
          <span className="shrink-0 text-emerald-600 font-bold">●</span>
          <span>
            Потенциал добора по группам:{' '}
            <strong className="text-emerald-700 font-bold">
              +{totalPotentialEur.toLocaleString('ru-RU')} € / +{totalPotentialRub.toLocaleString('ru-RU')} ₽
            </strong>
          </span>
        </p>
        <Link
          href="/groups"
          className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 hover:underline shrink-0 whitespace-nowrap"
        >
          <span>Перейти к группам</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
