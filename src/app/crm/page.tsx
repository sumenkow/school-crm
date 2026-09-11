'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Calendar,
  Phone,
  MessageSquare,
  DollarSign,
  Clock,
  Filter,
  LayoutGrid,
  List,
  ChevronRight,
  UserCheck,
  Copy,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { INITIAL_LEADS, FullLeadData, TimelineInteraction } from '@/lib/data/mockData';
import { CreateLeadModal } from '@/components/crm/CreateLeadModal';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';

export default function CrmPage() {
  const router = useRouter();
  const toast = useToast();
  const { userName } = useRole();
  const [leads, setLeads] = useState<FullLeadData[]>(INITIAL_LEADS);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Regulated 8 statuses from Section 12
  const columns = [
    { key: 'new', label: 'Новые', badgeColor: 'bg-blue-100 text-blue-800' },
    { key: 'contacted', label: 'В работе', badgeColor: 'bg-amber-100 text-amber-800' },
    { key: 'trial_scheduled', label: 'Пробное назначено', badgeColor: 'bg-purple-100 text-purple-800' },
    { key: 'trial_held', label: 'Пробное проведено', badgeColor: 'bg-indigo-100 text-indigo-800' },
    { key: 'thinking', label: 'Думают / Счёт', badgeColor: 'bg-teal-100 text-teal-800' },
    { key: 'paid', label: 'Оплачено (Успех)', badgeColor: 'bg-emerald-100 text-emerald-800' },
    { key: 'lost', label: 'Потерян', badgeColor: 'bg-rose-100 text-rose-800' },
    { key: 'no_response', label: 'Не отвечает', badgeColor: 'bg-slate-200 text-slate-700' },
  ] as const;

  const handleLeadCreated = (newLead: FullLeadData) => {
    setLeads((prev) => [newLead, ...prev]);
  };

  const handleQuickStatusChange = (leadId: string, newStatus: FullLeadData['status']) => {
    const targetLead = leads.find((l) => l.id === leadId);
    if (!targetLead || targetLead.status === newStatus) return;

    const oldStatusObj = columns.find((c) => c.key === targetLead.status);
    const newStatusObj = columns.find((c) => c.key === newStatus);

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeFormatted = now.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const statusChangeInteraction: TimelineInteraction = {
      id: `status_change_${Date.now()}`,
      studentId: targetLead.convertedStudentId,
      occurredAt: `${dateFormatted}, ${timeFormatted}`,
      channel: 'other',
      type: 'status_change',
      author: userName || 'Администратор',
      content: `Сменил(а) статус воронки: «${oldStatusObj?.label || targetLead.status}» → «${newStatusObj?.label || newStatus}»`,
      result: `Этап воронки: ${newStatusObj?.label || newStatus}`,
    };

    const updatedInteractions = [statusChangeInteraction, ...(targetLead.interactions || [])];

    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, status: newStatus, interactions: updatedInteractions }
          : l
      )
    );

    // Also update in-memory INITIAL_LEADS so it persists across views
    const idx = INITIAL_LEADS.findIndex((l) => l.id === leadId);
    if (idx !== -1) {
      INITIAL_LEADS[idx] = {
        ...INITIAL_LEADS[idx],
        status: newStatus,
        interactions: updatedInteractions,
      };
    }

    toast.success(`Статус «${targetLead.name}» изменен на «${newStatusObj?.label}» и зафиксирован в таймлайне`);
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contact.includes(searchTerm) ||
      (lead.studentName && lead.studentName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDirection = directionFilter === 'all' || lead.directionOrCourse === directionFilter;
    return matchesSearch && matchesDirection;
  });

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">CRM Лиды и Воронка</h1>
          <p className="text-sm text-slate-500">
            Управление обращениями, пробными уроками и конверсией в постоянных учеников
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            + Новый лид
          </button>
        </div>
      </div>

      {/* Filter and View Mode Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Поиск лида по имени, телефону или ученику..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            <span>Курс:</span>
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-none"
            >
              <option value="all">Все направления</option>
              <option value="Английский язык">Английский язык</option>
              <option value="Робототехника">Робототехника</option>
              <option value="Олимпиадная математика">Математика</option>
            </select>
          </div>

          <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'flex items-center gap-1 rounded-md px-2.5 py-1 transition-all',
                viewMode === 'kanban' ? 'bg-white shadow-xs font-bold text-slate-900' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Воронка
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-1 rounded-md px-2.5 py-1 transition-all',
                viewMode === 'table' ? 'bg-white shadow-xs font-bold text-slate-900' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <List className="h-3.5 w-3.5" />
              Список
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-6">
          {columns.map((col) => {
            const colLeads = filteredLeads.filter((l) => l.status === col.key);

            return (
              <div
                key={col.key}
                className="flex w-72 shrink-0 flex-col rounded-2xl border border-slate-200 bg-slate-100/70 p-3 shadow-xs"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-1 pb-3">
                  <span className="text-xs font-bold text-slate-800">{col.label}</span>
                  <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold shadow-xs', col.badgeColor)}>
                    {colLeads.length}
                  </span>
                </div>

                {/* Cards in column */}
                <div className="space-y-3 flex-1">
                  {colLeads.length === 0 ? (
                    <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-300 text-[11px] text-slate-400">
                      Нет лидов
                    </div>
                  ) : (
                    colLeads.map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => router.push(`/crm/leads/${lead.id}`)}
                        className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:shadow-md transition-all cursor-pointer text-left"
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-slate-900 text-sm hover:text-purple-600 transition-colors">
                            {lead.name}
                          </h4>
                          <span className="text-[10px] text-slate-400">{lead.source}</span>
                        </div>
                        <p className="text-xs font-semibold text-purple-700 mt-0.5">{lead.directionOrCourse}</p>
                        <p className="text-[11px] text-slate-500">Ученик: {lead.studentName}</p>

                        <div className="mt-2.5 space-y-1 text-[11px] text-slate-600 border-t border-slate-100 pt-2">
                          <div className="flex items-center justify-between gap-1 text-slate-700">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Phone className="h-3 w-3 text-slate-400 flex-shrink-0" />
                              <span className="truncate">{lead.contact}</span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(lead.contact);
                                  toast.success(`Номер скопирован: ${lead.contact}`);
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                title="Скопировать телефон"
                              >
                                <Copy size={12} />
                              </button>
                              <a
                                href={`https://wa.me/${lead.contact.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 transition-colors text-[10px]"
                                title="Написать в WhatsApp"
                              >
                                WA
                              </a>
                              <a
                                href={`tel:${lead.contact.replace(/[^\d+]/g, '')}`}
                                className="p-1 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Позвонить"
                              >
                                <Phone size={12} />
                              </a>
                            </div>
                          </div>
                          {lead.trialDate && (
                            <div className="flex items-center gap-1.5 text-purple-700 font-medium">
                              <Calendar className="h-3 w-3 text-purple-500" />
                              <span>Пробное: {lead.trialDate}</span>
                            </div>
                          )}
                          {lead.offerAmount && (
                            <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                              <DollarSign className="h-3 w-3 text-emerald-500" />
                              <span>{lead.offerAmount}</span>
                            </div>
                          )}
                        </div>

                        {/* Next Action Box */}
                        {lead.nextAction && (
                          <div className="mt-2.5 rounded-lg bg-amber-50/80 p-2 border border-amber-200/60 text-[11px]">
                            <p className="text-amber-900 font-medium leading-tight">
                              → {lead.nextAction}
                            </p>
                            {lead.nextActionDate && (
                              <p className="text-amber-700 text-[10px] mt-0.5 font-semibold">
                                Срок: {lead.nextActionDate}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Stage Selector on Card */}
                        <div
                          className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-slate-400 font-medium">Этап:</span>
                          <select
                            value={lead.status}
                            onChange={(e) => handleQuickStatusChange(lead.id, e.target.value as FullLeadData['status'])}
                            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:border-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-400"
                          >
                            {columns.map((c) => (
                              <option key={c.key} value={c.key}>{c.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="py-3.5 pl-4 pr-3">Лид / Контакт</th>
                <th className="px-3 py-3.5">Ученик</th>
                <th className="px-3 py-3.5">Курс</th>
                <th className="px-3 py-3.5">Статус воронки</th>
                <th className="px-3 py-3.5">Следующее действие</th>
                <th className="px-3 py-3.5">Ответственный</th>
                <th className="py-3.5 pl-3 pr-4 text-right">Карточка</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => router.push(`/crm/leads/${lead.id}`)}
                  className="hover:bg-slate-50/80 cursor-pointer"
                >
                  <td className="py-3 pl-4 pr-3 font-semibold text-slate-900">
                    <div>{lead.name}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{lead.contact}</div>
                  </td>
                  <td className="px-3 py-3">{lead.studentName}</td>
                  <td className="px-3 py-3 font-medium text-purple-700">{lead.directionOrCourse}</td>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={lead.status}
                      onChange={(e) => handleQuickStatusChange(lead.id, e.target.value as FullLeadData['status'])}
                      className={cn(
                        'rounded-lg px-2 py-1 font-semibold text-[11px] border border-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-400',
                        lead.status === 'paid' && 'bg-emerald-50 text-emerald-800 border-emerald-200',
                        lead.status === 'trial_held' && 'bg-indigo-50 text-indigo-800 border-indigo-200',
                        lead.status === 'trial_scheduled' && 'bg-purple-50 text-purple-800 border-purple-200',
                        lead.status === 'thinking' && 'bg-teal-50 text-teal-800 border-teal-200',
                        lead.status === 'new' && 'bg-blue-50 text-blue-800 border-blue-200',
                        lead.status === 'lost' && 'bg-rose-50 text-rose-800 border-rose-200',
                        lead.status === 'contacted' && 'bg-amber-50 text-amber-800 border-amber-200',
                        lead.status === 'no_response' && 'bg-slate-100 text-slate-700 border-slate-300'
                      )}
                    >
                      {columns.map((c) => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-slate-800">{lead.nextAction || '—'}</p>
                    <p className="text-[10px] text-amber-700 font-semibold">{lead.nextActionDate}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{lead.assignedTo}</td>
                  <td className="py-3 pl-3 pr-4 text-right">
                    <span className="text-xs font-semibold text-purple-600 hover:underline inline-flex items-center">
                      Открыть <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal to create new lead */}
      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleLeadCreated}
      />
    </div>
  );
}
