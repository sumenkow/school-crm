'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useFocusSync } from '@/hooks/useFocusSync';
import {
  Plus,
  CheckSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  User,
  Filter,
  Users,
  Search,
  ChevronRight,
  ArrowRight,
  Edit3,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FullTaskData } from '@/lib/data/mockData';
import { getStoredTasks, saveTaskToStorage } from '@/lib/data/taskStorage';
import { updateUnifiedTaskStatus } from '@/lib/data/taskManager';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';

export default function TasksPage() {
  const { userName } = useRole();
  const toast = useToast();
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<FullTaskData[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'overdue' | 'done'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'my'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<FullTaskData | null>(null);
  const [selectedTask, setSelectedTask] = useState<FullTaskData | null>(null);

  const loadTasks = useCallback(async () => {
    const list = await getStoredTasks();
    setTasks(list);
  }, []);

  useFocusSync(loadTasks);

  useEffect(() => {
    loadTasks();

    window.addEventListener('crm-tasks-changed', loadTasks);
    return () => {
      window.removeEventListener('crm-tasks-changed', loadTasks);
    };
  }, [loadTasks]);

  const handleTaskCreated = (newTask: FullTaskData) => {
    setTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)]);
  };

  const handleToggleStatus = async (taskId: string) => {
    const currentTask = tasks.find((t) => t.id === taskId);
    const newStatus = currentTask?.status === 'done' ? 'open' : 'done';

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    setSelectedTask((prev) =>
      prev && prev.id === taskId ? { ...prev, status: newStatus } : prev
    );

    try {
      await updateUnifiedTaskStatus(taskId, newStatus, {
        performedBy: userName || 'Администратор',
      });
      toast.success(newStatus === 'done' ? 'Задача выполнена!' : 'Задача открыта заново');
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    // Status filter
    if (statusFilter === 'open' && t.status !== 'open') return false;
    if (statusFilter === 'in_progress' && t.status !== 'in_progress') return false;
    if (statusFilter === 'done' && t.status !== 'done') return false;
    if (statusFilter === 'overdue' && !t.isOverdue) return false;

    // Priority filter
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;

    // Assignee filter
    if (assigneeFilter === 'my' && t.assignedTo !== 'Елена Менеджер') return false;

    return true;
  });

  const openTasksCount = tasks.filter((t) => t.status === 'open').length;
  const overdueCount = tasks.filter((t) => t.isOverdue && t.status !== 'done').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('tasks.title', 'Задачи и поручения')}</h1>
          <p className="text-sm text-slate-500">
            {t('tasks.subtitle', 'Контроль договоренностей с родителями, горящих лидов и рабочих дел команды')}
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('tasks.newTask', 'Новая задача')}
        </button>
      </div>

      {/* Overview stats strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">{t('tasks.filterOpen', 'Открытые задачи')}:</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{openTasksCount}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 shadow-xs">
          <span className="text-xs text-rose-700 font-medium">{t('tasks.filterOverdue', 'Просрочено')}:</span>
          <p className="text-2xl font-bold text-rose-700 mt-1">{overdueCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">{t('tasks.filterCompleted', 'Выполнено')}:</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{tasks.filter((t) => t.status === 'done').length}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
            {[
              { key: 'all', label: t('action.all', 'Все') },
              { key: 'open', label: t('tasks.filterOpen', 'К выполнению') },
              { key: 'overdue', label: `${t('tasks.filterOverdue', 'Просроченные')} (${overdueCount})` },
              { key: 'in_progress', label: t('tasks.filterInProgress', 'В работе') },
              { key: 'done', label: t('tasks.filterCompleted', 'Выполненные') },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key as 'all' | 'open' | 'done')}
                className={cn(
                  'rounded-lg px-3 py-1.5 transition-all',
                  statusFilter === tab.key
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 text-slate-500">
              <span>{t('tasks.priority', 'Приоритет')}:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as 'all' | 'high' | 'medium' | 'low')}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-none"
              >
                <option value="all">{t('action.all', 'Все')}</option>
                <option value="high">{t('tasks.priorityHigh', 'Срочные (High)')}</option>
                <option value="medium">{t('tasks.priorityMedium', 'Средние')}</option>
                <option value="low">{t('tasks.priorityLow', 'Низкие')}</option>
              </select>
            </div>

            <button
              onClick={() => setAssigneeFilter(assigneeFilter === 'all' ? 'my' : 'all')}
              className={cn(
                'rounded-lg px-2.5 py-1 font-semibold border transition-all',
                assigneeFilter === 'my' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {t('tasks.myTasks', 'Только мои')}
            </button>
          </div>
        </div>

        {/* Tasks List */}
        <div className="divide-y divide-slate-100">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              {t('tasks.empty', 'Нет задач, соответствующих выбранным фильтрам')}
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isDone = task.status === 'done';

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={cn(
                    'p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/90 transition-all cursor-pointer select-none group',
                    isDone && 'bg-slate-50/40 opacity-70'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(task.id);
                      }}
                      className="mt-0.5 shrink-0 text-slate-400 hover:text-blue-600 transition-colors"
                      title={isDone ? 'Вернуть в работу' : 'Отметить выполненной'}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-md border-2 border-slate-300 hover:border-blue-600 transition-colors" />
                      )}
                    </button>

                    <div className="space-y-1">
                      <h3 className={cn('text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors', isDone && 'line-through text-slate-400')}>
                        {task.title}
                      </h3>

                      {task.description && (
                        <p className="text-xs text-slate-600 line-clamp-2">{task.description}</p>
                      )}

                      {/* Linked entities badges */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-[10px] text-slate-700 uppercase">
                          {task.taskType}
                        </span>

                        {task.studentName && (
                          <Link
                            href={`/students/${task.studentId || '1'}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                          >
                            Ученик: {task.studentName}
                          </Link>
                        )}

                        {task.leadName && (
                          <Link
                            href={`/crm/leads/${task.leadId || 'lead1'}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 font-semibold text-purple-600 hover:underline"
                          >
                            Лид: {task.leadName}
                          </Link>
                        )}

                        {task.parentName && (
                          <span className="text-slate-400">
                            (Родитель: {task.parentName})
                          </span>
                        )}

                        <span>• Ответственный: <strong>{task.assignedTo}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Date & Priority */}
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1 pl-8 sm:pl-0 shrink-0">
                    <span
                      className={cn(
                        'text-xs font-bold',
                        task.isOverdue && !isDone ? 'text-rose-600' : 'text-slate-600'
                      )}
                    >
                      {task.dueDateFormatted}
                    </span>

                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[10px]',
                        isDone
                          ? 'bg-slate-100 text-slate-400 font-normal'
                          : task.priority === 'high'
                          ? 'bg-rose-100 text-rose-800 font-bold'
                          : task.priority === 'medium'
                          ? 'bg-amber-100 text-amber-800 font-bold'
                          : 'bg-slate-100 text-slate-700 font-bold'
                      )}
                    >
                      {isDone ? 'Выполнена' : task.priority === 'high' ? 'Срочно' : task.priority === 'medium' ? 'Средний' : 'Низкий'}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTask(task);
                      }}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors"
                    >
                      <Edit3 className="h-3 w-3" />
                      Изменить
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleTaskCreated}
      />

      {/* Edit Task Modal */}
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

      {/* Task Details Modal (Opens on clicking a task in the list) */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onToggleStatus={handleToggleStatus}
          onEdit={(taskToEdit) => {
            setSelectedTask(null);
            setEditingTask(taskToEdit);
          }}
        />
      )}
    </div>
  );
}

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
  const [dueDateFormatted, setDueDateFormatted] = useState(task.dueDateFormatted);
  const [status, setStatus] = useState(task.status);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...task,
      title,
      taskType,
      description,
      priority,
      assignedTo,
      dueDateFormatted,
      status,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Изменить задачу</h3>
            <p className="text-xs text-slate-500">Редактирование параметров и статуса задачи</p>
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
                onChange={(e) => setPriority(e.target.value as any)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                onChange={(e) => setStatus(e.target.value as any)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                type="text"
                value={dueDateFormatted}
                onChange={(e) => setDueDateFormatted(e.target.value)}
                placeholder="Сегодня, 15:00"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Ответственный</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Елена Менеджер">Елена Менеджер</option>
                <option value="Анна Админ">Анна Админ</option>
                <option value="Алексей Преподаватель">Алексей Преподаватель</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Тип задачи / Индикатор воронки</label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as any)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="CRM Сделка">CRM Сделка (Новые лиды, первичный контакт, запись на пробный)</option>
              <option value="Retention">Retention (Удержание, пропуски, забота о клиенте)</option>
              <option value="Финансы">Финансы (Оплата, контроль счетов и долгов)</option>
              <option value="Продление">Продление (Продление абонементов на след. период)</option>
              <option value="Оргвопрос">Оргвопрос (Материалы, расписание, администрирование)</option>
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              Этот индикатор определяет категорию задачи, правила воронки и фильтрацию в общем списке.
            </p>
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
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              Сохранить изменения
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskDetailsModal({
  task,
  isOpen,
  onClose,
  onToggleStatus,
  onEdit,
}: {
  task: FullTaskData;
  isOpen: boolean;
  onClose: () => void;
  onToggleStatus: (taskId: string) => void;
  onEdit: (task: FullTaskData) => void;
}) {
  if (!isOpen) return null;

  const isDone = task.status === 'done';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-[10px] text-slate-700 uppercase tracking-wider">
              {task.taskType}
            </span>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                task.priority === 'high' && 'bg-rose-100 text-rose-800',
                task.priority === 'medium' && 'bg-amber-100 text-amber-800',
                task.priority === 'low' && 'bg-slate-100 text-slate-700'
              )}
            >
              {task.priority === 'high' && 'Срочно'}
              {task.priority === 'medium' && 'Средний приоритет'}
              {task.priority === 'low' && 'Низкий приоритет'}
            </span>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[10px] font-bold border',
                isDone
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              )}
            >
              {isDone ? 'Выполнено' : task.status === 'in_progress' ? 'В работе' : 'К выполнению'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className={cn('text-base font-bold text-slate-900', isDone && 'line-through text-slate-400')}>
            {task.title}
          </h3>
          {task.description && (
            <p className="mt-2 text-xs text-slate-600 leading-relaxed rounded-xl bg-slate-50 p-3 border border-slate-100">
              {task.description}
            </p>
          )}
        </div>

        {/* Details Grid */}
        <div className="space-y-2 rounded-xl bg-slate-50/70 p-3.5 border border-slate-100 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Срок выполнения:</span>
            <span className={cn('font-bold', task.isOverdue && !isDone ? 'text-rose-600' : 'text-slate-800')}>
              {task.dueDateFormatted} {task.isOverdue && !isDone && '(Просрочено)'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Ответственный сотрудник:</span>
            <span className="font-semibold text-slate-800">{task.assignedTo}</span>
          </div>
          {task.studentName && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Ученик:</span>
              <Link
                href={`/students/${task.studentId || '1'}`}
                className="font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                {task.studentName} →
              </Link>
            </div>
          )}
          {task.parentName && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Родитель / Контакт:</span>
              <span className="font-semibold text-slate-800">{task.parentName}</span>
            </div>
          )}
          {task.leadName && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Лид (Сделка CRM):</span>
              <Link
                href={`/crm/leads/${task.leadId || 'lead1'}`}
                className="font-bold text-purple-600 hover:underline inline-flex items-center gap-1"
              >
                {task.leadName} →
              </Link>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onToggleStatus(task.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-xs',
              isDone
                ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            {isDone ? 'Вернуть в работу' : 'Отметить как выполненную'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Изменить
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
