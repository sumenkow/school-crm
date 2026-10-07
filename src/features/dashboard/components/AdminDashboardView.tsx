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
  ChevronDown,
  ChevronLeft,
  MessageSquare,
  Send,
  CalendarClock,
  Check,
  RotateCcw,
  Users,
  GraduationCap,
  UserCheck,
  MoreHorizontal,
  ArrowUpDown,
  Filter,
  Sparkles,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';

// Cockpit SSOT & Priority Engine
import { useCockpitSSOT } from '../hooks/useCockpitSSOT';
import {
  CockpitActionItem,
  CockpitTabFilter,
  CockpitSortMode,
  filterCockpitItems,
  sortCockpitItems,
  sanitizePhoneForWhatsApp,
  sanitizeTelegramUsername,
  formatEurAmount,
  isTodayDate,
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

  // SSOT Data & Actions from Hook
  const {
    isLoading,
    aggregated,
    selectedDate,
    setSelectedDate,
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

  // Filter tab & sort mode
  const [activeTab, setActiveTab] = useState<CockpitTabFilter>('all');
  const [sortMode, setSortMode] = useState<CockpitSortMode>('priority');

  // Collapsible accordions state (R3)
  const [isOverdueOpen, setIsOverdueOpen] = useState(true);
  const [isAttentionOpen, setIsAttentionOpen] = useState(true);
  const [isTodayOpen, setIsTodayOpen] = useState(true);
  const [isPostponableOpen, setIsPostponableOpen] = useState(false);

  // Dynamic Current Date in Russian
  const formattedSelectedDate = useMemo(() => {
    const str = selectedDate.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, [selectedDate]);

  const isCurrentToday = useMemo(() => {
    const now = new Date();
    return (
      selectedDate.getDate() === now.getDate() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getFullYear() === now.getFullYear()
    );
  }, [selectedDate]);

  // Date Stepper Handlers (R1)
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const handleTodayClick = () => {
    setSelectedDate(new Date());
  };

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

  // ─────────────────────────────────────────────────────────────
  // FILTERED & SORTED QUEUES (R2 & R3)
  // ─────────────────────────────────────────────────────────────

  // Block 1: Overdue items
  const filteredOverdue = useMemo(() => {
    if (activeTab === 'attention' || activeTab === 'today') return [];
    const items =
      activeTab === 'all' || activeTab === 'overdue'
        ? aggregated.overdueItems
        : filterCockpitItems(aggregated.overdueItems, activeTab);
    return sortCockpitItems(items, sortMode);
  }, [aggregated.overdueItems, activeTab, sortMode]);

  // Block 2: Needs attention items
  const filteredAttention = useMemo(() => {
    if (activeTab === 'overdue' || activeTab === 'today') return [];
    const items =
      activeTab === 'all' || activeTab === 'attention'
        ? aggregated.needsAttentionItems
        : filterCockpitItems(aggregated.needsAttentionItems, activeTab);
    return sortCockpitItems(items, sortMode);
  }, [aggregated.needsAttentionItems, activeTab, sortMode]);

  // Block 3: Today checklist items
  const filteredToday = useMemo(() => {
    if (activeTab === 'overdue' || activeTab === 'attention') return [];
    const items =
      activeTab === 'all' || activeTab === 'today'
        ? aggregated.todayChecklistItems
        : filterCockpitItems(aggregated.todayChecklistItems, activeTab);
    return sortCockpitItems(items, sortMode);
  }, [aggregated.todayChecklistItems, activeTab, sortMode]);

  // Postponable tasks (P3)
  const filteredPostponable = useMemo(() => {
    if (activeTab === 'overdue' || activeTab === 'attention') return [];
    const items =
      activeTab === 'all' || activeTab === 'today'
        ? aggregated.postponableItems
        : filterCockpitItems(aggregated.postponableItems, activeTab);
    return sortCockpitItems(items, sortMode);
  }, [aggregated.postponableItems, activeTab, sortMode]);

  // 9 Filter Tabs definition (R2)
  const filterTabs: { id: CockpitTabFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Все', count: aggregated.tabCounts.all },
    { id: 'overdue', label: 'Просрочено', count: aggregated.tabCounts.overdue },
    { id: 'attention', label: 'Требуют внимания', count: aggregated.tabCounts.attention },
    { id: 'today', label: 'Сегодня', count: aggregated.tabCounts.today },
    { id: 'leads', label: 'Лиды', count: aggregated.tabCounts.leads },
    { id: 'trials', label: 'Пробные', count: aggregated.tabCounts.trials },
    { id: 'payments', label: 'Оплаты', count: aggregated.tabCounts.payments },
    { id: 'lessons', label: 'Уроки', count: aggregated.tabCounts.lessons },
    { id: 'messages', label: 'Сообщения', count: aggregated.tabCounts.messages },
  ];

  return (
    <div className="w-full max-w-[1440px] mx-auto space-y-5 pb-12 min-w-0">
      {/* ─────────────────────────────────────────────────────────────
          1. OPERATIONAL HEADER & CONTROLS (R1)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Мой день</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Администратор · {userName || 'Елена Волкова'}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1 capitalize">{formattedSelectedDate}</p>
        </div>

        {/* Datepicker Stepper & Primary Action CTAs */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Interactive Date Stepper [ < ] [ 📅 Сегодня ] [ > ] */}
          <div className="inline-flex items-center bg-slate-100/90 rounded-xl p-1 border border-slate-200/90 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              title="Предыдущий день"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleTodayClick}
              className={cn(
                'px-3 py-1 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5',
                isCurrentToday
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              )}
              title="Перейти к сегодняшнему дню"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              {isCurrentToday ? 'Сегодня' : 'К сегодняшнему дню'}
            </button>
            <button
              type="button"
              onClick={handleNextDay}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              title="Следующий день"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateTaskOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Новая задача
          </button>

          <button
            type="button"
            onClick={onOpenReport}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            Отчёт за день
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. 5 DYNAMIC KPI CARDS (R1 - STRICT DYNAMIC SSOT & PURE EUR)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 🔴 Card 1: [X] просрочено */}
        <button
          type="button"
          onClick={() => setActiveTab((prev) => (prev === 'overdue' ? 'all' : 'overdue'))}
          className={cn(
            'p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer min-w-0',
            activeTab === 'overdue'
              ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-400/40 shadow-sm'
              : 'bg-white hover:bg-rose-50/30 border-slate-200/80 hover:border-rose-200 shadow-2xs'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider truncate">Просрочено</span>
            <span
              className={cn(
                'w-2.5 h-2.5 rounded-full shrink-0',
                aggregated.summary.overdueCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
              )}
            />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {aggregated.summary.overdueCount}
            </span>
            <span className="text-xs font-medium text-slate-500">ситуаций</span>
          </div>
          <p className="text-[11px] font-semibold text-rose-700 mt-1 truncate">
            {aggregated.summary.overdueCount === 0
              ? 'Просрочек нет · Всё в графике'
              : 'Критические задержки'}
          </p>
        </button>

        {/* 🟠 Card 2: [X] требуют внимания */}
        <button
          type="button"
          onClick={() => setActiveTab((prev) => (prev === 'attention' ? 'all' : 'attention'))}
          className={cn(
            'p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer min-w-0',
            activeTab === 'attention'
              ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/40 shadow-sm'
              : 'bg-white hover:bg-amber-50/30 border-slate-200/80 hover:border-amber-200 shadow-2xs'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider truncate">Внимание</span>
            <span
              className={cn(
                'w-2.5 h-2.5 rounded-full shrink-0',
                aggregated.summary.needsAttentionCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'
              )}
            />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {aggregated.summary.needsAttentionCount}
            </span>
            <span className="text-xs font-medium text-slate-500">ситуаций</span>
          </div>
          <p className="text-[11px] font-semibold text-amber-700 mt-1 truncate">
            {aggregated.summary.needsAttentionCount === 0
              ? 'Все под контролем · Сбоев нет'
              : 'Требуют внимания сейчас'}
          </p>
        </button>

        {/* 🔵 Card 3: [X] задач на сегодня */}
        <button
          type="button"
          onClick={() => setActiveTab((prev) => (prev === 'today' ? 'all' : 'today'))}
          className={cn(
            'p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer min-w-0',
            activeTab === 'today'
              ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-400/40 shadow-sm'
              : 'bg-white hover:bg-blue-50/30 border-slate-200/80 hover:border-blue-200 shadow-2xs'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider truncate">На сегодня</span>
            <span
              className={cn(
                'w-2.5 h-2.5 rounded-full shrink-0',
                aggregated.summary.tasksTodayCount > 0 ? 'bg-blue-500' : 'bg-emerald-500'
              )}
            />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {aggregated.summary.tasksTodayCount}
            </span>
            <span className="text-xs font-medium text-slate-500">задач</span>
          </div>
          <p className="text-[11px] font-semibold text-blue-700 mt-1 truncate">
            {aggregated.summary.tasksTodayCount === 0
              ? 'Все задачи выполнены · План закрыт'
              : 'Нужно сделать сегодня'}
          </p>
        </button>

        {/* 🟣 Card 4: [X] уроков не подтверждены */}
        <button
          type="button"
          onClick={() => setActiveTab((prev) => (prev === 'lessons' ? 'all' : 'lessons'))}
          className={cn(
            'p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer min-w-0',
            activeTab === 'lessons'
              ? 'bg-purple-50/90 border-purple-300 ring-2 ring-purple-400/40 shadow-sm'
              : 'bg-white hover:bg-purple-50/30 border-slate-200/80 hover:border-purple-200 shadow-2xs'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider truncate">Уроки</span>
            <span
              className={cn(
                'w-2.5 h-2.5 rounded-full shrink-0',
                aggregated.summary.lessonsUnconfirmedCount > 0 ? 'bg-purple-500' : 'bg-emerald-500'
              )}
            />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {aggregated.summary.lessonsUnconfirmedCount}
            </span>
            <span className="text-xs font-medium text-slate-500">уроков</span>
          </div>
          <p className="text-[11px] font-semibold text-purple-700 mt-1 truncate">
            {aggregated.summary.lessonsUnconfirmedCount === 0
              ? 'Всё подтверждено · Составы готовы'
              : 'Не подтверждены'}
          </p>
        </button>

        {/* 🟢 Card 5: [X] оплаты под контролем */}
        <button
          type="button"
          onClick={() => setActiveTab((prev) => (prev === 'payments' ? 'all' : 'payments'))}
          className={cn(
            'p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer min-w-0',
            activeTab === 'payments'
              ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-400/40 shadow-sm'
              : 'bg-white hover:bg-emerald-50/30 border-slate-200/80 hover:border-emerald-200 shadow-2xs'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider truncate">Оплаты</span>
            <span
              className={cn(
                'w-2.5 h-2.5 rounded-full shrink-0',
                aggregated.summary.paymentsUnderControlCount > 0 ? 'bg-emerald-500' : 'bg-slate-300'
              )}
            />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-emerald-600 tracking-tight">
              {aggregated.summary.paymentsUnderControlCount}
            </span>
            <span className="text-xs font-medium text-slate-500">счетов</span>
          </div>
          <p className="text-[11px] font-semibold text-emerald-700 mt-1 truncate">
            {aggregated.summary.paymentsUnderControlCount === 0
              ? 'Долгов нет · Все счета закрыты'
              : `Сумма: ${aggregated.summary.paymentsUnderControlFormatted}`}
          </p>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. HORIZONTAL FILTER TABS & SORTING BAR (R2)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs min-w-0">
        {/* Horizontal Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none min-w-0">
          {filterTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer',
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/60'
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-bold min-w-[18px] text-center',
                    isActive
                      ? 'bg-white/20 text-white'
                      : tab.count > 0
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-slate-150 text-slate-400'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 3-Mode Sorting Dropdown */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as CockpitSortMode)}
            className="text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            <option value="priority">По приоритету ∨</option>
            <option value="time">По времени / дедлайну</option>
            <option value="client">По клиенту (А-Я)</option>
          </select>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. TWO-COLUMN COMMAND CENTER (65% / 35% GRID)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-5 w-full min-w-0 items-start">
        {/* ═══════════════════════════════════════════════════════════
            LEFT COLUMN (65%): SITUATIONAL ACCORDION QUEUES (R3)
        ═══════════════════════════════════════════════════════════ */}
        <div className="w-full lg:w-[65%] min-w-0 space-y-4">
          {/* 🔴 BLOCK 1: ПРОСРОЧЕНО (Collapsible Accordion) */}
          <div className="bg-white rounded-2xl border border-rose-200/90 shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => setIsOverdueOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-5 py-3.5 bg-rose-50/70 border-b border-rose-200/60 hover:bg-rose-50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0 animate-pulse" />
                <h2 className="text-sm font-bold text-rose-950 uppercase tracking-wider truncate">
                  Просрочено
                </h2>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-200/80 text-rose-800 shrink-0">
                  {filteredOverdue.length}
                </span>
                <span className="text-xs text-rose-700 font-medium hidden sm:inline truncate">
                  · Критические задержки
                </span>
              </div>
              <div className="flex items-center gap-2 text-rose-700">
                <span className="text-xs font-semibold">{isOverdueOpen ? 'Свернуть' : 'Развернуть'}</span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 transition-transform duration-200',
                    isOverdueOpen ? 'rotate-180' : 'rotate-0'
                  )}
                />
              </div>
            </button>

            {isOverdueOpen && (
              <div className="p-4 space-y-3">
                {filteredOverdue.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                    <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-500 mb-1.5" />
                    <p className="text-xs font-bold text-slate-800">✓ Просрочек нет · Всё в графике</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Нет просроченных счетов, зависших лидов и просроченных задач.
                    </p>
                  </div>
                ) : (
                  filteredOverdue.map((item) => {
                    const rawPhone = item.parentPhone || item.leadPhone;
                    const cleanPhone = sanitizePhoneForWhatsApp(rawPhone);

                    return (
                      <div
                        key={item.id}
                        onClick={() => setActiveDrawerItem(item)}
                        className="p-3.5 rounded-xl border border-rose-100 hover:border-rose-300 bg-rose-50/30 hover:bg-rose-50/60 transition-all cursor-pointer group shadow-2xs space-y-2.5 min-w-0"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                                {item.priority}
                              </span>
                              <span className="text-[11px] font-medium text-slate-500 truncate">
                                {item.category}
                              </span>
                              {item.urgencyLabel && (
                                <span className="text-[11px] font-semibold text-rose-700 truncate">
                                  · {item.urgencyLabel}
                                </span>
                              )}
                            </div>
                            <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors mt-1 leading-snug">
                              {item.title}
                            </h3>
                            {item.subtitle && (
                              <p className="text-[11px] text-slate-600 truncate mt-0.5">{item.subtitle}</p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 mt-0.5" />
                        </div>

                        {/* Inline Actions */}
                        <div
                          className="flex items-center gap-1.5 pt-2 border-t border-rose-100/80 flex-wrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Payment Button if Invoice or Debt */}
                          {item.canOpenInvoice && (
                            <button
                              type="button"
                              onClick={() => setPaymentModalItem(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 text-[11px] font-semibold rounded-lg border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
                            >
                              <CreditCard className="w-3 h-3" />
                              Счёт
                            </button>
                          )}

                          {/* Remind via WhatsApp */}
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-lg border border-emerald-200 transition-colors shadow-2xs"
                            >
                              <MessageSquare className="w-3 h-3" />
                              WhatsApp
                            </a>
                          )}

                          {/* Call Link */}
                          {rawPhone && (
                            <a
                              href={`tel:${cleanPhone}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200 transition-colors shadow-2xs"
                            >
                              <Phone className="w-3 h-3" />
                              Позвонить
                            </a>
                          )}

                          {/* Complete Task if applicable */}
                          {item.canComplete && (
                            <button
                              type="button"
                              onClick={(e) => handleComplete(item.sourceId, e)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 text-[11px] font-semibold rounded-lg border border-blue-200 transition-colors shadow-2xs cursor-pointer ml-auto"
                            >
                              <Check className="w-3 h-3" />
                              Выполнить
                            </button>
                          )}

                          {/* Drawer Opener */}
                          <button
                            type="button"
                            onClick={() => setActiveDrawerItem(item)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white transition-colors"
                            title="Подробнее"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* 🟠 BLOCK 2: ТРЕБУЮТ ВНИМАНИЯ СЕЙЧАС (Collapsible Accordion - Suite 23 preservation) */}
          <div className="bg-white rounded-2xl border border-amber-200/90 shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => setIsAttentionOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-5 py-3.5 bg-amber-50/70 border-b border-amber-200/60 hover:bg-amber-50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <h2 className="text-sm font-bold text-amber-950 uppercase tracking-wider truncate">
                  Требуют внимания сейчас
                </h2>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-200/80 text-amber-800 shrink-0">
                  {filteredAttention.length}
                </span>
                <span className="text-xs text-amber-700 font-medium hidden sm:inline truncate">
                  · Приоритет P0 / P1
                </span>
              </div>
              <div className="flex items-center gap-2 text-amber-700">
                <span className="text-xs font-semibold">{isAttentionOpen ? 'Свернуть' : 'Развернуть'}</span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 transition-transform duration-200',
                    isAttentionOpen ? 'rotate-180' : 'rotate-0'
                  )}
                />
              </div>
            </button>

            {isAttentionOpen && (
              <div className="p-4 space-y-3">
                {filteredAttention.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                    <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-500 mb-1.5" />
                    <p className="text-xs font-bold text-slate-800">✓ Все под контролем · Сбоев нет</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Критических ситуаций, неподтвержденных уроков и долгов перед занятиями нет.
                    </p>
                  </div>
                ) : (
                  filteredAttention.map((item) => {
                    const rawPhone = item.parentPhone || item.leadPhone;
                    const cleanPhone = sanitizePhoneForWhatsApp(rawPhone);
                    const telegramHandle = sanitizeTelegramUsername(item.leadTelegram);

                    return (
                      <div
                        key={item.id}
                        onClick={() => setActiveDrawerItem(item)}
                        className="p-3.5 rounded-xl border border-amber-100 hover:border-amber-300 bg-amber-50/30 hover:bg-amber-50/60 transition-all cursor-pointer group shadow-2xs space-y-2.5 min-w-0"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={cn(
                                  'px-2 py-0.5 text-[10px] font-bold rounded-md border',
                                  item.priority === 'P0'
                                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                                    : 'bg-amber-100 text-amber-800 border-amber-200'
                                )}
                              >
                                {item.priority}
                              </span>
                              <span className="text-[11px] font-medium text-slate-500 truncate">
                                {item.category}
                              </span>
                              {item.badgeText && (
                                <span className="text-[11px] font-semibold text-rose-700 truncate">
                                  · {item.badgeText}
                                </span>
                              )}
                            </div>
                            <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors mt-1 leading-snug">
                              {item.title}
                            </h3>
                            {item.subtitle && (
                              <p className="text-[11px] text-slate-600 truncate mt-0.5">{item.subtitle}</p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 mt-0.5" />
                        </div>

                        {/* Inline Actions */}
                        <div
                          className="flex items-center gap-1.5 pt-2 border-t border-amber-100/80 flex-wrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Remind Button */}
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-lg border border-emerald-200 transition-colors shadow-2xs"
                            >
                              <MessageSquare className="w-3 h-3" />
                              Напомнить
                            </a>
                          )}

                          {/* Open Lesson Modal */}
                          {item.lessonId && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenLessonModal(item.lessonId!, e)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 text-[11px] font-semibold rounded-lg border border-blue-200 transition-colors shadow-2xs cursor-pointer"
                            >
                              <Calendar className="w-3 h-3" />
                              Открыть
                            </button>
                          )}

                          {/* Invoice / Debt Settler */}
                          {item.canOpenInvoice && (
                            <button
                              type="button"
                              onClick={() => setPaymentModalItem(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-lg border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
                            >
                              <CreditCard className="w-3 h-3" />
                              Счёт
                            </button>
                          )}

                          {/* Telegram Chat */}
                          {telegramHandle && (
                            <a
                              href={`https://t.me/${telegramHandle}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-sky-50 text-sky-700 text-[11px] font-semibold rounded-lg border border-sky-200 transition-colors shadow-2xs"
                            >
                              <Send className="w-3 h-3" />
                              Открыть чат
                            </a>
                          )}

                          {/* Call link */}
                          {rawPhone && (
                            <a
                              href={`tel:${cleanPhone}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200 transition-colors shadow-2xs"
                            >
                              <Phone className="w-3 h-3" />
                              Позвонить
                            </a>
                          )}

                          {/* Drawer Opener */}
                          <button
                            type="button"
                            onClick={() => setActiveDrawerItem(item)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white transition-colors ml-auto"
                            title="Подробнее"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* 🔵 BLOCK 3: ЗАДАЧИ НА СЕГОДНЯ (Checklist with Timeline - Suite 23 preservation) */}
          <div className="bg-white rounded-2xl border border-blue-200/90 shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => setIsTodayOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-5 py-3.5 bg-blue-50/70 border-b border-blue-200/60 hover:bg-blue-50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                <h2 className="text-sm font-bold text-blue-950 uppercase tracking-wider truncate">
                  Задачи на сегодня
                </h2>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-200/80 text-blue-800 shrink-0">
                  {filteredToday.length}
                </span>
                <span className="text-xs text-blue-700 font-medium hidden sm:inline truncate">
                  · Нужно сделать сегодня
                </span>
              </div>
              <div className="flex items-center gap-2 text-blue-700">
                <span className="text-xs font-semibold">{isTodayOpen ? 'Свернуть' : 'Развернуть'}</span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 transition-transform duration-200',
                    isTodayOpen ? 'rotate-180' : 'rotate-0'
                  )}
                />
              </div>
            </button>

            {isTodayOpen && (
              <div className="p-4 space-y-3">
                {filteredToday.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                    <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-500 mb-1.5" />
                    <p className="text-xs font-bold text-slate-800">✓ Все задачи выполнены · План закрыт</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Все активные задачи на сегодня успешно завершены.
                    </p>
                  </div>
                ) : (
                  filteredToday.map((task) => {
                    const rawPhone = task.parentPhone || task.leadPhone;
                    const cleanPhone = sanitizePhoneForWhatsApp(rawPhone);

                    return (
                      <div
                        key={task.id}
                        onClick={() => setActiveDrawerItem(task)}
                        className="p-3.5 rounded-xl border border-slate-100 hover:border-blue-300 bg-slate-50/40 hover:bg-blue-50/20 transition-all cursor-pointer group shadow-2xs space-y-2.5 min-w-0"
                      >
                        <div className="flex items-start gap-3">
                          {/* 1-Click Interactive Checkbox */}
                          <button
                            type="button"
                            onClick={(e) => handleComplete(task.sourceId, e)}
                            className="mt-0.5 w-5 h-5 rounded-md border-2 border-slate-300 hover:border-emerald-600 bg-white hover:bg-emerald-50 flex items-center justify-center transition-colors shrink-0 group/check cursor-pointer"
                            title="Отметить выполненной"
                          >
                            <Check className="w-3.5 h-3.5 text-transparent group-hover/check:text-emerald-600 transition-colors" />
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {task.timelineTime && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 text-blue-800 font-mono">
                                  {task.timelineTime}
                                </span>
                              )}
                              <span className="text-[11px] font-semibold text-slate-500 truncate">
                                {task.category}
                              </span>
                            </div>
                            <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors mt-1 leading-snug">
                              {task.title}
                            </h3>
                            {task.subtitle && (
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">{task.subtitle}</p>
                            )}
                          </div>

                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 mt-0.5" />
                        </div>

                        {/* Inline Actions & 1-Click Postpone */}
                        <div
                          className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100 flex-wrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded-md border border-emerald-200 transition-colors"
                              >
                                <MessageSquare className="w-3 h-3" />
                                WhatsApp
                              </a>
                            )}
                            {rawPhone && (
                              <a
                                href={`tel:${cleanPhone}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-md border border-slate-200 transition-colors"
                              >
                                <Phone className="w-3 h-3" />
                                Позвонить
                              </a>
                            )}
                          </div>

                          {/* 1-Click Postpone buttons if available */}
                          {task.postponeDates && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400 mr-0.5 hidden sm:inline">
                                Перенести:
                              </span>
                              {task.postponeDates.map((p) => (
                                <button
                                  key={p.dateIso}
                                  type="button"
                                  onClick={(e) => handlePostpone(task.sourceId, p.dateIso, e)}
                                  className="px-2 py-0.5 bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-[10px] font-semibold rounded-md border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Postponable Tasks Expander Section (Suite 23 T4.02 string preservation: 'Можно перенести') */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsPostponableOpen((prev) => !prev)}
                    className="flex items-center justify-between w-full p-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span>Можно перенести</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
                        {filteredPostponable.length}
                      </span>
                    </div>
                    <ChevronDown
                      className={cn(
                        'w-3.5 h-3.5 transition-transform duration-200',
                        isPostponableOpen ? 'rotate-180' : 'rotate-0'
                      )}
                    />
                  </button>

                  {isPostponableOpen && (
                    <div className="mt-2 space-y-2 pl-2">
                      {filteredPostponable.length === 0 ? (
                        <p className="text-[11px] text-slate-400 py-1">Нет переносимых задач.</p>
                      ) : (
                        filteredPostponable.map((pTask) => (
                          <div
                            key={pTask.id}
                            onClick={() => setActiveDrawerItem(pTask)}
                            className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-white text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors"
                          >
                            <span className="truncate text-slate-700">{pTask.title}</span>
                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {pTask.postponeDates?.map((p) => (
                                <button
                                  key={p.dateIso}
                                  type="button"
                                  onClick={(e) => handlePostpone(pTask.sourceId, p.dateIso, e)}
                                  className="px-1.5 py-0.5 bg-white text-[10px] font-semibold text-slate-600 rounded border border-slate-200 hover:text-blue-600 cursor-pointer"
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            RIGHT COLUMN (35%): 5 OPERATIONAL MINI-WIDGETS (R4)
        ═══════════════════════════════════════════════════════════ */}
        <div className="w-full lg:w-[35%] min-w-0 space-y-3.5">
          {/* Widget 1: 🟣 Лиды и заявки */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 space-y-3 min-w-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Лиды и заявки
                </h3>
              </div>
              <Link
                href="/crm"
                className="text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors inline-flex items-center gap-0.5"
              >
                Все лиды →
              </Link>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-slate-700">Без 1-го контакта</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{aggregated.widgets.leadsWidget.noContact}</span>
                  {aggregated.widgets.leadsWidget.noContact > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('leads')}
                      className="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                    >
                      Связаться
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-slate-700">Ждут ответа клиента</span>
                </div>
                <span className="font-bold text-slate-900">{aggregated.widgets.leadsWidget.awaitingReply}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-slate-700">Пробное назначено</span>
                </div>
                <span className="font-bold text-slate-900">{aggregated.widgets.leadsWidget.trialScheduled}</span>
              </div>
            </div>
          </div>

          {/* Widget 2: 🎓 Пробные занятия */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 space-y-3 min-w-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Пробные занятия
                </h3>
              </div>
              <Link
                href="/calendar"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center gap-0.5"
              >
                Все пробные →
              </Link>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-slate-700">Сегодня</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{aggregated.widgets.trialsWidget.today}</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('trials')}
                    className="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                  >
                    Посмотреть
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-slate-700">Завершено без решения</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{aggregated.widgets.trialsWidget.completedNoDecision}</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('trials')}
                    className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                  >
                    Связаться
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-slate-700">Ожидает подтверждения</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{aggregated.widgets.trialsWidget.awaitingConfirmation}</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('trials')}
                    className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-800 text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                  >
                    Проверить
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Widget 3: 🟢 Оплаты и счета */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 space-y-3 min-w-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Оплаты и счета
                </h3>
              </div>
              <Link
                href="/finance"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors inline-flex items-center gap-0.5"
              >
                Все оплаты →
              </Link>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-slate-700">Просрочено</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-600">
                    {aggregated.widgets.paymentsWidget.overdueEUR} €
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('payments')}
                    className="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                  >
                    Напомнить
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-slate-700">Сегодня / завтра</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-700">
                    {aggregated.widgets.paymentsWidget.todayTomorrowEUR} €
                  </span>
                  <button
                    type="button"
                    onClick={() => router.push('/finance')}
                    className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                  >
                    Счёт
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/50 border border-emerald-100">
                <span className="font-semibold text-emerald-900">К контролю всего</span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  {aggregated.widgets.paymentsWidget.totalControlEUR} €
                </span>
              </div>
            </div>
          </div>

          {/* Widget 4: 📅 Занятия сегодня */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 space-y-3 min-w-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Занятия сегодня
                </h3>
              </div>
              <Link
                href="/calendar"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center gap-0.5"
              >
                Календарь →
              </Link>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-700">По расписанию</span>
                </div>
                <span className="font-bold text-slate-900">
                  {aggregated.widgets.scheduleWidget.scheduled}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-slate-700">Требует внимания</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-700">
                    {aggregated.widgets.scheduleWidget.attention}
                  </span>
                  {aggregated.widgets.scheduleWidget.attention > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('lessons')}
                      className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                    >
                      Открыть
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100/60">
                <span className="text-slate-600 font-medium">Всего уроков сегодня</span>
                <span className="font-bold text-slate-900">
                  {aggregated.widgets.scheduleWidget.totalTodayLessons}
                </span>
              </div>
            </div>
          </div>

          {/* Widget 5: 👥 Подтверждение уроков */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 space-y-3 min-w-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-sky-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Подтверждение уроков
                </h3>
              </div>
              <Link
                href="/calendar"
                className="text-xs font-semibold text-sky-600 hover:text-sky-800 transition-colors inline-flex items-center gap-0.5"
              >
                Все уроки →
              </Link>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-slate-700">Не подтверждены</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-700">
                    {aggregated.widgets.confirmationsWidget.unconfirmed}
                  </span>
                  {aggregated.widgets.confirmationsWidget.unconfirmed > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('lessons')}
                      className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                    >
                      Напомнить
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                  <span className="text-slate-700">Ожидают назначения</span>
                </div>
                <span className="font-bold text-slate-900">
                  {aggregated.widgets.confirmationsWidget.unassigned}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. 440px SLIDE-OVER DRAWER (R5)
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
          6. INTEGRATED MODALS
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
