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
  SlidersHorizontal,
  ArrowUpDown,
  ChevronRight,
  User,
  Calendar,
  AlertTriangle,
  ListTodo,
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

function getTaskPriorityScore(task: FullTaskData, todayIso: string): number {
  if (task.status === 'done' || task.status === 'cancelled') return 100;
  if (task.isOverdue) return 1;
  if (task.dueDate === todayIso) return 2;
  if (task.priority === 'high') return 3;
  if (task.createdByRole === 'owner') return 4;
  return 5;
}

function getHumanDate(task: FullTaskData, todayIso: string): { label: string; isUrgent: boolean } {
  const dueDate = task.dueDate || '';
  if (!dueDate) return { label: task.dueDateFormatted || '—', isUrgent: false };

  if (task.isOverdue && task.status !== 'done') {
    const parts = dueDate.split('-');
    const day = parts[2];
    const mon = parts[1];
    return { label: `Просрочено · ${day}.${mon}`, isUrgent: true };
  }
  if (dueDate === todayIso) {
    // Try to extract time from dueDateFormatted e.g. "Сегодня, 14:00" or just show "Сегодня"
    const timeMatch = task.dueDateFormatted?.match(/(\d{1,2}:\d{2})/);
    return { label: timeMatch ? `Сегодня, ${timeMatch[1]}` : 'Сегодня', isUrgent: false };
  }

  // Tomorrow?
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  if (dueDate === tomorrowIso) {
    const timeMatch = task.dueDateFormatted?.match(/(\d{1,2}:\d{2})/);
    return { label: timeMatch ? `Завтра, ${timeMatch[1]}` : 'Завтра', isUrgent: false };
  }

  const parts = dueDate.split('-');
  const day = parts[2];
  const mon = parts[1];
  return { label: `${day}.${mon}`, isUrgent: false };
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const { userName, role } = useRole();
  const toast = useToast();
  const { t } = useLanguage();

  const [tasks, setTasks] = useState<FullTaskData[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('priority');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<FullTaskData | null>(null);
  const [selectedTask, setSelectedTask] = useState<FullTaskData | null>(null);

  const todayIso = useMemo(() => getTodayIso(), []);

  const loadTasks = useCallback(async () => {
    const list = await getStoredTasks();
    setTasks(list);
  }, []);

  useFocusSync(loadTasks);

  useEffect(() => {
    loadTasks();
    window.addEventListener('crm-tasks-changed', loadTasks);
    return () => window.removeEventListener('crm-tasks-changed', loadTasks);
  }, [loadTasks]);

  const handleTaskCreated = (newTask: FullTaskData) => {
    setTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)]);
  };

  const handleToggleStatus = async (taskId: string) => {
    const currentTask = tasks.find((t) => t.id === taskId);
    const newStatus = currentTask?.status === 'done' ? 'open' : 'done';
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    setSelectedTask((prev) => (prev && prev.id === taskId ? { ...prev, status: newStatus } : prev));
    try {
      await updateUnifiedTaskStatus(taskId, newStatus, { performedBy: userName || 'Администратор' });
      toast.success(newStatus === 'done' ? 'Задача выполнена!' : 'Задача открыта заново');
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = tasks.filter((t) => t.status !== 'cancelled').length;
    const overdue = tasks.filter((t) => t.isOverdue && t.status !== 'done' && t.status !== 'cancelled').length;
    const today = tasks.filter((t) => t.dueDate === todayIso && t.status !== 'done' && t.status !== 'cancelled').length;
    const done = tasks.filter((t) => t.status === 'done').length;
    return { total, overdue, today, done };
  }, [tasks, todayIso]);

  // ─── Tab counts ─────────────────────────────────────────────────────────────
  const tabCounts = useMemo(() => ({
    overdue: stats.overdue,
    today: stats.today,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
  }), [tasks, stats]);

  // ─── Filtered + sorted tasks ────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    let list = tasks.filter((t) => t.status !== 'cancelled');

    // Tab filter
    switch (activeTab) {
      case 'my':
        list = list.filter((t) => t.assignedTo === userName);
        break;
      case 'from_owner':
        list = list.filter((t) => t.createdByRole === 'owner');
        break;
      case 'overdue':
        list = list.filter((t) => t.isOverdue && t.status !== 'done');
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
      // 'all' — no additional filter
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
        (t.assignedTo || '').toLowerCase().includes(q)
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
  }, [tasks, activeTab, searchQuery, sortMode, todayIso, userName]);

  // ─── Tabs config ─────────────────────────────────────────────────────────────
  const TABS: { key: ActiveTab; label: string; count?: number }[] = [
    { key: 'all', label: 'Все' },
    { key: 'my', label: 'Мои' },
    { key: 'from_owner', label: 'От владельца' },
    { key: 'overdue', label: 'Просроченные', count: tabCounts.overdue },
    { key: 'today', label: 'Сегодня', count: tabCounts.today },
    { key: 'in_progress', label: 'В работе', count: tabCounts.in_progress },
    { key: 'done', label: 'Выполненные' },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-0">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {t('tasks.title', 'Задачи и поручения')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('tasks.subtitle', 'Контроль договорённостей, горящих лидов и рабочих дел')}
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('tasks.newTask', 'Новая задача')}
        </button>
      </div>

      {/* ── Stats strip ── */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Всего', value: stats.total, color: 'text-slate-700' },
            { label: 'Просрочено', value: stats.overdue, color: stats.overdue > 0 ? 'text-rose-600' : 'text-slate-400' },
            { label: 'На сегодня', value: stats.today, color: stats.today > 0 ? 'text-amber-600' : 'text-slate-400' },
            { label: 'Выполнено', value: stats.done, color: 'text-emerald-600' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-100 bg-white px-4 py-2.5 shadow-xs flex items-center gap-3">
              <p className={cn('text-2xl font-bold tabular-nums leading-none', s.color)}>{s.value}</p>
              <span className="text-[11px] text-slate-500 font-medium leading-tight">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main panel ── */}
      <div className="flex flex-1 min-h-0 gap-0 px-6 pb-6">
        {/* Left: list */}
        <div className={cn(
          'flex flex-col min-h-0 flex-1 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all duration-200',
          selectedTask ? 'mr-3' : ''
        )}>
          {/* Filter bar */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 shrink-0">
            {/* Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap',
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={cn(
                      'ml-1.5 inline-flex items-center justify-center rounded-full min-w-[16px] h-4 px-1 text-[10px] font-bold',
                      activeTab === tab.key ? 'bg-white/30 text-white' : 'bg-rose-100 text-rose-700'
                    )}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search + sort */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск..."
                  className="h-8 w-44 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
                />
              </div>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 focus:outline-none focus:border-blue-400 cursor-pointer"
              >
                <option value="priority">Сначала важные</option>
                <option value="date_asc">По сроку ↑</option>
                <option value="date_desc">По сроку ↓</option>
              </select>
            </div>
          </div>

          {/* Task list */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
                <ListTodo className="h-10 w-10 opacity-30" />
                <p className="text-xs font-medium">
                  {searchQuery ? 'Ничего не найдено' : 'Нет задач в этой категории'}
                </p>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isDone = task.status === 'done';
                const isSelected = selectedTask?.id === task.id;
                const { label: dateLabel, isUrgent } = getHumanDate(task, todayIso);
                const isFromOwner = task.createdByRole === 'owner';

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(isSelected ? null : task)}
                    className={cn(
                      'group flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors select-none',
                      isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50/80',
                      isDone && 'opacity-60'
                    )}
                  >
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleToggleStatus(task.id); }}
                      className="mt-0.5 shrink-0 text-slate-300 hover:text-blue-600 transition-colors"
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" style={{ width: 18, height: 18 }} />
                      ) : (
                        <div className="h-[18px] w-[18px] rounded border-2 border-slate-300 group-hover:border-blue-500 transition-colors" />
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Line 1: title */}
                      <p className={cn(
                        'text-sm font-semibold leading-snug truncate',
                        isDone ? 'line-through text-slate-400' : 'text-slate-900'
                      )}>
                        {task.title}
                      </p>

                      {/* Line 2: meta */}
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                        {/* Type badge */}
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-[10px] text-slate-600 uppercase">
                          {task.taskType}
                        </span>

                        {/* Date */}
                        <span className={cn('font-medium', isUrgent ? 'text-rose-600' : 'text-slate-500')}>
                          {dateLabel}
                        </span>

                        {/* Entity links */}
                        {task.studentName && task.studentId && (
                          <Link
                            href={`/students/${task.studentId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            {task.studentName}
                          </Link>
                        )}
                        {task.leadName && task.leadId && (
                          <Link
                            href={`/crm/leads/${task.leadId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-purple-600 hover:underline font-medium"
                          >
                            {task.leadName}
                          </Link>
                        )}
                        {task.parentName && !task.studentName && (
                          <span className="text-slate-400">{task.parentName}</span>
                        )}

                        {/* Owner badge */}
                        {isFromOwner && (
                          <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                            От владельца
                          </span>
                        )}

                        {/* Assignee */}
                        <span className="text-slate-400">· {task.assignedTo}</span>
                      </div>
                    </div>

                    {/* Right: priority + edit */}
                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      {!isDone && (
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold',
                          task.priority === 'high' ? 'bg-rose-100 text-rose-700' :
                          task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        )}>
                          {task.priority === 'high' ? 'Срочно' : task.priority === 'medium' ? 'Средний' : 'Низкий'}
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingTask(task); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                        title="Изменить"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer count */}
          {filteredTasks.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2 shrink-0">
              <p className="text-[11px] text-slate-400">
                Показано {filteredTasks.length} {filteredTasks.length === 1 ? 'задача' : filteredTasks.length < 5 ? 'задачи' : 'задач'}
              </p>
            </div>
          )}
        </div>

        {/* Right: detail panel */}
        {selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            todayIso={todayIso}
            onClose={() => setSelectedTask(null)}
            onToggleStatus={handleToggleStatus}
            onEdit={(t) => { setSelectedTask(null); setEditingTask(t); }}
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
            saveTaskToStorage(updated);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Task Detail Panel ────────────────────────────────────────────────────────
function TaskDetailPanel({
  task,
  todayIso,
  onClose,
  onToggleStatus,
  onEdit,
}: {
  task: FullTaskData;
  todayIso: string;
  onClose: () => void;
  onToggleStatus: (id: string) => void;
  onEdit: (t: FullTaskData) => void;
}) {
  const isDone = task.status === 'done';
  const { label: dateLabel, isUrgent } = getHumanDate(task, todayIso);

  return (
    <div className="w-80 shrink-0 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 uppercase tracking-wide">
            {task.taskType}
          </span>
          <span className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-bold',
            isDone ? 'bg-emerald-100 text-emerald-700' :
            task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
            'bg-slate-100 text-slate-600'
          )}>
            {isDone ? 'Выполнено' : task.status === 'in_progress' ? 'В работе' : 'К выполнению'}
          </span>
          {task.createdByRole === 'owner' && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
              От владельца
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title */}
        <div>
          <h3 className={cn('text-sm font-bold text-slate-900 leading-snug', isDone && 'line-through text-slate-400')}>
            {task.title}
          </h3>
          {task.description && (
            <p className="mt-2 text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3 border border-slate-100">
              {task.description}
            </p>
          )}
        </div>

        {/* Priority */}
        <div className="flex items-center gap-2">
          <span className={cn(
            'rounded-full px-2.5 py-1 text-[11px] font-bold',
            task.priority === 'high' ? 'bg-rose-100 text-rose-700' :
            task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
            'bg-slate-100 text-slate-600'
          )}>
            {task.priority === 'high' ? '🔴 Срочно' : task.priority === 'medium' ? '🟡 Средний приоритет' : '⚪ Низкий приоритет'}
          </span>
        </div>

        {/* Details list */}
        <div className="space-y-2 text-xs rounded-xl bg-slate-50 border border-slate-100 p-3">
          <div className="flex items-start justify-between gap-2">
            <span className="text-slate-500 shrink-0">Срок:</span>
            <span className={cn('font-semibold text-right', isUrgent ? 'text-rose-600' : 'text-slate-800')}>
              {dateLabel}
            </span>
          </div>
          <div className="flex items-start justify-between gap-2">
            <span className="text-slate-500 shrink-0">Ответственный:</span>
            <span className="font-semibold text-slate-800 text-right">{task.assignedTo}</span>
          </div>
          {task.studentName && task.studentId && (
            <div className="flex items-start justify-between gap-2">
              <span className="text-slate-500 shrink-0">Ученик:</span>
              <Link href={`/students/${task.studentId}`} className="font-bold text-blue-600 hover:underline text-right">
                {task.studentName}
              </Link>
            </div>
          )}
          {task.parentName && (
            <div className="flex items-start justify-between gap-2">
              <span className="text-slate-500 shrink-0">Родитель:</span>
              <span className="font-semibold text-slate-800 text-right">{task.parentName}</span>
            </div>
          )}
          {task.leadName && task.leadId && (
            <div className="flex items-start justify-between gap-2">
              <span className="text-slate-500 shrink-0">Лид:</span>
              <Link href={`/crm/leads/${task.leadId}`} className="font-bold text-purple-600 hover:underline text-right">
                {task.leadName}
              </Link>
            </div>
          )}
          {task.completedAt && (
            <div className="flex items-start justify-between gap-2">
              <span className="text-slate-500 shrink-0">Выполнено:</span>
              <span className="font-semibold text-emerald-700 text-right">{task.completedAt}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="border-t border-slate-100 p-3 space-y-2">
        <button
          onClick={() => onToggleStatus(task.id)}
          className={cn(
            'w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-xs',
            isDone
              ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
          {isDone ? 'Вернуть в работу' : 'Отметить выполненной'}
        </button>
        <button
          onClick={() => onEdit(task)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
        >
          <Edit3 className="h-3.5 w-3.5" />
          Изменить задачу
        </button>
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
  const [taskType, setTaskType] = useState(task.taskType || 'CRM Сделка');
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority);
  const [assignedTo, setAssignedTo] = useState(task.assignedTo);
  const [dueDate, setDueDate] = useState(task.dueDate || '');
  const [status, setStatus] = useState(task.status);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Compute human-formatted date from ISO dueDate
    let dueDateFormatted = task.dueDateFormatted;
    if (dueDate) {
      const d = new Date(dueDate + 'T00:00:00');
      dueDateFormatted = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    // Compute isOverdue
    const todayIso = getTodayIso();
    const isOverdue = !!dueDate && dueDate < todayIso && status !== 'done';

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
              onChange={(e) => setTaskType(e.target.value as FullTaskData['taskType'])}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="CRM Сделка">CRM Сделка</option>
              <option value="Retention">Retention</option>
              <option value="Финансы">Финансы</option>
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
