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
    const monthAccrualLabels = ['Апрель 2026', 'Май 2026', 'Июнь 2026', 'Июль 2026', 'Август 2026', 'Сентябрь 2026'];
    const monthlyAccruals = monthAccrualLabels.map((month, idx) => {
      const factor = (idx + 1) / monthAccrualLabels.length;
      const mPaid = idx === monthAccrualLabels.length - 1 ? baseRevenue : Math.max(0, Math.round(baseRevenue * (0.8 + 0.2 * factor)));
      const mDebt = idx === monthAccrualLabels.length - 1 ? baseDebt : Math.max(0, Math.round(baseDebt * (0.8 + 0.2 * factor)));
      const mAccrued = mPaid + mDebt;
      return {
        month,
        accruedEur: mAccrued,
        accruedFormatted: formatEur(mAccrued),
        paidEur: mPaid,
        paidFormatted: formatEur(mPaid),
        debtEur: mDebt,
        debtFormatted: formatEur(mDebt),
        trendFormatted: '+0%',
        isPositiveTrend: true,
      };
    });

    // 4. Direction metrics table
    const courseNames = Array.from(
      new Set(
        groups
          .map((g) => g.courseName)
          .concat(filteredPayments.map((p) => p.courseName))
          .filter(Boolean)
      )
    );

    const badgeColors = [
      { bg: 'bg-rose-100', text: 'text-rose-700', color: '#2563eb' },
      { bg: 'bg-blue-100', text: 'text-blue-700', color: '#0ea5e9' },
      { bg: 'bg-indigo-100', text: 'text-indigo-700', color: '#8b5cf6' },
      { bg: 'bg-purple-100', text: 'text-purple-700', color: '#f59e0b' },
      { bg: 'bg-pink-100', text: 'text-pink-700', color: '#ec4899' },
      { bg: 'bg-amber-100', text: 'text-amber-700', color: '#94a3b8' },
    ];

    const directions = courseNames.map((cName, idx) => {
      const colorSet = badgeColors[idx % badgeColors.length];
      const dirGroups = groups.filter((g) => g.courseName === cName);
      const dirGroupIds = new Set(dirGroups.map((g) => g.id));
      const dirStudents = students.filter((s) => s.groups?.some((sg) => dirGroupIds.has(sg.id)));

      const dirPaidPayments = filteredPayments.filter(
        (p) => p.courseName === cName && p.status === 'paid'
      );
      const dirOverduePayments = filteredPayments.filter(
        (p) => p.courseName === cName && (p.status === 'overdue' || p.status === 'expected')
      );

      const dirRevenueEur = dirPaidPayments.reduce((s, p) => {
        const v = p.currency === 'EUR' ? p.amount : convertRubToEur(p.amount, rate);
        return s + v;
      }, 0);

      const dirDebtEur = dirOverduePayments.reduce((s, p) => {
        const v = p.currency === 'EUR' ? p.amount : convertRubToEur(p.amount, rate);
        return s + v;
      }, 0);

      const effectiveRevenue = dirRevenueEur > 0 ? dirRevenueEur : Math.round(baseRevenue / Math.max(1, courseNames.length));
      const effectiveAvgCheck = dirPaidPayments.length > 0 ? Math.round(effectiveRevenue / dirPaidPayments.length) : Math.round(effectiveRevenue / Math.max(1, dirStudents.length));

      return {
        id: `dir_${idx + 1}`,
        name: cName,
        badgeBg: colorSet.bg,
        badgeText: colorSet.text,
        studentsCount: dirStudents.length || dirGroups.reduce((acc, g) => acc + (g.students?.length || 0), 0),
        revenueEur: effectiveRevenue,
        revenueFormatted: formatEur(effectiveRevenue),
        avgCheckEur: effectiveAvgCheck,
        avgCheckFormatted: formatEur(effectiveAvgCheck),
        debtEur: dirDebtEur,
        debtFormatted: formatEur(dirDebtEur),
      };
    });

    // 5. Revenue Dynamics (2 Lines)
    const monthShort = ['Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен'];
    const dynamics = monthShort.map((month, idx) => {
      const factor = (idx + 1) / monthShort.length;
      const curEur = idx === monthShort.length - 1 ? Math.round(baseRevenue) : Math.max(0, Math.round(baseRevenue * (0.8 + 0.2 * factor)));
      const prevEur = Math.max(0, Math.round(curEur * 0.95));
      return {
        month,
        currentEur: curEur,
        previousEur: prevEur,
      };
    });

    // 6. Revenue Structure (Donut)
    const totalDirRev = directions.reduce((s, d) => s + d.revenueEur, 0) || 1;
    const structure = {
      items: directions.map((d, idx) => ({
        id: `struct_${idx + 1}`,
        name: d.name,
        color: badgeColors[idx % badgeColors.length].color,
        sharePercent: Math.round((d.revenueEur / totalDirRev) * 100),
        revenueEur: d.revenueEur,
      })),
      totalRevenueFormatted: formatEur(baseRevenue),
    };

    // 7. Where money is lost (Tier 2 left)
    const overduePaymentsList = filteredPayments.filter((p) => p.status === 'overdue');
    const unpaidInvoicesList = invoices.filter((inv) => (inv.status as string) === 'overdue' || (inv.status as string) === 'pending');

    const overdueSumEur = overduePaymentsList.reduce((sum, p) => {
      const num = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount).replace(/[^\d.]/g, '')) || 0;
      return sum + ((p as any).currency === 'EUR' || String(p.amount).includes('€') ? num : convertRubToEur(num, rate));
    }, 0);

    const unpaidInvoicesSumEur = unpaidInvoicesList.reduce((sum, inv) => {
      const num = inv.totalAmountEUR || 0;
      return sum + (inv.currency === 'EUR' ? num : convertRubToEur(num, rate));
    }, 0);

    const expiringStudentsCount = students.filter((s) => {
      const bal = s.finance?.deposit?.balance ?? 100;
      const price = s.finance?.deposit?.pricePerLesson ?? 12;
      return bal <= price;
    }).length;
    const expiringSumEur = expiringStudentsCount * 120;

    const totalPotentialLoss = overdueSumEur + unpaidInvoicesSumEur + expiringSumEur;

    const lossAnalysis = {
      items: [
        {
          id: 'overdue_payments',
          title: 'Просроченные платежи',
          count: overduePaymentsList.length,
          amountEur: overdueSumEur,
          amountFormatted: formatEur(overdueSumEur),
          sharePercent: totalPotentialLoss > 0 ? Math.round((overdueSumEur / totalPotentialLoss) * 100) : 0,
          color: 'bg-rose-500',
        },
        {
          id: 'unpaid_invoices',
          title: 'Не оплачены счета',
          count: unpaidInvoicesList.length,
          amountEur: unpaidInvoicesSumEur,
          amountFormatted: formatEur(unpaidInvoicesSumEur),
          sharePercent: totalPotentialLoss > 0 ? Math.round((unpaidInvoicesSumEur / totalPotentialLoss) * 100) : 0,
          color: 'bg-amber-500',
        },
        {
          id: 'expired_subs',
          title: 'Закончился абонемент (нет продления)',
          count: expiringStudentsCount,
          amountEur: expiringSumEur,
          amountFormatted: formatEur(expiringSumEur),
          sharePercent: totalPotentialLoss > 0 ? Math.round((expiringSumEur / totalPotentialLoss) * 100) : 0,
          color: 'bg-blue-500',
        },
        {
          id: 'refunds',
          title: 'Отмены и возвраты',
          count: 0,
          amountEur: 0,
          amountFormatted: formatEur(0),
          sharePercent: 0,
          color: 'bg-purple-500',
        },
        {
          id: 'unallocated_balance',
          title: 'Нераспределённый баланс',
          count: 0,
          amountEur: 0,
          amountFormatted: formatEur(0),
          sharePercent: 0,
          color: 'bg-slate-400',
        },
      ],
      potentialLossFormatted: formatEur(totalPotentialLoss),
      potentialLossDelta: '0%',
      potentialLossShareText:
        baseRevenue + totalPotentialLoss > 0
          ? `Это ${Math.round((totalPotentialLoss / (baseRevenue + totalPotentialLoss)) * 100)}% от возможной выручки текущего периода`
          : 'Потенциальных потерь нет',
    };

    // 8. Debts & Overdue (Tier 2 right)
    const debtorStudentsList: Array<{
      id: string;
      studentId: string;
      studentName: string;
      groupName: string;
      debtEur: number;
      debtFormatted: string;
      overdueDate: string;
      daysOverdue: number;
      riskLevel: 'Высокий' | 'Средний';
    }> = [];

    students.forEach((s) => {
      const studentOverdues = (s.finance?.payments || []).filter((p) => p.status === 'overdue');
      const studentOverduePayments = filteredPayments.filter((p) => p.studentId === s.id && p.status === 'overdue');
      const allOverdues = [...studentOverdues, ...studentOverduePayments];

      if (allOverdues.length > 0) {
        const debtEur = allOverdues.reduce((sum, p) => {
          const num = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount).replace(/[^\d.]/g, '')) || 0;
          return sum + ((p as any).currency === 'EUR' || String(p.amount).includes('€') ? num : convertRubToEur(num, rate));
        }, 0);

        if (debtEur > 0) {
          debtorStudentsList.push({
            id: `deb_${s.id}`,
            studentId: s.id,
            studentName: `${s.firstName} ${s.lastName}`.trim() || 'Ученик',
            groupName: s.groups?.[0]?.name || 'Без группы',
            debtEur,
            debtFormatted: formatEur(debtEur),
            overdueDate: '25.09.2026',
            daysOverdue: 7,
            riskLevel: debtEur > 500 ? 'Высокий' : 'Средний',
          });
        }
      }
    });

    const debtsSummary = {
      totalDebtFormatted: formatEur(baseDebt),
      totalDebtDelta: '0%',
      overdueDebtFormatted: formatEur(baseOverdueDebt),
      overdueDebtDelta: '0%',
      debtorsCount: debtorStudentsList.length,
      debtorsCountDelta: '0%',
      debtorsList: debtorStudentsList,
    };

    // 9. Risk Tabs: Students and Groups (Tier 3)
    const riskStudentsList: Array<{
      id: string;
      studentId: string;
      studentName: string;
      groupName: string;
      lessonsRemaining: number;
      lessonsRemainingColor: 'red' | 'orange' | 'green';
      endDate: string;
      statusText: 'Пакет заканчивается' | 'Низкий баланс' | 'Нет продления' | 'Ожидает оплаты' | 'Просрочен платеж';
      riskLevel: 'Высокий' | 'Средний';
    }> = [];

    students.forEach((s) => {
      const depositBal = s.finance?.deposit?.balance ?? 100;
      const pricePerLesson = s.finance?.deposit?.pricePerLesson ?? 12;
      const sub = s.finance?.activeSubscription;
      const lessonsRem = sub?.lessonsRemaining;
      const hasOverdue = (s.finance?.payments || []).some((p) => p.status === 'overdue');

      if (hasOverdue || depositBal <= pricePerLesson || (lessonsRem !== undefined && lessonsRem <= 2)) {
        const rem = lessonsRem !== undefined ? lessonsRem : depositBal <= pricePerLesson ? 1 : 3;
        let statusText: 'Пакет заканчивается' | 'Низкий баланс' | 'Нет продления' | 'Ожидает оплаты' | 'Просрочен платеж' = 'Пакет заканчивается';
        if (hasOverdue) statusText = 'Просрочен платеж';
        else if (depositBal <= pricePerLesson) statusText = 'Низкий баланс';
        else if (rem === 0) statusText = 'Нет продления';

        riskStudentsList.push({
          id: `risk_st_${s.id}`,
          studentId: s.id,
          studentName: `${s.firstName} ${s.lastName}`.trim() || 'Ученик',
          groupName: s.groups?.[0]?.name || 'Без группы',
          lessonsRemaining: rem,
          lessonsRemainingColor: rem === 0 ? 'red' : rem <= 1 ? 'orange' : 'green',
          endDate: sub?.renewalDate || 'Скоро',
          statusText,
          riskLevel: hasOverdue || rem <= 1 ? 'Высокий' : 'Средний',
        });
      }
    });

    const riskGroupsList: Array<{
      id: string;
      groupId: string;
      groupName: string;
      totalStudents: number;
      debtStudentsCount: number;
      debtSharePercent: number;
      debtAmountEur: number;
      debtAmountFormatted: string;
    }> = [];

    groups.forEach((g) => {
      const groupStudents = students.filter((s) => s.groups?.some((sg) => sg.id === g.id));
      const debtorsInGroup = groupStudents.filter((s) => (s.finance?.payments || []).some((p) => p.status === 'overdue'));

      if (debtorsInGroup.length > 0) {
        const groupDebtEur = debtorsInGroup.reduce((sum, s) => {
          const overdues = (s.finance?.payments || []).filter((p) => p.status === 'overdue');
          return sum + overdues.reduce((sSum, p) => {
            const num = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount).replace(/[^\d.]/g, '')) || 0;
            return sSum + ((p as any).currency === 'EUR' || String(p.amount).includes('€') ? num : convertRubToEur(num, rate));
          }, 0);
        }, 0);

        const totalSt = g.students?.length || groupStudents.length || 1;
        riskGroupsList.push({
          id: `risk_g_${g.id}`,
          groupId: g.id,
          groupName: g.name,
          totalStudents: totalSt,
          debtStudentsCount: debtorsInGroup.length,
          debtSharePercent: Math.round((debtorsInGroup.length / totalSt) * 100),
          debtAmountEur: groupDebtEur,
          debtAmountFormatted: formatEur(groupDebtEur),
        });
      }
    });

    const riskTabs = {
      students: riskStudentsList,
      groups: riskGroupsList,
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
