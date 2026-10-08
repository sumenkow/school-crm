'use client';

import React from 'react';
import { ListTodo, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { TasksKpiSummary } from '@/features/tasks/lib/tasksWorkspaceEngine';
import { cn } from '@/lib/utils';

export type TaskKpiFilterType = 'all' | 'overdue' | 'today' | 'completed';

interface TasksKpiCardsProps {
  kpis: TasksKpiSummary;
  activeFilter?: TaskKpiFilterType;
  onFilterClick?: (filter: TaskKpiFilterType) => void;
}

export function TasksKpiCards({ kpis, activeFilter, onFilterClick }: TasksKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-3 shrink-0">
      {/* 1. Всего задач */}
      <button
        type="button"
        onClick={() => onFilterClick?.('all')}
        className={cn(
          'rounded-2xl border bg-white p-3.5 shadow-2xs flex items-center gap-3.5 text-left transition-all cursor-pointer',
          activeFilter === 'all'
            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
            : 'border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
        )}
      >
        <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <ListTodo className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 leading-none tabular-nums">{kpis.total}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">всего задач</p>
        </div>
      </button>

      {/* 2. Просрочено */}
      <button
        type="button"
        onClick={() => onFilterClick?.('overdue')}
        className={cn(
          'rounded-2xl border bg-white p-3.5 shadow-2xs flex items-center gap-3.5 text-left transition-all cursor-pointer',
          activeFilter === 'overdue'
            ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 shadow-xs'
            : 'border-slate-200/80 hover:border-rose-200 hover:shadow-xs'
        )}
      >
        <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 leading-none tabular-nums">{kpis.overdue}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">просрочено</p>
        </div>
      </button>

      {/* 3. Срок сегодня */}
      <button
        type="button"
        onClick={() => onFilterClick?.('today')}
        className={cn(
          'rounded-2xl border bg-white p-3.5 shadow-2xs flex items-center gap-3.5 text-left transition-all cursor-pointer',
          activeFilter === 'today'
            ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20 shadow-xs'
            : 'border-slate-200/80 hover:border-amber-200 hover:shadow-xs'
        )}
      >
        <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 leading-none tabular-nums">{kpis.today}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">срок сегодня</p>
        </div>
      </button>

      {/* 4. Выполнено */}
      <button
        type="button"
        onClick={() => onFilterClick?.('completed')}
        className={cn(
          'rounded-2xl border bg-white p-3.5 shadow-2xs flex items-center gap-3.5 text-left transition-all cursor-pointer',
          activeFilter === 'completed'
            ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 shadow-xs'
            : 'border-slate-200/80 hover:border-emerald-200 hover:shadow-xs'
        )}
      >
        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 leading-none tabular-nums">{kpis.completed}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">выполнено</p>
        </div>
      </button>
    </div>
  );
}
