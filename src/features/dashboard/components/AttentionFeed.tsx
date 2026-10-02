'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  MessageCircle,
  Phone,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Users,
  CheckCircle2,
  Clock,
  CalendarPlus
} from 'lucide-react';
import { FullPaymentData, FullLeadData, FullGroupData, FullTaskData, FullStudentData } from '@/lib/data/mockData';
import { parsePaymentAmountEUR, getEurRubRate } from '@/lib/data/currencyHelper';
import { getStudentFinancialSummary } from '@/lib/data/balanceHelper';
import { cn } from '@/lib/utils';

export interface AttentionItem {
  id: string;
  type: 'debt' | 'lead' | 'trial' | 'group' | 'task';
  severity: 'critical' | 'warning';
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  highlight: string;
  phone?: string;
  waUrl?: string;
  targetUrl: string;
  actionLabel: string;
  secondaryAction?: {
    label: string;
    action: () => void;
    icon?: any;
  };
  deadline?: string;
}

export interface AttentionFeedProps {
  payments: FullPaymentData[];
  leads: FullLeadData[];
  groups: FullGroupData[];
  tasks: FullTaskData[];
  students: FullStudentData[];
  onOpenLead?: (lead: FullLeadData) => void;
  onOpenTask?: (task: any) => void;
  isLoading?: boolean;
}

export function AttentionFeed({
  payments,
  leads,
  groups,
  tasks,
  students,
  onOpenLead,
  onOpenTask,
  isLoading = false,
}: AttentionFeedProps) {
  const router = useRouter();
  const rate = getEurRubRate();
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'warning'>('all');

  const attentionItems = useMemo(() => {
    const items: AttentionItem[] = [];

    // 1. Overdue Debts (Critical 🔴)
    const overduePayments = payments.filter(p => p.status === 'overdue');
    overduePayments.slice(0, 4).forEach(p => {
      const studentSum = p.studentId ? getStudentFinancialSummary(p.studentId, students) : null;
      let debtEur = parsePaymentAmountEUR(p.amount, rate);
      if (studentSum && studentSum.debt > 0) {
        debtEur = studentSum.debt;
      }

      const st = students.find(s => s.id === p.studentId);
      const parentPhone = p.parentName || st?.parents?.[0]?.phone || st?.phone || '';
      const cleanPhone = parentPhone.replace(/\D/g, '');

      items.push({
        id: `att_debt_${p.id}`,
        type: 'debt',
        severity: 'critical',
        badge: 'Долг по оплате',
        badgeColor: 'bg-rose-50 text-rose-700 border border-rose-200',
        title: p.studentName || 'Ученик',
        subtitle: p.courseName || p.groupName ? `${p.courseName || p.groupName} • ${p.periodLabel || 'Абонемент'}` : 'Просрочен счет',
        highlight: `Долг: ${debtEur.toLocaleString('ru-RU')} €`,
        phone: parentPhone,
        waUrl: cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Здравствуйте! Напоминаем об оплате занятий в школе.`)}` : undefined,
        targetUrl: p.studentId ? `/students/${p.studentId}` : '/finance',
        actionLabel: 'Открыть',
        deadline: p.paymentDate || 'Срочно',
      });
    });

    // 2. Urgent / Unhandled Leads
    const unhandledLeads = leads.filter(l => !l.is_deleted && (l.status === 'new' || l.status === 'trial_held' || l.status === 'thinking'));
    unhandledLeads.slice(0, 4).forEach(l => {
      const isNew = l.status === 'new';
      const isTrialHeld = l.status === 'trial_held';
      const cleanPhone = l.contact ? l.contact.replace(/\D/g, '') : '';

      items.push({
        id: `att_lead_${l.id}`,
        type: isTrialHeld ? 'trial' : 'lead',
        severity: isNew ? 'critical' : 'warning',
        badge: isNew ? 'Новая заявка' : isTrialHeld ? 'После пробного' : 'Думают / Счёт',
        badgeColor: isNew ? 'bg-amber-50 text-amber-800 border border-amber-200' : isTrialHeld ? 'bg-purple-50 text-purple-800 border border-purple-200' : 'bg-teal-50 text-teal-800 border border-teal-200',
        title: l.name,
        subtitle: l.studentName ? `Ребёнок: ${l.studentName} • ${l.directionOrCourse}` : l.directionOrCourse,
        highlight: isNew ? 'Ожидает первого звонка' : isTrialHeld ? 'Пробный проведен • Ждет решения' : 'Выставлен счет',
        phone: l.contact,
        waUrl: cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Здравствуйте, ${l.name}! Пишу вам из школы по поводу занятий.`)}` : undefined,
        targetUrl: `/crm/leads/${l.id}`,
        actionLabel: isTrialHeld ? 'Назначить' : 'Открыть',
        deadline: l.nextActionDate || 'Сегодня',
      });
    });

    // 3. Low-capacity groups (< 50% capacity) (Warning 🟠)
    const lowCapacityGroups = groups.filter(g => g.status === 'active' && !g.is_deleted && (g.students?.length || 0) < (g.capacity || 8) * 0.5);
    lowCapacityGroups.slice(0, 3).forEach(g => {
      items.push({
        id: `att_grp_${g.id}`,
        type: 'group',
        severity: 'warning',
        badge: 'Недобор группы',
        badgeColor: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
        title: g.name,
        subtitle: `${g.courseName} • Расписание: ${g.schedule}`,
        highlight: `Занято: ${g.students?.length || 0} из ${g.capacity || 8} мест`,
        targetUrl: `/groups/${g.id}`,
        actionLabel: 'Открыть',
        deadline: 'Идет добор',
      });
    });

    return items;
  }, [payments, leads, groups, students, rate]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'critical') return attentionItems.filter(i => i.severity === 'critical');
    if (activeTab === 'warning') return attentionItems.filter(i => i.severity === 'warning');
    return attentionItems;
  }, [attentionItems, activeTab]);

  const criticalCount = useMemo(() => attentionItems.filter(i => i.severity === 'critical').length, [attentionItems]);
  const warningCount = useMemo(() => attentionItems.filter(i => i.severity === 'warning').length, [attentionItems]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs">
        <div className="h-5 w-40 bg-slate-100 rounded animate-pulse" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <h3 className="text-sm font-bold text-slate-900">Фокус внимания</h3>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60">
            {attentionItems.length}
          </span>
        </div>

        {/* Severity Tabs */}
        <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-lg text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={cn(
              'px-2.5 py-1 rounded-md transition-all text-[11px]',
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Все ({attentionItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('critical')}
            className={cn(
              'px-2.5 py-1 rounded-md transition-all flex items-center gap-1 text-[11px]',
              activeTab === 'critical'
                ? 'bg-white text-rose-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Критические ({criticalCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('warning')}
            className={cn(
              'px-2.5 py-1 rounded-md transition-all flex items-center gap-1 text-[11px]',
              activeTab === 'warning'
                ? 'bg-white text-amber-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Внимание ({warningCount})
          </button>
        </div>
      </div>

      {/* Feed Content */}
      <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-[420px]">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200/80">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
            <p className="text-sm font-bold text-slate-800">Нет срочных задач</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Все счета оплачены, лиды обработаны вовремя, группы укомплектованы.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.type === 'lead' || item.type === 'trial') {
                  if (onOpenLead) {
                    const foundLead = leads.find(l => `att_lead_${l.id}` === item.id);
                    if (foundLead) {
                      onOpenLead(foundLead);
                      return;
                    }
                  }
                }
                router.push(item.targetUrl);
              }}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 transition-all cursor-pointer group bg-white shadow-2xs"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  <span className={cn('font-bold px-2 py-0.5 rounded-md text-[10px]', item.badgeColor)}>
                    {item.badge}
                  </span>
                  <span className="text-slate-400 text-[10px] font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-300" />
                    {item.deadline}
                  </span>
                </div>

                <div className="min-w-0 space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {item.title}
                  </h4>
                  {item.subtitle && (
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {item.subtitle}
                    </p>
                  )}
                </div>

                <p className={cn(
                  'text-xs font-semibold',
                  item.type === 'debt' ? 'text-rose-600' : item.type === 'lead' ? 'text-amber-800' : item.type === 'trial' ? 'text-purple-700' : 'text-slate-700'
                )}>
                  {item.highlight}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center pt-1 sm:pt-0">
                {item.waUrl && (
                  <a
                    href={item.waUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1 text-[11px] font-semibold"
                    title="Написать в WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Напомнить</span>
                  </a>
                )}

                {item.phone && !item.waUrl && (
                  <a
                    href={`tel:${item.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                    title="Позвонить"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.type === 'lead' || item.type === 'trial') {
                      if (onOpenLead) {
                        const foundLead = leads.find(l => `att_lead_${l.id}` === item.id);
                        if (foundLead) {
                          onOpenLead(foundLead);
                          return;
                        }
                      }
                    }
                    router.push(item.targetUrl);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>{item.actionLabel}</span>
                  <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
