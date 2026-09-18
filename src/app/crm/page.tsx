'use client';

import React, { useState, useRef } from 'react';
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
  ChevronLeft,
  UserCheck,
  Copy,
  ExternalLink,
  Columns,
  AlertTriangle,
  Wallet,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { INITIAL_LEADS, FullLeadData, TimelineInteraction } from '@/lib/data/mockData';
import { getLeadFinancialSummary } from '@/lib/data/balanceHelper';
import { CreateLeadModal } from '@/components/crm/CreateLeadModal';
import { softDeleteLead, restoreLead, getStoredLeads } from '@/lib/data/leadStorage';
import { triggerWhatsAppContact, triggerTelegramContact } from '@/lib/data/contactWorkflows';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { useLanguage } from '@/context/LanguageContext';

export default function CrmPage() {
  const router = useRouter();
  const toast = useToast();
  const { role, userName } = useRole();
  const { t } = useLanguage();
  const [leads, setLeads] = useState<FullLeadData[]>(() => getStoredLeads(true, true));
  const [tabFilter, setTabFilter] = useState<'active' | 'deleted'>('active');
  const [viewMode, setViewMode] = useState<'grid' | 'kanban' | 'table'>('grid');
  const [mobileStageFilter, setMobileStageFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const kanbanRef = useRef<HTMLDivElement>(null);

  // Sync leads from localStorage and in-memory stores
  React.useEffect(() => {
    const syncLeads = () => {
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('crm_leads_v2');
          if (stored) {
            const storedLeads: FullLeadData[] = JSON.parse(stored);
            if (Array.isArray(storedLeads) && storedLeads.length > 0) {
              const storedIds = new Set(storedLeads.map((l) => l.id));
              const merged = [...storedLeads, ...INITIAL_LEADS.filter((l) => !storedIds.has(l.id))];
              setLeads(merged);
              return;
            }
          }
          setLeads([...INITIAL_LEADS]);
        } catch (e) {
          console.error('Failed to parse leads from localStorage', e);
          setLeads([...INITIAL_LEADS]);
        }
      }
    };

    syncLeads();

    window.addEventListener('crm-leads-changed', syncLeads);
    window.addEventListener('crm-students-changed', syncLeads);
    window.addEventListener('crm-names-synced', syncLeads);
    window.addEventListener('focus', syncLeads);

    return () => {
      window.removeEventListener('crm-leads-changed', syncLeads);
      window.removeEventListener('crm-students-changed', syncLeads);
      window.removeEventListener('crm-names-synced', syncLeads);
      window.removeEventListener('focus', syncLeads);
    };
  }, []);

  const scrollKanban = (direction: 'left' | 'right') => {
    if (kanbanRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      kanbanRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Regulated 8 statuses from Section 12
  const columns = [
    { key: 'new', label: t('crm.stageNew', 'Новые'), badgeColor: 'bg-blue-100 text-blue-800' },
    { key: 'contacted', label: t('crm.stageContacted', 'В работе'), badgeColor: 'bg-amber-100 text-amber-800' },
    { key: 'trial_scheduled', label: t('crm.stageTrialScheduled', 'Пробное назначено'), badgeColor: 'bg-purple-100 text-purple-800' },
    { key: 'trial_held', label: t('crm.stageTrialCompleted', 'Пробное проведено'), badgeColor: 'bg-indigo-100 text-indigo-800' },
    { key: 'thinking', label: t('crm.stageThinking', 'Думают / Счёт'), badgeColor: 'bg-teal-100 text-teal-800' },
    { key: 'paid', label: t('crm.stagePaid', 'Оплачено (Успех)'), badgeColor: 'bg-emerald-100 text-emerald-800' },
    { key: 'lost', label: t('crm.stageLost', 'Потерян'), badgeColor: 'bg-rose-100 text-rose-800' },
    { key: 'no_response', label: t('crm.stageNoResponse', 'Не отвечает'), badgeColor: 'bg-slate-200 text-slate-700' },
  ] as const;

  const handleLeadCreated = (newLead: FullLeadData) => {
    // Reset filters so the new lead is immediately visible in the "Новые" column
    setSearchTerm('');
    setDirectionFilter('all');
    setLeads((prev) => {
      const updated = [newLead, ...prev.filter((l) => l.id !== newLead.id)];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('crm_leads_v2', JSON.stringify(updated));
          import('@/lib/data/leadStorage').then((m) => m.syncLeadToSupabase(newLead));
        } catch (e) {
          console.error('Failed to sync to localStorage', e);
        }
      }
      return updated;
    });
    toast.success(`Лид «${newLead.name}» успешно создан и добавлен в список новых`);
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

    const updatedLead = { ...targetLead, status: newStatus, interactions: updatedInteractions };

    setLeads((prev) => {
      const updated = prev.map((l) =>
        l.id === leadId
          ? updatedLead
          : l
      );
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('crm_leads_v2', JSON.stringify(updated));
          import('@/lib/data/leadStorage').then((m) => m.syncLeadToSupabase(updatedLead));
        } catch (e) {
          console.error('Failed to sync to localStorage', e);
        }
      }
      return updated;
    });

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

  const handleDeleteLead = (leadId: string) => {
    softDeleteLead(leadId);
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, isDeleted: true, is_deleted: true, deletedAt: new Date().toISOString() } : l
      )
    );
    toast.success('Лид перемещен в корзину');
  };

  const handleRestoreLead = (leadId: string) => {
    restoreLead(leadId);
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, isDeleted: false, is_deleted: false, deletedAt: undefined } : l
      )
    );
    toast.success('Лид успешно восстановлен');
  };

  const activeLeads = leads.filter((l) => !l.is_deleted && !(l as any).isDeleted);
  const deletedLeads = leads.filter((l) => l.is_deleted || (l as any).isDeleted);

  const displayedLeads = (tabFilter === 'active' ? activeLeads : deletedLeads).filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contact.includes(searchTerm) ||
      (lead.studentName && lead.studentName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDirection = directionFilter === 'all' || lead.directionOrCourse === directionFilter;
    return matchesSearch && matchesDirection;
  });

  if (role === 'teacher') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="h-14 w-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Доступ ограничен</h2>
        <p className="text-xs text-slate-500 max-w-sm mb-5">
          У вас установлена роль Преподавателя. Раздел CRM и база потенциальных клиентов доступны только администраторам и владельцу школы.
        </p>
        <Link
          href="/schedule"
          className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition-colors"
        >
          Перейти к расписанию
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{t('crm.title', 'CRM Лиды и Воронка')}</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {t('crm.subtitle', 'Управление обращениями, пробными уроками и конверсией в постоянных учеников')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Active / Deleted Tab Switcher */}
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTabFilter('active')}
              className={cn(
                'rounded-md px-3 py-1.5 transition-all cursor-pointer',
                tabFilter === 'active' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Активные ({activeLeads.length})
            </button>
            <button
              type="button"
              onClick={() => setTabFilter('deleted')}
              className={cn(
                'rounded-md px-3 py-1.5 transition-all cursor-pointer flex items-center gap-1',
                tabFilter === 'deleted' ? 'bg-white shadow-xs text-rose-700 font-bold' : 'text-slate-600 hover:text-rose-600'
              )}
            >
              <Trash2 className="h-3 w-3" />
              Удаленные ({deletedLeads.length})
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 transition-colors cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            {t('action.createLead', 'Новый лид')}
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
            placeholder={t('crm.search', 'Поиск лида по имени, телефону или ученику...')}
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            <span>{t('crm.filterCourse', 'Курс:')}</span>
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-none"
            >
              <option value="all">{t('crm.allDirections', 'Все направления')}</option>
              <option value="Английский язык">Английский язык</option>
              <option value="Робототехника">Робототехника</option>
              <option value="Олимпиадная математика">Математика</option>
            </select>
          </div>

          {/* Desktop View Switcher (Hidden on Mobile) */}
          <div className="hidden md:flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            <button
              onClick={() => setViewMode('grid')}
              title={t('crm.viewGrid', 'Сетка (На одном листе)')}
              className={cn(
                'flex items-center gap-1 rounded-md px-2.5 py-1 transition-all cursor-pointer',
                viewMode === 'grid' ? 'bg-white shadow-xs font-bold text-slate-900' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5 text-purple-600" />
              <span>{t('crm.viewGrid', 'Сетка')}</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              title={t('crm.viewBoard', 'Доска (Горизонтально)')}
              className={cn(
                'flex items-center gap-1 rounded-md px-2.5 py-1 transition-all cursor-pointer',
                viewMode === 'kanban' ? 'bg-white shadow-xs font-bold text-slate-900' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Columns className="h-3.5 w-3.5 text-blue-600" />
              <span>{t('crm.viewBoard', 'Доска')}</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              title={t('crm.viewTable', 'Таблица')}
              className={cn(
                'flex items-center gap-1 rounded-md px-2.5 py-1 transition-all cursor-pointer',
                viewMode === 'table' ? 'bg-white shadow-xs font-bold text-slate-900' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <List className="h-3.5 w-3.5" />
              <span>{t('crm.viewTable', 'Таблица')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Horizontal Stage Chips (Scrollable) */}
      {tabFilter === 'active' && (
        <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-1 -mx-2 px-2 no-scrollbar">
          <button
            type="button"
            onClick={() => setMobileStageFilter('all')}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all',
              mobileStageFilter === 'all'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            Все ({displayedLeads.length})
          </button>
          {columns.map((col) => {
            const count = displayedLeads.filter((l) => l.status === col.key).length;
            return (
              <button
                key={col.key}
                type="button"
                onClick={() => setMobileStageFilter(col.key)}
                className={cn(
                  'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5',
                  mobileStageFilter === col.key
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                <span>{col.label}</span>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                    mobileStageFilter === col.key ? 'bg-white/20 text-white' : col.badgeColor
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* VIEW: DELETED LEADS TABLE */}
      {tabFilter === 'deleted' && (
        <div className="overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-xs">
          <div className="p-4 bg-rose-50/50 border-b border-rose-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-rose-950 text-sm">Удаленные лиды (Корзина)</h3>
              <p className="text-xs text-rose-700">Лиды скрыты из активной CRM-воронки, но могут быть восстановлены в любой момент</p>
            </div>
          </div>
          {deletedLeads.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              В корзине нет удаленных лидов
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="py-3.5 pl-4 pr-3">Лид / Контакт</th>
                  <th className="px-3 py-3.5">Ученик</th>
                  <th className="px-3 py-3.5">Курс</th>
                  <th className="px-3 py-3.5">Телефон</th>
                  <th className="px-3 py-3.5">Дата удаления</th>
                  <th className="py-3.5 pl-3 pr-4 text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {displayedLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/80">
                    <td className="py-3 pl-4 pr-3 font-semibold text-slate-900">{lead.name}</td>
                    <td className="px-3 py-3">{lead.studentName}</td>
                    <td className="px-3 py-3 text-purple-700 font-medium">{lead.directionOrCourse}</td>
                    <td className="px-3 py-3 font-mono">{lead.contact}</td>
                    <td className="px-3 py-3 text-slate-400">
                      {lead.deletedAt ? new Date(lead.deletedAt).toLocaleDateString('ru-RU') : 'Недавно'}
                    </td>
                    <td className="py-3 pl-3 pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRestoreLead(lead.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 transition-colors cursor-pointer text-xs"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Восстановить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* MOBILE LIST: Single column of cards filtered by mobileStageFilter */}
      {tabFilter === 'active' && (
        <div className="md:hidden space-y-2.5">
          {(() => {
            const mobileLeads = mobileStageFilter === 'all'
              ? displayedLeads
              : displayedLeads.filter((l) => l.status === mobileStageFilter);

            if (mobileLeads.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                  <p className="text-xs text-slate-400">В этом статусе нет заявок</p>
                </div>
              );
            }

            return mobileLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                columns={columns}
                onQuickStatusChange={handleQuickStatusChange}
                onOpen={() => router.push(`/crm/leads/${lead.id}`)}
                onCopyPhone={() => {
                  navigator.clipboard.writeText(lead.contact);
                  toast.success(`Номер скопирован: ${lead.contact}`);
                }}
                onDeleteLead={handleDeleteLead}
              />
            ));
          })()}
        </div>
      )}

      {/* DESKTOP VIEWS (GRID / KANBAN / TABLE) */}
      <div className="hidden md:block space-y-6">
        {/* VIEW 1: GRID MODE (ALL ON ONE SHEET / SCREEN, SCROLLS DOWN) */}
        {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {columns.map((col) => {
            const colLeads = displayedLeads.filter((l) => l.status === col.key);

            return (
              <div
                key={col.key}
                className="flex flex-col rounded-2xl border border-slate-200 bg-slate-100/70 p-3 shadow-xs min-h-[220px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-1 pb-2.5 border-b border-slate-200/80 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">{col.label}</span>
                  </div>
                  <span className={cn('flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full text-[11px] font-bold shadow-xs', col.badgeColor)}>
                    {colLeads.length}
                  </span>
                </div>

                {/* Cards in column */}
                <div className="space-y-2.5 flex-1">
                  {colLeads.length === 0 ? (
                    <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-slate-300 text-[11px] text-slate-400">
                      Нет лидов
                    </div>
                  ) : (
                    colLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        columns={columns}
                        onQuickStatusChange={handleQuickStatusChange}
                        onOpen={() => router.push(`/crm/leads/${lead.id}`)}
                        onCopyPhone={() => {
                          navigator.clipboard.writeText(lead.contact);
                          toast.success(`Номер скопирован: ${lead.contact}`);
                        }}
                        onDeleteLead={handleDeleteLead}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: KANBAN BOARD (HORIZONTAL WITH PROMINENT CONTROLS & SCROLLBAR) */}
      {viewMode === 'kanban' && (
        <div className="space-y-3">
          {/* Scroll Navigation Controls */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <span>Горизонтальная воронка (8 этапов)</span>
              <span className="text-slate-400">• Используйте стрелки или Shift + колесико</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scrollKanban('left')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-xs transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Влево
              </button>
              <button
                onClick={() => scrollKanban('right')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-xs transition-colors"
              >
                Вправо <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div
            ref={kanbanRef}
            className="flex gap-4 overflow-x-auto pb-4 scroll-smooth"
            style={{
              scrollbarWidth: 'auto',
              scrollbarColor: '#94a3b8 #e2e8f0',
            }}
          >
            {columns.map((col) => {
              const colLeads = displayedLeads.filter((l) => l.status === col.key);

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
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          columns={columns}
                          onQuickStatusChange={handleQuickStatusChange}
                          onOpen={() => router.push(`/crm/leads/${lead.id}`)}
                          onCopyPhone={() => {
                            navigator.clipboard.writeText(lead.contact);
                            toast.success(`Номер скопирован: ${lead.contact}`);
                          }}
                          onDeleteLead={handleDeleteLead}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="py-3.5 pl-4 pr-3">{t('crm.tableLeadContact', 'Лид / Контакт')}</th>
                <th className="px-3 py-3.5">{t('crm.tableStudent', 'Ученик')}</th>
                <th className="px-3 py-3.5">{t('crm.tableCourse', 'Курс')}</th>
                <th className="px-3 py-3.5 text-right">{t('crm.tableBalance', 'Баланс')}</th>
                <th className="px-3 py-3.5">{t('crm.tableStage', 'Статус воронки')}</th>
                <th className="px-3 py-3.5">{t('crm.tableNextAction', 'Следующее действие')}</th>
                <th className="py-3.5 pl-3 pr-4">{t('crm.tableAssignee', 'Ответственный')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {displayedLeads.map((lead) => {
                const finSummary = getLeadFinancialSummary(lead);
                return (
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
                    <td className="px-3 py-3 text-right">
                      {finSummary.isNegative ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                          <AlertTriangle className="h-3 w-3 text-rose-600" />
                          {finSummary.formattedNet}
                        </span>
                      ) : finSummary.deposit > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          <Wallet className="h-3 w-3 text-emerald-600" />
                          {finSummary.formattedDeposit}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">0 ₽</span>
                      )}
                    </td>
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
                    <td className="py-3 pl-3 pr-4 text-slate-600">{lead.assignedTo}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {/* Modal to create new lead */}
      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleLeadCreated}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: LeadCard
// ─────────────────────────────────────────────────────────────────────────────

interface LeadCardProps {
  lead: FullLeadData;
  columns: readonly { readonly key: string; readonly label: string; readonly badgeColor: string }[];
  onQuickStatusChange: (leadId: string, newStatus: FullLeadData['status']) => void;
  onOpen: () => void;
  onCopyPhone: () => void;
  onDeleteLead: (leadId: string) => void;
}

function getCourseBorderClass(course?: string) {
  if (!course) return 'border-l-4 border-l-purple-500';
  const c = course.toLowerCase();
  if (c.includes('англ') || c.includes('english')) return 'border-l-4 border-l-purple-500';
  if (c.includes('робот') || c.includes('robot')) return 'border-l-4 border-l-amber-500';
  if (c.includes('матем') || c.includes('math')) return 'border-l-4 border-l-emerald-500';
  return 'border-l-4 border-l-indigo-500';
}

function LeadCard({ lead, columns, onQuickStatusChange, onOpen, onCopyPhone, onDeleteLead }: LeadCardProps) {
  const { t } = useLanguage();
  const finSummary = getLeadFinancialSummary(lead);

  const displayName = lead.clientType === 'adult_student'
    ? lead.name
    : (lead.studentName && lead.name !== lead.studentName ? `${lead.name} (${lead.studentName})` : lead.name);

  return (
    <div
      onClick={onOpen}
      className={cn(
        "rounded-xl border bg-white p-2.5 shadow-xs hover:shadow-md transition-all cursor-pointer text-left flex flex-col justify-between",
        getCourseBorderClass(lead.directionOrCourse),
        finSummary.isNegative ? "border-rose-300 ring-1 ring-rose-200/60" : "border-slate-200"
      )}
    >
      <div>
        {/* Header: Name + Trash */}
        <div className="flex items-start justify-between gap-1">
          <h4 className="font-bold text-slate-900 text-xs hover:text-purple-600 transition-colors line-clamp-1 flex-1" title={displayName}>
            {displayName}
          </h4>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Переместить лид «${lead.name}» в корзину?`)) {
                  onDeleteLead(lead.id);
                }
              }}
              className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Удалить в корзину"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Direction & Balance Row */}
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <span className="text-[10px] font-semibold text-purple-700 truncate">{lead.directionOrCourse}</span>
          {finSummary.isNegative ? (
            <span className="text-[10px] font-bold text-rose-600 shrink-0">
              {finSummary.formattedNet}
            </span>
          ) : finSummary.deposit > 0 ? (
            <span className="text-[10px] font-semibold text-emerald-600 shrink-0">
              +{finSummary.formattedDeposit}
            </span>
          ) : null}
        </div>

        {/* Contact links */}
        <div className="mt-1.5 flex items-center justify-between gap-1 text-[10px] text-slate-600 pt-1 border-t border-slate-100">
          <span className="truncate text-slate-600 font-mono text-[10px]">{lead.contact}</span>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={onCopyPhone}
              className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              title={t('crm.copyPhone', 'Скопировать')}
            >
              <Copy size={11} />
            </button>
            <button
              type="button"
              onClick={() => triggerWhatsAppContact({
                phone: lead.contact,
                leadId: lead.id,
                leadName: lead.name,
                author: 'Администратор',
              })}
              className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 text-[9px] cursor-pointer"
              title="Написать в WhatsApp"
            >
              WA
            </button>
            {lead.telegram && (
              <button
                type="button"
                onClick={() => triggerTelegramContact({
                  telegram: lead.telegram,
                  phone: lead.contact,
                  leadId: lead.id,
                  leadName: lead.name,
                  author: 'Администратор',
                })}
                className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 font-bold hover:bg-sky-100 text-[9px] cursor-pointer"
                title="Написать в Telegram"
              >
                TG
              </button>
            )}
            <a
              href={`tel:${lead.contact.replace(/[^\d+]/g, '')}`}
              className="p-0.5 rounded text-blue-600 hover:bg-blue-50"
              title="Позвонить"
            >
              <Phone size={11} />
            </a>
          </div>
        </div>

        {/* 1-line task deadline (AI UX 4.3) */}
        {lead.nextAction && (
          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-900 bg-amber-50/90 px-1.5 py-0.5 rounded border border-amber-200/60 truncate">
            <Clock className="h-2.5 w-2.5 text-amber-600 shrink-0" />
            <span className="truncate">
              <span className="font-semibold text-amber-800">{lead.nextActionDate || 'Сегодня'}:</span> {lead.nextAction}
            </span>
          </div>
        )}
      </div>

      {/* Flat full-width bottom selector button [ Изменить статус лида ] (AI UX 4.3) */}
      <div className="mt-2 pt-1 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
        <select
          value={lead.status}
          onChange={(e) => onQuickStatusChange(lead.id, e.target.value as FullLeadData['status'])}
          className="w-full text-center rounded-md border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 py-1 px-1.5 text-[10px] font-semibold text-slate-700 cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-purple-400"
        >
          {columns.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

