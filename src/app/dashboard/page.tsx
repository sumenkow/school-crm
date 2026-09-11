'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Video,
  FileText,
  X,
  ChevronRight,
  Phone,
  ExternalLink,
  Printer,
  Send,
  MessageSquare
} from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/context/ToastContext';
import { DailyReportModal } from '@/components/dashboard/DailyReportModal';

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
// SMART ACTION HUB (Оперативные задачи дня: долги, горячие лиды, пробные)
// ─────────────────────────────────────────────────────────────────────────────
function SmartActionHub() {
  const router = useRouter();
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  const tasks = [
    {
      id: 'task_debt_1',
      type: 'debt',
      badge: 'Долг по оплате',
      badgeColor: 'bg-rose-50 text-rose-700 border border-rose-200',
      title: 'Мария Кузнецова (Robotics)',
      deadline: '25.08.2026',
      subtitle: 'Отец: Дмитрий (+7 999 234-56-78)',
      highlight: 'Долг: 8 400 ₽',
      phone: '+79992345678',
      waUrl: 'https://wa.me/79992345678?text=Здравствуйте!%20Напоминаем%20об%20оплате%20абонемента%20в%20школе.',
      profileUrl: '/students/2',
      actionLabel: 'Открыть карточку ученика',
      description: 'Истек срок действия абонемента на курс Robotics Junior. Занятия посещаются регулярно, требуется согласовать оплату нового периода.',
    },
    {
      id: 'task_lead_1',
      type: 'lead',
      badge: 'Новый лид (> 2ч)',
      badgeColor: 'bg-amber-50 text-amber-700 border border-amber-200',
      title: 'Смирнова Ольга',
      deadline: 'Сегодня, до 15:00',
      subtitle: 'Ребенок: Анна (Kids English A1)',
      highlight: 'Ждет звонка для записи на пробное',
      phone: '+79991234567',
      profileUrl: '/crm/leads/lead1',
      actionLabel: 'Открыть карточку лида в CRM',
      description: 'Заявка с сайта школы на курс английского для начинающих. Нужен звонок-квалификация и подбор слота на пробное занятие.',
    },
    {
      id: 'task_trials_1',
      type: 'trial',
      badge: 'Пробные уроки',
      badgeColor: 'bg-purple-50 text-purple-700 border border-purple-200',
      title: '2 пробных занятия сегодня',
      deadline: 'Сегодня (15:00 и 18:45)',
      subtitle: '15:00 Робототехника • 18:45 Английский',
      highlight: 'Денис С., Мария И.',
      profileUrl: '/calendar',
      actionLabel: 'Открыть в расписании школы',
      description: 'Сегодня проводятся 2 пробных занятия с новыми учениками. Преподаватели предупреждены, материалы подготовлены.',
    },
  ];

  return (
    <>
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-amber-50/90 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white font-bold text-xs">
              ⚡
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Требует внимания сегодня (Оперативный хаб)
              </h3>
              <p className="text-[11px] text-slate-500">
                Срочные задачи менеджера для сохранения выручки и предотвращения оттока
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
            3 срочных действия
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => setSelectedTask(task)}
              className="group rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:shadow-md hover:border-amber-300 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className={cn('font-bold px-2 py-0.5 rounded-full', task.badgeColor)}>
                    {task.badge}
                  </span>
                  <span className="text-slate-400 text-[10px]">{task.deadline}</span>
                </div>
                <p className="font-bold text-slate-900 text-xs mt-2 group-hover:text-blue-600 transition-colors">
                  {task.title}
                </p>
                <p className="text-[11px] text-slate-500">{task.subtitle}</p>
                <p className={cn('text-xs font-bold mt-1', task.type === 'debt' ? 'text-rose-700' : task.type === 'lead' ? 'text-purple-700' : 'text-slate-700')}>
                  {task.highlight}
                </p>
              </div>

              <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                {task.waUrl && (
                  <a
                    href={task.waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 text-center py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 text-[10px] transition-colors"
                  >
                    WhatsApp
                  </a>
                )}
                {task.phone && (
                  <a
                    href={`tel:${task.phone}`}
                    className="flex-1 text-center py-1 rounded-lg bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 text-[10px] transition-colors"
                  >
                    Позвонить
                  </a>
                )}
                <button
                  onClick={() => setSelectedTask(task)}
                  className="flex-1 text-center py-1 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 text-[10px] transition-colors"
                >
                  Карточка →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className={cn('font-bold px-2 py-0.5 rounded-full text-xs', selectedTask.badgeColor)}>
                  {selectedTask.badge}
                </span>
              </div>
              <button onClick={() => setSelectedTask(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedTask.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedTask.subtitle}</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/80 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Срок / Дедлайн:</span>
                  <span className="font-semibold text-slate-800">{selectedTask.deadline}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Статус:</span>
                  <span className="font-bold text-amber-700">Требует действия</span>
                </div>
                <p className="text-slate-700 border-t border-slate-200 pt-2 text-xs leading-relaxed">
                  {selectedTask.description}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                {selectedTask.phone && (
                  <a
                    href={`tel:${selectedTask.phone}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Позвонить
                  </a>
                )}
                {selectedTask.waUrl && (
                  <a
                    href={selectedTask.waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    const url = selectedTask.profileUrl;
                    setSelectedTask(null);
                    router.push(url);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {selectedTask.actionLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. OWNER DASHBOARD (Финансовая аналитика, масштабирование, управление командой)
// ─────────────────────────────────────────────────────────────────────────────
function OwnerDashboard({ onOpenReport }: { onOpenReport: () => void }) {
  const router = useRouter();
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
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
          <button
            onClick={onOpenReport}
            className="md-btn md-btn-tonal md-btn-sm inline-flex items-center gap-1.5"
            style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', fontWeight: 600 }}
          >
            <FileText size={16} />
            Отчет за день
          </button>
        </div>
      </div>

      {/* SMART ACTION HUB */}
      <SmartActionHub />

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
              { id: 'p101', student: 'Артем Смирнов', studentId: '1', course: 'Английский (Kids)', amount: '9 600 ₽', date: 'Сегодня', status: 'Оплачен', method: 'Банковская карта', recordedBy: 'Администратор' },
              { id: 'p102', student: 'София Лебедева', studentId: '2', course: 'Робототехника', amount: '12 000 ₽', date: 'Вчера', status: 'Оплачен', method: 'СБП', recordedBy: 'Администратор' },
              { id: 'p103', student: 'Максим Кузнецов', studentId: '3', course: 'Математика ОГЭ', amount: '8 800 ₽', date: '10 сен', status: 'Оплачен', method: 'Карта', recordedBy: 'Администратор' },
              { id: 'p104', student: 'Дарья Попова', studentId: '4', course: 'Программирование', amount: '10 500 ₽', date: '9 сен', status: 'Оплачен', method: 'Счет (ООО)', recordedBy: 'Бухгалтерия' },
            ].map((p, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedPayment(p)}
                className="flex items-center justify-between group cursor-pointer hover:bg-slate-100/80 transition-all"
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--md-surface-container-low)',
                  borderRadius: '12px',
                }}
                title="Нажмите для просмотра квитанции платежа"
              >
                <div>
                  <p className="md-label-large group-hover:text-blue-600 transition-colors" style={{ color: 'var(--md-on-surface)' }}>{p.student}</p>
                  <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>{p.course} • {p.date}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="md-label-large" style={{ color: 'var(--md-success)', fontWeight: 700 }}>+{p.amount}</p>
                  <span className="md-label-small flex items-center justify-end gap-1" style={{ color: 'var(--md-on-surface-variant)' }}>
                    <span>{p.status}</span>
                    <ChevronRight className="h-3 w-3 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </span>
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
              { name: 'Мария Иванова', role: 'Преподаватель Английского', groups: '3 группы • 18 учеников', load: '92%', href: '/teachers/t1' },
              { name: 'Дмитрий Соколов', role: 'Преподаватель Робототехники', groups: '2 группы • 14 учеников', load: '85%', href: '/teachers/t2' },
              { name: 'Елена Васильева', role: 'Преподаватель Математики', groups: '2 группы • 11 учеников', load: '78%', href: '/teachers/t3' },
              { name: 'Анна Менеджер', role: 'Администратор школы', groups: 'Куратор оплат и лидов', load: 'Активна', href: '/settings/team' },
            ].map((t, idx) => (
              <div
                key={idx}
                onClick={() => router.push(t.href)}
                className="flex items-center justify-between group cursor-pointer hover:bg-slate-100/80 transition-all"
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--md-surface-container-low)',
                  borderRadius: '12px',
                }}
                title="Нажмите, чтобы открыть карточку сотрудника"
              >
                <div>
                  <p className="md-label-large group-hover:text-blue-600 transition-colors" style={{ color: 'var(--md-on-surface)' }}>{t.name}</p>
                  <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>{t.role} • {t.groups}</p>
                </div>
                <div className="flex items-center gap-2">
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
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <CreditCard className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Квитанция платежа</h3>
              </div>
              <button onClick={() => setSelectedPayment(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="rounded-xl bg-emerald-50/60 p-4 border border-emerald-200/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-emerald-800 font-semibold uppercase tracking-wider">Поступившая сумма</span>
                  <p className="text-2xl font-bold text-emerald-950 mt-0.5">{selectedPayment.amount}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                  {selectedPayment.status}
                </span>
              </div>

              <div className="space-y-2 rounded-xl bg-slate-50 p-3.5 border border-slate-200/80">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ученик:</span>
                  <strong className="text-slate-900">{selectedPayment.student}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Курс обучения:</span>
                  <span className="text-slate-800 font-medium">{selectedPayment.course}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Дата внесения:</span>
                  <span className="text-slate-800">{selectedPayment.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Способ оплаты:</span>
                  <span className="text-slate-800">{selectedPayment.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Принял оплату:</span>
                  <span className="text-slate-800">{selectedPayment.recordedBy}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    const sid = selectedPayment.studentId || '1';
                    setSelectedPayment(null);
                    router.push(`/students/${sid}`);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Карточка ученика
                </button>
                <button
                  onClick={() => {
                    alert('Печатная форма квитанции сформирована');
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-500" />
                  Печать
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ADMIN DASHBOARD (Оперативное управление: ученики, лиды, звонки, оплаты)
// ─────────────────────────────────────────────────────────────────────────────
function AdminDashboard({ onOpenReport }: { onOpenReport: () => void }) {
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
          <button
            onClick={onOpenReport}
            className="md-btn md-btn-tonal md-btn-sm inline-flex items-center gap-1.5"
            style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', fontWeight: 600 }}
          >
            <FileText size={16} />
            Отчет за день
          </button>
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

      {/* SMART ACTION HUB */}
      <SmartActionHub />

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
  const [reportModalOpen, setReportModalOpen] = useState(false);

  return (
    <>
      {role === 'teacher' ? (
        <TeacherDashboard />
      ) : role === 'admin' ? (
        <AdminDashboard onOpenReport={() => setReportModalOpen(true)} />
      ) : (
        <OwnerDashboard onOpenReport={() => setReportModalOpen(true)} />
      )}

      <DailyReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
    </>
  );
}
