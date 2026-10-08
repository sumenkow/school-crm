'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, ListTodo } from 'lucide-react';
import { useFocusSync } from '@/hooks/useFocusSync';
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

  // Dynamic 4 KPI metrics calculated purely from SSOT engine
  const kpis = useMemo(() => calculateTasksKpis(dedupedTasks, todayIso), [dedupedTasks, todayIso]);

  // Tab counts calculated cleanly for strictly 3 directional tabs
  const tabCounts = useMemo(
    () => ({
      all: kpis.total,
      assigned_to_me: filterTasksByDirection(dedupedTasks, 'assigned_to_me', userContext).length,
      created_by_me: filterTasksByDirection(dedupedTasks, 'created_by_me', userContext).length,
    }),
    [dedupedTasks, kpis.total, userContext]
  );

  // Criteria for deterministic filtering and sorting
  const filterCriteria: TaskFilterCriteria = useMemo(
    () => ({
      tab: activeTab,
      searchQuery,
      priority: priorityFilter,
      dueDate: dueDateFilter,
      sortMode,
      userContext,
    }),
    [activeTab, searchQuery, priorityFilter, dueDateFilter, sortMode, userContext]
  );

  const visibleTasks = useMemo(
    () => filterAndSortTasks(dedupedTasks, filterCriteria, todayIso),
    [dedupedTasks, filterCriteria, todayIso]
  );

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
      <TasksKpiCards kpis={kpis} />

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
        {/* Left: Task Rows List */}
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
