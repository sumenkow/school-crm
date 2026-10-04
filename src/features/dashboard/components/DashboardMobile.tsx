'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  CreditCard,
  Users,
  UserCheck,
  AlertCircle,
  MessageCircle,
  CheckCircle2,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { DashboardStateReturn } from '../hooks/useDashboardState';
import { ProfileSettingsSheet } from '@/components/layout/ProfileSettingsSheet';
import { TaskModal } from '@/components/dashboard/TaskModal';
import { TeacherModal } from '@/components/dashboard/TeacherModal';
import { QuickActionDrawer } from '@/components/dashboard/QuickActionDrawer';
import { CreateLeadModal } from '@/components/crm/CreateLeadModal';
import { LeadDrawer } from '@/components/crm/LeadDrawer';
import { StudentDrawer } from '@/components/students/StudentDrawer';
import { parsePaymentAmountEUR, getEurRubRate } from '@/lib/data/currencyHelper';
import { parseDateSafe } from '../lib/analyticsHelpers';
import { getSchoolSettings } from '@/lib/data/schoolSettingsStorage';

interface DashboardMobileProps extends DashboardStateReturn {
  onOpenReport: () => void;
  onOpenExecutiveReport?: () => void;
}

export function DashboardMobile({ data, actions }: DashboardMobileProps) {
  const router = useRouter();
  const rate = getEurRubRate();

  // 1. KPI Calculations (Real dynamic state)
  const paidTotalEur = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    return Math.round(
      data.payments
        .filter(p => {
          if (p.status !== 'paid') return false;
          const d = parseDateSafe(p.paymentDate);
          return d && d.getFullYear() === curYear && d.getMonth() === curMonth;
        })
        .reduce((sum, p) => sum + parsePaymentAmountEUR(p.amount, rate), 0)
    );
  }, [data.payments, rate]);

  const activeStudentsCount = useMemo(() => {
    return data.students.filter(s => s.status === 'active').length;
  }, [data.students]);

  const newStudentsCount = useMemo(() => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    return data.students.filter(s => {
      if (s.isNewUntil && new Date(s.isNewUntil).getTime() > now) return true;
      if (s.createdAt && new Date(s.createdAt).getTime() > thirtyDaysAgo) return true;
      return false;
    }).length;
  }, [data.students]);

  const activeLeadsCount = useMemo(() => {
    return data.leads.filter(l => !l.is_deleted && !(l as any).isDeleted && l.status !== 'lost' && l.status !== 'paid').length;
  }, [data.leads]);

  const trialLeadsCount = useMemo(() => {
    return data.leads.filter(l => !l.is_deleted && (l.status === 'trial_scheduled' || l.status === 'trial_held')).length;
  }, [data.leads]);

  const debtTotalEur = useMemo(() => {
    return Math.round(
      data.payments
        .filter(p => p.status === 'overdue')
        .reduce((sum, p) => sum + parsePaymentAmountEUR(p.amount, rate), 0)
    );
  }, [data.payments, rate]);

  const overduePaymentsCount = useMemo(() => {
    return data.payments.filter(p => p.status === 'overdue').length;
  }, [data.payments]);

  // 2. Dynamic Attention Feed (Real items)
  const mobileAttentionItems = useMemo(() => {
    const items: Array<{
      id: string;
      badge: string;
      badgeColor: string;
      title: string;
      subtitle: string;
      phone?: string;
      waUrl?: string;
      actionType: 'lead' | 'debt' | 'task';
      targetId: string;
      rawItem?: any;
    }> = [];

    // Overdue debt
    data.payments.filter(p => p.status === 'overdue').slice(0, 2).forEach(p => {
      const st = data.students.find(s => s.id === p.studentId);
      const parentPhone = p.parentName || st?.parents?.[0]?.phone || st?.phone || '';
      const cleanPhone = parentPhone.replace(/\D/g, '');
      const amtEur = Math.round(parsePaymentAmountEUR(p.amount, rate));

      items.push({
        id: `m_debt_${p.id}`,
        badge: 'Долг по оплате',
        badgeColor: 'text-rose-700 bg-rose-100',
        title: p.studentName || 'Ученик',
        subtitle: `Просрочка ${amtEur.toLocaleString('ru-RU')} € • ${p.courseName || 'Абонемент'}`,
        phone: parentPhone,
        waUrl: cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent('Здравствуйте! Напоминаем об оплате занятий в школе.')}` : undefined,
        actionType: 'debt',
        targetId: p.studentId || p.id,
        rawItem: p,
      });
    });

    // Urgent leads
    data.leads.filter(l => !l.is_deleted && (l.status === 'new' || l.status === 'trial_scheduled')).slice(0, 2).forEach(l => {
      const cleanPhone = l.contact ? l.contact.replace(/\D/g, '') : '';
      const isNew = l.status === 'new';

      items.push({
        id: `m_lead_${l.id}`,
        badge: isNew ? 'Новый лид' : 'Пробный урок',
        badgeColor: isNew ? 'text-blue-700 bg-blue-100' : 'text-purple-700 bg-purple-100',
        title: l.name,
        subtitle: l.directionOrCourse || 'Новая заявка',
        phone: l.contact,
        waUrl: cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Здравствуйте, ${l.name}! Пишу вам из школы по поводу занятий.`)}` : undefined,
        actionType: 'lead',
        targetId: l.id,
        rawItem: l,
      });
    });

    return items;
  }, [data.payments, data.leads, data.students, rate]);

  return (
    <div className="block md:hidden w-full max-w-full overflow-x-hidden p-4 pb-24 space-y-4">
      
      {/* ЭЛЕМЕНТ 1. Единая мобильная шапка */}
      <div className="h-12 flex items-center justify-between min-w-0 w-full">
        <div className="min-w-0">
          <h2 className="font-bold text-lg text-slate-900 truncate leading-tight">{getSchoolSettings().name || 'You Europe'}</h2>
          <p className="text-[11px] text-slate-500 font-medium">1 € = {rate} ₽</p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={actions.openCreateLead}
            className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-transform flex items-center gap-1 cursor-pointer"
          >
            <Plus size={14} /> Лид
          </button>
          
          <div
            onClick={actions.openProfile}
            className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center cursor-pointer active:scale-95 transition-transform shrink-0"
          >
            A
          </div>
        </div>
      </div>

      {/* ЭЛЕМЕНТ 2. Единая компактная сетка KPI 2х2 */}
      <div className="grid grid-cols-2 gap-2">
        {/* Карточка 1: Выручка */}
        <div 
          onClick={() => router.push('/finance')}
          className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs cursor-pointer active:scale-[0.98] transition-transform space-y-1"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Выручка</span>
            <CreditCard size={14} className="text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-900">
            {paidTotalEur.toLocaleString('ru-RU')} €
          </p>
          <p className="text-[10px] font-semibold text-slate-500">текущий месяц</p>
        </div>

        {/* Карточка 2: Ученики */}
        <div 
          onClick={() => router.push('/students')}
          className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs cursor-pointer active:scale-[0.98] transition-transform space-y-1"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ученики</span>
            <Users size={14} className="text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-900">
            {activeStudentsCount}
          </p>
          <span className="inline-block text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
            +{newStudentsCount} новых
          </span>
        </div>

        {/* Карточка 3: Лиды в работе */}
        <div 
          onClick={() => router.push('/crm')}
          className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs cursor-pointer active:scale-[0.98] transition-transform space-y-1"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Лиды в работе</span>
            <UserCheck size={14} className="text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-900">
            {activeLeadsCount}
          </p>
          <span className="inline-block text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-md">
            {trialLeadsCount} на пробный
          </span>
        </div>

        {/* Карточка 4: Долги */}
        <div 
          onClick={() => router.push('/finance')}
          className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs cursor-pointer active:scale-[0.98] transition-transform space-y-1"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Долги</span>
            <AlertCircle size={14} className="text-rose-400" />
          </div>
          <p className="text-xl font-black text-rose-600">
            {debtTotalEur.toLocaleString('ru-RU')} €
          </p>
          <span className="inline-block text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md">
            {overduePaymentsCount} к оплате
          </span>
        </div>
      </div>

      {/* ЭЛЕМЕНТ 3. Единственный блок «Фокус на сегодня» */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Фокус на сегодня</h3>
          <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
            {mobileAttentionItems.length} {mobileAttentionItems.length === 1 ? 'задача' : 'задач'}
          </span>
        </div>

        <div className="p-2 space-y-2">
          {mobileAttentionItems.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 flex flex-col items-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-1" />
              <span>Все задачи выполнены!</span>
            </div>
          ) : (
            mobileAttentionItems.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (item.actionType === 'lead' && item.rawItem) {
                    actions.openLead(item.rawItem);
                  } else if (item.actionType === 'debt') {
                    router.push(item.targetId ? `/students/${item.targetId}` : '/finance');
                  }
                }}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className="min-w-0 pr-2">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded inline-block mb-0.5 ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                  <p className="text-xs font-bold text-slate-800 truncate">{item.title}</p>
                  <p className="text-[10px] text-slate-500 truncate">{item.subtitle}</p>
                </div>

                {item.waUrl ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(item.waUrl, '_blank');
                    }}
                    className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shrink-0 shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <MessageCircle size={13} /> WA
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.actionType === 'lead' && item.rawItem) {
                        actions.openLead(item.rawItem);
                      } else {
                        router.push(`/students/${item.targetId}`);
                      }
                    }}
                    className="h-8 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors shrink-0 cursor-pointer"
                  >
                    Открыть
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals & Sheets Mounted at Root */}
      <ProfileSettingsSheet
        isOpen={data.isProfileOpen}
        onClose={actions.closeProfile}
      />

      <TaskModal 
        isOpen={!!data.selectedTask}
        taskData={data.selectedTask}
        onClose={actions.closeTask}
        onComplete={actions.completeTask}
      />

      <TeacherModal 
        isOpen={!!data.selectedTeacher}
        teacherData={data.selectedTeacher}
        onClose={actions.closeTeacher}
      />

      <LeadDrawer
        isOpen={data.isLeadDrawerOpen}
        lead={data.selectedLead}
        onClose={actions.closeLead}
        onConverted={(studentId) => {
          actions.closeLead();
          actions.openStudent({ id: studentId, name: data.selectedLead?.name || 'Ученик' });
        }}
      />

      <StudentDrawer
        isOpen={data.isStudentDrawerOpen}
        studentData={data.selectedStudent}
        onClose={actions.closeStudent}
      />

      <CreateLeadModal
        isOpen={data.isCreateLeadOpen}
        onClose={actions.closeCreateLead}
        onCreated={() => {}}
      />

      <QuickActionDrawer 
        state={data.drawerState} 
        onClose={actions.closeDrawer} 
        onSuccess={(type, entityId) => {
          if (type !== 'teacher') {
            actions.setAttentionItems((prev: any[]) => prev.filter(i => i.entityId !== entityId));
          }
        }} 
      />

    </div>
  );
}
