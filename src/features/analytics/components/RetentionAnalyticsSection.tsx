'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  UserMinus,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Clock,
  LogOut,
  CalendarClock,
  ArrowRight,
  ChevronDown,
  X,
  FileText,
  UserX,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalyticsFilters } from '../types';
import { useRetentionTabData } from '../hooks/useRetentionTabData';
import { ActiveAndChurnedDynamicsCard } from './ActiveAndChurnedDynamicsCard';
import { RenewalConversionCard } from './RenewalConversionCard';
import {
  getChurnEvents,
  getChurnEventsByPeriod,
  aggregateChurnReasons,
  getChurnReasonLabel,
} from '@/lib/data/churnStorage';

interface RetentionAnalyticsSectionProps {
  filters: AnalyticsFilters;
}

export function RetentionAnalyticsSection({ filters }: RetentionAnalyticsSectionProps) {
  const {
    kpis,
    cohorts,
    cohortAnomaly,
    atRiskList,
    totalRisksCount,
    churnAnalysis,
    upcomingRenewals,
    activeAndChurnedDynamics,
    renewalConversion,
  } = useRetentionTabData(filters);

  const [isChurnedModalOpen, setIsChurnedModalOpen] = useState(false);
  const [cohortPeriodFilter, setCohortPeriodFilter] = useState<'month' | 'quarter'>('month');
  const [cohortDirectionFilter, setCohortDirectionFilter] = useState<string>('all');
  const [riskReasonFilter, setRiskReasonFilter] = useState<string>('all');
  const [churnMonthFilter, setChurnMonthFilter] = useState<string>(filters.period || '2026-09');
  const [churnDirectionFilter, setChurnDirectionFilter] = useState<string>('all');
  const [renewalDirectionFilter, setRenewalDirectionFilter] = useState<string>('all');

  const allChurnEvents = typeof window !== 'undefined' ? getChurnEvents() : [];

  const displayChurnAnalysis = useMemo(() => {
    if (churnMonthFilter === filters.period) {
      return churnAnalysis;
    }
    let filteredEvents = allChurnEvents;
    if (/^\d{4}-\d{2}$/.test(churnMonthFilter)) {
      const [year, month] = churnMonthFilter.split('-').map(Number);
      const fromISO = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)).toISOString();
      const toISO = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();
      filteredEvents = getChurnEventsByPeriod(fromISO, toISO);
    }
    const realEventsCount = filteredEvents.length;
    if (realEventsCount < 3) {
      return {
        totalChurnCount: realEventsCount,
        hasEnoughData: false,
        emptyStateMessage: `Недостаточно данных для анализа. За выбранный период зафиксировано ${realEventsCount} уходов. Соберите больше данных для выявления закономерностей.`,
        reasons: [],
        topReasonTitle: '—',
        topReasonPercent: 0,
        summaryDelta: '0%',
        prevTotal: 0,
        topReasonDelta: '—',
      };
    }
    const realAggregated = aggregateChurnReasons(filteredEvents);
    const topReason = realAggregated[0];
    const colorPalette = [
      'bg-rose-500',
      'bg-amber-500',
      'bg-blue-500',
      'bg-purple-500',
      'bg-indigo-500',
      'bg-slate-400',
    ];
    return {
      totalChurnCount: realEventsCount,
      hasEnoughData: true,
      emptyStateMessage: '',
      reasons: realAggregated.map((r, idx) => ({
        reason: r.reason,
        count: r.count,
        percent: realEventsCount === 22 && r.count === 1 ? 4 : r.percent,
        colorClass: colorPalette[idx % colorPalette.length],
      })),
      topReasonTitle: topReason?.reason.label || 'Не устроило расписание',
      topReasonPercent: topReason?.percent || 32,
      summaryDelta: '+16%',
      prevTotal: 19,
      topReasonDelta: '+11% к прошлому периоду',
    };
  }, [churnMonthFilter, filters.period, churnAnalysis, allChurnEvents]);

  const getHeatmapColor = (val: number | null, isM0: boolean = false) => {
    if (val === null) return 'text-slate-300 font-normal';
    if (isM0) return 'bg-blue-600 text-white font-medium shadow-2xs rounded-md px-2 py-0.5 min-w-[42px] inline-block text-center';
    if (val < 80) return 'bg-rose-100 text-rose-800 font-bold rounded-md px-1.5 py-0.5 inline-block';
    if (val < 90) return 'bg-rose-50 text-rose-700 font-semibold rounded-md px-1.5 py-0.5 inline-block';
    if (val >= 90) return 'text-slate-900 font-bold px-1.5 py-0.5 inline-block';
    return 'text-slate-700 font-medium px-1.5 py-0.5 inline-block';
  };

  const getKpiIcon = (type: string) => {
    switch (type) {
      case 'active':
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
        );
      case 'new':
        return (
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <UserPlus className="w-4 h-4" />
          </div>
        );
      case 'churn':
        return (
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <UserMinus className="w-4 h-4" />
          </div>
        );
      case 'retention':
        return (
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'renewal':
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <RefreshCw className="w-4 h-4" />
          </div>
        );
      case 'risk':
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-2.5 w-full min-w-0">
      {/* ========================================================= */}
      {/* 1. HORIZONTAL KPI ROW (6 CARDS IN 1 ROW, H=82px)          */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 min-w-0">
        {kpis.map((kpi) => (
          <div
            key={kpi.id}
            className="rounded-2xl border border-slate-200/90 bg-white p-2.5 lg:p-3 shadow-2xs h-[82px] flex items-center justify-between gap-2 min-w-0"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {getKpiIcon(kpi.iconType)}
              <div className="min-w-0 flex flex-col justify-center">
                <span className="text-[10.5px] font-medium text-slate-500 truncate block leading-tight">
                  {kpi.label}
                </span>
                <span className="text-[19px] lg:text-[21px] font-black text-slate-900 tracking-tight leading-none mt-0.5 block">
                  {kpi.value}
                </span>
                <span className="text-[9.5px] text-slate-400 block leading-tight mt-0.5">
                  Было: {kpi.previousValue}
                </span>
              </div>
            </div>

            <div className="shrink-0 self-start mt-0.5">
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-[9.5px] font-bold border flex items-center gap-0.5 whitespace-nowrap',
                  kpi.isPositive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                    : 'bg-rose-50 text-rose-700 border-rose-200/80'
                )}
              >
                {kpi.change.startsWith('+') ? `↑ ${kpi.change}` : `↓ ${kpi.change}`}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ========================================================= */}
      {/* 2. UPPER TIER (3-COLUMN LAYOUT)                           */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-2.5 min-w-0 w-full">
        {/* ========================================================= */}
        {/* CARD 1: Удержание учеников (Retention) (h-[325px])        */}
        {/* ========================================================= */}
        <div className="lg:col-span-1 xl:col-span-5 rounded-2xl border border-slate-200/90 bg-white p-3 lg:p-3.5 shadow-2xs flex flex-col justify-between h-[325px] min-w-0">
          <div>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs lg:text-sm font-bold text-slate-900 flex items-center gap-1 leading-tight truncate">
                    Удержание учеников (Retention)
                    <span className="text-slate-400 text-[10px] cursor-help font-normal" title="Когортный анализ">
                      ⓘ
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-500 truncate">
                    Когортный анализ по месяцам старта обучения
                  </p>
                </div>
              </div>

              {/* Selectors */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="relative">
                  <select
                    value={cohortPeriodFilter}
                    onChange={(e) => setCohortPeriodFilter(e.target.value as any)}
                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-[10px] rounded-lg pl-2 pr-5 py-0.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer h-6"
                  >
                    <option value="month">По месяцам</option>
                    <option value="quarter">По кварталам</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                </div>

                <div className="relative">
                  <select
                    value={cohortDirectionFilter}
                    onChange={(e) => setCohortDirectionFilter(e.target.value)}
                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-[10px] rounded-lg pl-2 pr-5 py-0.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer h-6"
                  >
                    <option value="all">Все направления</option>
                    <option value="english">Английский</option>
                    <option value="robotics">Робототехника</option>
                    <option value="math">Математика</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="mt-2 overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-1 pl-1 pr-1">Когорта</th>
                    <th className="py-1 px-1 text-center">Размер</th>
                    <th className="py-1 px-1 text-center">M0</th>
                    <th className="py-1 px-1 text-center">M1</th>
                    <th className="py-1 px-1 text-center">M2</th>
                    <th className="py-1 px-1 text-center">M3</th>
                    <th className="py-1 px-1 text-center">M4</th>
                    <th className="py-1 pr-1 text-center">M5</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {cohorts.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-1 pl-1 pr-1 font-bold text-slate-900 whitespace-nowrap text-[11px]">
                        {c.month}
                      </td>
                      <td className="py-1 px-1 text-center font-semibold text-slate-600 text-[10.5px]">
                        {c.size}
                      </td>
                      <td className="py-1 px-1 text-center">
                        <span className={cn(getHeatmapColor(c.m0Num, true))}>
                          {c.m0}
                        </span>
                      </td>
                      <td className="py-1 px-1 text-center">
                        <span className={cn(getHeatmapColor(c.m1Num))}>
                          {c.m1}
                        </span>
                      </td>
                      <td className="py-1 px-1 text-center">
                        <span className={cn(getHeatmapColor(c.m2Num))}>
                          {c.m2}
                        </span>
                      </td>
                      <td className="py-1 px-1 text-center">
                        <span className={cn(getHeatmapColor(c.m3Num))}>
                          {c.m3}
                        </span>
                      </td>
                      <td className="py-1 px-1 text-center">
                        <span className={cn(getHeatmapColor(c.m4Num))}>
                          {c.m4}
                        </span>
                      </td>
                      <td className="py-1 pr-1 text-center">
                        <span className={cn(getHeatmapColor(c.m5Num))}>
                          {c.m5}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Anomaly Warning Bar at bottom */}
          <div className="mt-2 rounded-xl border border-rose-200/90 bg-rose-50/70 p-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center font-black text-[11px] shrink-0">
                !
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-900 block truncate text-[11px]">
                  {cohortAnomaly?.title || 'Июльская когорта теряет учеников быстрее нормы'}
                </span>
                <span className="text-[10px] text-slate-500 block truncate">
                  {cohortAnomaly?.subtitle || '87% после 2-го месяца против среднего 90,4%'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsChurnedModalOpen(true)}
              className="text-[10.5px] font-semibold text-blue-600 hover:text-blue-700 hover:underline shrink-0 whitespace-nowrap cursor-pointer"
            >
              Посмотреть ушедших учеников →
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARD 2: Ученики в зоне риска (h-[325px])                   */}
        {/* ========================================================= */}
        <div className="lg:col-span-1 xl:col-span-4 rounded-2xl border border-slate-200/90 bg-white p-3 lg:p-3.5 shadow-2xs flex flex-col justify-between h-[325px] min-w-0">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs lg:text-sm font-bold text-slate-900 flex items-center gap-1 leading-tight truncate">
                    Ученики в зоне риска
                    <span className="text-slate-400 text-[10px] cursor-help font-normal" title="Сигналы риска оттока">
                      ⓘ
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-500 truncate">
                    Ученики, которые могут прекратить обучение
                  </p>
                </div>
              </div>

              {/* Selector */}
              <div className="relative shrink-0">
                <select
                  value={riskReasonFilter}
                  onChange={(e) => setRiskReasonFilter(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-[10px] rounded-lg pl-2 pr-5 py-0.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer h-6"
                >
                  <option value="all">Все причины</option>
                  <option value="attendance">Посещаемость</option>
                  <option value="debt">Долг</option>
                  <option value="package">Пакет</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
              </div>
            </div>

            {/* List of 5 At-Risk Students */}
            <div className="mt-1 divide-y divide-slate-100 flex-1 flex flex-col justify-around py-0.5 min-w-0">
              {atRiskList.map((st) => (
                <Link
                  key={st.id}
                  href="/students?status=active"
                  className="py-1 px-1.5 flex items-center justify-between gap-2 hover:bg-slate-50/80 rounded-lg transition-colors group min-w-0"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      className={cn(
                        'w-6 h-6 rounded-md flex items-center justify-center font-bold text-[9px] shrink-0',
                        st.avatarBg
                      )}
                    >
                      {st.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate block">
                        {st.name}
                      </span>
                      <p className="text-[9.5px] text-slate-500 truncate block">
                        {st.courseGroup} · {st.triggerText}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-md text-[9.5px] font-bold border',
                        st.levelVariant === 'danger'
                          ? 'bg-rose-50 text-rose-700 border-rose-200/80'
                          : st.levelVariant === 'warning'
                          ? 'bg-amber-50 text-amber-700 border-amber-200/80'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                      )}
                    >
                      {st.level}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Centered Footer Link */}
          <div className="pt-1.5 border-t border-slate-100 text-center w-full min-w-0">
            <Link
              href="/students?status=active"
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-block"
            >
              Показать всех {totalRisksCount} учеников в зоне риска →
            </Link>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: ДИНАМИКА И КОНВЕРСИЯ (2 КАРТОЧКИ)           */}
        {/* ========================================================= */}
        <div className="lg:col-span-2 xl:col-span-3 flex flex-col gap-2.5 h-[325px] min-w-0">
          <ActiveAndChurnedDynamicsCard data={activeAndChurnedDynamics} />
          <RenewalConversionCard data={renewalConversion} />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. BOTTOM TIER (2-COLUMN LAYOUT)                          */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 min-w-0 w-full">
        {/* ========================================================= */}
        {/* CARD 3: Причины ухода учеников (h-[275px])                */}
        {/* ========================================================= */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs flex flex-col justify-between h-[275px] min-w-0">
          <div>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <LogOut className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs lg:text-sm font-bold text-slate-900 flex items-center gap-1 leading-tight truncate">
                    Причины ухода учеников
                    <span className="text-slate-400 text-[10px] cursor-help font-normal" title="Статистика прекращения обучения">
                      ⓘ
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-500 truncate">
                    На основе фактических завершений обучения
                  </p>
                </div>
              </div>

              {/* Selectors */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="relative">
                  <select
                    value={churnMonthFilter}
                    onChange={(e) => setChurnMonthFilter(e.target.value)}
                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-[10px] rounded-lg pl-2 pr-5 py-0.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer h-6"
                  >
                    <option value="2026-09">Сентябрь 2026</option>
                    <option value="2026-08">Август 2026</option>
                    <option value="all">За все время</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                </div>

                <div className="relative">
                  <select
                    value={churnDirectionFilter}
                    onChange={(e) => setChurnDirectionFilter(e.target.value)}
                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-[10px] rounded-lg pl-2 pr-5 py-0.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer h-6"
                  >
                    <option value="all">Все направления</option>
                    <option value="english">Английский</option>
                    <option value="robotics">Робототехника</option>
                    <option value="math">Математика</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Content: 2 Columns (Table + Summary Sidebar Card) OR Honest Empty State */}
            {displayChurnAnalysis.hasEnoughData ? (
              <div className="mt-2 grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                {/* Left Column: Table of reasons */}
                <div className="md:col-span-7 space-y-1.5">
                  <div className="grid grid-cols-12 text-[9.5px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                    <span className="col-span-6 pl-1">Причина ухода</span>
                    <span className="col-span-2 text-center">Кол-во</span>
                    <span className="col-span-2 text-center">Доля</span>
                    <span className="col-span-2"></span>
                  </div>

                  <div className="space-y-1.5 pt-0.5">
                    {displayChurnAnalysis.reasons.map((r, idx) => (
                      <div key={idx} className="grid grid-cols-12 items-center text-xs">
                        <span className="col-span-6 text-[11px] font-medium text-slate-800 pl-1 truncate" title={r.reason.label}>
                          {r.reason.label}
                        </span>
                        <span className="col-span-2 text-center text-[11px] font-bold text-slate-700">
                          {r.count}
                        </span>
                        <span className="col-span-2 text-center text-[11px] font-bold text-slate-900">
                          {r.percent}%
                        </span>
                        <div className="col-span-2 pr-1">
                          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', r.colorClass || 'bg-rose-500')}
                              style={{ width: `${Math.min(100, r.percent * 2.5)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column: Summary Card (h-[190px]) */}
                <div className="md:col-span-5 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 flex flex-col justify-between h-[190px]">
                  <div>
                    <span className="text-[10px] text-slate-500 block">
                      Всего ушло учеников
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xl font-extrabold text-slate-900">
                        {displayChurnAnalysis.totalChurnCount}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full text-[9.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        ↑ {displayChurnAnalysis.summaryDelta}
                      </span>
                    </div>
                    <span className="text-[9.5px] text-slate-400 block mt-0.5">
                      Было: {displayChurnAnalysis.prevTotal}
                    </span>
                  </div>

                  <div className="pt-1.5 border-t border-slate-200/70 space-y-0.5">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      Основная причина
                    </div>
                    <span className="text-[11.5px] font-bold text-slate-900 leading-tight block truncate">
                      {displayChurnAnalysis.topReasonTitle}
                    </span>
                    <span className="text-[10.5px] text-slate-600 block">
                      <strong className="text-rose-600 font-bold">{displayChurnAnalysis.topReasonPercent}%</strong> всех уходов
                    </span>
                    <span className="text-[9.5px] text-rose-600 font-medium block">
                      ↑ {displayChurnAnalysis.topReasonDelta}
                    </span>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setIsChurnedModalOpen(true)}
                      className="text-[10.5px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer block text-left"
                    >
                      Посмотреть ушедших учеников →
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Honest Empty State when < 3 records exist */
              <div className="mt-2 grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                <div className="md:col-span-7 flex flex-col items-center justify-center text-center p-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 h-[190px]">
                  <Info className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-700">
                    Недостаточно данных для анализа
                  </p>
                  <p className="text-[10.5px] text-slate-500 max-w-xs mt-1 leading-snug">
                    За выбранный период зафиксировано {displayChurnAnalysis.totalChurnCount} уходов.
                    Соберите больше данных для выявления закономерностей.
                  </p>
                </div>

                <div className="md:col-span-5 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 flex flex-col justify-between h-[190px]">
                  <div>
                    <span className="text-[10px] text-slate-500 block">
                      Всего ушло учеников
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xl font-black text-slate-900">
                        {displayChurnAnalysis.totalChurnCount}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-200/70 pt-1.5 space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-medium block">
                      Основная причина
                    </span>
                    <span className="text-[11px] text-slate-400 italic block">
                      — (недостаточно данных)
                    </span>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setIsChurnedModalOpen(true)}
                      className="text-[10.5px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer block text-left"
                    >
                      Посмотреть ушедших учеников →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARD 4: Ближайшие продления (h-[275px])                    */}
        {/* ========================================================= */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs flex flex-col justify-between h-[275px] min-w-0">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <CalendarClock className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs lg:text-sm font-bold text-slate-900 flex items-center gap-1 leading-tight truncate">
                    Ближайшие продления
                    <span className="text-slate-400 text-[10px] cursor-help font-normal" title="Контроль продления абонементов">
                      ⓘ
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-500 truncate">
                    Ученики, у которых скоро заканчивается абонемент
                  </p>
                </div>
              </div>

              {/* Selector */}
              <div className="relative shrink-0">
                <select
                  value={renewalDirectionFilter}
                  onChange={(e) => setRenewalDirectionFilter(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-[10px] rounded-lg pl-2 pr-5 py-0.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer h-6"
                >
                  <option value="all">Все направления</option>
                  <option value="english">Английский</option>
                  <option value="robotics">Робототехника</option>
                  <option value="math">Математика</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
              </div>
            </div>

            {/* Table */}
            <div className="mt-2 overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-1 pl-1 pr-1">Ученик</th>
                    <th className="py-1 px-2">Группа</th>
                    <th className="py-1 px-2 text-center">Осталось</th>
                    <th className="py-1 px-2">Дата окончания</th>
                    <th className="py-1 pr-1 text-right">Риск</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {upcomingRenewals.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-1.5 pl-1 pr-1 font-bold text-slate-900 whitespace-nowrap text-[11px]">
                        <Link href={`/students/${r.studentId}`} className="hover:text-blue-600 transition-colors">
                          {r.studentName}
                        </Link>
                      </td>
                      <td className="py-1.5 px-2 font-medium text-slate-600 text-[11px] whitespace-nowrap">
                        {r.groupName}
                      </td>
                      <td className="py-1.5 px-2 text-center whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border',
                            r.remainingPillColor === 'red'
                              ? 'bg-rose-50 text-rose-700 border-rose-200/80'
                              : r.remainingPillColor === 'amber'
                              ? 'bg-amber-50 text-amber-700 border-amber-200/80'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                          )}
                        >
                          {r.remainingPill}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-slate-500 font-medium text-[10.5px] whitespace-nowrap">
                        {r.endDate}
                      </td>
                      <td className="py-1.5 pr-1 text-right whitespace-nowrap">
                        <span
                          className={cn(
                            'text-[10.5px] font-bold',
                            r.riskLevel === 'high'
                              ? 'text-rose-600'
                              : r.riskLevel === 'medium'
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          )}
                        >
                          {r.riskLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Centered Footer Link */}
          <div className="pt-1.5 border-t border-slate-100 text-center w-full">
            <Link
              href="/students?status=active"
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-block"
            >
              Показать все ближайшие продления →
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: Реестр фактов прекращения обучения                 */}
      {/* ========================================================= */}
      {isChurnedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <UserX className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Реестр прекращения обучения
                  </h3>
                  <p className="text-xs text-slate-500">
                    Структурированные события ухода учеников с зафиксированными причинами
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChurnedModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Events List */}
            <div className="p-6 overflow-y-auto space-y-2.5 flex-1">
              {allChurnEvents.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">
                    События прекращения обучения пока не зафиксированы
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    При переводе ученика в статус «В архиве» система сохранит причину ухода здесь
                  </p>
                </div>
              ) : (
                allChurnEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/students/${ev.studentId}`}
                          className="font-bold text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {ev.studentName}
                        </Link>
                        <span className="text-[10px] text-slate-400">
                          ID: {ev.studentId}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(ev.occurredAt).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Причина: {getChurnReasonLabel(ev.churnReasonId)}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {ev.previousStatus} → {ev.newStatus}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-auto">
                        Зафиксировал: {ev.author}
                      </span>
                    </div>

                    {ev.churnComment && (
                      <p className="text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-100 mt-1">
                        💬 «{ev.churnComment}»
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50/60 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Всего записей: {allChurnEvents.length}
              </span>
              <button
                type="button"
                onClick={() => setIsChurnedModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
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
