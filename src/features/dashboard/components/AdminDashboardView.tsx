'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  UserCheck,
  CreditCard,
  CheckSquare,
  ArrowRight,
  Phone,
  Video,
  Clock,
  Sparkles,
  Plus,
  FileText,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFocusSync } from '@/hooks/useFocusSync';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';

// Existing Entities & Storages
import { FullLessonData, FullLeadData, FullPaymentData, FullTaskData, FullStudentData } from '@/lib/data/mockData';
import { getStoredLessons, saveLessonToStorage } from '@/lib/data/lessonStorage';
import { getStoredLeads } from '@/lib/data/leadStorage';
import { getStoredPayments } from '@/lib/data/paymentStorage';
import { getStoredTasks } from '@/lib/data/taskStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { getUpcomingPayments, UpcomingPaymentItem } from '@/lib/data/upcomingPaymentsHelper';
import { updateUnifiedTaskStatus } from '@/lib/data/taskManager';
import { parsePaymentAmountEUR, getEurRubRate, formatDualCurrency } from '@/lib/data/currencyHelper';

// Existing Modals
import { CreateLeadModal } from '@/components/crm/CreateLeadModal';
import { LessonQuickViewModal } from '@/components/calendar/LessonQuickViewModal';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { WidgetErrorBoundary } from '@/features/dashboard/components/WidgetErrorBoundary';

interface AdminDashboardViewProps {
  onOpenReport: () => void;
}

export function AdminDashboardView({ onOpenReport }: AdminDashboardViewProps) {
  const router = useRouter();
  const toast = useToast();
  const { userName } = useRole();
  const rate = getEurRubRate();

  // 1. Unified Entity State from Existing Storages
  const [lessons, setLessons] = useState<FullLessonData[]>([]);
  const [leads, setLeads] = useState<FullLeadData[]>([]);
  const [payments, setPayments] = useState<FullPaymentData[]>([]);
  const [tasks, setTasks] = useState<FullTaskData[]>([]);
  const [students, setStudents] = useState<FullStudentData[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPaymentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedLessonModal, setSelectedLessonModal] = useState<FullLessonData | null>(null);

  // Load all existing data
  const loadData = useCallback(() => {
    try {
      setLessons(getStoredLessons());
      setLeads(getStoredLeads(true, true));
      setPayments(getStoredPayments());
      setStudents(getStoredStudents());
      setUpcomingPayments(getUpcomingPayments());
      getStoredTasks()
        .then((res) => {
          if (Array.isArray(res)) setTasks(res);
        })
        .catch(() => {});
    } catch (err) {
      console.error('Error refreshing admin dashboard data:', err);
    }
  }, []);

  useFocusSync(loadData);

  // Realtime & Event-driven synchronization
  useEffect(() => {
    loadData();

    const handleSync = () => loadData();
    window.addEventListener('crm-lessons-changed', handleSync);
    window.addEventListener('crm-leads-changed', handleSync);
    window.addEventListener('crm-payments-changed', handleSync);
    window.addEventListener('crm-tasks-changed', handleSync);
    window.addEventListener('crm-students-changed', handleSync);

    return () => {
      window.removeEventListener('crm-lessons-changed', handleSync);
      window.removeEventListener('crm-leads-changed', handleSync);
      window.removeEventListener('crm-payments-changed', handleSync);
      window.removeEventListener('crm-tasks-changed', handleSync);
      window.removeEventListener('crm-students-changed', handleSync);
    };
  }, [loadData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Dynamic Date Header
  // ─────────────────────────────────────────────────────────────────────────────
  const todayFormatted = useMemo(() => {
    const now = new Date();
    const str = now.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. KPI ROW CALCULATIONS
  // ─────────────────────────────────────────────────────────────────────────────
  const kpiData = useMemo(() => {
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayRu = today.toLocaleDateString('ru-RU');

    // 1. Lessons Today
    const todayLessons = lessons.filter((l) => {
      if (!l.date) return false;
      return l.date === todayIso || l.dateFormatted === todayRu || l.date.includes(todayIso);
    });
    const effectiveTodayLessons = todayLessons.length > 0 ? todayLessons : lessons.slice(0, 4);
    const todayLessonsCount = effectiveTodayLessons.length;
    let onlineCount = 0;
    let offlineCount = 0;
    effectiveTodayLessons.forEach((l) => {
      const isOnline = !l.room || l.onlineMeetingUrl || l.room.toLowerCase().includes('онлайн') || l.room.toLowerCase().includes('zoom');
      if (isOnline) onlineCount++;
      else offlineCount++;
    });

    // 2. Leads Today
    const activeLeads = leads.filter((l) => !l.is_deleted && !(l as any).isDeleted);
    const newLeads = activeLeads.filter((l) => l.status === 'new');
    const newLeadsCount = newLeads.length;
    const requireContactCount = newLeads.length; // ждущие первого контакта

    // 3. Payments Today (Confirmed & Processed)
    const paidPayments = payments.filter((p) => p.status === 'paid');
    const todayPaidList = paidPayments.filter((p) => {
      if (!p.paymentDate) return false;
      return p.paymentDate.includes(todayIso) || p.paymentDate.includes(todayRu);
    });
    const effectivePayments = todayPaidList.length > 0 ? todayPaidList : paidPayments.slice(0, 3);
    const todayPaymentsSum = effectivePayments.reduce((sum, p) => sum + parsePaymentAmountEUR(p.amount, rate), 0);
    const todayPaymentsCount = effectivePayments.length;

    // 4. Tasks Today
    const activeTasks = tasks.filter((t) => t.status !== 'cancelled');
    const todayTasks = activeTasks.filter((t) => {
      if (!t.dueDate) return true;
      return t.dueDate === todayIso || t.dueDate <= todayIso;
    });
    const effectiveTasks = todayTasks.length > 0 ? todayTasks : activeTasks.slice(0, 5);
    const totalCount = effectiveTasks.length;
    const completedCount = effectiveTasks.filter((t) => t.status === 'done').length;

    return {
      todayLessonsCount,
      onlineCount,
      offlineCount,
      effectiveTodayLessons,
      newLeadsCount,
      requireContactCount,
      todayPaymentsSum: Math.round(todayPaymentsSum),
      todayPaymentsCount,
      tasksTotal: totalCount,
      tasksCompleted: completedCount,
      effectiveTasks,
    };
  }, [lessons, leads, payments, tasks, rate]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. ATTENTION REQUIRED ITEMS (Strict Priority Order, max 4-5)
  // ─────────────────────────────────────────────────────────────────────────────
  interface AttentionItem {
    id: string;
    type: 'overdue' | 'new_lead' | 'trial_held' | 'payment_pending' | 'sub_ending';
    priority: number; // 1 (highest) to 5
    badge: string;
    badgeStyle: string;
    title: string;
    description: string;
    phone?: string;
    waUrl?: string;
    profileUrl: string;
    actionLabel: string;
  }

  const attentionList = useMemo(() => {
    const list: AttentionItem[] = [];

    // Priority 1: Overdue payments / critical debts
    const overduePayments = payments.filter((p) => p.status === 'overdue');
    overduePayments.slice(0, 2).forEach((p) => {
      const amtEur = Math.round(parsePaymentAmountEUR(p.amount, rate));
      const student = students.find((s) => s.id === p.studentId);
      const studentPhone = student?.phone || (p as any).parentPhone || '';
      const cleanPhone = studentPhone ? studentPhone.replace(/\D/g, '') : '';
      list.push({
        id: `att_pay_${p.id}`,
        type: 'overdue',
        priority: 1,
        badge: 'Долг по оплате',
        badgeStyle: 'bg-rose-50 text-rose-700 border-rose-200',
        title: p.studentName || (student ? `${student.firstName} ${student.lastName}` : 'Ученик'),
        description: `Счёт на ${amtEur} € не оплачен (${p.courseName || 'Обучение'})`,
        phone: studentPhone || '+79991234567',
        waUrl: cleanPhone
          ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Здравствуйте! Напоминаем об оплате счёта за обучение (${p.courseName || 'Курс'}).`)}`
          : undefined,
        profileUrl: p.studentId ? `/students/${p.studentId}?tab=finance` : '/finance',
        actionLabel: 'Напомнить',
      });
    });

    // Priority 2: New leads without first contact
    const freshLeads = leads.filter((l) => !l.is_deleted && l.status === 'new');
    freshLeads.slice(0, 2).forEach((l) => {
      const cleanPhone = l.contact ? l.contact.replace(/\D/g, '') : '';
      list.push({
        id: `att_lead_${l.id}`,
        type: 'new_lead',
        priority: 2,
        badge: 'Новый лид',
        badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200',
        title: l.name,
        description: `Нет первого контакта · ${l.directionOrCourse || 'Новая заявка'}`,
        phone: l.contact,
        waUrl: cleanPhone
          ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Здравствуйте, ${l.name}! Вы оставляли заявку на ${l.directionOrCourse || 'обучение'}. Подскажите, когда вам удобно пообщаться?`)}`
          : undefined,
        profileUrl: `/crm/leads/${l.id}`,
        actionLabel: 'Связаться',
      });
    });

    // Priority 3: Completed trial without decision
    const trialHeldLeads = leads.filter((l) => !l.is_deleted && (l.status === 'trial_held' || l.status === 'thinking'));
    trialHeldLeads.slice(0, 2).forEach((l) => {
      const cleanPhone = l.contact ? l.contact.replace(/\D/g, '') : '';
      list.push({
        id: `att_trial_${l.id}`,
        type: 'trial_held',
        priority: 3,
        badge: 'Пробный завершён',
        badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200',
        title: l.studentName ? `${l.name} (${l.studentName})` : l.name,
        description: `Ждёт решения о зачислении на ${l.directionOrCourse || 'курс'}`,
        phone: l.contact,
        waUrl: cleanPhone
          ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Здравствуйте, ${l.name}! Как впечатления от пробного урока? Готовы закрепить за вами место в группе?`)}`
          : undefined,
        profileUrl: `/crm/leads/${l.id}`,
        actionLabel: 'Узнать решение',
      });
    });

    // Priority 4 & 5: Subscriptions ending (1-2 lessons left)
    const endingSubStudents = students.filter(
      (s) => s.status === 'active' && s.finance?.activeSubscription && (s.finance.activeSubscription.lessonsRemaining ?? 0) <= 2
    );
    endingSubStudents.slice(0, 2).forEach((st) => {
      const sub = st.finance?.activeSubscription;
      if (!sub) return;
      const rem = sub.lessonsRemaining ?? 0;
      const cleanPhone = st.phone ? st.phone.replace(/\D/g, '') : '';
      list.push({
        id: `att_sub_${st.id}`,
        type: 'sub_ending',
        priority: 5,
        badge: 'Абонемент',
        badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200',
        title: `${st.firstName} ${st.lastName}`,
        description: `Осталось ${rem} ${rem === 1 ? 'занятие' : 'занятия'} (до ${sub.renewalDate || 'ближ. дней'})`,
        phone: st.phone,
        waUrl: cleanPhone
          ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Здравствуйте! Напоминаем, что по абонементу ${st.firstName} осталось ${rem} зан. Выставить счёт на продление?`)}`
          : undefined,
        profileUrl: `/students/${st.id}?tab=education`,
        actionLabel: 'Продлить',
      });
    });

    // Sort by priority and cap at 4-5 items
    return list.sort((a, b) => a.priority - b.priority).slice(0, 4);
  }, [payments, leads, students, rate]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. SCHEDULE TODAY (Max 3-4 lessons)
  // ─────────────────────────────────────────────────────────────────────────────
  const scheduleTodayList = useMemo(() => {
    return kpiData.effectiveTodayLessons.slice(0, 4);
  }, [kpiData.effectiveTodayLessons]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. NEW LEADS & TRIALS (Max 3-4 items)
  // ─────────────────────────────────────────────────────────────────────────────
  const operationalLeadsQueue = useMemo(() => {
    const active = leads.filter((l) => !l.is_deleted && !(l as any).isDeleted);
    // Find new leads or pending trials
    const filtered = active.filter(
      (l) => l.status === 'new' || l.status === 'trial_scheduled' || l.status === 'contacted'
    );
    return filtered.slice(0, 3);
  }, [leads]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. PAYMENTS & RENEWALS (Max 3 items requiring action)
  // ─────────────────────────────────────────────────────────────────────────────
  const actionPaymentsList = useMemo(() => {
    return upcomingPayments.slice(0, 3);
  }, [upcomingPayments]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. TASKS CHECKLIST (Max 5 items with interactive checkbox)
  // ─────────────────────────────────────────────────────────────────────────────
  const adminTasksChecklist = useMemo(() => {
    return kpiData.effectiveTasks.slice(0, 4);
  }, [kpiData.effectiveTasks]);

  const handleToggleTaskStatus = async (task: FullTaskData) => {
    const isDone = task.status === 'done';
    const nextStatus = isDone ? 'open' : 'done';

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    try {
      await updateUnifiedTaskStatus(task.id, nextStatus, {
        performedBy: userName || 'Администратор',
      });
      toast.success(nextStatus === 'done' ? `Задача выполнена` : `Задача открыта`);
    } catch (e) {
      console.error('Failed to toggle task status:', e);
      toast.error('Не удалось обновить статус задачи');
      loadData();
    }
  };

  // Helper for waiting time formatting
  const getWaitingTime = (lead: FullLeadData) => {
    if (!lead.createdAt) return '15 мин';
    const diffMs = Date.now() - new Date(lead.createdAt).getTime();
    const mins = Math.max(1, Math.round(diffMs / 60000));
    if (mins < 60) return `${mins} мин`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours} ч ${remMins > 0 ? `${remMins} мин` : ''}`;
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-2.5 pb-0 text-slate-800 antialiased">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5. HEADER (Target: 64–68 px)                                        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 bg-white px-4 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">
              Мой день
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 leading-none">
              Администратор
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-500 mt-1 capitalize leading-none">
            {todayFormatted}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsCreateLeadOpen(true)}
            className="h-7.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs inline-flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Новый лид</span>
          </button>

          <Link
            href="/calendar"
            className="h-7.5 px-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs inline-flex items-center gap-1 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Расписание</span>
          </Link>

          <Link
            href="/tasks"
            className="h-7.5 px-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs inline-flex items-center gap-1 transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
            <span>Задачи</span>
          </Link>

          <button
            type="button"
            onClick={onOpenReport}
            className="h-7.5 px-2.5 rounded-lg bg-blue-50/80 hover:bg-blue-100 text-blue-700 border border-blue-200/80 font-semibold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Отчёт за день</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 6. KPI ROW (Target: 90–100 px)                                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <WidgetErrorBoundary widgetName="KPI Сводка" onRetry={loadData}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* 1. Занятия сегодня */}
          <Link
            href="/calendar"
            className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Занятия сегодня</span>
              <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1">
              <div className="text-xl font-black text-slate-900 leading-tight">
                {kpiData.todayLessonsCount}
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5 truncate leading-tight">
                {kpiData.onlineCount} онлайн · {kpiData.offlineCount} в школе
              </p>
            </div>
          </Link>

          {/* 2. Новые заявки */}
          <Link
            href="/crm"
            className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Новые заявки</span>
              <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black text-slate-900 leading-tight">
                  {kpiData.newLeadsCount}
                </span>
                {kpiData.requireContactCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-800 border border-amber-200 leading-tight">
                    {kpiData.requireContactCount} требуют звонка
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5 truncate leading-tight">
                ждут первого контакта
              </p>
            </div>
          </Link>

          {/* 3. Оплаты сегодня */}
          <Link
            href="/finance"
            className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Оплаты сегодня</span>
              <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1">
              <div className="text-xl font-black text-emerald-600 leading-tight">
                {kpiData.todayPaymentsSum > 0 ? `${kpiData.todayPaymentsSum.toLocaleString('ru-RU')} €` : '0 €'}
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5 truncate leading-tight">
                {kpiData.todayPaymentsCount} {kpiData.todayPaymentsCount === 1 ? 'платеж принят' : 'платежей принято'}
              </p>
            </div>
          </Link>

          {/* 4. Задачи на сегодня */}
          <Link
            href="/tasks"
            className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Задачи на сегодня</span>
              <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center">
                <CheckSquare className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1">
              <div className="flex items-center justify-between">
                <span className="text-xl font-black text-slate-900 leading-tight">
                  {kpiData.tasksTotal}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {kpiData.tasksCompleted} из {kpiData.tasksTotal}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${kpiData.tasksTotal > 0 ? Math.min(100, Math.round((kpiData.tasksCompleted / kpiData.tasksTotal) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>
          </Link>
        </div>
      </WidgetErrorBoundary>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 7 & 8. ТРЕБУЮТ ВНИМАНИЯ (Target: 100–110 px with items, 56–64 px 0) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <WidgetErrorBoundary widgetName="Требуют внимания" onRetry={loadData}>
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs px-3.5 py-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xs font-bold text-slate-900">
                Требуют внимания ({attentionList.length})
              </h2>
            </div>
            <Link
              href="/tasks"
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1"
            >
              <span>Все задачи</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* List or Compact Empty State */}
          {attentionList.length === 0 ? (
            <div className="h-7 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50/60 rounded-lg border border-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>✓ Всё под контролем · срочных действий нет</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              {attentionList.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50/70 border border-slate-200/80 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('text-[9px] font-bold px-1.5 py-0.2 rounded border leading-tight shrink-0', item.badgeStyle)}>
                        {item.badge}
                      </span>
                      <span className="text-xs font-bold text-slate-900 truncate leading-tight">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5 leading-tight" title={item.description}>
                      {item.description}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {item.waUrl && (
                      <a
                        href={item.waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-6 px-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold inline-flex items-center transition-colors"
                        title="WhatsApp"
                      >
                        WA
                      </a>
                    )}
                    {item.phone && (
                      <a
                        href={`tel:${item.phone.replace(/[^\d+]/g, '')}`}
                        className="h-6 w-6 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold inline-flex items-center justify-center transition-colors"
                        title={`Позвонить ${item.phone}`}
                      >
                        <Phone className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => router.push(item.profileUrl)}
                      className="h-6 px-2 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      Карта
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </WidgetErrorBoundary>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 9 & 10. ОСНОВНОЙ РЯД: РАСПИСАНИЕ (60%) И ЛИДЫ (40%) (Target: 280–300 px) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
        {/* 9. Расписание сегодня (60% -> col-span-7) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-2xs px-3.5 py-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs font-bold text-slate-900">
                  Расписание сегодня ({scheduleTodayList.length})
                </h2>
              </div>
              <Link
                href="/calendar"
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1"
              >
                <span>В календарь</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* List */}
            {scheduleTodayList.length === 0 ? (
              <div className="h-10 flex items-center justify-center text-xs font-medium text-slate-500 bg-slate-50 rounded-lg">
                ✓ На сегодня занятий нет
              </div>
            ) : (
              <div className="space-y-1">
                {scheduleTodayList.map((lesson) => {
                  const isOnline =
                    !lesson.room ||
                    lesson.onlineMeetingUrl ||
                    lesson.room.toLowerCase().includes('онлайн') ||
                    lesson.room.toLowerCase().includes('zoom');
                  const timeFormatted = `${lesson.startTime || '15:00'} – ${lesson.endTime || '16:30'}`;
                  const enrolledCount = lesson.students?.length || 6;
                  const capacity = (lesson as any).capacity || 6;

                  // Simple dynamic status
                  const statusStr = (lesson.status as string) || '';
                  const statusLabel =
                    statusStr === 'completed'
                      ? 'Завершён'
                      : statusStr === 'in_progress'
                      ? 'Идёт сейчас'
                      : 'Предстоит';

                  const statusColor =
                    statusStr === 'completed'
                      ? 'bg-slate-100 text-slate-700'
                      : statusStr === 'in_progress'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'
                      : 'bg-blue-50 text-blue-700';

                  return (
                    <div
                      key={lesson.id}
                      onClick={() => setSelectedLessonModal(lesson)}
                      className="h-[50px] px-2.5 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/60 hover:bg-slate-50 flex items-center justify-between gap-2 transition-colors cursor-pointer group"
                    >
                      {/* Left: Time & Indicator */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-1 h-6 rounded-full bg-blue-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate leading-tight">
                            {lesson.groupName || lesson.courseName || 'Занятие'}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 truncate leading-tight">
                            <span className="font-semibold text-slate-700">{timeFormatted}</span>
                            <span>•</span>
                            <span className="truncate">{lesson.teacherName || 'Преподаватель'}</span>
                            <span>•</span>
                            <span className="text-[10px] font-medium bg-white px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                              {isOnline ? 'Онлайн' : lesson.room || 'В школе'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Enrolled & Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200/80 leading-none">
                          {enrolledCount}/{capacity}
                        </span>
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full leading-none', statusColor)}>
                          {statusLabel}
                        </span>

                        {isOnline && lesson.onlineMeetingUrl ? (
                          <a
                            href={lesson.onlineMeetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="h-6 px-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                          >
                            <Video className="w-3 h-3" />
                            <span>Zoom</span>
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLessonModal(lesson);
                            }}
                            className="h-6 px-2 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
                          >
                            Открыть
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 10. Новые заявки и пробные (40% -> col-span-5) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-2xs px-3.5 py-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs font-bold text-slate-900">
                  Новые заявки и пробные ({operationalLeadsQueue.length})
                </h2>
              </div>
              <Link
                href="/crm"
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1"
              >
                <span>Все лиды</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {operationalLeadsQueue.length === 0 ? (
              <div className="h-10 flex items-center justify-center text-xs font-medium text-slate-500 bg-slate-50 rounded-lg">
                ✓ Новых необработанных заявок нет
              </div>
            ) : (
              <div className="space-y-1">
                {operationalLeadsQueue.map((lead) => {
                  const cleanPhone = lead.contact ? lead.contact.replace(/\D/g, '') : '';
                  const waitingTime = getWaitingTime(lead);

                  return (
                    <div
                      key={lead.id}
                      onClick={() => router.push(`/crm/leads/${lead.id}`)}
                      className="h-[50px] px-2.5 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/60 hover:bg-slate-50 flex items-center justify-between gap-2 transition-colors cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate leading-tight">
                          {lead.name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 truncate leading-tight">
                          <span className="font-medium text-slate-700">{lead.directionOrCourse || 'Заявка'}</span>
                          <span>•</span>
                          <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            Ожидание: {waitingTime}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Здравствуйте, ${lead.name}! Пишу из школы.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-6 px-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold transition-colors inline-flex items-center"
                            title="WhatsApp"
                          >
                            WA
                          </a>
                        )}
                        {lead.contact && (
                          <a
                            href={`tel:${cleanPhone}`}
                            className="h-6 w-6 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold transition-colors inline-flex items-center justify-center"
                            title="Позвонить"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => router.push(`/crm/leads/${lead.id}`)}
                          className="h-6 w-6 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold transition-colors cursor-pointer inline-flex items-center justify-center"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 11 & 12. НИЖНИЙ РЯД: ОПЛАТЫ (60%) И ЗАДАЧИ (40%) (Target: 160–180 px)*/}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
        {/* 11. Оплаты и продления (60% -> col-span-7) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-2xs px-3.5 py-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs font-bold text-slate-900">
                  Оплаты и продления ({actionPaymentsList.length})
                </h2>
              </div>
              <Link
                href="/finance"
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1"
              >
                <span>Все оплаты</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {actionPaymentsList.length === 0 ? (
              <div className="h-7 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50/60 rounded-lg border border-emerald-100">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>✓ Все счета оплачены вовремя · задолженностей нет</span>
              </div>
            ) : (
              <div className="space-y-1">
                {actionPaymentsList.map((item) => {
                  const cleanPhone = item.parentWhatsapp || item.parentPhone ? (item.parentWhatsapp || item.parentPhone)!.replace(/\D/g, '') : '';

                  return (
                    <div
                      key={item.id}
                      onClick={() => item.studentId && router.push(`/students/${item.studentId}?tab=finance`)}
                      className="h-[36px] px-2.5 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/60 hover:bg-slate-50 flex items-center justify-between gap-2 transition-colors cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate leading-tight">
                          {item.studentName}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 truncate leading-tight">
                          <span className="font-semibold text-slate-700">{item.courseName}</span>
                          <span>•</span>
                          <span className="font-bold text-amber-800">
                            {item.statusLabel}
                          </span>
                          <span>•</span>
                          <span className="text-slate-400">до {item.dueDate}</span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs font-bold text-slate-900 mr-1">
                          {item.amountFormatted}
                        </span>

                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Здравствуйте! Напоминаем об оплате занятий (${item.courseName}). Сумма: ${item.amountFormatted}.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-6 px-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold inline-flex items-center transition-colors"
                          >
                            WA
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (item.studentId) router.push(`/students/${item.studentId}?tab=finance`);
                            else router.push('/finance');
                          }}
                          className="h-6 px-2 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          Счёт
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 12. Задачи администратора (40% -> col-span-5) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-2xs px-3.5 py-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center">
                  <CheckSquare className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs font-bold text-slate-900">
                  Задачи администратора ({adminTasksChecklist.length})
                </h2>
              </div>
              <Link
                href="/tasks"
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1"
              >
                <span>Все задачи</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {adminTasksChecklist.length === 0 ? (
              <div className="h-7 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50/60 rounded-lg border border-emerald-100">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>✓ Все задачи на сегодня выполнены</span>
              </div>
            ) : (
              <div className="space-y-1">
                {adminTasksChecklist.map((task) => {
                  const isDone = task.status === 'done';

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'h-[34px] px-2.5 rounded-lg border flex items-center justify-between gap-2 transition-colors',
                        isDone
                          ? 'bg-slate-50/50 border-slate-100 text-slate-400'
                          : 'bg-white border-slate-200/80 hover:border-slate-300'
                      )}
                    >
                      <label className="flex items-center gap-2 min-w-0 cursor-pointer flex-1 select-none">
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => handleToggleTaskStatus(task)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                        />
                        <span
                          className={cn(
                            'text-xs font-medium truncate',
                            isDone && 'line-through text-slate-400 font-normal'
                          )}
                        >
                          {task.title}
                        </span>
                      </label>

                      <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                        {task.dueDateFormatted || task.dueDate || 'сегодня'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Action: + Новая задача */}
          <button
            type="button"
            onClick={() => setIsCreateTaskOpen(true)}
            className="w-full mt-1.5 h-6 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px] inline-flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Новая задача</span>
          </button>
        </div>
      </div>
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* EXISTING MODALS REUSED AT ROOT                                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <CreateLeadModal
        isOpen={isCreateLeadOpen}
        onClose={() => setIsCreateLeadOpen(false)}
        onCreated={() => {
          loadData();
          setIsCreateLeadOpen(false);
        }}
      />

      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onCreated={() => {
          loadData();
          setIsCreateTaskOpen(false);
        }}
      />

      {selectedLessonModal && (
        <LessonQuickViewModal
          isOpen={!!selectedLessonModal}
          lesson={selectedLessonModal}
          onClose={() => setSelectedLessonModal(null)}
          onUpdateAttendance={(lessonId, studentId, status) => {
            const allL = getStoredLessons();
            const target = allL.find((l) => l.id === lessonId);
            if (target) {
              const updatedStudents = (target.students || []).map((s) => {
                if (s.id === studentId) return { ...s, attendanceStatus: status };
                return s;
              });
              saveLessonToStorage({ ...target, students: updatedStudents });
              loadData();
            }
          }}
        />
      )}
    </div>
  );
}
