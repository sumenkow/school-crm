'use client';

import React from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Award } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Аналитика и Отчеты</h1>
        <p className="text-sm text-slate-500">
          Сквозные метрики школы: динамика набора, удержание (retention) и доходы
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase text-slate-400">Retention (Удержание)</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">91.4%</p>
          <p className="mt-1 text-xs text-emerald-600 font-medium">↑ +2.1% к прошлому месяцу</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase text-slate-400">Конверсия CRM</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">32.8%</p>
          <p className="mt-1 text-xs text-emerald-600 font-medium">↑ Из лида в оплату</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase text-slate-400">Средняя посещаемость</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">89.2%</p>
          <p className="mt-1 text-xs text-slate-500">По всем активным группам</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase text-slate-400">LTV Ученика</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">48 500 ₽</p>
          <p className="mt-1 text-xs text-slate-500">Средний жизненный цикл</p>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <BarChart3 className="mx-auto h-12 w-12 text-slate-300" />
        <h3 className="mt-3 text-base font-bold text-slate-800">Детальные графики и когортный анализ</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
          Раздел углубленной аналитики с интерактивными графиками Recharts будет расширен на последующих этапах проекта.
        </p>
      </div>
    </div>
  );
}
