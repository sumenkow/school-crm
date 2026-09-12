'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
  MapPin,
  Clock,
  Sparkles,
  GraduationCap,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month');

  // Funnel steps
  const funnelSteps = [
    { label: 'Новые обращения (Лиды)', count: 28, rate: '100%', drop: null },
    { label: 'Успешный контакт / Квалификация', count: 24, rate: '85.7%', drop: '-14.3%' },
    { label: 'Назначен пробный урок', count: 18, rate: '64.2%', drop: '-21.5%' },
    { label: 'Пробный урок состоялся', count: 14, rate: '50.0%', drop: '-14.2%' },
    { label: 'Оплата абонемента (Конверсия)', count: 10, rate: '35.7%', drop: '-14.3%', isGoal: true },
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

  // Rooms workload
  const rooms = [
    { name: 'Аудитория 204', type: 'Языковая', occupancy: '88%', hoursPerWeek: 36, status: 'high' },
    { name: 'Аудитория 102', type: 'Младшие классы', occupancy: '74%', hoursPerWeek: 28, status: 'optimal' },
    { name: 'IT Лаборатория', type: 'Компьютерный класс', occupancy: '68%', hoursPerWeek: 24, status: 'optimal' },
    { name: 'Аудитория 101', type: 'Математика', occupancy: '58%', hoursPerWeek: 20, status: 'medium' },
  ];

  const handleExport = () => {
    alert('Экспорт аналитического отчета в формате Excel (.xlsx) успешно сформирован!');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Сквозная аналитика школы</h1>
          <p className="text-sm text-slate-500">
            Воронка продаж, когортное удержание (retention), доходы по направлениям и загрузка площадей
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

      {/* Section 1: ВОРОНКА ПРОДАЖ (FUNNEL WATERFALL) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-600" />
              Воронка конверсии из заявки в оплаченного ученика
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Анализ этапов продаж и выявление точек потери потенциальных клиентов
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {funnelSteps.map((step, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className={cn('font-bold', step.isGoal ? 'text-emerald-700' : 'text-slate-800')}>
                  {idx + 1}. {step.label}
                </span>
                <div className="flex items-center gap-3">
                  {step.drop && (
                    <span className="text-[11px] text-rose-500 font-semibold">{step.drop}</span>
                  )}
                  <span className="font-extrabold text-slate-900 text-sm">{step.count} чел.</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                    {step.rate}
                  </span>
                </div>
              </div>

              {/* Progress bar visual */}
              <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    step.isGoal ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                  )}
                  style={{ width: step.rate }}
                />
              </div>
            </div>
          ))}
        </div>
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
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Суммарно:</span>
            <span className="text-sm font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-xl">
              {currentTeacherData.total}
            </span>
          </div>
        </div>

        {/* PIE / DONUT CHART BLOCK («Пирог» распределения выручки) */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
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
              <div className="relative w-52 h-52 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                  {/* Background Track */}
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

        {/* 3 Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {/* Detailed Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
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
            <tbody className="divide-y divide-slate-100 text-slate-700">
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
      </div>

      {/* Section 4: КУРСЫ И АУДИТОРИИ (2 columns) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Доходы по направлениям */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-600" />
            Выручка по учебным направлениям
          </h3>

          <div className="space-y-4 pt-1">
            {courses.map((course, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">{course.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">{course.students} учеников</span>
                    <span className="font-bold text-slate-900">{course.revenue}</span>
                  </div>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className={cn('h-full rounded-full', course.color)} style={{ width: `${course.share}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Загрузка аудиторий */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            Загрузка учебных аудиторий
          </h3>

          <div className="space-y-3 pt-1">
            {rooms.map((room, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs">
                <div>
                  <h4 className="font-bold text-slate-900">{room.name}</h4>
                  <p className="text-[11px] text-slate-500">{room.type} • {room.hoursPerWeek} ч / неделю</p>
                </div>
                <div className="text-right">
                  <span className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-extrabold',
                    room.status === 'high' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                  )}>
                    {room.occupancy}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
