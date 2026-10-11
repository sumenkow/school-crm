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
          'rounded-xl border bg-white p-3 shadow-2xs flex items-center gap-3 text-left transition-all cursor-pointer',
          activeFilter === 'all'
            ? 'border-blue-500 ring-1 ring-blue-500/30 bg-blue-50/15'
            : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
        )}
      >
        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <ListTodo className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-slate-900 leading-none tabular-nums">{kpis.total}</p>
          <p className="text-xs text-slate-500 font-medium mt-1 truncate">всего задач</p>
        </div>
      </button>

      {/* 2. Просрочено */}
      <button
        type="button"
        onClick={() => onFilterClick?.('overdue')}
        className={cn(
          'rounded-xl border bg-white p-3 shadow-2xs flex items-center gap-3 text-left transition-all cursor-pointer',
          activeFilter === 'overdue'
            ? 'border-rose-500 ring-1 ring-rose-500/30 bg-rose-50/15'
            : 'border-slate-200/80 hover:border-rose-200 hover:bg-rose-50/10'
        )}
      >
        <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
          <AlertCircle className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0">
          <p className={cn("text-xl font-bold leading-none tabular-nums", kpis.overdue > 0 ? "text-rose-600" : "text-slate-900")}>
            {kpis.overdue}
          </p>
          <p className="text-xs text-slate-500 font-medium mt-1 truncate">просрочено</p>
        </div>
      </button>

      {/* 3. Срок сегодня */}
      <button
        type="button"
        onClick={() => onFilterClick?.('today')}
        className={cn(
          'rounded-xl border bg-white p-3 shadow-2xs flex items-center gap-3 text-left transition-all cursor-pointer',
          activeFilter === 'today'
            ? 'border-amber-500 ring-1 ring-amber-500/30 bg-amber-50/15'
            : 'border-slate-200/80 hover:border-amber-200 hover:bg-amber-50/10'
        )}
      >
        <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <Clock className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-slate-900 leading-none tabular-nums">{kpis.today}</p>
          <p className="text-xs text-slate-500 font-medium mt-1 truncate">срок сегодня</p>
        </div>
      </button>

      {/* 4. Выполнено */}
      <button
        type="button"
        onClick={() => onFilterClick?.('completed')}
        className={cn(
          'rounded-xl border bg-white p-3 shadow-2xs flex items-center gap-3 text-left transition-all cursor-pointer',
          activeFilter === 'completed'
            ? 'border-emerald-500 ring-1 ring-emerald-500/30 bg-emerald-50/15'
            : 'border-slate-200/80 hover:border-emerald-200 hover:bg-emerald-50/10'
        )}
      >
        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-slate-900 leading-none tabular-nums">{kpis.completed}</p>
          <p className="text-xs text-slate-500 font-medium mt-1 truncate">выполнено</p>
        </div>
      </button>
    </div>
  );
}
