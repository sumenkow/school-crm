'use client';

import React from 'react';
import { Search, Plus, LayoutGrid, Table, ArrowUpDown, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GroupSortOption } from '@/features/groups/lib/groupsWorkspaceEngine';

export interface GroupFilterBarProps {
  activeCount: number;
  deletedCount: number;
  currentTab: 'all' | 'deleted';
  onTabChange: (tab: 'all' | 'deleted') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  courses: string[];
  selectedCourse: string;
  onCourseChange: (c: string) => void;
  statuses: Array<{ id: string; label: string }>;
  selectedStatus: string;
  onStatusChange: (s: string) => void;
  teachers: string[];
  selectedTeacher: string;
  onTeacherChange: (t: string) => void;
  sortBy: GroupSortOption;
  onSortChange: (s: GroupSortOption) => void;
  viewMode: 'cards' | 'table';
  onViewModeChange: (m: 'cards' | 'table') => void;
  onCreateGroup: () => void;
}

export function GroupFilterBar({
  activeCount,
  deletedCount,
  currentTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  courses,
  selectedCourse,
  onCourseChange,
  statuses,
  selectedStatus,
  onStatusChange,
  teachers,
  selectedTeacher,
  onTeacherChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  onCreateGroup,
}: GroupFilterBarProps) {
  return (
    <div className="space-y-4 w-full min-w-0">
      {/* Header & Main Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Группы школы</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Управление группами, расписанием и расчет свободных мест • Всего активных:{' '}
            <strong className="text-slate-900 font-semibold">{activeCount}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tab Pill Switcher */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => onTabChange('all')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                currentTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Все группы ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => onTabChange('deleted')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                currentTab === 'deleted'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Удаленные ({deletedCount})
            </button>
          </div>

          {/* Primary Action: Create Group */}
          <button
            type="button"
            onClick={onCreateGroup}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:bg-blue-800 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Создать группу</span>
          </button>
        </div>
      </div>

      {/* Single-Row Controls & Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xs flex flex-wrap items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск по названию группы, курсу, преподавателю..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8.5 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>

        {/* Course Filter */}
        <div className="shrink-0">
          <select
            value={selectedCourse}
            onChange={(e) => onCourseChange(e.target.value)}
            className="h-8 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100/70 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
          >
            <option value="all">Все курсы ↕</option>
            {courses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="shrink-0">
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="h-8 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100/70 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
          >
            <option value="all">Все статусы ↕</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Teacher Filter */}
        <div className="shrink-0">
          <select
            value={selectedTeacher}
            onChange={(e) => onTeacherChange(e.target.value)}
            className="h-8 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100/70 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
          >
            <option value="all">Все преподаватели ↕</option>
            {teachers.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Selector */}
        <div className="shrink-0">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as GroupSortOption)}
            className="h-8 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100/70 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
          >
            <option value="schedule">Сортировка: По расписанию ↕</option>
            <option value="name">Сортировка: По названию ↕</option>
            <option value="occupancy">Сортировка: По наполняемости ↕</option>
          </select>
        </div>

        {/* View Mode Switcher: Card View vs Table View */}
        <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 shrink-0 ml-auto">
          <button
            type="button"
            onClick={() => onViewModeChange('cards')}
            title="Отображение карточками (3x2)"
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer',
              viewMode === 'cards'
                ? 'bg-white text-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Карточки</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('table')}
            title="Отображение плотной таблицей"
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer',
              viewMode === 'table'
                ? 'bg-white text-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Table className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Таблица</span>
          </button>
        </div>
      </div>
    </div>
  );
}
