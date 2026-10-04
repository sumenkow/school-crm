'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Clock,
  Zap,
  Phone,
  Globe,
  Search,
  Download,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalyticsFilters, DetailedReportsData } from '../types';

interface CommunicationsReportProps {
  data: DetailedReportsData;
  filters: AnalyticsFilters;
}

export function CommunicationsReport({ data, filters }: CommunicationsReportProps) {
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const communicationsList = useMemo(() => [
    {
      id: 'comm-101',
      date: '12.09 10:24',
      client: 'Елена Петрова',
      phone: '+7 (911) 234-56-78',
      channel: 'WhatsApp' as const,
      topic: 'Запись на пробный урок B1',
      reactionMinutes: 3,
      slaStatus: 'on_time' as const,
      admin: 'Анна Иванова',
      outcome: 'Записан на пробный (15.09)',
    },
    {
      id: 'comm-102',
      date: '12.09 09:41',
      client: 'Максим Иванов',
      phone: '+7 (921) 345-67-89',
      channel: 'Telegram' as const,
      topic: 'Вопрос по расписанию Teens',
      reactionMinutes: 12,
      slaStatus: 'on_time' as const,
      admin: 'Мария Смирнова',
      outcome: 'Консультация завершена',
    },
    {
      id: 'comm-103',
      date: '11.09 18:22',
      client: 'Ольга Кузнецова',
      phone: '+7 (905) 456-78-90',
      channel: 'Телефон' as const,
      topic: 'Продление абонемента',
      reactionMinutes: 7,
      slaStatus: 'on_time' as const,
      admin: 'Ольга Кузнецова',
      outcome: 'Выставлен счет (150 €)',
    },
    {
      id: 'comm-104',
      date: '11.09 16:05',
      client: 'Иван Соколов',
      phone: '+7 (916) 567-89-01',
      channel: 'Сайт' as const,
      topic: 'Стоимость курса и формат',
      reactionMinutes: 48,
      slaStatus: 'overdue' as const,
      admin: 'Дмитрий Орлов',
      outcome: 'Отправлен прайс-лист',
    },
    {
      id: 'comm-105',
      date: '11.09 14:15',
      client: 'Марина Васильева',
      phone: '+7 (912) 678-90-12',
      channel: 'WhatsApp' as const,
      topic: 'Индивидуальные занятия',
      reactionMinutes: 4,
      slaStatus: 'on_time' as const,
      admin: 'Анна Иванова',
      outcome: 'Подбор преподавателя',
    },
    {
      id: 'comm-106',
      date: '10.09 19:30',
      client: 'Кирилл Морозов',
      phone: '+7 (903) 789-01-23',
      channel: 'Telegram' as const,
      topic: 'Перенос времени занятия',
      reactionMinutes: 25,
      slaStatus: 'overdue' as const,
      admin: 'Мария Смирнова',
      outcome: 'Расписание скорректировано',
    },
  ], []);

  const filteredCommunications = useMemo(() => {
    return communicationsList.filter((c) => {
      const matchChannel = selectedChannel === 'all' || c.channel === selectedChannel;
      const matchSearch =
        c.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        c.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.admin.toLowerCase().includes(searchTerm.toLowerCase());
      return matchChannel && matchSearch;
    });
  }, [communicationsList, selectedChannel, searchTerm]);

  // Channel badge helper
  const renderChannelBadge = (channel: string) => {
    switch (channel) {
      case 'WhatsApp':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            WhatsApp
          </span>
        );
      case 'Telegram':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            Telegram
          </span>
        );
      case 'Телефон':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Phone className="h-2.5 w-2.5 text-purple-600" />
            Телефон
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Globe className="h-2.5 w-2.5 text-slate-500" />
            Сайт
          </span>
        );
    }
  };

  const handleExportCsv = () => {
    const headers = ['ID', 'Дата', 'Клиент', 'Телефон', 'Канал', 'Тема', 'Время реакции (мин)', 'SLA', 'Администратор', 'Итог'];
    const rows = filteredCommunications.map((c) => [
      c.id,
      c.date,
      c.client,
      c.phone,
      c.channel,
      c.topic,
      c.reactionMinutes,
      c.slaStatus === 'on_time' ? 'В норме' : 'Просрочено',
      c.admin,
      c.outcome,
    ]);
    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `communications_report_${new Date().toISOString().split('T')[0]}.csv`);
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
            <span>Всего обращений</span>
            <MessageSquare className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">148</div>
          <div className="text-[10.5px] text-slate-400 mt-1">Входящий поток в смену</div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>В рамках регламента (≤15м)</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">127 (85.8%)</div>
          <div className="text-[10.5px] text-emerald-700 font-medium mt-1">Цель: не менее 80%</div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>С задержкой SLA (&gt;15м)</span>
            <AlertCircle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">21 (14.2%)</div>
          <div className="text-[10.5px] text-slate-400 mt-1">Пик: вечернее время 18:00–20:00</div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>Среднее время ответа</span>
            <Clock className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-600 mt-1">8.4 мин</div>
          <div className="text-[10.5px] text-emerald-600 font-medium mt-1">Регламент школы: 15 минут</div>
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
                placeholder="Поиск клиента, телефона или темы..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">Все каналы связи</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Telegram">Telegram</option>
              <option value="Телефон">Телефон</option>
              <option value="Сайт">Сайт</option>
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
              href="/crm"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold shadow-2xs transition-colors"
            >
              Воронка лидов <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-medium">
                <th className="py-2 pl-1 font-semibold text-slate-500">Дата/Время</th>
                <th className="py-2 font-semibold text-slate-500">Клиент</th>
                <th className="py-2 font-semibold text-slate-500">Телефон</th>
                <th className="py-2 font-semibold text-slate-500">Канал</th>
                <th className="py-2 font-semibold text-slate-500">Тема обращения</th>
                <th className="py-2 text-center font-semibold text-slate-500">Скорость</th>
                <th className="py-2 font-semibold text-slate-500">Ответственный</th>
                <th className="py-2 text-right font-semibold text-slate-500 pr-1">Результат</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCommunications.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 pl-1 text-slate-500 whitespace-nowrap text-[10.5px]">
                    {item.date}
                  </td>
                  <td className="py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                    {item.client}
                  </td>
                  <td className="py-2.5 text-slate-500 whitespace-nowrap text-[10.5px]">
                    {item.phone}
                  </td>
                  <td className="py-2.5 whitespace-nowrap">
                    {renderChannelBadge(item.channel)}
                  </td>
                  <td className="py-2.5 text-slate-700 font-medium truncate max-w-[150px]" title={item.topic}>
                    {item.topic}
                  </td>
                  <td className="py-2.5 text-center whitespace-nowrap">
                    <span
                      className={cn(
                        'text-[10.5px] font-bold px-1.5 py-0.5 rounded',
                        item.slaStatus === 'on_time'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      )}
                    >
                      {item.reactionMinutes} мин
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-700 font-medium whitespace-nowrap">
                    {item.admin}
                  </td>
                  <td className="py-2.5 text-right pr-1 text-slate-600 font-normal whitespace-nowrap">
                    {item.outcome}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-400">
          <span>Отображено: {filteredCommunications.length} обращений</span>
          <span className="text-slate-500 font-medium">Интеграция с каналами WhatsApp, Telegram, телефония</span>
        </div>
      </div>
    </div>
  );
}
