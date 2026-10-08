'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  X,
  Check,
  Edit3,
  MoreHorizontal,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  User,
  Users,
  Send,
  CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FullTaskData } from '@/lib/data/mockData';
import {
  getCardDateDisplay,
  getCategoryBadgeStyle,
  getInitials,
} from '@/features/tasks/lib/tasksWorkspaceEngine';

export interface TaskDetailPanelProps {
  task: FullTaskData;
  todayIso: string;
  onClose: () => void;
  onCompleteClick: (task: FullTaskData) => void;
  onReopenClick: (task: FullTaskData) => void;
  onEditClick: (task: FullTaskData) => void;
  onPostponeClick: (task: FullTaskData) => void;
  onPriorityChange: (taskId: string, newPriority: 'high' | 'medium' | 'low') => void;
  onAddComment: (taskId: string, commentText: string) => void;
}

export function TaskDetailPanel({
  task,
  todayIso,
  onClose,
  onCompleteClick,
  onReopenClick,
  onEditClick,
  onPostponeClick,
  onPriorityChange,
  onAddComment,
}: TaskDetailPanelProps) {
  const [commentInput, setCommentInput] = useState('');
  const [activeTab, setActiveTab] = useState<'comments' | 'history'>('comments');
  const [menuOpen, setMenuOpen] = useState(false);

  const isDone = task.status === 'done';
  const dateInfo = getCardDateDisplay(task, todayIso);

  const isFromOwner = Boolean(
    task.createdByRole === 'owner' ||
    task.title.toLowerCase().includes('владелец') ||
    (task.description || '').toLowerCase().includes('владелец') ||
    task.createdByName?.toLowerCase().includes('владелец')
  );

  const creatorAttribution = task.createdByName
    ? `Поставил: ${task.createdByName}`
    : isFromOwner
    ? 'Поставил: Владелец школы'
    : 'Поставил: Администратор';

  const comments = task.comments || [];

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    onAddComment(task.id, commentInput.trim());
    setCommentInput('');
  };

  // Dynamic date formatting
  let formattedDueDate = 'Срок не указан';
  if (task.dueDate) {
    const dt = new Date(task.dueDate + 'T00:00:00');
    if (!isNaN(dt.getTime())) {
      formattedDueDate = dt.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } else {
      formattedDueDate = task.dueDate;
    }
  } else if (task.dueDateFormatted) {
    formattedDueDate = task.dueDateFormatted;
  }

  return (
    <div className="w-[390px] shrink-0 bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col h-full shadow-2xs overflow-y-auto animate-in slide-in-from-right-4 duration-200">
      {/* 1. Header: Status badge pill + Date + Close */}
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
            {formattedDueDate}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Title */}
      <h2
        className={cn(
          'text-base font-bold text-slate-900 mt-2 leading-snug',
          isDone && 'line-through text-slate-400'
        )}
      >
        {task.title}
      </h2>

      {/* 3. Description preview */}
      {task.description && (
        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
          {task.description.split('\n')[0]}
        </p>
      )}

      {/* 4. Action Buttons */}
      <div className="flex items-center gap-2 mt-4 pt-1 pb-3 border-b border-slate-100 shrink-0 relative">
        {isDone ? (
          <button
            type="button"
            onClick={() => onReopenClick(task)}
            className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Вернуть в работу</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onCompleteClick(task)}
            className="flex-1 py-1.5 px-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Завершить</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onEditClick(task)}
          className="py-1.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Изменить</span>
        </button>

        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-12 z-20 w-44 rounded-xl bg-white border border-slate-200 shadow-lg py-1 text-xs text-slate-700">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onPostponeClick(task);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 font-medium text-slate-700 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>Перенести срок</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. MANDATORY Completion Result Block (R4) */}
      {isDone && (
        <div className="my-3 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-1.5 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Результат выполнения
            </span>
            {task.completedAt && (
              <span className="text-[10px] text-emerald-700 font-medium">
                {new Date(task.completedAt).toLocaleDateString('ru-RU', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-800 font-medium leading-relaxed bg-white/80 p-2 rounded-lg border border-emerald-100">
            {task.completionResult || task.result || 'Задача успешно завершена.'}
          </p>
          {(task.completedByName || task.completedBy) && (
            <p className="text-[10px] text-emerald-700">
              Выполнил:{' '}
              <span className="font-bold">
                {task.completedByName || task.completedBy}
              </span>
            </p>
          )}
        </div>
      )}

      {/* 6. Meta Properties Section */}
      <div className="py-3 space-y-3 text-xs border-b border-slate-100 shrink-0">
        {/* Priority */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 w-28">Приоритет</span>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                task.priority === 'high'
                  ? 'bg-rose-500'
                  : task.priority === 'medium'
                  ? 'bg-amber-400'
                  : 'bg-slate-400'
              )}
            />
            <select
              value={task.priority}
              onChange={(e) => onPriorityChange(task.id, e.target.value as 'high' | 'medium' | 'low')}
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
            <span>{formattedDueDate}</span>
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
            <p className="text-[10px] text-slate-400 mt-0.5">{creatorAttribution}</p>
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
        {(task.studentName || task.parentName || task.leadName || task.tag) && (
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
                      <span className="font-bold text-slate-900 leading-none block">
                        {task.studentName}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 leading-none mt-0.5 block">
                      Ученик
                    </span>
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
                    <span className="font-bold text-slate-900 leading-none block">
                      {task.parentName}
                    </span>
                    {task.parentPhone ? (
                      <span className="text-[10px] text-slate-400 leading-none mt-0.5 block">
                        Родитель ·{' '}
                        <a href={`tel:${task.parentPhone}`} className="hover:underline">
                          {task.parentPhone}
                        </a>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 leading-none mt-0.5 block">
                        Родитель
                      </span>
                    )}
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
                      <span className="font-bold text-slate-900 leading-none block">
                        {task.leadName}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 leading-none mt-0.5 block">
                      Лид CRM
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tag */}
            {task.tag && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 leading-none block">
                      {task.tag}
                    </span>
                    {task.subTag && (
                      <span className="text-[10px] text-slate-400 leading-none mt-0.5 block">
                        {task.subTag}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 7. Structured Description Section */}
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

      {/* 8. Comments & History (Timeline) Section */}
      <div className="pt-3 flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-2 mb-3">
          <button
            type="button"
            onClick={() => setActiveTab('comments')}
            className={cn(
              'text-xs font-bold transition-colors cursor-pointer',
              activeTab === 'comments'
                ? 'text-blue-600 border-b-2 border-blue-600 pb-1 -mb-2.5'
                : 'text-slate-400 hover:text-slate-600'
            )}
          >
            Комментарии{' '}
            {comments.length > 0 && (
              <span className="ml-1 rounded-full bg-slate-100 text-slate-700 px-1.5 py-0.2 text-[10px]">
                {comments.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={cn(
              'text-xs font-bold transition-colors cursor-pointer',
              activeTab === 'history'
                ? 'text-blue-600 border-b-2 border-blue-600 pb-1 -mb-2.5'
                : 'text-slate-400 hover:text-slate-600'
            )}
          >
            История
          </button>
        </div>

        {activeTab === 'comments' ? (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Comment Form */}
            <form onSubmit={handleSendComment} className="flex items-center gap-2 mb-3 shrink-0">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                {getInitials(task.assignedTo)}
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

            {/* Comments List */}
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
              <span className="text-[10px] text-slate-400">{formattedDueDate}</span>
            </div>

            {task.postponeCount !== undefined && task.postponeCount > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                <span className="font-semibold text-amber-800 flex items-center gap-1 block">
                  <CalendarClock className="w-3.5 h-3.5" />
                  Срок перенесен ({task.postponeCount} раз)
                </span>
                {task.rescheduledReason && (
                  <p className="text-[11px] text-amber-900 mt-0.5">
                    Причина: {task.rescheduledReason}
                  </p>
                )}
                {task.rescheduledAt && (
                  <span className="text-[10px] text-amber-600 block mt-0.5">
                    {new Date(task.rescheduledAt).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            )}

            {task.completedAt && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="font-semibold text-emerald-800 block">Отмечена выполненной</span>
                <span className="text-[10px] text-emerald-600">{task.completedAt}</span>
                {task.completionResult && (
                  <p className="text-[11px] text-emerald-900 mt-0.5">
                    Результат: {task.completionResult}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
