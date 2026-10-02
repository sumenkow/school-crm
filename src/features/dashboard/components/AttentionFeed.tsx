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
        subtitle: `${p.studentName || 'Иван Смирнов'} · ${Math.round(debtEur)} € долг`,
        timeLabel: 'Сегодня',
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
        subtitle: `${trialLead.name} · без даты пробного`,
        timeLabel: 'Вчера',
        actionLabel: 'Назначить',
        targetUrl: `/crm/leads/${trialLead.id}`,
        rawLead: trialLead,
      });
    }

    // 3. Ending subscription package (2 lessons remaining)
    const endingSubStudent = students.find(s => s.status === 'active' && s.finance?.activeSubscription?.lessonsRemaining && s.finance.activeSubscription.lessonsRemaining <= 2);
    if (endingSubStudent) {
      const rem = endingSubStudent.finance?.activeSubscription?.lessonsRemaining || 2;
      items.push({
        id: `att_pkg_${endingSubStudent.id}`,
        type: 'package',
        iconType: 'amber',
        title: 'Заканчивается пакет занятий',
        subtitle: `${endingSubStudent.firstName} ${endingSubStudent.lastName} · ост. ${rem} ${rem === 1 ? 'занятие' : 'занятия'}`,
        timeLabel: 'Вчера',
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
        subtitle: 'Алексей Попов · ост. 2 занятия',
        timeLabel: 'Вчера',
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
        subtitle: `${unhandledLead.name} · 1 день без ответа`,
        timeLabel: 'Вчера',
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
        subtitle: 'Елена Васильева · 1 день без ответа',
        timeLabel: 'Вчера',
        actionLabel: 'Открыть',
        targetUrl: '/crm',
      });
    }

    // 5. Low-capacity group
    const lowGroup = groups.find(g => g.status === 'active' && !g.is_deleted && (g.students?.length || 0) < (g.capacity || 8));
    if (lowGroup) {
      const enrolled = lowGroup.students?.length || 0;
      const capacity = lowGroup.capacity || 8;
      items.push({
        id: `att_grp_${lowGroup.id}`,
        type: 'group',
        iconType: 'purple',
        title: 'Группа недозаполнена',
        subtitle: `${lowGroup.name} · ${enrolled}/${capacity} мест`,
        timeLabel: '30 сент.',
        actionLabel: 'Открыть',
        targetUrl: `/groups/${lowGroup.id}`,
      });
    }

    return items;
  }, [payments, leads, groups, students, rate]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm space-y-3 animate-pulse h-[260px]" />
    );
  }

  return (
    <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex flex-col justify-between h-[260px]">
      <div>
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <h3 className="font-bold text-slate-900 text-sm">Требует вашего внимания</h3>
          </div>
          <span className="bg-rose-50 text-rose-600 text-xs font-semibold px-2 py-0.5 rounded-full">
            {attentionItems.length} ситуаций
          </span>
        </div>

        <div className="divide-y divide-slate-50 py-0.5">
          {attentionItems.slice(0, 3).map((item) => {
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

            const handleAction = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (item.rawLead && onOpenLead) {
                onOpenLead(item.rawLead);
              } else {
                router.push(item.targetUrl);
              }
            };

            return (
              <div key={item.id} className="py-2 flex items-center justify-between gap-2 h-[46px]">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0', iconBg)}>
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate leading-tight">{item.title}</p>
                    <p className="text-[11px] text-slate-400 truncate leading-tight">{item.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center shrink-0">
                  <button
                    type="button"
                    onClick={handleAction}
                    className="text-xs font-semibold text-blue-600 bg-blue-50/60 hover:bg-blue-100 border border-blue-200/80 px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer"
                  >
                    {item.actionLabel}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => router.push('/tasks')}
        className="w-full text-center text-[11px] font-medium text-blue-600 hover:text-blue-700 pt-1 border-t border-slate-50 cursor-pointer"
      >
        Показать все ситуации ({attentionItems.length}) →
      </button>
    </div>
  );
}
