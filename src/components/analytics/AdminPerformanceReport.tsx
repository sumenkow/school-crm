'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  CreditCard,
  DollarSign,
  TrendingUp,
  UserCheck,
  PhoneCall,
  Calendar,
  Award,
  Sparkles,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  ShieldCheck,
  HeartHandshake,
  Users,
  Search,
  Check,
  ChevronRight,
  FileText,
  BadgePercent,
  Timer,
  RefreshCw,
  Star,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/utils';

export interface AdminEfficiencyData {
  adminName: string;
  avatar: string;
  role: string;
  period: string;
  integralKpiScore: number; // 0 - 100
  tasks: {
    total: number;
    completedOnTime: number;
    completedLate: number;
    overdueMissed: number;
    inProgress: number;
    onTimeRate: number; // e.g. 91.7%
    avgReactionMinutes: number; // e.g. 7.5
    targetReactionMinutes: number; // 15
  };
  payments: {
    collectedAmount: number; // 420 000
    planAmount: number; // 400 000
    planProgress: number; // 105%
    invoicesIssued: number; // 30
    invoicesPaid: number; // 28
    paymentConversion: number; // 93.3%
    avgInvoiceHours: number; // 4.2 hours to pay
    debtsOlderThan3Days: number; // 0
  };
  funnelAndService: {
    leadsTotal: number;
    firstContactWithin15MinRate: number; // 96.4%
    trialsScheduled: number;
    trialsAttended: number;
    trialShowUpRate: number; // 88.9%
    trialsToPaidCount: number;
    trialToPaidConversion: number; // 75.0%
    renewalsDue: number;
    renewalsCompleted: number;
    renewalRate: number; // 88.5%
    absenceFollowUpRate: number; // 93.3% (14 of 15)
    crmDataHygieneScore: number; // 98.5%
    parentSatisfactionCsat: number; // 4.95 / 5.0
    reviewsCount: number;
  };
  operationalSummary: {
    standardsMet: boolean;
    workSchedule: string;
    recommendation: string;
  };
}

const ADMIN_PROFILES: Record<string, AdminEfficiencyData> = {
  'anna': {
    adminName: 'Анна Администратор',
    avatar: 'АА',
    role: 'Старший администратор смены',
    period: 'Сентябрь 2026',
    integralKpiScore: 94,
    tasks: {
      total: 48,
      completedOnTime: 44,
      completedLate: 3,
      overdueMissed: 0,
      inProgress: 1,
      onTimeRate: 91.7,
      avgReactionMinutes: 7.5,
      targetReactionMinutes: 15,
    },
    payments: {
      collectedAmount: 420000,
      planAmount: 400000,
      planProgress: 105,
      invoicesIssued: 30,
      invoicesPaid: 28,
      paymentConversion: 93.3,
      avgInvoiceHours: 4.2,
      debtsOlderThan3Days: 0,
    },
    funnelAndService: {
      leadsTotal: 28,
      firstContactWithin15MinRate: 96.4,
      trialsScheduled: 18,
      trialsAttended: 16,
      trialShowUpRate: 88.9,
      trialsToPaidCount: 12,
      trialToPaidConversion: 75.0,
      renewalsDue: 26,
      renewalsCompleted: 23,
      renewalRate: 88.5,
      absenceFollowUpRate: 93.3,
      crmDataHygieneScore: 98.5,
      parentSatisfactionCsat: 4.95,
      reviewsCount: 38,
    },
    operationalSummary: {
      standardsMet: true,
      workSchedule: 'Сменный график 2/2 • Фиксированный оклад',
      recommendation: 'Все ключевые регламенты школы соблюдаются в полном объеме. Высокая скорость первичного контакта и точность контроля оплат.',
    },
  },
  'elena': {
    adminName: 'Елена Менеджер',
    avatar: 'ЕМ',
    role: 'Администратор дневной смены',
    period: 'Сентябрь 2026',
    integralKpiScore: 91,
    tasks: {
      total: 42,
      completedOnTime: 38,
      completedLate: 4,
      overdueMissed: 0,
      inProgress: 0,
      onTimeRate: 90.5,
      avgReactionMinutes: 9.2,
      targetReactionMinutes: 15,
    },
    payments: {
      collectedAmount: 385000,
      planAmount: 380000,
      planProgress: 101.3,
      invoicesIssued: 27,
      invoicesPaid: 25,
      paymentConversion: 92.6,
      avgInvoiceHours: 5.1,
      debtsOlderThan3Days: 0,
    },
    funnelAndService: {
      leadsTotal: 24,
      firstContactWithin15MinRate: 94.0,
      trialsScheduled: 15,
      trialsAttended: 13,
      trialShowUpRate: 86.7,
      trialsToPaidCount: 9,
      trialToPaidConversion: 69.2,
      renewalsDue: 22,
      renewalsCompleted: 19,
      renewalRate: 86.4,
      absenceFollowUpRate: 90.0,
      crmDataHygieneScore: 97.0,
      parentSatisfactionCsat: 4.88,
      reviewsCount: 29,
    },
    operationalSummary: {
      standardsMet: true,
      workSchedule: 'Сменный график 2/2 • Фиксированный оклад',
      recommendation: 'Стабильные показатели финансовой дисциплины и своевременного продления абонементов.',
    },
  },
};

const RECENT_ADMIN_TASKS = [
  {
    id: 't-1',
    title: 'Первичный звонок по заявке на Робототехнику (Ольга)',
    category: 'CRM Сделка',
    targetDeadline: 'до 11:30',
    completedAt: '11:22',
    status: 'on_time',
    statusLabel: 'В срок (8 мин)',
    verifiedBy: 'Система автофиксации телефонии',
  },
  {
    id: 't-2',
    title: 'Подтверждение явки на пробный урок Даниила Морозова',
    category: 'Retention',
    targetDeadline: 'до 12:00',
    completedAt: '11:45',
    status: 'on_time',
    statusLabel: 'В срок (за 4ч до урока)',
    verifiedBy: 'Отметка в журнале CRM',
  },
  {
    id: 't-3',
    title: 'Выставление счета и получение оплаты за продление (Иван С.)',
    category: 'Финансы',
    targetDeadline: 'до 14:00',
    completedAt: '13:50',
    status: 'on_time',
    statusLabel: 'В срок (оплачено 38 400 ₽)',
    verifiedBy: 'Интеграция Тинькофф Бизнес',
  },
  {
    id: 't-4',
    title: 'Согласование отработки пропуска для Алины Беловой',
    category: 'Оргвопрос',
    targetDeadline: 'до 15:00',
    completedAt: '15:20',
    status: 'late',
    statusLabel: 'Опоздание 20 мин',
    verifiedBy: 'Ручная проверка графика',
  },
  {
    id: 't-5',
    title: 'Контроль напоминаний родителям об онлайн-подключении',
    category: 'Retention',
    targetDeadline: 'до 17:00',
    completedAt: '16:40',
    status: 'on_time',
    statusLabel: 'В срок (рассылка Telegram)',
    verifiedBy: 'Telegram бот школы',
  },
];

export function AdminPerformanceReport() {
  const toast = useToast();
  const [selectedAdminKey, setSelectedAdminKey] = useState<'anna' | 'elena'>('anna');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'tasks' | 'finance' | 'service'>('overview');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'quarter'>('month');

  const current = ADMIN_PROFILES[selectedAdminKey];

  const handleExport = () => {
    toast.success(`Отчет по эффективности «${current.adminName}» успешно сформирован`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-800 font-bold text-xs">
              {current.avatar}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Отчет по эффективности работы администратора
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Контроль выполнения поставленных задач, отсутствие просрочек, сбор оплат, воронка и SLA сервиса
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Admin Switcher */}
          <select
            value={selectedAdminKey}
            onChange={(e) => setSelectedAdminKey(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none"
          >
            <option value="anna">Анна Администратор (старший)</option>
            <option value="elena">Елена Менеджер</option>
          </select>

          {/* Time Range */}
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setTimeRange('today')}
              className={cn('rounded px-2.5 py-1 transition-all', timeRange === 'today' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600')}
            >
              Сегодня
            </button>
            <button
              onClick={() => setTimeRange('week')}
              className={cn('rounded px-2.5 py-1 transition-all', timeRange === 'week' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600')}
            >
              Неделя
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={cn('rounded px-2.5 py-1 transition-all', timeRange === 'month' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600')}
            >
              Сентябрь 2026
            </button>
          </div>

          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Download size={13} />
            Экспорт отчета
          </button>
        </div>
      </div>

      {/* Main KPI Hero Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Integral KPI Score */}
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900">Интегральный KPI балл</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Award size={16} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-900">{current.integralKpiScore}</span>
            <span className="text-sm font-bold text-slate-400">/ 100</span>
            <span className="ml-auto rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              Отлично
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Все 4 ключевых норматива выполнены. Высокая операционная дисциплина и качество работы.
          </p>
        </div>

        {/* Card 2: Task Execution & Zero Missed */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">Выполнение задач</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-900">
              {current.tasks.completedOnTime}/{current.tasks.total}
            </span>
            <span className="text-xs font-bold text-emerald-700">({current.tasks.onTimeRate}%)</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">Пропущено задач:</span>
            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800">
              0 просрочек (100% SLA)
            </span>
          </div>
        </div>

        {/* Card 3: Payments & Collections */}
        <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/80 via-white to-pink-50/50 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-900">Проведенные оплаты</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs">
              <CreditCard size={16} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-purple-900">
              {current.payments.collectedAmount.toLocaleString('ru-RU')} ₽
            </span>
            <span className="text-xs font-bold text-purple-700">({current.payments.planProgress}%)</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-600">Оплачено счетов:</span>
            <span className="font-bold text-slate-900">
              {current.payments.invoicesPaid} из {current.payments.invoicesIssued} ({current.payments.paymentConversion}%)
            </span>
          </div>
        </div>

        {/* Card 4: Response Time & Service SLA */}
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900">Скорость контакта (SLA)</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-600 text-white shadow-xs">
              <Timer size={16} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-900">{current.tasks.avgReactionMinutes} мин</span>
            <span className="text-xs font-semibold text-slate-500">цель &lt; 15 мин</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-600">Оценка родителей (CSAT):</span>
            <span className="font-bold text-amber-700 flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
              {current.funnelAndService.parentSatisfactionCsat} / 5.0
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={cn(
            'px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap',
            activeSubTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <Award size={14} />
          Сводная оценка эффективности (KPI)
        </button>
        <button
          onClick={() => setActiveSubTab('tasks')}
          className={cn(
            'px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap',
            activeSubTab === 'tasks'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <CheckCircle2 size={14} />
          Контроль выполнения задач ({current.tasks.total})
        </button>
        <button
          onClick={() => setActiveSubTab('finance')}
          className={cn(
            'px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap',
            activeSubTab === 'finance'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <CreditCard size={14} />
          Оценка проведенных оплат
        </button>
        <button
          onClick={() => setActiveSubTab('service')}
          className={cn(
            'px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap',
            activeSubTab === 'service'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <TrendingUp size={14} />
          Воронка, Retention и CSAT
        </button>
      </div>

      {/* TAB 1: OVERVIEW & BONUS CALCULATION */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Summary Criteria Matrix */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-blue-600" />
              Комплексные критерии оценки эффективности администратора
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. Task Execution */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">1. Выполнение поставленных задач</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    {current.tasks.onTimeRate}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${current.tasks.onTimeRate}%` }} />
                </div>
                <p className="text-[11px] text-slate-500">
                  {current.tasks.completedOnTime} задач завершены в срок, {current.tasks.completedLate} с задержкой, 0 невыполненных. Норматив школы (90%) достигнут.
                </p>
              </div>

              {/* 2. Zero Missed Tasks */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">2. Отсутствие пропущенных задач</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    100%
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '100%' }} />
                </div>
                <p className="text-[11px] text-slate-500">
                  0 сорванных сроков или забытых лидов. Среднее время реакции на звонок/заявку: {current.tasks.avgReactionMinutes} минут.
                </p>
              </div>

              {/* 3. Collected Revenue */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">3. Сбор оплат и финансовый план</span>
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                    {current.payments.planProgress}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-600 h-full rounded-full" style={{ width: '100%' }} />
                </div>
                <p className="text-[11px] text-slate-500">
                  Собрано {current.payments.collectedAmount.toLocaleString('ru-RU')} ₽ при плане {current.payments.planAmount.toLocaleString('ru-RU')} ₽. Конверсия выставленных счетов {current.payments.paymentConversion}%.
                </p>
              </div>

              {/* 4. Trial Show-Up */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">4. Доходимость до пробного урока</span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                    {current.funnelAndService.trialShowUpRate}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: `${current.funnelAndService.trialShowUpRate}%` }} />
                </div>
                <p className="text-[11px] text-slate-500">
                  {current.funnelAndService.trialsAttended} из {current.funnelAndService.trialsScheduled} записанных учеников посетили занятие благодаря подтверждающим звонкам.
                </p>
              </div>

              {/* 5. Trial to Paid Conversion */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">5. Конверсия в абонемент</span>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                    {current.funnelAndService.trialToPaidConversion}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${current.funnelAndService.trialToPaidConversion}%` }} />
                </div>
                <p className="text-[11px] text-slate-500">
                  {current.funnelAndService.trialsToPaidCount} из {current.funnelAndService.trialsAttended} посетителей пробного урока приобрели абонемент. Быстрый контакт с родителем.
                </p>
              </div>

              {/* 6. Renewals & Retention */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">6. Своевременные продления</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    {current.funnelAndService.renewalRate}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${current.funnelAndService.renewalRate}%` }} />
                </div>
                <p className="text-[11px] text-slate-500">
                  {current.funnelAndService.renewalsCompleted} из {current.funnelAndService.renewalsDue} абонементов продлены без перерыва в обучении. Контроль баланса за 2 занятия.
                </p>
              </div>
            </div>
          </div>

          {/* Operational Standards Summary Card (Fixed salary evaluation without bonus linking) */}
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  Аттестация и стандарты работы
                </span>
                <h3 className="text-xl font-bold mt-1">
                  Операционный статус: Все нормативы соблюдены ({current.integralKpiScore} / 100)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Формат работы: {current.operationalSummary.workSchedule}. Оценка эффективности проводится для контроля качества сервиса без привязки к переменной оплате.
                </p>
              </div>
              <div className="sm:text-right">
                <span className="text-xs text-slate-400 block">Результат проверки</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold text-sm bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 mt-1">
                  <ShieldCheck size={16} />
                  Стандарты соблюдены
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4 text-xs">
              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-xs border border-white/5">
                <span className="text-slate-300 block font-medium">Дисциплина задач</span>
                <span className="text-lg font-bold text-emerald-400 mt-1 block">
                  {current.tasks.onTimeRate}% в срок
                </span>
                <span className="text-slate-400 text-[11px]">0 просрочек, SLA 100%</span>
              </div>

              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-xs border border-white/5">
                <span className="text-slate-300 block font-medium">Сбор оплат</span>
                <span className="text-lg font-bold text-emerald-400 mt-1 block">
                  {current.payments.planProgress}% плана
                </span>
                <span className="text-slate-400 text-[11px]">{current.payments.collectedAmount.toLocaleString('ru-RU')} ₽ (0 долгов &gt;3 дн)</span>
              </div>

              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-xs border border-white/5">
                <span className="text-slate-300 block font-medium">Скорость ответа</span>
                <span className="text-lg font-bold text-emerald-400 mt-1 block">
                  {current.tasks.avgReactionMinutes} мин
                </span>
                <span className="text-slate-400 text-[11px]">Норматив &lt; 15 мин (факт 96.4%)</span>
              </div>

              <div className="rounded-xl bg-white/10 p-3.5 backdrop-blur-xs border border-white/5">
                <span className="text-slate-300 block font-medium">Качество сервиса</span>
                <span className="text-lg font-bold text-emerald-400 mt-1 flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {current.funnelAndService.parentSatisfactionCsat} / 5.0
                </span>
                <span className="text-slate-400 text-[11px]">Продление абонементов {current.funnelAndService.renewalRate}%</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span>{current.operationalSummary.recommendation}</span>
              <span className="text-slate-400 shrink-0">Период оценки: {current.period}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TASKS BREAKDOWN */}
      {activeSubTab === 'tasks' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Tasks Distribution Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs text-slate-500">Всего задач за период</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{current.tasks.total}</p>
              <span className="text-[11px] text-blue-600 font-semibold">100% поручений</span>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
              <span className="text-xs text-emerald-800">Выполнено точно в срок</span>
              <p className="text-2xl font-bold text-emerald-900 mt-1">{current.tasks.completedOnTime}</p>
              <span className="text-[11px] text-emerald-700 font-semibold">
                {current.tasks.onTimeRate}% точности
              </span>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
              <span className="text-xs text-amber-800">С небольшим опозданием</span>
              <p className="text-2xl font-bold text-amber-900 mt-1">{current.tasks.completedLate}</p>
              <span className="text-[11px] text-amber-700 font-semibold">Задержка &lt; 30 мин</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs text-slate-500">Просрочено / Пропущено</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{current.tasks.overdueMissed}</p>
              <span className="text-[11px] text-emerald-600 font-semibold">0 просрочек</span>
            </div>
          </div>

          {/* Detailed Tasks Log */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Журнал выполнения задач администратором</h3>
              <span className="text-xs text-slate-500">Автоматическая верификация через CRM и телефонию</span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {RECENT_ADMIN_TASKS.map((task) => (
                <div key={task.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{task.title}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {task.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-slate-500 text-[11px]">
                      <span>Дедлайн: {task.targetDeadline}</span>
                      <span>•</span>
                      <span>Фактически: {task.completedAt}</span>
                      <span>•</span>
                      <span>{task.verifiedBy}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[11px] font-bold flex items-center gap-1',
                        task.status === 'on_time'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      )}
                    >
                      {task.status === 'on_time' ? <Check size={12} /> : <Clock size={12} />}
                      {task.statusLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FINANCE & PAYMENTS EVALUATION */}
      {activeSubTab === 'finance' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-purple-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Фактически собрано оплат</span>
              <p className="text-3xl font-extrabold text-purple-900 mt-1">
                {current.payments.collectedAmount.toLocaleString('ru-RU')} ₽
              </p>
              <span className="text-xs font-bold text-emerald-600 mt-1 block">
                План {current.payments.planAmount.toLocaleString('ru-RU')} ₽ перевыполнен на +5%
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Конверсия выставленных счетов</span>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">
                {current.payments.paymentConversion}%
              </p>
              <span className="text-xs text-slate-500 mt-1 block">
                {current.payments.invoicesPaid} из {current.payments.invoicesIssued} счетов оплачены
              </span>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-xs">
              <span className="text-xs font-semibold text-emerald-900">Просроченная задолженность</span>
              <p className="text-3xl font-extrabold text-emerald-700 mt-1">0 ₽</p>
              <span className="text-xs text-emerald-800 mt-1 block">
                Нет зависших оплат старше 3 суток
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Анализ платежной дисциплины клиентов</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <span className="font-bold text-slate-800 block mb-1">Скорость оплаты счетов родителями</span>
                <p className="text-slate-600">
                  В среднем счет закрывается за <span className="font-bold text-slate-900">{current.payments.avgInvoiceHours} часа</span> после отправки ссылки через Telegram / СМС. Администратор своевременно прикрепляет QR-код и платежный виджет.
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <span className="font-bold text-slate-800 block mb-1">Удержание оплат при окончании абонементов</span>
                <p className="text-slate-600">
                  <span className="font-bold text-emerald-700">{current.funnelAndService.renewalRate}%</span> учеников оплачивают следующий абонемент до последнего оплаченного занятия, исключая финансовые кассовые разрывы.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SERVICE, SHOW-UP & CSAT */}
      {activeSubTab === 'service' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Доходимость до пробного урока</span>
              <p className="text-3xl font-extrabold text-blue-900 mt-1">
                {current.funnelAndService.trialShowUpRate}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {current.funnelAndService.trialsAttended} из {current.funnelAndService.trialsScheduled} учеников дошли
              </p>
            </div>

            <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Конверсия пробный → покупка</span>
              <p className="text-3xl font-extrabold text-indigo-900 mt-1">
                {current.funnelAndService.trialToPaidConversion}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {current.funnelAndService.trialsToPaidCount} из {current.funnelAndService.trialsAttended} купили абонемент
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Рейтинг сервиса родителями (CSAT)</span>
              <p className="text-3xl font-extrabold text-amber-900 mt-1">
                {current.funnelAndService.parentSatisfactionCsat} <span className="text-sm font-normal text-slate-400">/ 5.0</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                На основе {current.funnelAndService.reviewsCount} отзывов и опросов после занятий
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Дополнительные показатели надежности</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="rounded-xl border border-slate-100 p-3.5 bg-slate-50/50">
                <span className="font-semibold text-slate-700 block">Аккуратность ведения CRM (Data Hygiene)</span>
                <p className="text-xl font-bold text-slate-900 mt-1">{current.funnelAndService.crmDataHygieneScore}%</p>
                <span className="text-[11px] text-slate-500">Заполнены все телефоны, дети и даты</span>
              </div>
              <div className="rounded-xl border border-slate-100 p-3.5 bg-slate-50/50">
                <span className="font-semibold text-slate-700 block">Отработка пропусков уроков</span>
                <p className="text-xl font-bold text-slate-900 mt-1">{current.funnelAndService.absenceFollowUpRate}%</p>
                <span className="text-[11px] text-slate-500">14 из 15 пропустивших записаны на отработку</span>
              </div>
              <div className="rounded-xl border border-slate-100 p-3.5 bg-slate-50/50">
                <span className="font-semibold text-slate-700 block">Реакция на заявки &lt; 15 минут</span>
                <p className="text-xl font-bold text-slate-900 mt-1">{current.funnelAndService.firstContactWithin15MinRate}%</p>
                <span className="text-[11px] text-slate-500">Только 1 лид обработан с задержкой</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
