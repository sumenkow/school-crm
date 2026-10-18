'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  X,
  Check,
  Edit3,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  User,
  Users,
  Send,
  CalendarClock,
  Phone,
  Tag,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { WhatsAppIcon, TelegramIcon } from '@/components/common/MessengerIcons';
import { cn, normalizePhone } from '@/lib/utils';
import { FullTaskData } from '@/lib/data/mockData';
import {
  getCardDateDisplay,
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
  onDeleteClick?: (task: FullTaskData) => void;
  onPriorityChange: (taskId: string, newPriority: 'high' | 'medium' | 'low') => void;
  onAddComment: (taskId: string, commentText: string) => void;
}

function getCategoryPillStyle(type?: string): string {
  if (!type) return 'bg-slate-100 text-slate-600 border-slate-200/60';
  const lower = type.toLowerCase();
  if (lower.includes('retention') || lower.includes('долг')) {
    return 'bg-rose-50 text-rose-600 border-rose-200/60';
  }
  if (lower.includes('финанс') || lower.includes('оплат')) {
    return 'bg-amber-50 text-amber-700 border-amber-200/60';
  }
  if (lower.includes('документ')) {
    return 'bg-blue-50 text-blue-600 border-blue-200/60';
  }
  if (lower.includes('звонк') || lower.includes('коммуникац')) {
    return 'bg-purple-50 text-purple-600 border-purple-200/60';
  }
  if (lower.includes('расписан') || lower.includes('урок')) {
    return 'bg-teal-50 text-teal-700 border-teal-200/60';
  }
  if (lower.includes('коммерческ') || lower.includes('пробн')) {
    return 'bg-sky-50 text-sky-700 border-sky-200/60';
  }
  return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
}

export function TaskDetailPanel({
  task,
  todayIso,
  onClose,
  onCompleteClick,
  onReopenClick,
  onEditClick,
  onPostponeClick,
  onDeleteClick,
  onPriorityChange,
  onAddComment,
}: TaskDetailPanelProps) {
  const [commentInput, setCommentInput] = useState('');
  const [activeTab, setActiveTab] = useState<'comments' | 'history'>('comments');
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    }
    if (moreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [moreMenuOpen]);

  const isDone = task.status === 'done';
  const dateInfo = getCardDateDisplay(task, todayIso);

  const isOverdue = Boolean(
    !isDone &&
      (task.isOverdue ||
        (task.dueDate && String(task.dueDate).slice(0, 10) < todayIso) ||
        (typeof task.dueDateFormatted === 'string' &&
          task.dueDateFormatted.toLowerCase().includes('просрочено')))
  );

  const isFromOwner = Boolean(
    task.createdByRole === 'owner' ||
    task.title.toLowerCase().includes('владелец') ||
    (task.description || '').toLowerCase().includes('владелец') ||
    task.createdByName?.toLowerCase().includes('владелец')
  );

  const creatorAttribution = task.createdByName
    ? task.createdByName
    : isFromOwner
    ? 'Владелец школы'
    : 'Администратор';

  const comments = task.comments || [];

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    onAddComment(task.id, commentInput.trim());
    setCommentInput('');
  };

  // Dynamic date formatting in Russian (e.g. "16 сентября 2026 г.")
  let formattedDueDate = 'Срок не указан';
  if (task.dueDate) {
    const dt = new Date(task.dueDate + 'T00:00:00');
    if (!isNaN(dt.getTime())) {
      formattedDueDate = dt.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }) + (dt.toLocaleDateString('ru-RU').includes('г.') ? '' : ' г.');
    } else {
      formattedDueDate = task.dueDate;
    }
  } else if (task.dueDateFormatted) {
    formattedDueDate = task.dueDateFormatted;
  }

  const cleanParentPhone = normalizePhone(task.parentPhone);
  const initials = getInitials(task.assignedTo);

  return (
    <div className="w-full lg:w-[370px] xl:w-[380px] shrink-0 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col h-full overflow-hidden animate-in slide-in-from-right-4 duration-200">
      {/* ── 1. Header: Status Pill + Date + Close ── */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2">
          {isDone ? (
            <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          ) : isOverdue ? (
            <div className="w-5 h-5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
          )}

          <span
            className={cn(
              'rounded-md px-2 py-0.5 text-xs font-semibold leading-none border',
              isDone
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                : isOverdue
                ? 'bg-rose-50 text-rose-600 border-rose-200'
                : task.status === 'in_progress'
                ? 'bg-blue-50 text-blue-600 border-blue-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            )}
          >
            {isDone
              ? 'Выполнено'
              : isOverdue
              ? 'Просрочено'
              : task.status === 'in_progress'
              ? 'В работе'
              : 'Запланировано'}
          </span>
          <span className="text-xs text-slate-500 font-medium truncate">
            {formattedDueDate}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Закрыть панель"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── 2. Scrollable Body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
        {/* Title & Subtitle */}
        <div>
          <h2
            className={cn(
              'text-base font-bold text-slate-900 leading-snug',
              isDone && 'line-through text-slate-400'
            )}
          >
            {task.title}
          </h2>

          {task.description && (
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {task.description.split('\n')[0]}
            </p>
          )}
        </div>

        {/* Action Buttons: 3 buttons row (✓ Завершить | ✎ Изменить | ···) */}
        <div className="flex items-center gap-2 pt-1 pb-3 border-b border-slate-100">
          {isDone ? (
            <button
              type="button"
              onClick={() => onReopenClick(task)}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Вернуть в работу</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onCompleteClick(task)}
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Завершить</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onEditClick(task)}
            className="py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            <span>Изменить</span>
          </button>

          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setMoreMenuOpen((prev) => !prev)}
              className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              title="Дополнительные действия"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {moreMenuOpen && (
              <div
                className="absolute right-0 top-10 z-30 w-44 rounded-xl bg-white border border-slate-200 shadow-lg py-1 text-xs text-slate-700 animate-in fade-in duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    onPostponeClick(task);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 font-medium text-slate-700 transition-colors cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span>Перенести срок</span>
                </button>
                {onDeleteClick && (
                  <>
                    <div className="h-px bg-slate-100 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        onDeleteClick(task);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-rose-50 flex items-center gap-2 font-medium text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Удалить</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Completion Result Box (when done) */}
        {isDone && (
          <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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
            <p className="text-xs text-slate-800 font-medium leading-relaxed bg-white/90 p-2.5 rounded-lg border border-emerald-100">
              {task.completionResult || task.result || 'Задача успешно завершена.'}
            </p>
            {(task.completedByName || task.completedBy) && (
              <p className="text-[11px] text-emerald-700 font-medium">
                Выполнил:{' '}
                <span className="font-bold">
                  {task.completedByName || task.completedBy}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Properties List (clean key-value rows matching reference) */}
        <div className="py-1 space-y-2.5 text-xs border-b border-slate-100">
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
                onChange={(e) =>
                  onPriorityChange(task.id, e.target.value as 'high' | 'medium' | 'low')
                }
                className="font-semibold text-slate-800 bg-transparent border-0 focus:ring-0 cursor-pointer pr-1 text-xs"
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
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{formattedDueDate}</span>
            </div>
          </div>

          {/* Assignee */}
          <div className="flex items-start justify-between">
            <span className="text-slate-400 w-28 pt-0.5">Ответственный</span>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center border border-blue-200/60">
                  {initials}
                </div>
                <span className="font-semibold text-slate-800">{task.assignedTo}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Поставил: {creatorAttribution}
              </p>
            </div>
          </div>

          {/* Category */}
          {task.taskType && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 w-28">Категория</span>
              <span
                className={cn(
                  'rounded px-2 py-0.5 text-[11px] font-semibold border leading-none',
                  getCategoryPillStyle(task.taskType)
                )}
              >
                {task.taskType}
              </span>
            </div>
          )}

          {/* Postponements */}
          {task.postponeCount !== undefined && task.postponeCount > 0 && (
            <div className="flex items-start justify-between">
              <span className="text-slate-400 w-28 pt-0.5">Переносы</span>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                  <CalendarClock className="w-3.5 h-3.5" />
                  Переносилось: {task.postponeCount} раз
                </span>
                {task.rescheduledReason && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {task.rescheduledReason}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Description Section */}
        <div className="py-1 border-b border-slate-100">
          <h4 className="text-xs font-bold text-slate-900 mb-1.5">Описание</h4>
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

        {/* Linked Entities Section */}
        {(task.studentName || task.parentName || task.leadName || task.tag) && (
          <div className="py-1 space-y-2 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 mb-1.5">
              Связанные сущности
            </h4>

            {/* Student Card */}
            {task.studentName && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-slate-100/60 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    {task.studentId ? (
                      <Link
                        href={`/students/${task.studentId}`}
                        className="font-bold text-xs text-slate-900 hover:text-blue-600 hover:underline truncate block"
                      >
                        {task.studentName}
                      </Link>
                    ) : (
                      <span className="font-bold text-xs text-slate-900 truncate block">
                        {task.studentName}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Ученик
                    </span>
                  </div>
                </div>
                {task.studentId ? (
                  <Link href={`/students/${task.studentId}`} className="text-slate-400 hover:text-slate-600 p-1">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                )}
              </div>
            )}

            {/* Parent Card with Call, WhatsApp and Telegram quick actions */}
            {task.parentName && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-slate-100/60 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-slate-900 truncate block">
                      {task.parentName}
                    </span>
                    {task.parentPhone ? (
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Родитель · {task.parentPhone}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Родитель
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {task.parentPhone && (
                    <>
                      <a
                        href={`tel:${task.parentPhone}`}
                        className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors shadow-2xs"
                        title="Позвонить родителю"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={`https://wa.me/${cleanParentPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors shadow-2xs"
                        title="WhatsApp"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                      </a>
                      <a
                        href={`https://t.me/+${cleanParentPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-600 flex items-center justify-center transition-colors shadow-2xs"
                        title="Telegram"
                      >
                        <TelegramIcon className="w-3.5 h-3.5 text-sky-600" />
                      </a>
                    </>
                  )}
                  {task.parentId ? (
                    <Link href={`/parents/${task.parentId}`} className="text-slate-400 hover:text-slate-600 p-1">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  )}
                </div>
              </div>
            )}

            {/* Lead Card */}
            {task.leadName && !task.studentName && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-slate-100/60 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    {task.leadId ? (
                      <Link
                        href={`/crm/leads/${task.leadId}`}
                        className="font-bold text-xs text-slate-900 hover:text-purple-600 hover:underline truncate block"
                      >
                        {task.leadName}
                      </Link>
                    ) : (
                      <span className="font-bold text-xs text-slate-900 truncate block">
                        {task.leadName}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Лид CRM
                    </span>
                  </div>
                </div>
                {task.leadId ? (
                  <Link href={`/crm/leads/${task.leadId}`} className="text-slate-400 hover:text-slate-600 p-1">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                )}
              </div>
            )}

            {/* Tag / Context */}
            {task.tag && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
                <Tag className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="font-semibold text-slate-800">{task.tag}</span>
                {task.subTag && (
                  <span className="text-slate-400 font-normal">· {task.subTag}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Comments & History Tabs */}
        <div className="pt-1 flex flex-col space-y-3">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-2">
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
              Комментарии {comments.length}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={cn(
                'text-xs font-semibold transition-colors cursor-pointer',
                activeTab === 'history'
                  ? 'text-blue-600 border-b-2 border-blue-600 pb-1 -mb-2.5'
                  : 'text-slate-400 hover:text-slate-600'
              )}
            >
              История
            </button>
          </div>

          {activeTab === 'comments' ? (
            <div className="space-y-3">
              {/* Comment Input */}
              <form onSubmit={handleSendComment} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0 border border-blue-200/60">
                  {initials}
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
                  className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer shadow-2xs"
                  title="Отправить"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Comments List */}
              <div className="space-y-3 pt-1">
                {comments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-3">
                    Нет комментариев
                  </p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[9px] flex items-center justify-center shrink-0">
                            {getInitials(c.authorName)}
                          </div>
                          <span className="font-semibold text-slate-900">{c.authorName}</span>
                          <span className="text-[10px] text-slate-400">{c.createdAt}</span>
                        </div>
                        <span className="text-slate-400 text-xs cursor-pointer hover:text-slate-600">···</span>
                      </div>
                      <p className="text-slate-600 mt-1 pl-6 leading-relaxed">
                        {c.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 space-y-2 pt-1">
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
    </div>
  );
}
