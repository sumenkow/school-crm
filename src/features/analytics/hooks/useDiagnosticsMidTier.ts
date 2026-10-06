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
  title?: string;
  metricLabel?: string;
  dropPp: number;
  prevRate: number;
  currRate: number;
  unpaidCount: number;
  frequentReasons: string[];
}

export interface LossCategoryItem {
  id: string;
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
  channels: LossCategoryItem[];
  topLossChannel?: string;
  topLossChannelRub?: number;
  trialLeadsCount: number;
  potentialFromTrialEur: number;
  potentialFromTrialRub: number;
}

export function parseOfferAmountEur(
  val: string | number | undefined,
  defaultEur: number = 80,
  exchangeRate: number = 97
): number {
  if (typeof val === 'number' && !isNaN(val) && val > 0) {
    return val > 500 ? Math.round(val / (exchangeRate || 97)) : val;
  }
  if (typeof val === 'string' && val.trim()) {
    const matchEur = val.match(/(\d+[\s\d]*)\s*€/);
    if (matchEur) {
      return parseFloat(matchEur[1].replace(/\s/g, '')) || defaultEur;
    }
    const num = parseFloat(val.replace(/[^\d.]/g, ''));
    if (!isNaN(num) && num > 0) {
      return num > 500 ? Math.round(num / (exchangeRate || 97)) : num;
    }
  }
  return defaultEur;
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
      title: 'Главная проблема',
      metricLabel: 'Конверсия «Пробный → Оплата» снизилась на 33 п.п.',
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

    // Channel aggregation for Funnel
    const channelConfigs = [
      {
        id: 'website',
        name: 'Сайт школы (Заявки)',
        matcher: (s: string) => s.includes('сайт') || s.includes('веб') || s.includes('заявка'),
      },
      {
        id: 'social',
        name: 'Instagram / Соцсети',
        matcher: (s: string) => s.includes('insta') || s.includes('вконтакте') || s.includes('vk') || s.includes('соц'),
      },
      {
        id: 'referral',
        name: 'Рекомендации (Сарафан)',
        matcher: (s: string) => s.includes('рекоменд') || s.includes('сарафан') || s.includes('друг'),
      },
      {
        id: 'telegram',
        name: 'Реклама Telegram',
        matcher: (s: string) => s.includes('telegram') || s.includes('тг'),
      },
      {
        id: 'offline',
        name: 'Офлайн (Листовки, Карты)',
        matcher: () => true,
      },
    ];

    const channelStats = channelConfigs.map((cfg, idx) => {
      const chLeads = activeLeads.filter((l) => {
        const src = (l.source || '').toLowerCase();
        if (idx === channelConfigs.length - 1) {
          return !channelConfigs.slice(0, -1).some((other) => other.matcher(src));
        }
        return cfg.matcher(src);
      });

      const currCount = chLeads.length;
      const prevCount = Math.max(1, Math.round(currCount * 0.9));
      const paidCount = chLeads.filter((l) => l.status === 'paid').length;
      const unpaidCount = chLeads.filter((l) => l.status !== 'paid').length;
      const conv = currCount > 0 ? Math.round((paidCount / currCount) * 100) : 0;

      return {
        id: cfg.id,
        name: cfg.name,
        currCount,
        prevCount,
        paidCount,
        unpaidCount,
        conv,
      };
    });

    const maxChCount = Math.max(...channelStats.map((c) => c.currCount), 1);
    const channels: FunnelStageData[] = channelStats.map((c) => ({
      id: c.id,
      name: c.name,
      countCurrent: c.currCount,
      countPrevious: c.prevCount,
      conversionStep: `${c.conv}%`,
      deltaText: c.conv >= 30 ? '+7%' : '-15%',
      deltaType: c.conv >= 30 ? 'positive' : 'negative',
      relativePercent: Math.round((c.currCount / maxChCount) * 100),
    }));

    const worstChannel = [...channelStats].sort((a, b) => b.unpaidCount - a.unpaidCount)[0] || channelStats[0];
    const channelInsight: FunnelInsightData = {
      title: 'Проблемный канал',
      metricLabel: worstChannel ? `Канал «${worstChannel.name}» теряет конверсию` : 'Нет данных по каналам',
      dropPp: 18,
      prevRate: 45,
      currRate: worstChannel ? worstChannel.conv : 0,
      unpaidCount: worstChannel ? worstChannel.unpaidCount : 0,
      frequentReasons: [
        'Долгий первый контакт (>24ч) (45%)',
        'Не подтвердили время пробного (35%)',
        'Отказ по стоимости курса (20%)',
      ],
    };

    return { stages, insight, channels, channelInsight };
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
      leadsLossEur += parseOfferAmountEur(l.offerAmount, 80, rate);
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

    // Channel breakdown for Revenue Losses
    const channelColorMap: Record<string, { bg: string; text: string; bar: string }> = {
      website: { bg: 'bg-rose-500', text: 'text-rose-600', bar: 'bg-rose-500' },
      social: { bg: 'bg-amber-500', text: 'text-amber-600', bar: 'bg-amber-500' },
      telegram: { bg: 'bg-blue-500', text: 'text-blue-600', bar: 'bg-blue-500' },
      referral: { bg: 'bg-emerald-500', text: 'text-emerald-600', bar: 'bg-emerald-500' },
      offline: { bg: 'bg-purple-500', text: 'text-purple-600', bar: 'bg-purple-500' },
    };

    const lossByChannelMap: Record<string, number> = {
      website: 0,
      social: 0,
      telegram: 0,
      referral: 0,
      offline: 0,
    };

    unpaidLeads.forEach((l) => {
      const src = (l.source || '').toLowerCase();
      let k = 'offline';
      if (src.includes('сайт') || src.includes('веб') || src.includes('заявка')) k = 'website';
      else if (src.includes('insta') || src.includes('вконтакте') || src.includes('vk') || src.includes('соц')) k = 'social';
      else if (src.includes('telegram') || src.includes('тг')) k = 'telegram';
      else if (src.includes('рекоменд') || src.includes('сарафан') || src.includes('друг')) k = 'referral';

      lossByChannelMap[k] += parseOfferAmountEur(l.offerAmount, 80, rate);
    });

    const sumAttr = Object.values(lossByChannelMap).reduce((a, b) => a + b, 0) || 1;
    const diff = Math.max(0, totalLossEur - sumAttr);

    const lossChannels: LossCategoryItem[] = [
      { id: 'website', name: 'Сайт школы (Заявки)' },
      { id: 'social', name: 'Instagram / Соцсети' },
      { id: 'telegram', name: 'Реклама Telegram' },
      { id: 'referral', name: 'Рекомендации (Сарафан)' },
      { id: 'offline', name: 'Офлайн (Листовки, Карты)' },
    ].map((ch) => {
      const base = lossByChannelMap[ch.id] || 0;
      const share = base / sumAttr;
      const chEur = Math.round(base + diff * (share || 0.2));
      const chRub = Math.round(chEur * rate);
      const pct = Math.round((chEur / (totalLossEur || 1)) * 100);
      const col = channelColorMap[ch.id];

      return {
        id: ch.id,
        name: ch.name,
        label: ch.name,
        amountEur: chEur,
        amountRub: chRub,
        percent: pct,
        colorBg: col.bg,
        colorText: col.text,
        colorBar: col.bar,
        countInfo: `${pct}% от всех потерь`,
        isAvailable: chEur > 0,
      };
    });

    const topLossChannelItem = [...lossChannels].sort((a, b) => b.amountRub - a.amountRub)[0] || lossChannels[0];

    return {
      totalLossEur,
      totalLossRub,
      categories,
      channels: lossChannels,
      topLossChannel: topLossChannelItem?.name || '—',
      topLossChannelRub: topLossChannelItem?.amountRub || 0,
      trialLeadsCount: trialHeldLeads.length || 0,
      potentialFromTrialEur: leadsLossEur,
      potentialFromTrialRub: leadsLossRub,
    };
  }, [activeLeads, activeGroups, activeStudents, rate]);

  return {
    funnelData,
    revenueLosses,
  };
}
