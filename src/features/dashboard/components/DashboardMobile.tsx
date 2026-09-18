'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, CreditCard, Users, UserCheck, AlertCircle, MessageCircle, Calendar } from 'lucide-react';
import { DashboardStateReturn } from '../hooks/useDashboardState';
import { ProfileSettingsSheet } from '@/components/layout/ProfileSettingsSheet';
import { TaskModal } from '@/components/dashboard/TaskModal';
import { TeacherModal } from '@/components/dashboard/TeacherModal';
import { QuickActionDrawer } from '@/components/dashboard/QuickActionDrawer';
import { CreateLeadModal } from '@/components/crm/CreateLeadModal';

interface DashboardMobileProps extends DashboardStateReturn {
  onOpenReport: () => void;
  onOpenExecutiveReport?: () => void;
}

export function DashboardMobile({ data, actions }: DashboardMobileProps) {
  const router = useRouter();

  return (
    <div className="block md:hidden w-full max-w-full overflow-x-hidden p-4 pb-24 space-y-4">
      
      {/* ЭЛЕМЕНТ 1. Единая мобильная шапка */}
      <div className="h-12 flex items-center justify-between min-w-0 w-full">
        <div className="min-w-0">
          <h2 className="font-bold text-lg text-slate-900 truncate leading-tight">Smart Academy</h2>
          <p className="text-[11px] text-slate-500 font-medium">Сентябрь 2026 • 1 € = 100 ₽</p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={actions.openCreateLead}
            className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-transform flex items-center gap-1"
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
          className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs active:bg-slate-50 cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Выручка</span>
            <CreditCard size={14} className="text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-900">220 €</p>
          <p className="text-[10px] font-semibold text-slate-500">план 6 000 €</p>
        </div>

        {/* Карточка 2: Ученики */}
        <div 
          onClick={() => router.push('/students')}
          className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs active:bg-slate-50 cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ученики</span>
            <Users size={14} className="text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-900">48</p>
          <span className="inline-block text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
            +7 новых
          </span>
        </div>

        {/* Карточка 3: Лиды в работе */}
        <div 
          onClick={() => router.push('/crm')}
          className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs active:bg-slate-50 cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Лиды в работе</span>
            <UserCheck size={14} className="text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-900">18</p>
          <span className="inline-block text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-md">
            5 на пробный
          </span>
        </div>

        {/* Карточка 4: Долги */}
        <div 
          onClick={() => router.push('/finance')}
          className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs active:bg-slate-50 cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Долги</span>
            <AlertCircle size={14} className="text-rose-400" />
          </div>
          <p className="text-xl font-black text-rose-600">296 €</p>
          <span className="inline-block text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md">
            3 ученика
          </span>
        </div>
      </div>

      {/* ЭЛЕМЕНТ 3. Единственный блок «Фокус на сегодня» */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Фокус на сегодня</h3>
          <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
            3 задачи
          </span>
        </div>

        <div className="p-2 space-y-2">
          
          {/* Задача 1: Пробный урок */}
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
            <div className="min-w-0 pr-2">
              <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded inline-block mb-0.5">
                Пробный урок
              </span>
              <p className="text-xs font-bold text-slate-800 truncate">Даниил Морозов</p>
              <p className="text-[10px] text-slate-500">Завтра в 16:00 • Робототехника</p>
            </div>
            <button
              type="button"
              onClick={() => actions.openDrawer('trial', '1', { name: 'Даниил Морозов', phone: '+79991112233' })}
              className="h-8 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition-colors shrink-0 shadow-2xs"
            >
              Урок
            </button>
          </div>

          {/* Задача 2: Новый лид */}
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
            <div className="min-w-0 pr-2">
              <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded inline-block mb-0.5">
                Новый лид
              </span>
              <p className="text-xs font-bold text-slate-800 truncate">Ольга</p>
              <p className="text-[10px] text-slate-500">Ждет звонка / Английский B1</p>
            </div>
            <button
              type="button"
              onClick={() => window.open('https://wa.me/79992223344', '_blank')}
              className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shrink-0 shadow-2xs flex items-center gap-1"
            >
              <MessageCircle size={13} /> WhatsApp
            </button>
          </div>

          {/* Задача 3: Долг по оплате */}
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
            <div className="min-w-0 pr-2">
              <span className="text-[9px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded inline-block mb-0.5">
                Долг по оплате
              </span>
              <p className="text-xs font-bold text-slate-800 truncate">Артем Васильев</p>
              <p className="text-[10px] text-slate-500">Просрочка 150 € • Абонемент</p>
            </div>
            <button
              type="button"
              onClick={() => window.open('https://wa.me/79993334455', '_blank')}
              className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shrink-0 shadow-2xs flex items-center gap-1"
            >
              <MessageCircle size={13} /> Напомнить
            </button>
          </div>

        </div>
      </div>

      {/* Modals & Sheets */}
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
