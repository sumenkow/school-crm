'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Search,
  CheckCircle2,
  FileText,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Filter,
  BarChart2,
} from 'lucide-react';
import { FullPaymentData } from '@/lib/data/mockData';
import { useToast } from '@/context/ToastContext';

interface PaymentsTabProps {
  payments: FullPaymentData[];
  selectedPaymentId?: string;
  onSelectPayment: (payment: FullPaymentData) => void;
}

const MONTH_LABELS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт'];

export function PaymentsTab({
  payments,
  selectedPaymentId,
  onSelectPayment,
}: PaymentsTabProps) {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'expected' | 'overdue'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Extract unique groups
  const uniqueGroups = useMemo(() => {
    const set = new Set<string>();
    payments.forEach((p) => {
      if (p.groupName) set.add(p.groupName);
    });
    return Array.from(set);
  }, [payments]);

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (methodFilter !== 'all' && p.paymentMethod !== methodFilter) return false;
      if (groupFilter !== 'all' && p.groupName !== groupFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchStudent = (p.studentName || '').toLowerCase().includes(q);
        const matchParent = (p.parentName || '').toLowerCase().includes(q);
        const matchCourse = (p.courseName || '').toLowerCase().includes(q);
        const matchPeriod = (p.periodLabel || '').toLowerCase().includes(q);
        if (!matchStudent && !matchParent && !matchCourse && !matchPeriod) return false;
      }
      return true;
    });
  }, [payments, statusFilter, methodFilter, groupFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Revenue calculation for dynamic chart
  const currentMonthRevenueEur = useMemo(() => {
    return payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => {
        const num = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount).replace(/[^\d.]/g, '')) || 0;
        return sum + num;
      }, 0);
  }, [payments]);

  // Dynamic monthly chart calculations (FIN-02)
  const dynamicMonthlyStats = useMemo(() => {
    const sums = new Array(10).fill(0);
    payments
      .filter((p) => p.status === 'paid')
      .forEach((p) => {
        const num = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount).replace(/[^\d.]/g, '')) || 0;
        const dStr = p.paymentDate || (p as any).date || '';
        let m = -1;
        if (dStr.includes('.')) m = parseInt(dStr.split('.')[1], 10) - 1;
        else if (dStr.includes('-')) m = parseInt(dStr.split('-')[1], 10) - 1;
        if (m >= 0 && m < 10) {
          sums[m] += num;
        } else {
          sums[9] += num;
        }
      });
    const maxVal = Math.max(...sums, 1);
    const heights = sums.map((val) => (val > 0 ? Math.max(15, Math.round((val / maxVal) * 100)) : 10));
    const octRev = sums[9];
    const sepRev = sums[8];
    let diffPct = 0;
    if (sepRev > 0) {
      diffPct = Math.round(((octRev - sepRev) / sepRev) * 100);
    } else if (octRev > 0) {
      diffPct = 100;
    }
    return { heights, diffPct };
  }, [payments]);

  const hasActiveFilters =
    statusFilter !== 'all' || methodFilter !== 'all' || groupFilter !== 'all' || searchQuery;

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по ученику, родителю, назначению..."
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
              <option value="paid">Оплачено</option>
              <option value="expected">Ожидает</option>
              <option value="overdue">Просрочен</option>
            </select>
          </div>

          {/* Method filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-[11px] font-medium text-slate-400">Способ:</span>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Все</option>
              <option value="card">Банковская карта</option>
              <option value="bank_transfer">Перевод (SEPA)</option>
              <option value="cash">Наличные</option>
              <option value="invoice">Счёт</option>
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
                setMethodFilter('all');
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
        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CreditCard className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Платежей пока нет</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              По выбранным фильтрам платежи не найдены.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input type="checkbox" className="rounded border-slate-300 text-blue-600" />
                  </th>
                  <th className="py-3 px-3">Ученик / Родитель</th>
                  <th className="py-3 px-3">Назначение</th>
                  <th className="py-3 px-3 text-right">Сумма</th>
                  <th className="py-3 px-3">Дата</th>
                  <th className="py-3 px-3">Способ оплаты</th>
                  <th className="py-3 px-3 text-center">Статус</th>
                  <th className="py-3 px-3 text-center">Чек</th>
                  <th className="py-3 px-4 text-right">•••</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {paginatedPayments.map((p) => {
                  const isSelected = selectedPaymentId === p.id;
                  const isPaid = p.status === 'paid';
                  const initials = p.studentName
                    ? p.studentName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                    : 'УЧ';

                  return (
                    <tr
                      key={p.id}
                      onClick={() => onSelectPayment(p)}
                      className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-50/50 border-l-2 border-l-blue-600' : ''
                      }`}
                    >
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectPayment(p)}
                          className="rounded border-slate-300 text-blue-600 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate hover:text-blue-600">
                              {p.studentName}
                            </span>
                            {p.parentName && (
                              <span className="text-[10px] text-slate-400 block truncate">
                                {p.parentName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800 block truncate">
                          Абонемент
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {p.courseName} • {p.periodLabel}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900 text-sm">
                        {p.amountFormatted || `${p.amount} €`}
                      </td>

                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {p.paymentDate}
                      </td>

                      <td className="py-3 px-3 text-slate-700">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                          {p.paymentMethod === 'card'
                            ? 'Банковская карта'
                            : p.paymentMethod === 'bank_transfer'
                            ? 'Перевод (SEPA)'
                            : p.paymentMethod === 'cash'
                            ? 'Наличные'
                            : 'Счёт'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold inline-block ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'overdue'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isPaid ? 'Оплачено' : p.status === 'overdue' ? 'Просрочен' : 'Ожидает'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/invoices/${p.id}`}
                          target="_blank"
                          onClick={() => toast.success(`Чек #${p.id.slice(0, 8)} открыт`)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors inline-block"
                          title="Просмотреть фискальный чек"
                        >
                          <FileText className="h-3.5 w-3.5 mx-auto" />
                        </Link>
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onSelectPayment(p)}
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
        {filteredPayments.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Показано {paginatedPayments.length} из {filteredPayments.length} платежей
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

      {/* Revenue Dynamics Mini-Chart Card (as seen in reference) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <BarChart2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Динамика выручки</h3>
            <p className="text-[11px] text-slate-400">Помесячный объем фактических поступлений</p>
          </div>
        </div>

        {/* Minimalist Bar Chart Graphic */}
        <div className="flex items-end gap-2.5 h-16 w-full max-w-sm px-4">
          {dynamicMonthlyStats.heights.map((height, idx) => (
            <div key={MONTH_LABELS[idx]} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded-t-sm transition-all ${
                  idx === 9 ? 'bg-blue-600' : 'bg-blue-100 hover:bg-blue-200'
                }`}
                style={{ height: `${height}%` }}
              />
              <span className="text-[9px] font-medium text-slate-400">
                {MONTH_LABELS[idx]}
              </span>
            </div>
          ))}
        </div>

        {/* Total Summary */}
        <div className="text-right shrink-0">
          <div className="text-xl font-black text-slate-900">
            {Math.round(currentMonthRevenueEur).toLocaleString('ru-RU')} €
          </div>
          <span className="text-xs font-semibold text-slate-500 block">
            Выручка за октябрь 2026
          </span>
          <span className="text-[11px] font-bold text-emerald-700 block mt-0.5">
            {dynamicMonthlyStats.diffPct >= 0 ? `↑ +${dynamicMonthlyStats.diffPct}%` : `↓ ${dynamicMonthlyStats.diffPct}%`} к сентябрю • {payments.filter((p) => p.status === 'paid').length} {payments.filter((p) => p.status === 'paid').length === 1 ? 'платеж' : payments.filter((p) => p.status === 'paid').length < 5 ? 'платежа' : 'платежей'}
          </span>
        </div>
      </div>
    </div>
  );
}
