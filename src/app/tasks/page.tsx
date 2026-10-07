'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useFocusSync } from '@/hooks/useFocusSync';
import {
  Plus,
  CheckCircle2,
  Search,
  Edit3,
  X,
  ListTodo,
  AlertCircle,
  Clock,
  Check,
  MoreHorizontal,
  User,
  Users,
  Calendar,
  Send,
  List as ListIcon,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FullTaskData } from '@/lib/data/mockData';
import { getStoredTasks, saveTaskToStorage } from '@/lib/data/taskStorage';
import { updateUnifiedTaskStatus } from '@/lib/data/taskManager';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';

// ─── Tab types ────────────────────────────────────────────────────────────────
type ActiveTab =
  | 'all'
  | 'delegated_to_me'
  | 'delegated_by_me'
  | 'my'
  | 'from_owner'
  | 'overdue'
  | 'today'
  | 'in_progress'
  | 'done';

type SortMode = 'priority' | 'date_asc' | 'date_desc';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getTodayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getInitials(name?: string): string {
  if (!name) return 'АВ';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getCategoryBadgeStyle(category?: string) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('продаж') || cat.includes('сделк')) {
    return 'bg-purple-50 text-purple-700 border-purple-200/60';
  }
  if (cat.includes('финанс') || cat.includes('оплат')) {
    return 'bg-amber-50 text-amber-700 border-amber-200/60';
  }
  if (cat.includes('расписан')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
  }
  if (cat.includes('документ')) {
    return 'bg-blue-50 text-blue-700 border-blue-200/60';
  }
  if (cat.includes('учеб') || cat.includes('орг')) {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200/60';
  }
  if (cat.includes('retention') || cat.includes('забот')) {
    return 'bg-rose-50 text-rose-700 border-rose-200/60';
  }
  return 'bg-slate-100 text-slate-700 border-slate-200/60';
}

function getCardDateDisplay(task: FullTaskData, todayIso: string) {
  if (task.status === 'done') {
    return {
      badge: 'Выполнено',
      badgeClass: 'bg-emerald-100 text-emerald-700',
      timeText: task.completedAt
        ? new Date(task.completedAt).toLocaleDateString('ru-RU')
        : (task.dueDateFormatted?.match(/\d{2}\.\d{2}\.\d{4}/)?.[0] || '02.10.2026'),
      accentBorder: 'border-l-4 border-l-transparent',
    };
  }

  const isOverdue = Boolean(
    task.isOverdue ||
    (task.dueDate && task.dueDate < todayIso) ||
    task.dueDateFormatted?.toLowerCase().includes('просрочено')
  );

  const isToday =
    task.dueDate === todayIso ||
    Boolean(task.dueDateFormatted && task.dueDateFormatted.toLowerCase().includes('сегодня'));

  let timeStr = '';
  if (task.dueDateFormatted) {
    const m = task.dueDateFormatted.match(/(до\s+\d{1,2}:\d{2}|\b\d{1,2}:\d{2}\b)/);
    if (m) timeStr = m[0];
  }

  if (isOverdue) {
    let sub = 'Вчера, 02.10';
    if (task.dueDate) {
      const parts = task.dueDate.split('-');
      if (parts.length === 3) sub = `Вчера, ${parts[2]}.${parts[1]}`;
    }
    return {
      badge: 'Просрочено',
      badgeClass: 'bg-rose-100 text-rose-700',
      timeText: sub,
      accentBorder: 'border-l-4 border-l-rose-500',
    };
  }

  if (isToday) {
    return {
      badge: 'Сегодня',
      badgeClass: 'bg-amber-100 text-amber-800',
      timeText: timeStr || 'до 18:00',
      accentBorder: 'border-l-4 border-l-amber-400',
    };
  }

  // Check tomorrow
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const tomorrowIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (task.dueDate === tomorrowIso) {
    return {
      badge: 'Завтра',
      badgeClass: 'bg-slate-100 text-slate-700',
      timeText: timeStr || '10:00',
      accentBorder: 'border-l-4 border-l-transparent',
    };
  }

  let dateBadge = '08 окт.';
  if (task.dueDate) {
    const dt = new Date(task.dueDate + 'T00:00:00');
    if (!isNaN(dt.getTime())) {
      dateBadge = dt.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
    }
  }

  return {
    badge: dateBadge,
    badgeClass: 'bg-slate-100 text-slate-700',
    timeText: timeStr || (task.dueDateFormatted?.match(/\b\d{1,2}:\d{2}\b/)?.[0] || ''),
    accentBorder: 'border-l-4 border-l-transparent',
  };
}

function getTaskPriorityScore(task: FullTaskData, todayIso: string): number {
  if (task.status === 'done' || task.status === 'cancelled') return 100;
  if (task.isOverdue) return 1;
  if (task.dueDate === todayIso) return 2;
  if (task.priority === 'high') return 3;
  if (task.createdByRole === 'owner') return 4;
  return 5;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const { userName } = useRole();
  const toast = useToast();
  const { t } = useLanguage();

  const [tasks, setTasks] = useState<FullTaskData[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [dueDateFilter, setDueDateFilter] = useState<'all' | 'overdue' | 'today' | 'tomorrow' | 'week'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('priority');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<FullTaskData | null>(null);
  const [selectedTask, setSelectedTask] = useState<FullTaskData | null>(null);

  const todayIso = useMemo(() => getTodayIso(), []);

  const loadTasks = useCallback(async () => {
    const list = await getStoredTasks();
    setTasks(list);
    // Auto-select first task if none selected, matching target reference layout
    setSelectedTask((prev) => prev ? list.find((t) => t.id === prev.id) || list[0] || null : list[0] || null);
  }, []);

  useFocusSync(loadTasks);

  useEffect(() => {
    loadTasks();
    window.addEventListener('crm-tasks-changed', loadTasks);
    return () => window.removeEventListener('crm-tasks-changed', loadTasks);
  }, [loadTasks]);

  const handleTaskCreated = (newTask: FullTaskData) => {
    setTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)]);
    setSelectedTask(newTask);
  };

  const handleToggleStatus = async (taskId: string) => {
    const currentTask = tasks.find((t) => t.id === taskId);
    const newStatus = currentTask?.status === 'done' ? 'open' : 'done';
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    setSelectedTask((prev) => (prev && prev.id === taskId ? { ...prev, status: newStatus } : prev));
    try {
      await updateUnifiedTaskStatus(taskId, newStatus, { performedBy: userName || 'Андрей Волков' });
      toast.success(newStatus === 'done' ? 'Задача выполнена!' : 'Задача открыта заново');
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handlePriorityChange = async (taskId: string, newPriority: 'high' | 'medium' | 'low') => {
    const current = tasks.find((t) => t.id === taskId);
    if (!current) return;
    const updated = { ...current, priority: newPriority };
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    setSelectedTask((prev) => (prev && prev.id === taskId ? updated : prev));
    saveTaskToStorage(updated);
    toast.success('Приоритет обновлен');
  };

  const handleAddComment = (taskId: string, commentText: string) => {
    if (!commentText.trim()) return;
    const current = tasks.find((t) => t.id === taskId);
    if (!current) return;

    const now = new Date();
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newComment = {
      id: `c_${Date.now()}`,
      authorName: userName || 'Андрей Волков',
      createdAt: dateFormatted,
      text: commentText.trim(),
    };

    const updatedComments = [...(current.comments || []), newComment];
    const updatedTask = { ...current, comments: updatedComments };

    setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
    setSelectedTask((prev) => (prev && prev.id === taskId ? updatedTask : prev));
    saveTaskToStorage(updatedTask);
    toast.success('Комментарий добавлен');
  };

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = tasks.filter((t) => t.status !== 'cancelled').length;
    const overdue = tasks.filter((t) => (t.isOverdue || (t.dueDate && t.dueDate < todayIso)) && t.status !== 'done' && t.status !== 'cancelled').length;
    const today = tasks.filter((t) => t.dueDate === todayIso && t.status !== 'done' && t.status !== 'cancelled').length;
    const done = tasks.filter((t) => t.status === 'done').length;
    return { total, overdue, today, done };
  }, [tasks, todayIso]);

  // ─── Tab counts ─────────────────────────────────────────────────────────────
  const tabCounts = useMemo(() => ({
    all: stats.total,
    delegated_to_me: tasks.filter((t) => t.status !== 'cancelled' && (!userName || t.assignedTo === userName || t.assignedTo === 'Андрей Волков')).length,
    delegated_by_me: tasks.filter((t) => t.status !== 'cancelled' && (t.createdByRole === 'owner' || t.createdByName === userName || t.creator === userName || t.title.toLowerCase().includes('поруч'))).length,
    my: tasks.filter((t) => t.status !== 'cancelled' && (!userName || t.assignedTo === userName || t.assignedTo === 'Андрей Волков')).length,
    from_owner: tasks.filter((t) => t.status !== 'cancelled' && (t.createdByRole === 'owner' || t.title.toLowerCase().includes('владелец') || (t.description || '').toLowerCase().includes('владелец') || t.createdByName?.toLowerCase().includes('владелец'))).length,
    overdue: stats.overdue,
    today: stats.today,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    done: stats.done,
  }), [tasks, stats, userName, todayIso]);

  // ─── Filtered + sorted tasks ────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    let list = tasks.filter((t) => t.status !== 'cancelled');

    // Tab filter
    switch (activeTab) {
      case 'delegated_to_me':
        list = list.filter((t) => !userName || t.assignedTo === userName || t.assignedTo === 'Андрей Волков');
        break;
      case 'delegated_by_me':
        list = list.filter((t) => t.createdByRole === 'owner' || t.createdByName === userName || t.creator === userName || t.title.toLowerCase().includes('поруч'));
        break;
      case 'my':
        list = list.filter((t) => !userName || t.assignedTo === userName || t.assignedTo === 'Андрей Волков');
        break;
      case 'from_owner':
        list = list.filter((t) => t.createdByRole === 'owner' || t.title.toLowerCase().includes('владелец') || (t.description || '').toLowerCase().includes('владелец') || t.createdByName?.toLowerCase().includes('владелец'));
        break;
      case 'overdue':
        list = list.filter((t) => (t.isOverdue || (t.dueDate && t.dueDate < todayIso)) && t.status !== 'done');
        break;
      case 'today':
        list = list.filter((t) => t.dueDate === todayIso && t.status !== 'done');
        break;
      case 'in_progress':
        list = list.filter((t) => t.status === 'in_progress');
        break;
      case 'done':
        list = list.filter((t) => t.status === 'done');
        break;
    }

    // Priority filter dropdown
    if (priorityFilter !== 'all') {
      list = list.filter((t) => t.priority === priorityFilter);
    }

    // Due date filter dropdown
    if (dueDateFilter === 'overdue') {
      list = list.filter((t) => (t.isOverdue || (t.dueDate && t.dueDate < todayIso)) && t.status !== 'done');
    } else if (dueDateFilter === 'today') {
      list = list.filter((t) => t.dueDate === todayIso && t.status !== 'done');
    } else if (dueDateFilter === 'tomorrow') {
      const tom = new Date();
      tom.setDate(tom.getDate() + 1);
      const tomIso = `${tom.getFullYear()}-${String(tom.getMonth() + 1).padStart(2, '0')}-${String(tom.getDate()).padStart(2, '0')}`;
      list = list.filter((t) => t.dueDate === tomIso);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.studentName || '').toLowerCase().includes(q) ||
        (t.parentName || '').toLowerCase().includes(q) ||
        (t.leadName || '').toLowerCase().includes(q) ||
        (t.assignedTo || '').toLowerCase().includes(q) ||
        (t.tag || '').toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortMode === 'priority') {
      list = [...list].sort((a, b) => {
        const sa = getTaskPriorityScore(a, todayIso);
        const sb = getTaskPriorityScore(b, todayIso);
        if (sa !== sb) return sa - sb;
        return (a.dueDate || '').localeCompare(b.dueDate || '');
      });
    } else if (sortMode === 'date_asc') {
      list = [...list].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    } else {
      list = [...list].sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || ''));
    }

    return list;
  }, [tasks, activeTab, priorityFilter, dueDateFilter, searchQuery, sortMode, todayIso, userName]);

  // ─── Tabs config ─────────────────────────────────────────────────────────────
  const TABS: { key: ActiveTab; label: string; count: number }[] = [
    { key: 'all', label: 'Все задачи', count: tabCounts.all },
    { key: 'delegated_to_me', label: 'Мне поручено', count: tabCounts.delegated_to_me },
    { key: 'delegated_by_me', label: 'Я поручил', count: tabCounts.delegated_by_me },
    { key: 'my', label: 'Мои', count: tabCounts.my },
    { key: 'from_owner', label: 'От владельца', count: tabCounts.from_owner },
    { key: 'overdue', label: 'Просроченные', count: tabCounts.overdue },
    { key: 'today', label: 'Сегодня', count: tabCounts.today },
    { key: 'in_progress', label: 'В работе', count: tabCounts.in_progress },
    { key: 'done', label: 'Выполненные', count: tabCounts.done },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-0 px-6 pt-5 pb-6 text-slate-800 antialiased overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-3 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
            {t('tasks.title', 'Задачи и поручения')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t('tasks.subtitle', 'Контроль поручений, звонков и операционной работы команды')}
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>{t('tasks.newTask', 'Новая задача')}</span>
        </button>
      </div>

      {/* ── Summary 4 KPI Cards (Target UI Reference) ── */}
      <div className="grid grid-cols-4 gap-3 pb-3 shrink-0">
        {/* Card 1: всего задач */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 leading-none tabular-nums">{stats.total}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">всего задач</p>
          </div>
        </div>

        {/* Card 2: просрочено */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 leading-none tabular-nums">{stats.overdue}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">просрочено</p>
          </div>
        </div>

        {/* Card 3: срок сегодня */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 leading-none tabular-nums">{stats.today}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">срок сегодня</p>
          </div>
        </div>

        {/* Card 4: выполнено */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 leading-none tabular-nums">{stats.done}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">выполнено</p>
          </div>
        </div>
      </div>

      {/* ── Filters Row 1: Tab Pills (Left) + Dropdown Filters (Right) ── */}
      <div className="flex items-center justify-between gap-3 pb-3 shrink-0">
        {/* Left: Tab pills with dynamic counts */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer',
                  isActive
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[11px] font-bold tabular-nums',
                    isActive ? 'bg-blue-500/80 text-white' : 'text-slate-400'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Priority & Deadline Dropdowns */}
        <div className="flex items-center gap-4 shrink-0 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Приоритет:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="font-semibold text-slate-800 bg-transparent border-0 focus:ring-0 cursor-pointer pr-1"
            >
              <option value="all">Все</option>
              <option value="high">Высокий</option>
              <option value="medium">Средний</option>
              <option value="low">Низкий</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Срок:</span>
            <select
              value={dueDateFilter}
              onChange={(e) => setDueDateFilter(e.target.value as any)}
              className="font-semibold text-slate-800 bg-transparent border-0 focus:ring-0 cursor-pointer pr-1"
            >
              <option value="all">Все</option>
              <option value="overdue">Просроченные</option>
              <option value="today">Сегодня</option>
              <option value="tomorrow">Завтра</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Filters Row 2: Search Input + Sort + View Mode Switch ── */}
      <div className="flex items-center justify-between gap-3 pb-3 shrink-0">
        {/* Search */}
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по задачам..."
            className="h-9 w-full rounded-xl border border-slate-200/80 bg-white pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:border-blue-400 transition-colors"
          />
        </div>

        {/* Right controls: Sort + View Toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative">
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="h-9 rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:border-blue-400 cursor-pointer"
            >
              <option value="priority">↑↓ Сначала важные</option>
              <option value="date_asc">По сроку ↑</option>
              <option value="date_desc">По сроку ↓</option>
            </select>
          </div>

          {/* View toggle */}
          <div className="flex items-center rounded-xl border border-slate-200/80 bg-white p-0.5 shadow-2xs">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded-lg p-1.5 transition-colors cursor-pointer',
                viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-600'
              )}
              title="Список"
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                'rounded-lg p-1.5 transition-colors cursor-pointer',
                viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-600'
              )}
              title="Календарь"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Content Area: List (Left) + Detail Panel (Right) ── */}
      <div className="flex flex-1 min-h-0 gap-4 overflow-hidden">
        {/* Left: Task Cards List */}
        <div className="flex-1 min-w-0 overflow-y-auto pr-1 space-y-2.5">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 rounded-2xl border border-dashed border-slate-200 bg-white/50 text-slate-400">
              <ListTodo className="h-10 w-10 opacity-30" />
              <p className="text-xs font-medium">
                {searchQuery ? 'Ничего не найдено по вашему запросу' : 'Нет задач в выбранной категории'}
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isDone = task.status === 'done';
              const isSelected = selectedTask?.id === task.id;
              const dateInfo = getCardDateDisplay(task, todayIso);
              const isFromOwner = Boolean(
                task.createdByRole === 'owner' ||
                task.title.toLowerCase().includes('владелец') ||
                (task.description || '').toLowerCase().includes('владелец') ||
                task.createdByName?.toLowerCase().includes('владелец')
              );

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={cn(
                    'group rounded-2xl border bg-white p-3.5 transition-all cursor-pointer relative flex items-start gap-3.5 shadow-2xs hover:border-slate-300',
                    dateInfo.accentBorder,
                    isSelected ? 'border-blue-400 ring-2 ring-blue-100/60 bg-blue-50/15' : 'border-slate-200/80',
                    isDone && 'opacity-65'
                  )}
                >
                  {/* Left: Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStatus(task.id);
                    }}
                    className="mt-0.5 shrink-0 transition-colors cursor-pointer"
                  >
                    {isDone ? (
                      <div className="h-5 w-5 rounded-md bg-emerald-500 border border-emerald-500 text-white flex items-center justify-center">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="h-5 w-5 rounded-md border-2 border-slate-300 group-hover:border-blue-500 transition-colors" />
                    )}
                  </button>

                  {/* Middle: Content */}
                  <div className="flex-1 min-w-0">
                    {/* Line 1: Title */}
                    <p
                      className={cn(
                        'text-sm font-bold leading-snug truncate text-slate-900',
                        isDone && 'line-through text-slate-400 font-medium'
                      )}
                    >
                      {task.title}
                    </p>

                    {/* Line 2: Description preview */}
                    {task.description && (
                      <p className="text-xs text-slate-500 mt-1 truncate leading-tight">
                        {task.description.split('\n')[0]}
                      </p>
                    )}

                    {/* Line 3: Category badge + Entity links + Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {/* Category Badge */}
                      <span
                        className={cn(
                          'rounded-md px-2 py-0.5 text-[11px] font-semibold border',
                          getCategoryBadgeStyle(task.taskType)
                        )}
                      >
                        {task.taskType}
                      </span>

                      {/* Student link if present */}
                      {task.studentName && (
                        task.studentId ? (
                          <Link
                            href={`/students/${task.studentId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 text-[11px] font-medium transition-colors"
                          >
                            {task.studentName}
                          </Link>
                        ) : (
                          <span className="rounded-md bg-slate-100 text-slate-700 px-2 py-0.5 text-[11px] font-medium">
                            {task.studentName}
                          </span>
                        )
                      )}

                      {/* Lead link if present */}
                      {task.leadName && (
                        task.leadId ? (
                          <Link
                            href={`/crm/leads/${task.leadId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/60 px-2 py-0.5 text-[11px] font-medium transition-colors"
                          >
                            {task.leadName}
                          </Link>
                        ) : (
                          <span className="rounded-md bg-purple-50 text-purple-700 border border-purple-200/60 px-2 py-0.5 text-[11px] font-medium">
                            {task.leadName}
                          </span>
                        )
                      )}

                      {/* Tag pill (e.g. Пробный урок, Абонемент, Задолженность) */}
                      {task.tag && (
                        <span className="rounded-md bg-sky-50 text-sky-700 border border-sky-200/60 px-2 py-0.5 text-[11px] font-medium">
                          {task.tag}
                        </span>
                      )}

                      {/* Subtag pill (e.g. Перенос, Материалы) */}
                      {task.subTag && (
                        <span className="rounded-md bg-violet-50 text-violet-700 border border-violet-200/60 px-2 py-0.5 text-[11px] font-medium">
                          {task.subTag}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Due date column */}
                  <div className="shrink-0 text-right w-24">
                    <span
                      className={cn(
                        'rounded-md px-2 py-0.5 text-[11px] font-bold inline-block leading-tight',
                        dateInfo.badgeClass
                      )}
                    >
                      {dateInfo.badge}
                    </span>
                    {dateInfo.timeText && (
                      <p className="text-[11px] text-slate-500 font-medium mt-1 leading-none">
                        {dateInfo.timeText}
                      </p>
                    )}
                  </div>

                  {/* Assignee column */}
                  <div className="shrink-0 flex items-center gap-2 w-32">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {getInitials(task.assignedTo)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate leading-snug">
                        {task.assignedTo}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium truncate leading-none mt-0.5">
                        {isFromOwner ? 'От владельца' : 'Моя задача'}
                      </p>
                    </div>
                  </div>

                  {/* Three-dot button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTask(task);
                    }}
                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center shrink-0 transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Task Detail Panel (Target Reference) */}
        {selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            todayIso={todayIso}
            onClose={() => setSelectedTask(null)}
            onToggleStatus={handleToggleStatus}
            onEdit={(t) => setEditingTask(t)}
            onPriorityChange={handlePriorityChange}
            onAddComment={handleAddComment}
          />
        )}
      </div>

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleTaskCreated}
      />

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          onSave={(updated) => {
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            setSelectedTask((prev) => (prev && prev.id === updated.id ? updated : prev));
            saveTaskToStorage(updated);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Task Detail Panel (Reference UI) ────────────────────────────────────────
function TaskDetailPanel({
  task,
  todayIso,
  onClose,
  onToggleStatus,
  onEdit,
  onPriorityChange,
  onAddComment,
}: {
  task: FullTaskData;
  todayIso: string;
  onClose: () => void;
  onToggleStatus: (id: string) => void;
  onEdit: (t: FullTaskData) => void;
  onPriorityChange: (id: string, p: 'high' | 'medium' | 'low') => void;
  onAddComment: (id: string, text: string) => void;
}) {
  const [commentInput, setCommentInput] = useState('');
  const [activeTab, setActiveTab] = useState<'comments' | 'history'>('comments');
  const isDone = task.status === 'done';
  const dateInfo = getCardDateDisplay(task, todayIso);
  const isFromOwner = Boolean(
    task.createdByRole === 'owner' ||
    task.title.toLowerCase().includes('владелец') ||
    (task.description || '').toLowerCase().includes('владелец') ||
    task.createdByName?.toLowerCase().includes('владелец')
  );

  const comments = task.comments || [];

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    onAddComment(task.id, commentInput);
    setCommentInput('');
  };

  return (
    <div className="w-[390px] shrink-0 bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col h-full shadow-2xs overflow-y-auto animate-in slide-in-from-right-4 duration-200">
      {/* Top row: Status pill + Date + Close */}
      <div className="flex items-center justify-between pb-2 shrink-0">
        <div className="flex items-center gap-2">
          {dateInfo.badge === 'Просрочено' ? (
            <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          ) : isDone ? (
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
          )}

          <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-bold', dateInfo.badgeClass)}>
            {dateInfo.badge}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {task.dueDateFormatted || '02 октября 2026'}
          </span>
        </div>

        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Title */}
      <h2 className={cn('text-base font-bold text-slate-900 mt-2 leading-snug', isDone && 'line-through text-slate-400')}>
        {task.title}
      </h2>

      {/* Subtitle / summary */}
      {task.description && (
        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
          {task.description.split('\n')[0]}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-4 pt-1 pb-3 border-b border-slate-100 shrink-0">
        <button
          onClick={() => onToggleStatus(task.id)}
          className={cn(
            'flex-1 py-1.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer',
            isDone
              ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
          )}
        >
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{isDone ? 'Вернуть в работу' : 'Отметить выполненной'}</span>
        </button>

        <button
          onClick={() => onEdit(task)}
          className="py-1.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Изменить</span>
        </button>

        <button
          onClick={() => onEdit(task)}
          className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Meta properties section */}
      <div className="py-3 space-y-3 text-xs border-b border-slate-100 shrink-0">
        {/* Priority */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 w-28">Приоритет</span>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                task.priority === 'high' ? 'bg-rose-500' : task.priority === 'medium' ? 'bg-amber-400' : 'bg-slate-400'
              )}
            />
            <select
              value={task.priority}
              onChange={(e) => onPriorityChange(task.id, e.target.value as any)}
              className="font-bold text-slate-800 bg-transparent border-0 focus:ring-0 cursor-pointer pr-1"
            >
              <option value="high">Высокий</option>
              <option value="medium">Средний</option>
              <option value="low">Низкий</option>
            </select>
          </div>
        </div>

        {/* Due date */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 w-28">Срок выполнения</span>
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{task.dueDateFormatted || '02 октября 2026'}</span>
          </div>
        </div>

        {/* Assignee */}
        <div className="flex items-start justify-between">
          <span className="text-slate-400 w-28 pt-0.5">Ответственный</span>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5">
              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">
                {getInitials(task.assignedTo)}
              </div>
              <span className="font-bold text-slate-800">{task.assignedTo}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {isFromOwner ? 'Поставил: Владелец школы' : 'Поставил: Администратор'}
            </p>
          </div>
        </div>

        {/* Category */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 w-28">Категория</span>
          <span
            className={cn(
              'rounded-md px-2 py-0.5 text-[11px] font-semibold border',
              getCategoryBadgeStyle(task.taskType)
            )}
          >
            {task.taskType}
          </span>
        </div>

        {/* Linked Entities */}
        <div className="space-y-2 pt-1">
          <span className="text-slate-400 block mb-1">Связанные сущности</span>

          {/* Student */}
          {task.studentName && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div>
                  {task.studentId ? (
                    <Link
                      href={`/students/${task.studentId}`}
                      className="font-bold text-slate-900 hover:text-blue-600 hover:underline leading-none block"
                    >
                      {task.studentName}
                    </Link>
                  ) : (
                    <span className="font-bold text-slate-900 leading-none block">{task.studentName}</span>
                  )}
                  <span className="text-[10px] text-slate-400 leading-none mt-0.5 block">Ученик</span>
                </div>
              </div>
            </div>
          )}

          {/* Parent */}
          {task.parentName && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 leading-none block">{task.parentName}</span>
                  <span className="text-[10px] text-slate-400 leading-none mt-0.5 block">
                    Родитель · {task.parentPhone || '+7 916 123-45-67'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Lead */}
          {task.leadName && !task.studentName && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div>
                  {task.leadId ? (
                    <Link
                      href={`/crm/leads/${task.leadId}`}
                      className="font-bold text-slate-900 hover:text-purple-600 hover:underline leading-none block"
                    >
                      {task.leadName}
                    </Link>
                  ) : (
                    <span className="font-bold text-slate-900 leading-none block">{task.leadName}</span>
                  )}
                  <span className="text-[10px] text-slate-400 leading-none mt-0.5 block">Лид CRM</span>
                </div>
              </div>
            </div>
          )}

          {/* Tag / Trial */}
          {task.tag && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 leading-none block">{task.tag}</span>
                  <span className="text-[10px] text-slate-400 leading-none mt-0.5 block">
                    30.09.2026 · 15:00 (прошёл)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Structured Description Section */}
      <div className="py-3 border-b border-slate-100 shrink-0">
        <h4 className="text-xs font-bold text-slate-900 mb-2">Описание</h4>
        <div className="text-xs text-slate-600 leading-relaxed space-y-1">
          {task.description ? (
            task.description.split('\n').map((line, idx) => (
              <p key={idx}>{line}</p>
            ))
          ) : (
            <p className="text-slate-400 italic">Нет дополнительного описания</p>
          )}
        </div>
      </div>

      {/* Comments & History Section */}
      <div className="pt-3 flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-2 mb-3">
          <button
            onClick={() => setActiveTab('comments')}
            className={cn(
              'text-xs font-bold transition-colors cursor-pointer',
              activeTab === 'comments' ? 'text-blue-600 border-b-2 border-blue-600 pb-1 -mb-2.5' : 'text-slate-400 hover:text-slate-600'
            )}
          >
            Комментарии {comments.length > 0 && <span className="ml-1 rounded-full bg-slate-100 text-slate-700 px-1.5 py-0.2 text-[10px]">{comments.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'text-xs font-bold transition-colors cursor-pointer',
              activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600 pb-1 -mb-2.5' : 'text-slate-400 hover:text-slate-600'
            )}
          >
            История
          </button>
        </div>

        {activeTab === 'comments' ? (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Comment Input */}
            <form onSubmit={handleSendComment} className="flex items-center gap-2 mb-3 shrink-0">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                АВ
              </div>
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Добавить комментарий..."
                className="h-8 flex-1 rounded-xl border border-slate-200/80 bg-slate-50 px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white"
              />
              <button
                type="submit"
                className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Comments list */}
            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">Нет комментариев</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5 text-xs">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {getInitials(c.authorName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{c.authorName}</span>
                        <span className="text-[10px] text-slate-400">{c.createdAt}</span>
                      </div>
                      <p className="text-slate-600 mt-1 leading-relaxed bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                        {c.text}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500 space-y-2 overflow-y-auto flex-1 pr-1">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-semibold text-slate-700 block">Задача создана</span>
              <span className="text-[10px] text-slate-400">{task.dueDateFormatted || '01.10.2026'}</span>
            </div>
            {task.completedAt && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="font-semibold text-emerald-800 block">Отмечена выполненной</span>
                <span className="text-[10px] text-emerald-600">{task.completedAt}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Edit Task Modal ──────────────────────────────────────────────────────────
function EditTaskModal({
  task,
  isOpen,
  onClose,
  onSave,
}: {
  task: FullTaskData;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: FullTaskData) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [taskType, setTaskType] = useState(task.taskType || 'Продажи');
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority);
  const [assignedTo, setAssignedTo] = useState(task.assignedTo);
  const [dueDate, setDueDate] = useState(task.dueDate || '');
  const [status, setStatus] = useState(task.status);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let dueDateFormatted = task.dueDateFormatted;
    if (dueDate) {
      const d = new Date(dueDate + 'T00:00:00');
      dueDateFormatted = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    const todayIso = getTodayIso();
    const isOverdue = !!dueDate && dueDate < todayIso && status !== 'done';

    // Crucial: preserve studentId, parentId, leadId, comments, tags, creator
    onSave({
      ...task,
      title,
      taskType,
      description,
      priority,
      assignedTo,
      dueDate,
      dueDateFormatted,
      isOverdue,
      status,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Изменить задачу</h3>
            <p className="text-xs text-slate-500">Редактирование параметров и статуса</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700">Название задачи</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Описание / Комментарий</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Приоритет</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="high">Срочно (Высокий)</option>
                <option value="medium">Обычный (Средний)</option>
                <option value="low">Низкий</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Статус</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as FullTaskData['status'])}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="open">К выполнению</option>
                <option value="in_progress">В работе</option>
                <option value="done">Выполнено</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Срок выполнения</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Ответственный</label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Тип задачи</label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as any)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="Продажи">Продажи</option>
              <option value="CRM Сделка">CRM Сделка</option>
              <option value="Финансы">Финансы</option>
              <option value="Расписание">Расписание</option>
              <option value="Документы">Документы</option>
              <option value="Учебный процесс">Учебный процесс</option>
              <option value="Retention">Retention</option>
              <option value="Продление">Продление</option>
              <option value="Оргвопрос">Оргвопрос</option>
            </select>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              Сохранить изменения
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
