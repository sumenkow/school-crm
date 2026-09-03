'use client';

import React from 'react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import {
  Users,
  CreditCard,
  UserCheck,
  GraduationCap,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { role } = useRole();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Сводка школы</h1>
          <p className="text-sm text-slate-500">
            Обзор ключевых показателей в реальном времени • {new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/calendar"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Calendar className="h-4 w-4 text-slate-500" />
            Расписание на сегодня
          </Link>
          <Link
            href="/crm"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <UserCheck className="h-4 w-4" />
            + Новый лид
          </Link>
        </div>
      </div>

      {/* SECTION: ТРЕБУЮТ ВНИМАНИЯ (URGENT ALERTS) */}
      <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50/70 via-orange-50/50 to-amber-50/70 p-5 shadow-xs">
        <div className="flex items-center gap-2.5 pb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-900">
            Требуют внимания (5 ситуаций)
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 pt-2">
          <Link
            href="/finance?filter=overdue"
            className="group rounded-xl border border-amber-200 bg-white/90 p-3.5 shadow-xs transition-all hover:border-amber-400 hover:shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Просрочено оплат</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-600" />
            </div>
            <p className="mt-1 text-xl font-bold text-amber-700">3 ученика</p>
            <p className="mt-0.5 text-[11px] text-slate-500">на сумму 42 000 ₽</p>
          </Link>

          <Link
            href="/crm?filter=follow_up"
            className="group rounded-xl border border-amber-200 bg-white/90 p-3.5 shadow-xs transition-all hover:border-amber-400 hover:shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Написать сегодня</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-600" />
            </div>
            <p className="mt-1 text-xl font-bold text-slate-900">4 лида</p>
            <p className="mt-0.5 text-[11px] text-slate-500">после пробного урока</p>
          </Link>

          <Link
            href="/students?filter=consecutive_absences"
            className="group rounded-xl border border-amber-200 bg-white/90 p-3.5 shadow-xs transition-all hover:border-amber-400 hover:shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>3+ пропуска подряд</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-600" />
            </div>
            <p className="mt-1 text-xl font-bold text-rose-600">2 ученика</p>
            <p className="mt-0.5 text-[11px] text-slate-500">риск оттока (churn)</p>
          </Link>

          <Link
            href="/finance?filter=expiring_subscriptions"
            className="group rounded-xl border border-amber-200 bg-white/90 p-3.5 shadow-xs transition-all hover:border-amber-400 hover:shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Абонемент истекает</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-600" />
            </div>
            <p className="mt-1 text-xl font-bold text-blue-600">6 учеников</p>
            <p className="mt-0.5 text-[11px] text-slate-500">в течение 7 дней</p>
          </Link>

          <Link
            href="/tasks?filter=open"
            className="group rounded-xl border border-amber-200 bg-white/90 p-3.5 shadow-xs transition-all hover:border-amber-400 hover:shadow-md"
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Открытые задачи</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-600" />
            </div>
            <p className="mt-1 text-xl font-bold text-slate-900">5 задач</p>
            <p className="mt-0.5 text-[11px] text-slate-500">2 с высоким приоритетом</p>
          </Link>
        </div>
      </div>

      {/* KPI METRICS GRIDS */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* УЧЕНИКИ */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Ученики</h3>
            </div>
            <Link href="/students" className="text-xs font-medium text-blue-600 hover:underline">
              Все →
            </Link>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-slate-900">124</p>
            <p className="text-xs text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> +12 новых в этом месяце
            </p>
          </div>
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Активных:</span>
              <span className="font-semibold text-slate-900">114</span>
            </div>
            <div className="flex justify-between">
              <span>На паузе (заморозка):</span>
              <span className="font-semibold text-amber-600">6</span>
            </div>
            <div className="flex justify-between">
              <span>Ушедшие (отток):</span>
              <span className="font-semibold text-rose-600">4</span>
            </div>
          </div>
        </div>

        {/* ФИНАНСЫ */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                <CreditCard className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Финансы</h3>
            </div>
            <Link href="/finance" className="text-xs font-medium text-emerald-600 hover:underline">
              Отчет →
            </Link>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-slate-900">840 000 ₽</p>
            <p className="text-xs text-slate-500 mt-0.5">получено в сентябре</p>
          </div>
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Ожидается к оплате:</span>
              <span className="font-semibold text-blue-600">180 000 ₽</span>
            </div>
            <div className="flex justify-between">
              <span>Просрочено:</span>
              <span className="font-semibold text-rose-600">42 000 ₽</span>
            </div>
            <div className="flex justify-between">
              <span>Средний чек:</span>
              <span className="font-semibold text-slate-900">7 200 ₽</span>
            </div>
          </div>
        </div>

        {/* CRM И ВОРОНКА */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                <UserCheck className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">CRM Воронка</h3>
            </div>
            <Link href="/crm" className="text-xs font-medium text-purple-600 hover:underline">
              Воронка →
            </Link>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-slate-900">28</p>
            <p className="text-xs text-slate-500 mt-0.5">новых обращений (лидов)</p>
          </div>
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Пробных назначено:</span>
              <span className="font-semibold text-slate-900">14</span>
            </div>
            <div className="flex justify-between">
              <span>Успешно проведены:</span>
              <span className="font-semibold text-emerald-600">9</span>
            </div>
            <div className="flex justify-between">
              <span>Конверсия в оплату:</span>
              <span className="font-semibold text-blue-600">32%</span>
            </div>
          </div>
        </div>

        {/* ГРУППЫ */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                <GraduationCap className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Группы</h3>
            </div>
            <Link href="/groups" className="text-xs font-medium text-indigo-600 hover:underline">
              Все →
            </Link>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-slate-900">18 групп</p>
            <p className="text-xs text-slate-500 mt-0.5">средняя заполненность 82%</p>
          </div>
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Всего мест:</span>
              <span className="font-semibold text-slate-900">144</span>
            </div>
            <div className="flex justify-between">
              <span>Свободных мест:</span>
              <span className="font-semibold text-emerald-600">26</span>
            </div>
            <div className="flex justify-between">
              <span>Низкая заполненность (&lt;50%):</span>
              <span className="font-semibold text-amber-600">2 группы</span>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK SCHEDULE & RECENT ACTIVITIES */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Ближайшие уроки сегодня */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Расписание на сегодня</h3>
            <Link href="/calendar" className="text-xs font-medium text-blue-600 hover:underline">
              Открыть календарь →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {[
              { time: '15:00 - 16:30', group: 'Kids English A1', teacher: 'Мария Иванова', students: '6 учеников', status: 'completed' },
              { time: '17:00 - 18:30', group: 'Robotics Junior', teacher: 'Денис Смирнов', students: '7 учеников', status: 'scheduled' },
              { time: '18:45 - 20:15', group: 'English B1 Teens', teacher: 'Мария Иванова', students: '8 учеников', status: 'scheduled' },
            ].map((lesson, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-semibold text-[11px]">
                    {lesson.time.split(' - ')[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{lesson.group}</p>
                    <p className="text-slate-500">{lesson.teacher} • {lesson.students}</p>
                  </div>
                </div>
                <span className={cn(
                  'rounded-full px-2.5 py-1 text-[10px] font-semibold',
                  lesson.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                )}>
                  {lesson.status === 'completed' ? 'Завершён' : 'Запланирован'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Задачи и дедлайны */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Горящие задачи</h3>
            <Link href="/tasks" className="text-xs font-medium text-blue-600 hover:underline">
              Все задачи →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {[
              { title: 'Позвонить маме Михаила (пропуск 3 занятий)', priority: 'high', due: 'Сегодня, 14:00', client: 'Елена К.' },
              { title: 'Отправить договор и счет для лида Анна Смирнова', priority: 'high', due: 'Сегодня, 16:30', client: 'Анна С.' },
              { title: 'Предложить продление абонемента на октябрь (группа B1)', priority: 'medium', due: 'Завтра', client: '4 ученика' },
            ].map((task, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs">
                <div className="space-y-0.5">
                  <p className="font-medium text-slate-800 text-sm">{task.title}</p>
                  <p className="text-slate-500">Срок: {task.due} • {task.client}</p>
                </div>
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  task.priority === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                )}>
                  {task.priority === 'high' ? 'Срочно' : 'Средний'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
