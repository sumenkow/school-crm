'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useFocusSync } from '@/hooks/useFocusSync';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Calendar,
  Phone,
  MessageSquare,
  Clock,
  Filter,
  Columns,
  List,
  Copy,
  AlertTriangle,
  Wallet,
  Trash2,
  RotateCcw,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Check,
  CheckSquare,
  Square,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { INITIAL_LEADS, FullLeadData, TimelineInteraction } from '@/lib/data/mockData';
import { getLeadFinancialSummary } from '@/lib/data/balanceHelper';
import { getEurRubRate, convertEurToRub, convertRubToEur } from '@/lib/data/currencyHelper';
import { CreateLeadModal } from '@/components/crm/CreateLeadModal';
import { LeadDetailsModal, WhatsAppIcon, TelegramIcon } from '@/components/crm/LeadDetailsModal';
import { ConvertLeadModal } from '@/components/crm/ConvertLeadModal';
import { softDeleteLead, restoreLead, getStoredLeads, syncLeadToSupabase, saveLeadToStorage } from '@/lib/data/leadStorage';
import { triggerWhatsAppContact, triggerTelegramContact } from '@/lib/data/contactWorkflows';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { useLanguage } from '@/context/LanguageContext';

export function normalizePhone(phone?: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (clean.length === 11 && (clean.startsWith('8') || clean.startsWith('7'))) {
    clean = '7' + clean.slice(1);
  }
  return clean;
}

export function formatPhone(phone?: string): string {
  if (!phone) return '—';
  const clean = normalizePhone(phone);
  if (!clean) return phone;
  if (clean.length === 11 && clean.startsWith('7')) {
    return `+7 (${clean.slice(1, 4)}) ${clean.slice(4, 7)}-${clean.slice(7, 9)}-${clean.slice(9, 11)}`;
  }
  if (clean.length > 6) {
    return `+${clean.slice(0, 1)} (${clean.slice(1, 4)}) ${clean.slice(4, 7)}-${clean.slice(7, 9)}-${clean.slice(9)}`;
  }
  return phone;
}

export default function CrmPage() {
  const router = useRouter();
  const toast = useToast();
  const { role, userName } = useRole();
  const { t } = useLanguage();
  const [leads, setLeads] = useState<FullLeadData[]>(() => getStoredLeads(true, true));
  const [tabFilter, setTabFilter] = useState<'active' | 'deleted'>('active');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [mobileStageFilter, setMobileStageFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<FullLeadData | null>(null);
  const [leadForConvertModal, setLeadForConvertModal] = useState<FullLeadData | null>(null);
  const [leadForLossModal, setLeadForLossModal] = useState<FullLeadData | null>(null);
  const [lossReasonInput, setLossReasonInput] = useState<string>('');
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColKey, setDragOverColKey] = useState<string | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  const toggleSelectLead = useCallback((leadId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  }, []);

  const clearLeadSelection = useCallback(() => {
    setSelectedLeadIds(new Set());
  }, []);

  const handleBulkMoveStage = useCallback((newStatus: FullLeadData['status']) => {
    if (selectedLeadIds.size === 0) return;
    const updated = leads.map((l) => {
      if (selectedLeadIds.has(l.id)) {
        return { ...l, status: newStatus };
      }
      return l;
    });
    setLeads(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_leads_v2', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('crm-leads-changed'));
    }
    toast.success(`Перемещено ${selectedLeadIds.size} лидов`);
    setSelectedLeadIds(new Set());
  }, [leads, selectedLeadIds, toast]);

  const handleBulkAssign = useCallback((managerName: string) => {
    if (selectedLeadIds.size === 0) return;
    const updated = leads.map((l) => {
      if (selectedLeadIds.has(l.id)) {
        return { ...l, assignedTo: managerName };
      }
      return l;
    });
    setLeads(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_leads_v2', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('crm-leads-changed'));
    }
    toast.success(`Ответственный назначен для ${selectedLeadIds.size} лидов: ${managerName}`);
    setSelectedLeadIds(new Set());
  }, [leads, selectedLeadIds, toast]);

  const handleBulkDelete = useCallback(() => {
    if (selectedLeadIds.size === 0) return;
    if (!confirm(`Перенести выбранные лиды (${selectedLeadIds.size} шт.) в архив?`)) return;
    const updated = leads.map((l) => {
      if (selectedLeadIds.has(l.id)) {
        return { ...l, is_deleted: true, status: 'lost' as const };
      }
      return l;
    });
    setLeads(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_leads_v2', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('crm-leads-changed'));
    }
    toast.success(`Удалено в архив ${selectedLeadIds.size} лидов`);
    setSelectedLeadIds(new Set());
  }, [leads, selectedLeadIds, toast]);

  // Sync leads from localStorage and in-memory stores
  const syncLeads = useCallback(() => {
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
  }, []);

  useFocusSync(syncLeads);

  useEffect(() => {
    syncLeads();

    window.addEventListener('crm-leads-changed', syncLeads);
    window.addEventListener('crm-students-changed', syncLeads);
    window.addEventListener('crm-names-synced', syncLeads);

    return () => {
      window.removeEventListener('crm-leads-changed', syncLeads);
      window.removeEventListener('crm-students-changed', syncLeads);
      window.removeEventListener('crm-names-synced', syncLeads);
    };
  }, [syncLeads]);

  // Unified sequence of 7 stages according to specification
  const columns = useMemo(() => [
    {
      key: 'new',
      label: 'Новые',
      badgeColor: 'bg-blue-100 text-blue-800',
      headerBg: 'bg-slate-100/90 border-slate-200',
    },
    {
      key: 'contacted',
      label: 'В работе',
      badgeColor: 'bg-amber-100 text-amber-800',
      headerBg: 'bg-slate-100/90 border-slate-200',
    },
    {
      key: 'trial_scheduled',
      label: 'Пробное назначено',
      badgeColor: 'bg-purple-100 text-purple-800',
      headerBg: 'bg-slate-100/90 border-slate-200',
    },
    {
      key: 'trial_held',
      label: 'Пробное проведено',
      badgeColor: 'bg-indigo-100 text-indigo-800',
      headerBg: 'bg-slate-100/90 border-slate-200',
    },
    {
      key: 'thinking',
      label: 'Думают или Счёт',
      badgeColor: 'bg-teal-100 text-teal-800',
      headerBg: 'bg-slate-100/90 border-slate-200',
    },
    {
      key: 'paid',
      label: 'Оплачено (Успех)',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      headerBg: 'bg-emerald-50/90 border-emerald-200',
    },
    {
      key: 'lost',
      label: 'Отказ или Архив',
      badgeColor: 'bg-slate-200 text-slate-700',
      headerBg: 'bg-slate-100/60 border-slate-200',
    },
  ] as const, []);

  const primaryColumns = useMemo(() => columns.slice(0, 4), [columns]);
  const closingColumns = useMemo(() => columns.slice(4), [columns]);

  const handleLeadCreated = (newLead: FullLeadData) => {
    setSearchTerm('');
    setDirectionFilter('all');
    setLeads((prev) => {
      const updated = [newLead, ...prev.filter((l) => l.id !== newLead.id)];
      saveLeadToStorage(newLead);
      syncLeadToSupabase(newLead);
      return updated;
    });
    toast.success(`Лид «${newLead.name}» успешно создан и добавлен в воронку`);
  };

  const handleQuickStatusChange = (leadId: string, newStatus: FullLeadData['status']) => {
    const targetLead = leads.find((l) => l.id === leadId);
    if (!targetLead || targetLead.status === newStatus) return;

    // Special case 1: Drop/Move to 'paid' -> open confirmation modal to convert to student
    if (newStatus === 'paid') {
      setLeadForConvertModal(targetLead);
      return;
    }

    // Special case 2: Drop/Move to 'lost' -> open loss reason modal
    if (newStatus === 'lost') {
      setLossReasonInput(targetLead.lossReason || '');
      setLeadForLossModal(targetLead);
      return;
    }

    commitStatusChange(leadId, newStatus);
  };

  const commitStatusChange = (leadId: string, newStatus: FullLeadData['status'], extra?: { lossReason?: string }) => {
    const targetLead = leads.find((l) => l.id === leadId);
    if (!targetLead) return;

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
      content: `Сменил(а) этап воронки: «${oldStatusObj?.label || targetLead.status}» → «${newStatusObj?.label || newStatus}»${extra?.lossReason ? ` (Причина: ${extra.lossReason})` : ''}`,
      result: `Этап воронки: ${newStatusObj?.label || newStatus}`,
    };

    const updatedInteractions = [statusChangeInteraction, ...(targetLead.interactions || [])];

    const updatedLead: FullLeadData = {
      ...targetLead,
      status: newStatus,
      interactions: updatedInteractions,
      lossReason: extra?.lossReason !== undefined ? extra.lossReason : targetLead.lossReason,
    };

    // Optimistic UI state update
    setLeads((prev) => prev.map((l) => (l.id === leadId ? updatedLead : l)));
    if (selectedLeadForDrawer?.id === leadId) {
      setSelectedLeadForDrawer(updatedLead);
    }

    saveLeadToStorage(updatedLead);
    syncLeadToSupabase(updatedLead);

    toast.success(`Лид «${targetLead.name}» перемещен на этап «${newStatusObj?.label || newStatus}»`);
  };

  const handleDeleteLead = (leadId: string) => {
    softDeleteLead(leadId);
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, isDeleted: true, is_deleted: true, deletedAt: new Date().toISOString() } : l
      )
    );
    if (selectedLeadForDrawer?.id === leadId) {
      setSelectedLeadForDrawer(null);
    }
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

  const handleDragStart = (leadId: string) => {
    setDraggedLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    if (dragOverColKey !== colKey) {
      setDragOverColKey(colKey);
    }
  };

  const handleDragLeave = (colKey: string) => {
    if (dragOverColKey === colKey) {
      setDragOverColKey(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetColKey: string) => {
    e.preventDefault();
    setDragOverColKey(null);
    if (!draggedLeadId) return;

    handleQuickStatusChange(draggedLeadId, targetColKey as FullLeadData['status']);
    setDraggedLeadId(null);
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

  const selectAllDisplayed = useCallback(() => {
    setSelectedLeadIds(new Set(displayedLeads.map((l) => l.id)));
  }, [displayedLeads]);

  // Calculate total potential volume of active funnel
  const funnelTotalEur = useMemo(() => {
    const rate = getEurRubRate();
    let sumEur = 0;
    activeLeads.forEach((l) => {
      if (l.status === 'lost' || (l.status as string) === 'no_response') return;
      if (l.offerAmount) {
        const num = parseFloat(String(l.offerAmount).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        if (num > 0) {
          if (String(l.offerAmount).includes('€') || num <= 500) {
            sumEur += num;
          } else {
            sumEur += convertRubToEur(num, rate);
          }
          return;
        }
      }
      const fin = getLeadFinancialSummary(l);
      if (fin.deposit > 0) {
        sumEur += fin.deposit;
      } else {
        sumEur += 80; // default estimated student contract amount in EUR
      }
    });
    return Math.round(sumEur);
  }, [activeLeads]);

  const funnelTotalRub = useMemo(() => {
    return convertEurToRub(funnelTotalEur, getEurRubRate());
  }, [funnelTotalEur]);

  // Fast memoized lead amount calculation cache (Map)
  const leadAmountCache = useMemo(() => new Map<string, number>(), []);

  const getCachedLeadEur = useCallback((l: FullLeadData, rate: number): number => {
    const cacheKey = `${l.id}_${l.offerAmount || ''}_${l.finance?.deposit?.balance || 0}_${rate}`;
    const cached = leadAmountCache.get(cacheKey);
    if (cached !== undefined) return cached;

    let itemEur = 0;
    if (l.offerAmount) {
      const num = parseFloat(String(l.offerAmount).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      if (num > 0) {
        itemEur = (String(l.offerAmount).includes('€') || num <= 500) ? num : convertRubToEur(num, rate);
      }
    }
    if (itemEur === 0) {
      const fin = getLeadFinancialSummary(l);
      itemEur = fin.deposit > 0 ? fin.deposit : 80;
    }
    const rounded = Math.round(itemEur);
    leadAmountCache.set(cacheKey, rounded);
    return rounded;
  }, [leadAmountCache]);

  // Stage potential calculations with O(1) cache lookup
  const stageStats = useMemo(() => {
    const rate = getEurRubRate();
    const stats: Record<string, { count: number; sumEur: number }> = {};
    for (const c of columns) {
      stats[c.key] = { count: 0, sumEur: 0 };
    }

    for (const l of displayedLeads) {
      const key = (l.status === 'no_response' ? 'lost' : l.status) as string;
      if (!stats[key]) stats[key] = { count: 0, sumEur: 0 };
      stats[key].count += 1;
      stats[key].sumEur += getCachedLeadEur(l, rate);
    }

    return stats;
  }, [displayedLeads, columns, getCachedLeadEur]);

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
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
        >
          Перейти к расписанию
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 w-full min-w-0">
      {/* Title & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {t('crm.title', 'CRM Лиды и Воронка')}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
              Объем воронки: {funnelTotalEur.toLocaleString('ru-RU')} € (≈ {funnelTotalRub.toLocaleString('ru-RU')} ₽)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {t('crm.subtitle', 'Единая сквозная воронка, контроль дедлайнов и конверсия в постоянных учеников')}
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
              Корзина ({deletedLeads.length})
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer shrink-0"
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
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              <option value="Математика">Математика</option>
              <option value="Олимпиадная математика">Олимпиадная математика</option>
            </select>
          </div>

          {/* Desktop View Switcher: ONLY 2 buttons (Kanban & Table) according to specification */}
          <div className="hidden md:flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            <button
              onClick={() => setViewMode('kanban')}
              title="Канбан-доска (единый горизонтальный ряд)"
              className={cn(
                'flex items-center gap-1 rounded-md px-3 py-1.5 transition-all cursor-pointer',
                viewMode === 'kanban' ? 'bg-white shadow-xs font-bold text-slate-900' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Columns className="h-3.5 w-3.5 text-blue-600" />
              <span>Канбан-доска</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Таблица лидов"
              className={cn(
                'flex items-center gap-1 rounded-md px-3 py-1.5 transition-all cursor-pointer',
                viewMode === 'table' ? 'bg-white shadow-xs font-bold text-slate-900' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <List className="h-3.5 w-3.5" />
              <span>Таблица</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Horizontal Stage Filter */}
      {tabFilter === 'active' && (
        <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-1 -mx-2 px-2 no-scrollbar">
          <button
            type="button"
            onClick={() => setMobileStageFilter('all')}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all',
              mobileStageFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            Все ({displayedLeads.length})
          </button>
          {columns.map((col) => {
            const count = displayedLeads.filter((l) => l.status === col.key || (col.key === 'lost' && (l.status as string) === 'no_response')).length;
            return (
              <button
                key={col.key}
                type="button"
                onClick={() => setMobileStageFilter(col.key)}
                className={cn(
                  'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5',
                  mobileStageFilter === col.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                <span>{col.label}</span>
                <span className={cn('text-[10px] px-1.5 py-0.2 rounded-full font-bold', col.badgeColor)}>
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
                    <td className="px-3 py-3">{lead.studentName || '—'}</td>
                    <td className="px-3 py-3 text-purple-700 font-medium">{lead.directionOrCourse}</td>
                    <td className="px-3 py-3 font-mono">{formatPhone(lead.contact)}</td>
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

      {/* MOBILE LIST: Single column of cards */}
      {tabFilter === 'active' && (
        <div className="md:hidden space-y-2.5">
          {(() => {
            const mobileLeads = mobileStageFilter === 'all'
              ? displayedLeads
              : displayedLeads.filter((l) => l.status === mobileStageFilter || (mobileStageFilter === 'lost' && (l.status as string) === 'no_response'));

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
                onOpen={() => setSelectedLeadForDrawer(lead)}
                onDeleteLead={handleDeleteLead}
                isDragged={draggedLeadId === lead.id}
                onDragStart={() => handleDragStart(lead.id)}
              />
            ));
          })()}
        </div>
      )}

      {/* DESKTOP VIEWS (KANBAN HORIZONTAL ROW / TABLE) */}
      <div className="hidden md:block">
        {/* VIEW 1: KANBAN BOARD IN 2 LOGICAL ROWS (NO HORIZONTAL SCROLL) */}
        {viewMode === 'kanban' && tabFilter === 'active' && (() => {
          const renderColumn = (col: (typeof columns)[number]) => {
            const colLeads = displayedLeads.filter(
              (l) => l.status === col.key || (col.key === 'lost' && (l.status as string) === 'no_response')
            );
            const stats = stageStats[col.key] || { count: 0, sumEur: 0 };
            const isOver = dragOverColKey === col.key;

            return (
              <div
                key={col.key}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={() => handleDragLeave(col.key)}
                onDrop={(e) => handleDrop(e, col.key)}
                className={cn(
                  'flex flex-col rounded-2xl border p-3 shadow-xs transition-all duration-150 min-w-0',
                  isOver
                    ? 'border-blue-500 ring-2 ring-blue-300 bg-blue-50/50'
                    : col.key === 'paid'
                    ? 'border-emerald-200 bg-emerald-50/25'
                    : 'border-slate-200 bg-slate-100/70'
                )}
              >
                {/* Column Header with financial metrics */}
                <div className={cn(
                  'flex items-center justify-between px-2.5 py-2 rounded-xl border mb-2.5',
                  col.headerBg
                )}>
                  <div className="min-w-0 flex-1 pr-1.5">
                    <span className="text-xs font-bold text-slate-900 block truncate" title={col.label}>
                      {col.label}
                    </span>
                    <span className="text-[11px] text-slate-500 font-semibold block truncate">
                      ({stats.count}) · {stats.sumEur.toLocaleString('ru-RU')} €
                    </span>
                  </div>
                  <span className={cn('flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full text-[11px] font-bold shadow-2xs shrink-0', col.badgeColor)}>
                    {colLeads.length}
                  </span>
                </div>

                {/* Cards Container with internal vertical scroll */}
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[380px] min-h-[140px] pr-0.5">
                  {colLeads.length === 0 ? (
                    <div className={cn(
                      'flex h-28 flex-col items-center justify-center rounded-xl border border-dashed text-xs transition-colors',
                      isOver ? 'border-blue-400 bg-blue-50 text-blue-600 font-semibold' : 'border-slate-300 text-slate-400'
                    )}>
                      {isOver ? 'Отпустите для переноса' : 'Нет лидов'}
                    </div>
                  ) : (
                    colLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        columns={columns}
                        onQuickStatusChange={handleQuickStatusChange}
                        onOpen={() => setSelectedLeadForDrawer(lead)}
                        onDeleteLead={handleDeleteLead}
                        isDragged={draggedLeadId === lead.id}
                        onDragStart={() => handleDragStart(lead.id)}
                        isSelected={selectedLeadIds.has(lead.id)}
                        onToggleSelect={(e) => toggleSelectLead(lead.id, e)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          };

          return (
            <div className="space-y-4">
              {/* Row 1: Primary stages (4 columns) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    1. Первичная обработка и пробные занятия
                  </span>
                  <span className="text-[11px] text-slate-400">4 этапа • Перетаскивайте карточки между этапами</span>
                </div>
                <div className="grid grid-cols-4 gap-3.5">
                  {primaryColumns.map((col) => renderColumn(col))}
                </div>
              </div>

              {/* Row 2: Decision, Payment & Outcome stages (3 columns) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    2. Принятие решений, оплата и итоги
                  </span>
                  <span className="text-[11px] text-slate-400">3 этапа воронки</span>
                </div>
                <div className="grid grid-cols-3 gap-3.5">
                  {closingColumns.map((col) => renderColumn(col))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* VIEW 2: TABLE VIEW */}
        {viewMode === 'table' && tabFilter === 'active' && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs table-fixed">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="py-3.5 pl-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={displayedLeads.length > 0 && selectedLeadIds.size === displayedLeads.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          selectAllDisplayed();
                        } else {
                          clearLeadSelection();
                        }
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 pl-2 pr-3 w-[25%]">Лид / Контакт</th>
                  <th className="px-3 py-3.5 w-[19%]">Ученик</th>
                  <th className="px-3 py-3.5 w-[16%]">Курс</th>
                  <th className="px-3 py-3.5 w-[14%] text-right">Потенциал / Баланс</th>
                  <th className="px-3 py-3.5 w-[14%]">Этап воронки</th>
                  <th className="py-3.5 pl-3 pr-4 w-[10%] text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {displayedLeads.map((lead) => {
                  const finSummary = getLeadFinancialSummary(lead);
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLeadForDrawer(lead)}
                      className={cn(
                        'hover:bg-slate-50/80 cursor-pointer transition-colors',
                        selectedLeadIds.has(lead.id) && 'bg-blue-50/40'
                      )}
                    >
                      <td className="py-3 pl-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.has(lead.id)}
                          onChange={() => toggleSelectLead(lead.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 pl-2 pr-3 font-semibold text-slate-900">
                        <div className="truncate">{lead.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <a
                            href={lead.contact ? `tel:+${normalizePhone(lead.contact)}` : '#'}
                            onClick={(e) => e.stopPropagation()}
                            title="Позвонить по телефону"
                            className="text-[11px] text-slate-500 font-mono hover:text-blue-600 hover:underline truncate"
                          >
                            {formatPhone(lead.contact)}
                          </a>
                          {normalizePhone(lead.contact) && (
                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <a
                                href={`https://wa.me/${normalizePhone(lead.contact)}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Написать в WhatsApp"
                                className="w-5 h-5 rounded bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white flex items-center justify-center transition-all border border-[#25D366]/20 cursor-pointer"
                              >
                                <WhatsAppIcon className="w-3 h-3" />
                              </a>
                              <a
                                href={lead.telegram ? `https://t.me/${lead.telegram.replace('@', '')}` : `https://wa.me/${normalizePhone(lead.contact)}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Написать в Telegram"
                                className="w-5 h-5 rounded bg-[#229ED9]/10 hover:bg-[#229ED9] text-[#229ED9] hover:text-white flex items-center justify-center transition-all border border-[#229ED9]/20 cursor-pointer"
                              >
                                <TelegramIcon className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 truncate">
                        <span className="font-medium text-slate-800">{lead.studentName || '—'}</span>
                        {lead.studentAge && <span className="text-slate-400 text-[11px]"> ({lead.studentAge})</span>}
                      </td>
                      <td className="px-3 py-3 font-medium text-purple-700 truncate">
                        {lead.directionOrCourse}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {lead.offerAmount ? (
                          <span className="font-bold text-slate-800">{lead.offerAmount.replace('++', '+')}</span>
                        ) : finSummary.deposit > 0 ? (
                          <span className="font-semibold text-emerald-700">+{finSummary.formattedDeposit}</span>
                        ) : (
                          <span className="text-slate-400">80 € (8 000 ₽)</span>
                        )}
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={lead.status === 'no_response' ? 'lost' : lead.status}
                          onChange={(e) => handleQuickStatusChange(lead.id, e.target.value as FullLeadData['status'])}
                          className={cn(
                            'rounded-lg px-2.5 py-1 font-semibold text-[11px] border border-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400',
                            lead.status === 'paid' && 'bg-emerald-50 text-emerald-800 border-emerald-200',
                            lead.status === 'trial_held' && 'bg-indigo-50 text-indigo-800 border-indigo-200',
                            lead.status === 'trial_scheduled' && 'bg-purple-50 text-purple-800 border-purple-200',
                            lead.status === 'thinking' && 'bg-teal-50 text-teal-800 border-teal-200',
                            lead.status === 'new' && 'bg-blue-50 text-blue-800 border-blue-200',
                            (lead.status === 'lost' || (lead.status as string) === 'no_response') && 'bg-slate-100 text-slate-700 border-slate-300',
                            lead.status === 'contacted' && 'bg-amber-50 text-amber-800 border-amber-200'
                          )}
                        >
                          {columns.map((c) => (
                            <option key={c.key} value={c.key}>{c.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pl-3 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedLeadForDrawer(lead)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          Открыть
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lead Details Modal Window (Same unified modal pattern as Students/Parents) */}
      <LeadDetailsModal
        isOpen={Boolean(selectedLeadForDrawer)}
        lead={selectedLeadForDrawer}
        onClose={() => setSelectedLeadForDrawer(null)}
        onUpdateLead={(updated) => {
          setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
          setSelectedLeadForDrawer(updated);
        }}
        onStatusChange={(leadId, newStatus) => {
          handleQuickStatusChange(leadId, newStatus);
        }}
      />

      {/* Modal to create new lead */}
      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleLeadCreated}
      />

      {/* Modal: Confirmation & 1-click enroll to students on drop in "Оплачено (Успех)" */}
      {leadForConvertModal && (
        <ConvertLeadModal
          isOpen={Boolean(leadForConvertModal)}
          lead={leadForConvertModal}
          onClose={() => setLeadForConvertModal(null)}
          onSuccess={(studentId) => {
            commitStatusChange(leadForConvertModal.id, 'paid');
            setLeadForConvertModal(null);
            toast.success('Лид успешно переведен в базу учеников и оплачен!');
          }}
        />
      )}

      {/* Modal: Quick loss reason when dropped into "Отказ или Архив" */}
      {leadForLossModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4 border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Фиксация причины отказа</h3>
              <p className="text-xs text-slate-500 mt-0.5">Лид «{leadForLossModal.name}» переносится в архив</p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-700 block">Укажите или выберите причину:</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {['Не отвечает', 'Дорого', 'Не подошло расписание', 'Выбрали других'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setLossReasonInput(r)}
                    className={cn(
                      'px-2 py-1 rounded-lg border text-[11px] transition-colors cursor-pointer',
                      lossReasonInput === r ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={lossReasonInput}
                onChange={(e) => setLossReasonInput(e.target.value)}
                placeholder="Своя причина..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setLeadForLossModal(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  commitStatusChange(leadForLossModal.id, 'lost', { lossReason: lossReasonInput || 'Отказ' });
                  setLeadForLossModal(null);
                }}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Перенести в архив
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedLeadIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-3.5 text-xs animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
            <span className="font-bold text-white bg-blue-600 px-2 py-0.5 rounded-full text-[11px]">
              {selectedLeadIds.size}
            </span>
            <span className="font-medium text-slate-200">выбрано</span>
          </div>

          {/* Move to Stage */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Этап:</span>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) handleBulkMoveStage(e.target.value as any);
              }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="" disabled>Переместить на...</option>
              {columns.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Assign manager */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Ответственный:</span>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) handleBulkAssign(e.target.value);
              }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="" disabled>Назначить...</option>
              <option value="Елена Менеджер">Елена Менеджер</option>
              <option value="Алексей Администратор">Алексей Администратор</option>
            </select>
          </div>

          {/* Bulk Delete */}
          <button
            type="button"
            onClick={handleBulkDelete}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-colors font-semibold cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>В архив</span>
          </button>

          {/* Clear */}
          <button
            type="button"
            onClick={clearLeadSelection}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
            title="Снять выделение"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
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
  onDeleteLead: (leadId: string) => void;
  isDragged?: boolean;
  onDragStart?: () => void;
  isSelected?: boolean;
  onToggleSelect?: (e: React.MouseEvent) => void;
}

function getCourseBorderClass(course?: string) {
  if (!course) return 'border-l-4 border-l-blue-500';
  const c = course.toLowerCase();
  if (c.includes('англ') || c.includes('english')) return 'border-l-4 border-l-purple-500';
  if (c.includes('робот') || c.includes('robot')) return 'border-l-4 border-l-amber-500';
  if (c.includes('матем') || c.includes('math')) return 'border-l-4 border-l-emerald-500';
  return 'border-l-4 border-l-blue-500';
}

function LeadCard({
  lead,
  columns,
  onQuickStatusChange,
  onOpen,
  onDeleteLead,
  isDragged,
  onDragStart,
  isSelected,
  onToggleSelect,
}: LeadCardProps) {
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close 3-dots menu on clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = () => setMenuOpen(false);
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, [menuOpen]);

  // Clean formatted deal amount without double ++
  const dealAmountFormatted = useMemo(() => {
    const raw = lead.offerAmount;
    if (raw) {
      const clean = raw.replace(/\+\+/g, '+').trim();
      const num = parseFloat(clean.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      if (num > 0) {
        if (clean.includes('€') || num <= 500) {
          const rub = convertEurToRub(num);
          return `${num} € (${rub.toLocaleString('ru-RU')} ₽)`;
        }
        const eur = convertRubToEur(num);
        return `${eur} € (${num.toLocaleString('ru-RU')} ₽)`;
      }
    }
    const fin = getLeadFinancialSummary(lead);
    if (fin.deposit > 0) {
      return `${fin.deposit} € (${fin.depositRub.toLocaleString('ru-RU')} ₽)`;
    }
    return '80 € (8 000 ₽)';
  }, [lead]);

  // Deadline calculation
  const deadlineStatus = useMemo(() => {
    if (!lead.nextAction) return 'empty';
    const str = (lead.nextActionDate || '').toLowerCase();
    if (str.includes('просроч') || str.includes('вчера') || str.includes('2026-08') || str.includes('01.09') || str.includes('02.09')) {
      return 'overdue';
    }
    if (str.includes('сегодня') || str.includes('12:00') || str.includes('15:00') || str.includes('16:30') || str.includes('17:00') || str.includes('18:00')) {
      return 'today';
    }
    return 'future';
  }, [lead.nextAction, lead.nextActionDate]);

  const phoneClean = normalizePhone(lead.contact);
  const formattedPhoneStr = formatPhone(lead.contact);
  const waLink = phoneClean ? `https://wa.me/${phoneClean}` : '#';
  const tgLink = lead.telegram ? `https://t.me/${lead.telegram.replace('@', '')}` : (phoneClean ? `https://wa.me/${phoneClean}` : '#');

  return (
    <div
      draggable={true}
      onDragStart={onDragStart}
      onClick={onOpen}
      className={cn(
        'rounded-xl border bg-white p-3 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing text-left flex flex-col justify-between gap-2.5 relative group/card select-none',
        getCourseBorderClass(lead.directionOrCourse),
        isDragged ? 'opacity-40 shadow-lg scale-95 border-blue-400' : 'border-slate-200 hover:border-slate-300',
        isSelected && 'ring-2 ring-blue-500 bg-blue-50/20'
      )}
    >
      {/* Checkbox for selection (visible on hover or when card is selected) */}
      <div
        className={cn(
          'absolute -top-1.5 -left-1.5 z-10 transition-opacity',
          isSelected ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-100'
        )}
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect?.(e);
        }}
      >
        <div
          className={cn(
            'w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all shadow-xs',
            isSelected
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-white border-slate-300 hover:border-blue-500'
          )}
        >
          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
        </div>
      </div>

      <div>
        {/* Top Row: Parent Name + Clean Currency Badge + 3-dots Menu */}
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            {/* Row 1: Bold Parent Name */}
            <h4
              className="font-bold text-slate-900 text-xs hover:text-blue-600 transition-colors truncate block"
              title={lead.name}
            >
              {lead.name}
            </h4>
            {/* Row 2: Child name + age (if provided) */}
            {lead.studentName && lead.studentName !== lead.name && lead.clientType !== 'adult_student' && (
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {lead.studentName}
                {lead.studentAge && <span className="text-slate-400">, {lead.studentAge}</span>}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Deal Amount Badge */}
            <span
              className="text-[10px] font-bold text-slate-700 bg-slate-100/90 border border-slate-200/80 px-1.5 py-0.5 rounded-md shrink-0"
              title="Потенциал сделки"
            >
              {dealAmountFormatted}
            </span>

            {/* 3-Dots Context Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Опции"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-6 z-30 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl text-xs space-y-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Переместить на этап
                  </div>
                  {columns.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => {
                        onQuickStatusChange(lead.id, c.key as FullLeadData['status']);
                        setMenuOpen(false);
                      }}
                      className={cn(
                        'w-full text-left px-2 py-1 rounded-md text-[11px] transition-colors flex items-center justify-between',
                        lead.status === c.key ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-100'
                      )}
                    >
                      <span className="truncate">{c.label}</span>
                    </button>
                  ))}
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Переместить лид «${lead.name}» в корзину?`)) {
                        onDeleteLead(lead.id);
                        setMenuOpen(false);
                      }
                    }}
                    className="w-full text-left px-2 py-1 rounded-md text-[11px] text-rose-600 hover:bg-rose-50 font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>В корзину</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Direction tag */}
        <div className="mt-1 flex items-center justify-between text-[11px]">
          <span className="font-semibold text-purple-700 truncate">{lead.directionOrCourse}</span>
          <span className="text-[10px] text-slate-400 truncate">{lead.source}</span>
        </div>

        {/* Formatted Phone & Vector SVG Communication Icons (Same model as Students/Parents) */}
        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs">
          <a
            href={phoneClean ? `tel:+${phoneClean}` : '#'}
            onClick={(e) => e.stopPropagation()}
            title="Позвонить по телефону"
            className="font-mono text-[11px] text-slate-500 hover:text-blue-600 hover:underline whitespace-nowrap block shrink-0 font-medium"
          >
            {formattedPhoneStr}
          </a>

          {phoneClean && (
            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              {/* Copy Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(lead.contact);
                  toast.success(`Номер скопирован: ${lead.contact}`);
                }}
                title="Скопировать"
                className="w-6 h-6 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              {/* WhatsApp button */}
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerWhatsAppContact({
                    phone: lead.contact,
                    leadId: lead.id,
                    leadName: lead.name,
                    author: 'Администратор',
                  });
                }}
                title="Написать в WhatsApp"
                className="w-6 h-6 rounded bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white flex items-center justify-center transition-all border border-[#25D366]/20 cursor-pointer"
              >
                <WhatsAppIcon className="w-3.5 h-3.5" />
              </a>

              {/* Telegram button */}
              <a
                href={tgLink}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerTelegramContact({
                    telegram: lead.telegram,
                    phone: lead.contact,
                    leadId: lead.id,
                    leadName: lead.name,
                    author: 'Администратор',
                  });
                }}
                title="Написать в Telegram"
                className="w-6 h-6 rounded bg-[#229ED9]/10 hover:bg-[#229ED9] text-[#229ED9] hover:text-white flex items-center justify-center transition-all border border-[#229ED9]/20 cursor-pointer"
              >
                <TelegramIcon className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Task & Deadline Control Banner */}
      <div className="mt-1" onClick={(e) => e.stopPropagation()}>
        {deadlineStatus === 'overdue' ? (
          <div className="flex items-center gap-1.5 text-[10px] text-rose-800 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
            <AlertTriangle className="h-3 w-3 text-rose-600 shrink-0" />
            <span className="truncate">
              <strong>Просрочено:</strong> {lead.nextAction} ({lead.nextActionDate})
            </span>
          </div>
        ) : deadlineStatus === 'today' ? (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-900 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
            <Clock className="h-3 w-3 text-amber-600 shrink-0" />
            <span className="truncate">
              <strong>Сегодня:</strong> {lead.nextAction} ({lead.nextActionDate})
            </span>
          </div>
        ) : deadlineStatus === 'future' ? (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-600 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
            <Calendar className="h-3 w-3 text-slate-500 shrink-0" />
            <span className="truncate">
              {lead.nextActionDate}: {lead.nextAction}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            className="w-full flex items-center justify-center gap-1 py-1 rounded-lg border border-dashed border-slate-300 text-[10px] font-semibold text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition-colors cursor-pointer"
          >
            <Plus className="h-3 w-3 text-slate-400" />
            <span>Назначить действие</span>
          </button>
        )}
      </div>
    </div>
  );
}
