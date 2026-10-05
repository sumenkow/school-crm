'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Snowflake,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Filter,
  Wallet,
} from 'lucide-react';
import { FullSubscriptionData } from '@/lib/data/mockData';

interface SubscriptionsTabProps {
  subscriptions: FullSubscriptionData[];
  selectedSubscriptionId?: string;
  onSelectSubscription: (sub: FullSubscriptionData) => void;
  onFreezeSubscription: (subId: string) => void;
}

export function SubscriptionsTab({
  subscriptions,
  selectedSubscriptionId,
  onSelectSubscription,
  onFreezeSubscription,
}: SubscriptionsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring' | 'expired' | 'frozen'>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Extract unique groups
  const uniqueGroups = useMemo(() => {
    const set = new Set<string>();
    subscriptions.forEach((s) => {
      if (s.groupName) set.add(s.groupName);
    });
    return Array.from(set);
  }, [subscriptions]);

  // Sub-KPIs
  const subKpis = useMemo(() => {
    const active = subscriptions.filter((s) => s.status === 'active');
    const frozen = subscriptions.filter((s) => s.status === 'frozen');
    const expired = subscriptions.filter((s) => s.status === 'expired' || s.lessonsAttended >= s.lessonsTotal);
    const expiringSoon = subscriptions.filter((s) => {
      const remaining = Math.max(0, s.lessonsTotal - s.lessonsAttended);
      return s.status === 'active' && remaining <= 2;
    });

    const unusedBalanceEur = subscriptions.reduce((sum, s) => {
      const remaining = Math.max(0, s.lessonsTotal - s.lessonsAttended);
      const priceNum = typeof s.price === 'number' ? s.price : parseFloat(String(s.price).replace(/[^\d.]/g, '')) || 0;
      const unitPrice = s.lessonsTotal > 0 ? priceNum / s.lessonsTotal : 15;
      return sum + remaining * unitPrice;
    }, 0);

    return {
      activeCount: active.length,
      expiringCount: expiringSoon.length,
      expiredCount: expired.length,
      frozenCount: frozen.length,
      unusedBalanceEur,
      studentsCount: subscriptions.length,
    };
  }, [subscriptions]);

  // Filtered subscriptions
  const filteredSubs = useMemo(() => {
    return subscriptions.filter((s) => {
      const remaining = Math.max(0, s.lessonsTotal - s.lessonsAttended);
      const isExpiring = s.status === 'active' && remaining <= 2;
      const isExpired = s.status === 'expired' || s.lessonsAttended >= s.lessonsTotal;

      if (statusFilter === 'active' && (s.status !== 'active' || isExpiring)) return false;
      if (statusFilter === 'expiring' && !isExpiring) return false;
      if (statusFilter === 'expired' && !isExpired) return false;
      if (statusFilter === 'frozen' && s.status !== 'frozen') return false;

      if (groupFilter !== 'all' && s.groupName !== groupFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchStudent = (s.studentName || '').toLowerCase().includes(q);
        const matchCourse = (s.courseName || '').toLowerCase().includes(q);
        const matchGroup = (s.groupName || '').toLowerCase().includes(q);
        if (!matchStudent && !matchCourse && !matchGroup) return false;
      }

      return true;
    });
  }, [subscriptions, statusFilter, groupFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredSubs.length / pageSize));
  const paginatedSubs = filteredSubs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const hasActiveFilters = statusFilter !== 'all' || groupFilter !== 'all' || searchQuery;

  return (
    <div className="space-y-4">
      {/* 4 Sub-KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Активные */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Активные абонементы</span>
              <div className="text-lg font-bold text-slate-900">{subKpis.activeCount}</div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-emerald-700 font-bold">↑ +2 к сентябрю</p>
        </div>

        {/* Заканчиваются */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Заканчиваются ≤ 7 дней</span>
              <div className="text-lg font-bold text-amber-700">{subKpis.expiringCount}</div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Осталось ≤ 2 занятий</p>
        </div>

        {/* Завершились */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Завершились</span>
              <div className="text-lg font-bold text-slate-900">{subKpis.expiredCount}</div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Требуют оформления</p>
        </div>

        {/* Неиспользованный баланс */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-500 block truncate">Неиспользованный баланс</span>
              <div className="text-lg font-bold text-slate-900">
                {Math.round(subKpis.unusedBalanceEur).toLocaleString('ru-RU')} €
              </div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">{subKpis.studentsCount} учеников</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по ученику, родителю, абонементу..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
          {/* Status filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-[11px] font-medium text-slate-400">Статус:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Все</option>
              <option value="active">Активен</option>
              <option value="expiring">Заканчивается</option>
              <option value="frozen">Заморожен</option>
              <option value="expired">Завершён</option>
            </select>
          </div>

          {/* Group filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-[11px] font-medium text-slate-400">Группа:</span>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Все</option>
              {uniqueGroups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setGroupFilter('all');
                setSearchQuery('');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              Сбросить
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
        {filteredSubs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Sparkles className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Активных абонементов нет</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              По выбранным критериям абонементы не найдены.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4">Ученик / Родитель</th>
                  <th className="py-3 px-3">Абонемент</th>
                  <th className="py-3 px-3">Группа</th>
                  <th className="py-3 px-3 w-40">Использовано</th>
                  <th className="py-3 px-3 text-center">Осталось</th>
                  <th className="py-3 px-3">Действует до</th>
                  <th className="py-3 px-3 text-right">Баланс</th>
                  <th className="py-3 px-3 text-center">Статус</th>
                  <th className="py-3 px-4 text-right">•••</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {paginatedSubs.map((s) => {
                  const isSelected = selectedSubscriptionId === s.id;
                  const remaining = Math.max(0, s.lessonsTotal - s.lessonsAttended);
                  const isExpiring = s.status === 'active' && remaining <= 2;
                  const isFrozen = s.status === 'frozen';
                  const isExpired = s.status === 'expired' || s.lessonsAttended >= s.lessonsTotal;

                  const initials = s.studentName
                    ? s.studentName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                    : 'УЧ';

                  const priceNum = typeof s.price === 'number' ? s.price : parseFloat(String(s.price).replace(/[^\d.]/g, '')) || 0;
                  const balanceEur = Math.round(remaining * (s.lessonsTotal > 0 ? priceNum / s.lessonsTotal : 15));

                  return (
                    <tr
                      key={s.id}
                      onClick={() => onSelectSubscription(s)}
                      className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-50/50 border-l-2 border-l-blue-600' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate hover:text-blue-600">
                              {s.studentName}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              Родитель • {s.courseName}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {s.lessonsTotal} занятий
                      </td>

                      <td className="py-3 px-3 text-slate-600 truncate max-w-xs">
                        {s.groupName || 'Основная группа'}
                      </td>

                      {/* Usage Progress Column (as in reference) */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                            <span>{s.lessonsAttended} / {s.lessonsTotal}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, (s.lessonsAttended / (s.lessonsTotal || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-slate-900">
                        {remaining}
                      </td>

                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {s.endDate}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {balanceEur} €
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold inline-block ${
                            isFrozen
                              ? 'bg-blue-100 text-blue-800'
                              : isExpired
                              ? 'bg-slate-100 text-slate-700'
                              : isExpiring
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isFrozen
                            ? 'Заморожен'
                            : isExpired
                            ? 'Завершён'
                            : isExpiring
                            ? 'Заканчивается'
                            : 'Активен'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onSelectSubscription(s)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4 ml-auto" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredSubs.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Показано {paginatedSubs.length} из {filteredSubs.length} абонементов
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-2 font-semibold text-slate-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700 focus:outline-none"
              >
                <option value={10}>10 на странице</option>
                <option value={20}>20 на странице</option>
                <option value={50}>50 на странице</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
