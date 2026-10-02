'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Clock,
  User,
  Users,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { FullPaymentData, FullLeadData, FullGroupData, FullTaskData, FullStudentData } from '@/lib/data/mockData';
import { parsePaymentAmountEUR, getEurRubRate } from '@/lib/data/currencyHelper';
import { getStudentFinancialSummary } from '@/lib/data/balanceHelper';
import { cn } from '@/lib/utils';

export interface AttentionItem {
  id: string;
  type: 'debt' | 'trial' | 'package' | 'lead' | 'group';
  iconType: 'rose' | 'purple' | 'amber' | 'blue';
  title: string;
  subtitle: string;
  timeLabel: string;
  actionLabel: string;
  targetUrl: string;
  waUrl?: string;
  rawLead?: FullLeadData;
}

export interface AttentionFeedProps {
  payments: FullPaymentData[];
  leads: FullLeadData[];
  groups: FullGroupData[];
  tasks?: FullTaskData[];
  students: FullStudentData[];
  onOpenLead?: (lead: FullLeadData) => void;
  onOpenTask?: (task: any) => void;
  isLoading?: boolean;
}

export function AttentionFeed({
  payments,
  leads,
  groups,
  students,
  onOpenLead,
  isLoading = false,
}: AttentionFeedProps) {
  const router = useRouter();
  const rate = getEurRubRate();

  const attentionItems = useMemo(() => {
    const items: AttentionItem[] = [];

    // 1. Overdue debt
    const overdueList = payments.filter(p => p.status === 'overdue');
    if (overdueList.length > 0) {
      const p = overdueList[0];
      const st = students.find(s => s.id === p.studentId);
      const studentSum = p.studentId ? getStudentFinancialSummary(p.studentId, students) : null;
      let debtEur = parsePaymentAmountEUR(p.amount, rate);
      if (studentSum && studentSum.debt > 0) debtEur = studentSum.debt;

      items.push({
        id: `att_debt_${p.id}`,
        type: 'debt',
        iconType: 'rose',
        title: 'Просрочена оплата',
        subtitle: `${p.studentName || 'Иванов Иван'} • ${Math.round(debtEur)} € • 3 дня`,
        timeLabel: 'Сегодня, 09:12',
        actionLabel: 'Открыть',
        targetUrl: p.studentId ? `/students/${p.studentId}` : '/finance',
      });
    }

    // 2. Trial without scheduled date / trial lead
    const trialLead = leads.find(l => !l.is_deleted && (l.status === 'new' || l.status === 'trial_held'));
    if (trialLead) {
      items.push({
        id: `att_trial_${trialLead.id}`,
        type: 'trial',
        iconType: 'purple',
        title: 'Пробное без назначения',
        subtitle: `${trialLead.name} • заявка 2 дня назад`,
        timeLabel: 'Вчера, 14:20',
        actionLabel: 'Назначить',
        targetUrl: `/crm/leads/${trialLead.id}`,
        rawLead: trialLead,
      });
    }

    // 3. Ending subscription package (2 lessons remaining)
    const endingSubStudent = students.find(s => s.status === 'active' && s.finance?.activeSubscription?.lessonsRemaining && s.finance.activeSubscription.lessonsRemaining <= 2);
    if (endingSubStudent) {
      items.push({
        id: `att_pkg_${endingSubStudent.id}`,
        type: 'package',
        iconType: 'amber',
        title: 'Заканчивается пакет занятий',
        subtitle: `${endingSubStudent.firstName} ${endingSubStudent.lastName} • осталось 2 занятия`,
        timeLabel: 'Вчера, 11:05',
        actionLabel: 'Напомнить',
        targetUrl: `/students/${endingSubStudent.id}`,
      });
    } else {
      // Fallback lead without reaction
      items.push({
        id: 'att_pkg_default',
        type: 'package',
        iconType: 'amber',
        title: 'Заканчивается пакет занятий',
        subtitle: 'Алексей Попов • осталось 2 занятия',
        timeLabel: 'Вчера, 11:05',
        actionLabel: 'Напомнить',
        targetUrl: '/students',
      });
    }

    // 4. Lead without reaction
    const unhandledLead = leads.find(l => !l.is_deleted && l.status === 'new' && l.id !== trialLead?.id);
    if (unhandledLead) {
      items.push({
        id: `att_lead_${unhandledLead.id}`,
        type: 'lead',
        iconType: 'blue',
        title: 'Лид без реакции',
        subtitle: `${unhandledLead.name} • 1 день`,
        timeLabel: 'Вчера, 10:15',
        actionLabel: 'Открыть',
        targetUrl: `/crm/leads/${unhandledLead.id}`,
        rawLead: unhandledLead,
      });
    } else {
      items.push({
        id: 'att_lead_default',
        type: 'lead',
        iconType: 'blue',
        title: 'Лид без реакции',
        subtitle: 'Елена Васильева • 1 день',
        timeLabel: 'Вчера, 10:15',
        actionLabel: 'Открыть',
        targetUrl: '/crm',
      });
    }

    // 5. Low-capacity group
    const lowGroup = groups.find(g => g.status === 'active' && !g.is_deleted && (g.students?.length || 0) < (g.capacity || 8));
    if (lowGroup) {
      items.push({
        id: `att_grp_${lowGroup.id}`,
        type: 'group',
        iconType: 'purple',
        title: 'Группа недозаполнена',
        subtitle: `${lowGroup.name} • ${lowGroup.students?.length || 6}/${lowGroup.capacity || 8} мест`,
        timeLabel: '30 сент., 18:40',
        actionLabel: 'Открыть',
        targetUrl: `/groups/${lowGroup.id}`,
      });
    }

    return items;
  }, [payments, leads, groups, students, rate]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3 animate-pulse h-[390px]" />
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between h-[390px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
            !
          </div>
          <h3 className="text-sm font-bold text-slate-900">Требует вашего внимания</h3>
        </div>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600">
          {attentionItems.length} ситуаций
        </span>
      </div>

      {/* List */}
      <div className="divide-y divide-slate-50 my-auto">
        {attentionItems.slice(0, 5).map((item) => {
          const iconBg = {
            rose: 'bg-rose-50 text-rose-500',
            purple: 'bg-purple-50 text-purple-600',
            amber: 'bg-amber-50 text-amber-600',
            blue: 'bg-blue-50 text-blue-600',
          }[item.iconType];

          const IconComponent = item.type === 'debt' ? AlertCircle
            : item.type === 'trial' ? AlertCircle
            : item.type === 'package' ? AlertTriangle
            : item.type === 'lead' ? User
            : Users;

          return (
            <div
              key={item.id}
              onClick={() => {
                if (item.rawLead && onOpenLead) {
                  onOpenLead(item.rawLead);
                } else {
                  router.push(item.targetUrl);
                }
              }}
              className="flex items-center justify-between py-2.5 hover:bg-slate-50/70 transition-colors cursor-pointer rounded-lg px-1 group"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs', iconBg)}>
                  <IconComponent className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  {item.timeLabel}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.rawLead && onOpenLead) {
                      onOpenLead(item.rawLead);
                    } else {
                      router.push(item.targetUrl);
                    }
                  }}
                  className="px-3 py-1 rounded-lg text-xs font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  {item.actionLabel}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer link */}
      <div className="pt-2 text-center border-t border-slate-50">
        <button
          type="button"
          onClick={() => router.push('/tasks')}
          className="text-xs font-medium text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <span>Показать все ситуации ({attentionItems.length})</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
