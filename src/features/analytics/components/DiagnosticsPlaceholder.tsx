'use client';

import React from 'react';
import { Activity, ShieldAlert, Sparkles } from 'lucide-react';
import { AnalyticsFilters } from '../types';

export interface DiagnosticsPlaceholderProps {
  filters: AnalyticsFilters;
}

export function DiagnosticsPlaceholder({ filters }: DiagnosticsPlaceholderProps) {
  return (
    <div className="space-y-6">
      {/* Diagnostics Hero Info Banner / Container */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Диагностика школы и операционный контроль
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                  <Sparkles className="h-3 w-3" />
                  Live-аудит
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Автоматический поиск отклонений, пустых мест в группах, пропусков занятий и зависших оплат.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white/80 border border-slate-200/80 px-3 py-1.5 rounded-xl shadow-2xs">
            <span className="text-slate-400">Период анализа:</span>
            <span className="font-bold text-slate-900">{filters.period}</span>
            {filters.comparePeriod !== 'none' && (
              <>
                <span className="text-slate-400">• vs</span>
                <span className="font-semibold text-slate-700">{filters.comparePeriod}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Screen Frame Grid (Ready for metrics and anomaly detection cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <h3 className="text-xs font-bold text-slate-900">Критические аномалии</h3>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            Каркас экрана «Диагностика» готов к внедрению блоков отклонений по референсу.
          </p>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Activity className="h-5 w-5" />
          </div>
          <h3 className="text-xs font-bold text-slate-900">Недополученная выручка</h3>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            Расчет потерь от пустых мест и пропусков занятий.
          </p>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="text-xs font-bold text-slate-900">Точки роста</h3>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            Рекомендации по добору и реактивации базы учеников.
          </p>
        </div>
      </div>
    </div>
  );
}
