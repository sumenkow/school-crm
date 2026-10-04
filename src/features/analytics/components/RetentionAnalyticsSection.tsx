'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  AlertTriangle,
  LogOut,
  CalendarClock,
  ArrowRight,
  TrendingDown,
  Clock,
  ExternalLink,
  Info,
  CheckCircle2,
  X,
  FileText,
  UserX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalyticsFilters } from '../types';
import { useRetentionTabData, UpcomingRenewal } from '../hooks/useRetentionTabData';
import { getChurnEvents, ChurnEvent, getChurnReasonLabel } from '@/lib/data/churnStorage';

interface RetentionAnalyticsSectionProps {
  filters: AnalyticsFilters;
}

export function RetentionAnalyticsSection({ filters }: RetentionAnalyticsSectionProps) {
  const {
    cohorts,
    cohortAnomaly,
    studentsAtRisk,
    totalRisksCount,
    churnAnalysis,
    renewals,
  } = useRetentionTabData(filters);

  const [isChurnedModalOpen, setIsChurnedModalOpen] = useState(false);
  const [selectedReasonFilter, setSelectedReasonFilter] = useState<string>('all');

  const allChurnEvents = typeof window !== 'undefined' ? getChurnEvents() : [];

  const getHeatmapColor = (val: number | null, isM0: boolean = false) => {
    if (val === null) return 'text-slate-300 bg-slate-50/40';
    if (isM0) return 'bg-blue-600 text-white font-bold shadow-2xs';
    if (val < 87 && val > 0) return 'bg-rose-100/90 text-rose-700 font-bold border border-rose-200/80';
    if (val >= 92) return 'bg-blue-100/80 text-blue-900 font-bold';
    if (val >= 88) return 'bg-blue-50 text-blue-800 font-semibold';
    return 'bg-slate-50 text-slate-700';
  };

  const getAvatarBg = (initials: string) => {
    const charCode = initials.charCodeAt(0) || 65;
    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-indigo-100 text-indigo-700',
      'bg-amber-100 text-amber-700',
      'bg-purple-100 text-purple-700',
      'bg-rose-100 text-rose-700',
      'bg-emerald-100 text-emerald-700',
    ];
    return colors[charCode % colors.length];
  };

  return (
    <div className="space-y-4">
      {/* 2x2 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ========================================================= */}
        {/* БЛОК 1: Когортный анализ Retention (M0-M5)                */}
        {/* ========================================================= */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    Удержание учеников (Retention)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Когортный анализ по месяцам старта обучения
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsChurnedModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                Посмотреть ушедших <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Matrix Table */}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2 pl-2 pr-1">Когорта</th>
                    <th className="py-2 px-1 text-center">M0</th>
                    <th className="py-2 px-1 text-center">M1</th>
                    <th className="py-2 px-1 text-center">M2</th>
                    <th className="py-2 px-1 text-center">M3</th>
                    <th className="py-2 px-1 text-center">M4</th>
                    <th className="py-2 pr-2 text-center">M5</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {cohorts.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 pl-2 pr-1 font-semibold text-slate-900 whitespace-nowrap text-[11px]">
                        {c.month} <span className="text-[10px] font-normal text-slate-400">({c.size})</span>
                      </td>
                      <td className="py-2 px-1 text-center">
                        <span className={cn('inline-block w-12 py-0.5 rounded-md text-[10px]', getHeatmapColor(c.m0Num, true))}>
                          {c.m0}
                        </span>
                      </td>
                      <td className="py-2 px-1 text-center">
                        <span className={cn('inline-block w-12 py-0.5 rounded-md text-[10px]', getHeatmapColor(c.m1Num))}>
                          {c.m1}
                        </span>
                      </td>
                      <td className="py-2 px-1 text-center">
                        <span className={cn('inline-block w-12 py-0.5 rounded-md text-[10px]', getHeatmapColor(c.m2Num))}>
                          {c.m2}
                        </span>
                      </td>
                      <td className="py-2 px-1 text-center">
                        <span className={cn('inline-block w-12 py-0.5 rounded-md text-[10px]', getHeatmapColor(c.m3Num))}>
                          {c.m3}
                        </span>
                      </td>
                      <td className="py-2 px-1 text-center">
                        <span className={cn('inline-block w-12 py-0.5 rounded-md text-[10px]', getHeatmapColor(c.m4Num))}>
                          {c.m4}
                        </span>
                      </td>
                      <td className="py-2 pr-2 text-center">
                        <span className={cn('inline-block w-12 py-0.5 rounded-md text-[10px]', getHeatmapColor(c.m5Num))}>
                          {c.m5}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Anomaly Warning Bar */}
          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-2.5 flex items-start gap-2 text-xs">
            <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold shrink-0 mt-0.5 text-xs">
              !
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-rose-900 block leading-tight">
                {cohortAnomaly.text}
              </span>
              <span className="text-[10px] text-rose-700 mt-0.5 block">
                Рекомендуется проверить расписание занятий и нагрузку преподавателей в данной когорте
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* БЛОК 2: Ученики в зоне риска (At-Risk)                    */}
        {/* ========================================================= */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    Ученики в зоне риска
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      {totalRisksCount}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Активные ученики с объективными признаками угрозы оттока
                  </p>
                </div>
              </div>

              <Link
                href="/students?status=active"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Показать всех <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* List of at-risk students */}
            <div className="mt-3 space-y-2">
              {studentsAtRisk.slice(0, 5).map((st) => (
                <Link
                  key={st.id}
                  href={`/students/${st.id}`}
                  className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/70 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0', getAvatarBg(st.initials))}>
                      {st.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {st.name}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                          • {st.courseName}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {st.details}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-md text-[9px] font-bold border uppercase tracking-wider',
                        st.reasons[0]?.variant === 'danger'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      )}
                    >
                      {st.reasons[0]?.label || 'В РИСКЕ'}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-extrabold',
                        st.riskLevel === 'high' ? 'text-rose-600' : 'text-amber-600'
                      )}
                    >
                      ↓ {st.riskLevel === 'high' ? 'Высокий' : 'Средний'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Статус учеников остается «Активен» — требуется превентивная связь</span>
            <Link href="/students?status=active" className="text-blue-600 font-semibold hover:underline">
              Перейти в реестр →
            </Link>
          </div>
        </div>

        {/* ========================================================= */}
        {/* БЛОК 3: Почему уходят ученики (Аналитика причин оттока)   */}
        {/* ========================================================= */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <LogOut className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    Почему уходят ученики
                    {churnAnalysis.totalChurnCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        {churnAnalysis.totalChurnCount}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Аналитика причин прекращения обучения по структурированным фактам
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsChurnedModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                Подробнее <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Content: Mock Data Ban & Empty State */}
            {!churnAnalysis.hasEnoughData ? (
              <div className="mt-6 flex flex-col items-center justify-center py-6 px-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 space-y-2">
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                  <Info className="w-4.5 h-4.5" />
                </div>
                <div className="max-w-sm">
                  <p className="text-xs font-bold text-slate-700">
                    Недостаточно данных для анализа
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    За выбранный период зафиксировано {churnAnalysis.totalChurnCount} фактов ухода.
                    Соберите больше данных для выявления достоверных закономерностей.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-2.5">
                {/* Progress bars of reasons */}
                {churnAnalysis.reasons.slice(0, 5).map((item) => (
                  <div key={item.reason.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span>{item.reason.emoji}</span>
                        <span>{item.reason.label}</span>
                      </span>
                      <span className="text-[11px] font-bold text-slate-600">
                        {item.percent}% <span className="font-normal text-slate-400">({item.count} уч.)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-rose-500 transition-all duration-300"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Key Takeaway Insight if enough data */}
          {churnAnalysis.hasEnoughData && churnAnalysis.topReason && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-2.5 text-xs text-rose-950 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-rose-900">
                🔴 Основная причина ухода — {churnAnalysis.topReason.reason.label.toLowerCase()} ({churnAnalysis.topReason.percent}% ушедших учеников)
              </span>
              {churnAnalysis.topGroups.length > 0 && (
                <p className="text-[11px] text-rose-800">
                  Больше всего уходов: {churnAnalysis.topGroups.map(([g, cnt]) => `${g} (${cnt})`).join(', ')}.
                </p>
              )}
            </div>
          )}

          {!churnAnalysis.hasEnoughData && (
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
              При переводе ученика в архив CRM требует указать причину ухода из справочника
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* БЛОК 4: Ближайшие продления                               */}
        {/* ========================================================= */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <CalendarClock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    Ближайшие продления
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                      {renewals.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ученики с остатком абонемента 0–3 занятия
                  </p>
                </div>
              </div>

              <Link
                href="/students?status=active"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Все продления <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* List of renewals */}
            <div className="mt-3 space-y-2">
              {renewals.slice(0, 5).map((r) => {
                const getBadge = () => {
                  if (r.remainingLessons === 0) {
                    return {
                      label: '0 ЗАНЯТИЙ',
                      color: 'bg-rose-50 text-rose-700 border-rose-200',
                      badge: '🔴 Критично',
                    };
                  }
                  if (r.remainingLessons === 1) {
                    return {
                      label: '1 ЗАНЯТИЕ',
                      color: 'bg-amber-50 text-amber-700 border-amber-200',
                      badge: '🟡 Внимание',
                    };
                  }
                  return {
                    label: `${r.remainingLessons} ЗАНЯТИЯ`,
                    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    badge: '🟢 Штатно',
                  };
                };

                const badge = getBadge();

                return (
                  <Link
                    key={r.id}
                    href={`/students/${r.studentId}`}
                    className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/70 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0', getAvatarBg(r.initials))}>
                        {r.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                            {r.studentName}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                            • {r.groupName}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          {r.details}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={cn('px-2 py-0.5 rounded-md text-[9px] font-bold border', badge.color)}>
                        {badge.label}
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 hidden sm:inline">
                        {badge.badge}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Ученики требуют выставления счета или продления абонемента</span>
            <Link href="/students?status=active" className="text-blue-600 font-semibold hover:underline">
              Выставить счета →
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: Реестр фактов ухода (Посмотреть ушедших)           */}
      {/* ========================================================= */}
      {isChurnedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <UserX className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Реестр прекращения обучения
                  </h3>
                  <p className="text-xs text-slate-500">
                    Структурированные события ухода учеников с зафиксированными причинами
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChurnedModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Events List */}
            <div className="p-6 overflow-y-auto space-y-2.5 flex-1">
              {allChurnEvents.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">
                    События прекращения обучения пока не зафиксированы
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    При переводе ученика в статус «В архиве» система сохранит причину ухода здесь
                  </p>
                </div>
              ) : (
                allChurnEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/students/${ev.studentId}`}
                          className="font-bold text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {ev.studentName}
                        </Link>
                        <span className="text-[10px] text-slate-400">
                          ID: {ev.studentId}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(ev.occurredAt).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Причина: {getChurnReasonLabel(ev.churnReasonId)}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {ev.previousStatus} → {ev.newStatus}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-auto">
                        Зафиксировал: {ev.author}
                      </span>
                    </div>

                    {ev.churnComment && (
                      <p className="text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-100 mt-1">
                        💬 «{ev.churnComment}»
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50/60 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Всего записей: {allChurnEvents.length}
              </span>
              <button
                type="button"
                onClick={() => setIsChurnedModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
