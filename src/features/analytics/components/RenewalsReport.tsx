'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Download,
  ExternalLink,
  Users,
  ChevronDown,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalyticsFilters, DetailedReportsData } from '../types';

interface RenewalsReportProps {
  data: DetailedReportsData;
  filters: AnalyticsFilters;
}

export function RenewalsReport({ data, filters }: RenewalsReportProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const renewalsList = useMemo(() => [
    {
      id: 'ren-201',
      studentName: 'Екатерина Романова',
      groupName: 'English B1 Teens',
      expirationDate: '15.09.2026',
      contactDate: '08.09.2026',
      status: 'renewed' as const,
      statusLabel: 'Продлен вовремя',
      admin: 'Анна Иванова',
      nextCyclePrice: '120 €',
    },
    {
      id: 'ren-202',
      studentName: 'Максим Иванов',
      groupName: 'English Teens B2',
      expirationDate: '16.09.2026',
      contactDate: '09.09.2026',
      status: 'renewed' as const,
      statusLabel: 'Продлен вовремя',
      admin: 'Мария Смирнова',
      nextCyclePrice: '140 €',
    },
    {
      id: 'ren-203',
      studentName: 'Алиса Белова',
      groupName: 'English B1 Teens',
      expirationDate: '12.09.2026',
      contactDate: '11.09.2026',
      status: 'pending' as const,
      statusLabel: 'Согласование расписания',
      admin: 'Анна Иванова',
      nextCyclePrice: '120 €',
    },
    {
      id: 'ren-204',
      studentName: 'Марк Соколов',
      groupName: 'Kids Starter A1',
      expirationDate: '10.09.2026',
      contactDate: '10.09.2026',
      status: 'overdue' as const,
      statusLabel: 'Просрочен срок решения',
      admin: 'Мария Смирнова',
      nextCyclePrice: '80 €',
    },
    {
      id: 'ren-205',
      studentName: 'София Климова',
      groupName: 'IELTS Intensive',
      expirationDate: '18.09.2026',
      contactDate: '12.09.2026',
      status: 'renewed' as const,
      statusLabel: 'Продлен вовремя',
      admin: 'Ольга Кузнецова',
      nextCyclePrice: '150 €',
    },
    {
      id: 'ren-206',
      studentName: 'Игорь Денисов',
      groupName: 'German A2 Adults',
      expirationDate: '05.09.2026',
      contactDate: '06.09.2026',
      status: 'churn' as const,
      statusLabel: 'Отказ (смена графика)',
      admin: 'Дмитрий Орлов',
      nextCyclePrice: '110 €',
    },
  ], []);

  const filteredRenewals = useMemo(() => {
    return renewalsList.filter((r) => {
      const matchStatus = selectedStatus === 'all' || r.status === selectedStatus;
      const matchSearch =
        r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.admin.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [renewalsList, selectedStatus, searchTerm]);

  const handleExportCsv = () => {
    const headers = ['Ученик', 'Группа', 'Окончание абонемента', 'Дата контакта', 'Статус продления', 'Сумма следующего цикла', 'Ответственный'];
    const rows = filteredRenewals.map((r) => [
      r.studentName,
      r.groupName,
      r.expirationDate,
      r.contactDate,
      r.statusLabel,
      r.nextCyclePrice,
      r.admin,
    ]);
    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `renewals_report_${new Date().toISOString().split('T')[0]}.csv`);
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
            <span>Конверсия продления</span>
            <RefreshCw className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">88.5%</div>
          <div className="text-[10.5px] text-emerald-700 font-medium mt-1">Выше целевого плана (85%)</div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>Продлены вовремя</span>
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">23</div>
          <div className="text-[10.5px] text-slate-400 mt-1">Из 26 завершающихся абонементов</div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>В согласовании / Просрочка</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">2</div>
          <div className="text-[10.5px] text-slate-400 mt-1">Требуется повторный звонок</div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>Уход / Не продлили</span>
            <Users className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">1 (3.8%)</div>
          <div className="text-[10.5px] text-slate-400 mt-1">Причина: переезд / смена графика</div>
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
                placeholder="Поиск по ученику или группе..."
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
              <option value="all">Все статусы продления</option>
              <option value="renewed">Продлен вовремя</option>
              <option value="pending">Согласование</option>
              <option value="overdue">Просрочен срок решения</option>
              <option value="churn">Отказ / Уход</option>
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
              href="/students"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold shadow-2xs transition-colors"
            >
              База учеников <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Renewals Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-medium">
                <th className="py-2 px-2 font-semibold text-slate-500">Ученик</th>
                <th className="py-2 px-2 font-semibold text-slate-500">Группа курса</th>
                <th className="py-2 px-2 text-center font-semibold text-slate-500">Окончание</th>
                <th className="py-2 px-2 text-center font-semibold text-slate-500">Дата контакта</th>
                <th className="py-2 px-2 text-right font-semibold text-slate-500">Сумма цикла</th>
                <th className="py-2 px-2 font-semibold text-slate-500">Ответственный</th>
                <th className="py-2 px-2 text-right font-semibold text-slate-500">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRenewals.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-2 font-semibold text-slate-800">
                    {item.studentName}
                  </td>
                  <td className="py-2.5 px-2 text-slate-600 font-medium">
                    {item.groupName}
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-500 text-[10.5px]">
                    {item.expirationDate}
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-500 text-[10.5px]">
                    {item.contactDate}
                  </td>
                  <td className="py-2.5 px-2 text-right font-bold text-slate-900">
                    {item.nextCyclePrice}
                  </td>
                  <td className="py-2.5 px-2 text-slate-700 font-medium">
                    {item.admin}
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <span
                      className={cn(
                        'inline-block px-2 py-0.5 rounded text-[10px] font-bold',
                        item.status === 'renewed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : item.status === 'pending'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : item.status === 'overdue'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      )}
                    >
                      {item.statusLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-400">
          <span>Отображено: {filteredRenewals.length} записей</span>
          <span className="text-slate-500 font-medium">Регламент удержания: контакт за 7 дней до окончания</span>
        </div>
      </div>
    </div>
  );
}
