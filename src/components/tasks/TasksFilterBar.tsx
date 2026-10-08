'use client';

import React from 'react';
import { Search, List as ListIcon, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DirectionalTab, TaskSortMode } from '@/features/tasks/lib/tasksWorkspaceEngine';

export interface TasksFilterBarProps {
  activeTab: DirectionalTab;
  tabCounts: {
    all: number;
    assigned_to_me: number;
    created_by_me: number;
  };
  onTabChange: (tab: DirectionalTab) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  priorityFilter: 'all' | 'high' | 'medium' | 'low';
  onPriorityChange: (priority: 'all' | 'high' | 'medium' | 'low') => void;
  dueDateFilter: 'all' | 'today' | 'overdue' | 'week';
  onDueDateChange: (dueDate: 'all' | 'today' | 'overdue' | 'week') => void;
  sortMode: TaskSortMode;
  onSortChange: (sortMode: TaskSortMode) => void;
  viewMode: 'list' | 'calendar';
  onViewModeChange: (viewMode: 'list' | 'calendar') => void;
}

export function TasksFilterBar({
  activeTab,
  tabCounts,
  onTabChange,
  searchQuery,
  onSearchChange,
  priorityFilter,
  onPriorityChange,
  dueDateFilter,
  onDueDateChange,
  sortMode,
  onSortChange,
  viewMode,
  onViewModeChange,
}: TasksFilterBarProps) {
  const tabs = [
    { key: 'all' as DirectionalTab, label: 'Все задачи', count: tabCounts.all },
    { key: 'assigned_to_me' as DirectionalTab, label: 'Мне поручено', count: tabCounts.assigned_to_me },
    { key: 'created_by_me' as DirectionalTab, label: 'Я поручил', count: tabCounts.created_by_me },
  ];

  return (
    <div className="flex items-center justify-between gap-3 pb-3 shrink-0">
      {/* 3 Directional Tabs */}
      <div className="flex items-center gap-1.5 shrink-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={cn(
                'shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer',
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 text-[11px] font-bold tabular-nums',
                  isActive ? 'bg-blue-500 text-white' : 'text-slate-400'
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right Controls: Single-line consolidated bar */}
      <div className="flex items-center gap-2.5 flex-1 max-w-2xl justify-end">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск по задачам..."
            className="h-8.5 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:border-blue-400 transition-colors"
          />
        </div>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => onPriorityChange(e.target.value as 'all' | 'high' | 'medium' | 'low')}
          className="h-8.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-2xs focus:outline-none focus:border-blue-400 cursor-pointer"
        >
          <option value="all">Приоритет: Все</option>
          <option value="high">Высокий</option>
          <option value="medium">Средний</option>
          <option value="low">Низкий</option>
        </select>

        {/* Due Date Filter */}
        <select
          value={dueDateFilter}
          onChange={(e) => onDueDateChange(e.target.value as 'all' | 'today' | 'overdue' | 'week')}
          className="h-8.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-2xs focus:outline-none focus:border-blue-400 cursor-pointer"
        >
          <option value="all">Срок: Все</option>
          <option value="today">Сегодня</option>
          <option value="overdue">Просрочено</option>
          <option value="week">На этой неделе</option>
        </select>

        {/* Sort */}
        <select
          value={sortMode}
          onChange={(e) => onSortChange(e.target.value as TaskSortMode)}
          className="h-8.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:border-blue-400 cursor-pointer"
        >
          <option value="priority">⇅ Сначала важные</option>
          <option value="date_asc">По сроку ↑</option>
          <option value="created_desc">По дате создания</option>
        </select>

        {/* View Mode Toggle */}
        <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            className={cn(
              'rounded-lg p-1.5 transition-colors cursor-pointer',
              viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-600'
            )}
            title="Список"
          >
            <ListIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('calendar')}
            className={cn(
              'rounded-lg p-1.5 transition-colors cursor-pointer',
              viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-600'
            )}
            title="Календарь"
          >
            <Calendar className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
