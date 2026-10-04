'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useFocusSync } from '@/hooks/useFocusSync';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Award,
  Download,
  Calendar,
  Layers,
  ArrowRight,
  PieChart,
  BookOpen,
  Clock,
  Sparkles,
  GraduationCap,
  ChevronRight,
  LayoutGrid,
  Table,
  Phone,
  Send,
  Search,
  CheckCircle2,
  ArrowUpRight,
  X,
  ChevronDown,
  Edit3,
  ExternalLink,
  Filter,
  MessageSquare,
  Check,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { INITIAL_LEADS, FullLeadData, INITIAL_COURSES, INITIAL_GROUPS, INITIAL_TEACHERS } from '@/lib/data/mockData';
import { getStoredLeads } from '@/lib/data/leadStorage';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { DetailedReportsSection } from '@/features/analytics/components/DetailedReportsSection';
import { AnalyticsHeader } from '@/features/analytics/components/AnalyticsHeader';
import { AnalyticsTabsNav } from '@/features/analytics/components/AnalyticsTabsNav';
import { DiagnosticsCockpit } from '@/features/analytics/components/DiagnosticsCockpit';
import { RetentionAnalyticsSection } from '@/features/analytics/components/RetentionAnalyticsSection';
import { SalesAnalyticsSection } from '@/features/analytics/components/SalesAnalyticsSection';
import { FinanceAnalyticsSection } from '@/features/analytics/components/FinanceAnalyticsSection';
import { GroupsAnalyticsSection } from '@/features/analytics/components/GroupsAnalyticsSection';
import { TeachersAnalyticsSection } from '@/features/analytics/components/TeachersAnalyticsSection';
import { useAnalyticsFilters, PERIOD_OPTIONS } from '@/features/analytics/hooks/useAnalyticsFilters';
import { AnalyticsTabKey } from '@/features/analytics/types';

type FunnelStageKey = 'new' | 'contacted' | 'trial_scheduled' | 'trial_held' | 'thinking' | 'paid' | 'lost';

export default function AnalyticsPage() {
  const { role } = useRole();
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<AnalyticsTabKey>('diagnostics');
  const { filters, setFilter } = useAnalyticsFilters();
  const [groups] = useState(() => (typeof window !== 'undefined' ? getStoredGroups() : INITIAL_GROUPS));
  const courses = INITIAL_COURSES;
  const teachers = INITIAL_TEACHERS;

  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedFunnelStage, setSelectedFunnelStage] = useState<FunnelStageKey | 'all' | null>(null);
  const [leadSearchTerm, setLeadSearchTerm] = useState('');
  const [leads, setLeads] = useState<FullLeadData[]>(() => {
    return typeof window !== 'undefined' ? getStoredLeads(true, true) : INITIAL_LEADS;
  });
  const [statusMenuOpenLeadId, setStatusMenuOpenLeadId] = useState<string | null>(null);

  const syncAnalyticsLeads = useCallback(() => {
    setLeads(getStoredLeads(true, true));
  }, []);

  useFocusSync(syncAnalyticsLeads);

  useEffect(() => {
    syncAnalyticsLeads();
    window.addEventListener('crm-leads-changed', syncAnalyticsLeads);
    return () => {
      window.removeEventListener('crm-leads-changed', syncAnalyticsLeads);
    };
  }, [syncAnalyticsLeads]);

  if (role !== 'owner' && role !== 'developer') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
          <Shield className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Доступ ограничен</h2>
        <p className="text-sm text-slate-500 max-w-md">
          Раздел сквозной аналитики и отчетов предназначен исключительно для владельца и руководителя школы.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
        >
          Вернуться на главную
        </button>
      </div>
    );
  }

  // Dynamic funnel calculation tied to real CRM leads data (7 stages)
  const activeLeads = leads.filter((l) => !l.is_deleted && !(l as any).isDeleted);
  const totalLeadsCount = activeLeads.length || 1;

  const countNew = activeLeads.length;
  const countContacted = activeLeads.filter((l) => l.status !== 'new' && l.status !== 'lost' && (l.status as string) !== 'no_response').length;
  const countTrialScheduled = activeLeads.filter((l) => l.status === 'trial_scheduled' || l.status === 'trial_held' || l.status === 'thinking' || l.status === 'paid' || !!l.trialDate).length;
  const countTrialHeld = activeLeads.filter((l) => l.status === 'trial_held' || l.status === 'thinking' || l.status === 'paid').length;
  const countThinking = activeLeads.filter((l) => l.status === 'thinking' || l.status === 'paid').length;
  const countPaid = activeLeads.filter((l) => l.status === 'paid').length;
  const countLost = activeLeads.filter((l) => l.status === 'lost' || (l.status as string) === 'no_response').length;

  const rateNew = '100%';
  const rateContacted = `${Math.round((countContacted / totalLeadsCount) * 1000) / 10}%`;
  const rateTrialScheduled = `${Math.round((countTrialScheduled / totalLeadsCount) * 1000) / 10}%`;
  const rateTrialHeld = `${Math.round((countTrialHeld / totalLeadsCount) * 1000) / 10}%`;
  const rateThinking = `${Math.round((countThinking / totalLeadsCount) * 1000) / 10}%`;
  const ratePaid = `${Math.round((countPaid / totalLeadsCount) * 1000) / 10}%`;
  const rateLost = `${Math.round((countLost / totalLeadsCount) * 1000) / 10}%`;

  const dropContacted = countNew > 0 ? `-${(Math.round(((countNew - countContacted) / countNew) * 1000) / 10)}%` : '0%';
  const dropTrialScheduled = countContacted > 0 ? `-${(Math.round(((countContacted - countTrialScheduled) / countContacted) * 1000) / 10)}%` : '0%';
  const dropTrialHeld = countTrialScheduled > 0 ? `-${(Math.round(((countTrialScheduled - countTrialHeld) / countTrialScheduled) * 1000) / 10)}%` : '0%';
  const dropThinking = countTrialHeld > 0 ? `-${(Math.round(((countTrialHeld - countThinking) / countTrialHeld) * 1000) / 10)}%` : '0%';
  const dropPaid = countThinking > 0 ? `-${(Math.round(((countThinking - countPaid) / countThinking) * 1000) / 10)}%` : '0%';

  const funnelSteps: Array<{
    id: FunnelStageKey;
    stepNumber: number;
    label: string;
    description: string;
    count: number;
    rate: string;
    drop: string | null;
    isGoal?: boolean;
    isNegative?: boolean;
    leadStatuses: string[];
    badgeColor: string;
  }> = [
    {
      id: 'new',
      stepNumber: 1,
      label: 'Новые обращения (Лиды)',
      description: 'Поступившие онлайн-заявки, звонки и мессенджеры',
      count: countNew,
      rate: rateNew,
      drop: null,
      leadStatuses: ['new'],
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    {
      id: 'contacted',
      stepNumber: 2,
      label: 'В работе / Квалификация',
      description: 'Менеджер связался с родителем, выявлены цели и потребности',
      count: countContacted,
      rate: rateContacted,
      drop: dropContacted,
      leadStatuses: ['contacted'],
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    {
      id: 'trial_scheduled',
      stepNumber: 3,
      label: 'Назначен пробный урок',
      description: 'Выбрана группа, дата и время пробного занятия',
      count: countTrialScheduled,
      rate: rateTrialScheduled,
      drop: dropTrialScheduled,
      leadStatuses: ['trial_scheduled'],
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    },
    {
      id: 'trial_held',
      stepNumber: 4,
      label: 'Пробный урок состоялся',
      description: 'Ребенок посетил урок, получен фидбек от педагога',
      count: countTrialHeld,
      rate: rateTrialHeld,
      drop: dropTrialHeld,
      leadStatuses: ['trial_held'],
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    },
    {
      id: 'thinking',
      stepNumber: 5,
      label: 'Принятие решения / Счёт',
      description: 'Согласование расписания, выбор тарифа и выставление счета',
      count: countThinking,
      rate: rateThinking,
      drop: dropThinking,
      leadStatuses: ['thinking'],
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    },
    {
      id: 'paid',
      stepNumber: 6,
      label: 'Оплата абонемента (Успех)',
      description: 'Оплачен абонемент, ученик зачислен в регулярную группу',
      count: countPaid,
      rate: ratePaid,
      drop: dropPaid,
      isGoal: true,
      leadStatuses: ['paid'],
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    {
      id: 'lost',
      stepNumber: 7,
      label: 'Отказ / В архиве',
      description: 'Неквалифицированные лиды, перенос или отказ от занятий',
      count: countLost,
      rate: rateLost,
      drop: null,
      isNegative: true,
      leadStatuses: ['lost', 'no_response'],
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    },
  ];

  // Retention cohorts
  const cohorts = [
    { cohort: 'Июнь 2026', startStudents: 24, m0: '100%', m1: '91.6%', m2: '87.5%', m3: '83.3%' },
    { cohort: 'Июль 2026', startStudents: 30, m0: '100%', m1: '93.3%', m2: '86.6%', m3: '—' },
    { cohort: 'Август 2026', startStudents: 35, m0: '100%', m1: '94.2%', m2: '—', m3: '—' },
    { cohort: 'Сентябрь 2026', startStudents: 42, m0: '100%', m1: '—', m2: '—', m3: '—' },
  ];

  // Teacher revenue performance
  const teacherRevenueByRange = {
    month: {
      total: '945 600 ₽',
      teachers: [
        {
          id: 't1',
          name: 'Мария Иванова',
          subject: 'Английский язык',
          role: 'Ведущий преподаватель',
          avatarColor: 'from-blue-500 to-indigo-600',
          students: 28,
          hours: 32,
          lessons: 16,
          revenue: '486 400 ₽',
          avgPerStudent: '17 370 ₽',
          share: 51.4,
          trend: '+8.4%',
          color: 'bg-blue-600',
        },
        {
          id: 't2',
          name: 'Денис Смирнов',
          subject: 'Робототехника и IT',
          role: 'Преподаватель робототехники',
          avatarColor: 'from-indigo-500 to-purple-600',
          students: 14,
          hours: 16,
          lessons: 8,
          revenue: '268 800 ₽',
          avgPerStudent: '19 200 ₽',
          share: 28.4,
          trend: '+12.1%',
          color: 'bg-indigo-600',
        },
        {
          id: 't3',
          name: 'Ольга Соколова',
          subject: 'Олимпиадная математика',
          role: 'Эксперт олимпиад',
          avatarColor: 'from-teal-500 to-emerald-600',
          students: 18,
          hours: 24,
          lessons: 12,
          revenue: '190 400 ₽',
          avgPerStudent: '10 580 ₽',
          share: 20.2,
          trend: '+4.5%',
          color: 'bg-teal-600',
        },
        {
          id: 't4',
          name: 'Анна Кузнецова',
          subject: 'Немецкий язык',
          role: 'Преподаватель немецкого языка',
          avatarColor: 'from-purple-500 to-pink-600',
          students: 0,
          hours: 0,
          lessons: 0,
          revenue: '0 ₽',
          avgPerStudent: '0 ₽',
          share: 0,
          trend: 'Идет набор',
          color: 'bg-purple-600',
        },
      ],
    },
    quarter: {
      total: '2 770 000 ₽',
      teachers: [
        {
          id: 't1',
          name: 'Мария Иванова',
          subject: 'Английский язык',
          role: 'Ведущий преподаватель',
          avatarColor: 'from-blue-500 to-indigo-600',
          students: 31,
          hours: 96,
          lessons: 48,
          revenue: '1 420 000 ₽',
          avgPerStudent: '45 800 ₽',
          share: 51.3,
          trend: '+10.2%',
          color: 'bg-blue-600',
        },
        {
          id: 't2',
          name: 'Денис Смирнов',
          subject: 'Робототехника и IT',
          role: 'Преподаватель робототехники',
          avatarColor: 'from-indigo-500 to-purple-600',
          students: 16,
          hours: 48,
          lessons: 24,
          revenue: '790 000 ₽',
          avgPerStudent: '49 375 ₽',
          share: 28.5,
          trend: '+15.4%',
          color: 'bg-indigo-600',
        },
        {
          id: 't3',
          name: 'Ольга Соколова',
          subject: 'Олимпиадная математика',
          role: 'Эксперт олимпиад',
          avatarColor: 'from-teal-500 to-emerald-600',
          students: 19,
          hours: 72,
          lessons: 36,
          revenue: '560 000 ₽',
          avgPerStudent: '29 470 ₽',
          share: 20.2,
          trend: '+6.8%',
          color: 'bg-teal-600',
        },
        {
          id: 't4',
          name: 'Анна Кузнецова',
          subject: 'Немецкий язык',
          role: 'Преподаватель немецкого языка',
          avatarColor: 'from-purple-500 to-pink-600',
          students: 0,
          hours: 0,
          lessons: 0,
          revenue: '0 ₽',
          avgPerStudent: '0 ₽',
          share: 0,
          trend: 'Идет набор',
          color: 'bg-purple-600',
        },
      ],
    },
    year: {
      total: '8 310 000 ₽',
      teachers: [
        {
          id: 't1',
          name: 'Мария Иванова',
          subject: 'Английский язык',
          role: 'Ведущий преподаватель',
          avatarColor: 'from-blue-500 to-indigo-600',
          students: 48,
          hours: 288,
          lessons: 144,
          revenue: '4 250 000 ₽',
          avgPerStudent: '88 540 ₽',
          share: 51.1,
          trend: '+14.0%',
          color: 'bg-blue-600',
        },
        {
          id: 't2',
          name: 'Денис Смирнов',
          subject: 'Робототехника и IT',
          role: 'Преподаватель робототехники',
          avatarColor: 'from-indigo-500 to-purple-600',
          students: 26,
          hours: 144,
          lessons: 72,
          revenue: '2 380 000 ₽',
          avgPerStudent: '91 500 ₽',
          share: 28.6,
          trend: '+18.2%',
          color: 'bg-indigo-600',
        },
        {
          id: 't3',
          name: 'Ольга Соколова',
          subject: 'Олимпиадная математика',
          role: 'Эксперт олимпиад',
          avatarColor: 'from-teal-500 to-emerald-600',
          students: 29,
          hours: 216,
          lessons: 108,
          revenue: '1 680 000 ₽',
          avgPerStudent: '57 930 ₽',
          share: 20.3,
          trend: '+9.1%',
          color: 'bg-teal-600',
        },
        {
          id: 't4',
          name: 'Анна Кузнецова',
          subject: 'Немецкий язык',
          role: 'Преподаватель немецкого языка',
          avatarColor: 'from-purple-500 to-pink-600',
          students: 0,
          hours: 0,
          lessons: 0,
          revenue: '0 ₽',
          avgPerStudent: '0 ₽',
          share: 0,
          trend: 'Идет набор',
          color: 'bg-purple-600',
        },
      ],
    },
  };

  // Course performance by range
  const coursesByRange = {
    month: [
      { name: 'Английский язык', students: 64, revenue: '486 400 ₽', share: 51.4, color: 'bg-blue-600' },
      { name: 'Робототехника', students: 32, revenue: '268 800 ₽', share: 28.4, color: 'bg-indigo-600' },
      { name: 'Олимпиадная математика', students: 28, revenue: '190 400 ₽', share: 20.2, color: 'bg-teal-600' },
      { name: 'Немецкий язык', students: 0, revenue: '0 ₽', share: 0, color: 'bg-purple-600' },
    ],
    quarter: [
      { name: 'Английский язык', students: 78, revenue: '1 420 000 ₽', share: 51.3, color: 'bg-blue-600' },
      { name: 'Робототехника', students: 42, revenue: '790 000 ₽', share: 28.5, color: 'bg-indigo-600' },
      { name: 'Олимпиадная математика', students: 35, revenue: '560 000 ₽', share: 20.2, color: 'bg-teal-600' },
      { name: 'Немецкий язык', students: 0, revenue: '0 ₽', share: 0, color: 'bg-purple-600' },
    ],
    year: [
      { name: 'Английский язык', students: 120, revenue: '4 250 000 ₽', share: 51.1, color: 'bg-blue-600' },
      { name: 'Робототехника', students: 65, revenue: '2 380 000 ₽', share: 28.6, color: 'bg-indigo-600' },
      { name: 'Олимпиадная математика', students: 54, revenue: '1 680 000 ₽', share: 20.3, color: 'bg-teal-600' },
      { name: 'Немецкий язык', students: 0, revenue: '0 ₽', share: 0, color: 'bg-purple-600' },
    ],
  };

  const currentTeacherData = teacherRevenueByRange[timeRange];
  const mockCoursesStats = coursesByRange[timeRange];

  const handleExport = () => {
    try {
      const periodLabel =
        PERIOD_OPTIONS.find((p) => p.value === filters.period)?.label || filters.period;
      const nowStr = new Date().toLocaleString('ru-RU');

      const csvRows: string[] = [];
      csvRows.push('ОТЧЕТ: АНАЛИТИКА ШКОЛЫ И ПОКАЗАТЕЛИ ЭФФЕКТИВНОСТИ');
      csvRows.push(`Период:;${periodLabel}`);
      csvRows.push(`Дата и время выгрузки:;${nowStr}`);
      csvRows.push('');

      // 1. KPI
      csvRows.push('=== 1. КЛЮЧЕВЫЕ МЕТРИКИ (KPI) ===');
      csvRows.push('Показатель;Значение;Динамика / Пояснение');
      csvRows.push('Удержание учеников (Retention);91.4%;+2.1% к прошлому периоду');
      csvRows.push('Сквозная конверсия CRM;35.7%;10 оплат из 28 обращений');
      csvRows.push('Средний LTV ученика;45 600 ₽;+5.4%');
      csvRows.push(`Совокупная выручка за период;${currentTeacherData.total};100% от плана`);
      csvRows.push(`Учеников в активных группах;${mockCoursesStats.reduce((acc, c) => acc + c.students, 0)};чел.`);
      csvRows.push('');

      // 2. Funnel
      csvRows.push('=== 2. ВОРОНКА ПРОДАЖ И СДЕЛОК CRM ===');
      csvRows.push('Этап воронки;Количество лидов;Конверсия');
      funnelSteps.forEach((s) => {
        csvRows.push(`"${s.label}";${s.count};${s.rate}`);
      });
      csvRows.push('');

      // 3. Teachers
      csvRows.push('=== 3. ВЫРУЧКА И НАГРУЗКА ПРЕПОДАВАТЕЛЕЙ ===');
      csvRows.push('Преподаватель;Направление;Выручка;Доля от выручки;Учеников;Часов;Занятий;Динамика');
      currentTeacherData.teachers.forEach((t) => {
        csvRows.push(`"${t.name}";"${t.subject}";${t.revenue};${t.share}%;${t.students};${t.hours};${t.lessons};${t.trend}`);
      });
      csvRows.push('');

      // 4. Courses
      csvRows.push('=== 4. НАПРАВЛЕНИЯ ОБУЧЕНИЯ И КУРСЫ ===');
      csvRows.push('Курс;Учеников;Выручка;Доля выручки');
      mockCoursesStats.forEach((c) => {
        csvRows.push(`"${c.name}";${c.students};${c.revenue};${c.share}%`);
      });
      csvRows.push('');

      // 5. Leads
      csvRows.push('=== 5. РЕЕСТР ОБРАЩЕНИЙ И ЛИДОВ ===');
      csvRows.push('Имя контакта;Имя ученика;Направление;Контакты;Тариф / Сумма;Текущий статус;Дата создания');
      leads.forEach((l) => {
        csvRows.push(
          `"${l.name}";"${l.studentName || '—'}";"${l.directionOrCourse || '—'}";"${l.contact}";"${l.offerAmount || '—'}";"${l.status}";"${l.createdAt}"`
        );
      });

      const csvString = '\uFEFF' + csvRows.join('\r\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = `analytics_report_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Отчет «${filename}» успешно сформирован и скачан!`);
    } catch (err) {
      console.error('Ошибка экспорта отчета:', err);
      toast.error('Не удалось сформировать файл отчета');
    }
  };

  // Render funnel stage table
  const renderFunnelTable = (targetStage: FunnelStageKey | 'all') => {
    const activeStep = targetStage === 'all' ? null : funnelSteps.find((s) => s.id === targetStage);
    const stageFilteredLeads = leads.filter((lead) => {
      if (targetStage !== 'all') {
        if (activeStep && !activeStep.leadStatuses.includes(lead.status)) return false;
      }
      if (leadSearchTerm.trim()) {
        const term = leadSearchTerm.toLowerCase();
        return (
          lead.name.toLowerCase().includes(term) ||
          (lead.studentName || '').toLowerCase().includes(term) ||
          lead.contact.toLowerCase().includes(term) ||
          (lead.directionOrCourse || '').toLowerCase().includes(term)
        );
      }
      return true;
    });

    return (
      <div className="rounded-2xl border-2 border-purple-300 bg-gradient-to-b from-purple-50/40 via-white to-white p-4 sm:p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
        {/* Table Header & Stage Switcher */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-lg bg-purple-600 p-1.5 text-white">
                <Table className="h-4 w-4" />
              </span>
              <h3 className="font-bold text-slate-900 text-sm">
                {targetStage === 'all'
                  ? 'Все обращения воронки конверсии'
                  : `Лиды этапа ${activeStep?.stepNumber}: «${activeStep?.label}»`}
              </h3>
              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800">
                {stageFilteredLeads.length} лидов
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFunnelStage(null);
                }}
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 font-medium px-2 py-0.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors ml-auto"
                title="Свернуть таблицу этого этапа"
              >
                <X className="h-3 w-3" />
                Свернуть
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {targetStage === 'all'
                ? 'Сводный реестр всех потенциальных учеников на разных этапах воронки'
                : activeStep?.description}
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={leadSearchTerm}
              onChange={(e) => setLeadSearchTerm(e.target.value)}
              placeholder="Поиск лида, ученика, курса..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
            />
            {leadSearchTerm && (
              <button
                type="button"
                onClick={() => setLeadSearchTerm('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Stage Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setSelectedFunnelStage('all')}
            className={cn(
              'rounded-lg px-2.5 py-1 font-semibold transition-all',
              selectedFunnelStage === 'all'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            Все этапы ({leads.length})
          </button>
          {funnelSteps.map((s) => {
            const count = leads.filter((l) => s.leadStatuses.includes(l.status)).length;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedFunnelStage(s.id)}
                className={cn(
                  'rounded-lg px-2.5 py-1 font-semibold transition-all flex items-center gap-1.5',
                  selectedFunnelStage === s.id
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                <span>{s.stepNumber}. {s.label.split(' ')[0]}</span>
                <span className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                  selectedFunnelStage === s.id ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-700'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="py-3 pl-4 pr-3">Лид / Заявитель</th>
                <th className="px-3 py-3">Ученик</th>
                <th className="px-3 py-3">Курс / Предмет</th>
                <th className="px-3 py-3">Контакты</th>
                <th className="px-3 py-3">Менеджер</th>
                <th className="px-3 py-3">Статус в воронке</th>
                <th className="px-3 py-3">Следующее действие</th>
                <th className="py-3 pl-3 pr-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {stageFilteredLeads.map((lead) => {
                const statusConfig = {
                  new: { label: 'Новый', badgeClass: 'bg-blue-100 text-blue-800' },
                  contacted: { label: 'Квалификация', badgeClass: 'bg-amber-100 text-amber-800' },
                  trial_scheduled: { label: 'Пробный назначен', badgeClass: 'bg-purple-100 text-purple-800' },
                  trial_held: { label: 'Пробный проведен', badgeClass: 'bg-indigo-100 text-indigo-800' },
                  thinking: { label: 'Думают / Счёт', badgeClass: 'bg-teal-100 text-teal-800' },
                  paid: { label: 'Оплачено (Успех)', badgeClass: 'bg-emerald-100 text-emerald-800' },
                  lost: { label: 'Отказ', badgeClass: 'bg-rose-100 text-rose-800' },
                  no_response: { label: 'Не отвечает', badgeClass: 'bg-slate-200 text-slate-700' },
                }[lead.status] || { label: lead.status, badgeClass: 'bg-slate-100 text-slate-700' };

                const cleanPhone = lead.contact.replace(/[^\d+]/g, '');

                return (
                  <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Лид / Заявитель */}
                    <td className="py-3 pl-4 pr-3">
                      <Link
                        href={`/crm/leads/${lead.id}`}
                        className="font-bold text-slate-900 hover:text-purple-600 transition-colors flex items-center gap-1.5"
                      >
                        {lead.name}
                        <ArrowUpRight className="h-3 w-3 text-slate-400" />
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                        <span>{lead.source}</span>
                        <span>•</span>
                        <span>{new Date(lead.createdAt).toLocaleDateString('ru-RU')}</span>
                      </div>
                    </td>

                    {/* Ученик */}
                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-900">{lead.studentName || '—'}</p>
                      <p className="text-[10px] text-slate-400">{lead.studentAge || 'Возраст не указан'}</p>
                    </td>

                    {/* Курс */}
                    <td className="px-3 py-3">
                      <span className="font-semibold text-slate-900">{lead.directionOrCourse || '—'}</span>
                      {lead.level && (
                        <p className="text-[10px] text-slate-400">{lead.level}</p>
                      )}
                    </td>

                    {/* Контакты */}
                    <td className="px-3 py-3 space-y-1">
                      <a
                        href={`tel:${cleanPhone}`}
                        className="font-medium text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3 text-slate-400" />
                        {lead.contact}
                      </a>
                      <div className="flex items-center gap-2">
                        {lead.telegram && (
                          <span className="text-[10px] text-blue-600 flex items-center gap-0.5">
                            <Send className="h-2.5 w-2.5" />
                            {lead.telegram}
                          </span>
                        )}
                        <a
                          href={`https://wa.me/${cleanPhone.replace('+', '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                        >
                          <MessageSquare className="h-2.5 w-2.5" />
                          WA
                        </a>
                      </div>
                    </td>

                    {/* Менеджер */}
                    <td className="px-3 py-3">
                      <span className="text-slate-700 font-medium">{lead.assignedTo}</span>
                    </td>

                    {/* Статус */}
                    <td className="px-3 py-3 relative">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold',
                            statusConfig.badgeClass
                          )}
                        >
                          {statusConfig.label}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStatusMenuOpenLeadId(
                              statusMenuOpenLeadId === lead.id ? null : lead.id
                            );
                          }}
                          className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                          title="Быстро сменить статус"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Dropdown status switcher */}
                      {statusMenuOpenLeadId === lead.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-3 top-10 z-20 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg text-xs"
                        >
                          <p className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Сменить этап:
                          </p>
                          {[
                            { key: 'new', label: '1. Новый' },
                            { key: 'contacted', label: '2. Квалификация' },
                            { key: 'trial_scheduled', label: '3. Назначен пробный' },
                            { key: 'trial_held', label: '4. Пробный состоялся' },
                            { key: 'paid', label: '5. Оплачено' },
                          ].map((st) => (
                            <button
                              key={st.key}
                              type="button"
                              onClick={() => {
                                setLeads((prev) =>
                                  prev.map((l) =>
                                    l.id === lead.id ? { ...l, status: st.key as any } : l
                                  )
                                );
                                setStatusMenuOpenLeadId(null);
                                toast.success(`Статус лида обновлен на «${st.label}»`);
                              }}
                              className={cn(
                                'w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors',
                                lead.status === st.key
                                  ? 'bg-purple-50 text-purple-700'
                                  : 'hover:bg-slate-50 text-slate-700'
                              )}
                            >
                              <span>{st.label}</span>
                              {lead.status === st.key && <Check className="h-3 w-3 text-purple-600" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Следующее действие */}
                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-900 line-clamp-1">{lead.nextAction || '—'}</p>
                      <p className="text-[10px] text-purple-600 font-medium">{lead.nextActionDate}</p>
                    </td>

                    {/* Действия */}
                    <td className="py-3 pl-3 pr-4 text-right">
                      <Link
                        href={`/crm/leads/${lead.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-purple-50 border border-purple-200 px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-100 transition-colors shadow-2xs"
                      >
                        Карточка →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Empty state */}
          {stageFilteredLeads.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-500">
              <p className="font-semibold">По выбранным параметрам лидов не найдено</p>
              <button
                type="button"
                onClick={() => {
                  setLeadSearchTerm('');
                  setSelectedFunnelStage('all');
                }}
                className="mt-2 text-purple-600 font-bold hover:underline"
              >
                Показать все лиды
              </button>
            </div>
          )}
        </div>

        {/* Table Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-2 text-xs text-slate-500 gap-2">
          <p>
            Показаны лиды этапа конверсии. Вы можете перейти в карточку каждого лида для просмотра полной истории взаимодействий.
          </p>
          <Link
            href="/crm"
            className="inline-flex items-center gap-1 font-bold text-purple-600 hover:text-purple-700 hover:underline shrink-0"
          >
            Открыть CRM-воронку сделок (Канбан-доска)
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col space-y-1.5">
      {/* 1. Page Header with Title and Global Filters Bar */}
      <AnalyticsHeader
        subtitle={
          activeTab === 'reports'
            ? 'Детальные отчёты — Операционная работа команды: администраторы, задачи, обращения, оплаты и сопровождение'
            : activeTab === 'sales'
            ? 'Продажи и конверсия — анализ воронки, каналов и причин потери лидов'
            : activeTab === 'retention'
            ? 'Ученики и удержание — анализ активностей, продлений и причин ухода'
            : activeTab === 'finance'
            ? 'Финансы и доходность — выручка, оплаты, задолженности и финансовые риски'
            : activeTab === 'groups'
            ? 'Группы — состав, стабильность и операционные проблемы'
            : activeTab === 'teachers'
            ? 'Преподаватели — нагрузка, стабильность и результаты работы'
            : undefined
        }
        filters={filters}
        onFilterChange={setFilter}
        courses={courses}
        groups={groups}
        teachers={teachers}
        onExport={handleExport}
      />

      {/* 2. Horizontal Navigation Tab Bar */}
      <AnalyticsTabsNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* 3. Tab: ДИАГНОСТИКА (Active by Default) */}
      {activeTab === 'diagnostics' && (
        <DiagnosticsCockpit filters={filters} onNavigateTab={setActiveTab} />
      )}

      {/* 4. Tab: ДЕТАЛЬНЫЕ ОТЧЕТЫ (Operational Reports per Reference) */}
      {activeTab === 'reports' && (
        <DetailedReportsSection filters={filters} courses={courses} />
      )}

      {/* 5. Tab: ПРОДАЖИ И КОНВЕРСИЯ */}
      {activeTab === 'sales' && (
        <SalesAnalyticsSection filters={filters} courses={courses} />
      )}

      {/* 6. Tab: УЧЕНИКИ И УДЕРЖАНИЕ */}
      {activeTab === 'retention' && (
        <RetentionAnalyticsSection filters={filters} />
      )}

      {/* 7. Tab: ПРЕПОДАВАТЕЛИ */}
      {activeTab === 'teachers' && (
        <TeachersAnalyticsSection filters={filters} courses={courses} />
      )}

      {/* 8. Tab: ФИНАНСЫ И ДОХОДНОСТЬ */}
      {activeTab === 'finance' && (
        <FinanceAnalyticsSection filters={filters} courses={courses} />
      )}

      {/* 9. Tab: ГРУППЫ */}
      {activeTab === 'groups' && (
        <GroupsAnalyticsSection filters={filters} courses={courses} />
      )}
    </div>
  );
}
