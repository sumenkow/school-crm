'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  CreditCard,
  UserCheck,
  GraduationCap,
  Shield,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Calendar,
  CheckSquare,
  BookOpen,
  UserPlus,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  PhoneCall,
  Video
} from 'lucide-react';
import { useRole } from '@/context/RoleContext';

// Helper: MD3 icon container
function IconContainer({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <div
      className="flex items-center justify-center flex-shrink-0"
      style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: bg, color }}
    >
      {children}
    </div>
  );
}

// MD3 KPI Card Component
function KpiCard({
  title, href, linkLabel, icon, bg, iconColor, value, subtext, rows,
}: {
  title: string; href: string; linkLabel: string;
  icon: React.ReactNode; bg: string; iconColor: string;
  value: string; subtext: string;
  rows: Array<{ label: string; value: string; color?: string }>;
}) {
  return (
    <div className="md-card-elevated flex flex-col" style={{ padding: '20px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '14px' }}>
        <div className="flex items-center gap-3">
          <IconContainer bg={bg} color={iconColor}>{icon}</IconContainer>
          <span className="md-title-small" style={{ color: 'var(--md-on-surface)' }}>{title}</span>
        </div>
        <Link href={href} className="md-label-medium" style={{ color: 'var(--md-primary)', textDecoration: 'none' }}>
          {linkLabel} →
        </Link>
      </div>

      <p className="md-display-small" style={{ fontSize: '32px', fontWeight: 700, color: 'var(--md-on-surface)', lineHeight: 1 }}>
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

// ─────────────────────────────────────────────────────────────────────────────
// 1. OWNER DASHBOARD (Финансовая аналитика, масштабирование, управление командой)
// ─────────────────────────────────────────────────────────────────────────────
function OwnerDashboard() {
  const currentMonth = new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="md-headline-medium" style={{ color: 'var(--md-on-surface)' }}>
              Сводка владельца
            </h1>
            <span
              className="md-label-small"
              style={{
                padding: '3px 10px',
                borderRadius: '9999px',
                backgroundColor: 'var(--md-tertiary-container, #EEDCFF)',
                color: 'var(--md-on-tertiary-container, #28123C)',
                fontWeight: 600,
              }}
            >
              Владелец школы
            </span>
          </div>
          <p className="md-body-medium" style={{ color: 'var(--md-on-surface-variant)', marginTop: '4px' }}>
            Финансовые результаты, воронка продаж и команда • {currentMonth}
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/settings/team?role=teacher" className="md-btn md-btn-filled md-btn-sm" style={{ gap: '6px' }}>
            <GraduationCap size={16} />
            + Преподаватель
          </Link>
          <Link href="/settings/team?role=admin" className="md-btn md-btn-tonal md-btn-sm" style={{ gap: '6px' }}>
            <Shield size={16} />
            + Администратор
          </Link>
          <Link href="/crm" className="md-btn md-btn-outlined md-btn-sm" style={{ gap: '6px' }}>
            <UserCheck size={16} />
            + Новый лид
          </Link>
          <Link href="/finance" className="md-btn md-btn-outlined md-btn-sm" style={{ gap: '6px' }}>
            <CreditCard size={16} />
            Финансы
          </Link>
          <Link href="/analytics" className="md-btn md-btn-outlined md-btn-sm" style={{ gap: '6px' }}>
            <BarChart3 size={16} />
            Аналитика
          </Link>
        </div>
      </div>

      {/* Attention / Urgent Risks Banner */}
      <div
        style={{
          borderRadius: '16px',
          backgroundColor: 'var(--md-warning-container)',
          padding: '20px',
          border: '1px solid rgba(230,81,0,0.25)',
        }}
      >
        <div className="flex items-center gap-3" style={{ marginBottom: '14px' }}>
          <div
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              backgroundColor: 'var(--md-warning)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <AlertTriangle size={18} />
          </div>
          <h2 className="md-title-medium" style={{ color: 'var(--md-on-warning-container)' }}>
            Требуют внимания руководства
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/finance?filter=overdue" className="md-card-elevated" style={{ padding: '12px 16px', textDecoration: 'none' }}>
            <p className="md-label-small" style={{ color: 'var(--md-on-surface-variant)' }}>Просрочено оплат</p>
            <p className="md-title-medium" style={{ color: 'var(--md-error)', marginTop: '2px' }}>3 ученика • 42 000 ₽</p>
            <span className="md-body-small" style={{ color: 'var(--md-primary)' }}>Напомнить →</span>
          </Link>
          <Link href="/crm?filter=thinking" className="md-card-elevated" style={{ padding: '12px 16px', textDecoration: 'none' }}>
            <p className="md-label-small" style={{ color: 'var(--md-on-surface-variant)' }}>Зависли после пробного</p>
            <p className="md-title-medium" style={{ color: 'var(--md-on-surface)', marginTop: '2px' }}>4 лида</p>
            <span className="md-body-small" style={{ color: 'var(--md-primary)' }}>Открыть воронку →</span>
          </Link>
          <Link href="/students?filter=absences" className="md-card-elevated" style={{ padding: '12px 16px', textDecoration: 'none' }}>
            <p className="md-label-small" style={{ color: 'var(--md-on-surface-variant)' }}>Риск оттока (3+ пропуска)</p>
            <p className="md-title-medium" style={{ color: 'var(--md-warning)', marginTop: '2px' }}>2 ученика</p>
            <span className="md-body-small" style={{ color: 'var(--md-primary)' }}>Связаться с родителями →</span>
          </Link>
          <Link href="/settings/team" className="md-card-elevated" style={{ padding: '12px 16px', textDecoration: 'none' }}>
            <p className="md-label-small" style={{ color: 'var(--md-on-surface-variant)' }}>Управление доступом</p>
            <p className="md-title-medium" style={{ color: 'var(--md-on-surface)', marginTop: '2px' }}>Команда школы</p>
            <span className="md-body-small" style={{ color: 'var(--md-primary)' }}>Учетные записи →</span>
          </Link>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Выручка"
          href="/finance"
          linkLabel="Платежи"
          icon={<CreditCard size={22} />}
          bg="var(--md-secondary-container)"
          iconColor="var(--md-primary)"
          value="480 000 ₽"
          subtext="+14% к прошлому месяцу"
          rows={[
            { label: 'План на месяц', value: '600 000 ₽' },
            { label: 'Выполнение плана', value: '80%', color: 'var(--md-success)' },
            { label: 'Средний чек', value: '9 600 ₽' },
          ]}
        />
        <KpiCard
          title="Ученики"
          href="/students"
          linkLabel="Все ученики"
          icon={<Users size={22} />}
          bg="var(--md-primary-container)"
          iconColor="var(--md-primary)"
          value="48"
          subtext="активных учеников"
          rows={[
            { label: 'Новые в этом месяце', value: '+7 учеников', color: 'var(--md-success)' },
            { label: 'На паузе / болеют', value: '4 ученика' },
            { label: 'Отток за месяц', value: '1 ученик' },
          ]}
        />
        <KpiCard
          title="Воронка продаж"
          href="/crm"
          linkLabel="CRM"
          icon={<UserCheck size={22} />}
          bg="var(--md-tertiary-container, #EEDCFF)"
          iconColor="var(--md-on-tertiary-container, #28123C)"
          value="18"
          subtext="лидов в работе"
          rows={[
            { label: 'Пробный назначен', value: '5 лидов' },
            { label: 'Принимают решение', value: '4 лида' },
            { label: 'Конверсия в оплату', value: '38%', color: 'var(--md-success)' },
          ]}
        />
        <KpiCard
          title="Группы и курсы"
          href="/groups"
          linkLabel="Группы"
          icon={<BookOpen size={22} />}
          bg="var(--md-surface-container-high)"
          iconColor="var(--md-on-surface-variant)"
          value="8"
          subtext="активных групп"
          rows={[
            { label: 'Наполняемость мест', value: '84%', color: 'var(--md-success)' },
            { label: 'Идет набор', value: '2 группы' },
            { label: 'Преподавателей', value: '5 сотрудников' },
          ]}
        />
      </div>

      {/* Operational Overview: Recent Payments + Active Teachers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Payments */}
        <div className="md-card-elevated" style={{ padding: '20px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
            <h3 className="md-title-medium" style={{ color: 'var(--md-on-surface)' }}>
              Последние поступления
            </h3>
            <Link href="/finance" className="md-label-medium" style={{ color: 'var(--md-primary)' }}>
              Все оплаты →
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { student: 'Артем Смирнов', course: 'Английский (Kids)', amount: '9 600 ₽', date: 'Сегодня', status: 'Оплачен' },
              { student: 'София Лебедева', course: 'Робототехника', amount: '12 000 ₽', date: 'Вчера', status: 'Оплачен' },
              { student: 'Максим Кузнецов', course: 'Математика ОГЭ', amount: '8 800 ₽', date: '10 сен', status: 'Оплачен' },
              { student: 'Дарья Попова', course: 'Программирование', amount: '10 500 ₽', date: '9 сен', status: 'Оплачен' },
            ].map((p, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between"
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--md-surface-container-low)',
                  borderRadius: '12px',
                }}
              >
                <div>
                  <p className="md-label-large" style={{ color: 'var(--md-on-surface)' }}>{p.student}</p>
                  <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>{p.course} • {p.date}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="md-label-large" style={{ color: 'var(--md-success)', fontWeight: 700 }}>+{p.amount}</p>
                  <span className="md-label-small" style={{ color: 'var(--md-on-surface-variant)' }}>{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team & Teachers overview */}
        <div className="md-card-elevated" style={{ padding: '20px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
            <h3 className="md-title-medium" style={{ color: 'var(--md-on-surface)' }}>
              Команда и преподаватели
            </h3>
            <Link href="/settings/team" className="md-label-medium" style={{ color: 'var(--md-primary)' }}>
              Управление доступом →
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { name: 'Мария Иванова', role: 'Преподаватель Английского', groups: '3 группы • 18 учеников', load: '92%' },
              { name: 'Дмитрий Соколов', role: 'Преподаватель Робототехники', groups: '2 группы • 14 учеников', load: '85%' },
              { name: 'Елена Васильева', role: 'Преподаватель Математики', groups: '2 группы • 11 учеников', load: '78%' },
              { name: 'Анна Менеджер', role: 'Администратор школы', groups: 'Куратор оплат и лидов', load: 'Активна' },
            ].map((t, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between"
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--md-surface-container-low)',
                  borderRadius: '12px',
                }}
              >
                <div>
                  <p className="md-label-large" style={{ color: 'var(--md-on-surface)' }}>{t.name}</p>
                  <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>{t.role} • {t.groups}</p>
                </div>
                <div>
                  <span
                    className="md-label-small"
                    style={{
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      backgroundColor: 'var(--md-secondary-container)',
                      color: 'var(--md-on-secondary-container)',
                    }}
                  >
                    {t.load}
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

// ─────────────────────────────────────────────────────────────────────────────
// 2. ADMIN DASHBOARD (Оперативное управление: ученики, лиды, звонки, оплаты)
// ─────────────────────────────────────────────────────────────────────────────
function AdminDashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="md-headline-medium" style={{ color: 'var(--md-on-surface)' }}>
              Операционный дашборд
            </h1>
            <span
              className="md-label-small"
              style={{
                padding: '3px 10px',
                borderRadius: '9999px',
                backgroundColor: 'var(--md-secondary-container)',
                color: 'var(--md-on-secondary-container)',
                fontWeight: 600,
              }}
            >
              Администратор
            </span>
          </div>
          <p className="md-body-medium" style={{ color: 'var(--md-on-surface-variant)', marginTop: '4px' }}>
            Задачи на смену, входящие заявки, контроль оплат и расписание
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/crm" className="md-btn md-btn-filled md-btn-sm" style={{ gap: '6px' }}>
            <UserCheck size={16} />
            + Новый лид
          </Link>
          <Link href="/finance" className="md-btn md-btn-tonal md-btn-sm" style={{ gap: '6px' }}>
            <CreditCard size={16} />
            Принять оплату
          </Link>
          <Link href="/calendar" className="md-btn md-btn-outlined md-btn-sm" style={{ gap: '6px' }}>
            <Calendar size={16} />
            Расписание
          </Link>
          <Link href="/tasks" className="md-btn md-btn-outlined md-btn-sm" style={{ gap: '6px' }}>
            <CheckSquare size={16} />
            Задачи
          </Link>
        </div>
      </div>

      {/* Admin KPI metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="md-card-elevated" style={{ padding: '18px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
            <span className="md-label-large" style={{ color: 'var(--md-on-surface-variant)' }}>Заявки сегодня</span>
            <IconContainer bg="var(--md-primary-container)" color="var(--md-primary)">
              <UserCheck size={20} />
            </IconContainer>
          </div>
          <p className="md-display-small" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--md-on-surface)' }}>
            4 новых
          </p>
          <p className="md-body-small" style={{ color: 'var(--md-primary)', marginTop: '4px' }}>
            2 требуют первого звонка
          </p>
        </div>

        <div className="md-card-elevated" style={{ padding: '18px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
            <span className="md-label-large" style={{ color: 'var(--md-on-surface-variant)' }}>Пробные сегодня</span>
            <IconContainer bg="var(--md-secondary-container)" color="var(--md-on-secondary-container)">
              <Calendar size={20} />
            </IconContainer>
          </div>
          <p className="md-display-small" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--md-on-surface)' }}>
            3 урока
          </p>
          <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)', marginTop: '4px' }}>
            16:00, 17:30, 19:00
          </p>
        </div>

        <div className="md-card-elevated" style={{ padding: '18px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
            <span className="md-label-large" style={{ color: 'var(--md-on-surface-variant)' }}>Оплаты сегодня</span>
            <IconContainer bg="var(--md-success-container)" color="var(--md-on-success-container)">
              <CreditCard size={20} />
            </IconContainer>
          </div>
          <p className="md-display-small" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--md-success)' }}>
            28 800 ₽
          </p>
          <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)', marginTop: '4px' }}>
            3 платежа принято
          </p>
        </div>

        <div className="md-card-elevated" style={{ padding: '18px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
            <span className="md-label-large" style={{ color: 'var(--md-on-surface-variant)' }}>Срочные задачи</span>
            <IconContainer bg="var(--md-warning-container)" color="var(--md-warning)">
              <CheckSquare size={20} />
            </IconContainer>
          </div>
          <p className="md-display-small" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--md-warning)' }}>
            5 задач
          </p>
          <p className="md-body-small" style={{ color: 'var(--md-error)', marginTop: '4px' }}>
            2 с горящим дедлайном
          </p>
        </div>
      </div>

      {/* Admin Action lists: Leads to call + Today's Lessons */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Leads requiring contact */}
        <div className="md-card-elevated" style={{ padding: '20px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
            <div className="flex items-center gap-2">
              <PhoneCall size={18} style={{ color: 'var(--md-primary)' }} />
              <h3 className="md-title-medium" style={{ color: 'var(--md-on-surface)' }}>
                Связаться сегодня ({3})
              </h3>
            </div>
            <Link href="/crm" className="md-label-medium" style={{ color: 'var(--md-primary)' }}>
              Открыть воронку →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { name: 'Михаил (папа Егора)', action: 'Узнать решение после пробного урока', phone: '+7 999 123-45-67', time: 'до 14:00' },
              { name: 'Ольга (мама Алисы)', action: 'Новая заявка с сайта на Робототехнику', phone: '+7 916 555-44-33', time: 'срочно' },
              { name: 'Сергей (папа Матвея)', action: 'Напомнить о выставленном счете на продление', phone: '+7 903 888-22-11', time: 'до 18:00' },
            ].map((lead, idx) => (
              <div
                key={idx}
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--md-surface-container-low)',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p className="md-label-large" style={{ color: 'var(--md-on-surface)' }}>{lead.name}</p>
                  <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)', marginTop: '2px' }}>
                    {lead.action}
                  </p>
                  <span className="md-label-small" style={{ color: 'var(--md-primary)', marginTop: '4px', display: 'block' }}>
                    {lead.phone}
                  </span>
                </div>
                <span
                  className="md-label-small"
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: lead.time === 'срочно' ? 'var(--md-error-container)' : 'var(--md-surface-container-high)',
                    color: lead.time === 'срочно' ? 'var(--md-on-error-container)' : 'var(--md-on-surface)',
                  }}
                >
                  {lead.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="md-card-elevated" style={{ padding: '20px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
            <div className="flex items-center gap-2">
              <Calendar size={18} style={{ color: 'var(--md-primary)' }} />
              <h3 className="md-title-medium" style={{ color: 'var(--md-on-surface)' }}>
                Расписание на сегодня
              </h3>
            </div>
            <Link href="/calendar" className="md-label-medium" style={{ color: 'var(--md-primary)' }}>
              Календарь →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { time: '15:00 - 16:30', group: 'Английский Kids-1', teacher: 'Мария И.', room: 'Кабинет 3', students: '6/8 уч.' },
              { time: '16:45 - 18:15', group: 'Робототехника Начало', teacher: 'Дмитрий С.', room: 'Лаборатория', students: '7/8 уч.' },
              { time: '18:30 - 20:00', group: 'Математика ОГЭ', teacher: 'Елена В.', room: 'Кабинет 1', students: '5/6 уч.' },
            ].map((lesson, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--md-surface-container-low)',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p className="md-label-large" style={{ color: 'var(--md-on-surface)' }}>{lesson.group}</p>
                  <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
                    {lesson.teacher} • {lesson.room}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="md-label-medium" style={{ color: 'var(--md-primary)', display: 'block' }}>{lesson.time}</span>
                  <span className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>{lesson.students}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. TEACHER DASHBOARD (Свои занятия, журнал, группы, посещаемость)
// ─────────────────────────────────────────────────────────────────────────────
function TeacherDashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="md-headline-medium" style={{ color: 'var(--md-on-surface)' }}>
              Кабинет преподавателя
            </h1>
            <span
              className="md-label-small"
              style={{
                padding: '3px 10px',
                borderRadius: '9999px',
                backgroundColor: 'var(--md-primary-container)',
                color: 'var(--md-on-primary-container)',
                fontWeight: 600,
              }}
            >
              Преподаватель
            </span>
          </div>
          <p className="md-body-medium" style={{ color: 'var(--md-on-surface-variant)', marginTop: '4px' }}>
            Ваши занятия на сегодня, группы и журнал посещаемости
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/teacher/attendance" className="md-btn md-btn-filled md-btn-sm" style={{ gap: '6px' }}>
            <CheckCircle size={16} />
            Журнал посещаемости
          </Link>
          <Link href="/groups" className="md-btn md-btn-outlined md-btn-sm" style={{ gap: '6px' }}>
            <BookOpen size={16} />
            Мои группы
          </Link>
        </div>
      </div>

      {/* Teacher Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="md-card-elevated" style={{ padding: '18px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
            <span className="md-label-large" style={{ color: 'var(--md-on-surface-variant)' }}>Уроков сегодня</span>
            <IconContainer bg="var(--md-primary-container)" color="var(--md-primary)">
              <Clock size={20} />
            </IconContainer>
          </div>
          <p className="md-display-small" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--md-on-surface)' }}>
            2 занятия
          </p>
          <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)', marginTop: '4px' }}>
            Ближайший в 15:30
          </p>
        </div>

        <div className="md-card-elevated" style={{ padding: '18px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
            <span className="md-label-large" style={{ color: 'var(--md-on-surface-variant)' }}>Мои группы</span>
            <IconContainer bg="var(--md-secondary-container)" color="var(--md-on-secondary-container)">
              <BookOpen size={20} />
            </IconContainer>
          </div>
          <p className="md-display-small" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--md-on-surface)' }}>
            3 группы
          </p>
          <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)', marginTop: '4px' }}>
            Всего 19 учеников
          </p>
        </div>

        <div className="md-card-elevated" style={{ padding: '18px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
            <span className="md-label-large" style={{ color: 'var(--md-on-surface-variant)' }}>Посещаемость</span>
            <IconContainer bg="var(--md-success-container)" color="var(--md-on-success-container)">
              <CheckCircle size={20} />
            </IconContainer>
          </div>
          <p className="md-display-small" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--md-success)' }}>
            94%
          </p>
          <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)', marginTop: '4px' }}>
            Средняя за месяц
          </p>
        </div>
      </div>

      {/* Teacher's Lessons Today with Attendance Mark Button */}
      <div className="md-card-elevated" style={{ padding: '20px' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
          <div className="flex items-center gap-2">
            <Calendar size={20} style={{ color: 'var(--md-primary)' }} />
            <h3 className="md-title-medium" style={{ color: 'var(--md-on-surface)' }}>
              Мои уроки на сегодня
            </h3>
          </div>
          <Link href="/teacher" className="md-label-medium" style={{ color: 'var(--md-primary)' }}>
            Все занятия →
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            {
              time: '15:30 - 17:00',
              group: 'Английский Kids (Группа A)',
              room: 'Кабинет 3',
              topic: 'Unit 4: Animals & Their Habitats',
              studentsCount: 7,
              onlineUrl: 'https://zoom.us/j/123456789',
              attendanceMarked: false,
            },
            {
              time: '17:30 - 19:00',
              group: 'Английский Teens (Группа B)',
              room: 'Кабинет 3',
              topic: 'Past Perfect Continuous & Storytelling',
              studentsCount: 6,
              onlineUrl: null,
              attendanceMarked: true,
            },
          ].map((lesson, idx) => (
            <div
              key={idx}
              style={{
                padding: '16px',
                backgroundColor: 'var(--md-surface-container-low)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="md-label-medium"
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--md-primary-container)',
                        color: 'var(--md-on-primary-container)',
                        fontWeight: 700,
                      }}
                    >
                      {lesson.time}
                    </span>
                    <h4 className="md-title-small" style={{ color: 'var(--md-on-surface)' }}>
                      {lesson.group}
                    </h4>
                  </div>
                  <p className="md-body-medium" style={{ color: 'var(--md-on-surface-variant)', marginTop: '4px' }}>
                    Тема: {lesson.topic}
                  </p>
                  <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
                    Место: {lesson.room} • Учеников: {lesson.studentsCount}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {lesson.onlineUrl && (
                    <a
                      href={lesson.onlineUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="md-btn md-btn-outlined md-btn-sm"
                      style={{ gap: '6px' }}
                    >
                      <Video size={14} />
                      Ссылка на урок
                    </a>
                  )}
                  <Link
                    href="/teacher/attendance"
                    className={`md-btn md-btn-sm ${lesson.attendanceMarked ? 'md-btn-tonal' : 'md-btn-filled'}`}
                    style={{ gap: '6px' }}
                  >
                    <CheckCircle size={14} />
                    {lesson.attendanceMarked ? 'Посещаемость отмечена' : 'Отметить посещаемость'}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Teacher Groups */}
      <div className="md-card-elevated" style={{ padding: '20px' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
          <div className="flex items-center gap-2">
            <BookOpen size={20} style={{ color: 'var(--md-primary)' }} />
            <h3 className="md-title-medium" style={{ color: 'var(--md-on-surface)' }}>
              Мои учебные группы
            </h3>
          </div>
          <Link href="/groups" className="md-label-medium" style={{ color: 'var(--md-primary)' }}>
            Все группы →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { name: 'Kids-A', course: 'Английский для детей', count: 7, days: 'Пн, Ср 15:30' },
            { name: 'Teens-B', course: 'Английский для подростков', count: 6, days: 'Вт, Чт 17:30' },
            { name: 'Kids-C', course: 'Английский начальный', count: 6, days: 'Сб 11:00' },
          ].map((g, idx) => (
            <div
              key={idx}
              className="md-card-outlined"
              style={{ padding: '14px', borderRadius: '12px' }}
            >
              <p className="md-label-large" style={{ color: 'var(--md-on-surface)' }}>{g.name}</p>
              <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>{g.course}</p>
              <div className="flex justify-between items-center" style={{ marginTop: '10px' }}>
                <span className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>{g.days}</span>
                <span className="md-label-small" style={{ color: 'var(--md-primary)', fontWeight: 600 }}>{g.count} уч.</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD DISPATCHER
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { role } = useRole();

  if (role === 'teacher') {
    return <TeacherDashboard />;
  }

  if (role === 'admin') {
    return <AdminDashboard />;
  }

  return <OwnerDashboard />;
}
