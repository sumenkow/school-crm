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
  X,
  GraduationCap,
  Users,
  TrendingUp,
  SlidersHorizontal,
  Settings,
  Sparkles
} from 'lucide-react';
import { cn, normalizePhone, formatPhone } from '@/lib/utils';
import { INITIAL_LEADS, FullLeadData, TimelineInteraction } from '@/lib/data/mockData';
import { getLeadFinancialSummary } from '@/lib/data/balanceHelper';
import { getEurRubRate, convertEurToRub, convertRubToEur } from '@/lib/data/currencyHelper';
import { CreateLeadModal } from '@/components/crm/CreateLeadModal';
import { LeadDetailsModal, WhatsAppIcon, TelegramIcon } from '@/components/crm/LeadDetailsModal';
import { ConvertLeadModal } from '@/components/crm/ConvertLeadModal';
import { PipelineSettingsModal } from '@/components/crm/PipelineSettingsModal';
import { softDeleteLead, restoreLead, getStoredLeads, syncLeadToSupabase, saveLeadToStorage } from '@/lib/data/leadStorage';
import { triggerWhatsAppContact, triggerTelegramContact } from '@/lib/data/contactWorkflows';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { useLanguage } from '@/context/LanguageContext';

export { normalizePhone, formatPhone };

export function getLeadDeadlineStatus(lead?: FullLeadData | null): 'overdue' | 'today' | 'future' | 'empty' {
  if (!lead?.nextAction) return 'empty';
  const str = String(lead.nextActionDate || '').toLowerCase();
  if (
    str.includes('просроч') ||
    str.includes('вчера') ||
    str.includes('2026-08') ||
    str.includes('01.09') ||
    str.includes('02.09') ||
    str.includes('30.09') ||
    str.includes('30 сен')
  ) {
    return 'overdue';
  }
  if (
    str.includes('сегодня') ||
    str.includes('12:00') ||
    str.includes('13:00') ||
    str.includes('15:00') ||
    str.includes('16:30') ||
    str.includes('17:00') ||
    str.includes('18:00')
  ) {
    return 'today';
  }
  return 'future';
}

export default function CrmPage() {
  const router = useRouter();
  const toast = useToast();
  const { role, userName } = useRole();
  const { t } = useLanguage();
  const [leads, setLeads] = useState<FullLeadData[]>(() => getStoredLeads(true, true));
  const [tabFilter, setTabFilter] = useState<'active' | 'deleted'>('active');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [activeStageGroup, setActiveStageGroup] = useState<'primary' | 'closing'>('primary');
  const [segmentFilter, setSegmentFilter] = useState<'all' | 'need_action' | 'overdue' | 'today' | 'no_action'>('all');
  const [mobileStageFilter, setMobileStageFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [isPipelineSettingsOpen, setIsPipelineSettingsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<FullLeadData | null>(null);
  const [leadForConvertModal, setLeadForConvertModal] = useState<FullLeadData | null>(null);
  const [leadForLossModal, setLeadForLossModal] = useState<FullLeadData | null>(null);
  const [lossReasonInput, setLossReasonInput] = useState<string>('');
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColKey, setDragOverColKey] = useState<string | null>(null);

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
      dotColor: 'bg-blue-500',
      bgTint: 'bg-[#F4F8FE] border-blue-100/90',
      badgeColor: 'bg-blue-100 text-blue-700',
    },
    {
      key: 'contacted',
      label: 'В работе',
      dotColor: 'bg-amber-500',
      bgTint: 'bg-[#FEF9F3] border-amber-100/90',
      badgeColor: 'bg-amber-100 text-amber-700',
    },
    {
      key: 'trial_scheduled',
      label: 'Пробное назначено',
      dotColor: 'bg-purple-500',
      bgTint: 'bg-[#FAF6FE] border-purple-100/90',
      badgeColor: 'bg-purple-100 text-purple-700',
    },
    {
      key: 'trial_held',
      label: 'Пробное проведено',
      dotColor: 'bg-emerald-500',
      bgTint: 'bg-[#F2FBF7] border-emerald-100/90',
      badgeColor: 'bg-emerald-100 text-emerald-700',
    },
    {
      key: 'thinking',
      label: 'Думают или Счёт',
      dotColor: 'bg-teal-500',
      bgTint: 'bg-[#F0FDFA] border-teal-100/90',
      badgeColor: 'bg-teal-100 text-teal-700',
    },
    {
      key: 'paid',
      label: 'Оплачено (Успех)',
      dotColor: 'bg-emerald-600',
      bgTint: 'bg-[#F2FBF7] border-emerald-100/90',
      badgeColor: 'bg-emerald-100 text-emerald-700',
    },
    {
      key: 'lost',
      label: 'Отказ или Архив',
      dotColor: 'bg-slate-400',
      bgTint: 'bg-slate-50 border-slate-200/90',
      badgeColor: 'bg-slate-200 text-slate-700',
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

  const activeLeads = (leads || []).filter((l) => l && !l.is_deleted && !(l as any).isDeleted);
  const deletedLeads = (leads || []).filter((l) => l && (l.is_deleted || (l as any).isDeleted));

  // Fast memoized lead amount calculation cache (Map)
  const leadAmountCache = useMemo(() => new Map<string, number>(), []);

  const getCachedLeadEur = useCallback((l: FullLeadData, rate: number): number => {
    if (!l) return 0;
    const cacheKey = `${l.id}_${l.offerAmount || ''}_${l.finance?.deposit?.balance || 0}_${rate}`;
    const cached = leadAmountCache.get(cacheKey);
    if (cached !== undefined) return cached;

    let itemEur = 0;
    if (l.offerAmount) {
      const eurMatch = String(l.offerAmount).match(/(\d+(?:[.,]\d+)?)\s*€/);
      if (eurMatch) {
        itemEur = parseFloat(eurMatch[1].replace(',', '.')) || 0;
      } else {
        const num = parseFloat(String(l.offerAmount).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        if (num > 0) {
          itemEur = (String(l.offerAmount).includes('€') || num <= 500) ? num : convertRubToEur(num, rate);
        }
      }
    }
    if (itemEur === 0) {
      try {
        const fin = getLeadFinancialSummary(l);
        itemEur = fin && fin.deposit > 0 ? fin.deposit : 80;
      } catch {
        itemEur = 80;
      }
    }
    const rounded = Math.round(itemEur);
    leadAmountCache.set(cacheKey, rounded);
    return rounded;
  }, [leadAmountCache]);

  const displayedLeads = useMemo(() => {
    const base = tabFilter === 'active' ? activeLeads : deletedLeads;
    return base.filter((lead) => {
      if (!lead) return false;
      const nameStr = String(lead.name || '').toLowerCase();
      const contactStr = String(lead.contact || '');
      const studentStr = String(lead.studentName || '').toLowerCase();
      const search = (searchTerm || '').trim().toLowerCase();

      const matchesSearch =
        !search ||
        nameStr.includes(search) ||
        contactStr.includes(search) ||
        studentStr.includes(search);
      const matchesDirection = directionFilter === 'all' || lead.directionOrCourse === directionFilter;
      const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
      const matchesAssigned = assignedFilter === 'all' || lead.assignedTo === assignedFilter;

      if (!matchesSearch || !matchesDirection || !matchesSource || !matchesAssigned) return false;

      // Segment filter
      if (tabFilter === 'active' && segmentFilter !== 'all') {
        const dStatus = getLeadDeadlineStatus(lead);
        if (segmentFilter === 'need_action') {
          return dStatus === 'today' || dStatus === 'overdue' || dStatus === 'empty';
        }
        if (segmentFilter === 'overdue') {
          return dStatus === 'overdue';
        }
        if (segmentFilter === 'today') {
          return dStatus === 'today';
        }
        if (segmentFilter === 'no_action') {
          return dStatus === 'empty';
        }
      }

      return true;
    });
  }, [tabFilter, activeLeads, deletedLeads, searchTerm, directionFilter, sourceFilter, assignedFilter, segmentFilter]);

  // Calculate total potential volume of active funnel
  const funnelTotalEur = useMemo(() => {
    const rate = getEurRubRate();
    let sumEur = 0;
    activeLeads.forEach((l) => {
      if (!l) return;
      if (l.status === 'lost' || (l.status as string) === 'no_response') return;
      sumEur += getCachedLeadEur(l, rate);
    });
    return Math.round(sumEur);
  }, [activeLeads, getCachedLeadEur]);

  // Comprehensive KPI stats for dashboard summary and stepper groups
  const kpiStats = useMemo(() => {
    const rate = getEurRubRate();
    let todayCount = 0;
    let overdueCount = 0;
    let noActionCount = 0;
    let primaryCount = 0;
    let primarySum = 0;
    let closingCount = 0;
    let closingSum = 0;

    activeLeads.forEach((l) => {
      if (!l) return;
      const dStatus = getLeadDeadlineStatus(l);
      if (dStatus === 'today') todayCount++;
      if (dStatus === 'overdue') overdueCount++;
      if (dStatus === 'empty') noActionCount++;

      const leadEur = getCachedLeadEur(l, rate);
      if (['new', 'contacted', 'trial_scheduled', 'trial_held'].includes(l.status)) {
        primaryCount++;
        primarySum += leadEur;
      } else {
        closingCount++;
        closingSum += leadEur;
      }
    });

    return {
      activeCount: activeLeads.length,
      todayCount,
      overdueCount,
      noActionCount,
      needActionCount: todayCount + overdueCount + noActionCount,
      primaryCount,
      primarySum: Math.round(primarySum),
      closingCount,
      closingSum: Math.round(closingSum),
    };
  }, [activeLeads, getCachedLeadEur]);

  // Stage potential calculations with O(1) cache lookup
  const stageStats = useMemo(() => {
    const rate = getEurRubRate();
    const stats: Record<string, { count: number; sumEur: number; actionsCount: number }> = {};
    for (const c of columns) {
      stats[c.key] = { count: 0, sumEur: 0, actionsCount: 0 };
    }

    for (const l of displayedLeads) {
      if (!l) continue;
      const key = (l.status === 'no_response' ? 'lost' : (l.status as string) === 'enrolled' ? 'paid' : l.status) as string;
      if (!stats[key]) stats[key] = { count: 0, sumEur: 0, actionsCount: 0 };
      stats[key].count += 1;
      stats[key].sumEur += getCachedLeadEur(l, rate);
      const dStatus = getLeadDeadlineStatus(l);
      if (dStatus !== 'empty') {
        stats[key].actionsCount += 1;
      }
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
          href="/calendar"
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
        >
          Перейти к расписанию
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 w-full min-w-0">
      {/* Top Header: Title & Actions & KPI Cards */}
      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {t('crm.title', 'CRM и Лиды')}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {t('crm.subtitle', 'Воронка продаж, обработка заявок и конверсия в учеников')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* KPI 1: Active Leads */}
          <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-2xl px-3 py-2 shadow-2xs">
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 block leading-tight">{kpiStats.activeCount}</span>
              <span className="text-[10.5px] text-slate-500 font-medium block leading-tight">активных лидов</span>
            </div>
          </div>

          {/* KPI 2: Funnel Sum EUR */}
          <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-2xl px-3 py-2 shadow-2xs">
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 block leading-tight">{funnelTotalEur.toLocaleString('ru-RU')} €</span>
              <span className="text-[10.5px] text-slate-500 font-medium block leading-tight">сумма воронки</span>
            </div>
          </div>

          {/* KPI 3: Today Actions */}
          <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-2xl px-3 py-2 shadow-2xs">
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 block leading-tight">{kpiStats.todayCount}</span>
              <span className="text-[10.5px] text-slate-500 font-medium block leading-tight">действий сегодня</span>
            </div>
          </div>

          {/* KPI 4: Overdue */}
          <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-2xl px-3 py-2 shadow-2xs">
            <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 block leading-tight">{kpiStats.overdueCount}</span>
              <span className="text-[10.5px] text-slate-500 font-medium block leading-tight">просрочено</span>
            </div>
          </div>

          {/* Create Lead Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            {t('action.createLead', 'Новый лид')}
          </button>
        </div>
      </div>

      {/* Stepper Tabs for Funnel Stages & View Switcher */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 max-w-3xl">
          {/* Stepper Tab 1: Primary Stages */}
          <button
            type="button"
            onClick={() => {
              setActiveStageGroup('primary');
              setTabFilter('active');
            }}
            className={cn(
              'rounded-2xl p-3 flex items-center gap-3 transition-all text-left cursor-pointer shadow-2xs',
              activeStageGroup === 'primary' && tabFilter === 'active'
                ? 'bg-blue-50/80 border-2 border-blue-500 ring-2 ring-blue-100'
                : 'bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
            )}
          >
            <div className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors',
              activeStageGroup === 'primary' && tabFilter === 'active'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-500'
            )}>
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                1. Первичная обработка и пробные занятия
              </span>
              <span className={cn(
                'text-xs font-semibold block truncate mt-0.5',
                activeStageGroup === 'primary' && tabFilter === 'active' ? 'text-blue-600' : 'text-slate-400'
              )}>
                4 этапа · {kpiStats.primaryCount} лидов · {kpiStats.primarySum.toLocaleString('ru-RU')} €
              </span>
            </div>
          </button>

          {/* Stepper Tab 2: Decision, Payment & Outcome Stages */}
          <button
            type="button"
            onClick={() => {
              setActiveStageGroup('closing');
              setTabFilter('active');
            }}
            className={cn(
              'rounded-2xl p-3 flex items-center gap-3 transition-all text-left cursor-pointer shadow-2xs',
              activeStageGroup === 'closing' && tabFilter === 'active'
                ? 'bg-blue-50/80 border-2 border-blue-500 ring-2 ring-blue-100'
                : 'bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
            )}
          >
            <div className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors',
              activeStageGroup === 'closing' && tabFilter === 'active'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-500'
            )}>
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                2. Принятие решения, оплата и итоги
              </span>
              <span className={cn(
                'text-xs font-semibold block truncate mt-0.5',
                activeStageGroup === 'closing' && tabFilter === 'active' ? 'text-blue-600' : 'text-slate-400'
              )}>
                3 этапа · {kpiStats.closingCount} лидов · {kpiStats.closingSum.toLocaleString('ru-RU')} €
              </span>
            </div>
          </button>
        </div>

        {/* View Switcher: Kanban / Table + Settings */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-medium border border-slate-200/80">
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all cursor-pointer text-xs',
                viewMode === 'kanban' ? 'bg-white shadow-xs font-bold text-blue-600 border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Columns className="h-3.5 w-3.5" />
              <span>Канбан-доска</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all cursor-pointer text-xs',
                viewMode === 'table' ? 'bg-white shadow-xs font-bold text-blue-600 border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <List className="h-3.5 w-3.5" />
              <span>Таблица</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPipelineSettingsOpen(true)}
            title="Настройки воронки"
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Segment Pills Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs">
        {/* Left Segment Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Quick Search Dropdown / Input */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Все лиды"
              className="h-8 w-36 sm:w-44 rounded-xl border border-slate-200 bg-slate-50/80 pl-8 pr-2.5 text-xs text-slate-800 placeholder-slate-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Pill 1: All */}
          <button
            type="button"
            onClick={() => setSegmentFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
              segmentFilter === 'all'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            <span>Все</span>
            <span className="text-[10.5px] px-1.5 py-0.2 rounded-md bg-blue-100/70 text-blue-800 font-bold">
              {kpiStats.activeCount}
            </span>
          </button>

          {/* Pill 2: Need action */}
          <button
            type="button"
            onClick={() => setSegmentFilter('need_action')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
              segmentFilter === 'need_action'
                ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            <span>Требуют действия</span>
            <span className="text-[10.5px] px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-800 font-bold">
              {kpiStats.needActionCount}
            </span>
          </button>

          {/* Pill 3: Overdue */}
          <button
            type="button"
            onClick={() => setSegmentFilter('overdue')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
              segmentFilter === 'overdue'
                ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            <span>Просроченные</span>
            <span className="text-[10.5px] px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-800 font-bold">
              {kpiStats.overdueCount}
            </span>
          </button>

          {/* Pill 4: Today */}
          <button
            type="button"
            onClick={() => setSegmentFilter('today')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
              segmentFilter === 'today'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            <span>Сегодня</span>
            <span className="text-[10.5px] px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 font-bold">
              {kpiStats.todayCount}
            </span>
          </button>

          {/* Pill 5: No action */}
          <button
            type="button"
            onClick={() => setSegmentFilter('no_action')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
              segmentFilter === 'no_action'
                ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            <span>Без следующего действия</span>
            <span className="text-[10.5px] px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-800 font-bold">
              {kpiStats.noActionCount}
            </span>
          </button>
        </div>

        {/* Right Filter Dropdowns */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">Курс: Все направления</option>
              <option value="Английский язык">Английский язык</option>
              <option value="Немецкий язык">Немецкий язык</option>
              <option value="Робототехника">Робототехника</option>
              <option value="Математика">Математика</option>
              <option value="Олимпиадная математика">Олимпиадная математика</option>
              <option value="Подготовка к школе">Подготовка к школе</option>
              <option value="Python Start">Python Start</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsAdvancedFiltersOpen((prev) => !prev)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
              isAdvancedFiltersOpen || sourceFilter !== 'all' || assignedFilter !== 'all'
                ? 'border-blue-200 bg-blue-50 text-blue-700 font-bold'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>Фильтры</span>
            {(sourceFilter !== 'all' || assignedFilter !== 'all') && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            )}
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {isAdvancedFiltersOpen && (
        <div className="flex flex-wrap items-center gap-3 bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3 shadow-2xs animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Source Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-500">Источник:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">Все источники</option>
              <option value="Сайт">Сайт</option>
              <option value="Заявка с сайта">Заявка с сайта</option>
              <option value="Telegram">Telegram</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="ВКонтакте">ВКонтакте</option>
              <option value="Рекомендация">Рекомендация</option>
              <option value="Реклама Я.Директ">Реклама Я.Директ</option>
            </select>
          </div>

          {/* Assigned Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-500">Ответственный:</span>
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">Все ответственные</option>
              <option value="Анна Смирнова">Анна Смирнова</option>
              <option value="Елена Менеджер">Елена Менеджер</option>
              <option value="Анна Администратор">Анна Администратор</option>
              <option value="Анастасия (Админ)">Анастасия (Админ)</option>
            </select>
          </div>

          {(directionFilter !== 'all' || sourceFilter !== 'all' || assignedFilter !== 'all' || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setDirectionFilter('all');
                setSourceFilter('all');
                setAssignedFilter('all');
                setSearchTerm('');
              }}
              className="text-xs font-medium text-rose-600 hover:text-rose-800 hover:underline ml-auto cursor-pointer"
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      )}

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
            const count = displayedLeads.filter((l) => l.status === col.key || (col.key === 'lost' && (l.status as string) === 'no_response') || (col.key === 'paid' && (l.status as string) === 'enrolled')).length;
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
              : displayedLeads.filter((l) => l.status === mobileStageFilter || (mobileStageFilter === 'lost' && (l.status as string) === 'no_response') || (mobileStageFilter === 'paid' && (l.status as string) === 'enrolled'));

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
        {/* VIEW 1: KANBAN BOARD WITH SINGLE-ROW STEPPER */}
        {viewMode === 'kanban' && tabFilter === 'active' && (() => {
          const activeColumns = activeStageGroup === 'primary' ? primaryColumns : closingColumns;

          const renderColumn = (col: (typeof columns)[number]) => {
            const colLeads = displayedLeads.filter(
              (l) => l.status === col.key || (col.key === 'lost' && (l.status as string) === 'no_response') || (col.key === 'paid' && (l.status as string) === 'enrolled')
            );
            const stats = stageStats[col.key] || { count: 0, sumEur: 0, actionsCount: 0 };
            const isOver = dragOverColKey === col.key;

            return (
              <div
                key={col.key}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={() => handleDragLeave(col.key)}
                onDrop={(e) => handleDrop(e, col.key)}
                className={cn(
                  'flex flex-col rounded-2xl border p-3.5 shadow-2xs transition-all duration-150 min-w-0',
                  col.bgTint,
                  isOver ? 'border-blue-500 ring-2 ring-blue-300 bg-blue-50/70' : 'border-slate-200/90'
                )}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', col.dotColor)} />
                    <span className="text-sm font-bold text-slate-900 truncate" title={col.label}>
                      {col.label}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="w-6 h-6 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-blue-600 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                    title="Добавить лид на этот этап"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Subtitle with stats */}
                <div className="text-xs text-slate-500 font-medium mb-3">
                  {colLeads.length} {colLeads.length === 1 ? 'лид' : colLeads.length < 5 ? 'лида' : 'лидов'} · {stats.sumEur} € · {stats.actionsCount} {stats.actionsCount === 1 ? 'действие' : stats.actionsCount < 5 ? 'действия' : 'действий'}
                </div>

                {/* Cards Container without ugly inner scrollbar */}
                <div className="space-y-3 flex-1 min-h-[140px]">
                  {colLeads.length === 0 ? (
                    <div className={cn(
                      'flex h-32 flex-col items-center justify-center rounded-2xl border border-dashed text-xs transition-colors bg-white/60',
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
                      />
                    ))
                  )}
                </div>
              </div>
            );
          };

          return (
            <div className={cn(
              'grid gap-3.5 items-start',
              activeStageGroup === 'primary' ? 'grid-cols-4' : 'grid-cols-3'
            )}>
              {activeColumns.map((col) => renderColumn(col))}
            </div>
          );
        })()}

        {/* VIEW 2: TABLE VIEW */}
        {viewMode === 'table' && tabFilter === 'active' && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs table-fixed">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 w-[26%]">Лид / Контакт</th>
                  <th className="px-3 py-3.5 w-[20%]">Ученик</th>
                  <th className="px-3 py-3.5 w-[18%]">Курс</th>
                  <th className="px-3 py-3.5 w-[14%] text-right">Потенциал / Баланс</th>
                  <th className="px-3 py-3.5 w-[12%]">Этап воронки</th>
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
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 pl-4 pr-3 font-semibold text-slate-900">
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
                                href={lead.telegram ? `https://t.me/${String(lead.telegram).replace('@', '')}` : `https://wa.me/${normalizePhone(lead.contact)}`}
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
                          <span className="font-bold text-slate-800">
                            {(() => {
                              const raw = String(lead.offerAmount).replace(/\+\+/g, '+').trim();
                              const m = raw.match(/(\d+(?:[.,]\d+)?)\s*€/);
                              if (m) return `${m[1]} €`;
                              const n = parseFloat(raw.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
                              if (n > 0) return `${n > 500 ? Math.round(n / 100) : n} €`;
                              return raw;
                            })()}
                          </span>
                        ) : finSummary.deposit > 0 ? (
                          <span className="font-semibold text-emerald-700">+{finSummary.deposit} €</span>
                        ) : (
                          <span className="text-slate-400">80 €</span>
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
      <ErrorBoundary fallbackTitle="Ошибка отображения карточки лида" onReset={() => setSelectedLeadForDrawer(null)}>
        <LeadDetailsModal
          isOpen={Boolean(selectedLeadForDrawer)}
          lead={selectedLeadForDrawer}
          onClose={() => setSelectedLeadForDrawer(null)}
          onUpdateLead={(updated) => {
            setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
            setSelectedLeadForDrawer(updated);
          }}
          onConverted={(studentId) => {
            setLeads(getStoredLeads(true, true));
            setSelectedLeadForDrawer(null);
          }}
          onStatusChange={(leadId, newStatus) => {
            handleQuickStatusChange(leadId, newStatus);
          }}
        />
      </ErrorBoundary>

      {/* Modal to create new lead */}
      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleLeadCreated}
      />

      {/* Modal: Confirmation & 1-click enroll to students on drop in "Оплачено (Успех)" */}
      {leadForConvertModal && (
        <ErrorBoundary fallbackTitle="Ошибка отображения зачисления" onReset={() => setLeadForConvertModal(null)}>
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
        </ErrorBoundary>
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

      {/* Pipeline Settings Modal */}
      <PipelineSettingsModal
        isOpen={isPipelineSettingsOpen}
        onClose={() => setIsPipelineSettingsOpen(false)}
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
  onDeleteLead: (leadId: string) => void;
  isDragged?: boolean;
  onDragStart?: () => void;
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

  // Clean formatted deal amount strictly in EUR
  const dealAmountFormatted = useMemo(() => {
    if (!lead) return '80 €';
    const raw = lead.offerAmount;
    if (raw) {
      const clean = String(raw).replace(/\+\+/g, '+').trim();
      const eurMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*€/);
      if (eurMatch) {
        return `${eurMatch[1].replace(',', '.')} €`;
      }
      const num = parseFloat(clean.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      if (num > 0) {
        if (clean.includes('€') || num <= 500) {
          return `${num} €`;
        }
        const eur = convertRubToEur(num);
        return `${eur} €`;
      }
    }
    try {
      const fin = getLeadFinancialSummary(lead);
      if (fin && fin.deposit > 0) {
        return `${fin.deposit} €`;
      }
    } catch {}
    return '80 €';
  }, [lead]);

  // Deadline calculation
  const deadlineStatus = useMemo(() => {
    if (!lead?.nextAction) return 'empty';
    const str = String(lead.nextActionDate || '').toLowerCase();
    if (str.includes('просроч') || str.includes('вчера') || str.includes('2026-08') || str.includes('01.09') || str.includes('02.09')) {
      return 'overdue';
    }
    if (str.includes('сегодня') || str.includes('12:00') || str.includes('15:00') || str.includes('16:30') || str.includes('17:00') || str.includes('18:00')) {
      return 'today';
    }
    return 'future';
  }, [lead?.nextAction, lead?.nextActionDate]);

  const phoneClean = normalizePhone(lead?.contact);
  const formattedPhoneStr = formatPhone(lead?.contact);
  const waLink = phoneClean ? `https://wa.me/${phoneClean}` : '#';
  const tgLink = lead?.telegram
    ? `https://t.me/${String(lead.telegram).replace('@', '')}`
    : (phoneClean ? `https://wa.me/${phoneClean}` : '#');

  return (
    <div
      draggable={true}
      onDragStart={onDragStart}
      onClick={onOpen}
      className={cn(
        'rounded-2xl border bg-white p-3.5 shadow-2xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing text-left flex flex-col justify-between gap-2.5 relative group/card select-none',
        isDragged ? 'opacity-40 shadow-lg scale-95 border-blue-400' : 'border-slate-200/90 hover:border-slate-300'
      )}
    >
      <div>
        {/* Top Row: Parent Name + Clean Currency Badge + 3-dots Menu */}
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            {/* Row 1: Bold Parent Name */}
            <h4
              className="font-bold text-slate-900 text-sm hover:text-blue-600 transition-colors truncate block"
              title={lead.name}
            >
              {lead.name}
            </h4>
            {/* Row 2: Child name + age */}
            {(lead.studentName || lead.studentAge) && (
              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                {lead.studentName || lead.name}
                {lead.studentAge ? ` · ${lead.studentAge}` : ''}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Deal Amount */}
            <span
              className="text-xs font-bold text-slate-900 shrink-0"
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

        {/* Direction tag & Source */}
        <div className="mt-2 flex items-center gap-1.5 text-xs flex-wrap">
          {(lead.status as string) === 'enrolled' && (
            <span className="bg-emerald-50 text-emerald-700 font-bold text-[11px] px-2 py-0.5 rounded-md border border-emerald-200 truncate flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 inline shrink-0" />
              Зачислен
            </span>
          )}
          <span className="bg-purple-50 text-purple-700 font-semibold text-[11px] px-2.5 py-0.5 rounded-md border border-purple-100 truncate">
            {lead.directionOrCourse || 'Курс не указан'}
          </span>
          <span className="bg-slate-100 text-slate-600 font-medium text-[11px] px-2 py-0.5 rounded-md truncate">
            {lead.source || 'Прямой контакт'}
          </span>
        </div>

        {/* Formatted Phone & Vector SVG Communication Icons */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <a
            href={phoneClean ? `tel:+${phoneClean}` : '#'}
            onClick={(e) => e.stopPropagation()}
            title="Позвонить по телефону"
            className="font-mono text-xs text-blue-600 font-medium hover:underline truncate flex items-center gap-1.5"
          >
            <Phone className="w-3.5 h-3.5 text-blue-500" />
            <span>{formattedPhoneStr}</span>
          </a>

          {phoneClean && (
            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              {/* WhatsApp button */}
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!lead.contact) {
                    toast.error('У контакта не указан номер телефона');
                    return;
                  }
                  triggerWhatsAppContact({
                    phone: lead.contact,
                    leadId: lead.id,
                    leadName: lead.name,
                    author: 'Администратор',
                  });
                }}
                title="Написать в WhatsApp"
                className="w-6 h-6 rounded-full bg-[#25D366]/15 hover:bg-[#25D366] text-[#25D366] hover:text-white flex items-center justify-center transition-all border border-[#25D366]/30 cursor-pointer"
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
                  if (!lead.telegram && !lead.contact) {
                    toast.error('У контакта не указан Telegram или телефон');
                    return;
                  }
                  triggerTelegramContact({
                    telegram: lead.telegram,
                    phone: lead.contact,
                    leadId: lead.id,
                    leadName: lead.name,
                    author: 'Администратор',
                  });
                }}
                title="Написать в Telegram"
                className="w-6 h-6 rounded-full bg-[#229ED9]/15 hover:bg-[#229ED9] text-[#229ED9] hover:text-white flex items-center justify-center transition-all border border-[#229ED9]/30 cursor-pointer"
              >
                <TelegramIcon className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Task & Deadline Control Banner */}
      <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
        {deadlineStatus === 'overdue' ? (
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-2.5 flex items-start justify-between gap-2 shadow-2xs">
            <div className="flex items-start gap-2 min-w-0">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-rose-800 leading-tight">
                  Просрочено, {lead.nextActionDate || '30.09'}
                </p>
                <p className="text-xs text-rose-950 font-medium mt-0.5 leading-snug">
                  {lead.nextAction || 'Связаться с родителем'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpen}
              className="text-rose-400 hover:text-rose-600 p-0.5 cursor-pointer shrink-0"
              title="Открыть задачу"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : deadlineStatus === 'today' ? (
          <div className="bg-[#FFF8E6] border border-[#FDE3A7] rounded-xl p-2.5 flex items-start justify-between gap-2 shadow-2xs">
            <div className="flex items-start gap-2 min-w-0">
              <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-amber-800 leading-tight">
                  Сегодня, {lead.nextActionDate?.includes(':') ? lead.nextActionDate.split(' ').pop() : '13:00'}
                </p>
                <p className="text-xs text-amber-950 font-medium mt-0.5 leading-snug">
                  {lead.nextAction}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpen}
              className="text-amber-500 hover:text-amber-700 p-0.5 cursor-pointer shrink-0"
              title="Открыть задачу"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : deadlineStatus === 'future' ? (
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-start justify-between gap-2 shadow-2xs">
            <div className="flex items-start gap-2 min-w-0">
              <Calendar className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-700 leading-tight">
                  {lead.nextActionDate || 'Запланировано'}
                </p>
                <p className="text-xs text-slate-800 font-medium mt-0.5 leading-snug">
                  {lead.nextAction}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpen}
              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer shrink-0"
              title="Открыть задачу"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 text-xs font-semibold text-amber-800 hover:bg-amber-100/60 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-amber-600" />
            <span>+ Назначить действие</span>
          </button>
        )}
      </div>
    </div>
  );
}
