'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Check,
  MoreHorizontal,
  Edit3,
  Calendar,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FullTaskData } from '@/lib/data/mockData';
import {
  getCardDateDisplay,
  getCategoryBadgeStyle,
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
    : 'Моя задача';

  return (
    <div
      onClick={() => onSelect(task)}
      className={cn(
        'group rounded-2xl border bg-white p-3.5 transition-all cursor-pointer relative flex items-center gap-3.5 shadow-2xs hover:border-slate-300 min-h-[72px]',
        dateInfo.accentBorder,
        isSelected
          ? 'border-blue-400 ring-2 ring-blue-100/60 bg-blue-50/15'
          : 'border-slate-200/80',
        isDone && 'opacity-65'
      )}
    >
      {/* 1. Completion Checkbox */}
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
        className="shrink-0 transition-colors cursor-pointer"
        title={isDone ? 'Вернуть в работу' : 'Отметить выполненной'}
      >
        {isDone ? (
          <div className="h-5 w-5 rounded-md bg-emerald-500 border border-emerald-500 text-white flex items-center justify-center">
            <Check className="h-3.5 w-3.5 stroke-[3]" />
          </div>
        ) : (
          <div className="h-5 w-5 rounded-md border-2 border-slate-300 group-hover:border-blue-500 transition-colors" />
        )}
      </button>

      {/* 2. Middle Content (Title, Description, Category, Relations) */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'text-sm font-bold leading-snug truncate text-slate-900',
              isDone && 'line-through text-slate-400 font-medium'
            )}
          >
            {task.title}
          </p>
        </div>

        {task.description && (
          <p className="text-xs text-slate-500 mt-0.5 truncate leading-tight">
            {task.description.split('\n')[0]}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {/* Category Badge */}
          {task.taskType && (
            <span
              className={cn(
                'rounded-md px-2 py-0.5 text-[11px] font-semibold border',
                getCategoryBadgeStyle(task.taskType)
              )}
            >
              {task.taskType}
            </span>
          )}

          {/* Student Link */}
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

          {/* Lead Link */}
          {task.leadName && !task.studentName && (
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

          {/* Tag */}
          {task.tag && (
            <span className="rounded-md bg-sky-50 text-sky-700 border border-sky-200/60 px-2 py-0.5 text-[11px] font-medium">
              {task.tag}
            </span>
          )}

          {/* Subtag */}
          {task.subTag && (
            <span className="rounded-md bg-violet-50 text-violet-700 border border-violet-200/60 px-2 py-0.5 text-[11px] font-medium">
              {task.subTag}
            </span>
          )}
        </div>
      </div>

      {/* 3. Due Date Column */}
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

      {/* 4. Assignee Column */}
      <div className="shrink-0 flex items-center gap-2 w-36">
        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
          {getInitials(task.assignedTo)}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900 truncate leading-snug">
            {task.assignedTo}
          </p>
          <p className="text-[10px] text-slate-400 font-medium truncate leading-none mt-0.5">
            {creatorAttribution}
          </p>
        </div>
      </div>

      {/* 5. Action Menu Dropdown (...) */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((prev) => !prev);
          }}
          className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
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
              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 font-medium text-slate-700 transition-colors"
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
              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 font-medium text-slate-700 transition-colors"
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
              className="w-full text-left px-3 py-2 hover:bg-rose-50 flex items-center gap-2 font-medium text-rose-600 transition-colors"
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
