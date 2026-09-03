'use client';

import React, { useState } from 'react';
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
  Sparkles
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

  // Course performance
  const courses = [
    { name: 'Английский язык', students: 64, revenue: '486 400 ₽', share: 58, color: 'bg-blue-600' },
    { name: 'Робототехника', students: 32, revenue: '268 800 ₽', share: 26, color: 'bg-indigo-600' },
    { name: 'Олимпиадная математика', students: 28, revenue: '190 400 ₽', share: 16, color: 'bg-teal-600' },
  ];

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

      {/* Section 3: КУРСЫ И АУДИТОРИИ (2 columns) */}
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
