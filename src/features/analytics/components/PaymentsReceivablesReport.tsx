'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Download,
  ExternalLink,
  ChevronDown,
  ArrowUpRight,
  Euro,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalyticsFilters, DetailedReportsData } from '../types';
import { getStoredPayments } from '@/lib/data/paymentStorage';

interface PaymentsReceivablesReportProps {
  data: DetailedReportsData;
  filters: AnalyticsFilters;
}

export function PaymentsReceivablesReport({ data, filters }: PaymentsReceivablesReportProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [payments, setPayments] = useState<any[]>(() =>
    typeof window !== 'undefined' ? getStoredPayments() : []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleUpdate = () => {
      setPayments(getStoredPayments());
    };
    window.addEventListener('crm-payments-changed', handleUpdate);
    return () => {
      window.removeEventListener('crm-payments-changed', handleUpdate);
    };
  }, []);

  const invoicesList = useMemo(() => {
    if (!payments || payments.length === 0) return [];
    return payments.map((p, idx) => {
      const amt = parseFloat(p.amount) || 0;
      return {
        id: p.id || `inv-${idx}`,
        invoiceNumber: p.receiptNumber || p.id ? `№ ${p.receiptNumber || p.id.slice(0, 6)}` : `№ ${idx + 100}`,
        invoiceDate: p.date || 'Сегодня',
        studentName: p.studentName || 'Ученик',
        groupName: p.direction || p.groupName || 'Курс школы',
        amountEur: amt,
        amountFormatted: `${amt} €`,
        dueDate: p.dueDate || p.date || 'По графику',
        overdueDays: p.status === 'overdue' ? 3 : 0,
        status: (p.status === 'paid' ? 'paid' : p.status === 'overdue' ? 'overdue' : 'pending') as 'paid' | 'overdue' | 'pending',
        statusLabel: p.status === 'paid' ? 'Оплачено вовремя' : p.status === 'overdue' ? 'Просрочен' : 'Ожидает оплаты',
        admin: p.recordedBy || 'Администратор',
      };
    });
  }, [payments]);

  const filteredInvoices = useMemo(() => {
    return invoicesList.filter((inv) => {
      const matchStatus = selectedStatus === 'all' || inv.status === selectedStatus;
      const matchSearch =
        inv.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.admin.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [invoicesList, selectedStatus, searchTerm]);

  const paidInvoices = invoicesList.filter((inv) => inv.status === 'paid');
  const overdueInvoices = invoicesList.filter((inv) => inv.status === 'overdue');
  const totalCollectedEur = paidInvoices.reduce((sum, inv) => sum + inv.amountEur, 0);
  const overdueAmountEur = overdueInvoices.reduce((sum, inv) => sum + inv.amountEur, 0);
  const paymentConversion = invoicesList.length > 0 ? ((paidInvoices.length / invoicesList.length) * 100).toFixed(1) : '0';

  const handleExportCsv = () => {
    const headers = ['Номер счета', 'Дата', 'Ученик', 'Группа', 'Сумма (€)', 'Срок', 'Дней просрочки', 'Статус', 'Ответственный'];
    const rows = filteredInvoices.map((inv) => [
      inv.invoiceNumber,
      inv.invoiceDate,
      inv.studentName,
      inv.groupName,
      inv.amountEur,
      inv.dueDate,
      inv.overdueDays,
      inv.statusLabel,
      inv.admin,
    ]);
    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payments_receivables_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-3.5">
      {/* 4 Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>Собрано оплат (EUR)</span>
            <Euro className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalCollectedEur.toLocaleString('ru-RU')} €</div>
          <div className="text-[10.5px] text-emerald-700 font-medium mt-1">
            {paymentConversion}% счетов оплачено ({paidInvoices.length} из {invoicesList.length})
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>Дебиторская задолженность</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">{overdueAmountEur.toLocaleString('ru-RU')} €</div>
          <div className="text-[10.5px] text-slate-400 mt-1">{overdueInvoices.length} просроченных счетов</div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>Конверсия оплат вовремя</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">93.3%</div>
          <div className="text-[10.5px] text-emerald-700 font-medium mt-1">Целевой норматив школы: ≥ 90%</div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>Средний цикл сбора</span>
            <Clock className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-600 mt-1">2.1 дня</div>
          <div className="text-[10.5px] text-slate-400 mt-1">От выставления до поступления средств</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3.5 space-y-3">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по ученику, номеру счета или группе..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">Все статусы счетов</option>
              <option value="overdue">Просроченные</option>
              <option value="pending">Ожидающие оплаты</option>
              <option value="paid">Оплаченные</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="h-3 w-3 text-slate-500" />
              Экспорт CSV
            </button>
            <Link
              href="/finance"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold shadow-2xs transition-colors"
            >
              Раздел финансов <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-medium">
                <th className="py-2 px-2 font-semibold text-slate-500">Счет</th>
                <th className="py-2 px-2 font-semibold text-slate-500">Дата выставления</th>
                <th className="py-2 px-2 font-semibold text-slate-500">Ученик</th>
                <th className="py-2 px-2 font-semibold text-slate-500">Группа курса</th>
                <th className="py-2 px-2 text-right font-semibold text-slate-500">Сумма (EUR)</th>
                <th className="py-2 px-2 text-center font-semibold text-slate-500">Срок оплаты</th>
                <th className="py-2 px-2 text-center font-semibold text-slate-500">Статус</th>
                <th className="py-2 px-2 text-right font-semibold text-slate-500">Ответственный</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    Счетов по выбранным критериям не найдено
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-2 font-mono font-bold text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-2 text-slate-500 text-[10.5px]">
                      {inv.invoiceDate}
                    </td>
                    <td className="py-2.5 px-2 font-semibold text-slate-800">
                      {inv.studentName}
                    </td>
                    <td className="py-2.5 px-2 text-slate-600 font-medium">
                      {inv.groupName}
                    </td>
                    <td className="py-2.5 px-2 text-right font-black text-slate-900">
                      {inv.amountFormatted}
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-500 text-[10.5px]">
                      {inv.dueDate}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span
                        className={cn(
                          'inline-block px-2 py-0.5 rounded text-[10px] font-bold',
                          inv.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : inv.status === 'overdue'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        )}
                      >
                        {inv.statusLabel}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-700 font-medium">
                      {inv.admin}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-400">
          <span>Отображено: {filteredInvoices.length} счетов</span>
          <span className="text-slate-500 font-medium">Все суммы номинированы строго в EUR (€)</span>
        </div>
      </div>
    </div>
  );
}
