'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Receipt,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { EuropeanInvoiceData } from '@/lib/data/invoiceStorage';

interface InvoicesTabProps {
  invoices: EuropeanInvoiceData[];
  selectedInvoiceId?: string;
  onSelectInvoice: (invoice: EuropeanInvoiceData) => void;
  onMarkPaid: (invoiceId: string) => void;
}

export function InvoicesTab({
  invoices,
  selectedInvoiceId,
  onSelectInvoice,
  onMarkPaid,
}: InvoicesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Sub-KPIs
  const subKpis = useMemo(() => {
    const totalIssued = invoices.length;
    const totalSum = invoices.reduce((sum, inv) => sum + (inv.totalAmountEUR || 0), 0);

    const pendingList = invoices.filter((inv) => inv.status === 'pending');
    const pendingSum = pendingList.reduce((sum, inv) => sum + (inv.totalAmountEUR || 0), 0);

    const overdueList = invoices.filter((inv) => inv.status === 'overdue');
    const overdueSum = overdueList.reduce((sum, inv) => sum + (inv.totalAmountEUR || 0), 0);

    return {
      issuedCount: totalIssued,
      issuedSum: totalSum,
      pendingCount: pendingList.length,
      pendingSum: pendingSum,
      overdueCount: overdueList.length,
      overdueSum: overdueSum,
    };
  }, [invoices]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Status filter
      if (statusFilter !== 'all' && inv.status !== statusFilter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = String(inv.invoiceNumber || '').toLowerCase().includes(q);
        const matchStudent = (inv.studentName || '').toLowerCase().includes(q);
        const matchParent = (inv.parentName || '').toLowerCase().includes(q);
        const matchCourse = (inv.courseName || '').toLowerCase().includes(q);
        if (!matchNum && !matchStudent && !matchParent && !matchCourse) return false;
      }
      return true;
    });
  }, [invoices, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4">
      {/* 3 Sub-KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Выставлено */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Выставлено</span>
              <div className="text-lg font-bold text-slate-900">
                {subKpis.issuedCount} {subKpis.issuedCount === 1 ? 'счет' : subKpis.issuedCount < 5 ? 'счета' : 'счетов'}
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs font-extrabold text-blue-700">
            {Math.round(subKpis.issuedSum).toLocaleString('ru-RU')} €
          </p>
        </div>

        {/* Ожидает оплаты */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Ожидает оплаты</span>
              <div className="text-lg font-bold text-slate-900">
                {subKpis.pendingCount} {subKpis.pendingCount === 1 ? 'счет' : subKpis.pendingCount < 5 ? 'счета' : 'счетов'}
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs font-extrabold text-amber-700">
            {Math.round(subKpis.pendingSum).toLocaleString('ru-RU')} €
          </p>
        </div>

        {/* Просрочено */}
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/20 p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-rose-800 block">Просрочено</span>
              <div className="text-lg font-bold text-rose-700">
                {subKpis.overdueCount} {subKpis.overdueCount === 1 ? 'счет' : subKpis.overdueCount < 5 ? 'счета' : 'счетов'}
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs font-extrabold text-rose-700">
            {Math.round(subKpis.overdueSum).toLocaleString('ru-RU')} €
          </p>
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
            placeholder="Поиск по номеру счёта, ученику, родителю..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Все статусы</option>
              <option value="paid">Оплачен</option>
              <option value="pending">Ожидает оплаты</option>
              <option value="overdue">Просрочен</option>
            </select>
          </div>

          {(statusFilter !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
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
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Receipt className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Счетов не найдено</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              По выбранным фильтрам счета отсутствуют.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4">№ счёта</th>
                  <th className="py-3 px-3">Ученик / Родитель</th>
                  <th className="py-3 px-3">За что</th>
                  <th className="py-3 px-3 text-right">Сумма</th>
                  <th className="py-3 px-3">Выставлен</th>
                  <th className="py-3 px-3">Срок оплаты</th>
                  <th className="py-3 px-3 text-center">Статус</th>
                  <th className="py-3 px-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {paginatedInvoices.map((inv) => {
                  const isSelected = selectedInvoiceId === inv.id;
                  const isPaid = inv.status === 'paid';
                  const isOverdue = inv.status === 'overdue';

                  const initials = inv.studentName
                    ? inv.studentName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                    : 'УЧ';

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => onSelectInvoice(inv)}
                      className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-50/50 border-l-2 border-l-blue-600' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        #{inv.invoiceNumber}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate hover:text-blue-600">
                              {inv.studentName}
                            </span>
                            {inv.parentName && (
                              <span className="text-[10px] text-slate-400 block truncate">
                                {inv.parentName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-800 block truncate">
                          {inv.courseName}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {inv.periodLabel}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900 text-sm">
                        {inv.totalAmountEUR.toFixed(2)} €
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        {inv.issueDate}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`font-semibold ${
                            isOverdue ? 'text-rose-700 font-bold' : 'text-slate-700'
                          }`}
                        >
                          {inv.dueDate}
                        </span>
                        {isOverdue && (
                          <span className="rounded-full bg-rose-100 text-rose-800 px-1.5 py-0.2 text-[9px] font-bold ml-1.5 inline-block">
                            просрочен
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isOverdue
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle2 size={10} /> Оплачен
                            </>
                          ) : isOverdue ? (
                            <>
                              <AlertCircle size={10} /> Просрочен
                            </>
                          ) : (
                            <>
                              <Clock size={10} /> Ожидает
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {!isPaid && (
                            <button
                              type="button"
                              onClick={() => onMarkPaid(inv.id)}
                              className="rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 text-[11px] font-bold transition-colors cursor-pointer"
                              title="Внести оплату"
                            >
                              Оплатить
                            </button>
                          )}
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Открыть счет"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredInvoices.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Показано {paginatedInvoices.length} из {filteredInvoices.length} счетов
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
