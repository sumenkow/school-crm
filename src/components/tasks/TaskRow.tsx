'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Check,
  MoreHorizontal,
  Edit3,
  Calendar,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FullTaskData } from '@/lib/data/mockData';
import {
  getInitials,
} from '@/features/tasks/lib/tasksWorkspaceEngine';

export interface TaskRowProps {
  task: FullTaskData;
  isSelected: boolean;
  todayIso: string;
  onSelect: (task: FullTaskData) => void;
  onCompleteClick: (task: FullTaskData) => void;
  onReopenClick: (task: FullTaskData) => void;
  onEditClick: (task: FullTaskData) => void;
  onPostponeClick: (task: FullTaskData) => void;
  onDeleteClick: (task: FullTaskData) => void;
}

function getAvatarColor(initials: string): string {
  const hash = initials.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-sky-100 text-sky-700',
    'bg-teal-100 text-teal-700',
    'bg-indigo-100 text-indigo-700',
  ];
  return colors[hash % colors.length];
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

function formatCompactDueDate(dueDate?: string, dueDateFormatted?: string): string {
  if (!dueDate) {
    if (dueDateFormatted && !dueDateFormatted.toLowerCase().includes('просрочено') && !dueDateFormatted.toLowerCase().includes('сегодня')) {
      return dueDateFormatted;
    }
    return '—';
  }
  const iso = String(dueDate).slice(0, 10);
  const parts = iso.split('-');
  if (parts.length === 3) {
    const [, month, day] = parts;
    return `${day}.${month}`;
  }
  return dueDate;
}

export const TASK_TABLE_GRID_STYLE: React.CSSProperties = {
  gridTemplateColumns: '32px minmax(0, 1fr) 96px 136px 52px 80px 28px',
};

export function TaskTableHeader() {
  return (
    <div
      role="row"
      style={TASK_TABLE_GRID_STYLE}
      className="grid items-center px-3.5 h-9 select-none text-xs font-medium text-slate-500 border-b border-slate-200/80 bg-white shrink-0 sticky top-0 z-20 shadow-2xs"
    >
      <div role="columnheader" className="flex items-center justify-start">
        <div
          className="w-[18px] h-[18px] rounded-[5px] border border-slate-300 bg-white flex items-center justify-center select-none"
          aria-hidden="true"
        />
      </div>
      <div role="columnheader" className="pr-3 text-left font-medium text-slate-500 min-w-0">
        Задача
      </div>
      <div role="columnheader" className="text-left font-medium text-slate-500 min-w-0">
        Статус
      </div>
      <div role="columnheader" className="text-left font-medium text-slate-500 min-w-0">
        Ответственный
      </div>
      <div role="columnheader" className="text-left font-medium text-slate-500 min-w-0">
        Срок
      </div>
      <div role="columnheader" className="text-left font-medium text-slate-500 min-w-0">
        Приоритет
      </div>
      <div role="columnheader" className="text-right" aria-label="Действия" />
    </div>
  );
}

export function TaskRow({
  task,
  isSelected,
  todayIso,
  onSelect,
  onCompleteClick,
  onReopenClick,
  onEditClick,
  onPostponeClick,
  onDeleteClick,
}: TaskRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const isDone = task.status === 'done';

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
    ? `Поставил: ${task.createdByName}`
    : isFromOwner
    ? 'Поставил: Владелец школы'
    : 'Моя задача';

  // Semantic status badge matching reference
  let statusBadge = {
    label: 'Запланировано',
    className: 'bg-slate-100 text-slate-600 border-slate-200/80',
  };

  if (isDone) {
    statusBadge = {
      label: 'Выполнено',
      className: 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
    };
  } else if (isOverdue) {
    statusBadge = {
      label: 'Просрочено',
      className: 'bg-rose-50 text-rose-600 border-rose-200/80',
    };
  } else if (task.status === 'in_progress') {
    statusBadge = {
      label: 'В работе',
      className: 'bg-blue-50 text-blue-600 border-blue-200/80',
    };
  }

  const initials = getInitials(task.assignedTo);
  const avatarColor = getAvatarColor(initials);
  const compactDate = formatCompactDueDate(task.dueDate, task.dueDateFormatted);

  return (
    <div
      role="row"
      aria-selected={isSelected}
      onClick={() => onSelect(task)}
      style={TASK_TABLE_GRID_STYLE}
      className={cn(
        'group relative grid items-center px-3.5 py-1.5 min-h-[54px] transition-colors cursor-pointer border-b border-slate-100 last:border-b-0',
        isSelected
          ? 'bg-blue-50/50 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3.5px] before:bg-blue-600 before:rounded-r-sm'
          : 'bg-white hover:bg-slate-50/80'
      )}
    >
      {/* 1. Completion Checkbox */}
      <div role="cell" className="flex items-center justify-start">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isDone) {
              onReopenClick(task);
            } else {
              onCompleteClick(task);
            }
          }}
          className="transition-colors cursor-pointer"
          title={isDone ? 'Вернуть в работу' : 'Отметить выполненной'}
        >
          {isDone ? (
            <div className="w-[18px] h-[18px] rounded-[5px] bg-emerald-500 border border-emerald-500 text-white flex items-center justify-center shadow-2xs">
              <Check className="h-3 w-3 stroke-[3]" />
            </div>
          ) : (
            <div className="w-[18px] h-[18px] rounded-[5px] border border-slate-300 group-hover:border-blue-500 transition-colors bg-white" />
          )}
        </button>
      </div>

      {/* 2. Task Content (Title, Description, Category & Entity Snippet) */}
      <div role="cell" className="min-w-0 pr-3 flex flex-col justify-center py-1">
        {/* Line 1: Title */}
        <p
          className={cn(
            'text-[13px] font-bold leading-snug truncate text-slate-900 group-hover:text-blue-600 transition-colors',
            isDone && 'text-slate-600 font-semibold'
          )}
          title={task.title}
        >
          {task.title}
        </p>

        {/* Line 2: Description preview if available */}
        {task.description && (
          <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5" title={task.description}>
            {task.description.split('\n')[0]}
          </p>
        )}

        {/* Line 3: Category badge & linked entity badge */}
        <div className="flex items-center gap-1.5 mt-1 truncate">
          {task.taskType && (
            <span
              className={cn(
                'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold border leading-none',
                getCategoryPillStyle(task.taskType)
              )}
            >
              {task.taskType}
            </span>
          )}

          {task.studentName && (
            task.studentId ? (
              <Link
                href={`/students/${task.studentId}`}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 text-[10px] font-medium transition-colors leading-none"
              >
                {task.studentName}
              </Link>
            ) : (
              <span className="shrink-0 rounded bg-slate-100 text-slate-600 px-1.5 py-0.5 text-[10px] font-medium leading-none">
                {task.studentName}
              </span>
            )
          )}

          {task.leadName && !task.studentName && (
            task.leadId ? (
              <Link
                href={`/crm/leads/${task.leadId}`}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 text-[10px] font-medium transition-colors leading-none"
              >
                {task.leadName}
              </Link>
            ) : (
              <span className="shrink-0 rounded bg-slate-100 text-slate-600 px-1.5 py-0.5 text-[10px] font-medium leading-none">
                {task.leadName}
              </span>
            )
          )}

          {task.tag && !task.studentName && !task.leadName && (
            <span className="shrink-0 rounded bg-slate-100 text-slate-600 px-1.5 py-0.5 text-[10px] font-medium leading-none">
              {task.tag}
            </span>
          )}
        </div>
      </div>

      {/* 3. Status Badge */}
      <div role="cell" className="flex items-center justify-start min-w-0">
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border leading-none shrink-0',
            statusBadge.className
          )}
        >
          {statusBadge.label}
        </span>
      </div>

      {/* 4. Assignee Column */}
      <div role="cell" className="flex items-center gap-2 min-w-0">
        <div
          className={cn(
            'w-6 h-6 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 border border-slate-200/60',
            avatarColor
          )}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-900 truncate leading-snug">
            {task.assignedTo}
          </p>
          <p className="text-[10px] text-slate-400 font-normal truncate leading-none mt-0.5">
            {creatorAttribution}
          </p>
        </div>
      </div>

      {/* 5. Due Date Column */}
      <div role="cell" className="text-left min-w-0">
        <span className="text-xs font-medium text-slate-600 tabular-nums">
          {compactDate}
        </span>
      </div>

      {/* 6. Priority Column */}
      <div role="cell" className="flex items-center gap-1.5 min-w-0">
        <span
          className={cn(
            'w-2 h-2 rounded-full shrink-0',
            task.priority === 'high'
              ? 'bg-rose-500'
              : task.priority === 'medium'
              ? 'bg-amber-500'
              : 'bg-slate-400'
          )}
        />
        <span className="text-xs font-medium text-slate-700 leading-none">
          {task.priority === 'high'
            ? 'Высокий'
            : task.priority === 'medium'
            ? 'Средний'
            : 'Низкий'}
        </span>
      </div>

      {/* 7. Action Menu Dropdown (···) */}
      <div role="cell" className="flex items-center justify-end relative" ref={menuRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((prev) => !prev);
          }}
          className="w-7 h-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          title="Действия"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 top-8 z-30 w-44 rounded-xl bg-white border border-slate-200 shadow-lg py-1 text-xs text-slate-700 animate-in fade-in duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onEditClick(task);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 font-medium text-slate-700 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-400" />
              <span>Редактировать</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onPostponeClick(task);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 font-medium text-slate-700 transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>Перенести срок</span>
            </button>
            <div className="h-px bg-slate-100 my-1" />
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDeleteClick(task);
              }}
              className="w-full text-left px-3 py-2 hover:bg-rose-50 flex items-center gap-2 font-medium text-rose-600 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Удалить</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
