'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  CreditCard,
  CheckSquare,
  Phone,
  Clock,
  Plus,
  FileText,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  MessageSquare,
  Send,
  CalendarClock,
  Check,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';

// Cockpit SSOT & Priority Engine
import { useCockpitSSOT } from '../hooks/useCockpitSSOT';
import {
  CockpitActionItem,
  sanitizePhoneForWhatsApp,
  sanitizeTelegramUsername
} from '../lib/cockpitPriorityEngine';

// Drawer & Modals
import { CockpitSlideOverDrawer } from './CockpitSlideOverDrawer';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { RecordPaymentModal } from '@/components/finance/RecordPaymentModal';
import { LessonQuickViewModal } from '@/components/calendar/LessonQuickViewModal';
import { FullLessonData } from '@/lib/data/mockData';

interface AdminDashboardViewProps {
  onOpenReport: () => void;
}

export function AdminDashboardView({ onOpenReport }: AdminDashboardViewProps) {
  const router = useRouter();
  const toast = useToast();
  const { userName } = useRole();

  // SSOT Data & Actions
  const {
    isLoading,
    aggregated,
    activeDrawerItem,
    setActiveDrawerItem,
    completeTask,
    postponeTask,
    refreshData,
    raw,
  } = useCockpitSSOT();

  // Modals state
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [paymentModalItem, setPaymentModalItem] = useState<CockpitActionItem | null>(null);
  const [selectedLessonModal, setSelectedLessonModal] = useState<FullLessonData | null>(null);
  const [activeQueueFilter, setActiveQueueFilter] = useState<'all' | 'attention' | 'today' | 'payments'>('all');

  // Dynamic Current Date in Russian (e.g., "Вторник, 6 октября 2026")
  const formattedToday = useMemo(() => {
    const now = new Date();
    const str = now.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, []);

  // Complete task handler
  const handleComplete = async (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await completeTask(taskId);
      toast.success('Задача выполнена');
    } catch {
      toast.error('Не удалось обновить задачу');
    }
  };

  // Postpone task handler
  const handlePostpone = async (taskId: string, dateIso: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await postponeTask(taskId, dateIso);
      toast.info(`Задача перенесена на ${dateIso}`);
    } catch {
      toast.error('Не удалось перенести задачу');
    }
  };

  // Open Lesson in modal
  const handleOpenLessonModal = (lessonId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const lesson = raw.lessons.find((l) => l.id === lessonId);
    if (lesson) {
      setSelectedLessonModal(lesson);
    } else {
      router.push('/calendar');
    }
  };

  // Filter queues if KPI card is active
  const displayedAttention = useMemo(() => {
    if (activeQueueFilter === 'today') return [];
    return aggregated.attentionItems;
  }, [aggregated.attentionItems, activeQueueFilter]);

  const displayedToday = useMemo(() => {
    if (activeQueueFilter === 'attention') return [];
    return aggregated.todayItems;
  }, [aggregated.todayItems, activeQueueFilter]);

  const displayedPostponable = useMemo(() => {
    if (activeQueueFilter === 'attention') return [];
    return aggregated.postponableItems;
  }, [aggregated.postponableItems, activeQueueFilter]);

  return (
    <div className="w-full max-w-[1440px] mx-auto space-y-6 pb-12">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Мой день</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Администратор · {userName || 'Елена Волкова'}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1 capitalize">{formattedToday}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsCreateTaskOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Новая задача
          </button>

          <button
            type="button"
            onClick={onOpenReport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 shadow-xs transition-colors"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            Отчёт за день
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. OPERATIONAL SUMMARY KPI (4 CARDS)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 🔴 Card 1: Требуют внимания */}
        <button
          type="button"
          onClick={() => setActiveQueueFilter((prev) => (prev === 'attention' ? 'all' : 'attention'))}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all relative overflow-hidden group',
            activeQueueFilter === 'attention'
              ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-400/40 shadow-sm'
              : 'bg-white hover:bg-rose-50/40 border-slate-200/80 hover:border-rose-200 shadow-xs'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Критично</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {aggregated.summary.attentionCount}
            </span>
            <span className="text-xs font-medium text-slate-500">ситуаций</span>
          </div>
          <p className="text-xs font-semibold text-rose-700 mt-1 truncate">
            {aggregated.summary.attentionCount > 0 ? 'Требуют внимания сейчас' : 'Все под контролем'}
          </p>
        </button>

        {/* 🟡 Card 2: На сегодня */}
        <button
          type="button"
          onClick={() => setActiveQueueFilter((prev) => (prev === 'today' ? 'all' : 'today'))}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all relative overflow-hidden group',
            activeQueueFilter === 'today'
              ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/40 shadow-sm'
              : 'bg-white hover:bg-amber-50/40 border-slate-200/80 hover:border-amber-200 shadow-xs'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Сегодня</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {aggregated.summary.todayTasksCount}
            </span>
            <span className="text-xs font-medium text-slate-500">задач</span>
          </div>
          <p className="text-xs font-semibold text-amber-700 mt-1 truncate">
            {aggregated.summary.todayTasksCount > 0 ? 'Нужно сделать сегодня' : 'Задачи выполнены'}
          </p>
        </button>

        {/* 🔵 Card 3: Занятия сегодня */}
        <Link
          href="/calendar"
          className="p-4 rounded-2xl border text-left transition-all relative overflow-hidden group bg-white hover:bg-blue-50/40 border-slate-200/80 hover:border-blue-200 shadow-xs block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Расписание</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {aggregated.summary.todayLessonsCount}
            </span>
            <span className="text-xs font-medium text-slate-500">уроков</span>
          </div>
          <p className="text-xs font-semibold text-blue-700 mt-1 truncate">
            Занятия в школе сегодня →
          </p>
        </Link>

        {/* 🟢 Card 4: Оплаты к контролю */}
        <button
          type="button"
          onClick={() => router.push('/finance')}
          className="p-4 rounded-2xl border text-left transition-all relative overflow-hidden group bg-white hover:bg-emerald-50/40 border-slate-200/80 hover:border-emerald-200 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Финансы</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">
              {aggregated.summary.paymentsToControlCount}
            </span>
            <span className="text-xs font-medium text-slate-500">счетов</span>
          </div>
          <p className="text-xs font-semibold text-emerald-700 mt-1 truncate">
            {aggregated.summary.paymentsToControlTotalEur > 0
              ? `К контролю: ${aggregated.summary.paymentsToControlFormatted}`
              : 'Все счета оплачены'}
          </p>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN OPERATIONAL DESK (3 QUEUES)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): P0/P1 Attention + P2 Today */}
        <div className="lg:col-span-8 space-y-6">
          {/* 🔴 BLOCK 1: ТРЕБУЮТ ВНИМАНИЯ СЕЙЧАС (P0 / P1) */}
          <div className="bg-white rounded-2xl border border-rose-200/80 shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-rose-50/70 border-b border-rose-200/60">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                <h2 className="text-sm font-bold text-rose-900 uppercase tracking-wider">
                  Требуют внимания сейчас
                </h2>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-200/80 text-rose-800">
                  {displayedAttention.length}
                </span>
              </div>
              <span className="text-xs text-rose-700 font-medium">Приоритет P0 / P1</span>
            </div>

            <div className="p-4 space-y-3">
              {displayedAttention.length === 0 ? (
                <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  <p className="text-sm font-bold text-slate-700">✓ Сейчас всё под контролем</p>
                  <p className="text-xs text-slate-500 mt-1">Критических ситуаций и срочных долгов перед уроками нет.</p>
                </div>
              ) : (
                displayedAttention.map((item) => {
                  const rawPhone = item.parentPhone || item.leadPhone;
                  const cleanPhone = sanitizePhoneForWhatsApp(rawPhone);
                  const tgHandle = sanitizeTelegramUsername(item.leadTelegram);

                  return (
                    <div
                      key={item.id}
                      onClick={() => setActiveDrawerItem(item)}
                      className="p-4 rounded-xl border border-rose-100 bg-rose-50/20 hover:bg-rose-50/50 hover:border-rose-300 transition-all cursor-pointer group shadow-2xs"
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.urgencyLabel && (
                            <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-rose-100 text-rose-800 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-rose-600" />
                              {item.urgencyLabel}
                            </span>
                          )}
                          {item.badgeText && (
                            <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-white border border-rose-200 text-rose-700">
                              {item.badgeText}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-500 font-medium">
                            {item.category}
                          </span>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>

                      {/* Title & Subtitle */}
                      <div className="mt-2.5">
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-rose-700 transition-colors">
                          {item.title}
                        </h3>
                        {item.subtitle && (
                          <p className="text-xs text-slate-600 mt-0.5">{item.subtitle}</p>
                        )}
                      </div>

                      {/* Inline Action Buttons matching reference */}
                      <div
                        className="mt-3.5 pt-2.5 border-t border-rose-100 flex items-center gap-2 flex-wrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 transition-colors"
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-600" />
                            WhatsApp
                          </a>
                        )}

                        {tgHandle && (
                          <a
                            href={`https://t.me/${tgHandle}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200/80 transition-colors"
                          >
                            <Send className="w-3 h-3 text-sky-500" />
                            Telegram
                          </a>
                        )}

                        {rawPhone && (
                          <a
                            href={`tel:${cleanPhone}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                          >
                            <Phone className="w-3 h-3 text-slate-600" />
                            Позвонить
                          </a>
                        )}

                        {item.debtAmount !== undefined && (
                          <button
                            type="button"
                            onClick={() => setPaymentModalItem(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition-colors"
                          >
                            <CreditCard className="w-3 h-3" />
                            Принять оплату
                          </button>
                        )}

                        {item.leadId && (
                          <Link
                            href={`/crm/leads/${item.leadId}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                          >
                            Открыть лид <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}

                        {item.lessonId && (
                          <button
                            type="button"
                            onClick={(e) => handleOpenLessonModal(item.lessonId!, e)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                          >
                            Открыть занятие <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 🟡 BLOCK 2: НУЖНО СДЕЛАТЬ СЕГОДНЯ (P2) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-amber-50/60 border-b border-amber-200/60">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <h2 className="text-sm font-bold text-amber-950 uppercase tracking-wider">
                  Нужно сделать сегодня
                </h2>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-200/80 text-amber-900">
                  {displayedToday.length}
                </span>
              </div>
              <span className="text-xs text-amber-800 font-medium">Чеклист задач P2</span>
            </div>

            <div className="p-4 space-y-2">
              {displayedToday.length === 0 ? (
                <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  <p className="text-sm font-bold text-slate-700">✓ Все задачи на сегодня закрыты</p>
                  <p className="text-xs text-slate-500 mt-1">Отличная работа! Можно заняться развитием или отдохнуть.</p>
                </div>
              ) : (
                displayedToday.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => setActiveDrawerItem(task)}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 hover:border-amber-200 bg-white hover:bg-amber-50/20 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Interactive completion checkbox */}
                      <button
                        type="button"
                        onClick={(e) => handleComplete(task.sourceId, e)}
                        className="w-5 h-5 rounded-md border border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 flex items-center justify-center transition-colors shrink-0 group-hover:border-slate-400"
                        title="Отметить выполненным"
                      >
                        <Check className="w-3.5 h-3.5 text-transparent hover:text-emerald-600" />
                      </button>

                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-slate-900 group-hover:text-amber-900 transition-colors truncate block">
                          {task.title}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="px-1.5 py-0.2 text-[10px] font-medium rounded-sm bg-slate-100 text-slate-600">
                            {task.category}
                          </span>
                          {task.urgencyLabel && (
                            <span className="text-[11px] text-amber-700 font-medium">
                              {task.urgencyLabel}
                            </span>
                          )}
                          {task.subtitle && (
                            <span className="text-[11px] text-slate-400 truncate">
                              · {task.subtitle}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): P3 Postponable Tasks */}
        <div className="lg:col-span-4 space-y-6">
          {/* 🔵 BLOCK 3: МОЖНО ПЕРЕНЕСТИ (P3) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Можно перенести
                </h2>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-200 text-slate-700">
                  {displayedPostponable.length}
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium">P3</span>
            </div>

            <div className="p-4 space-y-3">
              {displayedPostponable.length === 0 ? (
                <div className="p-6 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs font-semibold text-slate-600">Нет переносимых задач</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Все текущие задачи привязаны к жестким срокам.</p>
                </div>
              ) : (
                displayedPostponable.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => setActiveDrawerItem(task)}
                    className="p-3 rounded-xl border border-slate-100 hover:border-slate-300 bg-slate-50/40 hover:bg-white transition-all cursor-pointer group space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors block truncate">
                          {task.title}
                        </span>
                        {task.subtitle && (
                          <span className="text-[11px] text-slate-500 truncate block mt-0.5">
                            {task.subtitle}
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    </div>

                    {/* 1-Click Postpone actions */}
                    {task.postponeDates && (
                      <div
                        className="flex items-center gap-1.5 pt-1 border-t border-slate-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {task.postponeDates.map((p) => (
                          <button
                            key={p.dateIso}
                            type="button"
                            onClick={(e) => handlePostpone(task.sourceId, p.dateIso, e)}
                            className="px-2 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 text-[11px] font-semibold text-slate-600 rounded-md border border-slate-200 transition-colors shadow-2xs"
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. SLIDE-OVER DRAWER (440px)
      ───────────────────────────────────────────────────────────── */}
      <CockpitSlideOverDrawer
        item={activeDrawerItem}
        onClose={() => setActiveDrawerItem(null)}
        onComplete={(id) => handleComplete(id)}
        onPostpone={(id, dateIso) => handlePostpone(id, dateIso)}
        onRecordPayment={(item) => {
          setActiveDrawerItem(null);
          setPaymentModalItem(item);
        }}
        onViewLesson={(lessonId) => {
          setActiveDrawerItem(null);
          handleOpenLessonModal(lessonId);
        }}
      />

      {/* ─────────────────────────────────────────────────────────────
          5. INTEGRATED MODALS
      ───────────────────────────────────────────────────────────── */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onCreated={() => {
          setIsCreateTaskOpen(false);
          refreshData();
          toast.success('Задача создана');
        }}
      />

      {paymentModalItem && (
        <RecordPaymentModal
          isOpen={Boolean(paymentModalItem)}
          onClose={() => setPaymentModalItem(null)}
          initialStudentId={paymentModalItem.studentId}
          initialParentId={paymentModalItem.parentId}
          onRecorded={() => {
            setPaymentModalItem(null);
            refreshData();
            toast.success('Оплата зафиксирована, задолженность погашена');
          }}
        />
      )}

      {selectedLessonModal && (
        <LessonQuickViewModal
          isOpen={Boolean(selectedLessonModal)}
          lesson={selectedLessonModal}
          onClose={() => setSelectedLessonModal(null)}
          onUpdateAttendance={() => {
            refreshData();
          }}
        />
      )}
    </div>
  );
}
