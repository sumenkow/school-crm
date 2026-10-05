'use client';

import React from 'react';
import { Calendar, Layers, Users, RotateCcw } from 'lucide-react';
import { FullGroupData } from '@/lib/data/mockData';

export interface FinanceFiltersState {
  period: string; // 'all' | '2026-10' | '2026-09' etc.
  course: string; // 'all' | courseName
  groupId: string; // 'all' | groupId
}

interface FinanceGlobalFiltersProps {
  filters: FinanceFiltersState;
  groups: FullGroupData[];
  onChange: (filters: FinanceFiltersState) => void;
  onReset: () => void;
}

export function FinanceGlobalFilters({
  filters,
  groups,
  onChange,
  onReset,
}: FinanceGlobalFiltersProps) {
  const uniqueCourses = React.useMemo(() => {
    const set = new Set<string>();
    groups.forEach((g) => {
      if (g.courseName) set.add(g.courseName);
    });
    return Array.from(set);
  }, [groups]);

  const activeGroups = React.useMemo(() => {
    return groups.filter((g) => !g.is_deleted && !g.isDeleted && g.status !== 'archived');
  }, [groups]);

  const hasActiveFilters =
    filters.period !== 'all' || filters.course !== 'all' || filters.groupId !== 'all';

  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      {/* Period Dropdown */}
      <div className="relative inline-flex items-center">
        <div className="absolute left-3 text-slate-400 pointer-events-none">
          <Calendar className="h-3.5 w-3.5" />
        </div>
        <select
          value={filters.period}
          onChange={(e) => onChange({ ...filters, period: e.target.value })}
          className="appearance-none rounded-xl border border-slate-200 bg-white pl-8 pr-8 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        >
          <option value="all">Все периоды</option>
          <option value="2026-10">Октябрь 2026</option>
          <option value="2026-09">Сентябрь 2026</option>
          <option value="2026-08">Август 2026</option>
        </select>
      </div>

      {/* Course/Direction Dropdown */}
      <div className="relative inline-flex items-center">
        <div className="absolute left-3 text-slate-400 pointer-events-none">
          <Layers className="h-3.5 w-3.5" />
        </div>
        <select
          value={filters.course}
          onChange={(e) => onChange({ ...filters, course: e.target.value })}
          className="appearance-none rounded-xl border border-slate-200 bg-white pl-8 pr-8 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        >
          <option value="all">Все направления</option>
          {uniqueCourses.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Group Dropdown */}
      <div className="relative inline-flex items-center">
        <div className="absolute left-3 text-slate-400 pointer-events-none">
          <Users className="h-3.5 w-3.5" />
        </div>
        <select
          value={filters.groupId}
          onChange={(e) => onChange({ ...filters, groupId: e.target.value })}
          className="appearance-none rounded-xl border border-slate-200 bg-white pl-8 pr-8 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        >
          <option value="all">Все группы</option>
          {activeGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      {/* Reset button if filtered */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1.5 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Сбросить</span>
        </button>
      )}
    </div>
  );
}
