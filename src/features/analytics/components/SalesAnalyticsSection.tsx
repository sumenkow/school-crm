'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Percent,
  Banknote,
  Layers,
  Filter,
  BarChart3,
  Clock,
  AlertTriangle,
  AlertCircle,
  Search,
  Download,
  ChevronDown,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalyticsFilters } from '../types';
import { useSalesTabData } from '../hooks/useSalesTabData';

interface SalesAnalyticsSectionProps {
  filters: AnalyticsFilters;
  courses?: Array<{ id: string; name: string }>;
}

export function SalesAnalyticsSection({ filters }: SalesAnalyticsSectionProps) {
  const {
    kpis,
    funnelStages,
    funnelAnomaly,
    channels,
    dynamics,
    speedMetrics,
    lossReasons,
    managers,
    detailedLeads,
  } = useSalesTabData(filters);

  // Local filters for Detailed Leads Table
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [selectedManager, setSelectedManager] = useState('all');
  const [dynamicsPeriod, setDynamicsPeriod] = useState<'month' | 'week'>('month');

  // Filtered detailed leads
  const filteredDetailedLeads = useMemo(() => {
    return detailedLeads.filter((row) => {
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesQuery =
          row.leadName.toLowerCase().includes(query) ||
          row.contact.toLowerCase().includes(query) ||
          row.channel.toLowerCase().includes(query) ||
          row.managerName.toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }
      if (selectedStage !== 'all') {
        if (selectedStage === 'paid' && row.statusBadge.variant !== 'success') return false;
        if (selectedStage === 'lost' && row.statusBadge.variant !== 'danger') return false;
        if (selectedStage === 'in_progress' && row.statusBadge.variant !== 'info') return false;
      }
      if (selectedChannel !== 'all') {
        if (row.channelKey !== selectedChannel) return false;
      }
      if (selectedManager !== 'all') {
        if (!row.managerName.includes(selectedManager)) return false;
      }
      return true;
    });
  }, [detailedLeads, searchTerm, selectedStage, selectedChannel, selectedManager]);

  // CSV Export handler
  const handleExportCSV = () => {
    const headers = ['Дата', 'Лид', 'Контакт', 'Канал', 'Этап', 'Менеджер', 'Причина потери', 'Сумма', 'Статус'];
    const rows = filteredDetailedLeads.map((l) => [
      l.date,
      `"${l.leadName}"`,
      `"${l.contact}"`,
      `"${l.channel}"`,
      `"${l.stageLabel}"`,
      `"${l.managerName}"`,
      `"${l.lossReasonText}"`,
      `"${l.offerAmountText}"`,
      `"${l.statusBadge.label}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_sales_${filters.period || '2026-09'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full flex flex-col space-y-2.5 pb-8 animate-in fade-in duration-200">
      {/* ========================================================= */}
      {/* 1. TOP ROW: 6 KPI CARDS (h-[82px], grid-cols-6)            */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 shrink-0">
        {kpis.map((kpi) => {
          let IconComponent = Users;
          let iconColor = 'text-blue-600 bg-blue-50';
          if (kpi.iconType === 'trials') {
            IconComponent = CalendarClock;
            iconColor = 'text-sky-600 bg-sky-50';
          } else if (kpi.iconType === 'trials_held') {
            IconComponent = CheckCircle2;
            iconColor = 'text-indigo-600 bg-indigo-50';
          } else if (kpi.iconType === 'paid') {
            IconComponent = CreditCard;
            iconColor = 'text-amber-600 bg-amber-50';
          } else if (kpi.iconType === 'conversion') {
            IconComponent = Percent;
            iconColor = 'text-emerald-600 bg-emerald-50';
          } else if (kpi.iconType === 'revenue') {
            IconComponent = Banknote;
            iconColor = 'text-emerald-600 bg-emerald-50';
          }

          return (
            <div
              key={kpi.id}
              className="h-[82px] rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-2xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={cn('p-1 rounded-md shrink-0', iconColor)}>
                    <IconComponent className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
                    {kpi.label}
                  </span>
                </div>
                {kpi.change !== '—' && (
                  <span
                    className={cn(
                      'text-[9.5px] font-bold px-1 py-0.5 rounded leading-none shrink-0',
                      kpi.isPositive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                    )}
                  >
                    {kpi.change}
                  </span>
                )}
              </div>

              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-black text-slate-900 tracking-tight leading-none">
                  {kpi.value}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {kpi.previousValue}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* 2. TIER 1: ВОРОНКА (5 cols) | КАНАЛЫ (4 cols) | ДИНАМИКА (3 cols) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 shrink-0">
        {/* 2.1. Воронка продаж (Top-Left, 5 cols, h-[330px]) */}
        <div className="lg:col-span-5 h-[330px] rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-blue-50 text-blue-600">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 leading-none">Воронка продаж</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
                    Переходы между этапами и конверсия
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-600 inline-block" />
                  Текущий период
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-300 inline-block" />
                  Прошлый период
                </span>
              </div>
            </div>

            {/* Funnel Stages Table */}
            <div className="mt-1.5 space-y-0.5">
              <div className="grid grid-cols-12 text-[9.5px] uppercase font-bold text-slate-400 px-1 pb-0.5">
                <span className="col-span-5">Этап</span>
                <span className="col-span-2 text-right">Сейчас</span>
                <span className="col-span-2 text-right">Было</span>
                <span className="col-span-3 text-right">Конверсия / Изм.</span>
              </div>

              {funnelStages.map((stage) => (
                <div
                  key={stage.id}
                  className="grid grid-cols-12 items-center text-xs py-0.5 px-1 rounded-md hover:bg-slate-50 transition-colors"
                >
                  <div className="col-span-5 flex flex-col justify-center min-w-0 pr-1">
                    <span className="text-[11px] font-bold text-slate-800 truncate leading-tight">
                      {stage.label}
                    </span>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full mt-1 overflow-hidden relative">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${stage.barPercentageCurrent}%` }}
                      />
                    </div>
                  </div>

                  <span className="col-span-2 text-right font-extrabold text-slate-900 text-xs">
                    {stage.countCurrent}
                  </span>

                  <span className="col-span-2 text-right font-medium text-slate-400 text-xs">
                    {stage.countPrevious}
                  </span>

                  <div className="col-span-3 text-right flex items-center justify-end gap-1.5">
                    <span className="font-bold text-slate-700 text-[11px]">
                      {stage.conversionRate}
                    </span>
                    <span
                      className={cn(
                        'text-[9.5px] font-bold px-1 py-0.5 rounded leading-none',
                        stage.changeType === 'positive'
                          ? 'bg-emerald-50 text-emerald-700'
                          : stage.changeType === 'negative'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-slate-50 text-slate-600'
                      )}
                    >
                      {stage.changeText}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Funnel Anomaly Alert */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between bg-rose-50/60 -mx-3 -mb-3 p-2.5 rounded-b-xl border-t-rose-100">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10.5px] font-bold text-rose-900 truncate leading-tight">
                  Главный провал: «Пробный состоялся → Оплата»
                </p>
                <p className="text-[9.5px] text-rose-700 truncate leading-tight mt-0.5">
                  Конверсия снизилась на 33 п.п. по сравнению с прошлым периодом
                </p>
              </div>
            </div>
            <Link
              href="/crm"
              className="text-[10.5px] font-bold text-blue-600 hover:text-blue-700 hover:underline shrink-0 pl-2 inline-flex items-center gap-1"
            >
              Посмотреть лиды →
            </Link>
          </div>
        </div>

        {/* 2.2. Лиды по каналам (Top-Center, 4 cols, h-[330px]) */}
        <div className="lg:col-span-4 h-[330px] rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-indigo-50 text-indigo-600">
                  <Filter className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 leading-none">Лиды по каналам</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
                    Откуда приходят клиенты и какая конверсия
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold px-2 py-0.5 rounded border border-slate-200 bg-slate-50">
                По лидам ▾
              </span>
            </div>

            {/* Channels Table */}
            <div className="mt-2 space-y-1.5">
              <div className="grid grid-cols-12 text-[9.5px] uppercase font-bold text-slate-400 px-1 pb-0.5">
                <span className="col-span-4">Канал</span>
                <span className="col-span-2 text-right">Лиды</span>
                <span className="col-span-2 text-right">Пробн.</span>
                <span className="col-span-2 text-right">Оплаты</span>
                <span className="col-span-2 text-right">Конв.</span>
              </div>

              {channels.map((ch) => (
                <div
                  key={ch.id}
                  className="grid grid-cols-12 items-center text-xs py-1.5 px-1 rounded-md hover:bg-slate-50 transition-colors"
                >
                  <div className="col-span-4 flex items-center gap-1.5 min-w-0">
                    <span className={cn('h-2 w-2 rounded-full shrink-0', ch.colorDot)} />
                    <span className="text-[11px] font-bold text-slate-800 truncate">
                      {ch.label}
                    </span>
                  </div>

                  <span className="col-span-2 text-right font-bold text-slate-900 text-xs">
                    {ch.leadsCount}
                  </span>

                  <span className="col-span-2 text-right font-medium text-slate-500 text-xs">
                    {ch.trialsCount}
                  </span>

                  <span className="col-span-2 text-right font-bold text-slate-900 text-xs">
                    {ch.paidCount}
                  </span>

                  <span
                    className={cn(
                      'col-span-2 text-right font-bold text-[11px]',
                      ch.conversionType === 'positive'
                        ? 'text-emerald-600'
                        : ch.conversionType === 'negative'
                        ? 'text-rose-600'
                        : 'text-slate-600'
                    )}
                  >
                    {ch.conversionRate}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Centered Footer Link */}
          <div className="pt-2 border-t border-slate-100 text-center w-full">
            <Link
              href="/crm"
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-block"
            >
              Посмотреть лиды по каналам →
            </Link>
          </div>
        </div>

        {/* 2.3. Динамика и Скорость (Top-Right, 3 cols, h-[330px]) */}
        <div className="lg:col-span-3 h-[330px] flex flex-col space-y-2.5">
          {/* Top Half: Динамика лидов и оплат */}
          <div className="h-[175px] rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div>
                <h3 className="text-xs font-bold text-slate-900 leading-none">Динамика лидов и оплат</h3>
                <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-400">
                  <span className="flex items-center gap-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> Лиды
                  </span>
                  <span className="flex items-center gap-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400" /> Пробные
                  </span>
                  <span className="flex items-center gap-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Оплаты
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDynamicsPeriod(dynamicsPeriod === 'month' ? 'week' : 'month')}
                className="text-[9.5px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 cursor-pointer"
              >
                {dynamicsPeriod === 'month' ? 'По месяцам ▾' : 'По неделям ▾'}
              </button>
            </div>

            {/* Mini Histogram Bars */}
            <div className="flex items-end justify-between h-[90px] pt-1 px-1">
              {(dynamicsPeriod === 'month' ? dynamics.byMonth : dynamics.byWeek).map((pt) => {
                const maxVal = 45;
                const hLeads = Math.round((pt.leadsCount / maxVal) * 65);
                const hTrials = Math.round((pt.trialsCount / maxVal) * 65);
                const hPaid = Math.round((pt.paidCount / maxVal) * 65);

                return (
                  <div key={pt.label} className="flex flex-col items-center gap-1">
                    <div className="flex items-end gap-0.5 h-[65px]">
                      <div
                        className="w-1.5 bg-blue-600 rounded-t-xs"
                        style={{ height: `${Math.max(6, hLeads)}px` }}
                        title={`Лиды: ${pt.leadsCount}`}
                      />
                      <div
                        className="w-1.5 bg-sky-400 rounded-t-xs"
                        style={{ height: `${Math.max(4, hTrials)}px` }}
                        title={`Пробные: ${pt.trialsCount}`}
                      />
                      <div
                        className="w-1.5 bg-amber-400 rounded-t-xs"
                        style={{ height: `${Math.max(3, hPaid)}px` }}
                        title={`Оплаты: ${pt.paidCount}`}
                      />
                    </div>
                    <span className="text-[9px] font-medium text-slate-400">{pt.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Half: Скорость обработки лидов */}
          <div className="h-[142px] rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 leading-none">Скорость обработки лидов</h3>
              </div>
              <span className="text-[9px] font-semibold text-slate-400">Все менеджеры ▾</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 py-1 text-center">
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 flex flex-col justify-center">
                <span className="text-[9px] text-slate-400 leading-tight">Ср. время 1-го контакта</span>
                <span className="text-xs font-black text-slate-900 mt-0.5">
                  {speedMetrics.avgFirstContactTime}
                </span>
                <span className="text-[8.5px] font-bold text-emerald-600 mt-0.5">
                  {speedMetrics.avgFirstContactDelta}
                </span>
              </div>

              <div className="p-1.5 rounded-lg bg-rose-50/70 border border-rose-100 flex flex-col justify-center">
                <span className="text-[9px] text-rose-700 leading-tight font-medium">Лидов &gt; 24 часов</span>
                <span className="text-sm font-black text-rose-700 mt-0.5">
                  ⚠ {speedMetrics.leadsOver24hCount}
                </span>
                <span className="text-[8.5px] font-bold text-rose-600 mt-0.5">
                  {speedMetrics.leadsOver24hDelta}
                </span>
              </div>

              <div className="p-1.5 rounded-lg bg-rose-50/70 border border-rose-100 flex flex-col justify-center">
                <span className="text-[9px] text-rose-700 leading-tight font-medium">Без контакта</span>
                <span className="text-sm font-black text-rose-700 mt-0.5">
                  ⚠ {speedMetrics.leadsNoContactCount}
                </span>
                <span className="text-[8.5px] font-bold text-rose-600 mt-0.5">
                  {speedMetrics.leadsNoContactDelta}
                </span>
              </div>
            </div>

            <div className="text-[9.5px] text-center text-slate-400">
              <Link href="/crm?status=new" className="text-blue-600 hover:underline font-semibold">
                Показать лиды без контакта →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. TIER 2: ПРИЧИНЫ ПОТЕРЬ (6 cols) | МЕНЕДЖЕРЫ (6 cols)    */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 shrink-0">
        {/* 3.1. Причины потери лидов (h-[270px]) */}
        <div className="h-[270px] rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900 leading-none">Причины потери лидов</h3>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
                  Почему клиенты не доходят до оплаты
                </p>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold px-2 py-0.5 rounded border border-slate-200 bg-slate-50">
                Все неуспешные лиды ▾
              </span>
            </div>

            {lossReasons.isInsufficientData ? (
              <div className="py-8 text-center text-slate-400 space-y-1.5">
                <ShieldAlert className="h-7 w-7 mx-auto text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">Недостаточно данных для анализа</p>
                <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                  За выбранный период зафиксировано менее 3 отказов. Соберите больше данных для выявления причин.
                </p>
              </div>
            ) : (
              <div className="mt-1 space-y-0.5">
                <div className="grid grid-cols-12 text-[9.5px] uppercase font-bold text-slate-400 px-1 pb-0.5">
                  <span className="col-span-5">Причина</span>
                  <span className="col-span-2 text-right">Кол-во</span>
                  <span className="col-span-2 text-right">Доля</span>
                  <span className="col-span-3 text-right">Потенц. выручка</span>
                </div>

                {lossReasons.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 items-center text-xs py-0.5 px-1 rounded-md hover:bg-slate-50 transition-colors"
                  >
                    <span className="col-span-5 text-[11px] font-bold text-slate-800 truncate">
                      {item.label}
                    </span>

                    <span className="col-span-2 text-right font-extrabold text-slate-900 text-xs">
                      {item.count}
                    </span>

                    <span className="col-span-2 text-right font-medium text-slate-500 text-xs">
                      {item.sharePercentage}%
                    </span>

                    <div className="col-span-3 flex items-center justify-end gap-1.5">
                      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className={cn('h-full rounded-full', item.color)}
                          style={{ width: `${Math.min(100, item.sharePercentage * 2.5)}%` }}
                        />
                      </div>
                      <span className="font-extrabold text-slate-800 text-[10.5px]">
                        {item.potentialRevenueFormatted}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 text-center w-full">
            <Link
              href="/crm?status=lost"
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-block"
            >
              Посмотреть все неуспешные лиды →
            </Link>
          </div>
        </div>

        {/* 3.2. Эффективность менеджеров (h-[270px]) */}
        <div className="h-[270px] rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900 leading-none">Эффективность менеджеров</h3>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
                  Сравнение ключевых показателей по менеджерам
                </p>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold px-2 py-0.5 rounded border border-slate-200 bg-slate-50">
                Все менеджеры ▾
              </span>
            </div>

            {/* Managers Table */}
            <div className="mt-2 space-y-1.5">
              <div className="grid grid-cols-12 text-[9.5px] uppercase font-bold text-slate-400 px-1 pb-0.5">
                <span className="col-span-4">Менеджер</span>
                <span className="col-span-1 text-right">Лиды</span>
                <span className="col-span-1 text-right">Пробн.</span>
                <span className="col-span-1 text-right">Опл.</span>
                <span className="col-span-2 text-right">Конв.</span>
                <span className="col-span-1 text-right">Время</span>
                <span className="col-span-2 text-right">Выручка</span>
              </div>

              {managers.items.map((mgr) => (
                <div
                  key={mgr.id}
                  className="grid grid-cols-12 items-center text-xs py-1.5 px-1 rounded-md hover:bg-slate-50 transition-colors"
                >
                  <div className="col-span-4 flex items-center gap-1.5 min-w-0">
                    <span
                      className={cn(
                        'h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0',
                        mgr.badgeBg,
                        mgr.badgeText
                      )}
                    >
                      {mgr.initials}
                    </span>
                    <span className="text-[11px] font-bold text-slate-900 truncate">
                      {mgr.name}
                    </span>
                  </div>

                  <span className="col-span-1 text-right font-bold text-slate-900 text-xs">
                    {mgr.leadsCount}
                  </span>

                  <span className="col-span-1 text-right font-medium text-slate-500 text-xs">
                    {mgr.trialsCount}
                  </span>

                  <span className="col-span-1 text-right font-bold text-slate-900 text-xs">
                    {mgr.paidCount}
                  </span>

                  <div className="col-span-2 text-right">
                    <span
                      className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded leading-none inline-block',
                        mgr.conversionType === 'positive'
                          ? 'bg-emerald-50 text-emerald-700'
                          : mgr.conversionType === 'warning'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                      )}
                    >
                      {mgr.conversionRate}
                    </span>
                  </div>

                  <span className="col-span-1 text-right font-medium text-slate-500 text-[10px] truncate">
                    {mgr.avgContactTime}
                  </span>

                  <span className="col-span-2 text-right font-black text-slate-900 text-[11px] truncate">
                    {mgr.revenueFormatted}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Alert */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between bg-rose-50/60 -mx-3 -mb-3 p-2.5 rounded-b-xl border-t-rose-100">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <p className="text-[10.5px] font-bold text-rose-900 truncate leading-tight">
                У 2 из 4 менеджеров конверсия ниже среднего (14.3%)
              </p>
            </div>
            <Link
              href="/crm"
              className="text-[10.5px] font-bold text-blue-600 hover:text-blue-700 hover:underline shrink-0 pl-2 inline-flex items-center gap-1"
            >
              Посмотреть менеджеров →
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. TIER 3: ДЕТАЛИЗАЦИЯ ЛИДОВ (FULL-WIDTH TABLE)           */}
      {/* ========================================================= */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs space-y-3">
        {/* Table Topbar: Title, Search, Filters, Export */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5">
          <div>
            <h3 className="text-xs font-bold text-slate-900 leading-none">Детализация лидов</h3>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
              Список лидов с фильтрацией по этапам, каналам и причинам
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Search Input */}
            <div className="relative w-56">
              <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по имени, контакту..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-7 pl-7 pr-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px] placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Stage Filter */}
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="h-7 px-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-600 focus:outline-none"
            >
              <option value="all">Все этапы</option>
              <option value="paid">Оплатили</option>
              <option value="in_progress">В работе</option>
              <option value="lost">Отказ</option>
            </select>

            {/* Channel Filter */}
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="h-7 px-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-600 focus:outline-none"
            >
              <option value="all">Все каналы</option>
              <option value="website">Сайт школы</option>
              <option value="instagram">Instagram</option>
              <option value="referral">Рекомендации</option>
              <option value="telegram">Telegram</option>
              <option value="offline">Офлайн</option>
            </select>

            {/* Manager Filter */}
            <select
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
              className="h-7 px-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-600 focus:outline-none"
            >
              <option value="all">Все менеджеры</option>
              <option value="Иванова">Мария Иванова</option>
              <option value="Смирнов">Денис Смирнов</option>
              <option value="Соколова">Ольга Соколова</option>
              <option value="Кузнецова">Анна Кузнецова</option>
            </select>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="h-3 w-3 text-slate-500" />
              Экспорт
            </button>
          </div>
        </div>

        {/* Detailed Leads Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-1.5 px-2">Дата</th>
                <th className="py-1.5 px-2">Лид</th>
                <th className="py-1.5 px-2">Канал</th>
                <th className="py-1.5 px-2">Этап</th>
                <th className="py-1.5 px-2">Менеджер</th>
                <th className="py-1.5 px-2">Причина (если неуспешный)</th>
                <th className="py-1.5 px-2 text-right">Сумма</th>
                <th className="py-1.5 px-2 text-center">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80 text-xs">
              {filteredDetailedLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs font-medium">
                    Лиды не найдены. Попробуйте изменить параметры фильтрации.
                  </td>
                </tr>
              ) : (
                filteredDetailedLeads.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-2 text-[11px] text-slate-500 font-medium whitespace-nowrap">
                      {row.date}
                    </td>

                    <td className="py-2 px-2">
                      <Link
                        href={`/crm/leads/${row.id}`}
                        className="font-bold text-slate-900 hover:text-blue-600 transition-colors inline-flex items-center gap-1"
                      >
                        {row.leadName}
                        <ExternalLink className="h-2.5 w-2.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <span className="block text-[10px] text-slate-400">{row.contact}</span>
                    </td>

                    <td className="py-2 px-2 text-[11px] text-slate-600 font-medium whitespace-nowrap">
                      {row.channel}
                    </td>

                    <td className="py-2 px-2 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                        <span className={cn('h-1.5 w-1.5 rounded-full', row.stageDotColor)} />
                        {row.stageLabel}
                      </span>
                    </td>

                    <td className="py-2 px-2 text-[11px] text-slate-700 font-medium whitespace-nowrap">
                      {row.managerName}
                    </td>

                    <td className="py-2 px-2 text-[11px] text-slate-500 max-w-[200px] truncate">
                      {row.lossReasonText}
                    </td>

                    <td className="py-2 px-2 text-right font-bold text-slate-900 text-[11px] whitespace-nowrap">
                      {row.offerAmountText}
                    </td>

                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block leading-none',
                          row.statusBadge.variant === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : row.statusBadge.variant === 'danger'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        )}
                      >
                        {row.statusBadge.label}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
