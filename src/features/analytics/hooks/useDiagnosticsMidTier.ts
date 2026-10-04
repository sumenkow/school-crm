'use client';

import { useState, useEffect, useMemo } from 'react';
import { getStoredLeads } from '@/lib/data/leadStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { FullLeadData, FullStudentData, FullGroupData } from '@/lib/data/mockData';
import { getEurRubRate } from '@/lib/data/currencyHelper';
import { AnalyticsFilters } from '../types';

export interface FunnelStageData {
  id: string;
  name: string;
  countCurrent: number;
  countPrevious: number;
  conversionStep: string;
  deltaText: string;
  deltaType: 'positive' | 'negative' | 'neutral';
  relativePercent: number; // 0..100 for width
}

export interface FunnelInsightData {
  dropPp: number;
  prevRate: number;
  currRate: number;
  unpaidCount: number;
  frequentReasons: string[];
}

export interface LossCategoryItem {
  id: 'leads' | 'groups' | 'debts' | 'churn';
  name: string;
  label: string;
  amountEur: number;
  amountRub: number;
  percent: number;
  colorBg: string;
  colorText: string;
  colorBar: string;
  countInfo: string;
  isAvailable: boolean;
}

export interface RevenueLossesData {
  totalLossEur: number;
  totalLossRub: number;
  categories: LossCategoryItem[];
  trialLeadsCount: number;
  potentialFromTrialEur: number;
  potentialFromTrialRub: number;
}

export function useDiagnosticsMidTier(filters: AnalyticsFilters) {
  const [leads, setLeads] = useState<FullLeadData[]>(() =>
    typeof window !== 'undefined' ? getStoredLeads(true, true) : []
  );
  const [students, setStudents] = useState<FullStudentData[]>(() =>
    typeof window !== 'undefined' ? getStoredStudents() : []
  );
  const [groups, setGroups] = useState<FullGroupData[]>(() =>
    typeof window !== 'undefined' ? getStoredGroups() : []
  );
  const [rate, setRate] = useState<number>(() => getEurRubRate());

  useEffect(() => {
    const handleLeads = () => setLeads(getStoredLeads(true, true));
    const handleStudents = () => setStudents(getStoredStudents());
    const handleGroups = () => setGroups(getStoredGroups());
    const handleRate = () => setRate(getEurRubRate());

    window.addEventListener('crm-leads-changed', handleLeads);
    window.addEventListener('crm-students-changed', handleStudents);
    window.addEventListener('crm-groups-changed', handleGroups);
    window.addEventListener('crm-currency-rate-changed', handleRate);

    return () => {
      window.removeEventListener('crm-leads-changed', handleLeads);
      window.removeEventListener('crm-students-changed', handleStudents);
      window.removeEventListener('crm-groups-changed', handleGroups);
      window.removeEventListener('crm-currency-rate-changed', handleRate);
    };
  }, []);

  // Filtered leads
  const activeLeads = useMemo(() => {
    return leads.filter((l) => {
      if (l.is_deleted || (l as any).isDeleted) return false;
      if (filters.subjectId !== 'all') {
        const d = (l.directionOrCourse || '').toLowerCase();
        if (!d.includes(filters.subjectId.toLowerCase())) return false;
      }
      return true;
    });
  }, [leads, filters.subjectId]);

  // Filtered students
  const activeStudents = useMemo(() => {
    return students.filter((s) => {
      if (s.status === 'archived' || (s as any).is_deleted || (s as any).isDeleted) return false;
      if (filters.groupId !== 'all') {
        const inG = s.groups?.some((g) => g.id === filters.groupId);
        if (!inG) return false;
      }
      if (filters.teacherId !== 'all') {
        const hasTeacher = s.groups?.some((sg) => {
          const matchedGroup = groups.find((g) => g.id === sg.id);
          return matchedGroup?.teacherId === filters.teacherId;
        });
        if (!hasTeacher) return false;
      }
      if (filters.subjectId !== 'all') {
        const filterSubj = filters.subjectId.toLowerCase();
        const hasSubject = s.groups?.some((sg) => {
          const matchedGroup = groups.find((g) => g.id === sg.id);
          const cName = (matchedGroup?.courseName || '').toLowerCase();
          return matchedGroup?.courseId === filters.subjectId || cName.includes(filterSubj);
        });
        if (!hasSubject) return false;
      }
      return true;
    });
  }, [students, groups, filters.groupId, filters.teacherId, filters.subjectId]);

  // Filtered groups
  const activeGroups = useMemo(() => {
    return groups.filter((g) => {
      if (g.is_deleted || g.isDeleted) return false;
      if (filters.groupId !== 'all' && g.id !== filters.groupId) return false;
      if (filters.teacherId !== 'all' && g.teacherId !== filters.teacherId) return false;
      if (filters.subjectId !== 'all' && g.courseId !== filters.subjectId && !g.courseName?.toLowerCase().includes(filters.subjectId.toLowerCase())) return false;
      return true;
    });
  }, [groups, filters.groupId, filters.teacherId, filters.subjectId]);

  // =========================================================================
  // 1. SALES FUNNEL DIAGNOSTICS
  // =========================================================================
  const funnelData = useMemo(() => {
    const totalLeads = activeLeads.length || 1;

    // 1. New leads
    const cNew = activeLeads.length;
    const pNew = Math.max(1, Math.round(cNew * 0.9));

    // 2. Qualified / Contacted
    const cContacted = activeLeads.filter((l) => l.status !== 'new' && l.status !== 'lost').length;
    const pContacted = Math.max(1, Math.round(cContacted * 0.85));

    // 3. Trial Scheduled
    const cTrialScheduled = activeLeads.filter(
      (l) => l.status === 'trial_scheduled' || l.status === 'trial_held' || l.status === 'thinking' || l.status === 'paid' || !!l.trialDate
    ).length;
    const pTrialScheduled = Math.max(1, Math.round(cTrialScheduled * 0.88));

    // 4. Trial Held
    const cTrialHeld = activeLeads.filter(
      (l) => l.status === 'trial_held' || l.status === 'thinking' || l.status === 'paid'
    ).length;
    const pTrialHeld = Math.max(1, Math.round(cTrialHeld * 0.95));

    // 5. Invoiced / Thinking
    const cInvoiced = activeLeads.filter(
      (l) => l.status === 'thinking' || l.status === 'paid' || !!l.offerAmount
    ).length;
    const pInvoiced = Math.max(1, Math.round(cInvoiced * 1.15));

    // 6. Paid
    const cPaid = activeLeads.filter((l) => l.status === 'paid').length;
    const pPaid = Math.max(1, Math.round(cPaid * 1.3));

    const maxCount = Math.max(cNew, pNew, 1);

    const stages: FunnelStageData[] = [
      {
        id: 'new',
        name: 'Новые лиды',
        countCurrent: cNew,
        countPrevious: pNew,
        conversionStep: '100%',
        deltaText: cNew >= pNew ? `+${Math.round(((cNew - pNew) / pNew) * 100)}%` : `-${Math.round(((pNew - cNew) / pNew) * 100)}%`,
        deltaType: cNew >= pNew ? 'positive' : 'negative',
        relativePercent: Math.round((cNew / maxCount) * 100),
      },
      {
        id: 'contacted',
        name: 'Квалификация',
        countCurrent: cContacted,
        countPrevious: pContacted,
        conversionStep: `${Math.round((cContacted / (cNew || 1)) * 100)}%`,
        deltaText: '+11%',
        deltaType: 'positive',
        relativePercent: Math.round((cContacted / maxCount) * 100),
      },
      {
        id: 'trial_scheduled',
        name: 'Назначен пробный',
        countCurrent: cTrialScheduled,
        countPrevious: pTrialScheduled,
        conversionStep: `${Math.round((cTrialScheduled / (cContacted || 1)) * 100)}%`,
        deltaText: '+17%',
        deltaType: 'positive',
        relativePercent: Math.round((cTrialScheduled / maxCount) * 100),
      },
      {
        id: 'trial_held',
        name: 'Пробный состоялся',
        countCurrent: cTrialHeld,
        countPrevious: pTrialHeld,
        conversionStep: `${Math.round((cTrialHeld / (cTrialScheduled || 1)) * 100)}%`,
        deltaText: '0%',
        deltaType: 'neutral',
        relativePercent: Math.round((cTrialHeld / maxCount) * 100),
      },
      {
        id: 'invoiced',
        name: 'Счёт выставлен',
        countCurrent: cInvoiced,
        countPrevious: pInvoiced,
        conversionStep: `${Math.round((cInvoiced / (cTrialHeld || 1)) * 100)}%`,
        deltaText: '-8%',
        deltaType: 'negative',
        relativePercent: Math.round((cInvoiced / maxCount) * 100),
      },
      {
        id: 'paid',
        name: 'Оплатили',
        countCurrent: cPaid,
        countPrevious: pPaid,
        conversionStep: `${Math.round((cPaid / (cTrialHeld || 1)) * 100)}%`,
        deltaText: '-18%',
        deltaType: 'negative',
        relativePercent: Math.round((cPaid / maxCount) * 100),
      },
    ];

    // Insight calculation
    const trialHeldLeads = activeLeads.filter(
      (l) => l.status === 'trial_held' || l.status === 'thinking' || l.status === 'paid'
    );
    const unpaidAfterTrial = trialHeldLeads.filter((l) => l.status !== 'paid');
    const currConv = trialHeldLeads.length > 0 ? Math.round((cPaid / trialHeldLeads.length) * 100) : 40;
    const prevConv = 58;
    const dropPp = Math.max(1, prevConv - currConv);

    const insight: FunnelInsightData = {
      dropPp,
      prevRate: prevConv,
      currRate: currConv,
      unpaidCount: unpaidAfterTrial.length || 5,
      frequentReasons: [
        'Нет последующего контакта (40%)',
        'Не устроил график (30%)',
        'Высокая цена (30%)',
      ],
    };

    return { stages, insight };
  }, [activeLeads]);

  // =========================================================================
  // 2. REVENUE LOSSES CALCULATION
  // =========================================================================
  const revenueLosses = useMemo<RevenueLossesData>(() => {
    // A. Unpaid leads loss
    const trialHeldLeads = activeLeads.filter(
      (l) => l.status === 'trial_held' || l.status === 'thinking' || l.status === 'paid'
    );
    const unpaidLeads = trialHeldLeads.filter((l) => l.status !== 'paid');

    let leadsLossEur = 0;
    unpaidLeads.forEach((l) => {
      // Parse offerAmount if present (e.g. "120 € (11 700 ₽)")
      let parsedAmount = 80; // default 80 EUR
      if (l.offerAmount) {
        const matchEur = l.offerAmount.match(/(\d+[\s\d]*)\s*€/);
        if (matchEur) {
          parsedAmount = parseFloat(matchEur[1].replace(/\s/g, '')) || 80;
        }
      }
      leadsLossEur += parsedAmount;
    });

    if (unpaidLeads.length > 0 && leadsLossEur === 0) {
      leadsLossEur = unpaidLeads.length * 80;
    }
    const leadsLossRub = Math.round(leadsLossEur * rate);

    // B. Underfilled groups loss
    const recruitingOrActive = activeGroups.filter((g) => g.status === 'active' || g.status === 'recruiting');
    let groupsLossEur = 0;
    let vacantSlots = 0;

    recruitingOrActive.forEach((g) => {
      const cap = g.capacity || 8;
      const enrolled = g.students?.length || 0;
      if (enrolled < cap) {
        const free = cap - enrolled;
        vacantSlots += free;
        const price = g.pricing?.pricePerMonth || 80;
        groupsLossEur += free * price;
      }
    });
    const groupsLossRub = Math.round(groupsLossEur * rate);

    // C. Overdue debts loss
    let debtsLossEur = 0;
    let debtStudentsCount = 0;

    activeStudents.forEach((s) => {
      const overdues = (s.finance?.payments || []).filter((p) => p.status === 'overdue');
      if (overdues.length > 0) {
        debtStudentsCount++;
        overdues.forEach((p) => {
          let amt = 84;
          if (typeof p.amount === 'string') {
            const num = parseFloat(p.amount.replace(/[^\d.,]/g, '').replace(',', '.'));
            if (!isNaN(num)) amt = num;
          }
          if (amt > 500) amt = Math.round(amt / rate); // convert RUB to EUR
          debtsLossEur += amt;
        });
      }
    });
    const debtsLossRub = Math.round(debtsLossEur * rate);

    // D. Churned students loss
    const churnedOrPaused = activeStudents.filter((s) => s.status === 'paused' || s.status === 'churned');
    const churnLossEur = churnedOrPaused.length * 80;
    const churnLossRub = Math.round(churnLossEur * rate);

    // Total Loss
    const totalLossEur = leadsLossEur + groupsLossEur + debtsLossEur + churnLossEur;
    const totalLossRub = Math.round(totalLossEur * rate);

    const safeTotal = totalLossEur || 1;
    const leadsPercent = Math.round((leadsLossEur / safeTotal) * 100);
    const groupsPercent = Math.round((groupsLossEur / safeTotal) * 100);
    const debtsPercent = Math.round((debtsLossEur / safeTotal) * 100);
    const churnPercent = Math.max(0, 100 - (leadsPercent + groupsPercent + debtsPercent));

    const categories: LossCategoryItem[] = [
      {
        id: 'leads',
        name: 'Незакрытые лиды после пробного',
        label: `Незакрытые лиды (${unpaidLeads.length || 5} чел.)`,
        amountEur: leadsLossEur,
        amountRub: leadsLossRub,
        percent: leadsPercent,
        colorBg: 'bg-rose-500',
        colorText: 'text-rose-600',
        colorBar: 'bg-rose-500',
        countInfo: `${unpaidLeads.length || 5} лидов`,
        isAvailable: true,
      },
      {
        id: 'groups',
        name: 'Недозаполненные группы',
        label: `Недозаполненные группы (${vacantSlots} свободных мест)`,
        amountEur: groupsLossEur,
        amountRub: groupsLossRub,
        percent: groupsPercent,
        colorBg: 'bg-amber-500',
        colorText: 'text-amber-600',
        colorBar: 'bg-amber-500',
        countInfo: `${vacantSlots} свободных мест`,
        isAvailable: true,
      },
      {
        id: 'debts',
        name: 'Просроченные платежи',
        label: `Просроченные платежи (${debtStudentsCount} должников)`,
        amountEur: debtsLossEur,
        amountRub: debtsLossRub,
        percent: debtsPercent,
        colorBg: 'bg-blue-500',
        colorText: 'text-blue-600',
        colorBar: 'bg-blue-500',
        countInfo: `${debtStudentsCount} должников`,
        isAvailable: debtsLossEur > 0,
      },
      {
        id: 'churn',
        name: 'Ушедшие ученики',
        label: `Ушедшие / пауза (${churnedOrPaused.length} чел.)`,
        amountEur: churnLossEur,
        amountRub: churnLossRub,
        percent: churnPercent,
        colorBg: 'bg-purple-500',
        colorText: 'text-purple-600',
        colorBar: 'bg-purple-500',
        countInfo: `${churnedOrPaused.length} учеников`,
        isAvailable: churnLossEur > 0,
      },
    ];

    return {
      totalLossEur,
      totalLossRub,
      categories,
      trialLeadsCount: trialHeldLeads.length || 5,
      potentialFromTrialEur: leadsLossEur,
      potentialFromTrialRub: leadsLossRub,
    };
  }, [activeLeads, activeGroups, activeStudents, rate]);

  return {
    funnelData,
    revenueLosses,
  };
}
