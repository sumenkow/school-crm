'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  UserMinus,
  Sliders,
  BarChart3,
  Search,
  Download,
  X,
  ExternalLink,
  ChevronDown,
  GraduationCap,
  ClipboardCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalyticsFilters, TeachersTabData } from '../types';
import { useTeachersTabData } from '../hooks/useTeachersTabData';

interface TeachersAnalyticsSectionProps {
  filters: AnalyticsFilters;
  courses?: Array<{ id: string; name: string }>;
}

export function TeachersAnalyticsSection({ filters }: TeachersAnalyticsSectionProps) {
  const data: TeachersTabData = useTeachersTabData(filters);
  const {
    kpis,
    workloadList,
    distribution,
    dynamics,
    stability,
    staffChanges,
    attendanceList,
    attentionTeachers,
    teacherGroupRelations,
  } = data;

  // Local UI States
  const [workloadMode, setWorkloadMode] = useState<'lessons' | 'hours' | 'groups'>('lessons');
  const [dynamicsMode, setDynamicsMode] = useState<'lessons' | 'teachers' | 'avg'>('lessons');
  const [relationSort, setRelationSort] = useState<'groups' | 'students' | 'lessons'>('groups');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [modalSubjectFilter, setModalSubjectFilter] = useState('all');

  // KPI icon rendering
  const renderKpiIcon = (type: string) => {
    switch (type) {
      case 'active_teachers':
        return <Users className="h-4 w-4 text-emerald-600" />;
      case 'conducted_lessons':
        return <Calendar className="h-4 w-4 text-blue-600" />;
      case 'avg_workload':
        return <BarChart3 className="h-4 w-4 text-purple-600" />;
      case 'schedule_completion':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case 'deviations':
        return <AlertTriangle className="h-4 w-4 text-rose-600" />;
      default:
        return <Users className="h-4 w-4 text-slate-600" />;
    }
  };

  const getKpiBg = (type: string) => {
    switch (type) {
      case 'active_teachers':
      case 'schedule_completion':
        return 'bg-emerald-50';
      case 'conducted_lessons':
        return 'bg-blue-50';
      case 'avg_workload':
        return 'bg-purple-50';
      case 'deviations':
        return 'bg-rose-50';
      default:
        return 'bg-slate-50';
    }
  };

  // Avatar gradient helper
  const getAvatarGradient = (idx: number) => {
    const gradients = [
      'from-blue-500 to-indigo-600',
      'from-indigo-500 to-purple-600',
      'from-teal-500 to-emerald-600',
      'from-amber-500 to-orange-600',
      'from-purple-500 to-pink-600',
      'from-sky-500 to-blue-600',
    ];
    return gradients[idx % gradients.length];
  };

  // Donut chart calculations for Workload Distribution
  const donutRadius = 32;
  const circumference = 2 * Math.PI * donutRadius; // ≈ 201.06
  let accumulatedDistOffset = 0;
  const distributionSegments = distribution.items.map((item) => {
    const strokeDasharray = `${(item.sharePercent / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedDistOffset;
    accumulatedDistOffset += (item.sharePercent / 100) * circumference;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  // Donut chart calculations for Stability
  let accumulatedStabOffset = 0;
  const stabilitySegments = stability.items.map((item) => {
    const strokeDasharray = `${(item.sharePercent / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedStabOffset;
    accumulatedStabOffset += (item.sharePercent / 100) * circumference;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  // Sorted Teacher-Group relations
  const sortedTeacherGroupRelations = useMemo(() => {
    return [...teacherGroupRelations].sort((a, b) => {
      if (relationSort === 'students') return b.studentsCount - a.studentsCount;
      if (relationSort === 'lessons') return b.lessonsCount - a.lessonsCount;
      return b.groupsCount - a.groupsCount;
    });
  }, [teacherGroupRelations, relationSort]);

  // Modal filtered teachers
  const modalFilteredTeachers = useMemo(() => {
    return workloadList.filter((t) => {
      if (modalSearchTerm.trim()) {
        const q = modalSearchTerm.toLowerCase();
        if (!t.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [workloadList, modalSearchTerm]);

  // CSV Export for modal
  const handleExportCSV = () => {
    const headers = ['Преподаватель', 'Занятий', 'Часов', 'Групп', 'Учеников'];
    const rows = modalFilteredTeachers.map((t) => [
      `"${t.name}"`,
      t.lessonsCount,
      t.hoursCount,
      t.groupsCount,
      t.studentsCount,
    ]);
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `teachers_workload_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-3 pb-8">
      {/* ==================================================================== */}
      {/* 1. TOP KPI ROW: 5 CARDS (h-[82px] on Desktop)                         */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {kpis.map((kpi) => (
          <div
            key={kpi.id}
            className="h-[82px] rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow"
          >
            {/* Top row: icon + title + delta badge */}
            <div className="flex items-start justify-between gap-1">
              <div className="flex items-start gap-1.5 min-w-0">
                <div className={cn('p-1 rounded-md shrink-0 mt-0.5', getKpiBg(kpi.iconType))}>
                  {renderKpiIcon(kpi.iconType)}
                </div>
                <span className="text-[9px] font-bold uppercase tracking-tight text-slate-500 line-clamp-2 leading-[1.15]">
                  {kpi.label}
                </span>
              </div>
              <span
                className={cn(
                  'shrink-0 text-[9.5px] font-bold px-1.5 py-0.5 rounded leading-none flex items-center gap-0.5 mt-0.5',
                  kpi.isPositive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
                )}
              >
                {kpi.change}
              </span>
            </div>

            {/* Bottom row: Value + subtext */}
            <div className="flex items-baseline justify-between gap-1">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-900 tracking-tight font-feature-settings-cv">
                  {kpi.value}
                </span>
              </div>
              <div className="text-right">
                {kpi.unitText && (
                  <div className="text-[9px] text-slate-400 font-medium leading-none">
                    {kpi.unitText}
                  </div>
                )}
                <span className="text-[10px] text-slate-400 font-medium truncate">
                  {kpi.previousValue}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ==================================================================== */}
      {/* 2. TIER 1: 3 EQUAL COLUMNS (h-[275px])                                */}
      {/* Col 1: Нагрузка преподавателей                                       */}
      {/* Col 2: Распределение нагрузки                                        */}
      {/* Col 3: Динамика преподавательской нагрузки                           */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
        {/* CARD 1: НАГРУЗКА ПРЕПОДАВАТЕЛЕЙ */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between min-h-[275px]">
          <div>
            <div className="border-b border-slate-100 pb-2 flex items-start justify-between gap-1">
              <div className="flex items-start gap-2">
                <div className="p-1 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                    Нагрузка преподавателей
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Количество проведённых занятий за период
                  </p>
                </div>
              </div>

              {/* Segmented controls: Занятия | Часы | Группы */}
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => setWorkloadMode('lessons')}
                  className={cn(
                    'px-1.5 py-0.5 rounded transition-all',
                    workloadMode === 'lessons'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Занятия
                </button>
                <button
                  type="button"
                  onClick={() => setWorkloadMode('hours')}
                  className={cn(
                    'px-1.5 py-0.5 rounded transition-all',
                    workloadMode === 'hours'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Часы
                </button>
                <button
                  type="button"
                  onClick={() => setWorkloadMode('groups')}
                  className={cn(
                    'px-1.5 py-0.5 rounded transition-all',
                    workloadMode === 'groups'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Группы
                </button>
              </div>
            </div>

            {/* List of top 5 teachers with progress bars */}
            <div className="mt-2.5 space-y-2.5">
              {workloadList.slice(0, 5).map((t, idx) => {
                const displayVal =
                  workloadMode === 'lessons'
                    ? t.lessonsCount
                    : workloadMode === 'hours'
                    ? t.hoursCount
                    : t.groupsCount;
                const maxVal =
                  workloadMode === 'lessons' ? 32 : workloadMode === 'hours' ? 48 : 4;
                const barWidth = Math.min(100, Math.round((displayVal / maxVal) * 100));

                return (
                  <div key={t.id} className="flex items-center justify-between text-[11px] gap-2">
                    {/* Avatar + Name */}
                    <div className="flex items-center gap-2 w-32 shrink-0 min-w-0">
                      <div
                        className={cn(
                          'h-6 w-6 rounded-full bg-gradient-to-br text-white font-bold text-[9px] flex items-center justify-center shrink-0 shadow-2xs',
                          getAvatarGradient(idx)
                        )}
                      >
                        {t.initials}
                      </div>
                      <Link
                        href="/settings/team?tab=teachers"
                        className="font-semibold text-slate-800 hover:text-blue-600 transition-colors truncate"
                      >
                        {t.name}
                      </Link>
                    </div>

                    {/* Blue horizontal bar */}
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>

                    {/* Numeric value */}
                    <span className="font-bold text-slate-900 text-right w-6 shrink-0 tabular-nums">
                      {displayVal}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer link */}
          <div className="border-t border-slate-100 pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
            >
              Посмотреть всех преподавателей →
            </button>
          </div>
        </div>

        {/* CARD 2: РАСПРЕДЕЛЕНИЕ НАГРУЗКИ */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between min-h-[275px]">
          <div>
            <div className="border-b border-slate-100 pb-2 flex items-start gap-2">
              <div className="p-1 rounded-lg bg-rose-50 text-rose-600 shrink-0">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                  Распределение нагрузки
                </h3>
                <p className="text-[10px] text-slate-400">
                  Преподаватели по количеству занятий
                </p>
              </div>
            </div>

            {/* Donut chart + Legend */}
            <div className="mt-3 flex items-center justify-between gap-2">
              {/* Donut SVG */}
              <div className="relative flex items-center justify-center shrink-0 w-32 h-32">
                <svg className="h-28 w-28 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={donutRadius}
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="11"
                  />
                  {distributionSegments.map((seg) => (
                    <circle
                      key={seg.id}
                      cx="50"
                      cy="50"
                      r={donutRadius}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="11"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      className="transition-all duration-300"
                    />
                  ))}
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-lg font-black text-slate-900 leading-none">
                    {distribution.totalTeachers}
                  </span>
                  <span className="text-[8.5px] font-medium text-slate-400 mt-0.5 leading-tight">
                    преподавателей
                  </span>
                </div>
              </div>

              {/* Legend with thresholds */}
              <div className="flex-1 space-y-2 pl-1">
                {distribution.items.map((item) => (
                  <div key={item.id} className="text-[11px] leading-tight">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-semibold text-slate-800 text-[10.5px]">
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 pl-1 font-bold text-slate-900 text-[11px]">
                        <span>{item.count}</span>
                        <span className="text-slate-400 font-semibold text-[10px]">
                          {item.sharePercent}%
                        </span>
                      </div>
                    </div>
                    <p className="text-[9.5px] text-slate-400 pl-3.5">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-400 font-medium">
            Оптимальный диапазон нагрузки: 15–28 занятий / месяц
          </div>
        </div>

        {/* CARD 3: ДИНАМИКА ПРЕПОДАВАТЕЛЬСКОЙ НАГРУЗКИ */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between min-h-[275px]">
          <div>
            <div className="border-b border-slate-100 pb-2 flex items-start justify-between gap-1">
              <div className="flex items-start gap-2">
                <div className="p-1 rounded-lg bg-sky-50 text-sky-600 shrink-0">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                    Динамика нагрузки
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Помесячная учебная выработка
                  </p>
                </div>
              </div>

              {/* View switcher pills */}
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => setDynamicsMode('lessons')}
                  className={cn(
                    'px-1.5 py-0.5 rounded transition-all',
                    dynamicsMode === 'lessons'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Занятия
                </button>
                <button
                  type="button"
                  onClick={() => setDynamicsMode('teachers')}
                  className={cn(
                    'px-1.5 py-0.5 rounded transition-all',
                    dynamicsMode === 'teachers'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Преподаватели
                </button>
                <button
                  type="button"
                  onClick={() => setDynamicsMode('avg')}
                  className={cn(
                    'px-1.5 py-0.5 rounded transition-all',
                    dynamicsMode === 'avg'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Ср. нагрузка
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 pt-1.5 pb-0.5 text-[9.5px] font-medium text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-xs bg-blue-600" />
                Проведённые занятия
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 border border-white shadow-2xs" />
                Средняя нагрузка
              </span>
            </div>

            {/* Chart SVG */}
            <div className="relative h-[120px] w-full pt-1">
              <svg className="h-full w-full overflow-visible" viewBox="0 0 300 95">
                {/* Horizontal grid lines */}
                <line x1="0" y1="20" x2="300" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="50" x2="300" y2="50" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="80" x2="300" y2="80" stroke="#e2e8f0" strokeWidth="1" />

                {/* Bars for Conducted Lessons */}
                {dynamics.map((p, i) => {
                  const x = 25 + i * 48;
                  const barH = (p.conductedLessons / 500) * 60;
                  const barY = 80 - barH;
                  return (
                    <g key={p.month}>
                      <rect
                        x={x - 10}
                        y={barY}
                        width="20"
                        height={barH}
                        rx="3"
                        className="fill-blue-500 hover:fill-blue-600 transition-colors"
                      />
                      <text
                        x={x}
                        y="92"
                        textAnchor="middle"
                        className="fill-slate-400 text-[9px] font-semibold"
                      >
                        {p.month}
                      </text>
                    </g>
                  );
                })}

                {/* Trend line for Average Workload */}
                {(() => {
                  const points = dynamics.map((p, i) => {
                    const x = 25 + i * 48;
                    const y = 80 - (p.avgWorkload / 30) * 60;
                    return { x, y };
                  });
                  const pathStr = points.reduce((acc, curr, idx) => {
                    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
                  }, '');

                  return (
                    <g>
                      <path
                        d={pathStr}
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      {points.map((pt, idx) => (
                        <circle
                          key={idx}
                          cx={pt.x}
                          cy={pt.y}
                          r="3"
                          fill="#0284c7"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      ))}
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <span>Минимум: 280 ур. (Апр)</span>
            <span>Максимум: 426 ур. (Сен)</span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. TIER 2: 3 EQUAL COLUMNS (h-[275px])                                */}
      {/* Col 1: Стабильность работы                                           */}
      {/* Col 2: Изменение состава преподавателей                              */}
      {/* Col 3: Посещаемость на занятиях преподавателей                       */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
        {/* CARD 1: СТАБИЛЬНОСТЬ РАБОТЫ */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between min-h-[275px]">
          <div>
            <div className="border-b border-slate-100 pb-2 flex items-start gap-2">
              <div className="p-1 rounded-lg bg-rose-50 text-rose-600 shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                  Стабильность работы
                </h3>
                <p className="text-[10px] text-slate-400">
                  Выполнение расписания за период
                </p>
              </div>
            </div>

            {/* Donut chart + Legend */}
            <div className="mt-3 flex items-center justify-between gap-2">
              {/* Donut SVG */}
              <div className="relative flex items-center justify-center shrink-0 w-32 h-32">
                <svg className="h-28 w-28 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={donutRadius}
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="11"
                  />
                  {stabilitySegments.map((seg) => (
                    <circle
                      key={seg.id}
                      cx="50"
                      cy="50"
                      r={donutRadius}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="11"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      className="transition-all duration-300"
                    />
                  ))}
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-base font-black text-slate-900 leading-none">
                    {stability.completionRate}
                  </span>
                  <span className="text-[8px] font-medium text-slate-400 mt-0.5 leading-tight">
                    проведено по плану
                  </span>
                </div>
              </div>

              {/* Legend with breakdown */}
              <div className="flex-1 space-y-2 pl-1">
                {stability.items.map((item) => (
                  <div key={item.id} className="text-[11px] leading-tight">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-semibold text-slate-800 text-[10.5px]">
                          {item.label}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 text-[11px] shrink-0 pl-1">
                        {item.sharePercent.toString().replace('.', ',')}%
                      </span>
                    </div>
                    <p className="text-[9.5px] text-slate-400 pl-3.5">
                      {item.count} занятий
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-400 font-medium">
            Всего запланировано: {stability.totalLessons} занятий
          </div>
        </div>

        {/* CARD 2: ИЗМЕНЕНИЕ СОСТАВА ПРЕПОДАВАТЕЛЕЙ */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between min-h-[275px]">
          <div>
            <div className="border-b border-slate-100 pb-2 flex items-start gap-2">
              <div className="p-1 rounded-lg bg-purple-50 text-purple-600 shrink-0">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                  Изменение состава преподавателей
                </h3>
                <p className="text-[10px] text-slate-400">
                  Новые преподаватели, уходы и изменения нагрузки
                </p>
              </div>
            </div>

            {/* 4 Stat Tiles in 2x2 grid */}
            <div className="mt-3.5 grid grid-cols-2 gap-2.5">
              {staffChanges.map((tile) => (
                <div
                  key={tile.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 flex flex-col justify-between"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                    {tile.id === 'new' && <Users className="h-3 w-3 text-blue-500" />}
                    {tile.id === 'left' && <UserMinus className="h-3 w-3 text-rose-500" />}
                    {tile.id === 'load_changed' && <Sliders className="h-3 w-3 text-indigo-500" />}
                    {tile.id === 'net_change' && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                    <span className="truncate">{tile.label}</span>
                  </div>

                  <div className="mt-1 flex items-baseline justify-between">
                    <span
                      className={cn(
                        'text-lg font-black tracking-tight',
                        tile.type === 'positive' && 'text-emerald-600',
                        tile.type === 'negative' && 'text-rose-600',
                        tile.type === 'neutral' && 'text-blue-600'
                      )}
                    >
                      {tile.value}
                    </span>
                    <span className="text-[9.5px] text-slate-400 font-medium">
                      {tile.subtext}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-400 font-medium">
            Команда выросла на +1 преподавателя за период
          </div>
        </div>

        {/* CARD 3: ПОСЕЩАЕМОСТЬ НА ЗАНЯТИЯХ ПРЕПОДАВАТЕЛЕЙ */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between min-h-[275px]">
          <div>
            <div className="border-b border-slate-100 pb-2 flex items-start gap-2">
              <div className="p-1 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                <ClipboardCheck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                  Посещаемость на занятиях
                </h3>
                <p className="text-[10px] text-slate-400">
                  Средняя посещаемость учеников в группах преподавателя
                </p>
              </div>
            </div>

            {/* List of top 5 teachers with attendance bars */}
            <div className="mt-2.5 space-y-2.5">
              {attendanceList.map((t, idx) => (
                <div key={t.id} className="flex items-center justify-between text-[11px] gap-2">
                  {/* Avatar + Name */}
                  <div className="flex items-center gap-2 w-32 shrink-0 min-w-0">
                    <div
                      className={cn(
                        'h-6 w-6 rounded-full bg-gradient-to-br text-white font-bold text-[9px] flex items-center justify-center shrink-0 shadow-2xs',
                        getAvatarGradient(idx)
                      )}
                    >
                      {t.initials}
                    </div>
                    <Link
                      href="/settings/team?tab=teachers"
                      className="font-semibold text-slate-800 hover:text-blue-600 transition-colors truncate"
                    >
                      {t.name}
                    </Link>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${t.attendanceRate}%` }}
                    />
                  </div>

                  {/* Percentage */}
                  <span className="font-bold text-slate-900 text-right w-8 shrink-0 tabular-nums">
                    {t.attendanceRate}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
            >
              Посмотреть всё →
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. TIER 3: SPLIT ~7/5 COLUMNS                                         */}
      {/* Left Col (~7 cols): Преподаватели, требующие внимания                */}
      {/* Right Col (~5 cols): Преподаватели и их группы                       */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* LEFT COL (~7 COLS): ПРЕПОДАВАТЕЛИ, ТРЕБУЮЩИЕ ВНИМАНИЯ */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-2 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <div className="p-1 rounded-lg bg-rose-50 text-rose-600 shrink-0">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                      Преподаватели, требующие внимания
                    </h3>
                    <span className="h-4 px-1.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold flex items-center justify-center">
                      {attentionTeachers.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Преподаватели с отклонениями от нормы или операционными проблемами
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline shrink-0"
              >
                Посмотреть всех преподавателей →
              </button>
            </div>

            {/* Table */}
            <div className="mt-2.5 overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-2 font-semibold">Преподаватель</th>
                    <th className="pb-2 font-semibold">Сигнал</th>
                    <th className="pb-2 font-semibold">Значение</th>
                    <th className="pb-2 font-semibold text-center">Группы</th>
                    <th className="pb-2 font-semibold">Приоритет</th>
                    <th className="pb-2 font-semibold text-right">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attentionTeachers.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Преподаватель */}
                      <td className="py-2.5 pr-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'h-6 w-6 rounded-full bg-gradient-to-br text-white font-bold text-[9px] flex items-center justify-center shrink-0 shadow-2xs',
                              getAvatarGradient(idx + 1)
                            )}
                          >
                            {row.initials}
                          </div>
                          <span className="font-semibold text-slate-900 truncate">
                            {row.teacherName}
                          </span>
                        </div>
                      </td>

                      {/* Сигнал */}
                      <td className="py-2.5 px-1">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap',
                            row.badgeType === 'red'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                              : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                          )}
                        >
                          {row.signalText}
                        </span>
                      </td>

                      {/* Значение */}
                      <td className="py-2.5 px-2 font-bold text-slate-800 whitespace-nowrap">
                        {row.valueText}
                      </td>

                      {/* Группы */}
                      <td className="py-2.5 px-2 text-center font-semibold text-slate-700 tabular-nums">
                        {row.groupsCount}
                      </td>

                      {/* Приоритет */}
                      <td className="py-2.5 px-1">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap',
                            row.priority === 'Высокий'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          )}
                        >
                          {row.priority}
                        </span>
                      </td>

                      {/* Действие */}
                      <td className="py-2.5 pl-2 text-right">
                        <Link
                          href="/settings/team?tab=teachers"
                          className="inline-flex items-center gap-0.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline bg-blue-50 px-2 py-1 rounded-md transition-colors shadow-2xs"
                        >
                          Посмотреть →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-400 font-medium">
            3 преподавателя требуют перераспределения нагрузки или кураторского внимания
          </div>
        </div>

        {/* RIGHT COL (~5 COLS): ПРЕПОДАВАТЕЛИ И ИХ ГРУППЫ */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-2 flex items-start justify-between gap-1">
              <div className="flex items-start gap-2">
                <div className="p-1 rounded-lg bg-purple-50 text-purple-600 shrink-0">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                    Преподаватели и их группы
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Количество групп и учеников у преподавателей
                  </p>
                </div>
              </div>

              {/* Sort dropdown */}
              <div className="relative">
                <select
                  value={relationSort}
                  onChange={(e) => setRelationSort(e.target.value as any)}
                  aria-label="Сортировка преподавателей и их групп"
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
                >
                  <option value="groups">По количеству групп</option>
                  <option value="students">По ученикам</option>
                  <option value="lessons">По занятиям</option>
                </select>
              </div>
            </div>

            {/* Compact Table */}
            <div className="mt-2.5 overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-2 font-semibold">Преподаватель</th>
                    <th className="pb-2 font-semibold">Направления</th>
                    <th className="pb-2 font-semibold text-center">Группы</th>
                    <th className="pb-2 font-semibold text-center">Ученики</th>
                    <th className="pb-2 font-semibold text-center">Занятий</th>
                    <th className="pb-2 font-semibold text-right">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedTeacherGroupRelations.slice(0, 5).map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Преподаватель */}
                      <td className="py-2.5 pr-1">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={cn(
                              'h-5 w-5 rounded-full bg-gradient-to-br text-white font-bold text-[8.5px] flex items-center justify-center shrink-0 shadow-2xs',
                              getAvatarGradient(idx)
                            )}
                          >
                            {row.initials}
                          </div>
                          <span className="font-semibold text-slate-900 truncate">
                            {row.teacherName}
                          </span>
                        </div>
                      </td>

                      {/* Направления */}
                      <td className="py-2.5 px-1 text-slate-600 truncate max-w-[90px]">
                        {row.direction}
                      </td>

                      {/* Группы */}
                      <td className="py-2.5 px-1 text-center font-bold text-slate-800 tabular-nums">
                        {row.groupsCount}
                      </td>

                      {/* Ученики */}
                      <td className="py-2.5 px-1 text-center font-semibold text-slate-700 tabular-nums">
                        {row.studentsCount}
                      </td>

                      {/* Занятий */}
                      <td className="py-2.5 px-1 text-center font-semibold text-slate-700 tabular-nums">
                        {row.lessonsCount}
                      </td>

                      {/* Статус */}
                      <td className="py-2.5 pl-1 text-right">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2 flex justify-end">
            <Link
              href="/settings/team?tab=teachers"
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
            >
              Перейти к реестру преподавателей →
            </Link>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 5. MODAL: ПОЛНЫЙ СРЕЗ ПРЕПОДАВАТЕЛЕЙ И НАГРУЗКИ                       */}
      {/* ==================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Полный срез по преподавателям школы
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Детальная учебная выработка, академические часы и прикрепленные группы
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Controls: Search + Export */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 px-6 py-3 bg-slate-50/50">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  placeholder="Поиск по имени преподавателя..."
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  Экспорт CSV
                </button>
              </div>
            </div>

            {/* Modal Table Content */}
            <div className="overflow-y-auto p-6">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold">
                    <th className="pb-3">Преподаватель</th>
                    <th className="pb-3 text-center">Проведено занятий</th>
                    <th className="pb-3 text-center">Часов</th>
                    <th className="pb-3 text-center">Групп</th>
                    <th className="pb-3 text-center">Учеников</th>
                    <th className="pb-3 text-right">Карточка</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {modalFilteredTeachers.map((t, idx) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              'h-7 w-7 rounded-full bg-gradient-to-br text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs',
                              getAvatarGradient(idx)
                            )}
                          >
                            {t.initials}
                          </div>
                          <span>{t.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-center font-bold text-slate-900 tabular-nums">
                        {t.lessonsCount} ур.
                      </td>
                      <td className="py-3 text-center font-medium text-slate-600 tabular-nums">
                        {t.hoursCount} ч.
                      </td>
                      <td className="py-3 text-center font-semibold text-slate-800 tabular-nums">
                        {t.groupsCount}
                      </td>
                      <td className="py-3 text-center font-semibold text-slate-800 tabular-nums">
                        {t.studentsCount} чел.
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href="/settings/team?tab=teachers"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold hover:underline"
                        >
                          Открыть
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {modalFilteredTeachers.length === 0 && (
                <div className="py-12 text-center text-xs text-slate-400">
                  Преподаватели по заданному запросу не найдены
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 px-6 py-3 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>Показано преподавателей: {modalFilteredTeachers.length}</span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl bg-slate-200 px-4 py-1.5 font-bold text-slate-700 hover:bg-slate-300 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
