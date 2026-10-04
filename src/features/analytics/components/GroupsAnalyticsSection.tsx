'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  GraduationCap,
  Layers,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  X,
  Search,
  Download,
  Info,
  Clock,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalyticsFilters, GroupsTabData } from '../types';
import { useGroupsTabData } from '../hooks/useGroupsTabData';

interface GroupsAnalyticsSectionProps {
  filters: AnalyticsFilters;
  courses?: Array<{ id: string; name: string }>;
}

export function GroupsAnalyticsSection({ filters }: GroupsAnalyticsSectionProps) {
  const data: GroupsTabData = useGroupsTabData(filters);
  const {
    kpis,
    sizeDistribution,
    directions,
    dynamics,
    stability,
    flows,
    attendanceDirections,
    attentionGroups,
    expiringStudents,
  } = data;

  // Local UI states
  const [dynamicsMode, setDynamicsMode] = useState<'both' | 'groups' | 'size'>('both');
  const [expiringPeriod, setExpiringPeriod] = useState<'30' | '60' | '90'>('30');
  const [isProblemGroupsModalOpen, setIsProblemGroupsModalOpen] = useState(false);
  const [problemSearchTerm, setProblemSearchTerm] = useState('');
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);

  // Icon mapping for top KPI cards
  const renderKpiIcon = (type: string) => {
    switch (type) {
      case 'active_groups':
        return <Users className="h-4 w-4 text-emerald-600" />;
      case 'active_students':
        return <GraduationCap className="h-4 w-4 text-blue-600" />;
      case 'avg_size':
        return <Layers className="h-4 w-4 text-indigo-600" />;
      case 'underfilled':
        return <AlertTriangle className="h-4 w-4 text-rose-600" />;
      case 'operational_issues':
        return <AlertCircle className="h-4 w-4 text-rose-600" />;
      default:
        return <Users className="h-4 w-4 text-slate-600" />;
    }
  };

  const getKpiBg = (type: string) => {
    switch (type) {
      case 'active_groups':
        return 'bg-emerald-50';
      case 'active_students':
        return 'bg-blue-50';
      case 'avg_size':
        return 'bg-indigo-50';
      case 'underfilled':
      case 'operational_issues':
        return 'bg-rose-50';
      default:
        return 'bg-slate-50';
    }
  };

  // Filtered attention groups for modal
  const filteredAttentionGroups = useMemo(() => {
    if (!problemSearchTerm.trim()) return attentionGroups;
    const q = problemSearchTerm.toLowerCase();
    return attentionGroups.filter(
      (g) =>
        g.groupName.toLowerCase().includes(q) ||
        g.directionName.toLowerCase().includes(q) ||
        g.teacherName.toLowerCase().includes(q) ||
        g.signalText.toLowerCase().includes(q)
    );
  }, [attentionGroups, problemSearchTerm]);

  // Export CSV for problem groups
  const handleExportAttentionCSV = () => {
    const headers = ['Группа', 'Направление', 'Преподаватель', 'Сигнал', 'Значение', 'Приоритет'];
    const rows = filteredAttentionGroups.map((g) => [
      `"${g.groupName}"`,
      `"${g.directionName}"`,
      `"${g.teacherName}"`,
      `"${g.signalText}"`,
      `"${g.valueText}"`,
      `"${g.priority}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `problem_groups_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Donut chart calculations for Stability
  const donutRadius = 32;
  const circumference = 2 * Math.PI * donutRadius; // ≈ 201.06
  let accumulatedStabilityOffset = 0;
  const stabilitySegments = stability.items.map((item) => {
    const strokeDasharray = `${(item.sharePercent / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedStabilityOffset;
    accumulatedStabilityOffset += (item.sharePercent / 100) * circumference;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

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

            {/* Bottom row: Large value + previous period value */}
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-xl font-black text-slate-900 tracking-tight font-feature-settings-cv">
                {kpi.value}
              </span>
              <span className="text-[10px] text-slate-400 font-medium truncate">
                {kpi.previousValue}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ==================================================================== */}
      {/* 2. TIER 1: 3-COLUMNS GRID (h-[275px])                                */}
      {/* Col 1: Структура групп по размеру                                    */}
      {/* Col 2: Структура групп по направлениям                               */}
      {/* Col 3: Динамика групп                                                */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
        {/* CARD 1: СТРУКТУРА ГРУПП ПО РАЗМЕРУ */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between min-h-[275px]">
          <div>
            <div className="border-b border-slate-100 pb-2 flex items-start gap-2">
              <div className="p-1 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                  Структура групп по размеру
                </h3>
                <p className="text-[10px] text-slate-400">
                  Распределение групп по количеству учеников
                </p>
              </div>
            </div>

            {/* Size distribution rows with horizontal bars */}
            <div className="mt-4 space-y-3">
              {sizeDistribution.map((item) => (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-700 w-24 shrink-0">
                      {item.label}
                    </span>
                    <div className="flex-1 mx-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${item.sharePercent * 1.8}%` }}
                      />
                    </div>
                    <span className="font-bold text-slate-900 text-right w-14 shrink-0 tabular-nums">
                      {item.count} групп
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold text-right w-9 shrink-0 tabular-nums">
                      {item.sharePercent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-400 font-medium">
            Оптимальный размер группы: 6–8 учеников
          </div>
        </div>

        {/* CARD 2: СТРУКТУРА ГРУПП ПО НАПРАВЛЕНИЯМ */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between min-h-[275px]">
          <div>
            <div className="border-b border-slate-100 pb-2 flex items-start gap-2">
              <div className="p-1 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                  Структура групп по направлениям
                </h3>
                <p className="text-[10px] text-slate-400">
                  Количество активных групп
                </p>
              </div>
            </div>

            {/* Directions bars */}
            <div className="mt-2.5 space-y-2">
              {directions.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 w-36 shrink-0 min-w-0">
                    <span
                      className={cn(
                        'h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0',
                        d.badgeBg,
                        d.badgeText
                      )}
                    >
                      {d.badgeLetter}
                    </span>
                    <span className="font-semibold text-slate-800 truncate">
                      {d.name}
                    </span>
                  </div>

                  <div className="flex-1 mx-2.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-300', d.barColor)}
                      style={{ width: `${d.sharePercent * 2}%` }}
                    />
                  </div>

                  <span className="font-bold text-slate-900 text-right w-6 shrink-0 tabular-nums">
                    {d.count}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold text-right w-8 shrink-0 tabular-nums">
                    {d.sharePercent}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-400 font-medium">
            Всего 6 образовательных программ
          </div>
        </div>

        {/* CARD 3: ДИНАМИКА ГРУПП */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between min-h-[275px]">
          <div>
            <div className="border-b border-slate-100 pb-2 flex items-start justify-between gap-1">
              <div className="flex items-start gap-2">
                <div className="p-1 rounded-lg bg-sky-50 text-sky-600 shrink-0">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                    Динамика групп
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Как меняется количество групп и средний размер
                  </p>
                </div>
              </div>

              {/* View switcher pills */}
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => setDynamicsMode('groups')}
                  className={cn(
                    'px-1.5 py-0.5 rounded transition-all',
                    dynamicsMode === 'groups'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Группы
                </button>
                <button
                  type="button"
                  onClick={() => setDynamicsMode('size')}
                  className={cn(
                    'px-1.5 py-0.5 rounded transition-all',
                    dynamicsMode === 'size'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Средний размер
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 pt-1.5 pb-0.5 text-[9.5px] font-medium text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-xs bg-blue-600" />
                Активные группы
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500 border border-white shadow-2xs" />
                Средний размер
              </span>
            </div>

            {/* Dual Axis Combined SVG Chart */}
            <div className="relative w-full h-[125px] pt-1">
              <svg viewBox="0 0 300 120" className="w-full h-full overflow-visible">
                {/* Horizontal Guide lines */}
                <line x1="25" y1="20" x2="275" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="25" y1="50" x2="275" y2="50" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="25" y1="80" x2="275" y2="80" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="25" y1="100" x2="275" y2="100" stroke="#e2e8f0" strokeWidth="1" />

                {/* Left Y-Axis labels (Groups 0..40) */}
                <text x="18" y="24" textAnchor="end" className="text-[7.5px] fill-slate-400">40</text>
                <text x="18" y="54" textAnchor="end" className="text-[7.5px] fill-slate-400">30</text>
                <text x="18" y="84" textAnchor="end" className="text-[7.5px] fill-slate-400">20</text>
                <text x="18" y="102" textAnchor="end" className="text-[7.5px] fill-slate-400">0</text>

                {/* Right Y-Axis labels (Avg Size 0..10) */}
                <text x="282" y="24" textAnchor="start" className="text-[7.5px] fill-slate-400">10</text>
                <text x="282" y="54" textAnchor="start" className="text-[7.5px] fill-slate-400">8</text>
                <text x="282" y="84" textAnchor="start" className="text-[7.5px] fill-slate-400">6</text>
                <text x="282" y="102" textAnchor="start" className="text-[7.5px] fill-slate-400">0</text>

                {/* Bars for Active Groups */}
                {(dynamicsMode === 'both' || dynamicsMode === 'groups') &&
                  dynamics.map((d, idx) => {
                    const cx = 45 + idx * 42;
                    const barH = Math.round((d.activeGroups / 40) * 80);
                    const isHovered = hoveredMonthIdx === idx;

                    return (
                      <g
                        key={d.month}
                        onMouseEnter={() => setHoveredMonthIdx(idx)}
                        onMouseLeave={() => setHoveredMonthIdx(null)}
                        className="cursor-pointer"
                      >
                        <rect
                          x={cx - 10}
                          y={100 - barH}
                          width="20"
                          height={barH}
                          fill={isHovered ? '#1d4ed8' : '#3b82f6'}
                          rx="3"
                          className="transition-all duration-200"
                        />
                      </g>
                    );
                  })}

                {/* Line for Average Size */}
                {(dynamicsMode === 'both' || dynamicsMode === 'size') && (
                  <>
                    <path
                      d={dynamics
                        .map((d, idx) => {
                          const cx = 45 + idx * 42;
                          const cy = 100 - Math.round((d.avgSize / 10) * 80);
                          return `${idx === 0 ? 'M' : 'L'} ${cx} ${cy}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {dynamics.map((d, idx) => {
                      const cx = 45 + idx * 42;
                      const cy = 100 - Math.round((d.avgSize / 10) * 80);
                      const isHovered = hoveredMonthIdx === idx;

                      return (
                        <circle
                          key={`size-dot-${idx}`}
                          cx={cx}
                          cy={cy}
                          r={isHovered ? 4.5 : 3}
                          fill="#ffffff"
                          stroke="#0284c7"
                          strokeWidth="2"
                          className="transition-all"
                        />
                      );
                    })}
                  </>
                )}

                {/* Month labels under X axis */}
                {dynamics.map((d, idx) => {
                  const cx = 45 + idx * 42;
                  return (
                    <text
                      key={`lbl-${idx}`}
                      x={cx}
                      y="114"
                      textAnchor="middle"
                      className="text-[8.5px] font-semibold fill-slate-500 select-none"
                    >
                      {d.month}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-400 font-medium">
            Сентябрь: 24 группы (+2) • Ср. размер: 7,6 уч.
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. TIER 2: 3-COLUMNS GRID (h-[275px])                                */}
      {/* Col 1: Стабильность групп                                            */}
      {/* Col 2: Изменение состава групп                                       */}
      {/* Col 3: Посещаемость групп                                            */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
        {/* CARD 4: СТАБИЛЬНОСТЬ ГРУПП */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between min-h-[275px]">
          <div>
            <div className="border-b border-slate-100 pb-2 flex items-start gap-2">
              <div className="p-1 rounded-lg bg-rose-50 text-rose-600 shrink-0">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                  Стабильность групп
                </h3>
                <p className="text-[10px] text-slate-400">
                  Оценка состояния групп по ключевым показателям
                </p>
              </div>
            </div>

            {/* Donut and Legend */}
            <div className="flex items-center gap-3 pt-3">
              {/* Donut Chart */}
              <div className="relative shrink-0 flex items-center justify-center">
                <svg width="100" height="100" viewBox="0 0 100 100" className="rotate-[-90deg]">
                  {stabilitySegments.map((seg) => (
                    <circle
                      key={seg.id}
                      cx="50"
                      cy="50"
                      r={donutRadius}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="13"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      className="transition-all duration-300"
                    />
                  ))}
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-sm font-black text-slate-900 leading-none">
                    {stability.totalGroups}
                  </span>
                  <span className="text-[8.5px] font-bold text-slate-400 uppercase mt-0.5">
                    группы
                  </span>
                </div>
              </div>

              {/* Legend with descriptions */}
              <div className="flex-1 space-y-2">
                {stability.items.map((item) => (
                  <div key={item.id} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 font-bold text-slate-800">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900 tabular-nums">
                          {item.count}
                        </span>
                        <span className="text-[10px] text-slate-400 tabular-nums font-semibold">
                          {item.sharePercent}%
                        </span>
                      </div>
                    </div>
                    <p className="text-[9.5px] text-slate-400 leading-tight pl-3.5">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-400 font-medium">
            75% групп функционируют без операционных сбоев
          </div>
        </div>

        {/* CARD 5: ИЗМЕНЕНИЕ СОСТАВА ГРУПП */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between min-h-[275px]">
          <div>
            <div className="border-b border-slate-100 pb-2 flex items-start gap-2">
              <div className="p-1 rounded-lg bg-purple-50 text-purple-600 shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                  Изменение состава групп
                </h3>
                <p className="text-[10px] text-slate-400">
                  Динамика за выбранный период
                </p>
              </div>
            </div>

            {/* 4 Mini Indicators */}
            <div className="grid grid-cols-4 gap-1.5 pt-2 pb-2">
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-1.5 text-center">
                <span className="text-[8.5px] font-semibold text-slate-400 block uppercase">
                  Новые
                </span>
                <span className="text-xs font-black text-emerald-600 block mt-0.5">
                  +{flows.newStudentsCount}
                </span>
                <span className="text-[8.5px] font-bold text-emerald-600 block">
                  {flows.newStudentsDelta}
                </span>
              </div>

              <div className="rounded-lg border border-rose-100 bg-rose-50/40 p-1.5 text-center">
                <span className="text-[8.5px] font-semibold text-rose-600 block uppercase">
                  Выбыли
                </span>
                <span className="text-xs font-black text-rose-600 block mt-0.5">
                  -{flows.churnStudentsCount}
                </span>
                <span className="text-[8.5px] font-bold text-rose-600 block">
                  {flows.churnStudentsDelta}
                </span>
              </div>

              <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-1.5 text-center">
                <span className="text-[8.5px] font-semibold text-blue-600 block uppercase">
                  Переводы
                </span>
                <span className="text-xs font-black text-blue-600 block mt-0.5">
                  {flows.transferredCount}
                </span>
                <span className="text-[8.5px] font-bold text-blue-600 block">
                  {flows.transferredDelta}
                </span>
              </div>

              <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-1.5 text-center">
                <span className="text-[8.5px] font-semibold text-emerald-700 block uppercase">
                  Чистое
                </span>
                <span className="text-xs font-black text-emerald-700 block mt-0.5">
                  +{flows.netChangeCount}
                </span>
                <span className="text-[8.5px] font-bold text-emerald-700 block">
                  {flows.netChangeDelta}
                </span>
              </div>
            </div>

            {/* Top Changed Groups Table */}
            <div className="mt-1 overflow-x-auto">
              <table className="w-full text-left text-[10.5px]">
                <thead>
                  <tr className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-0.5">
                    <th className="pb-1 font-semibold">Группа</th>
                    <th className="pb-1 text-center font-semibold">Было</th>
                    <th className="pb-1 text-center font-semibold">Стало</th>
                    <th className="pb-1 text-center font-semibold">Изм.</th>
                    <th className="pb-1 text-right font-semibold">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {flows.topChangedGroups.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-1 font-semibold text-slate-800 truncate max-w-[95px]">
                        {g.groupName}
                      </td>
                      <td className="py-1 text-center font-medium text-slate-500 tabular-nums">
                        {g.prevCount}
                      </td>
                      <td className="py-1 text-center font-bold text-slate-900 tabular-nums">
                        {g.currentCount}
                      </td>
                      <td className="py-1 text-center tabular-nums">
                        <span
                          className={cn(
                            'font-bold text-[10px]',
                            g.change > 0 ? 'text-emerald-600' : 'text-rose-600'
                          )}
                        >
                          {g.changeFormatted}
                        </span>
                      </td>
                      <td className="py-1 text-right">
                        <Link
                          href={`/groups/${g.groupId}`}
                          className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
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
        </div>

        {/* CARD 6: ПОСЕЩАЕМОСТЬ ГРУПП */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between min-h-[275px]">
          <div>
            <div className="border-b border-slate-100 pb-2 flex items-start gap-2">
              <div className="p-1 rounded-lg bg-teal-50 text-teal-600 shrink-0">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                  Посещаемость групп
                </h3>
                <p className="text-[10px] text-slate-400">
                  Средняя посещаемость за период
                </p>
              </div>
            </div>

            {/* Attendance bars by direction */}
            <div className="mt-3 space-y-2.5">
              {attendanceDirections.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 w-36 shrink-0 min-w-0">
                    <span
                      className={cn(
                        'h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0',
                        d.badgeBg,
                        d.badgeText
                      )}
                    >
                      {d.badgeLetter}
                    </span>
                    <span className="font-semibold text-slate-800 truncate">
                      {d.name}
                    </span>
                  </div>

                  <div className="flex-1 mx-2.5 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-300', d.barColor)}
                      style={{ width: `${d.ratePercent}%` }}
                    />
                  </div>

                  <span className="font-black text-slate-900 text-right w-9 shrink-0 tabular-nums">
                    {d.ratePercent}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-400 font-medium">
            Общая средняя посещаемость по школе: 81,4%
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. TIER 3: 12-COLUMNS SPLIT (h-[285px] cards)                         */}
      {/* Col 1-7 (7 cols): Группы, требующие внимания                         */}
      {/* Col 8-12 (5 cols): Ближайшие окончания обучения                      */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* CARD 7: ГРУППЫ, ТРЕБУЮЩИЕ ВНИМАНИЯ (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between min-h-[285px]">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-[10px] font-bold">
                    !
                  </span>
                  Группы, требующие внимания
                  <span className="rounded-full bg-rose-50 border border-rose-200 text-rose-700 px-1.5 py-0.2 text-[10px] font-bold">
                    {attentionGroups.length}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Группы с отклонениями от нормы, низкой посещаемостью или другими проблемами
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsProblemGroupsModalOpen(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition-colors whitespace-nowrap"
              >
                Посмотреть все проблемные группы →
              </button>
            </div>

            {/* Table of groups requiring attention */}
            <div className="mt-2 overflow-x-auto min-w-0">
              <table className="w-full text-left text-[10.5px]">
                <thead>
                  <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
                    <th className="pb-1.5 pr-2 font-semibold">Группа</th>
                    <th className="pb-1.5 pr-2 font-semibold">Направление</th>
                    <th className="pb-1.5 pr-2 font-semibold">Преподаватель</th>
                    <th className="pb-1.5 pr-2 font-semibold">Сигнал</th>
                    <th className="pb-1.5 pr-2 text-center font-semibold">Значение</th>
                    <th className="pb-1.5 pr-2 text-center font-semibold">Приоритет</th>
                    <th className="pb-1.5 text-right font-semibold">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attentionGroups.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-1.5 pr-2 font-semibold text-slate-900 truncate max-w-[100px]">
                        <Link
                          href={`/groups/${row.groupId}`}
                          className="hover:text-blue-600 hover:underline transition-colors"
                        >
                          {row.groupName}
                        </Link>
                      </td>
                      <td className="py-1.5 pr-2 text-slate-600 truncate max-w-[90px]">
                        {row.directionName}
                      </td>
                      <td className="py-1.5 pr-2 text-slate-700 truncate max-w-[95px]">
                        {row.teacherName}
                      </td>
                      <td className="py-1.5 pr-2">
                        <span
                          className={cn(
                            'inline-block px-1.5 py-0.5 rounded text-[9.5px] font-semibold truncate max-w-[130px]',
                            row.badgeType === 'red'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          )}
                        >
                          {row.signalText}
                        </span>
                      </td>
                      <td className="py-1.5 pr-2 text-center font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {row.valueText}
                      </td>
                      <td className="py-1.5 pr-2 text-center whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-block px-1.5 py-0.5 rounded text-[9px] font-bold',
                            row.priority === 'Высокий'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          )}
                        >
                          {row.priority}
                        </span>
                      </td>
                      <td className="py-1.5 text-right whitespace-nowrap">
                        <Link
                          href={`/groups/${row.groupId}`}
                          className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
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

          <div className="border-t border-slate-100 pt-2 text-center">
            <Link
              href="/groups"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 transition-colors"
            >
              Все группы школы (24) →
            </Link>
          </div>
        </div>

        {/* CARD 8: БЛИЖАЙШИЕ ОКОНЧАНИЯ ОБУЧЕНИЯ (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between min-h-[285px]">
          <div>
            {/* Header + Dropdown */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-purple-600" />
                  Ближайшие окончания обучения
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Ученики, которые заканчивают текущие пакеты
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setExpiringPeriod(expiringPeriod === '30' ? '60' : '30')}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/70 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Следующие {expiringPeriod} дней
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Table of expiring students */}
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
                    <th className="pb-1.5 font-semibold">Ученик</th>
                    <th className="pb-1.5 font-semibold">Группа</th>
                    <th className="pb-1.5 text-center font-semibold">Дата окончания</th>
                    <th className="pb-1.5 text-right font-semibold">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expiringStudents.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 font-semibold text-slate-900 whitespace-nowrap">
                        <Link
                          href={`/students/${row.studentId}`}
                          className="hover:text-blue-600 hover:underline transition-colors"
                        >
                          {row.studentName}
                        </Link>
                      </td>
                      <td className="py-2 text-slate-600 whitespace-nowrap">
                        {row.groupName}
                      </td>
                      <td className="py-2 text-center text-slate-500 tabular-nums">
                        {row.endDate}
                      </td>
                      <td className="py-2 text-right">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700">
                          {row.statusText}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-2 text-center">
            <Link
              href="/students?filter=expiring"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition-colors"
            >
              Посмотреть всех учеников →
            </Link>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 5. MODAL: ВСЕ ПРОБЛЕМНЫЕ ГРУППЫ                                       */}
      {/* ==================================================================== */}
      {isProblemGroupsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                  Все группы, требующие внимания
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Полный список групп с операционными отклонениями, недостаточным составом и пропусками
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsProblemGroupsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search and Export Bar */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Поиск по группе, преподавателю или проблеме..."
                  value={problemSearchTerm}
                  onChange={(e) => setProblemSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={handleExportAttentionCSV}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                Экспорт CSV
              </button>
            </div>

            {/* Modal Table */}
            <div className="max-h-[360px] overflow-y-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-3">Группа</th>
                    <th className="py-2.5 px-3">Направление</th>
                    <th className="py-2.5 px-3">Преподаватель</th>
                    <th className="py-2.5 px-3">Сигнал проблемы</th>
                    <th className="py-2.5 px-3 text-center">Значение</th>
                    <th className="py-2.5 px-3 text-center">Приоритет</th>
                    <th className="py-2.5 px-3 text-right">Карточка</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAttentionGroups.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {g.groupName}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{g.directionName}</td>
                      <td className="py-2 px-3 text-slate-700">{g.teacherName}</td>
                      <td className="py-2 px-3">
                        <span
                          className={cn(
                            'inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold',
                            g.badgeType === 'red'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          )}
                        >
                          {g.signalText}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-900 tabular-nums">
                        {g.valueText}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={cn(
                            'inline-block px-2 py-0.5 rounded text-[10px] font-bold',
                            g.priority === 'Высокий'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          )}
                        >
                          {g.priority}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Link
                          href={`/groups/${g.groupId}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          Открыть
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link
                href="/groups"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition-colors"
              >
                Перейти в реестр всех групп →
              </Link>
              <button
                type="button"
                onClick={() => setIsProblemGroupsModalOpen(false)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
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
