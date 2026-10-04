'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  CreditCard,
  Zap,
  TrendingUp,
  AlertTriangle,
  Clock,
  MessageSquare,
  Search,
  Download,
  X,
  ExternalLink,
  ChevronDown,
  Users,
  Check,
  Phone,
  Globe,
  Sliders,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalyticsFilters, DetailedReportsData } from '../types';

interface AdminEfficiencyReportProps {
  data: DetailedReportsData;
  filters: AnalyticsFilters;
}

export function AdminEfficiencyReport({ data, filters }: AdminEfficiencyReportProps) {
  const {
    heroKpis,
    adminSummaryTable,
    taskStatusDonut,
    reactionSpeedBars,
    paymentStatusDonut,
    renewalStatusDonut,
    dynamicsTimeline,
    adminTasksList,
    recentCommunications,
    attentionPayments,
  } = data;

  // Local UI States
  const [dynamicsMetric, setDynamicsMetric] = useState<'kpi' | 'tasks' | 'payments' | 'renewals'>('kpi');
  const [isAllAdminsModalOpen, setIsAllAdminsModalOpen] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [hoveredDynamicsMonth, setHoveredDynamicsMonth] = useState<string | null>(null);

  // Avatar gradient helper
  const getAvatarGradient = (idx: number) => {
    const gradients = [
      'from-purple-500 to-indigo-600',
      'from-emerald-500 to-teal-600',
      'from-teal-500 to-cyan-600',
      'from-amber-500 to-orange-600',
      'from-blue-500 to-sky-600',
    ];
    return gradients[idx % gradients.length];
  };

  // Helper for Donut SVG Segments
  const calculateDonutSegments = (items: Array<{ id: string; label: string; count: number; sharePercent: number; color: string }>) => {
    const donutRadius = 32;
    const circumference = 2 * Math.PI * donutRadius; // ≈ 201.06
    let accumulatedOffset = 0;
    return items.map((item) => {
      const strokeDasharray = `${(item.sharePercent / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -accumulatedOffset;
      accumulatedOffset += (item.sharePercent / 100) * circumference;
      return {
        ...item,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  };

  const taskSegments = useMemo(() => calculateDonutSegments(taskStatusDonut.items), [taskStatusDonut]);
  const paymentSegments = useMemo(() => calculateDonutSegments(paymentStatusDonut.items), [paymentStatusDonut]);
  const renewalSegments = useMemo(() => calculateDonutSegments(renewalStatusDonut.items), [renewalStatusDonut]);

  // Channel badge & icon helper
  const renderChannelBadge = (channel: 'WhatsApp' | 'Telegram' | 'Телефон' | 'Сайт') => {
    switch (channel) {
      case 'WhatsApp':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            WhatsApp
          </span>
        );
      case 'Telegram':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            Telegram
          </span>
        );
      case 'Телефон':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Phone className="h-2.5 w-2.5 text-purple-600" />
            Телефон
          </span>
        );
      case 'Сайт':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Globe className="h-2.5 w-2.5 text-slate-500" />
            Сайт
          </span>
        );
    }
  };

  // SVG Dynamics Line & Area Chart calculations
  const dynamicsSvgData = useMemo(() => {
    const points = dynamicsTimeline.map((item, idx) => {
      let val = item.kpi;
      if (dynamicsMetric === 'tasks') val = item.tasks;
      if (dynamicsMetric === 'payments') val = item.payments;
      if (dynamicsMetric === 'renewals') val = item.renewals;

      const x = 30 + idx * 60;
      const minVal = 65;
      const maxVal = 100;
      const normalized = Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal)));
      const y = 95 - normalized * 75;
      return { x, y, val, month: item.month };
    });

    const pathD = points.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
    }, '');

    const areaD = `${pathD} L ${points[points.length - 1].x},100 L ${points[0].x},100 Z`;

    return { points, pathD, areaD };
  }, [dynamicsTimeline, dynamicsMetric]);

  // Modal filtered admins
  const modalFilteredAdmins = useMemo(() => {
    return adminSummaryTable.filter((adm) =>
      adm.name.toLowerCase().includes(modalSearchTerm.toLowerCase())
    );
  }, [adminSummaryTable, modalSearchTerm]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Администратор', 'Интегральный KPI', 'Выполнение задач (%)', 'SLA реакции (мин)', 'Сбор оплат (%)', 'Продления (%)'];
    const rows = adminSummaryTable.map((a) => [
      a.name,
      a.kpiScore,
      `${a.tasksRatePercent}%`,
      `${a.slaMinutes} мин`,
      `${a.paymentsPercent}%`,
      `${a.renewalsPercent}%`,
    ]);
    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `admin_efficiency_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-3.5">
      {/* HERO SECTION: Left 4 KPIs + Right Summary Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* Left Column: 4 KPI Cards (2x2 Grid) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* 1. Интегральный KPI */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Интегральный KPI
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    {heroKpis.integralKpi.score}
                  </span>
                  <span className="text-sm font-semibold text-slate-400">
                    / {heroKpis.integralKpi.maxScore}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded-full text-[10.5px] font-bold">
                <TrendingUp className="h-3 w-3" />
                <span>{heroKpis.integralKpi.change}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-normal mt-2 leading-relaxed">
              {heroKpis.integralKpi.subtext}
            </p>
          </div>

          {/* 2. Выполнение задач */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Выполнение задач
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    {heroKpis.taskCompletion.percent}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded-full text-[10.5px] font-bold">
                <TrendingUp className="h-3 w-3" />
                <span>{heroKpis.taskCompletion.change}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-normal mt-2 leading-relaxed">
              <span className="font-semibold text-slate-700">{heroKpis.taskCompletion.completed}</span> из{' '}
              <span className="font-semibold text-slate-700">{heroKpis.taskCompletion.total}</span> вовремя
            </p>
          </div>

          {/* 3. Оплаты и счета (EUR) */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Оплаты и счета
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    {heroKpis.collectedPayments.amountFormatted}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded-full text-[10.5px] font-bold">
                <TrendingUp className="h-3 w-3" />
                <span>{heroKpis.collectedPayments.change}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-normal mt-2 leading-relaxed">
              <span className="font-semibold text-slate-700">{heroKpis.collectedPayments.paidCount}</span> из{' '}
              <span className="font-semibold text-slate-700">{heroKpis.collectedPayments.totalInvoices}</span> счетов оплачено ({heroKpis.collectedPayments.conversionPercent}%)
            </p>
          </div>

          {/* 4. Скорость первого контакта (SLA) */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Скорость первого контакта
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    {heroKpis.contactSla.minutes} мин
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded-full text-[10.5px] font-bold">
                <span>{heroKpis.contactSla.change}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-normal mt-2 leading-relaxed">
              Цель: до {heroKpis.contactSla.targetMinutes} мин • CSAT: <span className="font-semibold text-slate-700">{heroKpis.contactSla.csat}/5</span>
            </p>
          </div>
        </div>

        {/* Right Column: Сводка по администраторам */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-blue-600" />
              Сводка по администраторам
            </h3>
            <button
              onClick={() => setIsAllAdminsModalOpen(true)}
              className="text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              Все администраторы
              <ChevronDown className="h-3 w-3 -rotate-90" />
            </button>
          </div>

          <div className="overflow-x-auto w-full mt-2">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-medium">
                  <th className="py-1.5 pl-1 font-semibold text-slate-500">Администратор</th>
                  <th className="py-1.5 text-center font-semibold text-slate-500">KPI</th>
                  <th className="py-1.5 text-center font-semibold text-slate-500">Задачи</th>
                  <th className="py-1.5 text-center font-semibold text-slate-500">SLA</th>
                  <th className="py-1.5 text-center font-semibold text-slate-500">Оплаты</th>
                  <th className="py-1.5 text-center font-semibold text-slate-500 pr-1">Продления</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {adminSummaryTable.map((admin, idx) => (
                  <tr key={admin.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 pl-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-tr shrink-0',
                            getAvatarGradient(idx)
                          )}
                        >
                          {admin.initials}
                        </div>
                        <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[110px]">
                          {admin.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 text-center">
                      <span
                        className={cn(
                          'inline-block px-1.5 py-0.5 rounded text-[10.5px] font-bold',
                          admin.kpiScore >= 90
                            ? 'bg-emerald-50 text-emerald-700'
                            : admin.kpiScore >= 80
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        )}
                      >
                        {admin.kpiScore}
                      </span>
                    </td>
                    <td className="py-2 text-center font-medium text-slate-700">
                      {admin.tasksRatePercent}%
                    </td>
                    <td className="py-2 text-center font-medium text-slate-700">
                      {admin.slaMinutes} мин
                    </td>
                    <td className="py-2 text-center font-medium text-slate-700">
                      {admin.paymentsPercent}%
                    </td>
                    <td className="py-2 text-center font-medium text-slate-700 pr-1">
                      {admin.renewalsPercent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-500">
            <span>Всего в смене: 4 сотрудника</span>
            <span className="text-emerald-600 font-medium">Норматив SLA ≤ 15 мин</span>
          </div>
        </div>
      </div>

      {/* TIER 1: 4 Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Card 1: Статусы задач команды */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 tracking-tight">
              Статусы задач команды
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">
              Всего: {taskStatusDonut.total}
            </span>
          </div>

          <div className="flex items-center gap-3 py-2.5">
            {/* SVG Donut */}
            <div className="relative h-20 w-20 shrink-0">
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="32" fill="none" stroke="#f1f5f9" strokeWidth="11" />
                {taskSegments.map((seg) => (
                  <circle
                    key={seg.id}
                    cx="50"
                    cy="50"
                    r="32"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="11"
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    className="transition-all duration-300"
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-base font-black text-slate-900 leading-none">
                  {taskStatusDonut.total}
                </span>
                <span className="text-[8px] font-medium text-slate-400 mt-0.5 leading-tight">
                  задач
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-1 text-[10.5px]">
              {taskStatusDonut.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-slate-700 truncate">{item.label}</span>
                  </div>
                  <span className="text-slate-500 font-semibold ml-1">
                    {item.count} ({item.sharePercent}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Просрочено: 9 задач (4.5%)</span>
            <Link href="/tasks" className="text-blue-600 hover:underline flex items-center gap-0.5">
              В задачи <ExternalLink className="h-2.5 w-2.5" />
            </Link>
          </div>
        </div>

        {/* Card 2: Скорость реакции на обращения */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 tracking-tight">
              Скорость реакции на обращения
            </h3>
            <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
              86% в норме
            </span>
          </div>

          <div className="py-2 space-y-2">
            {reactionSpeedBars.map((bar, idx) => (
              <div key={bar.id} className="space-y-0.5">
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="text-slate-600 font-medium">{bar.label}</span>
                  <span className="font-bold text-slate-900">{bar.sharePercent}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      idx === 0
                        ? 'bg-emerald-500'
                        : idx === 1
                        ? 'bg-teal-500'
                        : idx === 2
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    )}
                    style={{ width: `${bar.sharePercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] text-slate-500">
            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
            <span className="truncate">86% обращений в рамках регламента (&lt;15 мин)</span>
          </div>
        </div>

        {/* Card 3: Статусы счетов и оплат */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 tracking-tight">
              Статусы счетов и оплат
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">
              Всего: {paymentStatusDonut.total}
            </span>
          </div>

          <div className="flex items-center gap-3 py-2.5">
            {/* SVG Donut */}
            <div className="relative h-20 w-20 shrink-0">
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="32" fill="none" stroke="#f1f5f9" strokeWidth="11" />
                {paymentSegments.map((seg) => (
                  <circle
                    key={seg.id}
                    cx="50"
                    cy="50"
                    r="32"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="11"
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    className="transition-all duration-300"
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-base font-black text-slate-900 leading-none">
                  {paymentStatusDonut.total}
                </span>
                <span className="text-[8px] font-medium text-slate-400 mt-0.5 leading-tight">
                  счетов
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-1 text-[10.5px]">
              {paymentStatusDonut.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-slate-700 truncate">{item.label}</span>
                  </div>
                  <span className="text-slate-500 font-semibold ml-1">
                    {item.count} ({item.sharePercent}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>2 просрочено (6.7%)</span>
            <Link href="/finance" className="text-blue-600 hover:underline flex items-center gap-0.5">
              В финансы <ExternalLink className="h-2.5 w-2.5" />
            </Link>
          </div>
        </div>

        {/* Card 4: Продления абонементов */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 tracking-tight">
              Продления абонементов
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">
              Всего: {renewalStatusDonut.total}
            </span>
          </div>

          <div className="flex items-center gap-3 py-2.5">
            {/* SVG Donut */}
            <div className="relative h-20 w-20 shrink-0">
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="32" fill="none" stroke="#f1f5f9" strokeWidth="11" />
                {renewalSegments.map((seg) => (
                  <circle
                    key={seg.id}
                    cx="50"
                    cy="50"
                    r="32"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="11"
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    className="transition-all duration-300"
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-base font-black text-slate-900 leading-none">
                  {renewalStatusDonut.total}
                </span>
                <span className="text-[8px] font-medium text-slate-400 mt-0.5 leading-tight">
                  учеников
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-1 text-[10.5px]">
              {renewalStatusDonut.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-slate-700 truncate">{item.label}</span>
                  </div>
                  <span className="text-slate-500 font-semibold ml-1">
                    {item.count} ({item.sharePercent}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Конверсия продления: 88.5%</span>
            <span className="text-emerald-600 font-medium">Выше цели (85%)</span>
          </div>
        </div>
      </div>

      {/* TIER 2: Left Dynamics (col-span-7) + Right Tasks by Admins (col-span-5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* Left: Динамика эффективности команды */}
        <div className="lg:col-span-7 bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                Динамика эффективности команды
              </h3>
              <p className="text-[10px] text-slate-400">Тренд ключевых показателей за 6 месяцев</p>
            </div>
            {/* Pill Filters */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-semibold text-slate-600">
              <button
                onClick={() => setDynamicsMetric('kpi')}
                className={cn(
                  'px-2 py-1 rounded-md transition-all cursor-pointer',
                  dynamicsMetric === 'kpi'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'hover:text-slate-900'
                )}
              >
                KPI
              </button>
              <button
                onClick={() => setDynamicsMetric('tasks')}
                className={cn(
                  'px-2 py-1 rounded-md transition-all cursor-pointer',
                  dynamicsMetric === 'tasks'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'hover:text-slate-900'
                )}
              >
                Задачи
              </button>
              <button
                onClick={() => setDynamicsMetric('payments')}
                className={cn(
                  'px-2 py-1 rounded-md transition-all cursor-pointer',
                  dynamicsMetric === 'payments'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'hover:text-slate-900'
                )}
              >
                Оплаты
              </button>
              <button
                onClick={() => setDynamicsMetric('renewals')}
                className={cn(
                  'px-2 py-1 rounded-md transition-all cursor-pointer',
                  dynamicsMetric === 'renewals'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'hover:text-slate-900'
                )}
              >
                Продления
              </button>
            </div>
          </div>

          {/* SVG Multi-month Trend Chart */}
          <div className="relative w-full h-36 pt-2">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 360 115"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="dynamicsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="15" y1="20" x2="345" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="15" y1="57" x2="345" y2="57" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="15" y1="95" x2="345" y2="95" stroke="#f1f5f9" strokeWidth="1" />

              {/* Area */}
              <path d={dynamicsSvgData.areaD} fill="url(#dynamicsGradient)" />

              {/* Line */}
              <path
                d={dynamicsSvgData.pathD}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points */}
              {dynamicsSvgData.points.map((pt) => {
                const isHovered = hoveredDynamicsMonth === pt.month;
                return (
                  <g
                    key={pt.month}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredDynamicsMonth(pt.month)}
                    onMouseLeave={() => setHoveredDynamicsMonth(null)}
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 5.5 : 4}
                      fill="#ffffff"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                      className="transition-all duration-150"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 8}
                      textAnchor="middle"
                      className={cn(
                        'text-[9.5px] font-bold fill-slate-800 transition-opacity',
                        isHovered ? 'opacity-100 font-extrabold fill-blue-600' : 'opacity-80'
                      )}
                    >
                      {pt.val}%
                    </text>
                    <text
                      x={pt.x}
                      y="110"
                      textAnchor="middle"
                      className="text-[9.5px] font-medium fill-slate-400"
                    >
                      {pt.month}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-500">
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <TrendingUp className="h-3 w-3" /> Рост показателя на +12 п.п. за полгода
            </span>
            <span className="text-slate-400">Целевой уровень: ≥ 85%</span>
          </div>
        </div>

        {/* Right: Задачи по сотрудникам */}
        <div className="lg:col-span-5 bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                Задачи по сотрудникам
              </h3>
              <p className="text-[10px] text-slate-400">Распределение и выполнение задач</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                Всего: 199
              </span>
              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold">
                Просроч.: 9
              </span>
            </div>
          </div>

          <div className="py-1.5 space-y-2.5">
            {adminTasksList.map((taskRow, idx) => {
              const compPercent = Math.round((taskRow.completedTasks / taskRow.totalTasks) * 100);
              return (
                <div key={taskRow.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={cn(
                          'h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white bg-gradient-to-tr shrink-0',
                          getAvatarGradient(idx)
                        )}
                      >
                        {taskRow.initials}
                      </div>
                      <span className="font-semibold text-slate-800 truncate">
                        {taskRow.adminName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10.5px] shrink-0">
                      <span className="font-medium text-slate-600">
                        {taskRow.completedTasks}/{taskRow.totalTasks}
                      </span>
                      {taskRow.overdueTasks > 0 && (
                        <span className="text-rose-600 font-bold">
                          {taskRow.overdueTasks} проср. ({taskRow.overduePercent}%)
                        </span>
                      )}
                      <span className="text-slate-400 font-normal">
                        ср. {taskRow.avgHours} ч
                      </span>
                    </div>
                  </div>

                  {/* Stacked Bar */}
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${compPercent}%` }}
                      title={`Выполнено: ${compPercent}%`}
                    />
                    <div
                      className="bg-rose-500 h-full transition-all duration-300"
                      style={{ width: `${taskRow.overduePercent}%` }}
                      title={`Просрочено: ${taskRow.overduePercent}%`}
                    />
                    <div
                      className="bg-sky-400 h-full transition-all duration-300"
                      style={{ width: `${Math.max(0, 100 - compPercent - taskRow.overduePercent)}%` }}
                      title="В процессе"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Зеленый — выполнено вовремя</span>
            <span>Красный — просрочено</span>
          </div>
        </div>
      </div>

      {/* TIER 3: Left Recent Communications (50%) + Right Attention Payments (50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
        {/* Left: Недавние обращения */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                Недавние обращения
              </h3>
            </div>
            <Link
              href="/crm"
              className="text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5"
            >
              Все обращения <ChevronDown className="h-3 w-3 -rotate-90" />
            </Link>
          </div>

          <div className="overflow-x-auto w-full my-1">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-medium">
                  <th className="py-1.5 px-2 font-semibold text-slate-500">Дата</th>
                  <th className="py-1.5 px-2 font-semibold text-slate-500">Клиент</th>
                  <th className="py-1.5 px-2 font-semibold text-slate-500">Канал</th>
                  <th className="py-1.5 px-2 font-semibold text-slate-500">Тема</th>
                  <th className="py-1.5 px-2 text-center font-semibold text-slate-500">Реакция</th>
                  <th className="py-1.5 px-2 font-semibold text-slate-500">Ответственный</th>
                  <th className="py-1.5 px-2 text-right font-semibold text-slate-500">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentCommunications.map((comm) => (
                  <tr key={comm.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-2 text-slate-500 whitespace-nowrap text-[10px]">
                      {comm.date}
                    </td>
                    <td className="py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                      {comm.clientName}
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap">
                      {renderChannelBadge(comm.channel)}
                    </td>
                    <td className="py-2 px-2 text-slate-600 truncate max-w-[130px]" title={comm.subject}>
                      {comm.subject}
                    </td>
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <span
                        className={cn(
                          'text-[10.5px] font-bold',
                          comm.isOverdueSla ? 'text-rose-600' : 'text-slate-700'
                        )}
                      >
                        {comm.reactionTime}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-slate-600 whitespace-nowrap text-[10.5px]">
                      {comm.responsibleName}
                    </td>
                    <td className="py-2 px-2 text-right whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-block px-1.5 py-0.5 rounded text-[9.5px] font-bold',
                          comm.status === 'Обработано'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        )}
                      >
                        {comm.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Регламент первого ответа: 15 минут</span>
            <span className="text-emerald-600 font-medium">3 из 4 в рамках регламента</span>
          </div>
        </div>

        {/* Right: Счета, требующие внимания (EUR) */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                Счета, требующие внимания
              </h3>
            </div>
            <Link
              href="/finance"
              className="text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5"
            >
              Перейти в финансы <ChevronDown className="h-3 w-3 -rotate-90" />
            </Link>
          </div>

          <div className="overflow-x-auto w-full my-1">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-medium">
                  <th className="py-1.5 px-2 font-semibold text-slate-500">Счет от</th>
                  <th className="py-1.5 px-2 font-semibold text-slate-500">Ученик</th>
                  <th className="py-1.5 px-2 text-right font-semibold text-slate-500">Сумма</th>
                  <th className="py-1.5 px-2 text-center font-semibold text-slate-500">Срок</th>
                  <th className="py-1.5 px-2 text-center font-semibold text-slate-500">Статус</th>
                  <th className="py-1.5 px-2 text-right font-semibold text-slate-500">Ответственный</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {attentionPayments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-2 text-slate-500 whitespace-nowrap text-[10.5px]">
                      {pay.invoiceDate}
                    </td>
                    <td className="py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                      {pay.studentName}
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-slate-900 whitespace-nowrap">
                      {pay.amountFormatted}
                    </td>
                    <td className="py-2 px-2 text-center text-slate-500 whitespace-nowrap text-[10.5px]">
                      {pay.deadline}
                    </td>
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-block px-1.5 py-0.5 rounded text-[9.5px] font-bold',
                          pay.isOverdue
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        )}
                      >
                        {pay.statusText}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right text-slate-600 whitespace-nowrap text-[10.5px]">
                      {pay.responsibleName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Всего к доплате: 470 €</span>
            <span className="text-rose-600 font-medium">3 счета просрочено</span>
          </div>
        </div>
      </div>

      {/* ALL ADMINS DETAILED MODAL DIALOG */}
      {isAllAdminsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Реестр эффективности администраторов
                  </h2>
                  <p className="text-xs text-slate-500">
                    Детальные показатели выполнения задач, регламентов SLA, сбора оплат и продлений
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                  title="Экспорт в CSV"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  Экспорт
                </button>
                <button
                  onClick={() => setIsAllAdminsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Controls */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between bg-white">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Поиск по имени сотрудника..."
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Найдено сотрудников: </span>
                <span className="font-bold text-slate-800">{modalFilteredAdmins.length}</span>
              </div>
            </div>

            {/* Modal Table Content */}
            <div className="overflow-y-auto flex-1 p-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                    <th className="py-2.5 px-3">Администратор</th>
                    <th className="py-2.5 px-3 text-center">Интегральный KPI</th>
                    <th className="py-2.5 px-3 text-center">Задачи (% вовремя)</th>
                    <th className="py-2.5 px-3 text-center">SLA реакции</th>
                    <th className="py-2.5 px-3 text-center">Сбор оплат</th>
                    <th className="py-2.5 px-3 text-center">Продления</th>
                    <th className="py-2.5 px-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {modalFilteredAdmins.map((admin, idx) => (
                    <tr key={admin.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-tr shrink-0',
                              getAvatarGradient(idx)
                            )}
                          >
                            {admin.initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{admin.name}</div>
                            <div className="text-[11px] text-slate-400">Администратор школы</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={cn(
                            'inline-block px-2 py-0.5 rounded text-xs font-bold',
                            admin.kpiScore >= 90
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : admin.kpiScore >= 80
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          )}
                        >
                          {admin.kpiScore} / 100
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-medium text-slate-700">
                        {admin.tasksRatePercent}%
                      </td>
                      <td className="py-3 px-3 text-center font-medium text-slate-700">
                        {admin.slaMinutes} мин
                      </td>
                      <td className="py-3 px-3 text-center font-medium text-slate-700">
                        {admin.paymentsPercent}%
                      </td>
                      <td className="py-3 px-3 text-center font-medium text-slate-700">
                        {admin.renewalsPercent}%
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href="/settings/team"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                        >
                          Профиль <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Нормативы: KPI ≥ 85, SLA ≤ 15 мин, Сбор оплат ≥ 90%</span>
              <button
                onClick={() => setIsAllAdminsModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-medium transition-colors cursor-pointer"
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
