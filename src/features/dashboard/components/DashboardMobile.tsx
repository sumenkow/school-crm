'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Users,
  UserCheck,
  BookOpen,
  User,
  MessageCircle,
  ChevronRight,
  Plus,
  Flame,
  Calendar,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { DashboardStateReturn } from '../hooks/useDashboardState';
import { MobileActionCenter } from '@/components/dashboard/MobileActionCenter';
import { ProfileSettingsSheet } from '@/components/layout/ProfileSettingsSheet';
import { TaskModal } from '@/components/dashboard/TaskModal';
import { TeacherModal } from '@/components/dashboard/TeacherModal';
import { QuickActionDrawer } from '@/components/dashboard/QuickActionDrawer';
import { CreateLeadModal } from '@/components/crm/CreateLeadModal';

interface DashboardMobileProps extends DashboardStateReturn {
  onOpenReport: () => void;
  onOpenExecutiveReport?: () => void;
}

export function DashboardMobile({ data, actions, onOpenReport }: DashboardMobileProps) {
  const router = useRouter();

  return (
    <div className="space-y-4 p-3 pb-24 w-full min-w-0">
      
      {/* Mobile Top Header Action / Title */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-100 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Smart Academy</h2>
          <p className="text-[11px] text-slate-500 font-medium">Мобильная панель управления</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={actions.openCreateLead}
            className="px-3 py-1.5 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-transform flex items-center gap-1"
          >
            <Plus size={14} /> Лид
          </button>
          <div
            onClick={actions.openProfile}
            className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
          >
            A
          </div>
        </div>
      </div>

      {/* Mobile Action Center */}
      <MobileActionCenter 
        rate={100}
        payments={[]}
        leads={[]}
        onOpenCreateLead={actions.openCreateLead}
      />

      {/* KPI Cards Horizontal Scroll or Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div 
          onClick={() => router.push('/finance')}
          className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs active:bg-slate-50 cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Выручка</span>
            <CreditCard size={14} />
          </div>
          <p className="text-lg font-black text-slate-900">1 497 €</p>
          <span className="text-[9px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">Долг: 320 €</span>
        </div>

        <div 
          onClick={() => router.push('/students')}
          className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs active:bg-slate-50 cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ученики</span>
            <Users size={14} />
          </div>
          <p className="text-lg font-black text-slate-900">48</p>
          <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">+7 новых</span>
        </div>

        <div 
          onClick={() => router.push('/crm')}
          className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs active:bg-slate-50 cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Воронка</span>
            <UserCheck size={14} />
          </div>
          <p className="text-lg font-black text-slate-900">18</p>
          <span className="text-[9px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">5 пробных</span>
        </div>

        <div 
          onClick={onOpenReport || (() => router.push('/tasks'))}
          className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs active:bg-slate-50 cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Админ</span>
            <User size={14} />
          </div>
          <p className="text-lg font-black text-slate-900">94%</p>
          <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">CSAT 4.95</span>
        </div>
      </div>

      {/* Mobile Focus List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-800">Фокус внимания</h3>
          <span className="text-[9px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">Требует реакции</span>
        </div>
        <div className="p-1.5 space-y-1">
          {data.attentionItems.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-500 font-medium">Задач нет 🎉</div>
          )}
          {data.attentionItems.map((item, i) => (
            <div
              key={i}
              onClick={() => actions.openTask(item)}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-white active:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${item.color}`}>
                  {item.label}
                </span>
                <div className="truncate">
                  <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{item.description}</p>
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-400 shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Teachers List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-800">Преподаватели</h3>
          <span className="text-[10px] text-slate-500 font-medium">{data.teachersList.length} в штате</span>
        </div>
        <div className="p-1.5 space-y-1">
          {data.teachersList.map((t, i) => (
            <div
              key={i}
              onClick={() => actions.openTeacher(t)}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">{t.name}</p>
                  <p className="text-[10px] text-slate-500">{t.role}</p>
                </div>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{t.load}</span>
            </div>
          ))}
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
