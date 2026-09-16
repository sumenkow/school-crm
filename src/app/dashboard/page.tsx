'use client';

import React, { useState, useEffect } from 'react';
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
  MessageSquare,
  MessageCircle,
  Search,
  Flame,
  Check,
  Sparkles,
  Edit3,
  ArrowRight
} from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/context/ToastContext';
import { DailyReportModal } from '@/components/dashboard/DailyReportModal';
import { ExecutiveTaskReportModal } from '@/components/dashboard/ExecutiveTaskReportModal';
import { UpcomingPaymentsBlock } from '@/components/dashboard/UpcomingPaymentsBlock';
import { TaskDetailsCardModal, UrgentTaskItem } from '@/components/dashboard/TaskDetailsCardModal';
import { LessonQuickViewModal } from '@/components/calendar/LessonQuickViewModal';
import { INITIAL_LESSONS, FullLessonData, INITIAL_PAYMENTS, FullPaymentData, INITIAL_LEADS, FullLeadData } from '@/lib/data/mockData';
import { getStoredPayments } from '@/lib/data/paymentStorage';
import { calculateMultiCurrencyTotals, getEurRubRate } from '@/lib/data/currencyHelper';
import { updateUnifiedTaskStatus } from '@/lib/data/taskManager';
import { cn } from '@/lib/utils';

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

  const [payments, setPayments] = useState<FullPaymentData[]>(() => {
    return typeof window !== 'undefined' ? getStoredPayments() : INITIAL_PAYMENTS;
  });

  useEffect(() => {
    const sync = () => {
      setPayments(getStoredPayments());
    };
    sync();
    window.addEventListener('crm-payments-changed', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('crm-payments-changed', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  const overdueList = payments.filter((p) => p.status === 'overdue');
  const firstOverdue = overdueList[0];

  const debtTask = firstOverdue
    ? {
        id: 'task_debt_1',
        type: 'debt',
        badge: 'Долг по оплате',
        badgeColor: 'bg-rose-50 text-rose-700 border border-rose-200',
        title: `${firstOverdue.studentName} (${firstOverdue.courseName || firstOverdue.groupName || 'Курс'})`,
        deadline: firstOverdue.paymentDate || 'Срочно',
        subtitle: firstOverdue.parentName ? `Родитель: ${firstOverdue.parentName}` : 'Счет на оплату',
        highlight: `Долг: ${firstOverdue.amountFormatted || `${firstOverdue.amount.toLocaleString('ru-RU')} ₽`}`,
        phone: '+79992345678',
        waUrl: 'https://wa.me/79992345678?text=Здравствуйте!%20Напоминаем%20об%20оплате%20абонемента%20в%20школе.',
        profileUrl: `/students/${firstOverdue.studentId}`,
        actionLabel: 'Открыть карточку ученика',
        description: 'Истек срок действия абонемента. Занятия посещаются регулярно, требуется согласовать оплату нового периода.',
      }
    : {
        id: 'task_debt_1',
        type: 'debt',
        badge: 'Все оплачено',
        badgeColor: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        title: 'Задолженностей нет',
        deadline: 'Порядок',
        subtitle: 'Все текущие счета оплачены',
        highlight: '0 ₽ долгов',
        phone: '',
        waUrl: '',
        profileUrl: '/finance?filter=overdue',
        actionLabel: 'В раздел финансов',
        description: 'У всех учащихся на текущий момент отсутствуют просроченные платежи.',
      };

  interface UrgentActionTask {
    id: string;
    type: string;
    badge: string;
    badgeColor: string;
    title: string;
    deadline: string;
    subtitle: string;
    highlight: string;
    phone?: string;
    waUrl?: string;
    profileUrl: string;
    actionLabel: string;
    description: string;
  }

  const tasks: UrgentActionTask[] = [
    debtTask,
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

  const urgentActionsCount = (firstOverdue ? 1 : 0) + 2;

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-amber-50/90 p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white font-bold text-xs">
            <AlertCircle size={14} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Требуют внимания
            </h3>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
          {urgentActionsCount} {urgentActionsCount === 1 ? 'срочное действие' : 'срочных действия'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        {tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => router.push(task.profileUrl)}
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

            <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-100">
              {task.waUrl && (
                <a
                  href={task.waUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-center py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 text-[10px] transition-colors"
                >
                  WhatsApp
                </a>
              )}
              {task.phone && (
                <a
                  href={`tel:${task.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-center py-1 rounded-lg bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 text-[10px] transition-colors"
                >
                  Позвонить
                </a>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(task.profileUrl);
                }}
                className="flex-1 text-center py-1 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 text-[10px] transition-colors"
              >
                Карточка →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. OWNER DASHBOARD (Финансовая аналитика, масштабирование, управление командой)
// ─────────────────────────────────────────────────────────────────────────────
function OwnerDashboard({
  onOpenReport,
  onOpenExecutiveReport,
}: {
  onOpenReport: () => void;
  onOpenExecutiveReport?: () => void;
}) {
  const router = useRouter();
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const currentMonth = new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  const [allPayments, setAllPayments] = useState<FullPaymentData[]>(() => {
    return typeof window !== 'undefined' ? getStoredPayments() : INITIAL_PAYMENTS;
  });

  useEffect(() => {
    const sync = () => {
      setAllPayments(getStoredPayments());
    };
    sync();
    window.addEventListener('crm-payments-changed', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('crm-payments-changed', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  const rate = getEurRubRate();

  // Dynamic overdue stats matching stored payments & actual client debts
  const overduePayments = allPayments.filter((p: FullPaymentData) => p.status === 'overdue');
  const overdueTotals = calculateMultiCurrencyTotals(overduePayments, rate);
  const overdueStudentsCount = new Set(overduePayments.map((p: FullPaymentData) => p.studentId)).size;

  // Dynamic actual revenue (Фактическая выручка)
  const paidPayments = allPayments.filter((p) => p.status === 'paid' && p.amount > 0);
  const paidTotals = calculateMultiCurrencyTotals(paidPayments, rate);
  const monthlyPlanEur = 6000;
  const planPercent = Math.min(100, Math.round((paidTotals.totalEur / monthlyPlanEur) * 100));

  const recentPaidList = allPayments
    .filter((p) => p.status === 'paid' && p.amount > 0)
    .slice(0, 4)
    .map((p) => ({
      id: p.id,
      student: p.studentName,
      studentId: p.studentId,
      course: p.courseName || p.groupName || 'Курс школы',
      amount: p.amountFormatted,
      date: p.paymentDate,
      status: 'Оплачен',
      method: p.paymentMethod === 'card' ? 'Банковская карта' : p.paymentMethod === 'bank_transfer' ? 'СБП' : p.paymentMethod === 'cash' ? 'Наличные' : 'Счет',
      recordedBy: p.recordedBy || 'Администратор',
    }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="md-headline-medium" style={{ color: 'var(--md-on-surface)' }}>
              Сводка руководителя
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
              Руководитель школы
            </span>
          </div>
          <p className="md-body-medium" style={{ color: 'var(--md-on-surface-variant)', marginTop: '4px' }}>
            Финансовые результаты в EUR / RUB • {currentMonth} • Курс 1 € = {rate} ₽
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
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
          {onOpenExecutiveReport && (
            <button
              onClick={onOpenExecutiveReport}
              className="md-btn md-btn-tonal md-btn-sm inline-flex items-center gap-1.5"
              style={{ backgroundColor: '#FAF5FF', color: '#7E22CE', fontWeight: 600, border: '1px solid #E9D5FF' }}
            >
              <Shield size={16} />
              Аудит задач
            </button>
          )}
        </div>
      </div>

      {/* SMART ACTION HUB */}
      <SmartActionHub />

      {/* UPCOMING PAYMENT DEADLINES & RENEWALS (Раздел 2 ТЗ) */}
      <UpcomingPaymentsBlock viewMode="owner" />

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
            <p className="md-title-medium" style={{ color: 'var(--md-error)', marginTop: '2px' }}>
              {overdueStudentsCount === 0
                ? 'Нет долгов'
                : `${overdueStudentsCount} ${overdueStudentsCount === 1 ? 'ученик' : overdueStudentsCount < 5 ? 'ученика' : 'учеников'} • ${overdueTotals.formattedTotalEur}`}
            </p>
            <span className="md-body-small" style={{ color: 'var(--md-primary)' }}>
              {overdueStudentsCount === 0 ? 'Все счета оплачены ✓' : `≈ ${overdueTotals.formattedTotalRub} →`}
            </span>
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
          title="Фактическая выручка (EUR)"
          href="/finance"
          linkLabel="Платежи"
          icon={<CreditCard size={22} />}
          bg="var(--md-secondary-container)"
          iconColor="var(--md-primary)"
          value={paidTotals.formattedTotalEur}
          subtext={`≈ ${paidTotals.formattedTotalRub}`}
          rows={[
            { label: 'План на месяц', value: '6 000 € (≈ 600 000 ₽)' },
            { label: 'Выполнение плана', value: `${planPercent}%`, color: 'var(--md-success)' },
            { label: 'Поступления EUR', value: `${paidTotals.eurDirect.toLocaleString('ru-RU')} €` },
            { label: 'Поступления RUB', value: `${paidTotals.rubDirect.toLocaleString('ru-RU')} ₽ (${paidTotals.rubInEur} €)` },
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

      {/* Admin Performance (для руководителя-владельца) */}
      <div
        className="md-card-elevated flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(21, 101, 192, 0.05) 0%, rgba(142, 36, 170, 0.05) 100%)',
          border: '1px solid rgba(21, 101, 192, 0.15)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-xl font-bold text-white shadow-xs"
            style={{
              width: '42px',
              height: '42px',
              background: 'linear-gradient(135deg, #1565C0 0%, #7B1FA2 100%)',
            }}
          >
            94%
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                Эффективность работы администратора
              </span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                Стандарты соблюдены
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              44/48 задач выполнено в срок • 0 пропущенных задач • 420 000 ₽ проведенных оплат • CSAT 4.95 / 5.0
            </p>
          </div>
        </div>

        <Link
          href="/analytics"
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-blue-700 shadow-xs border border-blue-100 hover:bg-blue-50 transition-colors"
        >
          <BarChart3 size={14} />
          Отчет по эффективности
          <ArrowRight size={13} />
        </Link>
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
type AdminQueueType = 'leads' | 'trials' | 'payments' | 'tasks';

function AdminDashboard({ onOpenReport }: { onOpenReport: () => void }) {
  const toast = useToast();
  const { userName } = useRole();
  const [activeQueue, setActiveQueue] = useState<AdminQueueType | null>(null);
  const [queueSearch, setQueueSearch] = useState('');

  // 1. Leads queue data
  const [leadsList, setLeadsList] = useState([
    {
      id: 'ql-1',
      name: 'Ольга (мама Алисы, 8 лет)',
      course: 'Робототехника Начало',
      source: 'Сайт (15 мин назад)',
      phone: '+7 916 555-44-33',
      status: 'Требует 1-го звонка',
      deadline: 'до 11:30',
      urgent: true,
      contacted: false,
      leadId: 'lead1',
    },
    {
      id: 'ql-2',
      name: 'Артем (папа Максима, 10 лет)',
      course: 'Python для детей',
      source: 'ВКонтакте (40 мин назад)',
      phone: '+7 905 333-22-11',
      status: 'Ожидает подбора группы',
      deadline: 'до 12:30',
      urgent: true,
      contacted: false,
      leadId: 'lead2',
    },
    {
      id: 'ql-3',
      name: 'Дарья (мама Софии, 6 лет)',
      course: 'Английский Kids',
      source: 'Рекомендация родителей',
      phone: '+7 925 111-88-99',
      status: 'Повторное обращение',
      deadline: 'до 14:00',
      urgent: false,
      contacted: false,
      leadId: 'lead3',
    },
    {
      id: 'ql-4',
      name: 'Константин (папа Ивана, 12 лет)',
      course: 'Веб-разработка HTML/JS',
      source: 'Входящий звонок',
      phone: '+7 915 777-66-55',
      status: 'Запрос расписания сб/вс',
      deadline: 'до 15:00',
      urgent: false,
      contacted: false,
      leadId: 'lead4',
    },
  ]);

  // Dynamically sync newly created leads from localStorage or INITIAL_LEADS
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        let allLeads: FullLeadData[] = INITIAL_LEADS;
        const stored = localStorage.getItem('crm_leads_v2');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const parsedIds = new Set(parsed.map((l) => l.id));
            allLeads = [...parsed, ...INITIAL_LEADS.filter((l) => !parsedIds.has(l.id))];
          }
        }

        const newLeads = allLeads.filter((l) => l.status === 'new');
        if (newLeads.length > 0) {
          const dynamicItems = newLeads.map((l) => ({
            id: `ql-dyn-${l.id}`,
            name: `${l.name}${l.studentName ? ` (${l.studentName})` : ''}`,
            course: l.directionOrCourse,
            source: `${l.source} (новое)`,
            phone: l.contact,
            status: 'Требует 1-го звонка',
            deadline: 'в течение 15 мин',
            urgent: true,
            contacted: false,
            leadId: l.id,
          }));

          setLeadsList((prev) => {
            const existingIds = new Set(prev.map((p) => p.leadId));
            const toAdd = dynamicItems.filter((item) => !existingIds.has(item.leadId));
            return [...toAdd, ...prev];
          });
        }
      } catch (e) {
        console.error('Failed to sync new leads into dashboard queue', e);
      }
    }
  }, []);

  // 2. Trials queue data
  const [trialsList, setTrialsList] = useState([
    {
      id: 'qt-1',
      time: '16:00 - 16:45',
      student: 'Даниил Морозов (7 лет)',
      parent: 'Анна (мама)',
      phone: '+7 999 444-11-22',
      course: 'Робототехника (Пробное)',
      room: 'Онлайн (Zoom 2)',
      teacher: 'Дмитрий Смирнов',
      status: 'Подтверждено по SMS',
      attended: false,
    },
    {
      id: 'qt-2',
      time: '17:30 - 18:15',
      student: 'Алиса Смирнова (8 лет)',
      parent: 'Игорь (папа)',
      phone: '+7 903 555-66-77',
      course: 'Английский язык Kids (Пробное)',
      room: 'Онлайн (Zoom 1)',
      teacher: 'Мария Иванова',
      status: 'Ожидает звонка',
      attended: false,
    },
    {
      id: 'qt-3',
      time: '19:00 - 19:45',
      student: 'Кирилл Зайцев (11 лет)',
      parent: 'Елена (мама)',
      phone: '+7 926 777-33-44',
      course: 'Scratch Программирование (Пробное)',
      room: 'Онлайн (Виртуальная лаборатория)',
      teacher: 'Алексей Ковалев',
      status: 'Подтверждено',
      attended: false,
    },
  ]);

  // 3. Payments queue data
  const [paymentsList, setPaymentsList] = useState([
    {
      id: 'qp-1',
      amount: '9 600 ₽',
      student: 'Егор Михайлов (папа Михаил)',
      course: 'Абонемент 8 занятий (Робототехника)',
      method: 'СБП (Тинькофф)',
      time: '10:14',
      receipt: '№20491',
      phone: '+7 999 123-45-67',
      status: 'Принят',
    },
    {
      id: 'qp-2',
      amount: '11 200 ₽',
      student: 'Полина Васильева (мама Ольга)',
      course: 'Индивидуальный блок (4 занятия, Английский)',
      method: 'Терминал (эквайринг)',
      time: '11:45',
      receipt: '№20492',
      phone: '+7 916 555-44-33',
      status: 'Принят',
    },
    {
      id: 'qp-3',
      amount: '8 000 ₽',
      student: 'Артем Новиков (мама Елена)',
      course: 'Продление курса Scratch (8 занятий)',
      method: 'Наличные в кассу',
      time: '12:20',
      receipt: '№20493',
      phone: '+7 905 333-22-11',
      status: 'Принят',
    },
  ]);

  // 4. Tasks queue data
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<UrgentTaskItem | null>(null);
  const [urgentTasks, setUrgentTasks] = useState<UrgentTaskItem[]>([
    {
      id: 'ut-1',
      title: 'Срочно перезвонить Ольге (+7 916 555-44-33)',
      detail: 'Новая заявка с сайта висит > 15 минут без первого контакта',
      deadline: 'до 11:30',
      priority: 'high',
      completed: false,
      assignedTo: 'Анна Администратор',
      clientName: 'Ольга (мама Даниила)',
      phone: '+7 916 555-44-33',
      category: 'lead',
      leadId: 'lead_1',
    },
    {
      id: 'ut-2',
      title: 'Подтвердить явку на пробный онлайн-урок в 16:00',
      detail: 'Даниил Морозов, Робототехника (Онлайн-комната 1, Дмитрий Смирнов)',
      deadline: 'до 12:00',
      priority: 'high',
      completed: false,
      assignedTo: 'Анна Администратор',
      clientName: 'Даниил Морозов',
      phone: '+7 903 111-22-33',
      category: 'trial',
      leadId: 'lead_2',
    },
    {
      id: 'ut-3',
      title: 'Отправить договор и анкету родителю Максима Соколова',
      detail: 'Курс Python для детей, согласовано расписание субботы',
      deadline: 'до 14:00',
      priority: 'medium',
      completed: false,
      assignedTo: 'Анна Администратор',
      clientName: 'Екатерина Соколова',
      phone: '+7 926 777-88-99',
      category: 'finance',
      studentId: '1',
    },
    {
      id: 'ut-4',
      title: 'Сверить журнал посещаемости онлайн-группы Scratch',
      detail: 'Онлайн-урок Scratch Начало, преподаватель Дмитрий',
      deadline: 'до 16:00',
      priority: 'medium',
      completed: false,
      assignedTo: 'Анна Администратор',
      category: 'admin',
    },
    {
      id: 'ut-5',
      title: 'Проверить доступность интерактивных ссылок для уроков',
      detail: 'Обновить шаблоны онлайн-комнат на следующую неделю',
      deadline: 'до 18:00',
      priority: 'normal',
      completed: false,
      assignedTo: 'Анна Администратор',
      category: 'admin',
    },
  ]);

  // Handlers
  const handleToggleLeadContacted = (id: string, name: string) => {
    setLeadsList((prev) =>
      prev.map((l) => (l.id === id ? { ...l, contacted: !l.contacted } : l))
    );
    toast.success(`Звонок по лиду «${name}» отмечен в воронке`);
  };

  const handleToggleTrialAttended = (id: string, student: string) => {
    setTrialsList((prev) =>
      prev.map((t) => (t.id === id ? { ...t, attended: !t.attended } : t))
    );
    toast.success(`Явка на пробный урок «${student}» успешно зафиксирована`);
  };

  const handleToggleTaskCompleted = async (id: string, title: string) => {
    const current = urgentTasks.find((t) => t.id === id);
    const newCompleted = !current?.completed;
    const newStatus = newCompleted ? 'done' : 'open';

    setUrgentTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: newCompleted } : t))
    );

    try {
      await updateUnifiedTaskStatus(id, newStatus, {
        performedBy: userName || 'Администратор',
      });
    } catch (err) {
      console.error('Failed to sync task status from dashboard:', err);
    }
    toast.success(newCompleted ? `Задача «${title}» выполнена!` : `Задача открыта заново`);
  };

  const handleSaveTaskDetails = (updated: UrgentTaskItem) => {
    setUrgentTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTaskForModal(null);
    toast.success(`Задача «${updated.title}» обновлена`);
  };

  const handleCreateNextStageTask = (parentTaskId: string, nextTask: Omit<UrgentTaskItem, 'id'>) => {
    const newId = `ut-${Date.now()}`;
    const created: UrgentTaskItem = {
      ...nextTask,
      id: newId,
    };
    setUrgentTasks((prev) => [created, ...prev]);
  };

  // Today's lessons & selected lesson modal
  const [selectedUrgentTask, setSelectedUrgentTask] = useState<UrgentTaskItem | null>(null);
  const [selectedLessonForModal, setSelectedLessonForModal] = useState<FullLessonData | null>(null);
  const [todayLessons, setTodayLessons] = useState<FullLessonData[]>(INITIAL_LESSONS.slice(0, 3));

  // Contact today tasks
  interface ContactTodayItem {
    id: string;
    name: string;
    role: string;
    action: string;
    phone: string;
    time: string;
    urgent?: boolean;
    parentId?: string;
    studentId?: string;
    studentName?: string;
    leadId?: string;
    taskType: 'Retention' | 'CRM Сделка' | 'Финансы' | 'Продление' | 'Оргвопрос';
    priority: 'high' | 'medium' | 'normal';
  }

  const [contactTodayList, setContactTodayList] = useState<ContactTodayItem[]>([
    {
      id: 'ct-1',
      name: 'Михаил Романов',
      role: 'папа Егора',
      action: 'Узнать решение после пробного урока',
      phone: '+7 999 123-45-67',
      time: 'до 14:00',
      urgent: false,
      parentId: 'p4',
      studentId: 's8',
      studentName: 'Егор Романов',
      taskType: 'Retention',
      priority: 'medium',
    },
    {
      id: 'ct-2',
      name: 'Ольга Смирнова',
      role: 'мама Алисы',
      action: 'Новая заявка с сайта на Робототехнику',
      phone: '+7 916 555-44-33',
      time: 'срочно',
      urgent: true,
      leadId: 'lead_1',
      parentId: 'p1',
      studentName: 'Алиса Смирнова',
      taskType: 'CRM Сделка',
      priority: 'high',
    },
    {
      id: 'ct-3',
      name: 'Сергей Кузнецов',
      role: 'папа Матвея',
      action: 'Напомнить о выставленном счете на продление',
      phone: '+7 903 888-22-11',
      time: 'до 18:00',
      urgent: false,
      parentId: 'p3',
      studentId: 's12',
      studentName: 'Матвей Новиков',
      taskType: 'Финансы',
      priority: 'medium',
    },
  ]);

  const handleOpenContactTask = (item: ContactTodayItem) => {
    setSelectedTaskForModal({
      id: item.id,
      title: item.action,
      detail: `Контакт с родителем: ${item.name} (${item.role}). ${item.studentName ? `Ученик: ${item.studentName}. ` : ''}Задача: ${item.action}`,
      deadline: item.time,
      priority: item.priority,
      completed: false,
      assignedTo: 'Анна Администратор',
      clientName: `${item.name} (${item.role})`,
      phone: item.phone,
      taskType: item.taskType,
      category:
        item.taskType === 'Retention'
          ? 'trial'
          : item.taskType === 'CRM Сделка'
          ? 'lead'
          : item.taskType === 'Финансы'
          ? 'finance'
          : 'admin',
      leadId: item.leadId,
      studentId: item.studentId,
      parentId: item.parentId,
    });
  };

  const handleUpdateLessonAttendance = (
    lessonId: string,
    studentId: string,
    status: 'present' | 'absent' | 'excused' | 'rescheduled' | 'cancelled' | 'not_marked'
  ) => {
    setTodayLessons((prev) =>
      prev.map((l) => {
        if (l.id !== lessonId) return l;
        return {
          ...l,
          students: l.students.map((st) =>
            st.id === studentId ? { ...st, attendanceStatus: status } : st
          ),
        };
      })
    );
    if (selectedLessonForModal?.id === lessonId) {
      setSelectedLessonForModal((prev) =>
        prev
          ? {
              ...prev,
              students: prev.students.map((st) =>
                st.id === studentId ? { ...st, attendanceStatus: status } : st
              ),
            }
          : null
      );
    }
    toast.success('Посещаемость занятия сохранена');
  };

  const pendingTasksCount = urgentTasks.filter((t) => !t.completed).length;
  const highPriorityTasksCount = urgentTasks.filter((t) => !t.completed && t.priority === 'high').length;
  const pendingLeadsCount = leadsList.filter((l) => !l.contacted).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="md-headline-medium" style={{ color: 'var(--md-on-surface)' }}>
              Мой день
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

      {/* UPCOMING PAYMENT DEADLINES & RENEWALS (Раздел 2 ТЗ) */}
      <UpcomingPaymentsBlock viewMode="admin" />

      {/* Admin KPI metrics (Clickable cards that open today's task queues) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Заявки сегодня */}
        <button
          type="button"
          onClick={() => setActiveQueue(activeQueue === 'leads' ? null : 'leads')}
          className={cn(
            'md-card-elevated text-left transition-all duration-200 cursor-pointer p-4.5 rounded-2xl relative',
            activeQueue === 'leads'
              ? 'ring-2 ring-blue-600 bg-blue-50/50 shadow-md border-blue-300'
              : 'hover:-translate-y-0.5 hover:shadow-md border border-transparent'
          )}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
            <span className="md-label-large font-bold" style={{ color: 'var(--md-on-surface-variant)' }}>Заявки сегодня</span>
            <IconContainer bg="var(--md-primary-container)" color="var(--md-primary)">
              <UserCheck size={20} />
            </IconContainer>
          </div>
          <p className="md-display-small" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--md-on-surface)' }}>
            {pendingLeadsCount} новых
          </p>
          <p className="md-body-small font-medium" style={{ color: 'var(--md-primary)', marginTop: '4px' }}>
            {leadsList.filter(l => l.urgent && !l.contacted).length} требуют первого звонка
          </p>
          <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold">
            <span style={{ color: 'var(--md-primary)' }}>
              {activeQueue === 'leads' ? '▼ Очередь открыта' : 'Открыть очередь →'}
            </span>
            <span className="text-[11px] text-slate-400">4 лида</span>
          </div>
        </button>

        {/* Card 2: Пробные сегодня */}
        <button
          type="button"
          onClick={() => setActiveQueue(activeQueue === 'trials' ? null : 'trials')}
          className={cn(
            'md-card-elevated text-left transition-all duration-200 cursor-pointer p-4.5 rounded-2xl relative',
            activeQueue === 'trials'
              ? 'ring-2 ring-blue-600 bg-blue-50/50 shadow-md border-blue-300'
              : 'hover:-translate-y-0.5 hover:shadow-md border border-transparent'
          )}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
            <span className="md-label-large font-bold" style={{ color: 'var(--md-on-surface-variant)' }}>Пробные сегодня</span>
            <IconContainer bg="var(--md-secondary-container)" color="var(--md-on-secondary-container)">
              <Calendar size={20} />
            </IconContainer>
          </div>
          <p className="md-display-small" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--md-on-surface)' }}>
            {trialsList.length} урока
          </p>
          <p className="md-body-small font-medium" style={{ color: 'var(--md-on-surface-variant)', marginTop: '4px' }}>
            16:00, 17:30, 19:00
          </p>
          <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold">
            <span style={{ color: 'var(--md-primary)' }}>
              {activeQueue === 'trials' ? '▼ Очередь открыта' : 'Открыть очередь →'}
            </span>
            <span className="text-[11px] text-slate-400">
              {trialsList.filter(t => t.attended).length}/{trialsList.length} пришли
            </span>
          </div>
        </button>

        {/* Card 3: Оплаты сегодня */}
        <button
          type="button"
          onClick={() => setActiveQueue(activeQueue === 'payments' ? null : 'payments')}
          className={cn(
            'md-card-elevated text-left transition-all duration-200 cursor-pointer p-4.5 rounded-2xl relative',
            activeQueue === 'payments'
              ? 'ring-2 ring-emerald-600 bg-emerald-50/50 shadow-md border-emerald-300'
              : 'hover:-translate-y-0.5 hover:shadow-md border border-transparent'
          )}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
            <span className="md-label-large font-bold" style={{ color: 'var(--md-on-surface-variant)' }}>Оплаты сегодня</span>
            <IconContainer bg="var(--md-success-container)" color="var(--md-on-success-container)">
              <CreditCard size={20} />
            </IconContainer>
          </div>
          <p className="md-display-small" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--md-success)' }}>
            28 800 ₽
          </p>
          <p className="md-body-small font-medium" style={{ color: 'var(--md-on-surface-variant)', marginTop: '4px' }}>
            {paymentsList.length} платежа принято
          </p>
          <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold">
            <span className="text-emerald-700">
              {activeQueue === 'payments' ? '▼ Очередь открыта' : 'Открыть кассу →'}
            </span>
            <span className="text-[11px] text-slate-400">Касса OK</span>
          </div>
        </button>

        {/* Card 4: Срочные задачи */}
        <button
          type="button"
          onClick={() => setActiveQueue(activeQueue === 'tasks' ? null : 'tasks')}
          className={cn(
            'md-card-elevated text-left transition-all duration-200 cursor-pointer p-4.5 rounded-2xl relative',
            activeQueue === 'tasks'
              ? 'ring-2 ring-amber-600 bg-amber-50/50 shadow-md border-amber-300'
              : 'hover:-translate-y-0.5 hover:shadow-md border border-transparent'
          )}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
            <span className="md-label-large font-bold" style={{ color: 'var(--md-on-surface-variant)' }}>Срочные задачи</span>
            <IconContainer bg="var(--md-warning-container)" color="var(--md-warning)">
              <CheckSquare size={20} />
            </IconContainer>
          </div>
          <p className="md-display-small" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--md-warning)' }}>
            {pendingTasksCount} задач
          </p>
          <p className="md-body-small font-medium" style={{ color: 'var(--md-error)', marginTop: '4px' }}>
            {highPriorityTasksCount} с горящим дедлайном
          </p>
          <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold">
            <span style={{ color: 'var(--md-warning)' }}>
              {activeQueue === 'tasks' ? '▼ Очередь открыта' : 'Открыть задачи →'}
            </span>
            <span className="text-[11px] text-slate-400">
              {urgentTasks.filter(t => t.completed).length}/{urgentTasks.length} выполнено
            </span>
          </div>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* EXPANDABLE OPERATIONAL QUEUE PANEL (Открывается по нажатию на карточку) */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {activeQueue && (
        <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-lg animate-in fade-in slide-in-from-top-3 duration-200 space-y-4">
          {/* Header with Title, Tab Switcher and Close */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                {activeQueue === 'leads' && <UserCheck size={18} />}
                {activeQueue === 'trials' && <Calendar size={18} />}
                {activeQueue === 'payments' && <CreditCard size={18} />}
                {activeQueue === 'tasks' && <CheckSquare size={18} />}
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {activeQueue === 'leads' && 'Операционная очередь: Заявки на сегодня'}
                  {activeQueue === 'trials' && 'Операционная очередь: Пробные уроки сегодня'}
                  {activeQueue === 'payments' && 'Операционная очередь: Оплаты и касса за сегодня'}
                  {activeQueue === 'tasks' && 'Операционная очередь: Срочные задачи на смену'}
                </h2>
                <p className="text-xs text-slate-500">
                  {activeQueue === 'leads' && 'Обработка входящих лидов и назначение пробных занятий'}
                  {activeQueue === 'trials' && 'Контроль доходимости, звонки-напоминания и фиксация явки'}
                  {activeQueue === 'payments' && 'Прием денежных средств, электронные чеки в WhatsApp и выставление счетов'}
                  {activeQueue === 'tasks' && 'Контроль дедлайнов и выполнение оперативных поручений'}
                </p>
              </div>
            </div>

            {/* Segmented Queue Switcher & Close button */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveQueue('leads')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all',
                    activeQueue === 'leads' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Заявки ({pendingLeadsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveQueue('trials')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all',
                    activeQueue === 'trials' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Пробные ({trialsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveQueue('payments')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all',
                    activeQueue === 'payments' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Оплаты ({paymentsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveQueue('tasks')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all',
                    activeQueue === 'tasks' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Задачи ({pendingTasksCount})
                </button>
              </div>

              <button
                type="button"
                onClick={() => setActiveQueue(null)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                title="Свернуть очередь"
              >
                <X size={14} />
                <span>Свернуть</span>
              </button>
            </div>
          </div>

          {/* Quick Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                placeholder="Быстрый поиск по имени, курсу, телефону..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
              />
            </div>
            {queueSearch && (
              <button
                onClick={() => setQueueSearch('')}
                className="text-xs text-blue-600 font-medium hover:underline"
              >
                Сбросить
              </button>
            )}
          </div>

          {/* QUEUE 1: LEADS CONTENT */}
          {activeQueue === 'leads' && (
            <div className="space-y-2.5">
              {leadsList
                .filter((lead) => {
                  const q = queueSearch.toLowerCase();
                  return (
                    lead.name.toLowerCase().includes(q) ||
                    lead.course.toLowerCase().includes(q) ||
                    lead.phone.includes(q) ||
                    lead.source.toLowerCase().includes(q)
                  );
                })
                .map((lead) => (
                  <div
                    key={lead.id}
                    className={cn(
                      'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all',
                      lead.contacted
                        ? 'bg-slate-50 border-slate-200 opacity-70'
                        : lead.urgent
                        ? 'bg-amber-50/40 border-amber-200 shadow-2xs'
                        : 'bg-white border-slate-200'
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{lead.name}</span>
                        <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-bold">
                          {lead.course}
                        </span>
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {lead.source}
                        </span>
                        {lead.contacted ? (
                          <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                            Звонок совершен
                          </span>
                        ) : (
                          <span className="rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold animate-pulse">
                            Дедлайн: {lead.deadline}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 flex items-center gap-2">
                        <Phone size={12} className="text-slate-400" />
                        <span className="font-mono">{lead.phone}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">{lead.status}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                      <a
                        href={`tel:${lead.phone.replace(/[^0-9+]/g, '')}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                        title="Позвонить родителю"
                      >
                        <PhoneCall size={13} />
                        Позвонить
                      </a>
                      <a
                        href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                        title="Написать в WhatsApp"
                      >
                        <MessageCircle size={13} />
                        WhatsApp
                      </a>
                      <button
                        type="button"
                        onClick={() => handleToggleLeadContacted(lead.id, lead.name)}
                        className={cn(
                          'px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                          lead.contacted
                            ? 'bg-slate-200 text-slate-700 border-slate-300'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        {lead.contacted ? 'Отменить звонок' : 'Звонок совершен'}
                      </button>
                      <Link
                        href={`/crm/leads/${lead.leadId}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                        title="Открыть карточку лида"
                      >
                        <ExternalLink size={15} />
                      </Link>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* QUEUE 2: TRIALS CONTENT */}
          {activeQueue === 'trials' && (
            <div className="space-y-2.5">
              {trialsList
                .filter((trial) => {
                  const q = queueSearch.toLowerCase();
                  return (
                    trial.student.toLowerCase().includes(q) ||
                    trial.course.toLowerCase().includes(q) ||
                    trial.teacher.toLowerCase().includes(q) ||
                    trial.phone.includes(q)
                  );
                })
                .map((trial) => (
                  <div
                    key={trial.id}
                    className={cn(
                      'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all',
                      trial.attended
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-white border-slate-200 shadow-2xs'
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-md">
                          {trial.time}
                        </span>
                        <span className="font-bold text-xs text-slate-900">{trial.student}</span>
                        <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-bold">
                          {trial.course}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {trial.room} • Преподаватель: {trial.teacher}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 flex items-center gap-2">
                        <span>Родитель: <strong>{trial.parent}</strong> ({trial.phone})</span>
                        <span className="text-slate-400">•</span>
                        <span className={cn(
                          'text-[10px] font-bold px-2 py-0.2 rounded-full',
                          trial.attended
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        )}>
                          {trial.attended ? 'Явка подтверждена' : trial.status}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleTrialAttended(trial.id, trial.student)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                          trial.attended
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                        )}
                      >
                        {trial.attended ? 'Пришел на урок' : 'Отметить явку'}
                      </button>
                      <a
                        href={`https://wa.me/${trial.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                      >
                        <MessageCircle size={13} />
                        WhatsApp
                      </a>
                      <a
                        href={`tel:${trial.phone.replace(/[^0-9+]/g, '')}`}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                        title="Позвонить родителю"
                      >
                        <PhoneCall size={15} />
                      </a>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* QUEUE 3: PAYMENTS CONTENT */}
          {activeQueue === 'payments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-emerald-50/70 p-3 border border-emerald-200/80 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-900">Итого принято сегодня: 28 800 ₽</span>
                  <span className="text-emerald-700">• 3 успешных платежа</span>
                </div>
                <Link
                  href="/finance"
                  className="font-bold text-emerald-800 hover:text-emerald-950 underline"
                >
                  Перейти в раздел Финансы →
                </Link>
              </div>

              <div className="space-y-2">
                {paymentsList
                  .filter((p) => {
                    const q = queueSearch.toLowerCase();
                    return (
                      p.student.toLowerCase().includes(q) ||
                      p.course.toLowerCase().includes(q) ||
                      p.method.toLowerCase().includes(q)
                    );
                  })
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition-all shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-emerald-700">{p.amount}</span>
                          <span className="text-xs font-bold text-slate-900">{p.student}</span>
                          <span className="text-[11px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded-sm">
                            Чек {p.receipt} ({p.time})
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          {p.course} • Способ оплаты: <strong className="text-slate-800">{p.method}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={`https://wa.me/${p.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                        >
                          <MessageCircle size={13} />
                          Чек в WhatsApp
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            toast.info(`Печатная форма чека ${p.receipt} отправлена на принтер`);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                        >
                          <Printer size={13} />
                          Печать
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* QUEUE 4: URGENT TASKS CONTENT */}
          {activeQueue === 'tasks' && (
            <div className="space-y-2.5">
              {urgentTasks
                .filter((task) => {
                  const q = queueSearch.toLowerCase();
                  return (
                    task.title.toLowerCase().includes(q) ||
                    task.detail.toLowerCase().includes(q)
                  );
                })
                .map((task) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskForModal(task)}
                    className={cn(
                      'group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none',
                      task.completed
                        ? 'bg-slate-50 border-slate-200 opacity-60'
                        : task.priority === 'high'
                        ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300 shadow-2xs hover:shadow-xs'
                        : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 shadow-2xs hover:shadow-xs'
                    )}
                    title="Нажмите, чтобы открыть карточку задачи и управление этапами"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => handleToggleTaskCompleted(task.id, task.title)}
                        className="mt-1 h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'text-xs font-bold transition-colors group-hover:text-blue-600',
                              task.completed ? 'line-through text-slate-400' : 'text-slate-900'
                            )}
                          >
                            {task.title}
                          </span>
                          {task.priority === 'high' && !task.completed && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                              <Flame size={11} />
                              Срочно
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            Дедлайн: {task.deadline}
                          </span>
                          {task.clientName && (
                            <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full font-medium">
                              {task.clientName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{task.detail}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTaskForModal(task);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blue-700 transition-colors shadow-2xs"
                      >
                        <Edit3 size={12} />
                        Карточка →
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTaskCompleted(task.id, task.title);
                        }}
                        className={cn(
                          'inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs',
                          task.completed
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        )}
                      >
                        <Check size={13} />
                        {task.completed ? 'Выполнено' : 'Отметить готовым'}
                      </button>
                    </div>
                  </div>
                ))}

              <div className="pt-2 flex justify-end">
                <Link
                  href="/tasks"
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  Все задачи школы в разделе Задачи →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin Action lists: Leads to call + Today's Lessons */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Leads requiring contact */}
        <div className="md-card-elevated" style={{ padding: '20px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
            <div className="flex items-center gap-2">
              <PhoneCall size={18} style={{ color: 'var(--md-primary)' }} />
              <h3 className="md-title-medium" style={{ color: 'var(--md-on-surface)' }}>
                Связаться сегодня ({contactTodayList.length})
              </h3>
            </div>
            <Link href="/crm" className="md-label-medium" style={{ color: 'var(--md-primary)' }}>
              Открыть воронку →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {contactTodayList.map((lead) => (
              <div
                key={lead.id}
                onClick={() => handleOpenContactTask(lead)}
                role="button"
                tabIndex={0}
                className="group cursor-pointer transition-all hover:bg-white hover:shadow-xs"
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--md-surface-container-low)',
                  borderRadius: '12px',
                  border: '1px solid rgba(0,0,0,0.04)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="md-label-large group-hover:text-blue-600 transition-colors" style={{ color: 'var(--md-on-surface)' }}>
                      {lead.name} <span style={{ color: 'var(--md-on-surface-variant)', fontWeight: 400 }}>({lead.role})</span>
                    </p>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor:
                          lead.taskType === 'Retention' ? '#fef3c7' : lead.taskType === 'CRM Сделка' ? '#e0e7ff' : '#dcfce7',
                        color:
                          lead.taskType === 'Retention' ? '#92400e' : lead.taskType === 'CRM Сделка' ? '#3730a3' : '#166534',
                      }}
                    >
                      {lead.taskType}
                    </span>
                  </div>
                  <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)', marginTop: '2px' }}>
                    {lead.action}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="md-label-small flex items-center gap-1" style={{ color: 'var(--md-primary)' }}>
                      <Phone size={11} />
                      {lead.phone}
                    </span>
                    {lead.parentId && (
                      <Link
                        href={`/parents/${lead.parentId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5"
                      >
                        Карточка родителя →
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
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
                  <span className="text-[10px] text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    Карточка задачи <ExternalLink size={10} />
                  </span>
                </div>
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
                Расписание на сегодня ({todayLessons.length})
              </h3>
            </div>
            <Link href="/calendar" className="md-label-medium" style={{ color: 'var(--md-primary)' }}>
              Календарь →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {todayLessons.map((lesson) => {
              const totalStudents = lesson.students?.length || 0;
              const presentCount = lesson.students?.filter((s) => s.attendanceStatus === 'present').length || 0;
              return (
                <div
                  key={lesson.id}
                  onClick={() => setSelectedLessonForModal(lesson)}
                  role="button"
                  tabIndex={0}
                  className="group cursor-pointer transition-all hover:bg-white hover:shadow-xs"
                  style={{
                    padding: '12px 14px',
                    backgroundColor: 'var(--md-surface-container-low)',
                    borderRadius: '12px',
                    border: '1px solid rgba(0,0,0,0.04)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="md-label-large group-hover:text-blue-600 transition-colors" style={{ color: 'var(--md-on-surface)' }}>
                        {lesson.groupName}
                      </p>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {lesson.courseName}
                      </span>
                    </div>
                    <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)', marginTop: '2px' }}>
                      {lesson.teacherName} • {lesson.room}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="md-label-medium" style={{ color: 'var(--md-primary)', display: 'block' }}>
                      {lesson.startTime} - {lesson.endTime}
                    </span>
                    <span className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
                      {presentCount}/{totalStudents} уч.
                    </span>
                    <span className="text-[10px] text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1 mt-0.5">
                      Карточка урока <ExternalLink size={10} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Task Details Card Modal */}
      <TaskDetailsCardModal
        isOpen={!!selectedTaskForModal}
        task={selectedTaskForModal}
        onClose={() => setSelectedTaskForModal(null)}
        onSave={handleSaveTaskDetails}
        onComplete={(id) => {
          setUrgentTasks((prev) =>
            prev.map((t) => (t.id === id ? { ...t, completed: true } : t))
          );
        }}
        onCreateNextStage={handleCreateNextStageTask}
      />

      {/* Lesson Quick View & Attendance Card Modal */}
      <LessonQuickViewModal
        isOpen={!!selectedLessonForModal}
        lesson={selectedLessonForModal}
        onClose={() => setSelectedLessonForModal(null)}
        onUpdateAttendance={handleUpdateLessonAttendance}
      />
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
  const [executiveModalOpen, setExecutiveModalOpen] = useState(false);

  return (
    <>
      {role === 'teacher' ? (
        <TeacherDashboard />
      ) : role === 'admin' ? (
        <AdminDashboard onOpenReport={() => setReportModalOpen(true)} />
      ) : (
        <OwnerDashboard
          onOpenReport={() => setReportModalOpen(true)}
          onOpenExecutiveReport={() => setExecutiveModalOpen(true)}
        />
      )}

      <DailyReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />

      {(role === 'owner' || role === 'developer') && (
        <ExecutiveTaskReportModal
          isOpen={executiveModalOpen}
          onClose={() => setExecutiveModalOpen(false)}
        />
      )}
    </>
  );
}
