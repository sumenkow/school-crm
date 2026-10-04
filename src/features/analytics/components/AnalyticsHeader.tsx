'use client';

import React from 'react';
import { Calendar, ChevronDown, Download } from 'lucide-react';
import { AnalyticsFilters } from '../types';
import { PERIOD_OPTIONS, COMPARE_PERIOD_OPTIONS } from '../hooks/useAnalyticsFilters';

export interface AnalyticsHeaderProps {
  subtitle?: string;
  filters: AnalyticsFilters;
  onFilterChange: <K extends keyof AnalyticsFilters>(key: K, value: AnalyticsFilters[K]) => void;
  courses: Array<{ id: string; name: string }>;
  groups: Array<{ id: string; name: string }>;
  teachers: Array<{ id: string; name: string }>;
  onExport: () => void;
}

export function AnalyticsHeader({
  subtitle,
  filters,
  onFilterChange,
  courses,
  groups,
  teachers,
  onExport,
}: AnalyticsHeaderProps) {
  return (
    <div className="min-h-9 flex items-center justify-between gap-2 flex-nowrap shrink-0 min-w-0 w-full">
      {/* Page Title & Dynamic Subtitle */}
      <div className="flex flex-col justify-center min-w-0 flex-1 pr-2">
        <h1 className="text-base lg:text-lg font-bold tracking-tight text-slate-900 leading-tight shrink-0">
          Аналитика школы
        </h1>
        {subtitle && (
          <p className="text-[10.5px] lg:text-[11px] text-slate-500 font-normal truncate leading-tight mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {/* Global Filter Bar */}
      <div className="h-8 flex items-center gap-1 text-[11px] flex-nowrap shrink-0">
        {/* 1. Current Period Selector */}
        <div className="relative flex items-center shrink-0">
          <div className="pointer-events-none absolute left-2 text-slate-400">
            <Calendar className="h-3.5 w-3.5" />
          </div>
          <select
            value={filters.period}
            onChange={(e) => onFilterChange('period', e.target.value)}
            className="h-8 pl-6 pr-5 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 shadow-2xs hover:border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none transition-colors w-[120px] xl:w-[135px]"
            title="Выбор текущего периода"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 h-3 w-3 text-slate-400" />
        </div>

        {/* 2. Compare Period Selector */}
        <div className="relative flex items-center shrink-0">
          <select
            value={filters.comparePeriod}
            onChange={(e) => onFilterChange('comparePeriod', e.target.value)}
            className="h-8 pl-2 pr-5 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 shadow-2xs hover:border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none transition-colors w-[125px] xl:w-[140px]"
            title="Сравнение периодов"
          >
            <option value="none">Без сравнения</option>
            {COMPARE_PERIOD_OPTIONS.filter((o) => o.value !== 'none').map((opt) => (
              <option key={opt.value} value={opt.value}>
                Сравнить с: {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 h-3 w-3 text-slate-400" />
        </div>

        {/* 3. Subject / Course Selector */}
        <div className="relative flex items-center shrink-0">
          <select
            value={filters.subjectId}
            onChange={(e) => onFilterChange('subjectId', e.target.value)}
            className="h-8 pl-2 pr-5 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 shadow-2xs hover:border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none w-[105px] xl:w-[120px] truncate transition-colors"
            title="Фильтр по направлениям"
          >
            <option value="all">Все направления</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 h-3 w-3 text-slate-400" />
        </div>

        {/* 4. Group Selector */}
        <div className="relative flex items-center shrink-0">
          <select
            value={filters.groupId}
            onChange={(e) => onFilterChange('groupId', e.target.value)}
            className="h-8 pl-2 pr-5 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 shadow-2xs hover:border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none w-[85px] xl:w-[95px] truncate transition-colors"
            title="Фильтр по группам"
          >
            <option value="all">Все группы</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 h-3 w-3 text-slate-400" />
        </div>

        {/* 5. Teacher Selector */}
        <div className="relative flex items-center shrink-0">
          <select
            value={filters.teacherId}
            onChange={(e) => onFilterChange('teacherId', e.target.value)}
            className="h-8 pl-2 pr-5 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 shadow-2xs hover:border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none w-[110px] xl:w-[125px] truncate transition-colors"
            title="Фильтр по преподавателям"
          >
            <option value="all">Все преподаватели</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 h-3 w-3 text-slate-400" />
        </div>

        {/* 6. Export Report Button */}
        <button
          type="button"
          onClick={onExport}
          className="h-8 inline-flex items-center gap-1 shrink-0 rounded-lg border border-slate-200 bg-white px-2 xl:px-2.5 text-[11px] font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
          title="Выгрузить сводный отчет в CSV"
        >
          <Download className="h-3 w-3 text-slate-500 shrink-0" />
          <span>Экспорт отчёта</span>
        </button>
      </div>
    </div>
  );
}
