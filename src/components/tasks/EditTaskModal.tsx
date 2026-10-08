'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { FullTaskData } from '@/lib/data/mockData';
import { getTodayIso } from '@/features/tasks/lib/tasksWorkspaceEngine';

export interface EditTaskModalProps {
  task: FullTaskData;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTask: FullTaskData) => void;
}

export function EditTaskModal({
  task,
  isOpen,
  onClose,
  onSave,
}: EditTaskModalProps) {
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
      if (dueDate.includes('-')) {
        const [y, m, d] = dueDate.slice(0, 10).split('-');
        dueDateFormatted = `${d}.${m}.${y}`;
      } else {
        dueDateFormatted = dueDate;
      }
    }

    const todayIso = getTodayIso();
    const isOverdue = Boolean(dueDate && dueDate < todayIso && status !== 'done');

    // Crucial: preserve ALL ADR-001 metadata and relations
    const updatedTask: FullTaskData = {
      ...task,
      title: title.trim(),
      taskType,
      description: description.trim(),
      priority,
      assignedTo: assignedTo.trim(),
      dueDate,
      dueDateFormatted,
      isOverdue,
      status,
    };

    onSave(updatedTask);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Изменить задачу</h3>
            <p className="text-xs text-slate-500">Редактирование параметров и статуса</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
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
                <option value="cancelled">Отменено</option>
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
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Сохранить изменения
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
