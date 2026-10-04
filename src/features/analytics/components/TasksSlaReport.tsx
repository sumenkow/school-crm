'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  Download,
  ExternalLink,
  Users,
  ChevronDown,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalyticsFilters, DetailedReportsData } from '../types';

interface TasksSlaReportProps {
  data: DetailedReportsData;
  filters: AnalyticsFilters;
}

export function TasksSlaReport({ data, filters }: TasksSlaReportProps) {
  const { adminTasksList, taskStatusDonut } = data;

  const [selectedAdmin, setSelectedAdmin] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Sample detailed task records based on stored task model
  const detailedTasks = useMemo(() => [
    {
      id: 'task-101',
      title: 'Связаться по продлению абонемента B1',
      client: 'Екатерина Романова',
      admin: 'Анна Иванова',
      deadline: '12.09 18:00',
      reactionTime: '4 мин',
      status: 'completed' as const,
      statusLabel: 'Выполнено вовремя',
      category: 'Продление',
    },
    {
      id: 'task-102',
      title: 'Выставить счет на новый семестр',
      client: 'Алиса Белова',
      admin: 'Анна Иванова',
      deadline: '11.09 14:00',
      reactionTime: '8 мин',
      status: 'completed' as const,
      statusLabel: 'Выполнено вовремя',
      category: 'Оплаты',
    },
    {
      id: 'task-103',
      title: 'Первичный звонок по заявке с сайта',
      client: 'Иван Соколов',
      admin: 'Дмитрий Орлов',
      deadline: '11.09 16:30',
      reactionTime: '48 мин',
      status: 'overdue' as const,
      statusLabel: 'Просрочено SLA',
      category: 'Обращения',
    },
    {
      id: 'task-104',
      title: 'Запись на пробный урок в группу Teens',
      client: 'Максим Иванов',
      admin: 'Мария Смирнова',
      deadline: '12.09 12:00',
      reactionTime: '12 мин',
      status: 'completed' as const,
      statusLabel: 'Выполнено вовремя',
      category: 'Пробные',
    },
    {
      id: 'task-105',
      title: 'Уточнить перенос занятия по болезни',
      client: 'София Климова',
      admin: 'Ольга Кузнецова',
      deadline: '12.09 15:00',
      reactionTime: '7 мин',
      status: 'completed' as const,
      statusLabel: 'Выполнено вовремя',
      category: 'Сопровождение',
    },
    {
      id: 'task-106',
      title: 'Контроль оплаты счета №481',
      client: 'Марк Соколов',
      admin: 'Мария Смирнова',
      deadline: '10.09 19:00',
      reactionTime: '22 мин',
      status: 'overdue' as const,
      statusLabel: 'Просрочено',
      category: 'Оплаты',
    },
    {
      id: 'task-107',
      title: 'Отправить договор и реквизиты',
      client: 'Даниил Орлов',
      admin: 'Дмитрий Орлов',
      deadline: '13.09 11:00',
      reactionTime: '—',
      status: 'in_progress' as const,
      statusLabel: 'В работе',
      category: 'Оплаты',
    },
  ], []);

  const filteredTasks = useMemo(() => {
    return detailedTasks.filter((t) => {
      const matchAdmin = selectedAdmin === 'all' || t.admin === selectedAdmin;
      const matchStatus = selectedStatus === 'all' || t.status === selectedStatus;
      const matchSearch =
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.admin.toLowerCase().includes(searchTerm.toLowerCase());
      return matchAdmin && matchStatus && matchSearch;
    });
  }, [detailedTasks, selectedAdmin, selectedStatus, searchTerm]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['ID', 'Задача', 'Клиент / Ученик', 'Ответственный', 'Срок', 'Время реакции', 'Категория', 'Статус'];
    const rows = filteredTasks.map((t) => [
      t.id,
      t.title,
      t.client,
      t.admin,
      t.deadline,
      t.reactionTime,
      t.category,
      t.statusLabel,
    ]);
    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tasks_sla_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-3.5">
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>Всего задач в периоде</span>
            <CheckSquare className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">199</div>
          <div className="text-[10.5px] text-slate-400 mt-1">План закрытия: 90%+</div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>Выполнено вовремя</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">182 (91.3%)</div>
          <div className="text-[10.5px] text-emerald-700 font-medium mt-1">↑ +4.2 п.п. к прошлому месяцу</div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>Просроченные задачи</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">9 (4.5%)</div>
          <div className="text-[10.5px] text-slate-400 mt-1">Допустимый порог: &lt;5%</div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>Среднее время ответа (SLA)</span>
            <Clock className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-600 mt-1">8.4 мин</div>
          <div className="text-[10.5px] text-emerald-600 font-medium mt-1">В рамках нормы (≤ 15 мин)</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3.5 space-y-3">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск задачи, клиента или админа..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Filter by Admin */}
            <select
              value={selectedAdmin}
              onChange={(e) => setSelectedAdmin(e.target.value)}
              className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">Все администраторы</option>
              <option value="Анна Иванова">Анна Иванова</option>
              <option value="Мария Смирнова">Мария Смирнова</option>
              <option value="Ольга Кузнецова">Ольга Кузнецова</option>
              <option value="Дмитрий Орлов">Дмитрий Орлов</option>
            </select>

            {/* Filter by Status */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">Все статусы</option>
              <option value="completed">Выполнено вовремя</option>
              <option value="overdue">Просрочено</option>
              <option value="in_progress">В работе</option>
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
              href="/tasks"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold shadow-2xs transition-colors"
            >
              Открыть доску задач <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-medium">
                <th className="py-2 pl-1 font-semibold text-slate-500">Задача</th>
                <th className="py-2 font-semibold text-slate-500">Клиент / Ученик</th>
                <th className="py-2 font-semibold text-slate-500">Категория</th>
                <th className="py-2 font-semibold text-slate-500">Ответственный</th>
                <th className="py-2 text-center font-semibold text-slate-500">Срок</th>
                <th className="py-2 text-center font-semibold text-slate-500">SLA ответа</th>
                <th className="py-2 text-right font-semibold text-slate-500 pr-1">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 pl-1 font-semibold text-slate-800">
                    {task.title}
                  </td>
                  <td className="py-2.5 text-slate-600">
                    {task.client}
                  </td>
                  <td className="py-2.5 text-slate-500">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                      {task.category}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-700 font-medium">
                    {task.admin}
                  </td>
                  <td className="py-2.5 text-center text-slate-500 text-[10.5px]">
                    {task.deadline}
                  </td>
                  <td className="py-2.5 text-center font-bold text-slate-700">
                    <span className={task.status === 'overdue' ? 'text-rose-600' : 'text-slate-800'}>
                      {task.reactionTime}
                    </span>
                  </td>
                  <td className="py-2.5 text-right pr-1">
                    <span
                      className={cn(
                        'inline-block px-2 py-0.5 rounded text-[10px] font-bold',
                        task.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : task.status === 'overdue'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-sky-50 text-sky-700 border border-sky-200'
                      )}
                    >
                      {task.statusLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-400">
          <span>Отображено: {filteredTasks.length} задач</span>
          <span className="text-slate-500 font-medium">Синхронизировано с операционной базой задач</span>
        </div>
      </div>
    </div>
  );
}
