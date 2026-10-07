'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { FullTaskData, FullLeadData, FullLessonData, FullStudentData, FullPaymentData } from '@/lib/data/mockData';
import { getStoredTasks } from '@/lib/data/taskStorage';
import { getStoredLeads } from '@/lib/data/leadStorage';
import { getStoredLessons } from '@/lib/data/lessonStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { getStoredPayments } from '@/lib/data/paymentStorage';
import { getStoredInvoices, EuropeanInvoiceData } from '@/lib/data/invoiceStorage';
import { getUpcomingPayments, UpcomingPaymentItem } from '@/lib/data/upcomingPaymentsHelper';
import { updateUnifiedTaskStatus } from '@/lib/data/taskManager';
import {
  aggregateCockpitData,
  CockpitActionItem,
  CockpitAggregatedData,
} from '../lib/cockpitPriorityEngine';

export function useCockpitSSOT() {
  const [tasks, setTasks] = useState<FullTaskData[]>([]);
  const [leads, setLeads] = useState<FullLeadData[]>([]);
  const [lessons, setLessons] = useState<FullLessonData[]>([]);
  const [students, setStudents] = useState<FullStudentData[]>([]);
  const [payments, setPayments] = useState<FullPaymentData[]>([]);
  const [invoices, setInvoices] = useState<EuropeanInvoiceData[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPaymentItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  // Active item opened in Slide-over Drawer
  const [activeDrawerItem, setActiveDrawerItem] = useState<CockpitActionItem | null>(null);

  // Load all SSOT records
  const refreshData = useCallback(async () => {
    try {
      const [allTasks, allLeads, allLessons, allStudents, allPayments, allUpcoming, allInvoices] = await Promise.all([
        getStoredTasks(),
        Promise.resolve(getStoredLeads(true, true)),
        Promise.resolve(getStoredLessons()),
        Promise.resolve(getStoredStudents()),
        Promise.resolve(getStoredPayments()),
        Promise.resolve(getUpcomingPayments()),
        Promise.resolve(getStoredInvoices()),
      ]);

      setTasks(allTasks);
      setLeads(allLeads);
      setLessons(allLessons);
      setStudents(allStudents);
      setPayments(allPayments);
      setUpcomingPayments(allUpcoming);
      setInvoices(allInvoices);
    } catch (err) {
      console.error('Error fetching Cockpit SSOT data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync on mount and subscribe to CRM change events
  useEffect(() => {
    refreshData();

    const handleDataChange = () => {
      refreshData();
    };

    window.addEventListener('crm-tasks-changed', handleDataChange);
    window.addEventListener('crm-leads-changed', handleDataChange);
    window.addEventListener('crm-lessons-changed', handleDataChange);
    window.addEventListener('crm-students-changed', handleDataChange);
    window.addEventListener('crm-payments-changed', handleDataChange);
    window.addEventListener('crm-invoices-changed', handleDataChange);
    window.addEventListener('focus', handleDataChange);

    return () => {
      window.removeEventListener('crm-tasks-changed', handleDataChange);
      window.removeEventListener('crm-leads-changed', handleDataChange);
      window.removeEventListener('crm-lessons-changed', handleDataChange);
      window.removeEventListener('crm-students-changed', handleDataChange);
      window.removeEventListener('crm-payments-changed', handleDataChange);
      window.removeEventListener('crm-invoices-changed', handleDataChange);
      window.removeEventListener('focus', handleDataChange);
    };
  }, [refreshData]);

  // Aggregate queues via Priority Engine with useMemo (Anti-freeze protection)
  const aggregated: CockpitAggregatedData = useMemo(() => {
    return aggregateCockpitData({
      tasks,
      leads,
      lessons,
      students,
      payments,
      invoices,
      upcomingPayments,
      selectedDate,
    });
  }, [tasks, leads, lessons, students, payments, invoices, upcomingPayments, selectedDate]);

  // Action: Complete task inline with immediate optimistic removal & SSOT persistence
  const completeTask = useCallback(async (taskId: string) => {
    // Optimistically update tasks list
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'done', completedAt: new Date().toISOString() } : t))
    );

    if (activeDrawerItem?.sourceId === taskId) {
      setActiveDrawerItem(null);
    }

    try {
      await updateUnifiedTaskStatus(taskId, 'done', {
        performedBy: 'Администратор',
        comment: 'Выполнено из операционного стола «Мой день»',
      });
    } catch (err) {
      console.error('Failed to complete task in SSOT:', err);
      // Revert if failed
      refreshData();
    }
  }, [activeDrawerItem, refreshData]);

  // Action: Postpone task in 1-click
  const postponeTask = useCallback(async (taskId: string, targetDateIso: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, dueDate: targetDateIso } : t))
    );

    if (activeDrawerItem?.sourceId === taskId) {
      setActiveDrawerItem(null);
    }

    try {
      await updateUnifiedTaskStatus(taskId, 'in_progress', {
        newDueDate: targetDateIso,
        comment: `Перенесено на ${targetDateIso} из операционного стола`,
        performedBy: 'Администратор',
      });
    } catch (err) {
      console.error('Failed to postpone task in SSOT:', err);
      refreshData();
    }
  }, [activeDrawerItem, refreshData]);

  return {
    isLoading,
    aggregated,
    selectedDate,
    setSelectedDate,
    activeDrawerItem,
    setActiveDrawerItem,
    completeTask,
    postponeTask,
    refreshData,
    raw: {
      tasks,
      leads,
      lessons,
      students,
      payments,
      invoices,
    },
  };
}
