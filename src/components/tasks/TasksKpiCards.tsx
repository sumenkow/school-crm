'use client';

import React from 'react';
import { ListTodo, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { TasksKpiSummary } from '@/features/tasks/lib/tasksWorkspaceEngine';

interface TasksKpiCardsProps {
  kpis: TasksKpiSummary;
}

export function TasksKpiCards({ kpis }: TasksKpiCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-3 pb-3 shrink-0">
      {/* 1. Всего задач */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <ListTodo className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 leading-none tabular-nums">{kpis.total}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">всего задач</p>
        </div>
      </div>

      {/* 2. Просрочено */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 leading-none tabular-nums">{kpis.overdue}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">просрочено</p>
        </div>
      </div>

      {/* 3. Срок сегодня */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 leading-none tabular-nums">{kpis.today}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">срок сегодня</p>
        </div>
      </div>

      {/* 4. Выполнено */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 leading-none tabular-nums">{kpis.completed}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">выполнено</p>
        </div>
      </div>
    </div>
  );
}
