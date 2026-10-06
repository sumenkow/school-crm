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

  const communicationsList = useMemo(() => {
    if (!data.recentCommunications || data.recentCommunications.length === 0) return [];
    return data.recentCommunications.map((c) => ({
      id: c.id,
      date: c.date,
      client: c.clientName,
      phone: c.phone || '—',
      channel: c.channel,
      topic: c.subject,
      reactionMinutes: c.reactionMinutes ?? (parseInt(c.reactionTime, 10) || 0),
      slaStatus: (c.isOverdueSla ? 'overdue' : 'on_time') as 'overdue' | 'on_time',
      admin: c.responsibleName,
      outcome: c.outcome || c.status,
    }));
  }, [data.recentCommunications]);

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

  const totalComms = communicationsList.length;
  const onTimeComms = communicationsList.filter((c) => c.slaStatus === 'on_time').length;
  const overdueComms = communicationsList.filter((c) => c.slaStatus !== 'on_time').length;
  const onTimePercent = totalComms > 0 ? ((onTimeComms / totalComms) * 100).toFixed(1) : '0';
  const overduePercent = totalComms > 0 ? ((overdueComms / totalComms) * 100).toFixed(1) : '0';
  const avgSlaMinutes = data.heroKpis?.contactSla?.minutes ?? 0;

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
          <div className="text-2xl font-black text-slate-900 mt-1">{totalComms}</div>
          <div className="text-[10.5px] text-slate-400 mt-1">Входящий поток в смену</div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>В рамках регламента (≤15м)</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {onTimeComms} ({onTimePercent}%)
          </div>
          <div className="text-[10.5px] text-emerald-700 font-medium mt-1">Цель: не менее 80%</div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>С задержкой SLA (&gt;15м)</span>
            <AlertCircle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {overdueComms} ({overduePercent}%)
          </div>
          <div className="text-[10.5px] text-slate-400 mt-1">
            {overdueComms > 0 ? 'Требуется сократить время ответа' : 'Задержек регламента нет'}
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>Среднее время ответа</span>
            <Clock className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-600 mt-1">
            {avgSlaMinutes > 0 ? `${avgSlaMinutes} мин` : '—'}
          </div>
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
              {filteredCommunications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <MessageSquare className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700">
                        {searchTerm || selectedChannel !== 'all'
                          ? 'Обращений по выбранным фильтрам не найдено'
                          : 'Нет обращений за выбранный период'}
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-sm">
                        {searchTerm || selectedChannel !== 'all'
                          ? 'Попробуйте изменить поисковый запрос или выбрать другой канал связи'
                          : 'Входящие обращения через WhatsApp, Telegram и сайт появятся в этом отчёте'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCommunications.map((item) => (
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
                ))
              )}
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
