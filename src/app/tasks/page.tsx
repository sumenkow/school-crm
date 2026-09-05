'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { INITIAL_TASKS, FullTaskData } from '@/lib/data/mockData';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';

export default function TasksPage() {
  const [tasks, setTasks] = useState<FullTaskData[]>(INITIAL_TASKS);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'overdue' | 'done'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'my'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleTaskCreated = (newTask: FullTaskData) => {
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleToggleStatus = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const newStatus = t.status === 'done' ? 'open' : 'done';
        return { ...t, status: newStatus };
      })
    );
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Задачи и поручения</h1>
          <p className="text-sm text-slate-500">
            Контроль договоренностей с родителями, горящих лидов и рабочих дел команды
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          + Новая задача
        </button>
      </div>

      {/* Overview stats strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Открытые задачи:</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{openTasksCount}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 shadow-xs">
          <span className="text-xs text-rose-700 font-medium">Просрочено:</span>
          <p className="text-2xl font-bold text-rose-700 mt-1">{overdueCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Выполнено:</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{tasks.filter((t) => t.status === 'done').length}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
            {[
              { key: 'all', label: 'Все' },
              { key: 'open', label: 'К выполнению' },
              { key: 'overdue', label: `Просроченные (${overdueCount})` },
              { key: 'in_progress', label: 'В работе' },
              { key: 'done', label: 'Выполненные' },
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
              <span>Приоритет:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as 'all' | 'high' | 'medium' | 'low')}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 focus:outline-none"
              >
                <option value="all">Все</option>
                <option value="high">Срочные (High)</option>
                <option value="medium">Средние</option>
                <option value="low">Низкие</option>
              </select>
            </div>

            <button
              onClick={() => setAssigneeFilter(assigneeFilter === 'all' ? 'my' : 'all')}
              className={cn(
                'rounded-lg px-2.5 py-1 font-semibold border transition-all',
                assigneeFilter === 'my' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              Только мои
            </button>
          </div>
        </div>

        {/* Tasks List */}
        <div className="divide-y divide-slate-100">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Нет задач, соответствующих выбранным фильтрам
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isDone = task.status === 'done';

              return (
                <div
                  key={task.id}
                  className={cn(
                    'p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/80 transition-colors',
                    isDone && 'bg-slate-50/40 opacity-70'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(task.id)}
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
                      <h3 className={cn('text-sm font-bold text-slate-900', isDone && 'line-through text-slate-400')}>
                        {task.title}
                      </h3>

                      {task.description && (
                        <p className="text-xs text-slate-600">{task.description}</p>
                      )}

                      {/* Linked entities badges */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-[10px] text-slate-700 uppercase">
                          {task.taskType}
                        </span>

                        {task.studentName && (
                          <Link
                            href={`/students/${task.studentId || '1'}`}
                            className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                          >
                            Ученик: {task.studentName}
                          </Link>
                        )}

                        {task.leadName && (
                          <Link
                            href={`/crm/leads/${task.leadId || 'lead1'}`}
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
                        'rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                        task.priority === 'high' && 'bg-rose-100 text-rose-800',
                        task.priority === 'medium' && 'bg-amber-100 text-amber-800',
                        task.priority === 'low' && 'bg-slate-100 text-slate-700'
                      )}
                    >
                      {task.priority === 'high' && 'Срочно'}
                      {task.priority === 'medium' && 'Средний'}
                      {task.priority === 'low' && 'Низкий'}
                    </span>
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
    </div>
  );
}
