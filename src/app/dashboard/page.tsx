'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  CreditCard,
  UserCheck,
  GraduationCap,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Calendar,
  CheckSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper: MD3 icon container
function IconContainer({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <div
      className="flex items-center justify-center flex-shrink-0"
      style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: bg, color }}
    >
      {children}
    </div>
  );
}

// MD3 Elevated Card KPI
function KpiCard({
  title, href, linkLabel, icon, bg, iconColor, value, subtext, rows,
}: {
  title: string; href: string; linkLabel: string;
  icon: React.ReactNode; bg: string; iconColor: string;
  value: string; subtext: string;
  rows: Array<{ label: string; value: string; color?: string }>;
}) {
  return (
    <div
      className="md-card-elevated flex flex-col"
      style={{ padding: '20px' }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
        <div className="flex items-center gap-3">
          <IconContainer bg={bg} color={iconColor}>{icon}</IconContainer>
          <span className="md-title-small" style={{ color: 'var(--md-on-surface)' }}>{title}</span>
        </div>
        <Link
          href={href}
          className="md-label-medium"
          style={{ color: 'var(--md-primary)', textDecoration: 'none' }}
        >
          {linkLabel} →
        </Link>
      </div>

      <p className="md-display-small" style={{ fontSize: '36px', fontWeight: 700, color: 'var(--md-on-surface)', lineHeight: 1 }}>
        {value}
      </p>
      <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)', marginTop: '4px' }}>
        {subtext}
      </p>

      <div
        style={{
          borderTop: '1px solid var(--md-outline-variant)',
          marginTop: '16px',
          paddingTop: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between items-center">
            <span className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>{row.label}</span>
            <span className="md-label-medium" style={{ color: row.color || 'var(--md-on-surface)' }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Page header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="md-headline-medium" style={{ color: 'var(--md-on-surface)' }}>Сводка школы</h1>
          <p className="md-body-medium" style={{ color: 'var(--md-on-surface-variant)', marginTop: '4px' }}>
            Ключевые показатели • {today}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/calendar" className="md-btn md-btn-outlined md-btn-sm">
            <Calendar size={16} />
            Расписание
          </Link>
          <Link href="/crm" className="md-btn md-btn-filled md-btn-sm">
            <UserCheck size={16} />
            + Новый лид
          </Link>
        </div>
      </div>

      {/* URGENT ALERTS — MD3 Warning Card */}
      <div
        style={{
          borderRadius: '12px',
          backgroundColor: 'var(--md-warning-container)',
          padding: '20px',
          border: '1px solid rgba(230,81,0,0.2)',
        }}
      >
        <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
          <div
            className="flex items-center justify-center"
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              backgroundColor: 'var(--md-warning)', color: '#fff',
            }}
          >
            <AlertTriangle size={18} />
          </div>
          <h2 className="md-title-medium" style={{ color: 'var(--md-on-warning-container)' }}>
            Требуют внимания — 5 ситуаций
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { href: '/finance?filter=overdue', label: 'Просрочено оплат', value: '3 ученика', sub: 'на сумму 42 000 ₽' },
            { href: '/crm?filter=follow_up', label: 'Написать сегодня', value: '4 лида', sub: 'после пробного урока' },
            { href: '/students?filter=absences', label: '3+ пропуска подряд', value: '2 ученика', sub: 'риск оттока' },
            { href: '/finance?filter=expiring', label: 'Абонемент истекает', value: '6 учеников', sub: 'в течение 7 дней' },
            { href: '/tasks?filter=open', label: 'Открытые задачи', value: '5 задач', sub: '2 с высоким приоритетом' },
          ].map((alert) => (
            <Link
              key={alert.href}
              href={alert.href}
              className="group"
              style={{
                display: 'block',
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: 'var(--md-surface-container-lowest)',
                border: '1px solid rgba(230,81,0,0.15)',
                textDecoration: 'none',
                transition: 'box-shadow 0.15s, transform 0.15s',
              }}
            >
              <div className="flex justify-between items-center">
                <span className="md-label-medium" style={{ color: 'var(--md-on-surface-variant)' }}>{alert.label}</span>
                <ArrowUpRight size={14} style={{ color: 'var(--md-warning)', opacity: 0.7 }} />
              </div>
              <p className="md-title-medium" style={{ color: 'var(--md-on-surface)', marginTop: '6px' }}>{alert.value}</p>
              <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)', marginTop: '2px' }}>{alert.sub}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* KPI Cards — 4 col grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Ученики" href="/students" linkLabel="Все"
          icon={<Users size={22} />} bg="var(--md-primary-container)" iconColor="var(--md-on-primary-container)"
          value="124"
          subtext="+12 новых в этом месяце"
          rows={[
            { label: 'Активных', value: '114' },
            { label: 'На паузе', value: '6', color: 'var(--md-warning)' },
            { label: 'Ушедших', value: '4', color: 'var(--md-error)' },
          ]}
        />
        <KpiCard
          title="Финансы" href="/finance" linkLabel="Отчёт"
          icon={<CreditCard size={22} />} bg="var(--md-success-container)" iconColor="var(--md-on-success-container)"
          value="840 000 ₽"
          subtext="получено в сентябре"
          rows={[
            { label: 'Ожидается', value: '180 000 ₽', color: 'var(--md-primary)' },
            { label: 'Просрочено', value: '42 000 ₽', color: 'var(--md-error)' },
            { label: 'Средний чек', value: '7 200 ₽' },
          ]}
        />
        <KpiCard
          title="CRM Воронка" href="/crm" linkLabel="Воронка"
          icon={<UserCheck size={22} />} bg="var(--md-tertiary-container, #EEDCFF)" iconColor="var(--md-on-tertiary-container, #250F43)"
          value="28"
          subtext="новых лидов за месяц"
          rows={[
            { label: 'Пробных назначено', value: '14' },
            { label: 'Успешно проведено', value: '9', color: 'var(--md-success, #1B5E20)' },
            { label: 'Конверсия в оплату', value: '32%', color: 'var(--md-primary)' },
          ]}
        />
        <KpiCard
          title="Группы" href="/groups" linkLabel="Все"
          icon={<GraduationCap size={22} />} bg="var(--md-secondary-container)" iconColor="var(--md-on-secondary-container)"
          value="18 групп"
          subtext="средняя заполненность 82%"
          rows={[
            { label: 'Всего мест', value: '144' },
            { label: 'Свободных', value: '26', color: 'var(--md-success, #1B5E20)' },
            { label: 'Мало занято (<50%)', value: '2 группы', color: 'var(--md-warning)' },
          ]}
        />
      </div>

      {/* Today Schedule + Urgent Tasks */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Today's schedule */}
        <div className="md-card-elevated" style={{ padding: '20px' }}>
          <div
            className="flex items-center justify-between"
            style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--md-outline-variant)' }}
          >
            <div className="flex items-center gap-2">
              <Calendar size={20} style={{ color: 'var(--md-primary)' }} />
              <h3 className="md-title-medium" style={{ color: 'var(--md-on-surface)' }}>Расписание на сегодня</h3>
            </div>
            <Link href="/calendar" className="md-label-medium" style={{ color: 'var(--md-primary)', textDecoration: 'none' }}>
              Открыть →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { time: '15:00', group: 'Kids English A1', teacher: 'Мария Иванова', students: 6, status: 'completed' },
              { time: '17:00', group: 'Robotics Junior', teacher: 'Денис Смирнов', students: 7, status: 'scheduled' },
              { time: '18:45', group: 'English B1 Teens', teacher: 'Мария Иванова', students: 8, status: 'scheduled' },
            ].map((lesson, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3"
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--md-surface-container)',
                }}
              >
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    backgroundColor: lesson.status === 'completed' ? 'var(--md-success-container)' : 'var(--md-primary-container)',
                    color: lesson.status === 'completed' ? 'var(--md-on-success-container)' : 'var(--md-on-primary-container)',
                    fontSize: '11px',
                    fontWeight: 700,
                    flexDirection: 'column',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {lesson.time}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="md-title-small truncate" style={{ color: 'var(--md-on-surface)' }}>{lesson.group}</p>
                  <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
                    {lesson.teacher} • {lesson.students} уч.
                  </p>
                </div>
                <span
                  className={cn('md-label-small', lesson.status === 'completed' ? 'md-status-success' : 'md-status-info')}
                  style={{ padding: '4px 10px', borderRadius: '9999px', flexShrink: 0 }}
                >
                  {lesson.status === 'completed' ? 'Завершён' : 'Запланирован'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Urgent tasks */}
        <div className="md-card-elevated" style={{ padding: '20px' }}>
          <div
            className="flex items-center justify-between"
            style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--md-outline-variant)' }}
          >
            <div className="flex items-center gap-2">
              <CheckSquare size={20} style={{ color: 'var(--md-primary)' }} />
              <h3 className="md-title-medium" style={{ color: 'var(--md-on-surface)' }}>Горящие задачи</h3>
            </div>
            <Link href="/tasks" className="md-label-medium" style={{ color: 'var(--md-primary)', textDecoration: 'none' }}>
              Все →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { title: 'Позвонить маме Михаила (3 пропуска подряд)', priority: 'high', due: 'Сегодня, 14:00' },
              { title: 'Отправить договор и счёт для лида Анна Смирнова', priority: 'high', due: 'Сегодня, 16:30' },
              { title: 'Предложить продление абонемента на октябрь (группа B1)', priority: 'medium', due: 'Завтра' },
            ].map((task, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3"
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--md-surface-container)',
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: task.priority === 'high' ? 'var(--md-error)' : 'var(--md-warning)',
                    flexShrink: 0,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="md-body-medium" style={{ color: 'var(--md-on-surface)', fontWeight: 500 }}>{task.title}</p>
                  <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)', marginTop: '2px' }}>
                    Срок: {task.due}
                  </p>
                </div>
                <span
                  className={task.priority === 'high' ? 'md-status-error' : 'md-status-warning'}
                  style={{ padding: '4px 10px', borderRadius: '9999px', flexShrink: 0, fontSize: '11px', fontWeight: 600 }}
                >
                  {task.priority === 'high' ? 'Срочно' : 'Средний'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Growth indicator */}
      <div
        className="md-card-filled flex items-center gap-4"
        style={{ padding: '16px 20px' }}
      >
        <div
          style={{
            width: '40px', height: '40px', borderRadius: '50%',
            backgroundColor: 'var(--md-primary-container)',
            color: 'var(--md-on-primary-container)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <TrendingUp size={20} />
        </div>
        <div>
          <p className="md-title-small" style={{ color: 'var(--md-on-surface)' }}>Рост за месяц: +9.7%</p>
          <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
            Увеличение выручки и числа учеников по сравнению с прошлым месяцем
          </p>
        </div>
        <div className="ml-auto">
          <Link href="/analytics" className="md-btn md-btn-tonal md-btn-sm">
            Аналитика
          </Link>
        </div>
      </div>
    </div>
  );
}
