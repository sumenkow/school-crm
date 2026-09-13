'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { INITIAL_LEADS, FullLeadData } from '@/lib/data/mockData';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { Shield } from 'lucide-react';

type FunnelStageKey = 'new' | 'contacted' | 'trial_scheduled' | 'trial_held' | 'paid';

export default function AnalyticsPage() {
  const { role } = useRole();
  const router = useRouter();
  const toast = useToast();
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month');
  const [teacherViewMode, setTeacherViewMode] = useState<'chart' | 'table' | 'cards'>('chart');
  const [selectedFunnelStage, setSelectedFunnelStage] = useState<FunnelStageKey | 'all' | null>(null);
  const [leadSearchTerm, setLeadSearchTerm] = useState('');
  const [leads, setLeads] = useState<FullLeadData[]>(INITIAL_LEADS);
  const [statusMenuOpenLeadId, setStatusMenuOpenLeadId] = useState<string | null>(null);

  // Funnel steps with lead status mappings
  const funnelSteps: Array<{
    id: FunnelStageKey;
    stepNumber: number;
    label: string;
    description: string;
    count: number;
    rate: string;
    drop: string | null;
    isGoal?: boolean;
    leadStatuses: string[];
    badgeColor: string;
  }> = [
    {
      id: 'new',
      stepNumber: 1,
      label: 'Новые обращения (Лиды)',
      description: 'Поступившие онлайн-заявки и первичные звонки',
      count: 28,
      rate: '100%',
      drop: null,
      leadStatuses: ['new'],
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    {
      id: 'contacted',
      stepNumber: 2,
      label: 'Успешный контакт / Квалификация',
      description: 'Менеджер связался с родителем, выявлены цели и потребности',
      count: 24,
      rate: '85.7%',
      drop: '-14.3%',
      leadStatuses: ['contacted', 'thinking'],
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    {
      id: 'trial_scheduled',
      stepNumber: 3,
      label: 'Назначен пробный урок',
      description: 'Выбрана группа, дата и время пробного занятия',
      count: 18,
      rate: '64.2%',
      drop: '-21.5%',
      leadStatuses: ['trial_scheduled'],
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    },
    {
      id: 'trial_held',
      stepNumber: 4,
      label: 'Пробный урок состоялся',
      description: 'Ребенок посетил урок, получен фидбек от педагога',
      count: 14,
      rate: '50.0%',
      drop: '-14.2%',
      leadStatuses: ['trial_held'],
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    },
    {
      id: 'paid',
      stepNumber: 5,
      label: 'Оплата абонемента (Конверсия)',
      description: 'Оплачен абонемент, ученик зачислен в регулярную группу',
      count: 10,
      rate: '35.7%',
      drop: '-14.3%',
      isGoal: true,
      leadStatuses: ['paid'],
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
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
      ],
    },
  };

  // Course performance by range
  const coursesByRange = {
    month: [
      { name: 'Английский язык', students: 64, revenue: '486 400 ₽', share: 51.4, color: 'bg-blue-600' },
      { name: 'Робототехника', students: 32, revenue: '268 800 ₽', share: 28.4, color: 'bg-indigo-600' },
      { name: 'Олимпиадная математика', students: 28, revenue: '190 400 ₽', share: 20.2, color: 'bg-teal-600' },
    ],
    quarter: [
      { name: 'Английский язык', students: 78, revenue: '1 420 000 ₽', share: 51.3, color: 'bg-blue-600' },
      { name: 'Робототехника', students: 42, revenue: '790 000 ₽', share: 28.5, color: 'bg-indigo-600' },
      { name: 'Олимпиадная математика', students: 35, revenue: '560 000 ₽', share: 20.2, color: 'bg-teal-600' },
    ],
    year: [
      { name: 'Английский язык', students: 120, revenue: '4 250 000 ₽', share: 51.1, color: 'bg-blue-600' },
      { name: 'Робототехника', students: 65, revenue: '2 380 000 ₽', share: 28.6, color: 'bg-indigo-600' },
      { name: 'Олимпиадная математика', students: 54, revenue: '1 680 000 ₽', share: 20.3, color: 'bg-teal-600' },
    ],
  };

  const currentTeacherData = teacherRevenueByRange[timeRange];
  const courses = coursesByRange[timeRange];
  const [hoveredTeacherId, setHoveredTeacherId] = useState<string | null>(null);

  // Calculate pie chart donut slices
  let accumulatedPercent = 0;
  const pieSlices = currentTeacherData.teachers.map((teacher) => {
    const percent = teacher.share;
    const strokeDasharray = `${(percent / 100) * 439.823} ${439.823}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * 439.823);
    accumulatedPercent += percent;
    return {
      ...teacher,
      strokeDasharray,
      strokeDashoffset,
      pieColor: teacher.id === 't1' ? '#2563eb' : teacher.id === 't2' ? '#4f46e5' : '#0d9488',
    };
  });

  const handleExport = () => {
    alert('Экспорт аналитического отчета в формате Excel (.xlsx) успешно сформирован!');
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

  if (role !== 'owner') {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto py-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Аналитика школы</h1>
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 mb-4">
            <Shield className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Доступ ограничен</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Раздел сквозной финансовой и маркетинговой аналитики доступен только в режиме Владельца школы.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
            >
              Вернуться на дашборд
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Сквозная аналитика школы</h1>
          <p className="text-sm text-slate-500">
            Воронка продаж, когортное удержание (retention), доходы по направлениям и эффективность педагогов
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time range selector */}
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setTimeRange('month')}
              className={cn('rounded px-2.5 py-1 transition-all', timeRange === 'month' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600')}
            >
              Сентябрь
            </button>
            <button
              onClick={() => setTimeRange('quarter')}
              className={cn('rounded px-2.5 py-1 transition-all', timeRange === 'quarter' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600')}
            >
              3-й квартал
            </button>
            <button
              onClick={() => setTimeRange('year')}
              className={cn('rounded px-2.5 py-1 transition-all', timeRange === 'year' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600')}
            >
              2026 год
            </button>
          </div>

          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            Экспорт отчета
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Удержание (Retention)</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">91.4%</p>
          <p className="mt-1 text-xs font-medium text-emerald-600 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> +2.1% к прошлому месяцу
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Сквозная конверсия CRM</p>
          <p className="mt-1 text-3xl font-extrabold text-purple-700">35.7%</p>
          <p className="mt-1 text-xs font-medium text-emerald-600">
            10 оплат из 28 обращений
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Посещаемость по школе</p>
          <p className="mt-1 text-3xl font-extrabold text-blue-600">92.8%</p>
          <p className="mt-1 text-xs text-slate-500">Норма &gt; 85%</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">LTV Ученика</p>
          <p className="mt-1 text-3xl font-extrabold text-emerald-600">54 200 ₽</p>
          <p className="mt-1 text-xs text-slate-500">~7.2 месяцев цикл жизни</p>
        </div>
      </div>

      {/* Section 1: ВОРОНКА ПРОДАЖ (FUNNEL WATERFALL) С ТАБЛИЦЕЙ ЛИДОВ ПО ЭТАПАМ */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-600" />
              Воронка конверсии из заявки в оплаченного ученика
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Нажмите на любой этап конверсии, чтобы развернуть список лидов прямо под ним
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedFunnelStage ? (
              <button
                onClick={() => setSelectedFunnelStage(null)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <X className="h-3.5 w-3.5" />
                Свернуть таблицу
              </button>
            ) : (
              <button
                onClick={() => setSelectedFunnelStage('all')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-50 border border-purple-200 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 transition-colors shadow-2xs"
              >
                <Table className="h-3.5 w-3.5" />
                Показать все лиды воронки
              </button>
            )}
          </div>
        </div>

        {/* Funnel Steps (Interactive clickable bars with in-place accordion tables) */}
        <div className="space-y-3 pt-1">
          {funnelSteps.map((step, idx) => {
            const isSelected = selectedFunnelStage === step.id;
            const stageLeadsCount = leads.filter((l) => step.leadStatuses.includes(l.status)).length;

            return (
              <div key={step.id} className="space-y-2">
                <div
                  onClick={() => setSelectedFunnelStage(isSelected ? null : step.id)}
                  className={cn(
                    'group rounded-xl border p-3 transition-all cursor-pointer select-none',
                    isSelected
                      ? 'border-purple-500 bg-purple-50/70 shadow-sm ring-2 ring-purple-300'
                      : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-slate-50/80 hover:shadow-2xs'
                  )}
                  title={isSelected ? 'Нажмите, чтобы свернуть таблицу лидов' : 'Нажмите, чтобы открыть таблицу лидов прямо под этим этапом'}
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold',
                          isSelected
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-100 text-slate-700 group-hover:bg-purple-100 group-hover:text-purple-700 transition-colors'
                        )}
                      >
                        {step.stepNumber}
                      </span>
                      <div>
                        <span className={cn('font-bold', step.isGoal ? 'text-emerald-700' : 'text-slate-900')}>
                          {step.label}
                        </span>
                        <span className="hidden md:inline-block text-[11px] text-slate-400 ml-2">
                          — {step.description}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {step.drop && (
                        <span className="text-[11px] text-rose-500 font-semibold">{step.drop}</span>
                      )}
                      <span className="font-extrabold text-slate-900 text-sm">
                        {stageLeadsCount} лид.
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                        {step.rate}
                      </span>
                      <span
                        className={cn(
                          'text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 transition-all',
                          isSelected
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-purple-50 text-purple-700 border border-purple-200 group-hover:bg-purple-100'
                        )}
                      >
                        {isSelected ? 'Свернуть таблицу ▲' : 'Лиды этапа ▼'}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar visual */}
                  <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        step.isGoal
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                      )}
                      style={{ width: step.rate }}
                    />
                  </div>
                </div>

                {/* Direct inline table right below this stage */}
                {isSelected && (
                  <div className="pt-1 pb-1">
                    {renderFunnelTable(step.id)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* DETAILED LEADS TABLE WHEN "ALL" IS SELECTED */}
        {selectedFunnelStage === 'all' && (
          <div className="pt-2">
            {renderFunnelTable('all')}
          </div>
        )}
      </div>

      {/* Section 2: КОГОРТНЫЙ АНАЛИЗ УДЕРЖАНИЯ (COHORT RETENTION) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Когортный анализ удержания учеников (Retention Rate)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Процент учеников, продолжающих обучение в школе месяц за месяцем
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="py-3 pl-4 pr-3">Когорта (Месяц старта)</th>
                <th className="px-3 py-3 text-center">Стартовый набор</th>
                <th className="px-3 py-3 text-center">M0 (Старт)</th>
                <th className="px-3 py-3 text-center">M1 (2-й мес)</th>
                <th className="px-3 py-3 text-center">M2 (3-й мес)</th>
                <th className="py-3 pl-3 pr-4 text-center">M3 (4-й мес)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {cohorts.map((c, i) => (
                <tr key={i} className="hover:bg-slate-50/70">
                  <td className="py-3 pl-4 pr-3 font-bold text-slate-900">{c.cohort}</td>
                  <td className="px-3 py-3 text-center font-semibold text-slate-800">{c.startStudents} чел.</td>
                  <td className="px-3 py-3 text-center bg-blue-50/60 font-bold text-blue-900">{c.m0}</td>
                  <td className="px-3 py-3 text-center font-bold text-emerald-700 bg-emerald-50/40">{c.m1}</td>
                  <td className="px-3 py-3 text-center font-bold text-emerald-700 bg-emerald-50/30">{c.m2}</td>
                  <td className="py-3 pl-3 pr-4 text-center font-bold text-slate-600">{c.m3}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: ВЫРУЧКА ПО ПРЕПОДАВАТЕЛЯМ */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-indigo-600" />
              Выручка по отдельным преподавателям
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Сгенерированный доход, учебная выработка и финансовая эффективность педагогического состава
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              <button
                onClick={() => setTeacherViewMode('chart')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all',
                  teacherViewMode === 'chart'
                    ? 'bg-white shadow-xs text-indigo-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <PieChart className="h-3.5 w-3.5" />
                Диаграмма
              </button>
              <button
                onClick={() => setTeacherViewMode('table')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all',
                  teacherViewMode === 'table'
                    ? 'bg-white shadow-xs text-indigo-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <Table className="h-3.5 w-3.5" />
                Таблица
              </button>
              <button
                onClick={() => setTeacherViewMode('cards')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all',
                  teacherViewMode === 'cards'
                    ? 'bg-white shadow-xs text-indigo-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Карточки
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Суммарно:</span>
              <span className="text-sm font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-xl">
                {currentTeacherData.total}
              </span>
            </div>
          </div>
        </div>

        {/* 1. PIE / DONUT CHART VIEW */}
        {teacherViewMode === 'chart' && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-slate-200/60 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieChart className="h-4 w-4 text-indigo-600" />
                Круговая диаграмма распределения выручки («пирог»)
              </h3>
              <span className="text-[11px] text-slate-500">
                Наведите курсор на сектор или преподавателя для детализации
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Donut Graphic */}
              <div className="md:col-span-5 flex items-center justify-center py-2">
                <div className="relative flex items-center justify-center">
                  <svg className="h-56 w-56 transform -rotate-90" viewBox="0 0 200 200">
                    <circle
                      cx="100"
                      cy="100"
                      r="70"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="24"
                    />
                    {pieSlices.map((slice) => {
                      const isHovered = hoveredTeacherId === slice.id;
                      return (
                        <circle
                          key={slice.id}
                          cx="100"
                          cy="100"
                          r="70"
                          fill="none"
                          stroke={slice.pieColor}
                          strokeWidth={isHovered ? 28 : 22}
                          strokeDasharray={slice.strokeDasharray}
                          strokeDashoffset={slice.strokeDashoffset}
                          className="transition-all duration-200 cursor-pointer"
                          onMouseEnter={() => setHoveredTeacherId(slice.id)}
                          onMouseLeave={() => setHoveredTeacherId(null)}
                        />
                      );
                    })}
                  </svg>

                  {/* Center Label inside Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                    {hoveredTeacherId ? (
                      (() => {
                        const hTeacher = currentTeacherData.teachers.find(t => t.id === hoveredTeacherId);
                        return (
                          <>
                            <span className="text-[11px] font-bold text-slate-600 line-clamp-1">{hTeacher?.name}</span>
                            <span className="text-lg font-black text-slate-950 mt-0.5">{hTeacher?.revenue}</span>
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full mt-1">
                              {hTeacher?.share}% от школы
                            </span>
                          </>
                        );
                      })()
                    ) : (
                      <>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Выручка</span>
                        <span className="text-lg font-black text-slate-900 mt-0.5">{currentTeacherData.total}</span>
                        <span className="text-[10px] font-medium text-slate-500 mt-0.5">3 преподавателя</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Interactive Legend with Bars */}
              <div className="md:col-span-7 space-y-2.5">
                {currentTeacherData.teachers.map((t) => {
                  const isHovered = hoveredTeacherId === t.id;
                  const dotColor = t.id === 't1' ? '#2563eb' : t.id === 't2' ? '#4f46e5' : '#0d9488';
                  return (
                    <div
                      key={t.id}
                      onMouseEnter={() => setHoveredTeacherId(t.id)}
                      onMouseLeave={() => setHoveredTeacherId(null)}
                      className={cn(
                        'p-3 rounded-xl border transition-all cursor-pointer',
                        isHovered
                          ? 'border-indigo-400 bg-white shadow-xs'
                          : 'border-slate-200/80 bg-white hover:border-slate-300'
                      )}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: dotColor }}
                          />
                          <span className="font-bold text-slate-900">{t.name}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500 text-[11px]">{t.subject}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-950 text-xs sm:text-sm">{t.revenue}</span>
                          <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-[11px]">
                            {t.share}%
                          </span>
                        </div>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{t.students} учеников в группах</span>
                        <span>{t.lessons} уроков ({t.hours} ч.)</span>
                        <span>Ср. чек: <b>{t.avgPerStudent}</b></span>
                      </div>

                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mt-2">
                        <div
                          className={cn('h-full rounded-full transition-all duration-300', t.color)}
                          style={{ width: `${t.share}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 2. CARDS VIEW */}
        {teacherViewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-200">
            {currentTeacherData.teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-4 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('h-10 w-10 rounded-xl bg-gradient-to-br text-white font-bold flex items-center justify-center text-sm shadow-xs', teacher.avatarColor)}>
                        {teacher.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{teacher.name}</h3>
                        <p className="text-[11px] text-slate-500">{teacher.subject}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {teacher.trend}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-extrabold text-slate-900">{teacher.revenue}</span>
                      <span className="text-xs font-bold text-indigo-600">{teacher.share}% выручки</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className={cn('h-full rounded-full', teacher.color)} style={{ width: `${teacher.share}%` }} />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 text-center text-xs border border-slate-100">
                    <div>
                      <div className="text-[10px] text-slate-400">Учеников</div>
                      <div className="font-bold text-slate-800">{teacher.students}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Занятий</div>
                      <div className="font-bold text-slate-800">{teacher.lessons}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Ср. чек</div>
                      <div className="font-bold text-slate-800">{teacher.avgPerStudent}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500">Нагрузка: <b>{teacher.hours} ч.</b></span>
                  <Link
                    href={`/teachers/${teacher.id}`}
                    className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                  >
                    Профиль <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 3. TABLE VIEW */}
        {teacherViewMode === 'table' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 animate-in fade-in duration-200">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="py-3 pl-4 pr-3">Преподаватель</th>
                  <th className="px-3 py-3">Предмет / Направление</th>
                  <th className="px-3 py-3 text-right">Выручка</th>
                  <th className="px-3 py-3 text-center">Доля</th>
                  <th className="px-3 py-3 text-center">Учеников</th>
                  <th className="px-3 py-3 text-center">Занятий</th>
                  <th className="px-3 py-3 text-right">Ср. доход на ученика</th>
                  <th className="px-3 py-3 text-center">Динамика</th>
                  <th className="py-3 pl-3 pr-4 text-right">Карточка</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                {currentTeacherData.teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 pl-4 pr-3 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className={cn('h-6 w-6 rounded-md bg-gradient-to-br text-white text-[10px] font-bold flex items-center justify-center', t.avatarColor)}>
                          {t.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span>{t.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{t.subject}</td>
                    <td className="px-3 py-3 text-right font-extrabold text-slate-900">{t.revenue}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full text-[11px]">
                        {t.share}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-slate-800">{t.students} чел.</td>
                    <td className="px-3 py-3 text-center font-medium text-slate-600">{t.lessons} ур.</td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-800">{t.avgPerStudent}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="font-bold text-emerald-600 text-[11px]">{t.trend}</span>
                    </td>
                    <td className="py-3 pl-3 pr-4 text-right">
                      <Link
                        href={`/teachers/${t.id}`}
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-medium transition-colors"
                      >
                        Открыть →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 4: ВЫРУЧКА ПО УЧЕБНЫМ НАПРАВЛЕНИЯМ (ОНЛАЙН-КУРСЫ) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              Выручка по учебным направлениям (онлайн-курсы)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Распределение дохода и активных учеников по направлениям школы
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-500">
            Всего активных учеников: <span className="text-slate-900 font-extrabold">{courses.reduce((acc, c) => acc + c.students, 0)}</span>
          </div>
        </div>

        {/* Direction Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {courses.map((course, idx) => (
            <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{course.name}</span>
                <span className="rounded-full bg-slate-200/80 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                  {course.share}%
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-500">{course.students} учеников</span>
                <span className="text-base font-extrabold text-slate-900">{course.revenue}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                <div className={cn('h-full rounded-full', course.color)} style={{ width: `${course.share}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
