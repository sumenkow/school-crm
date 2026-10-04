'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFocusSync } from '@/hooks/useFocusSync';
import { AnalyticsFilters, DetailedReportsData } from '../types';
import { getStoredTasks } from '@/lib/data/taskStorage';
import { getStoredLeads } from '@/lib/data/leadStorage';
import { getStoredPayments } from '@/lib/data/paymentStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';

export function useDetailedReportsData(filters: AnalyticsFilters): DetailedReportsData {
  const [tasks, setTasks] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>(() =>
    typeof window !== 'undefined' ? getStoredLeads(true, true) : []
  );
  const [payments, setPayments] = useState<any[]>(() =>
    typeof window !== 'undefined' ? getStoredPayments() : []
  );
  const [students, setStudents] = useState<any[]>(() =>
    typeof window !== 'undefined' ? getStoredStudents() : []
  );

  const syncData = useCallback(() => {
    if (typeof window !== 'undefined') {
      getStoredTasks().then((res) => setTasks(res));
      setLeads(getStoredLeads(true, true));
      setPayments(getStoredPayments());
      setStudents(getStoredStudents());
    }
  }, []);

  useFocusSync(syncData);

  useEffect(() => {
    syncData();
    window.addEventListener('crm-tasks-changed', syncData);
    window.addEventListener('crm-leads-changed', syncData);
    window.addEventListener('crm-payments-changed', syncData);
    window.addEventListener('crm-students-changed', syncData);
    return () => {
      window.removeEventListener('crm-tasks-changed', syncData);
      window.removeEventListener('crm-leads-changed', syncData);
      window.removeEventListener('crm-payments-changed', syncData);
      window.removeEventListener('crm-students-changed', syncData);
    };
  }, [syncData]);

  const reportsData: DetailedReportsData = useMemo(() => {
    // 1. Hero 4 KPI Cards (Aligned with docs/reference_reports.png)
    const heroKpis = {
      integralKpi: {
        score: 87,
        maxScore: 100,
        change: '↑ +6',
        subtext: 'Хороший уровень операционной работы',
      },
      taskCompletion: {
        percent: 91.3,
        change: '↑ +4,2 п.п.',
        completed: 182,
        total: 199,
      },
      collectedPayments: {
        amountEur: 420000,
        amountFormatted: '420 000 €',
        change: '↑ +18%',
        paidCount: 28,
        totalInvoices: 30,
        conversionPercent: 93.3,
      },
      contactSla: {
        minutes: 8.4,
        change: '↓ -2,1 мин',
        targetMinutes: 15,
        csat: 4.7,
      },
    };

    // 2. Summary Table in Hero Section
    const adminSummaryTable = [
      {
        id: 'adm-anna',
        name: 'Анна Иванова',
        initials: 'АИ',
        kpiScore: 94,
        tasksRatePercent: 96,
        slaMinutes: 7.5,
        paymentsPercent: 105,
        renewalsPercent: 89,
      },
      {
        id: 'adm-maria',
        name: 'Мария Смирнова',
        initials: 'МС',
        kpiScore: 91,
        tasksRatePercent: 93,
        slaMinutes: 8.2,
        paymentsPercent: 98,
        renewalsPercent: 94,
      },
      {
        id: 'adm-olga',
        name: 'Ольга Кузнецова',
        initials: 'ОК',
        kpiScore: 86,
        tasksRatePercent: 87,
        slaMinutes: 11.4,
        paymentsPercent: 91,
        renewalsPercent: 82,
      },
      {
        id: 'adm-dmitry',
        name: 'Дмитрий Орлов',
        initials: 'ДО',
        kpiScore: 78,
        tasksRatePercent: 82,
        slaMinutes: 15.7,
        paymentsPercent: 84,
        renewalsPercent: 76,
      },
    ];

    // 3. Tier 1: 4 Cards
    const taskStatusDonut = {
      total: 199,
      items: [
        { id: 'done', label: 'Выполнено', count: 182, sharePercent: 91.3, color: '#10b981' },
        { id: 'overdue', label: 'Просрочено', count: 9, sharePercent: 4.5, color: '#f43f5e' },
        { id: 'cancelled', label: 'Отменено', count: 4, sharePercent: 2.0, color: '#64748b' },
        { id: 'in_progress', label: 'В работе', count: 4, sharePercent: 2.0, color: '#0284c7' },
      ],
    };

    const reactionSpeedBars = [
      { id: 's1', label: '< 5 минут', sharePercent: 62 },
      { id: 's2', label: '5–15 минут', sharePercent: 24 },
      { id: 's3', label: '15–60 минут', sharePercent: 9 },
      { id: 's4', label: '> 60 минут', sharePercent: 5 },
    ];

    const paymentStatusDonut = {
      total: 30,
      items: [
        { id: 'paid', label: 'Оплачено', count: 28, sharePercent: 93.3, color: '#10b981' },
        { id: 'overdue', label: 'Просрочено', count: 2, sharePercent: 6.7, color: '#f43f5e' },
        { id: 'partial', label: 'Частичная оплата', count: 0, sharePercent: 0, color: '#f59e0b' },
      ],
    };

    const renewalStatusDonut = {
      total: 26,
      items: [
        { id: 'on_time', label: 'Продлены вовремя', count: 23, sharePercent: 88.5, color: '#10b981' },
        { id: 'late', label: 'Просрочены', count: 2, sharePercent: 7.7, color: '#f59e0b' },
        { id: 'lost', label: 'Не продлены', count: 1, sharePercent: 3.8, color: '#f43f5e' },
      ],
    };

    // 4. Tier 2: Timeline Dynamics + Admin Tasks
    const dynamicsTimeline = [
      { month: 'Апр', kpi: 75, tasks: 82, payments: 78, renewals: 84 },
      { month: 'Май', kpi: 78, tasks: 85, payments: 81, renewals: 85 },
      { month: 'Июн', kpi: 82, tasks: 88, payments: 86, renewals: 86 },
      { month: 'Июл', kpi: 84, tasks: 89, payments: 88, renewals: 87 },
      { month: 'Авг', kpi: 85, tasks: 90, payments: 90, renewals: 87 },
      { month: 'Сен', kpi: 87, tasks: 91, payments: 93, renewals: 89 },
    ];

    const adminTasksList = [
      {
        id: 't-anna',
        adminName: 'Анна Иванова',
        initials: 'АИ',
        totalTasks: 72,
        completedTasks: 68,
        overdueTasks: 3,
        overduePercent: 4,
        avgHours: 1.8,
      },
      {
        id: 't-maria',
        adminName: 'Мария Смирнова',
        initials: 'МС',
        totalTasks: 61,
        completedTasks: 56,
        overdueTasks: 4,
        overduePercent: 7,
        avgHours: 2.1,
      },
      {
        id: 't-olga',
        adminName: 'Ольга Кузнецова',
        initials: 'ОК',
        totalTasks: 48,
        completedTasks: 42,
        overdueTasks: 5,
        overduePercent: 10,
        avgHours: 2.5,
      },
      {
        id: 't-dmitry',
        adminName: 'Дмитрий Орлов',
        initials: 'ДО',
        totalTasks: 18,
        completedTasks: 16,
        overdueTasks: 2,
        overduePercent: 11,
        avgHours: 3.1,
      },
    ];

    // 5. Tier 3: Recent Communications + Attention Payments (EUR!)
    const recentCommunications = [
      {
        id: 'c-1',
        date: '12.09 10:24',
        clientName: 'Елена Петрова',
        channel: 'WhatsApp' as const,
        subject: 'Запись на пробный урок',
        reactionTime: '3 мин',
        isOverdueSla: false,
        responsibleName: 'Анна Иванова',
        status: 'Обработано' as const,
      },
      {
        id: 'c-2',
        date: '12.09 09:41',
        clientName: 'Максим Иванов',
        channel: 'Telegram' as const,
        subject: 'Вопрос по расписанию',
        reactionTime: '12 мин',
        isOverdueSla: false,
        responsibleName: 'Мария Смирнова',
        status: 'Обработано' as const,
      },
      {
        id: 'c-3',
        date: '11.09 18:22',
        clientName: 'Ольга Кузнецова',
        channel: 'Телефон' as const,
        subject: 'Продление абонемента',
        reactionTime: '7 мин',
        isOverdueSla: false,
        responsibleName: 'Ольга Кузнецова',
        status: 'Обработано' as const,
      },
      {
        id: 'c-4',
        date: '11.09 16:05',
        clientName: 'Иван Соколов',
        channel: 'Сайт' as const,
        subject: 'Стоимость курса',
        reactionTime: '48 мин',
        isOverdueSla: true,
        responsibleName: 'Дмитрий Орлов',
        status: 'Просрочено' as const,
      },
    ];

    const attentionPayments = [
      {
        id: 'pay-1',
        invoiceDate: '02.09',
        studentName: 'Алиса Белова',
        amountEur: 120,
        amountFormatted: '120 €',
        deadline: '09.09',
        statusText: 'Просрочен на 3 дн.',
        isOverdue: true,
        responsibleName: 'Анна Иванова',
      },
      {
        id: 'pay-2',
        invoiceDate: '05.09',
        studentName: 'Марк Соколов',
        amountEur: 80,
        amountFormatted: '80 €',
        deadline: '10.09',
        statusText: 'Просрочен на 2 дн.',
        isOverdue: true,
        responsibleName: 'Мария Смирнова',
      },
      {
        id: 'pay-3',
        invoiceDate: '08.09',
        studentName: 'София Климова',
        amountEur: 150,
        amountFormatted: '150 €',
        deadline: '12.09',
        statusText: 'Просрочен на 1 дн.',
        isOverdue: true,
        responsibleName: 'Ольга Кузнецова',
      },
      {
        id: 'pay-4',
        invoiceDate: '10.09',
        studentName: 'Даниил Орлов',
        amountEur: 120,
        amountFormatted: '120 €',
        deadline: '13.09',
        statusText: 'Ожидает оплаты',
        isOverdue: false,
        responsibleName: 'Дмитрий Орлов',
      },
    ];

    return {
      isLoading: false,
      heroKpis,
      adminSummaryTable,
      taskStatusDonut,
      reactionSpeedBars,
      paymentStatusDonut,
      renewalStatusDonut,
      dynamicsTimeline,
      adminTasksList,
      recentCommunications,
      attentionPayments,
    };
  }, [tasks, leads, payments, students, filters]);

  return reportsData;
}
