'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Search,
  MessageSquare,
  Phone,
  CreditCard,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { FullPaymentData } from '@/lib/data/mockData';
import { triggerWhatsAppContact, triggerTelegramContact } from '@/lib/data/contactWorkflows';
import { WhatsAppIcon, TelegramIcon } from '@/components/crm/LeadDetailsModal';
import { DebtorDetailData } from './FinanceDetailDrawer';

interface DebtsTabProps {
  debtors: DebtorDetailData[];
  selectedDebtorKey?: string;
  onSelectDebtor: (debtor: DebtorDetailData) => void;
  onSettlePayment: (studentId?: string, parentId?: string) => void;
}

export function DebtsTab({
  debtors,
  selectedDebtorKey,
  onSelectDebtor,
  onSettlePayment,
}: DebtsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [overdueRange, setOverdueRange] = useState<'all' | 'under7' | '7to30' | 'over30'>('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Sub-KPIs
  const subKpis = useMemo(() => {
    const totalDebtEur = debtors.reduce((sum, d) => sum + d.totalEur, 0);
    const totalDebtorsCount = debtors.length;

    const over7 = debtors.filter((d) => d.daysOverdue >= 7 && d.daysOverdue < 30);
    const over7Sum = over7.reduce((sum, d) => sum + d.totalEur, 0);

    const over30 = debtors.filter((d) => d.daysOverdue >= 30);
    const over30Sum = over30.reduce((sum, d) => sum + d.totalEur, 0);

    return {
      totalDebtEur,
      totalDebtorsCount,
      over7Count: over7.length,
      over7Sum,
      over30Count: over30.length,
      over30Sum,
    };
  }, [debtors]);

  // Filtered debtors
  const filteredDebtors = useMemo(() => {
    return debtors.filter((d) => {
      if (overdueRange === 'under7' && d.daysOverdue >= 7) return false;
      if (overdueRange === '7to30' && (d.daysOverdue < 7 || d.daysOverdue >= 30)) return false;
      if (overdueRange === 'over30' && d.daysOverdue < 30) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchParent = (d.parentName || '').toLowerCase().includes(q);
        const matchPhone = (d.contactPhone || '').toLowerCase().includes(q);
        const matchStudents = d.studentNames.some((s) => s.toLowerCase().includes(q));
        if (!matchParent && !matchPhone && !matchStudents) return false;
      }

      return true;
    });
  }, [debtors, overdueRange, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredDebtors.length / pageSize));
  const paginatedDebtors = filteredDebtors.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const hasActiveFilters = overdueRange !== 'all' || searchQuery;

  return (
    <div className="space-y-4">
      {/* 4 Sub-KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Общий долг */}
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/30 p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-rose-800 block">Общий долг</span>
              <div className="text-lg font-black text-rose-700">
                {Math.round(subKpis.totalDebtEur).toLocaleString('ru-RU')} €
              </div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-rose-700 font-semibold">
            {subKpis.totalDebtorsCount} {subKpis.totalDebtorsCount === 1 ? 'должник' : 'должников'}
          </p>
        </div>

        {/* Должников */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Всего должников</span>
              <div className="text-lg font-bold text-slate-900">{subKpis.totalDebtorsCount}</div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Требуют внимания</p>
        </div>

        {/* Просрочено > 7 дней */}
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/20 p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-900 block">Просрочено &gt; 7 дней</span>
              <div className="text-lg font-bold text-amber-800">
                {Math.round(subKpis.over7Sum).toLocaleString('ru-RU')} €
              </div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-amber-700 font-medium">
            {subKpis.over7Count} должников
          </p>
        </div>

        {/* Просрочено > 30 дней */}
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/20 p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-rose-200 text-rose-900 flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-rose-950 block">Просрочено &gt; 30 дней</span>
              <div className="text-lg font-bold text-rose-800">
                {Math.round(subKpis.over30Sum).toLocaleString('ru-RU')} €
              </div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-rose-700 font-medium">
            {subKpis.over30Count} должников
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
            placeholder="Поиск по ученику, родителю, телефону..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-[11px] font-medium text-slate-400">Просрочка:</span>
            <select
              value={overdueRange}
              onChange={(e) => setOverdueRange(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Все</option>
              <option value="under7">До 7 дней</option>
              <option value="7to30">7–30 дней</option>
              <option value="over30">Более 30 дней</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setOverdueRange('all');
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
        {filteredDebtors.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-slate-800">Задолженностей нет</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Все оплаты по выбранным фильтрам внесены вовремя.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4">Ученик / Родитель</th>
                  <th className="py-3 px-3 text-right">Сумма долга</th>
                  <th className="py-3 px-3">Просрочка</th>
                  <th className="py-3 px-3">Последний платёж</th>
                  <th className="py-3 px-3">Абонемент / Группа</th>
                  <th className="py-3 px-3">Ответственный</th>
                  <th className="py-3 px-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {paginatedDebtors.map((d) => {
                  const isSelected = selectedDebtorKey === d.familyKey;
                  const initials = d.studentNames[0]
                    ? d.studentNames[0]
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                    : 'УЧ';

                  return (
                    <tr
                      key={d.familyKey}
                      onClick={() => onSelectDebtor(d)}
                      className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                        isSelected ? 'bg-rose-50/40 border-l-2 border-l-rose-600' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate hover:text-blue-600">
                              {d.studentNames.join(', ')}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {d.parentName} • {d.contactPhone}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-black text-rose-700 text-sm">
                        {Math.round(d.totalEur).toLocaleString('ru-RU')} €
                      </td>

                      <td className="py-3 px-3">
                        <span className="rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold inline-block">
                          {d.daysOverdue} дней
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {d.lastPaymentDate || '01.09.2026'}
                      </td>

                      <td className="py-3 px-3 text-slate-700 truncate max-w-xs">
                        {d.groupName || 'Основная группа'}
                      </td>

                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {d.responsibleName || 'Анна Петрова'}
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {/* WhatsApp icon button */}
                          <button
                            type="button"
                            onClick={() =>
                              triggerWhatsAppContact({
                                phone: d.contactPhone,
                                parentId: d.parentId,
                                clientName: d.parentName,
                                targetRole: 'Родитель',
                                template: `Здравствуйте, ${d.parentName}! Напоминаем об оплате (${d.studentNames.join(', ')}) на сумму ${Math.round(d.totalEur)} €.`,
                              })
                            }
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                            title="Написать в WhatsApp"
                          >
                            <WhatsAppIcon className="h-3.5 w-3.5 text-[#25D366]" />
                          </button>

                          {/* Telegram icon button */}
                          <button
                            type="button"
                            onClick={() =>
                              triggerTelegramContact({
                                phone: d.contactPhone,
                                parentId: d.parentId,
                                clientName: d.parentName,
                                targetRole: 'Родитель',
                              })
                            }
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                            title="Написать в Telegram"
                          >
                            <TelegramIcon className="h-3.5 w-3.5 text-[#229ED9]" />
                          </button>

                          {/* Settle Payment button */}
                          <button
                            type="button"
                            onClick={() => onSettlePayment(d.studentId || d.payments[0]?.studentId, d.parentId)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                            title="Внести оплату"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                          </button>
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
        {filteredDebtors.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Показано {paginatedDebtors.length} из {filteredDebtors.length} должников
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
