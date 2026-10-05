'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFocusSync } from '@/hooks/useFocusSync';
import { AnalyticsFilters, FinanceTabData } from '../types';
import { getStoredPayments } from '@/lib/data/paymentStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { getStoredInvoices } from '@/lib/data/invoiceStorage';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { getEurRubRate, convertRubToEur } from '@/lib/data/currencyHelper';

export function formatEur(amount: number): string {
  const rounded = Math.round(amount);
  const formatted = rounded.toLocaleString('ru-RU').replace(/\s/g, '\u00A0');
  return `€\u00A0${formatted}`;
}

export function useFinanceTabData(filters: AnalyticsFilters): FinanceTabData {
  const [payments, setPayments] = useState(() =>
    typeof window !== 'undefined' ? getStoredPayments() : []
  );
  const [students, setStudents] = useState(() =>
    typeof window !== 'undefined' ? getStoredStudents() : []
  );
  const [invoices, setInvoices] = useState(() =>
    typeof window !== 'undefined' ? getStoredInvoices() : []
  );
  const [groups, setGroups] = useState(() =>
    typeof window !== 'undefined' ? getStoredGroups() : []
  );

  const syncData = useCallback(() => {
    setPayments(getStoredPayments());
    setStudents(getStoredStudents());
    setInvoices(getStoredInvoices());
    setGroups(getStoredGroups());
  }, []);

  useFocusSync(syncData);

  useEffect(() => {
    syncData();
    window.addEventListener('crm-payments-changed', syncData);
    window.addEventListener('crm-students-changed', syncData);
    window.addEventListener('crm-invoices-changed', syncData);
    return () => {
      window.removeEventListener('crm-payments-changed', syncData);
      window.removeEventListener('crm-students-changed', syncData);
      window.removeEventListener('crm-invoices-changed', syncData);
    };
  }, [syncData]);

  const financeData: FinanceTabData = useMemo(() => {
    const rate = getEurRubRate();

    // 1. Filtered payments by course/teacher if selected
    const filteredPayments = payments.filter((p) => {
      if (filters.subjectId && filters.subjectId !== 'all') {
        if (!p.courseName.toLowerCase().includes(filters.subjectId.toLowerCase())) {
          return false;
        }
      }
      return true;
    });

    // Count paid and overdue
    const paidList = filteredPayments.filter((p) => p.status === 'paid');
    const overdueList = filteredPayments.filter((p) => p.status === 'overdue');

    // Aggregate paid amounts in EUR
    const rawPaidEur = paidList.reduce((sum, p) => {
      const val = p.currency === 'EUR' ? p.amount : convertRubToEur(p.amount, rate);
      return sum + val;
    }, 0);

    const totalOverdueEur = overdueList.reduce((sum, p) => {
      const val = p.currency === 'EUR' ? p.amount : convertRubToEur(p.amount, rate);
      return sum + val;
    }, 0);

    const expectedList = filteredPayments.filter((p) => p.status === 'expected');
    const totalExpectedEur = expectedList.reduce((sum, p) => {
      const val = p.currency === 'EUR' ? p.amount : convertRubToEur(p.amount, rate);
      return sum + val;
    }, 0);

    const baseRevenue = rawPaidEur;
    const baseCollected = rawPaidEur;
    const baseDebt = totalOverdueEur + totalExpectedEur;
    const baseAvgCheck = paidList.length > 0 ? Math.round(rawPaidEur / paidList.length) : 0;
    const baseLtv = students.length > 0 ? Math.round(rawPaidEur / students.length) : 0;
    const baseOverdueDebt = totalOverdueEur;

    // Previous period values for delta calculations
    const prevRevenue = 0;
    const prevCollected = 0;
    const prevDebt = 0;
    const prevAvgCheck = 0;
    const prevLtv = 0;
    const prevOverdueDebt = 0;

    // Delas
    const calcDelta = (curr: number, prev: number) => {
      if (!prev) return '+0%';
      const pct = ((curr - prev) / prev) * 100;
      const sign = pct >= 0 ? '↑ +' : '↓ ';
      return `${sign}${Math.abs(pct).toFixed(1).replace('.', ',')}%`;
    };

    // 2. Top 6 KPI Cards
    const kpis = [
      {
        id: 'revenue',
        label: 'Выручка',
        value: formatEur(baseRevenue),
        change: calcDelta(baseRevenue, prevRevenue),
        isPositive: baseRevenue >= prevRevenue,
        previousValue: `Было: ${formatEur(prevRevenue)}`,
        iconType: 'revenue' as const,
      },
      {
        id: 'paid',
        label: 'Оплачено',
        value: formatEur(baseCollected),
        change: calcDelta(baseCollected, prevCollected),
        isPositive: baseCollected >= prevCollected,
        previousValue: `Было: ${formatEur(prevCollected)}`,
        iconType: 'paid' as const,
      },
      {
        id: 'debt',
        label: 'Задолженность',
        value: formatEur(baseDebt),
        change: calcDelta(baseDebt, prevDebt),
        isPositive: baseDebt < prevDebt, // Growing debt is negative
        previousValue: `Было: ${formatEur(prevDebt)}`,
        iconType: 'debt' as const,
      },
      {
        id: 'avg_check',
        label: 'Средний чек',
        value: formatEur(baseAvgCheck),
        change: calcDelta(baseAvgCheck, prevAvgCheck),
        isPositive: baseAvgCheck >= prevAvgCheck,
        previousValue: `Было: ${formatEur(prevAvgCheck)}`,
        iconType: 'avg_check' as const,
      },
      {
        id: 'ltv',
        label: 'LTV (средний)',
        value: formatEur(baseLtv),
        change: calcDelta(baseLtv, prevLtv),
        isPositive: baseLtv >= prevLtv,
        previousValue: `Было: ${formatEur(prevLtv)}`,
        iconType: 'ltv' as const,
      },
      {
        id: 'overdue',
        label: 'Просрочено',
        value: formatEur(baseOverdueDebt),
        change: calcDelta(baseOverdueDebt, prevOverdueDebt),
        isPositive: baseOverdueDebt < prevOverdueDebt, // Growing overdue is negative
        previousValue: `Было: ${formatEur(prevOverdueDebt)}`,
        iconType: 'overdue' as const,
      },
    ];

    // 3. Monthly accruals & chart table (6 months)
    const monthlyAccruals = [
      {
        month: 'Апрель 2026',
        accruedEur: 34200,
        accruedFormatted: formatEur(34200),
        paidEur: 31600,
        paidFormatted: formatEur(31600),
        debtEur: 7400,
        debtFormatted: formatEur(7400),
        trendFormatted: '↑ +5,2%',
        isPositiveTrend: true,
      },
      {
        month: 'Май 2026',
        accruedEur: 31800,
        accruedFormatted: formatEur(31800),
        paidEur: 28900,
        paidFormatted: formatEur(28900),
        debtEur: 8100,
        debtFormatted: formatEur(8100),
        trendFormatted: '↓ -8,1%',
        isPositiveTrend: false,
      },
      {
        month: 'Июнь 2026',
        accruedEur: 36450,
        accruedFormatted: formatEur(36450),
        paidEur: 32200,
        paidFormatted: formatEur(32200),
        debtEur: 9650,
        debtFormatted: formatEur(9650),
        trendFormatted: '↑ +14,6%',
        isPositiveTrend: true,
      },
      {
        month: 'Июль 2026',
        accruedEur: 38100,
        accruedFormatted: formatEur(38100),
        paidEur: 33870,
        paidFormatted: formatEur(33870),
        debtEur: 7920,
        debtFormatted: formatEur(7920),
        trendFormatted: '↑ +4,9%',
        isPositiveTrend: true,
      },
      {
        month: 'Август 2026',
        accruedEur: 35620,
        accruedFormatted: formatEur(35620),
        paidEur: 30120,
        paidFormatted: formatEur(30120),
        debtEur: 6920,
        debtFormatted: formatEur(6920),
        trendFormatted: '↓ -11,1%',
        isPositiveTrend: false,
      },
      {
        month: 'Сентябрь 2026',
        accruedEur: baseRevenue + baseDebt,
        accruedFormatted: formatEur(baseRevenue + baseDebt),
        paidEur: baseRevenue,
        paidFormatted: formatEur(baseRevenue),
        debtEur: baseDebt,
        debtFormatted: formatEur(baseDebt),
        trendFormatted: '+0%',
        isPositiveTrend: true,
      },
    ];

    // 4. Direction metrics table
    const directions = [
      {
        id: 'english',
        name: 'Английский язык',
        badgeBg: 'bg-rose-100',
        badgeText: 'text-rose-700',
        studentsCount: 64,
        revenueEur: 9840,
        revenueFormatted: formatEur(9840),
        avgCheckEur: 720,
        avgCheckFormatted: formatEur(720),
        debtEur: 2160,
        debtFormatted: formatEur(2160),
      },
      {
        id: 'math',
        name: 'Математика',
        badgeBg: 'bg-blue-100',
        badgeText: 'text-blue-700',
        studentsCount: 42,
        revenueEur: 7420,
        revenueFormatted: formatEur(7420),
        avgCheckEur: 660,
        avgCheckFormatted: formatEur(660),
        debtEur: 1840,
        debtFormatted: formatEur(1840),
      },
      {
        id: 'robotics',
        name: 'Robotics',
        badgeBg: 'bg-indigo-100',
        badgeText: 'text-indigo-700',
        studentsCount: 31,
        revenueEur: 5680,
        revenueFormatted: formatEur(5680),
        avgCheckEur: 710,
        avgCheckFormatted: formatEur(710),
        debtEur: 2130,
        debtFormatted: formatEur(2130),
      },
      {
        id: 'programming',
        name: 'Программирование',
        badgeBg: 'bg-purple-100',
        badgeText: 'text-purple-700',
        studentsCount: 28,
        revenueEur: 4160,
        revenueFormatted: formatEur(4160),
        avgCheckEur: 640,
        avgCheckFormatted: formatEur(640),
        debtEur: 1020,
        debtFormatted: formatEur(1020),
      },
      {
        id: 'prep',
        name: 'Подготовка к школе',
        badgeBg: 'bg-pink-100',
        badgeText: 'text-pink-700',
        studentsCount: 18,
        revenueEur: 2940,
        revenueFormatted: formatEur(2940),
        avgCheckEur: 530,
        avgCheckFormatted: formatEur(530),
        debtEur: 740,
        debtFormatted: formatEur(740),
      },
      {
        id: 'design',
        name: 'Дизайн',
        badgeBg: 'bg-amber-100',
        badgeText: 'text-amber-700',
        studentsCount: 12,
        revenueEur: 2410,
        revenueFormatted: formatEur(2410),
        avgCheckEur: 600,
        avgCheckFormatted: formatEur(600),
        debtEur: 750,
        debtFormatted: formatEur(750),
      },
    ];

    // 5. Revenue Dynamics (2 Lines)
    const dynamics = [
      { month: 'Апр', currentEur: 31600, previousEur: 29500 },
      { month: 'Май', currentEur: 28900, previousEur: 31200 },
      { month: 'Июн', currentEur: 32200, previousEur: 28400 },
      { month: 'Июл', currentEur: 33870, previousEur: 32100 },
      { month: 'Авг', currentEur: 30120, previousEur: 33800 },
      { month: 'Сен', currentEur: Math.round(baseRevenue), previousEur: 0 },
    ];

    // 6. Revenue Structure (Donut)
    const structure = {
      items: [
        { id: 'en', name: 'Английский язык', color: '#2563eb', sharePercent: 30, revenueEur: 9840 },
        { id: 'math', name: 'Математика', color: '#0ea5e9', sharePercent: 23, revenueEur: 7420 },
        { id: 'rob', name: 'Robotics', color: '#8b5cf6', sharePercent: 17, revenueEur: 5680 },
        { id: 'it', name: 'Программирование', color: '#f59e0b', sharePercent: 13, revenueEur: 4160 },
        { id: 'prep', name: 'Подготовка к школе', color: '#ec4899', sharePercent: 9, revenueEur: 2940 },
        { id: 'other', name: 'Другое', color: '#94a3b8', sharePercent: 8, revenueEur: 2410 },
      ],
      totalRevenueFormatted: formatEur(baseRevenue),
    };

    // 7. Where money is lost (Tier 2 left)
    const lossAnalysis = {
      items: [
        {
          id: 'overdue_payments',
          title: 'Просроченные платежи',
          count: 18,
          amountEur: 6240,
          amountFormatted: formatEur(6240),
          sharePercent: 42,
          color: 'bg-rose-500',
        },
        {
          id: 'unpaid_invoices',
          title: 'Не оплачены счета',
          count: 12,
          amountEur: 3960,
          amountFormatted: formatEur(3960),
          sharePercent: 26,
          color: 'bg-amber-500',
        },
        {
          id: 'expired_subs',
          title: 'Закончился абонемент (нет продления)',
          count: 9,
          amountEur: 2880,
          amountFormatted: formatEur(2880),
          sharePercent: 19,
          color: 'bg-blue-500',
        },
        {
          id: 'refunds',
          title: 'Отмены и возвраты',
          count: 4,
          amountEur: 1280,
          amountFormatted: formatEur(1280),
          sharePercent: 9,
          color: 'bg-purple-500',
        },
        {
          id: 'unallocated_balance',
          title: 'Нераспределённый баланс',
          count: 3,
          amountEur: 640,
          amountFormatted: formatEur(640),
          sharePercent: 4,
          color: 'bg-slate-400',
        },
      ],
      potentialLossFormatted: formatEur(15000),
      potentialLossDelta: '↑ +18%',
      potentialLossShareText: 'Это 32% от возможной выручки текущего периода',
    };

    // 8. Debts & Overdue (Tier 2 right)
    const debtsSummary = {
      totalDebtFormatted: formatEur(8640),
      totalDebtDelta: '↑ +24,9%',
      overdueDebtFormatted: formatEur(3120),
      overdueDebtDelta: '↑ +48,6%',
      debtorsCount: 27,
      debtorsCountDelta: '↑ +28,6%',
      debtorsList: [
        {
          id: 'd1',
          studentId: '1',
          studentName: 'Иван Петров',
          groupName: 'Robotics Junior',
          debtEur: 1240,
          debtFormatted: formatEur(1240),
          overdueDate: '25.09.2026',
          daysOverdue: 9,
          riskLevel: 'Высокий' as const,
        },
        {
          id: 'd2',
          studentId: '2',
          studentName: 'Мария Соколова',
          groupName: 'Математика',
          debtEur: 980,
          debtFormatted: formatEur(980),
          overdueDate: '22.09.2026',
          daysOverdue: 12,
          riskLevel: 'Высокий' as const,
        },
        {
          id: 'd3',
          studentId: '3',
          studentName: 'Алина Белова',
          groupName: 'English B1',
          debtEur: 720,
          debtFormatted: formatEur(720),
          overdueDate: '28.09.2026',
          daysOverdue: 6,
          riskLevel: 'Средний' as const,
        },
        {
          id: 'd4',
          studentId: '4',
          studentName: 'Олег Кузнецов',
          groupName: 'Python Start',
          debtEur: 580,
          debtFormatted: formatEur(580),
          overdueDate: '20.09.2026',
          daysOverdue: 14,
          riskLevel: 'Высокий' as const,
        },
        {
          id: 'd5',
          studentId: '5',
          studentName: 'Сергей Морозов',
          groupName: 'Kids Starter',
          debtEur: 450,
          debtFormatted: formatEur(450),
          overdueDate: '27.09.2026',
          daysOverdue: 7,
          riskLevel: 'Средний' as const,
        },
      ],
    };

    // 9. Risk Tabs: Students (8) and Groups (5) (Tier 3)
    const riskTabs = {
      students: [
        {
          id: 'r1',
          studentId: '3',
          studentName: 'Алина Белова',
          groupName: 'Математика',
          lessonsRemaining: 1,
          lessonsRemainingColor: 'orange' as const,
          endDate: '28.09.2026',
          statusText: 'Пакет заканчивается' as const,
          riskLevel: 'Высокий' as const,
        },
        {
          id: 'r2',
          studentId: '6',
          studentName: 'Дмитрий Орлов',
          groupName: 'English B1 Teens',
          lessonsRemaining: 2,
          lessonsRemainingColor: 'orange' as const,
          endDate: '03.10.2026',
          statusText: 'Низкий баланс' as const,
          riskLevel: 'Высокий' as const,
        },
        {
          id: 'r3',
          studentId: '7',
          studentName: 'Елена Волкова',
          groupName: 'Robotics Junior',
          lessonsRemaining: 0,
          lessonsRemainingColor: 'red' as const,
          endDate: '01.10.2026',
          statusText: 'Нет продления' as const,
          riskLevel: 'Высокий' as const,
        },
        {
          id: 'r4',
          studentId: '8',
          studentName: 'Максим Соколов',
          groupName: 'Python Start',
          lessonsRemaining: 3,
          lessonsRemainingColor: 'green' as const,
          endDate: '05.10.2026',
          statusText: 'Ожидает оплаты' as const,
          riskLevel: 'Средний' as const,
        },
        {
          id: 'r5',
          studentId: '9',
          studentName: 'Анна Васильева',
          groupName: 'Kids Starter',
          lessonsRemaining: 2,
          lessonsRemainingColor: 'green' as const,
          endDate: '06.10.2026',
          statusText: 'Просрочен платеж' as const,
          riskLevel: 'Высокий' as const,
        },
      ],
      groups: [
        {
          id: 'g1',
          groupId: 'g-rob-jr',
          groupName: 'Robotics Junior',
          totalStudents: 18,
          debtStudentsCount: 5,
          debtSharePercent: 28,
          debtAmountEur: 3120,
          debtAmountFormatted: formatEur(3120),
        },
        {
          id: 'g2',
          groupId: 'g-math',
          groupName: 'Математика',
          totalStudents: 16,
          debtStudentsCount: 4,
          debtSharePercent: 25,
          debtAmountEur: 1840,
          debtAmountFormatted: formatEur(1840),
        },
        {
          id: 'g3',
          groupId: 'g-eng-b1',
          groupName: 'English B1',
          totalStudents: 14,
          debtStudentsCount: 3,
          debtSharePercent: 21,
          debtAmountEur: 1420,
          debtAmountFormatted: formatEur(1420),
        },
        {
          id: 'g4',
          groupId: 'g-py-start',
          groupName: 'Python Start',
          totalStudents: 12,
          debtStudentsCount: 2,
          debtSharePercent: 17,
          debtAmountEur: 980,
          debtAmountFormatted: formatEur(980),
        },
        {
          id: 'g5',
          groupId: 'g-kids-start',
          groupName: 'Kids Starter',
          totalStudents: 10,
          debtStudentsCount: 2,
          debtSharePercent: 17,
          debtAmountEur: 630,
          debtAmountFormatted: formatEur(630),
        },
      ],
    };

    return {
      isLoading: false,
      isEmpty: false,
      kpis,
      monthlyAccruals,
      directions,
      dynamics,
      structure,
      lossAnalysis,
      debtsSummary,
      riskTabs,
    };
  }, [payments, students, invoices, groups, filters]);

  return financeData;
}
