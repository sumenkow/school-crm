'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, ListTodo, Calendar, Clock, AlertCircle } from 'lucide-react';
import { useFocusSync } from '@/hooks/useFocusSync';
import { cn } from '@/lib/utils';
import { FullTaskData } from '@/lib/data/mockData';
import { getStoredTasks, saveTaskToStorage } from '@/lib/data/taskStorage';
import { updateUnifiedTaskStatus } from '@/lib/data/taskManager';
import {
  calculateTasksKpis,
  deduplicateTasks,
  filterTasksByDirection,
  filterAndSortTasks,
  getTodayIso,
  DirectionalTab,
  TaskSortMode,
  TaskFilterCriteria,
  UserContext,
} from '@/features/tasks/lib/tasksWorkspaceEngine';
import { TasksKpiCards } from '@/components/tasks/TasksKpiCards';
import { TasksFilterBar } from '@/components/tasks/TasksFilterBar';
import { TaskRow } from '@/components/tasks/TaskRow';
import { TaskDetailPanel } from '@/components/tasks/TaskDetailPanel';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { CompleteTaskModal } from '@/components/tasks/CompleteTaskModal';
import { PostponeTaskModal } from '@/components/tasks/PostponeTaskModal';
import { EditTaskModal } from '@/components/tasks/EditTaskModal';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';

export default function TasksPage() {
  const { userName, role } = useRole();
  const toast = useToast();
  const { t } = useLanguage();

  // Primary data state
  const [tasks, setTasks] = useState<FullTaskData[]>([]);
  const [selectedTask, setSelectedTask] = useState<FullTaskData | null>(null);

  // Filter & Navigation state
  const [activeTab, setActiveTab] = useState<DirectionalTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [dueDateFilter, setDueDateFilter] = useState<'all' | 'today' | 'overdue' | 'week'>('all');
  const [sortMode, setSortMode] = useState<TaskSortMode>('priority');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [completingTask, setCompletingTask] = useState<FullTaskData | null>(null);
  const [postponingTask, setPostponingTask] = useState<FullTaskData | null>(null);
  const [editingTask, setEditingTask] = useState<FullTaskData | null>(null);

  const [kpiFilter, setKpiFilter] = useState<'all' | 'overdue' | 'today' | 'completed'>('all');

  const todayIso = useMemo(() => getTodayIso(), []);

  const userContext: UserContext = useMemo(
    () => ({
      userName: userName || undefined,
      role: role || undefined,
    }),
    [userName, role]
  );

  // SSOT loading & reactivity
  const loadTasks = useCallback(async () => {
    const list = await getStoredTasks();
    const deduped = deduplicateTasks(list);
    setTasks(deduped);
    setSelectedTask((prev) => {
      if (!prev) return deduped[0] || null;
      return deduped.find((t) => t.id === prev.id) || deduped[0] || null;
    });
  }, []);

  useFocusSync(loadTasks);

  useEffect(() => {
    loadTasks();
    window.addEventListener('crm-tasks-changed', loadTasks);
    return () => window.removeEventListener('crm-tasks-changed', loadTasks);
  }, [loadTasks]);

  // SSOT Invariant: Canonical deduplication
  const dedupedTasks = useMemo(() => deduplicateTasks(tasks), [tasks]);

  // Scope tasks according to role boundary (SET-13: teacher only sees assigned tasks)
  const scopedTasks = useMemo(() => {
    if (role === 'teacher') {
      const teacherNameLower = (userName || '').trim().toLowerCase();
      return dedupedTasks.filter((task) => {
        if (!task || task.status === 'cancelled') return false;
        if (task.assignedToUserId && userContext.userId && task.assignedToUserId === userContext.userId) return true;
        const assignedName = (task.assignedTo || '').trim().toLowerCase();
        if (teacherNameLower && (assignedName === teacherNameLower || assignedName.includes(teacherNameLower) || teacherNameLower.includes(assignedName))) return true;
        return false;
      });
    }
    return dedupedTasks;
  }, [role, dedupedTasks, userName, userContext.userId]);

  // Dynamic 4 KPI metrics calculated purely from SSOT engine
  const kpis = useMemo(() => calculateTasksKpis(scopedTasks, todayIso), [scopedTasks, todayIso]);

  // Tab counts calculated cleanly for strictly 3 directional tabs
  const tabCounts = useMemo(
    () => ({
      all: kpis.total,
      assigned_to_me: filterTasksByDirection(scopedTasks, 'assigned_to_me', userContext).length,
      created_by_me: role === 'teacher' ? 0 : filterTasksByDirection(dedupedTasks, 'created_by_me', userContext).length,
    }),
    [scopedTasks, dedupedTasks, kpis.total, role, userContext]
  );

  // Criteria for deterministic filtering and sorting
  const filterCriteria: TaskFilterCriteria = useMemo(
    () => ({
      tab: role === 'teacher' ? 'assigned_to_me' : activeTab,
      searchQuery,
      priority: priorityFilter,
      dueDate: dueDateFilter,
      sortMode,
      userContext,
    }),
    [role, activeTab, searchQuery, priorityFilter, dueDateFilter, sortMode, userContext]
  );

  const visibleTasks = useMemo(() => {
    if (kpiFilter === 'completed') {
      let completed = scopedTasks.filter((t) => t.status === 'done');
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        completed = completed.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.assignedTo.toLowerCase().includes(q)
        );
      }
      return completed;
    }
    return filterAndSortTasks(scopedTasks, filterCriteria, todayIso);
  }, [scopedTasks, filterCriteria, todayIso, kpiFilter, searchQuery]);

  const handleKpiFilterClick = (filter: 'all' | 'overdue' | 'today' | 'completed') => {
    setKpiFilter(filter);
    if (filter === 'overdue') {
      setDueDateFilter('overdue');
    } else if (filter === 'today') {
      setDueDateFilter('today');
    } else {
      setDueDateFilter('all');
    }
  };

  // ─── Actions & Lifecycle Handlers ──────────────────────────────────────────

  const handleTaskCreated = (newTask: FullTaskData) => {
    setTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)]);
    setSelectedTask(newTask);
    toast.success('Задача успешно создана');
  };

  const handleCompleteTask = async (
    taskId: string,
    completionResult: string,
    completedByName: string
  ) => {
    try {
      const updated = await updateUnifiedTaskStatus(taskId, 'done', {
        completionResult,
        performedBy: completedByName,
      });
      if (updated) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
        if (selectedTask?.id === taskId) {
          setSelectedTask(updated);
        }
      }
      toast.success('Задача выполнена!');
    } catch (err) {
      console.error('Failed to complete task:', err);
      toast.error('Ошибка при завершении задачи');
    }
  };

  const handleReopenTask = async (task: FullTaskData) => {
    try {
      const updated = await updateUnifiedTaskStatus(task.id, 'open', {
        performedBy: userName || 'Администратор',
      });
      if (updated) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
        if (selectedTask?.id === task.id) {
          setSelectedTask(updated);
        }
      }
      toast.success('Задача открыта заново');
    } catch (err) {
      console.error('Failed to reopen task:', err);
      toast.error('Ошибка при открытии задачи');
    }
  };

  const handlePostponeTask = async (
    taskId: string,
    newDueDate: string,
    rescheduledReason?: string
  ) => {
    try {
      const target = tasks.find((t) => t.id === taskId);
      const updated = await updateUnifiedTaskStatus(taskId, target?.status || 'open', {
        newDueDate,
        rescheduledReason,
        rescheduledBy: userName || 'Администратор',
      });
      if (updated) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
        if (selectedTask?.id === taskId) {
          setSelectedTask(updated);
        }
      }
      toast.success('Срок задачи перенесен');
    } catch (err) {
      console.error('Failed to postpone task:', err);
      toast.error('Ошибка при переносе срока');
    }
  };

  const handleSaveEditedTask = (updated: FullTaskData) => {
    saveTaskToStorage(updated);
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    if (selectedTask?.id === updated.id) {
      setSelectedTask(updated);
    }
    setEditingTask(null);
    toast.success('Задача обновлена');
  };

  const handleDeleteTask = async (task: FullTaskData) => {
    try {
      await updateUnifiedTaskStatus(task.id, 'cancelled', {
        performedBy: userName || 'Администратор',
      });
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      if (selectedTask?.id === task.id) {
        setSelectedTask(null);
      }
      toast.success('Задача удалена');
    } catch (err) {
      console.error('Failed to delete task:', err);
      toast.error('Ошибка при удалении задачи');
    }
  };

  const handlePriorityChange = async (taskId: string, newPriority: 'high' | 'medium' | 'low') => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;
    const updated = { ...target, priority: newPriority };
    saveTaskToStorage(updated);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    if (selectedTask?.id === taskId) {
      setSelectedTask(updated);
    }
    toast.success('Приоритет обновлен');
  };

  const handleAddComment = (taskId: string, commentText: string) => {
    if (!commentText.trim()) return;
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    const now = new Date();
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}.${String(
      now.getMonth() + 1
    ).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const newComment = {
      id: `c_${Date.now()}`,
      authorName: userName || 'Администратор',
      createdAt: dateFormatted,
      text: commentText.trim(),
    };

    const updatedTask = {
      ...target,
      comments: [...(target.comments || []), newComment],
    };

    saveTaskToStorage(updatedTask);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
    if (selectedTask?.id === taskId) {
      setSelectedTask(updatedTask);
    }
    toast.success('Комментарий добавлен');
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-0 px-6 pt-5 pb-6 text-slate-800 antialiased overflow-hidden">
      {/* ── 1. Page Header (R1) ── */}
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
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>{t('tasks.newTask', 'Новая задача')}</span>
        </button>
      </div>

      {/* ── 2. Upper 4 KPI Cards (R1) ── */}
      <TasksKpiCards kpis={kpis} activeFilter={kpiFilter} onFilterClick={handleKpiFilterClick} />

      {/* ── 3. Directional Tabs & Single-Line Control Bar (R2) ── */}
      <TasksFilterBar
        activeTab={activeTab}
        tabCounts={tabCounts}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        dueDateFilter={dueDateFilter}
        onDueDateChange={setDueDateFilter}
        sortMode={sortMode}
        onSortChange={setSortMode}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* ── 4. Main Workspace: Dense Task List + Right Detail Drawer (R3 & R4) ── */}
      <div className="flex flex-1 min-h-0 gap-4 overflow-hidden">
        {/* Left: Task Rows List / Calendar View */}
        <div className="flex-1 min-w-0 overflow-y-auto pr-1 space-y-2.5">
          {visibleTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 rounded-2xl border border-dashed border-slate-200 bg-white/50 text-slate-400">
              <ListTodo className="h-10 w-10 opacity-30" />
              <p className="text-xs font-medium">
                {searchQuery
                  ? 'Ничего не найдено по вашему запросу'
                  : 'Нет задач в выбранном направлении'}
              </p>
            </div>
          ) : viewMode === 'calendar' ? (
            <div className="space-y-4">
              {[
                {
                  id: 'overdue',
                  title: 'Просрочено',
                  color: 'text-rose-700 bg-rose-50 border-rose-200',
                  dot: 'bg-rose-500',
                  items: visibleTasks.filter((t) => {
                    if (t.status === 'done') return false;
                    const dIso = t.dueDate ? String(t.dueDate).slice(0, 10) : '';
                    return Boolean(
                      t.isOverdue ||
                        (dIso && dIso < todayIso) ||
                        (typeof t.dueDateFormatted === 'string' &&
                          t.dueDateFormatted.toLowerCase().includes('просрочено'))
                    );
                  }),
                },
                {
                  id: 'today',
                  title: 'Сегодня',
                  color: 'text-amber-800 bg-amber-50 border-amber-200',
                  dot: 'bg-amber-500',
                  items: visibleTasks.filter((t) => {
                    if (t.status === 'done') return false;
                    const dIso = t.dueDate ? String(t.dueDate).slice(0, 10) : '';
                    const isOver = Boolean(t.isOverdue || (dIso && dIso < todayIso));
                    return (
                      !isOver &&
                      (dIso === todayIso ||
                        (typeof t.dueDateFormatted === 'string' &&
                          t.dueDateFormatted.toLowerCase().includes('сегодня')))
                    );
                  }),
                },
                {
                  id: 'upcoming',
                  title: 'Ближайшие дни',
                  color: 'text-blue-700 bg-blue-50 border-blue-200',
                  dot: 'bg-blue-500',
                  items: visibleTasks.filter((t) => {
                    if (t.status === 'done') return false;
                    const dIso = t.dueDate ? String(t.dueDate).slice(0, 10) : '';
                    const isOver = Boolean(t.isOverdue || (dIso && dIso < todayIso));
                    const isTod =
                      dIso === todayIso ||
                      (typeof t.dueDateFormatted === 'string' &&
                        t.dueDateFormatted.toLowerCase().includes('сегодня'));
                    return !isOver && !isTod && Boolean(dIso);
                  }),
                },
                {
                  id: 'other',
                  title: 'Выполненные и без срока',
                  color: 'text-slate-700 bg-slate-50 border-slate-200',
                  dot: 'bg-slate-400',
                  items: visibleTasks.filter((t) => {
                    if (t.status === 'done') return true;
                    return !t.dueDate;
                  }),
                },
              ]
                .filter((group) => group.items.length > 0)
                .map((group) => (
                  <div key={group.id} className="space-y-2">
                    <div className={cn('inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-bold border', group.color)}>
                      <span className={cn('w-2 h-2 rounded-full', group.dot)} />
                      <span>{group.title}</span>
                      <span className="opacity-70">({group.items.length})</span>
                    </div>
                    <div className="space-y-2">
                      {group.items.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          isSelected={selectedTask?.id === task.id}
                          todayIso={todayIso}
                          onSelect={setSelectedTask}
                          onCompleteClick={setCompletingTask}
                          onReopenClick={handleReopenTask}
                          onEditClick={setEditingTask}
                          onPostponeClick={setPostponingTask}
                          onDeleteClick={handleDeleteTask}
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            visibleTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                isSelected={selectedTask?.id === task.id}
                todayIso={todayIso}
                onSelect={setSelectedTask}
                onCompleteClick={setCompletingTask}
                onReopenClick={handleReopenTask}
                onEditClick={setEditingTask}
                onPostponeClick={setPostponingTask}
                onDeleteClick={handleDeleteTask}
              />
            ))
          )}
        </div>

        {/* Right: Contextual Detail Panel */}
        {selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            todayIso={todayIso}
            onClose={() => setSelectedTask(null)}
            onCompleteClick={setCompletingTask}
            onReopenClick={handleReopenTask}
            onEditClick={setEditingTask}
            onPostponeClick={setPostponingTask}
            onPriorityChange={handlePriorityChange}
            onAddComment={handleAddComment}
          />
        )}
      </div>

      {/* ── 5. Context Modals ── */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleTaskCreated}
      />

      <CompleteTaskModal
        isOpen={!!completingTask}
        task={completingTask}
        onClose={() => setCompletingTask(null)}
        onComplete={handleCompleteTask}
      />

      <PostponeTaskModal
        isOpen={!!postponingTask}
        task={postponingTask}
        onClose={() => setPostponingTask(null)}
        onPostpone={handlePostponeTask}
      />

      {editingTask && (
        <EditTaskModal
          isOpen={!!editingTask}
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={handleSaveEditedTask}
        />
      )}
    </div>
  );
}
