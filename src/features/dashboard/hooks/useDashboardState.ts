'use client';

import { useState, useEffect, useCallback } from 'react';
import { DrawerState, DrawerType } from '@/components/dashboard/QuickActionDrawer';
import { createClient } from '@/lib/supabase/client';
import {
  FullLeadData,
  FullStudentData,
  FullGroupData,
  FullPaymentData,
  FullLessonData,
  FullTaskData,
  FullTeacherData,
  INITIAL_STUDENTS,
  INITIAL_LEADS,
  INITIAL_GROUPS,
  INITIAL_PAYMENTS,
  INITIAL_LESSONS,
  INITIAL_TASKS,
  INITIAL_TEACHERS
} from '@/lib/data/mockData';
import { getStoredPayments } from '@/lib/data/paymentStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { getStoredLeads } from '@/lib/data/leadStorage';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { getStoredLessons } from '@/lib/data/lessonStorage';
import { getStoredTasks } from '@/lib/data/taskStorage';
import { useFocusSync } from '@/hooks/useFocusSync';

export function useDashboardState() {
  const [isLoading, setIsLoading] = useState(false);

  // Entities state
  const [payments, setPayments] = useState<FullPaymentData[]>(() => {
    return typeof window !== 'undefined' ? getStoredPayments() : INITIAL_PAYMENTS;
  });

  const [students, setStudents] = useState<FullStudentData[]>(() => {
    return typeof window !== 'undefined' ? getStoredStudents() : INITIAL_STUDENTS;
  });

  const [leads, setLeads] = useState<FullLeadData[]>(() => {
    return typeof window !== 'undefined' ? getStoredLeads(true, true) : INITIAL_LEADS;
  });

  const [groups, setGroups] = useState<FullGroupData[]>(() => {
    return typeof window !== 'undefined' ? getStoredGroups() : INITIAL_GROUPS;
  });

  const [lessons, setLessons] = useState<FullLessonData[]>(() => {
    return typeof window !== 'undefined' ? getStoredLessons() : INITIAL_LESSONS;
  });

  const [tasks, setTasks] = useState<FullTaskData[]>(INITIAL_TASKS);
  const [teachers, setTeachers] = useState<FullTeacherData[]>(INITIAL_TEACHERS);
  const [attentionItems, setAttentionItems] = useState<any[]>([]);

  // Selected date / month for dashboard metrics
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  // Modals & Drawers selection state
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<FullTeacherData | null>(null);
  const [selectedLead, setSelectedLead] = useState<FullLeadData | null>(null);
  const [isLeadDrawerOpen, setIsLeadDrawerOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isStudentDrawerOpen, setIsStudentDrawerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<FullLessonData | null>(null);

  const [drawerState, setDrawerState] = useState<DrawerState>({ isOpen: false, type: null, entityId: null });

  // Refresh all entities from storage
  const refreshAll = useCallback(() => {
    setPayments(getStoredPayments());
    setStudents(getStoredStudents());
    setLeads(getStoredLeads(true, true));
    setGroups(getStoredGroups());
    setLessons(getStoredLessons());
    getStoredTasks().then(res => {
      if (Array.isArray(res)) setTasks(res);
    }).catch(() => {});
  }, []);

  useFocusSync(refreshAll);

  // Realtime Supabase Subscription & Custom Event Listeners
  useEffect(() => {
    refreshAll();

    const handleStorageChange = () => {
      refreshAll();
    };

    window.addEventListener('crm-tasks-changed', handleStorageChange);
    window.addEventListener('crm-payments-changed', handleStorageChange);
    window.addEventListener('crm-leads-changed', handleStorageChange);
    window.addEventListener('crm-students-changed', handleStorageChange);
    window.addEventListener('crm-groups-changed', handleStorageChange);
    window.addEventListener('crm-lessons-changed', handleStorageChange);

    let channel: any;
    try {
      const supabase = createClient();
      channel = supabase
        .channel('dashboard-realtime-sync')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
          refreshAll();
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription error:', e);
    }

    return () => {
      window.removeEventListener('crm-tasks-changed', handleStorageChange);
      window.removeEventListener('crm-payments-changed', handleStorageChange);
      window.removeEventListener('crm-leads-changed', handleStorageChange);
      window.removeEventListener('crm-students-changed', handleStorageChange);
      window.removeEventListener('crm-groups-changed', handleStorageChange);
      window.removeEventListener('crm-lessons-changed', handleStorageChange);

      if (channel) {
        try {
          const supabase = createClient();
          supabase.removeChannel(channel);
        } catch (e) {}
      }
    };
  }, [refreshAll]);

  const openDrawer = (type: DrawerType, entityId: string, initialData?: any) => setDrawerState({ isOpen: true, type, entityId, initialData });
  const closeDrawer = () => setDrawerState(prev => ({ ...prev, isOpen: false }));

  const openTask = (item: any) => setSelectedTask(item);
  const closeTask = () => setSelectedTask(null);
  const completeTask = (taskId: string) => {
    setSelectedTask(null);
    refreshAll();
  };

  const openTeacher = (t: FullTeacherData) => setSelectedTeacher(t);
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

  const openLesson = (lesson: FullLessonData) => setSelectedLesson(lesson);
  const closeLesson = () => setSelectedLesson(null);

  const prevMonth = useCallback(() => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const nextMonth = useCallback(() => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const resetMonth = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  return {
    data: {
      payments,
      students,
      leads,
      groups,
      lessons,
      tasks,
      teachers,
      isLoading,
      selectedDate,
      selectedTask,
      selectedTeacher,
      selectedLead,
      selectedStudent,
      selectedPayment,
      selectedLesson,
      drawerState,
      isCreateLeadOpen,
      isLeadDrawerOpen,
      isStudentDrawerOpen,
      isProfileOpen,
      attentionItems,
      teachersList: teachers,
    },
    actions: {
      refreshAll,
      prevMonth,
      nextMonth,
      resetMonth,
      setSelectedDate,
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
      openLesson,
      closeLesson,
      setAttentionItems,
      setSelectedPayment,
    },
  };
}

export type DashboardStateReturn = ReturnType<typeof useDashboardState>;
