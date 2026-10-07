'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useFocusSync } from '@/hooks/useFocusSync';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  User,
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
import { useRole, usePermissions } from '@/context/RoleContext';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';
import { DailyReportModal } from '@/components/dashboard/DailyReportModal';
import { ExecutiveTaskReportModal } from '@/components/dashboard/ExecutiveTaskReportModal';
import { UpcomingPaymentsBlock } from '@/components/dashboard/UpcomingPaymentsBlock';
import { TaskDetailsCardModal, UrgentTaskItem } from '@/components/dashboard/TaskDetailsCardModal';
import { LessonQuickViewModal } from '@/components/calendar/LessonQuickViewModal';
import { ScheduleLessonModal } from '@/components/calendar/ScheduleLessonModal';
import { INITIAL_LESSONS, FullLessonData, INITIAL_PAYMENTS, FullPaymentData, INITIAL_LEADS, FullLeadData, INITIAL_GROUPS } from '@/lib/data/mockData';
import { getStoredPayments } from '@/lib/data/paymentStorage';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { getStoredLessons } from '@/lib/data/lessonStorage';
import { calculateMultiCurrencyTotals, getEurRubRate } from '@/lib/data/currencyHelper';
import { getStudentFinancialSummary } from '@/lib/data/balanceHelper';
import { updateUnifiedTaskStatus } from '@/lib/data/taskManager';
import { cn } from '@/lib/utils';
import { MobileActionCenter } from '@/components/dashboard/MobileActionCenter';
import { CreateLeadModal } from '@/components/crm/CreateLeadModal';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useDashboardState } from '@/features/dashboard/hooks/useDashboardState';
import { DashboardDesktop } from '@/features/dashboard/components/DashboardDesktop';
import { DashboardMobile } from '@/features/dashboard/components/DashboardMobile';
import { QuickActionDrawer, DrawerState, DrawerType } from '@/components/dashboard/QuickActionDrawer';
import { TaskModal } from '@/components/dashboard/TaskModal';
import { TeacherModal } from '@/components/dashboard/TeacherModal';
import { AdminDashboardView } from '@/features/dashboard/components/AdminDashboardView';
import { TeacherWorkspaceView } from '@/features/teacher/components/TeacherWorkspaceView';

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

  const [leads, setLeads] = useState<FullLeadData[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('crm_leads_v2');
        if (stored) {
          const parsed: FullLeadData[] = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const parsedIds = new Set(parsed.map((l) => l.id));
            return [...parsed, ...INITIAL_LEADS.filter((l) => !parsedIds.has(l.id))];
          }
        }
      } catch {}
    }
    return INITIAL_LEADS;
  });

  const syncDashboard = useCallback(() => {
    setPayments(getStoredPayments());
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('crm_leads_v2');
        if (stored) {
          const parsed: FullLeadData[] = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const parsedIds = new Set(parsed.map((l) => l.id));
            setLeads([...parsed, ...INITIAL_LEADS.filter((l) => !parsedIds.has(l.id))]);
            return;
          }
        }
      } catch {}
    }
    setLeads([...INITIAL_LEADS]);
  }, []);

  useFocusSync(syncDashboard);

  useEffect(() => {
    syncDashboard();
    window.addEventListener('crm-payments-changed', syncDashboard);
    window.addEventListener('crm-leads-changed', syncDashboard);
    window.addEventListener('crm-students-changed', syncDashboard);
    window.addEventListener('crm-names-synced', syncDashboard);
    return () => {
      window.removeEventListener('crm-payments-changed', syncDashboard);
      window.removeEventListener('crm-leads-changed', syncDashboard);
      window.removeEventListener('crm-students-changed', syncDashboard);
      window.removeEventListener('crm-names-synced', syncDashboard);
    };
  }, [syncDashboard]);

  const overdueList = payments.filter((p) => p.status === 'overdue');
  const firstOverdue = overdueList[0];
  const rate = getEurRubRate();

  const firstOverdueStudentSummary = firstOverdue?.studentId
    ? getStudentFinancialSummary(firstOverdue.studentId)
    : null;

  let debtHighlight = '0 € долгов';
  if (firstOverdue) {
    if (firstOverdueStudentSummary && firstOverdueStudentSummary.debt > 0) {
      debtHighlight = `Долг: ${firstOverdueStudentSummary.debt.toLocaleString('ru-RU')} €`;
    } else {
      const rawAmount = typeof firstOverdue.amount === 'number'
        ? firstOverdue.amount
        : parseFloat(String(firstOverdue.amount).replace(/[^\d.,]/g, '').replace(',', '.')) || 84;
      const isEur = rawAmount <= 500 || String(firstOverdue.amount).includes('€');
      const eur = isEur ? rawAmount : Math.round((rawAmount / rate) * 100) / 100;
      debtHighlight = `Долг: ${eur.toLocaleString('ru-RU')} €`;
    }
  }

  const debtTask = firstOverdue
    ? {
        id: 'task_debt_1',
        type: 'debt',
        badge: 'Долг по оплате',
        badgeColor: 'bg-rose-50 text-rose-700 border border-rose-200',
        title: `${firstOverdue.studentName} (${firstOverdue.courseName || firstOverdue.groupName || 'Курс'})`,
        deadline: firstOverdue.paymentDate || 'Срочно',
        subtitle: firstOverdue.parentName ? `Родитель: ${firstOverdue.parentName}` : 'Счет на оплату',
        highlight: debtHighlight,
        phone: '+79992345678',
        waUrl: 'https://wa.me/79992345678?text=Здравствуйте!%20Напоминаем%20об%20оплате%20абонемента%20в%20школе.',
        profileUrl: `/students/${firstOverdue.studentId}`,
        actionLabel: `Открыть карточку ученика (${firstOverdue.studentName})`,
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
        highlight: '0 € долгов',
        phone: '',
        waUrl: '',
        profileUrl: '/finance?filter=overdue',
        actionLabel: 'В раздел финансов',
        description: 'У всех учащихся на текущий момент отсутствуют просроченные платежи.',
      };

  const activeAttentionLead = leads.find((l) => l.status === 'new' || l.status === 'trial_held' || l.status === 'thinking') || leads[0];

  const leadTask = activeAttentionLead
    ? {
        id: `task_lead_${activeAttentionLead.id}`,
        type: 'lead',
        badge: activeAttentionLead.status === 'new' ? 'Новый лид (> 2ч)' : activeAttentionLead.status === 'trial_held' ? 'Завис после пробного' : 'Думают / Счёт',
        badgeColor: 'bg-amber-50 text-amber-700 border border-amber-200',
        title: activeAttentionLead.name,
        deadline: activeAttentionLead.nextActionDate || 'Сегодня, до 15:00',
        subtitle: activeAttentionLead.studentName
          ? `Ребенок: ${activeAttentionLead.studentName} (${activeAttentionLead.directionOrCourse || 'Курс'})`
          : (activeAttentionLead.directionOrCourse || 'Заявка на обучение'),
        highlight: activeAttentionLead.status === 'new'
          ? 'Ждет звонка для записи на пробное'
          : activeAttentionLead.status === 'trial_held'
          ? 'Пробный урок проведен • Ждет решения'
          : 'Выставлен счет • Требуется дожим',
        phone: activeAttentionLead.contact,
        waUrl: activeAttentionLead.contact ? `https://wa.me/${activeAttentionLead.contact.replace(/\D/g, '')}?text=${encodeURIComponent(`Здравствуйте, ${activeAttentionLead.name}!`)}` : undefined,
        profileUrl: `/crm/leads/${activeAttentionLead.id}`,
        actionLabel: `Открыть карточку лида (${activeAttentionLead.name})`,
        description: activeAttentionLead.comment || 'Заявка на обучение. Требуется связаться с клиентом для согласования следующего шага.',
      }
    : {
        id: 'task_lead_default',
        type: 'lead',
        badge: 'Воронка в норме',
        badgeColor: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        title: 'Новых заявок нет',
        deadline: 'Порядок',
        subtitle: 'Все лиды обработаны',
        highlight: 'Воронка под контролем',
        profileUrl: '/crm',
        actionLabel: 'В раздел CRM',
        description: 'Все входящие обращения оперативно обработаны менеджерами.',
      };

  const trialLessons = INITIAL_LESSONS.filter((l) => (l.trialStudentsCount && l.trialStudentsCount > 0) || l.students.some((s) => s.isTrial));
  const totalTrialCount = trialLessons.reduce((sum, l) => sum + (l.trialStudentsCount || l.students.filter((s) => s.isTrial).length || 1), 0);

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
    leadTask,
    {
      id: 'task_trials_1',
      type: 'trial',
      badge: 'Пробные уроки',
      badgeColor: 'bg-purple-50 text-purple-700 border border-purple-200',
      title: `Пробные занятия сегодня (${totalTrialCount} чел.)`,
      deadline: 'Сегодня (15:00 и 18:45)',
      subtitle: '15:00 Робототехника • 18:45 Английский',
      highlight: 'Арсений П., Артем П. (в расписании)',
      profileUrl: '/calendar',
      actionLabel: 'Открыть расписание на неделю',
      description: 'Сегодня проводятся пробные занятия с новыми учениками. Преподаватели предупреждены, материалы подготовлены.',
    },
  ];

  const urgentActionsCount = (firstOverdue ? 1 : 0) + (activeAttentionLead ? 1 : 0) + 1;

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
  const isMobile = useIsMobile(768);
  const dashboardState = useDashboardState();

  return isMobile ? (
    <DashboardMobile {...dashboardState} onOpenReport={onOpenReport} onOpenExecutiveReport={onOpenExecutiveReport} />
  ) : (
    <DashboardDesktop {...dashboardState} onOpenReport={onOpenReport} onOpenExecutiveReport={onOpenExecutiveReport} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ADMIN DASHBOARD (Оперативное управление: ученики, лиды, звонки, оплаты)
// ─────────────────────────────────────────────────────────────────────────────
function AdminDashboard({ onOpenReport }: { onOpenReport: () => void }) {
  return <AdminDashboardView onOpenReport={onOpenReport} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. TEACHER DASHBOARD (Свои занятия, журнал, группы, посещаемость)
// ─────────────────────────────────────────────────────────────────────────────
function TeacherDashboard() {
  return <TeacherWorkspaceView />;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD DISPATCHER
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { isTeacherOnly, canViewAdminDashboard, canViewOwnerDashboard } = usePermissions();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [executiveModalOpen, setExecutiveModalOpen] = useState(false);

  return (
    <>
      {isTeacherOnly ? (
        <TeacherDashboard />
      ) : canViewAdminDashboard ? (
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

      {canViewOwnerDashboard && (
        <ExecutiveTaskReportModal
          isOpen={executiveModalOpen}
          onClose={() => setExecutiveModalOpen(false)}
        />
      )}
    </>
  );
}
