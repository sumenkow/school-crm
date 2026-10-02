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
        subtitle: `${trialLead.name} · без даты пробного`,
        timeLabel: 'Вчера, 14:20',
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
        timeLabel: 'Вчера, 18:05',
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
        timeLabel: 'Вчера, 18:05',
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
        timeLabel: 'Вчера, 11:30',
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
        timeLabel: 'Вчера, 11:30',
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
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3 animate-pulse h-full min-h-[245px]" />
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
      {/* Шапка */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-3.5 h-3.5" />
          </div>
          <h3 className="font-bold text-slate-900 text-xs">Требует вашего внимания</h3>
        </div>
        <span className="bg-rose-50 text-rose-600 font-bold text-[11px] px-2 py-0.5 rounded-full">
          {attentionItems.length} ситуаций
        </span>
      </div>

      {/* Список ситуаций — компактные строки py-1.5 */}
      <div className="divide-y divide-slate-50 my-auto">
        {attentionItems.slice(0, 3).map((item) => {
          const iconBgClass = {
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
            <div
              key={item.id}
              onClick={handleAction}
              className="py-1.5 flex items-center justify-between gap-2 hover:bg-slate-50/50 rounded-xl px-1 -mx-1 transition-colors cursor-pointer group"
            >
              {/* Иконка + Текст */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', iconBgClass)}>
                  <IconComponent className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate leading-snug group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate leading-none mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              {/* Время */}
              <span className="text-[11px] text-slate-400 shrink-0 w-20 text-right hidden sm:inline-block">
                {item.timeLabel}
              </span>

              {/* Кнопка действия */}
              <button
                type="button"
                onClick={handleAction}
                className="w-[82px] h-7 flex items-center justify-center text-[11px] font-semibold text-blue-600 bg-blue-50/70 hover:bg-blue-100 border border-blue-200/80 rounded-lg shrink-0 transition-colors cursor-pointer"
              >
                {item.actionLabel}
              </button>
            </div>
          );
        })}
      </div>

      {/* Нижняя ссылка */}
      <button
        type="button"
        onClick={() => router.push('/tasks')}
        className="w-full text-center text-[11px] font-semibold text-blue-600 hover:text-blue-700 pt-2 border-t border-slate-50 cursor-pointer"
      >
        Показать все ситуации ({attentionItems.length}) →
      </button>
    </div>
  );
}

export { AttentionFeed as AttentionPanel };
