'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  Filter,
  RefreshCw,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';

export type AuditTabType =
  | 'all'
  | 'changes'
  | 'finance'
  | 'security'
  | 'calendar'
  | 'students'
  | 'telegram'
  | 'errors';

interface AuditFilterControlsProps {
  currentTab: AuditTabType;
  onTabChange: (tab: AuditTabType) => void;
  searchQuery: string;
  onSearchChange: (search: string) => void;
  resultFilter: string;
  onResultChange: (res: string) => void;
  sourceFilter: string;
  onSourceChange: (source: string) => void;
  roleFilter: string;
  onRoleChange: (role: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const TABS: { id: AuditTabType; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'changes', label: 'Изменения' },
  { id: 'finance', label: 'Финансы' },
  { id: 'security', label: 'Безопасность' },
  { id: 'calendar', label: 'Календарь' },
  { id: 'students', label: 'Ученики' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'errors', label: 'Ошибки' },
];

export function AuditFilterControls({
  currentTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  resultFilter,
  onResultChange,
  sourceFilter,
  onSourceChange,
  roleFilter,
  onRoleChange,
  onRefresh,
  isLoading,
}: AuditFilterControlsProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Sync local search when parent prop changes (e.g. on reset or URL sync)
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Debounce search by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== searchQuery) {
        onSearchChange(localSearch);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [localSearch, searchQuery, onSearchChange]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    resultFilter !== '' ||
    sourceFilter !== '' ||
    roleFilter !== '' ||
    currentTab !== 'all';

  const resetFilters = () => {
    setLocalSearch('');
    onSearchChange('');
    onResultChange('');
    onSourceChange('');
    onRoleChange('');
    onTabChange('all');
  };

  return (
    <div className="space-y-4">
      {/* 8 QUICK TABS */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1 overflow-x-auto gap-2">
        <div className="flex items-center gap-1.5 min-w-max">
          {TABS.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium shrink-0"
          title="Обновить данные"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          <span className="hidden sm:inline">Обновить</span>
        </button>
      </div>

      {/* SEARCH AND ADVANCED SELECTORS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* LIVE SEARCH BAR */}
        <div className="relative md:col-span-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Поиск по автору, объекту, описанию или Request ID..."
            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-2xs"
          />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch('');
                onSearchChange('');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* RESULT DROPDOWN */}
        <div className="md:col-span-2">
          <select
            value={resultFilter}
            onChange={(e) => onResultChange(e.target.value)}
            className="w-full py-2 px-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          >
            <option value="">Все результаты</option>
            <option value="SUCCESS">Только успешно</option>
            <option value="FAILURE">Только ошибки</option>
          </select>
        </div>

        {/* SOURCE DROPDOWN */}
        <div className="md:col-span-2">
          <select
            value={sourceFilter}
            onChange={(e) => onSourceChange(e.target.value)}
            className="w-full py-2 px-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          >
            <option value="">Все источники</option>
            <option value="WEB">WEB</option>
            <option value="API">API</option>
            <option value="TELEGRAM">TELEGRAM</option>
            <option value="TELEGRAM_MINI_APP">MINI APP</option>
            <option value="SYSTEM">SYSTEM</option>
            <option value="CRON">CRON</option>
          </select>
        </div>

        {/* ROLE DROPDOWN */}
        <div className="md:col-span-2">
          <select
            value={roleFilter}
            onChange={(e) => onRoleChange(e.target.value)}
            className="w-full py-2 px-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          >
            <option value="">Все роли</option>
            <option value="owner">Владелец (owner)</option>
            <option value="admin">Администратор (admin)</option>
            <option value="developer">Разработчик (dev)</option>
            <option value="teacher">Преподаватель (teacher)</option>
          </select>
        </div>

        {/* RESET BUTTON */}
        <div className="md:col-span-1 flex justify-end">
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-xs flex items-center gap-1"
              title="Сбросить все фильтры"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
