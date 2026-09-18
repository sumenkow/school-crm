'use client';

import { useState, useEffect } from 'react';
import { DrawerState, DrawerType } from '@/components/dashboard/QuickActionDrawer';
import { createClient } from '@/lib/supabase/client';
import { FullLeadData } from '@/lib/data/mockData';

export function useDashboardState() {
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);
  const [selectedLead, setSelectedLead] = useState<FullLeadData | null>(null);
  const [isLeadDrawerOpen, setIsLeadDrawerOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isStudentDrawerOpen, setIsStudentDrawerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [drawerState, setDrawerState] = useState<DrawerState>({ isOpen: false, type: null, entityId: null });

  const [attentionItems, setAttentionItems] = useState([
    { entityType: 'payment', entityId: '1', type: 'debt', label: 'Долг', name: 'Иванов Иван', description: 'Просрочка 150 €', color: 'bg-rose-50 text-rose-700 border border-rose-200', phone: '+123456789' },
    { entityType: 'lead', entityId: '2', type: 'trial', label: 'Пробный', name: 'Мария Смирнова', description: 'Ждет назначения', color: 'bg-purple-50 text-purple-700 border border-purple-200', phone: '+123456789' },
    { entityType: 'student', entityId: '3', type: 'churn', label: 'Отток', name: 'Алексей Попов', description: 'Не выходит на связь', color: 'bg-amber-50 text-amber-700 border border-amber-200', phone: '+123456789' },
    { entityType: 'payment', entityId: '4', type: 'debt', label: 'Долг', name: 'Елена Васильева', description: 'Частичная оплата', color: 'bg-rose-50 text-rose-700 border border-rose-200', phone: '+123456789' },
    { entityType: 'lead', entityId: '5', type: 'trial', label: 'Пробный', name: 'Дмитрий Соколов', description: 'Завтра 14:00', color: 'bg-purple-50 text-purple-700 border border-purple-200', phone: '+123456789' },
  ]);

  const [teachersList, setTeachersList] = useState([
    { id: 't1', name: 'Мария Иванова', role: 'Английский', load: '92%', count: 18 },
    { id: 't2', name: 'Дмитрий Соколов', role: 'Робототехника', load: '85%', count: 14 },
    { id: 't3', name: 'Елена Васильева', role: 'Математика', load: '78%', count: 11 },
    { id: 't4', name: 'Сергей Петров', role: 'Программирование', load: '65%', count: 8 },
  ]);

  // Realtime Supabase Subscription & Custom Event Listeners
  useEffect(() => {
    const handleStorageChange = (e: any) => {
      if (e?.detail?.id) {
        setAttentionItems(prev => prev.filter(i => i.entityId !== e.detail.id));
      }
    };
    window.addEventListener('crm-tasks-changed', handleStorageChange);
    window.addEventListener('crm-payments-changed', handleStorageChange);
    window.addEventListener('crm-leads-changed', handleStorageChange);

    let channel: any;
    try {
      const supabase = createClient();
      channel = supabase
        .channel('dashboard-realtime-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public' },
          (payload) => {
            if (payload.new && (payload.new as any).id) {
              const updatedId = (payload.new as any).id;
              setAttentionItems(prev => prev.filter(i => i.entityId !== updatedId));
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription error:', e);
    }

    return () => {
      window.removeEventListener('crm-tasks-changed', handleStorageChange);
      window.removeEventListener('crm-payments-changed', handleStorageChange);
      window.removeEventListener('crm-leads-changed', handleStorageChange);
      if (channel) {
        try {
          const supabase = createClient();
          supabase.removeChannel(channel);
        } catch (e) {}
      }
    };
  }, []);

  const openDrawer = (type: DrawerType, entityId: string, initialData?: any) => setDrawerState({ isOpen: true, type, entityId, initialData });
  const closeDrawer = () => setDrawerState(prev => ({ ...prev, isOpen: false }));

  const openTask = (item: any) => setSelectedTask(item);
  const closeTask = () => setSelectedTask(null);
  const completeTask = (taskId: string) => {
    setAttentionItems(prev => prev.filter(item => item.entityId !== taskId));
    setSelectedTask(null);
  };

  const openTeacher = (t: any) => setSelectedTeacher(t);
  const closeTeacher = () => setSelectedTeacher(null);

  const openLead = (lead: FullLeadData) => {
    setSelectedLead(lead);
    setIsLeadDrawerOpen(true);
  };
  const closeLead = () => {
    setIsLeadDrawerOpen(false);
    setSelectedLead(null);
  };

  const openStudent = (student: any) => {
    setSelectedStudent(student);
    setIsStudentDrawerOpen(true);
  };
  const closeStudent = () => {
    setIsStudentDrawerOpen(false);
    setSelectedStudent(null);
  };

  const openCreateLead = () => setIsCreateLeadOpen(true);
  const closeCreateLead = () => setIsCreateLeadOpen(false);

  const openProfile = () => setIsProfileOpen(true);
  const closeProfile = () => setIsProfileOpen(false);

  return {
    data: {
      attentionItems,
      teachersList,
      selectedTask,
      selectedTeacher,
      selectedLead,
      selectedStudent,
      selectedPayment,
      drawerState,
      isCreateLeadOpen,
      isLeadDrawerOpen,
      isStudentDrawerOpen,
      isProfileOpen,
    },
    actions: {
      openDrawer,
      closeDrawer,
      openTask,
      closeTask,
      completeTask,
      openTeacher,
      closeTeacher,
      openLead,
      closeLead,
      openStudent,
      closeStudent,
      openCreateLead,
      closeCreateLead,
      openProfile,
      closeProfile,
      setAttentionItems,
      setSelectedPayment,
    },
  };
}

export type DashboardStateReturn = ReturnType<typeof useDashboardState>;
