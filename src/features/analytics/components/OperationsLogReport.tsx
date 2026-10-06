'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  History,
  Clock,
  Search,
  Download,
  Filter,
  CreditCard,
  CheckSquare,
  MessageSquare,
  UserCheck,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalyticsFilters, DetailedReportsData } from '../types';
import { getStoredInteractions, TimelineInteraction } from '@/lib/data/timelineStorage';

interface OperationsLogReportProps {
  data: DetailedReportsData;
  filters: AnalyticsFilters;
}

export function OperationsLogReport({ data, filters }: OperationsLogReportProps) {
  const [selectedAdmin, setSelectedAdmin] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [interactions, setInteractions] = useState<TimelineInteraction[]>(() =>
    typeof window !== 'undefined' ? getStoredInteractions() : []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleUpdate = () => {
      setInteractions(getStoredInteractions());
    };
    window.addEventListener('crm-timeline-interactions-changed', handleUpdate);
    window.addEventListener('crm-students-changed', handleUpdate);
    return () => {
      window.removeEventListener('crm-timeline-interactions-changed', handleUpdate);
      window.removeEventListener('crm-students-changed', handleUpdate);
    };
  }, []);

  const operationsLog = useMemo(() => {
    if (data.operationsLogs && data.operationsLogs.length > 0) {
      return data.operationsLogs;
    }
    if (!interactions || interactions.length === 0) return [];
    return interactions.slice(0, 50).map((item) => {
      const category =
        item.type === 'payment'
          ? 'Оплаты'
          : item.type === 'teacher_comment' || item.type === 'initial_contact' || item.type === 'follow_up'
          ? 'Обращения'
          : item.type === 'renewal'
          ? 'Продления'
          : item.type === 'organizational' || item.type === 'status_change'
          ? 'Задачи'
          : 'История';
      return {
        id: item.id,
        timestamp: item.occurredAt || (item.createdAt ? new Date(item.createdAt).toLocaleString('ru-RU') : 'Сегодня'),
        admin: item.author || 'Администратор',
        initials: (item.author || 'АД').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'АД',
        category,
        action: item.content || 'Действие в CRM',
        target: item.targetName || item.studentName || 'Клиент',
        status: 'Успешно' as const,
      };
    });
  }, [data.operationsLogs, interactions]);

  const availableAdmins = useMemo(() => {
    return Array.from(new Set(operationsLog.map((l) => l.admin).filter(Boolean))).sort();
  }, [operationsLog]);

  const filteredLogs = useMemo(() => {
    return operationsLog.filter((log) => {
      const matchAdmin = selectedAdmin === 'all' || log.admin === selectedAdmin;
      const matchCategory = selectedCategory === 'all' || log.category === selectedCategory;
      const matchSearch =
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.admin.toLowerCase().includes(searchTerm.toLowerCase());
      return matchAdmin && matchCategory && matchSearch;
    });
  }, [operationsLog, selectedAdmin, selectedCategory, searchTerm]);

  const handleExportCsv = () => {
    const headers = ['Время', 'Администратор', 'Категория', 'Действие', 'Объект / Контекст', 'Результат'];
    const rows = filteredLogs.map((l) => [
      l.timestamp,
      l.admin,
      l.category,
      l.action,
      l.target,
      l.status,
    ]);
    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `operations_log_${new Date().toISOString().split('T')[0]}.csv`);
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
            <span>Всего операций в смене</span>
            <History className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{operationsLog.length}</div>
          <div className="text-[10.5px] text-slate-400 mt-1">Все действия фиксируются в аудите</div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>Финансовые транзакции</span>
            <CreditCard className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {data.heroKpis?.collectedPayments?.paidCount ?? 0} счетов
          </div>
          <div className="text-[10.5px] text-emerald-700 font-medium mt-1">
            {data.heroKpis?.collectedPayments?.amountFormatted ?? '0 €'} собрано
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>Обработано лидов</span>
            <MessageSquare className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-600 mt-1">
            {data.recentCommunications?.length ?? 0} диалогов
          </div>
          <div className="text-[10.5px] text-slate-400 mt-1">Интеграция с каналами связи</div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>Закрыто задач</span>
            <CheckSquare className="h-4 w-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-teal-600 mt-1">
            {data.heroKpis?.taskCompletion?.completed ?? 0} задач
          </div>
          <div className="text-[10.5px] text-teal-700 font-medium mt-1">
            {data.heroKpis?.taskCompletion?.percent ?? 0}% вовремя
          </div>
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
                placeholder="Поиск по действию, объекту или админу..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <select
              value={selectedAdmin}
              onChange={(e) => setSelectedAdmin(e.target.value)}
              className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">Все администраторы</option>
              {availableAdmins.map((admin) => (
                <option key={admin} value={admin}>
                  {admin}
                </option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">Все категории операций</option>
              <option value="Оплаты">Оплаты</option>
              <option value="Обращения">Обращения</option>
              <option value="Задачи">Задачи</option>
              <option value="Продления">Продления</option>
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
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-medium">
                <th className="py-2 pl-1 font-semibold text-slate-500">Время</th>
                <th className="py-2 font-semibold text-slate-500">Администратор</th>
                <th className="py-2 font-semibold text-slate-500">Категория</th>
                <th className="py-2 font-semibold text-slate-500">Действие</th>
                <th className="py-2 font-semibold text-slate-500">Объект / Контекст</th>
                <th className="py-2 text-right font-semibold text-slate-500 pr-1">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <History className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700">
                        {searchTerm || selectedAdmin !== 'all' || selectedCategory !== 'all'
                          ? 'Записей в журнале операций не найдено'
                          : 'Журнал операционной активности пуст'}
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-sm">
                        {searchTerm || selectedAdmin !== 'all' || selectedCategory !== 'all'
                          ? 'Попробуйте изменить поисковый запрос или сбросить фильтры'
                          : 'Все финансовые транзакции, задачи и обращения будут автоматически отображаться здесь'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 pl-1 text-slate-500 whitespace-nowrap text-[10.5px] font-mono">
                      {log.timestamp}
                    </td>
                    <td className="py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                      {log.admin}
                    </td>
                    <td className="py-2.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200/60">
                        {log.category}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-800 font-medium">
                      {log.action}
                    </td>
                    <td className="py-2.5 text-slate-600">
                      {log.target}
                    </td>
                    <td className="py-2.5 text-right pr-1 whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-block px-2 py-0.5 rounded text-[10px] font-bold',
                          log.status === 'Успешно'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        )}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-400">
          <span>Отображено: {filteredLogs.length} событий аудита</span>
          <span className="text-slate-500 font-medium">Неизменяемый журнал операционной активности</span>
        </div>
      </div>
    </div>
  );
}
