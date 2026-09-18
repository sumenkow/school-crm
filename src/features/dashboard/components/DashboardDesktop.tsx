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
  Plus
} from 'lucide-react';
import { DashboardStateReturn } from '../hooks/useDashboardState';
import { TaskModal } from '@/components/dashboard/TaskModal';
import { TeacherModal } from '@/components/dashboard/TeacherModal';
import { QuickActionDrawer, DrawerType } from '@/components/dashboard/QuickActionDrawer';
import { CreateLeadModal } from '@/components/crm/CreateLeadModal';

interface DashboardDesktopProps extends DashboardStateReturn {
  onOpenReport: () => void;
  onOpenExecutiveReport?: () => void;
}

export function DashboardDesktop({ data, actions, onOpenReport }: DashboardDesktopProps) {
  const router = useRouter();

  const CompactKpiCard = ({ title, value, icon, onClick, badges }: any) => (
    <div 
      onClick={onClick} 
      className="flex flex-col justify-between bg-white rounded-2xl border border-slate-200 p-4 shadow-xs cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-center justify-between text-slate-500">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {icon} <span className="uppercase tracking-wider">{title}</span>
        </div>
        <ChevronRight size={14} className="group-hover:text-blue-500 transition-colors" />
      </div>
      <div className="text-2xl font-bold text-slate-800 mt-3">
        {value}
      </div>
      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
        {badges.map((b: any, i: number) => (
          <span key={i} className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${b.color || 'bg-slate-100 text-slate-600'}`}>
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div className="hidden md:block space-y-6 w-full p-6">
      
      {/* 5 KPI Cards Row */}
      <div className="grid grid-cols-5 gap-4">
        <CompactKpiCard
          title="Выручка"
          value="1 497,44 €"
          icon={<CreditCard size={16} />}
          onClick={() => router.push('/finance')}
          badges={[{ label: 'План: 24%', color: 'bg-blue-100 text-blue-700' }, { label: 'Долг: 320 €', color: 'bg-rose-100 text-rose-700' }]}
        />
        <CompactKpiCard
          title="Ученики"
          value="48"
          icon={<Users size={16} />}
          onClick={() => router.push('/students')}
          badges={[{ label: '+7 новых', color: 'bg-emerald-100 text-emerald-700' }, { label: '4 на паузе' }]}
        />
        <CompactKpiCard
          title="Воронка"
          value="18"
          icon={<UserCheck size={16} />}
          onClick={() => router.push('/crm')}
          badges={[{ label: 'Конверсия 38%', color: 'bg-emerald-100 text-emerald-700' }, { label: '5 пробных' }]}
        />
        <CompactKpiCard
          title="Группы"
          value="8"
          icon={<BookOpen size={16} />}
          onClick={() => router.push('/groups')}
          badges={[{ label: '84% наполняемость', color: 'bg-blue-100 text-blue-700' }, { label: '2 набор' }]}
        />
        <CompactKpiCard
          title="Администратор"
          value="94%"
          icon={<User size={16} />}
          onClick={onOpenReport || (() => router.push('/tasks'))}
          badges={[{ label: '44/48 задач', color: 'bg-indigo-100 text-indigo-700' }, { label: 'CSAT 4.95', color: 'bg-amber-100 text-amber-700' }]}
        />
      </div>

      {/* Grid: Attention Focus (60%) & Teachers Team (40%) */}
      <div className="grid grid-cols-2 gap-6 items-start">
        
        {/* Attention Focus Block */}
        <div className="h-fit bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800">Фокус внимания</h3>
            <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full">Требует реакции</span>
          </div>
          <div className="p-2 space-y-1">
            {data.attentionItems.length === 0 && (
              <div className="flex items-center justify-center h-32 text-sm text-slate-500 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Задач нет, все отлично! 🎉
              </div>
            )}
            {data.attentionItems.map((item, i) => (
              <div 
                key={i}
                onClick={() => actions.openTask(item)}
                className="grid grid-cols-[76px_150px_1fr_auto] items-center gap-4 px-3 py-2.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-all cursor-pointer group"
              >
                {/* Col 1: Fixed Badge */}
                <div className="flex justify-center">
                  <span className={`w-full py-0.5 text-center text-[11px] font-semibold rounded-md ${item.color}`}>
                    {item.label}
                  </span>
                </div>

                {/* Col 2: Student Name */}
                <div className="font-medium text-slate-800 text-sm truncate">
                  {item.name}
                </div>

                {/* Col 3: Problem / Debt amount */}
                <div className="text-xs text-slate-500 truncate">
                  {item.description}
                </div>
                
                {/* Col 4: Quick Actions */}
                <div className="flex items-center gap-2 justify-end opacity-80 group-hover:opacity-100 transition-opacity">
                  {(item.type === 'debt' || item.type === 'churn') && (
                    <button 
                      type="button"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        window.open(`https://wa.me/${item.phone.replace(/[^0-9]/g, '')}`, '_blank');
                      }}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                      title="Написать в WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4"/>
                    </button>
                  )}

                  <button 
                    type="button"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      actions.openTask(item);
                    }}
                    className="text-xs text-blue-600 font-medium px-2 py-1 hover:bg-blue-50 rounded transition-colors flex items-center gap-1"
                  >
                    Решить <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Teachers Team Block */}
        <div className="h-fit bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 shrink-0 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Команда преподавателей</h3>
            <span className="text-xs text-slate-500 font-medium">{data.teachersList.length} преподавателя</span>
          </div>
          <div className="p-2 space-y-1">
            {data.teachersList.map((t, i) => (
              <div 
                key={i} 
                onClick={() => actions.openTeacher(t)}
                className="flex items-center justify-between px-3 py-2.5 h-[46px] hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">{t.name.charAt(0)}</div>
                   <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">{t.name}</span>
                      <span className="text-[10px] text-slate-500">{t.role} • {t.count} учеников</span>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{t.load}</span>
                  <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Modals & Drawers */}
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
