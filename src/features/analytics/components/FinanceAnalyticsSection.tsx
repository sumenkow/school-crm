'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Banknote,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  X,
  Search,
  Download,
  Users,
  AlertCircle,
  FileText,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalyticsFilters, FinanceTabData } from '../types';
import { useFinanceTabData, formatEur } from '../hooks/useFinanceTabData';

interface FinanceAnalyticsSectionProps {
  filters: AnalyticsFilters;
  courses?: Array<{ id: string; name: string }>;
}

export function FinanceAnalyticsSection({ filters }: FinanceAnalyticsSectionProps) {
  const data: FinanceTabData = useFinanceTabData(filters);
  const {
    kpis,
    monthlyAccruals,
    directions,
    dynamics,
    structure,
    lossAnalysis,
    debtsSummary,
    riskTabs,
  } = data;

  // Local UI states
  const [accrualViewPeriod, setAccrualViewPeriod] = useState<'months' | 'quarters'>('months');
  const [activeRiskTab, setActiveRiskTab] = useState<'students' | 'groups'>('students');
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);
  const [isDirectionsModalOpen, setIsDirectionsModalOpen] = useState(false);
  const [isDebtorsModalOpen, setIsDebtorsModalOpen] = useState(false);
  const [isLossDetailsModalOpen, setIsLossDetailsModalOpen] = useState(false);
  const [directionsSearchTerm, setDirectionsSearchTerm] = useState('');

  // Icon mapping for top KPI cards
  const renderKpiIcon = (type: string) => {
    switch (type) {
      case 'revenue':
        return <Banknote className="h-4 w-4 text-emerald-600" />;
      case 'paid':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'debt':
        return <AlertTriangle className="h-4 w-4 text-rose-600" />;
      case 'avg_check':
        return <TrendingUp className="h-4 w-4 text-indigo-600" />;
      case 'ltv':
        return <Sparkles className="h-4 w-4 text-purple-600" />;
      case 'overdue':
        return <Clock className="h-4 w-4 text-rose-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-slate-600" />;
    }
  };

  const getKpiBg = (type: string) => {
    switch (type) {
      case 'revenue':
        return 'bg-emerald-50';
      case 'paid':
        return 'bg-blue-50';
      case 'debt':
        return 'bg-rose-50';
      case 'avg_check':
        return 'bg-indigo-50';
      case 'ltv':
        return 'bg-purple-50';
      case 'overdue':
        return 'bg-rose-50';
      default:
        return 'bg-slate-50';
    }
  };

  // Filtered directions for modal
  const filteredDirections = useMemo(() => {
    if (!directionsSearchTerm.trim()) return directions;
    const q = directionsSearchTerm.toLowerCase();
    return directions.filter((d) => d.name.toLowerCase().includes(q));
  }, [directions, directionsSearchTerm]);

  // Export directions to CSV
  const handleExportDirectionsCSV = () => {
    const headers = ['Направление', 'Учеников', 'Выручка EUR', 'Средний чек EUR', 'Задолженность EUR'];
    const rows = filteredDirections.map((d) => [
      `"${d.name}"`,
      d.studentsCount,
      d.revenueEur,
      d.avgCheckEur,
      d.debtEur,
    ]);
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `financial_directions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Donut chart stroke-dash calculations (circumference = 2 * PI * r = 2 * 3.14159 * 28 ≈ 175.93)
  const donutRadius = 28;
  const circumference = 2 * Math.PI * donutRadius;
  let accumulatedOffset = 0;
  const donutSegments = structure.items.map((item) => {
    const strokeDasharray = `${(item.sharePercent / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedOffset;
    accumulatedOffset += (item.sharePercent / 100) * circumference;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="w-full space-y-3 pb-8">
      {/* ==================================================================== */}
      {/* 1. TOP KPI ROW: 6 CARDS (h-[82px] on Desktop)                         */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {kpis.map((kpi) => (
          <div
            key={kpi.id}
            className="h-[82px] rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow"
          >
            {/* Top row: icon + title + delta badge */}
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className={cn('p-1 rounded-md shrink-0', getKpiBg(kpi.iconType))}>
                  {renderKpiIcon(kpi.iconType)}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
                  {kpi.label}
                </span>
              </div>
              <span
                className={cn(
                  'shrink-0 text-[9.5px] font-bold px-1.5 py-0.5 rounded leading-none flex items-center gap-0.5',
                  kpi.isPositive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
                )}
              >
                {kpi.change}
              </span>
            </div>

            {/* Bottom row: Large figure + previous period value */}
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
      {/* 2. TIER 1: 12-COLUMNS SPLIT (h-[340px] cards)                         */}
      {/* Col 1-5 (5 cols): Выручка и оплаты                                   */}
      {/* Col 6-9 (4 cols): Финансовые показатели по направлениям              */}
      {/* Col 10-12 (3 cols): Динамика выручки + Структура выручки             */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* CARD 1: ВЫРУЧКА И ОПЛАТЫ (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between min-h-[340px]">
          <div>
            {/* Header + Dropdown */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                  Выручка и оплаты
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Динамика начислений, оплат и задолженности
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAccrualViewPeriod(accrualViewPeriod === 'months' ? 'quarters' : 'months')}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/70 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {accrualViewPeriod === 'months' ? 'По месяцам' : 'По кварталам'}
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Legend strip */}
            <div className="flex items-center gap-3.5 pt-2 pb-1 text-[10.5px] font-medium text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-xs bg-sky-400" />
                Начислено
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-xs bg-blue-600" />
                Оплачено
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Задолженность
              </span>
            </div>

            {/* Combined SVG Bar + Line Chart */}
            <div className="relative w-full h-[115px] pt-1">
              <svg viewBox="0 0 540 115" className="w-full h-full overflow-visible">
                {/* Horizontal Guide lines */}
                <line x1="10" y1="20" x2="530" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="10" y1="55" x2="530" y2="55" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="10" y1="90" x2="530" y2="90" stroke="#e2e8f0" strokeWidth="1" />

                {/* Bars for each of the 6 months */}
                {monthlyAccruals.map((m, idx) => {
                  const cx = 50 + idx * 85;
                  const maxVal = 42000;
                  const barAccruedH = Math.max(4, Math.round((m.accruedEur / maxVal) * 75));
                  const barPaidH = Math.max(4, Math.round((m.paidEur / maxVal) * 75));
                  const isHovered = hoveredMonthIndex === idx;

                  return (
                    <g
                      key={m.month}
                      onMouseEnter={() => setHoveredMonthIndex(idx)}
                      onMouseLeave={() => setHoveredMonthIndex(null)}
                      className="cursor-pointer transition-opacity"
                    >
                      {/* Hover background column */}
                      {isHovered && (
                        <rect
                          x={cx - 36}
                          y="10"
                          width="72"
                          height="85"
                          fill="#f8fafc"
                          rx="4"
                        />
                      )}

                      {/* Accrued Bar (Sky Blue) */}
                      <rect
                        x={cx - 16}
                        y={90 - barAccruedH}
                        width="14"
                        height={barAccruedH}
                        fill="#38bdf8"
                        rx="2"
                        className="transition-all duration-200 hover:brightness-95"
                      />

                      {/* Paid Bar (Royal Blue) */}
                      <rect
                        x={cx + 2}
                        y={90 - barPaidH}
                        width="14"
                        height={barPaidH}
                        fill="#2563eb"
                        rx="2"
                        className="transition-all duration-200 hover:brightness-95"
                      />

                      {/* Month label under x-axis */}
                      <text
                        x={cx}
                        y="105"
                        textAnchor="middle"
                        className="text-[9px] font-semibold fill-slate-500 select-none"
                      >
                        {m.month.split(' ')[0]}
                      </text>
                    </g>
                  );
                })}

                {/* Overlaid Debt Line with Dots */}
                <path
                  d={monthlyAccruals
                    .map((m, idx) => {
                      const cx = 50 + idx * 85;
                      const cy = 90 - Math.round((m.debtEur / 42000) * 75);
                      return `${idx === 0 ? 'M' : 'L'} ${cx} ${cy}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Dots on debt line */}
                {monthlyAccruals.map((m, idx) => {
                  const cx = 50 + idx * 85;
                  const cy = 90 - Math.round((m.debtEur / 42000) * 75);
                  const isHovered = hoveredMonthIndex === idx;

                  return (
                    <circle
                      key={`dot-${idx}`}
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 4.5 : 3}
                      fill="#ffffff"
                      stroke="#ef4444"
                      strokeWidth={isHovered ? 2.5 : 2}
                      className="transition-all"
                    />
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Compact 6-month financial data table */}
          <div className="mt-2 border-t border-slate-100 pt-2 overflow-x-auto">
            <table className="w-full text-left text-[10.5px]">
              <thead>
                <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
                  <th className="pb-1 font-semibold">Месяц</th>
                  <th className="pb-1 text-right font-semibold">Начислено</th>
                  <th className="pb-1 text-right font-semibold">Оплачено</th>
                  <th className="pb-1 text-right font-semibold">Долг</th>
                  <th className="pb-1 text-right font-semibold">Динамика</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {monthlyAccruals.map((row, idx) => (
                  <tr
                    key={row.month}
                    className={cn(
                      'hover:bg-slate-50/70 transition-colors',
                      hoveredMonthIndex === idx && 'bg-blue-50/40'
                    )}
                    onMouseEnter={() => setHoveredMonthIndex(idx)}
                    onMouseLeave={() => setHoveredMonthIndex(null)}
                  >
                    <td className="py-1 font-semibold text-slate-800 whitespace-nowrap">
                      {row.month}
                    </td>
                    <td className="py-1 text-right font-medium text-slate-600 tabular-nums">
                      {row.accruedFormatted}
                    </td>
                    <td className="py-1 text-right font-bold text-slate-900 tabular-nums">
                      {row.paidFormatted}
                    </td>
                    <td className="py-1 text-right font-medium text-rose-600 tabular-nums">
                      {row.debtFormatted}
                    </td>
                    <td className="py-1 text-right font-bold tabular-nums">
                      <span
                        className={cn(
                          'inline-block px-1 py-0.2 rounded text-[9.5px]',
                          row.isPositiveTrend
                            ? 'text-emerald-700 bg-emerald-50'
                            : 'text-rose-700 bg-rose-50'
                        )}
                      >
                        {row.trendFormatted}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CARD 2: ФИНАНСОВЫЕ ПОКАЗАТЕЛИ ПО НАПРАВЛЕНИЯМ (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between min-h-[340px]">
          <div>
            {/* Header */}
            <div className="border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Финансовые показатели по направлениям
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Выручка, средний чек и задолженность
              </p>
            </div>

            {/* Table of directions */}
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
                    <th className="pb-1.5 font-semibold">Направление</th>
                    <th className="pb-1.5 text-center font-semibold">Уч.</th>
                    <th className="pb-1.5 text-right font-semibold">Выручка</th>
                    <th className="pb-1.5 text-right font-semibold">Ср. чек</th>
                    <th className="pb-1.5 text-right font-semibold">Долг</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {directions.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-1.5 pr-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={cn(
                              'h-2 w-2 rounded-full shrink-0',
                              d.id === 'english' && 'bg-rose-500',
                              d.id === 'math' && 'bg-blue-500',
                              d.id === 'robotics' && 'bg-indigo-500',
                              d.id === 'programming' && 'bg-purple-500',
                              d.id === 'prep' && 'bg-pink-500',
                              d.id === 'design' && 'bg-amber-500'
                            )}
                          />
                          <span className="font-semibold text-slate-900 truncate">
                            {d.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-1.5 text-center font-medium text-slate-500 tabular-nums">
                        {d.studentsCount}
                      </td>
                      <td className="py-1.5 text-right font-bold text-slate-900 tabular-nums">
                        {d.revenueFormatted}
                      </td>
                      <td className="py-1.5 text-right font-medium text-slate-600 tabular-nums">
                        {d.avgCheckFormatted}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700">
                          {d.debtFormatted}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Drilldown button */}
          <div className="border-t border-slate-100 pt-2.5 text-center">
            <button
              type="button"
              onClick={() => setIsDirectionsModalOpen(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition-colors"
            >
              Показать все направления
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* CARD 3: ПРАВЫЙ ВЕРТИКАЛЬНЫЙ СТЕК (3 cols: Динамика + Структура) */}
        <div className="lg:col-span-3 flex flex-col gap-3 min-h-[340px]">
          {/* Верхний блок: Динамика выручки (h-[164px]) */}
          <div className="h-[164px] rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xs flex flex-col justify-between">
            <div className="flex items-start justify-between gap-1 border-b border-slate-100 pb-1.5">
              <div>
                <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                  Динамика выручки
                </h4>
                <p className="text-[10px] text-slate-400">Сравнение с прошлым периодом</p>
              </div>
              <div className="flex items-center gap-2 text-[9px] font-medium text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                  Тек.
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                  Прош.
                </span>
              </div>
            </div>

            {/* Mini SVG 2-Lines Chart */}
            <div className="relative w-full h-[85px] pt-1">
              <svg viewBox="0 0 260 70" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="revenueFillGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Light guide line */}
                <line x1="10" y1="52" x2="250" y2="52" stroke="#f1f5f9" strokeWidth="1" />

                {/* Previous Period Line (Dashed) */}
                <path
                  d={dynamics
                    .map((d, idx) => {
                      const cx = 20 + idx * 44;
                      const cy = 52 - Math.round(((d.previousEur - 28000) / 7000) * 40);
                      return `${idx === 0 ? 'M' : 'L'} ${cx} ${cy}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />

                {/* Current Period Area Fill */}
                <path
                  d={`M 20 52 ${dynamics
                    .map((d, idx) => {
                      const cx = 20 + idx * 44;
                      const cy = 52 - Math.round(((d.currentEur - 28000) / 7000) * 40);
                      return `L ${cx} ${cy}`;
                    })
                    .join(' ')} L 240 52 Z`}
                  fill="url(#revenueFillGradient)"
                />

                {/* Current Period Line */}
                <path
                  d={dynamics
                    .map((d, idx) => {
                      const cx = 20 + idx * 44;
                      const cy = 52 - Math.round(((d.currentEur - 28000) / 7000) * 40);
                      return `${idx === 0 ? 'M' : 'L'} ${cx} ${cy}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Current dots + month labels */}
                {dynamics.map((d, idx) => {
                  const cx = 20 + idx * 44;
                  const cy = 52 - Math.round(((d.currentEur - 28000) / 7000) * 40);
                  return (
                    <g key={d.month}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r="2.5"
                        fill="#ffffff"
                        stroke="#2563eb"
                        strokeWidth="1.8"
                      />
                      <text
                        x={cx}
                        y="64"
                        textAnchor="middle"
                        className="text-[8px] font-semibold fill-slate-400 select-none"
                      >
                        {d.month}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Нижний блок: Структура выручки (Donut) (h-[164px]) */}
          <div className="h-[164px] rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xs flex flex-col justify-between">
            <div className="border-b border-slate-100 pb-1">
              <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                Структура выручки
              </h4>
              <p className="text-[10px] text-slate-400">По учебным направлениям</p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              {/* Donut Chart with Centered Total */}
              <div className="relative shrink-0 flex items-center justify-center">
                <svg width="86" height="86" viewBox="0 0 86 86" className="rotate-[-90deg]">
                  {donutSegments.map((seg) => (
                    <circle
                      key={seg.id}
                      cx="43"
                      cy="43"
                      r={donutRadius}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="11"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      className="transition-all duration-300"
                    />
                  ))}
                </svg>
                {/* Center text in donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-black text-slate-900 leading-none">
                    € 32.5k
                  </span>
                  <span className="text-[8px] font-semibold text-slate-400 uppercase mt-0.5">
                    Всего
                  </span>
                </div>
              </div>

              {/* Legend with shares */}
              <div className="flex-1 space-y-1 pl-1">
                {structure.items.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-600 font-medium truncate max-w-[85px]">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {item.sharePercent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. TIER 2: 2-COLUMNS SPLIT (h-[285px] cards)                         */}
      {/* Col 1: Где теряем деньги (Потенциальные потери + блок суммы)          */}
      {/* Col 2: Долги и просрочки (3 мини-KPI + реестр должников)             */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
        {/* БЛОК 1: ГДЕ ТЕРЯЕМ ДЕНЬГИ */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between min-h-[285px]">
          <div>
            <div className="border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Где теряем деньги
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Анализ финансовых потерь и недополученной выручки
              </p>
            </div>

            {/* Split: 5 progress bars on left + Summary banner on right */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-3 items-center">
              {/* Left: 5 categories (7 cols) */}
              <div className="sm:col-span-7 space-y-2">
                {lossAnalysis.items.map((cat) => (
                  <div key={cat.id} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        {cat.title}
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[9.5px] font-bold text-slate-500">
                          {cat.count}
                        </span>
                      </span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {cat.amountFormatted}{' '}
                        <span className="text-[10px] font-medium text-slate-400">
                          ({cat.sharePercent}%)
                        </span>
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-300', cat.color)}
                        style={{ width: `${cat.sharePercent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Right: Potential Loss Banner (5 cols) */}
              <div className="sm:col-span-5 rounded-xl border border-rose-200/80 bg-rose-50/70 p-3.5 flex flex-col justify-between h-full min-h-[170px]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                    Потенциально недополучено
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-rose-900 tracking-tight">
                      {lossAnalysis.potentialLossFormatted}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                      {lossAnalysis.potentialLossDelta}
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-700/90 font-medium mt-1 leading-snug">
                    {lossAnalysis.potentialLossShareText}
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsLossDetailsModalOpen(true)}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition-colors"
                  >
                    Посмотреть учеников
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* БЛОК 2: ДОЛГИ И ПРОСРОЧКИ */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between min-h-[285px]">
          <div>
            {/* Header */}
            <div className="border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Долги и просрочки
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ученики с наибольшей суммой задолженности
              </p>
            </div>

            {/* 3 Mini-KPI Strip */}
            <div className="grid grid-cols-3 gap-2 pt-2.5 pb-2">
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2 text-center">
                <span className="text-[9.5px] font-semibold text-slate-400 block uppercase">
                  Общий долг
                </span>
                <span className="text-xs font-black text-slate-900 block mt-0.5">
                  {debtsSummary.totalDebtFormatted}
                </span>
                <span className="text-[9px] font-bold text-rose-600 block">
                  {debtsSummary.totalDebtDelta}
                </span>
              </div>

              <div className="rounded-lg border border-rose-100 bg-rose-50/40 p-2 text-center">
                <span className="text-[9.5px] font-semibold text-rose-600 block uppercase">
                  В просрочке
                </span>
                <span className="text-xs font-black text-rose-700 block mt-0.5">
                  {debtsSummary.overdueDebtFormatted}
                </span>
                <span className="text-[9px] font-bold text-rose-600 block">
                  {debtsSummary.overdueDebtDelta}
                </span>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2 text-center">
                <span className="text-[9.5px] font-semibold text-slate-400 block uppercase">
                  Учеников с долгом
                </span>
                <span className="text-xs font-black text-slate-900 block mt-0.5">
                  {debtsSummary.debtorsCount}
                </span>
                <span className="text-[9px] font-bold text-rose-600 block">
                  {debtsSummary.debtorsCountDelta}
                </span>
              </div>
            </div>

            {/* Top Debtors Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
                    <th className="pb-1 font-semibold">Ученик</th>
                    <th className="pb-1 font-semibold">Группа</th>
                    <th className="pb-1 text-right font-semibold">Долг</th>
                    <th className="pb-1 text-center font-semibold">Просрочка</th>
                    <th className="pb-1 text-center font-semibold">Дней</th>
                    <th className="pb-1 text-right font-semibold">Риск</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {debtsSummary.debtorsList.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-1.5 font-semibold text-slate-900 whitespace-nowrap">
                        <Link
                          href={`/students/${row.studentId}`}
                          className="hover:text-blue-600 hover:underline transition-colors"
                        >
                          {row.studentName}
                        </Link>
                      </td>
                      <td className="py-1.5 text-slate-600 whitespace-nowrap">
                        {row.groupName}
                      </td>
                      <td className="py-1.5 text-right font-bold text-slate-900 tabular-nums">
                        {row.debtFormatted}
                      </td>
                      <td className="py-1.5 text-center text-slate-500 tabular-nums">
                        {row.overdueDate}
                      </td>
                      <td className="py-1.5 text-center font-semibold text-rose-600 tabular-nums">
                        {row.daysOverdue} дн.
                      </td>
                      <td className="py-1.5 text-right">
                        <span
                          className={cn(
                            'inline-block px-1.5 py-0.5 rounded text-[9.5px] font-bold',
                            row.riskLevel === 'Высокий'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          )}
                        >
                          {row.riskLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Drilldown button */}
          <div className="border-t border-slate-100 pt-2 text-center">
            <button
              type="button"
              onClick={() => setIsDebtorsModalOpen(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition-colors"
            >
              Все должники ({debtsSummary.debtorsCount}) →
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. TIER 3: 12-COLUMNS SPLIT (h-[275px] cards)                         */}
      {/* Col 1-7 (7 cols): Ученики и группы с финансовым риском               */}
      {/* Col 8-12 (5 cols): Группы с финансовыми проблемами                   */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* CARD 1: УЧЕНИКИ И ГРУППЫ С ФИНАНСОВЫМ РИСКОМ (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between min-h-[275px]">
          <div>
            {/* Header + Tabs Switch */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Ученики и группы с финансовым риском
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Окончание пакетов, низкий баланс и задержки платежей
                </p>
              </div>

              {/* Sub-tab Pill Switch */}
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveRiskTab('students')}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-all text-[11px]',
                    activeRiskTab === 'students'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Ученики ({riskTabs.students.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRiskTab('groups')}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-all text-[11px]',
                    activeRiskTab === 'groups'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Группы ({riskTabs.groups.length})
                </button>
              </div>
            </div>

            {/* Students Risk Table */}
            {activeRiskTab === 'students' && (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
                      <th className="pb-1.5 font-semibold">Ученик</th>
                      <th className="pb-1.5 font-semibold">Группа</th>
                      <th className="pb-1.5 text-center font-semibold">Остаток занятий</th>
                      <th className="pb-1.5 text-center font-semibold">Окончание</th>
                      <th className="pb-1.5 font-semibold">Статус</th>
                      <th className="pb-1.5 text-right font-semibold">Риск</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {riskTabs.students.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-1.5 font-semibold text-slate-900 whitespace-nowrap">
                          <Link
                            href={`/students/${r.studentId}`}
                            className="hover:text-blue-600 hover:underline transition-colors"
                          >
                            {r.studentName}
                          </Link>
                        </td>
                        <td className="py-1.5 text-slate-600 whitespace-nowrap">
                          {r.groupName}
                        </td>
                        <td className="py-1.5 text-center">
                          <span
                            className={cn(
                              'inline-block px-1.5 py-0.2 rounded font-bold text-[10px]',
                              r.lessonsRemainingColor === 'red' && 'bg-rose-50 text-rose-700',
                              r.lessonsRemainingColor === 'orange' && 'bg-amber-50 text-amber-700',
                              r.lessonsRemainingColor === 'green' && 'bg-emerald-50 text-emerald-700'
                            )}
                          >
                            {r.lessonsRemaining} {r.lessonsRemaining === 1 ? 'занятие' : 'занятия'}
                          </span>
                        </td>
                        <td className="py-1.5 text-center text-slate-500 tabular-nums">
                          {r.endDate}
                        </td>
                        <td className="py-1.5 text-slate-700 font-medium">
                          {r.statusText}
                        </td>
                        <td className="py-1.5 text-right">
                          <span
                            className={cn(
                              'inline-block px-1.5 py-0.5 rounded text-[9.5px] font-bold',
                              r.riskLevel === 'Высокий'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-amber-50 text-amber-700'
                            )}
                          >
                            {r.riskLevel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Groups Risk Table (when tab active) */}
            {activeRiskTab === 'groups' && (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
                      <th className="pb-1.5 font-semibold">Группа</th>
                      <th className="pb-1.5 text-center font-semibold">Всего уч.</th>
                      <th className="pb-1.5 text-center font-semibold">Должников</th>
                      <th className="pb-1.5 text-center font-semibold">Доля</th>
                      <th className="pb-1.5 text-right font-semibold">Сумма долга</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {riskTabs.groups.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-1.5 font-semibold text-slate-900 whitespace-nowrap">
                          <Link
                            href={`/groups/${g.groupId}`}
                            className="hover:text-blue-600 hover:underline transition-colors"
                          >
                            {g.groupName}
                          </Link>
                        </td>
                        <td className="py-1.5 text-center text-slate-600 tabular-nums">
                          {g.totalStudents}
                        </td>
                        <td className="py-1.5 text-center font-bold text-rose-600 tabular-nums">
                          {g.debtStudentsCount}
                        </td>
                        <td className="py-1.5 text-center font-semibold text-slate-700 tabular-nums">
                          {g.debtSharePercent}%
                        </td>
                        <td className="py-1.5 text-right font-bold text-slate-900 tabular-nums">
                          {g.debtAmountFormatted}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Drilldown button */}
          <div className="border-t border-slate-100 pt-2 text-center">
            <Link
              href="/students?filter=risk"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition-colors"
            >
              Все ученики в группе риска →
            </Link>
          </div>
        </div>

        {/* CARD 2: ГРУППЫ С ФИНАНСОВЫМИ ПРОБЛЕМАМИ (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between min-h-[275px]">
          <div>
            {/* Header */}
            <div className="border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Группы с финансовыми проблемами
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Наибольшая концентрация должников и неоплаченных счетов
              </p>
            </div>

            {/* Groups Table */}
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
                    <th className="pb-1.5 font-semibold">Группа</th>
                    <th className="pb-1.5 text-center font-semibold">Уч.</th>
                    <th className="pb-1.5 text-center font-semibold">С долгом</th>
                    <th className="pb-1.5 text-center font-semibold">Доля</th>
                    <th className="pb-1.5 text-right font-semibold">Сумма долга</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {riskTabs.groups.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-1.5 font-semibold text-slate-900 whitespace-nowrap">
                        <Link
                          href={`/groups/${g.groupId}`}
                          className="hover:text-blue-600 hover:underline transition-colors"
                        >
                          {g.groupName}
                        </Link>
                      </td>
                      <td className="py-1.5 text-center text-slate-600 tabular-nums">
                        {g.totalStudents}
                      </td>
                      <td className="py-1.5 text-center font-bold text-rose-600 tabular-nums">
                        {g.debtStudentsCount}
                      </td>
                      <td className="py-1.5 text-center">
                        <div className="inline-flex items-center gap-1 font-semibold text-slate-700 tabular-nums">
                          <span>{g.debtSharePercent}%</span>
                          <div className="h-1.5 w-8 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-rose-500"
                              style={{ width: `${Math.min(100, g.debtSharePercent * 2.5)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-1.5 text-right font-bold text-slate-900 tabular-nums">
                        {g.debtAmountFormatted}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Drilldown button */}
          <div className="border-t border-slate-100 pt-2 text-center">
            <Link
              href="/groups"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition-colors"
            >
              Все группы школы →
            </Link>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 5. MODALS & DRILL-DOWNS                                               */}
      {/* ==================================================================== */}

      {/* MODAL 1: Все направления */}
      {isDirectionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Все финансовые показатели по направлениям
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Полная разбивка выручки, среднего чека и задолженности по всем курсам
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDirectionsModalOpen(false)}
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
                  placeholder="Поиск по направлению..."
                  value={directionsSearchTerm}
                  onChange={(e) => setDirectionsSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={handleExportDirectionsCSV}
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
                    <th className="py-2.5 px-3">Направление</th>
                    <th className="py-2.5 px-3 text-center">Учеников</th>
                    <th className="py-2.5 px-3 text-right">Выручка</th>
                    <th className="py-2.5 px-3 text-right">Ср. чек</th>
                    <th className="py-2.5 px-3 text-right">Задолженность</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDirections.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {d.name}
                      </td>
                      <td className="py-2 px-3 text-center font-medium text-slate-600 tabular-nums">
                        {d.studentsCount}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">
                        {d.revenueFormatted}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-slate-600 tabular-nums">
                        {d.avgCheckFormatted}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        <span className="inline-block px-2 py-0.5 rounded font-bold text-rose-700 bg-rose-50 text-[11px]">
                          {d.debtFormatted}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsDirectionsModalOpen(false)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Все должники */}
      {isDebtorsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                  Реестр учеников с задолженностью
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Всего должников: {debtsSummary.debtorsCount} | Общая сумма долга:{' '}
                  {debtsSummary.totalDebtFormatted}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDebtorsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[360px] overflow-y-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2 px-3">Ученик</th>
                    <th className="py-2 px-3">Группа</th>
                    <th className="py-2 px-3 text-right">Сумма долга</th>
                    <th className="py-2 px-3 text-center">Срок оплаты</th>
                    <th className="py-2 px-3 text-center">Просрочка</th>
                    <th className="py-2 px-3 text-right">Риск</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {debtsSummary.debtorsList.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        <Link
                          href={`/students/${row.studentId}`}
                          className="hover:text-blue-600 hover:underline transition-colors"
                        >
                          {row.studentName}
                        </Link>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{row.groupName}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">
                        {row.debtFormatted}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-500 tabular-nums">
                        {row.overdueDate}
                      </td>
                      <td className="py-2 px-3 text-center font-semibold text-rose-600 tabular-nums">
                        {row.daysOverdue} дн.
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span
                          className={cn(
                            'inline-block px-2 py-0.5 rounded text-[10px] font-bold',
                            row.riskLevel === 'Высокий'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          )}
                        >
                          {row.riskLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link
                href="/finance?filter=overdue"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition-colors"
              >
                Открыть раздел счетов и платежей →
              </Link>
              <button
                type="button"
                onClick={() => setIsDebtorsModalOpen(false)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Детализация финансовых потерь */}
      {isLossDetailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Потенциально недополученная выручка
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Суммарные потери: {lossAnalysis.potentialLossFormatted} (32% от потенциала)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLossDetailsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {lossAnalysis.items.map((cat) => (
                <div key={cat.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span>{cat.title}</span>
                    <span className="font-bold text-slate-900">{cat.amountFormatted}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Затронуто: {cat.count} учеников/счетов</span>
                    <span>Доля: {cat.sharePercent}%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link
                href="/finance?filter=losses"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition-colors"
              >
                Перейти в финансы для взыскания →
              </Link>
              <button
                type="button"
                onClick={() => setIsLossDetailsModalOpen(false)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
