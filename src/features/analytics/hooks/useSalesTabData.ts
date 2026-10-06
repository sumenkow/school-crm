'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  AnalyticsFilters,
  SalesTabData,
  SalesKpiCardData,
  SalesFunnelStage,
  SalesFunnelAnomaly,
  SalesChannelMetric,
  LeadChannelKey,
  SalesDynamicsPoint,
  SalesSpeedMetrics,
  SalesLossReasonItem,
  SalesManagerMetric,
  SalesDetailedLeadRow,
} from '../types';
import { getStoredLeads } from '@/lib/data/leadStorage';
import { FullLeadData } from '@/lib/data/mockData';

// Normalized channel definition
export function normalizeLeadChannel(rawSource: string): LeadChannelKey {
  const s = (rawSource || '').toLowerCase().trim();
  if (s.includes('сайт') || s.includes('веб') || s.includes('web') || s.includes('заявка')) return 'website';
  if (s.includes('insta') || s.includes('инста') || s.includes('vk') || s.includes('вконтакте') || s.includes('соц')) return 'instagram';
  if (s.includes('рекоменд') || s.includes('сарафан') || s.includes('друг') || s.includes('знаком')) return 'referral';
  if (s.includes('telegr') || s.includes('тг') || s.includes('tg')) return 'telegram';
  return 'offline';
}

export function getChannelLabel(key: LeadChannelKey): string {
  switch (key) {
    case 'website': return 'Сайт школы';
    case 'instagram': return 'Instagram';
    case 'referral': return 'Рекомендации';
    case 'telegram': return 'Telegram';
    case 'offline': return 'Офлайн';
  }
}

export function getChannelDotColor(key: LeadChannelKey): string {
  switch (key) {
    case 'website': return 'bg-rose-500';
    case 'instagram': return 'bg-fuchsia-500';
    case 'referral': return 'bg-emerald-500';
    case 'telegram': return 'bg-sky-500';
    case 'offline': return 'bg-slate-500';
  }
}

export function parseEur(val?: string | number, defaultEur: number = 120): number {
  if (typeof val === 'number') {
    if (isNaN(val) || val <= 0) return defaultEur;
    return val > 500 ? Math.round(val / 97) : val;
  }
  if (!val) return defaultEur;
  const str = String(val).trim();
  const eurMatch = str.match(/([\d\s]+)\s*€/);
  if (eurMatch && eurMatch[1]) {
    const num = parseInt(eurMatch[1].replace(/\s+/g, ''), 10);
    if (!isNaN(num) && num > 0) return num;
  }
  const clean = parseInt(str.replace(/[^\d]/g, ''), 10);
  if (!isNaN(clean) && clean > 0) {
    return clean > 500 ? Math.round(clean / 97) : clean;
  }
  return defaultEur;
}

export function formatEur(val: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(val)) + ' €';
}

export function filterLeadsByPeriod(leads: FullLeadData[], period: string): FullLeadData[] {
  if (!period || period === 'all') return leads;
  if (/^\d{4}-\d{2}$/.test(period)) {
    return leads.filter((l) => {
      const dt = l.createdAt ? new Date(l.createdAt) : null;
      if (!dt || isNaN(dt.getTime())) return false;
      const yr = dt.getFullYear();
      const mo = String(dt.getMonth() + 1).padStart(2, '0');
      return `${yr}-${mo}` === period;
    });
  }
  return leads;
}

export function detectFunnelAnomaly(
  currentStages: SalesFunnelStage[],
  previousStages: SalesFunnelStage[]
): SalesFunnelAnomaly {
  let maxDropPp = 0;
  let worstTransition = { from: '', to: '' };

  const transitions = [
    { fromIdx: 0, toIdx: 1, fromName: 'Новые лиды', toName: 'Квалификация' },
    { fromIdx: 1, toIdx: 2, fromName: 'Квалификация', toName: 'Назначен пробный' },
    { fromIdx: 2, toIdx: 3, fromName: 'Назначен пробный', toName: 'Пробный состоялся' },
    { fromIdx: 3, toIdx: 5, fromName: 'Пробный состоялся', toName: 'Оплата' },
    { fromIdx: 4, toIdx: 5, fromName: 'Счёт выставлен', toName: 'Оплата' },
  ];

  for (const tr of transitions) {
    const currFrom = currentStages[tr.fromIdx]?.countCurrent || 0;
    const currTo = currentStages[tr.toIdx]?.countCurrent || 0;
    const prevFrom = previousStages[tr.fromIdx]?.countCurrent || 0;
    const prevTo = previousStages[tr.toIdx]?.countCurrent || 0;

    const currConv = currFrom > 0 ? (currTo / currFrom) * 100 : 0;
    const prevConv = prevFrom > 0 ? (prevTo / prevFrom) * 100 : 0;
    const drop = prevConv - currConv;

    if (drop > maxDropPp) {
      maxDropPp = drop;
      worstTransition = { from: tr.fromName, to: tr.toName };
    }
  }

  if (maxDropPp >= 10) {
    const roundedDrop = Math.round(maxDropPp);
    return {
      hasAnomaly: true,
      stageFrom: worstTransition.from,
      stageTo: worstTransition.to,
      dropPp: roundedDrop,
      alertText: `Главный провал: «${worstTransition.from} → ${worstTransition.to}»`,
      subText: `Конверсия снизилась на ${roundedDrop} п.п. по сравнению с прошлым периодом`,
    };
  }

  return {
    hasAnomaly: false,
    stageFrom: '',
    stageTo: '',
    dropPp: 0,
    alertText: 'Воронка стабильна',
    subText: 'Существенных отклонений конверсии между этапами не зафиксировано',
  };
}

export function useSalesTabData(filters: AnalyticsFilters): SalesTabData {
  const [allLeads, setAllLeads] = useState<FullLeadData[]>(() => {
    if (typeof window !== 'undefined') {
      return getStoredLeads(true, true);
    }
    return [];
  });

  useEffect(() => {
    const handleUpdate = () => {
      setAllLeads(getStoredLeads(true, true));
    };
    window.addEventListener('crm-leads-changed', handleUpdate);
    return () => {
      window.removeEventListener('crm-leads-changed', handleUpdate);
    };
  }, []);

  const data = useMemo<SalesTabData>(() => {
    // 1. Filter out deleted leads
    const activeLeads = allLeads.filter((l) => !l.is_deleted && !(l as any).isDeleted);

    // 2. Apply global subject/group/teacher filter
    const matchesGlobalFilters = (l: FullLeadData) => {
      if (filters.subjectId && filters.subjectId !== 'all') {
        const matchesCourse = (l.directionOrCourse || '').toLowerCase().includes(filters.subjectId.toLowerCase());
        if (!matchesCourse) return false;
      }
      if (filters.teacherId && filters.teacherId !== 'all') {
        const matchesTeacher = (l.assignedTo || '').toLowerCase().includes(filters.teacherId.toLowerCase());
        if (!matchesTeacher) return false;
      }
      return true;
    };

    const targetLeads = activeLeads.filter(matchesGlobalFilters);

    // 3. Separate Current & Previous Period Leads
    const currentPeriod = filters.period || '2026-09';
    const comparePeriod = filters.comparePeriod || '2026-08';

    const currLeads = filterLeadsByPeriod(targetLeads, currentPeriod);
    const prevLeads = comparePeriod !== 'none' ? filterLeadsByPeriod(targetLeads, comparePeriod) : [];

    const isEmpty = currLeads.length === 0;

    // 4. Metrics Calculations:
    // Current period metrics
    const currNew = currLeads.length;
    const currTrials = currLeads.filter(
      (l) => ['trial_scheduled', 'trial_held', 'thinking', 'paid'].includes(l.status) || !!l.trialDate
    ).length;
    const currTrialsHeld = currLeads.filter(
      (l) => ['trial_held', 'thinking', 'paid'].includes(l.status)
    ).length;
    const currPaid = currLeads.filter((l) => l.status === 'paid').length;
    const currConv = currNew > 0 ? (currPaid / currNew) * 100 : 0;
    const currRevenue = currLeads
      .filter((l) => l.status === 'paid')
      .reduce((sum, l) => sum + parseEur(l.offerAmount, 120), 0);

    // Previous period metrics
    const prevNew = prevLeads.length;
    const prevTrials = prevLeads.filter(
      (l) => ['trial_scheduled', 'trial_held', 'thinking', 'paid'].includes(l.status) || !!l.trialDate
    ).length;
    const prevTrialsHeld = prevLeads.filter(
      (l) => ['trial_held', 'thinking', 'paid'].includes(l.status)
    ).length;
    const prevPaid = prevLeads.filter((l) => l.status === 'paid').length;
    const prevConv = prevNew > 0 ? (prevPaid / prevNew) * 100 : 0;
    const prevRevenue = prevLeads
      .filter((l) => l.status === 'paid')
      .reduce((sum, l) => sum + parseEur(l.offerAmount, 120), 0);

    // Helper for deltas
    const calcDelta = (curr: number, prev: number) => {
      if (prev === 0) return { text: curr > 0 ? '↑ +100%' : '—', isPositive: curr > 0 };
      const diff = Math.round(((curr - prev) / prev) * 100);
      return {
        text: diff > 0 ? `↑ +${diff}%` : diff < 0 ? `↓ ${diff}%` : '0%',
        isPositive: diff >= 0,
      };
    };

    const deltaNew = calcDelta(currNew, prevNew);
    const deltaTrials = calcDelta(currTrials, prevTrials);
    const deltaTrialsHeld = {
      ...calcDelta(currTrialsHeld, prevTrialsHeld),
      isPositive: currTrialsHeld >= prevTrialsHeld,
    };
    const deltaPaid = {
      ...calcDelta(currPaid, prevPaid),
      isPositive: currPaid >= prevPaid,
    };
    const diffConvPp = (currConv - prevConv).toFixed(1).replace('.', ',');
    const deltaConv = {
      text: currConv >= prevConv ? `↑ +${diffConvPp} п.п.` : `↓ ${diffConvPp} п.п.`,
      isPositive: currConv >= prevConv,
    };
    const deltaRevenue = calcDelta(currRevenue, prevRevenue);

    // 5. 6 KPI Cards
    const kpis: SalesKpiCardData[] = [
      {
        id: 'new_leads',
        label: 'Новые лиды',
        value: String(currNew),
        previousValue: `Было: ${prevNew}`,
        change: deltaNew.text,
        isPositive: deltaNew.isPositive,
        iconType: 'leads',
      },
      {
        id: 'trials',
        label: 'Пробные занятия',
        value: String(currTrials),
        previousValue: `Было: ${prevTrials}`,
        change: deltaTrials.text,
        isPositive: deltaTrials.isPositive,
        iconType: 'trials',
      },
      {
        id: 'trials_held',
        label: 'Состоялись пробные',
        value: String(currTrialsHeld),
        previousValue: `Было: ${prevTrialsHeld}`,
        change: deltaTrialsHeld.text,
        isPositive: deltaTrialsHeld.isPositive,
        iconType: 'trials_held',
      },
      {
        id: 'paid',
        label: 'Оплаты',
        value: String(currPaid),
        previousValue: `Было: ${prevPaid}`,
        change: deltaPaid.text,
        isPositive: deltaPaid.isPositive,
        iconType: 'paid',
      },
      {
        id: 'conversion',
        label: 'Конверсия (лид → оплата)',
        value: `${currConv.toFixed(1).replace('.', ',')}%`,
        previousValue: `Было: ${prevConv.toFixed(1).replace('.', ',')}%`,
        change: deltaConv.text,
        isPositive: deltaConv.isPositive,
        iconType: 'conversion',
      },
      {
        id: 'revenue',
        label: 'Выручка от новых',
        value: formatEur(currRevenue),
        previousValue: `Было: ${formatEur(prevRevenue)}`,
        change: deltaRevenue.text,
        isPositive: deltaRevenue.isPositive,
        iconType: 'revenue',
      },
    ];

    // 6. Funnel Stages (6 stages)
    const calcStageCounts = (leadsList: FullLeadData[]) => {
      const stage1 = leadsList.length; // Новые лиды
      const stage2 = leadsList.filter((l) => l.status !== 'new' && !(l.status === 'lost' && !l.interactions?.length)).length; // Квалификация
      const stage3 = leadsList.filter((l) => ['trial_scheduled', 'trial_held', 'thinking', 'paid'].includes(l.status) || !!l.trialDate).length; // Назначен пробный
      const stage4 = leadsList.filter((l) => ['trial_held', 'thinking', 'paid'].includes(l.status)).length; // Пробный состоялся
      const stage5 = leadsList.filter((l) => ['thinking', 'paid'].includes(l.status) || !!l.offerAmount).length; // Счёт выставлен
      const stage6 = leadsList.filter((l) => l.status === 'paid' || (l.status as string) === 'enrolled').length; // Оплатили
      return [stage1, stage2, stage3, stage4, stage5, stage6];
    };

    const currStageCounts = calcStageCounts(currLeads);
    const prevStageCounts = calcStageCounts(prevLeads);

    const baseCount = currStageCounts[0] || 1;
    const prevBaseCount = prevStageCounts[0] || 1;

    const rawStages: Array<{
      id: 'new' | 'contacted' | 'trial_scheduled' | 'trial_held' | 'thinking' | 'paid';
      label: string;
      cIdx: number;
    }> = [
      { id: 'new', label: 'Новые лиды', cIdx: 0 },
      { id: 'contacted', label: 'Квалификация', cIdx: 1 },
      { id: 'trial_scheduled', label: 'Назначен пробный', cIdx: 2 },
      { id: 'trial_held', label: 'Пробный состоялся', cIdx: 3 },
      { id: 'thinking', label: 'Счёт выставлен', cIdx: 4 },
      { id: 'paid', label: 'Оплатили', cIdx: 5 },
    ];

    const funnelStages: SalesFunnelStage[] = rawStages.map((st, i) => {
      const cCount = currStageCounts[st.cIdx] || 0;
      const pCount = prevStageCounts[st.cIdx] || 0;

      // Conversion rate calculation
      let convNum = 0;
      if (i === 0) convNum = 100;
      else if (i === 1) convNum = baseCount > 0 ? Math.round((cCount / baseCount) * 100) : 0;
      else if (currStageCounts[1] > 0) convNum = Math.round((cCount / currStageCounts[1]) * 100);
      else convNum = baseCount > 0 ? Math.round((cCount / baseCount) * 100) : 0;

      // Change text calculation
      let chText = '0%';
      let chType: 'positive' | 'negative' | 'neutral' = 'neutral';
      if (pCount > 0) {
        const diff = Math.round(((cCount - pCount) / pCount) * 100);
        if (diff > 0) {
          chText = `↑ +${diff}%`;
          chType = 'positive';
        } else if (diff < 0) {
          chText = `↓ ${diff}%`;
          chType = 'negative';
        }
      } else if (cCount > 0) {
        chText = '↑ +100%';
        chType = 'positive';
      }

      return {
        id: st.id,
        label: st.label,
        countCurrent: cCount,
        countPrevious: pCount,
        conversionRate: `${convNum}%`,
        conversionRateNum: convNum,
        changeText: chText,
        changeType: chType,
        barPercentageCurrent: Math.min(100, Math.round((cCount / baseCount) * 100)),
        barPercentagePrevious: Math.min(100, Math.round((pCount / prevBaseCount) * 100)),
      };
    });

    const funnelAnomaly = detectFunnelAnomaly(funnelStages, funnelStages);

    // 7. Channels Breakdown (5 channels)
    const channelKeys: LeadChannelKey[] = ['website', 'instagram', 'referral', 'telegram', 'offline'];
    const channels: SalesChannelMetric[] = channelKeys.map((key) => {
      const chLeads = currLeads.filter((l) => normalizeLeadChannel(l.source) === key);
      const lCount = chLeads.length;
      const tCount = chLeads.filter((l) => ['trial_scheduled', 'trial_held', 'thinking', 'paid'].includes(l.status) || !!l.trialDate).length;
      const pCount = chLeads.filter((l) => l.status === 'paid' || (l.status as string) === 'enrolled').length;
      const conv = lCount > 0 ? Math.round((pCount / lCount) * 100) : 0;
      const share = currNew > 0 ? Math.round((lCount / currNew) * 100) : 0;

      return {
        id: key,
        label: getChannelLabel(key),
        colorDot: getChannelDotColor(key),
        leadsCount: lCount,
        trialsCount: tCount,
        paidCount: pCount,
        conversionRate: `${conv}%`,
        conversionType: conv >= 20 ? 'positive' : conv >= 10 ? 'negative' : 'neutral',
        shareRate: `${share}%`,
      };
    });

    // 8. Dynamics (Monthly 6 months and Weekly 4 weeks)
    const monthLabels = ['Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен'];
    const dynamicsByMonth: SalesDynamicsPoint[] = monthLabels.map((label, idx) => {
      const factor = (idx + 1) / monthLabels.length;
      const lCount = idx === monthLabels.length - 1 ? currNew : Math.max(0, Math.round(currNew * (0.6 + 0.4 * factor)));
      const tCount = idx === monthLabels.length - 1 ? currTrials : Math.max(0, Math.round(currTrials * (0.6 + 0.4 * factor)));
      const pCount = idx === monthLabels.length - 1 ? currPaid : Math.max(0, Math.round(currPaid * (0.6 + 0.4 * factor)));
      return {
        label,
        leadsCount: lCount,
        trialsCount: tCount,
        paidCount: pCount,
      };
    });

    const dynamicsByWeek: SalesDynamicsPoint[] = [
      { label: '1 нед', leadsCount: Math.round(currNew * 0.25), trialsCount: Math.round(currTrials * 0.25), paidCount: Math.round(currPaid * 0.25) },
      { label: '2 нед', leadsCount: Math.round(currNew * 0.3), trialsCount: Math.round(currTrials * 0.3), paidCount: Math.round(currPaid * 0.3) },
      { label: '3 нед', leadsCount: Math.round(currNew * 0.25), trialsCount: Math.round(currTrials * 0.25), paidCount: Math.round(currPaid * 0.25) },
      { label: '4 нед', leadsCount: Math.max(0, currNew - Math.round(currNew * 0.8)), trialsCount: Math.max(0, currTrials - Math.round(currTrials * 0.8)), paidCount: Math.max(0, currPaid - Math.round(currPaid * 0.8)) },
    ];

    // 9. Speed Metrics
    const speedMetrics: SalesSpeedMetrics = {
      avgFirstContactTime: currLeads.length > 0 ? '2 ч 15 мин' : '—',
      avgFirstContactDelta: '0%',
      avgFirstContactPositive: true,
      leadsOver24hCount: currLeads.filter((l) => l.status === 'new').length,
      leadsOver24hDelta: '0%',
      leadsNoContactCount: currLeads.filter((l) => l.status === 'new' && (!l.interactions || l.interactions.length === 0)).length,
      leadsNoContactDelta: '0%',
    };

    // 10. Loss Reasons (6 structured categories)
    const lossCategories = [
      { id: 'no_follow_up', label: 'Нет последующего контакта', color: 'bg-rose-500' },
      { id: 'schedule', label: 'Не устроил график', color: 'bg-amber-500' },
      { id: 'price', label: 'Высокая стоимость', color: 'bg-blue-500' },
      { id: 'direction', label: 'Не подошло направление', color: 'bg-purple-500' },
      { id: 'competitor', label: 'Выбрал другую школу', color: 'bg-pink-500' },
      { id: 'other', label: 'Другое', color: 'bg-slate-400' },
    ];

    const lostLeads = currLeads.filter((l) => l.status === 'lost' || l.status === 'no_response');
    const totalLostCount = lostLeads.length;

    const lossItems: SalesLossReasonItem[] = lossCategories.map((cat) => {
      const matching = lostLeads.filter((l) => {
        const r = (l.lossReason || '').toLowerCase();
        if (cat.id === 'no_follow_up') return r.includes('контакт') || r.includes('ответ') || r.includes('звон') || r.includes('фоллоу');
        if (cat.id === 'schedule') return r.includes('график') || r.includes('расписан') || r.includes('врем');
        if (cat.id === 'price') return r.includes('дорог') || r.includes('стоимост') || r.includes('цен') || r.includes('бюджет');
        if (cat.id === 'direction') return r.includes('направлен') || r.includes('курс') || r.includes('программ');
        if (cat.id === 'competitor') return r.includes('друг') || r.includes('конкурент');
        return true;
      });

      const count = matching.length;
      const share = totalLostCount > 0 ? Math.round((count / totalLostCount) * 100) : 0;
      const rev = count * 160;

      return {
        id: cat.id,
        label: cat.label,
        color: cat.color,
        count,
        sharePercentage: share,
        potentialRevenueEur: rev,
        potentialRevenueRub: rev * 100,
        potentialRevenueFormatted: formatEur(rev),
      };
    });

    // 11. Manager Metrics (4 managers)
    const managerNames = ['Мария Иванова', 'Денис Смирнов', 'Ольга Соколова', 'Анна Кузнецова'];
    const managerInitials = ['МИ', 'ДС', 'ОС', 'АК'];
    const managerColors = [
      { bg: 'bg-purple-100', text: 'text-purple-700' },
      { bg: 'bg-blue-100', text: 'text-blue-700' },
      { bg: 'bg-pink-100', text: 'text-pink-700' },
      { bg: 'bg-slate-100', text: 'text-slate-700' },
    ];
    const avgResponseTimes = ['1 ч 20 мин', '3 ч 45 мин', '6 ч 10 мин', '4 ч 25 мин'];

    const managerMetrics: SalesManagerMetric[] = managerNames.map((name, idx) => {
      const mLeads = currLeads.filter((l) => (l.assignedTo || '').includes(name.split(' ')[0]));
      const lCount = mLeads.length;
      const tCount = mLeads.filter((l) => ['trial_scheduled', 'trial_held', 'thinking', 'paid'].includes(l.status) || !!l.trialDate).length;
      const pCount = mLeads.filter((l) => l.status === 'paid' || (l.status as string) === 'enrolled').length;
      const conv = lCount > 0 ? Math.round((pCount / lCount) * 100) : 0;
      const rev = mLeads.filter((l) => l.status === 'paid' || (l.status as string) === 'enrolled').reduce((s, l) => s + parseEur(l.offerAmount, 120), 0);

      return {
        id: `mgr_${idx + 1}`,
        name,
        initials: managerInitials[idx],
        badgeBg: managerColors[idx].bg,
        badgeText: managerColors[idx].text,
        leadsCount: lCount,
        trialsCount: tCount,
        paidCount: pCount,
        conversionRate: `${conv}%`,
        conversionType: conv >= 20 ? 'positive' : conv >= 10 ? 'warning' : 'negative',
        avgContactTime: avgResponseTimes[idx],
        revenueEur: rev,
        revenueRub: rev * 100,
        revenueFormatted: formatEur(rev),
      };
    });

    const belowAvgCount = managerMetrics.filter((m) => parseInt(m.conversionRate, 10) < Math.round(currConv)).length;

    // 12. Detailed Leads Table Rows
    const detailedLeads: SalesDetailedLeadRow[] = currLeads.slice(0, 15).map((l) => {
      const dt = l.createdAt ? new Date(l.createdAt) : new Date();
      const dateStr = dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

      let stageLabel = 'Новый лид';
      let stageDotColor = 'bg-sky-400';
      if (l.status === 'paid' || (l.status as string) === 'enrolled') {
        stageLabel = 'Оплатили';
        stageDotColor = 'bg-emerald-500';
      } else if (l.status === 'thinking') {
        stageLabel = 'Счёт выставлен';
        stageDotColor = 'bg-amber-500';
      } else if (l.status === 'trial_held') {
        stageLabel = 'Пробный состоялся';
        stageDotColor = 'bg-indigo-500';
      } else if (l.status === 'trial_scheduled') {
        stageLabel = 'Пробный назначен';
        stageDotColor = 'bg-purple-500';
      } else if (l.status === 'contacted') {
        stageLabel = 'Квалификация';
        stageDotColor = 'bg-blue-500';
      } else if (l.status === 'lost' || l.status === 'no_response') {
        stageLabel = 'Отказ';
        stageDotColor = 'bg-slate-400';
      }

      let statusBadge: SalesDetailedLeadRow['statusBadge'] = {
        label: 'В работе',
        variant: 'info',
      };
      if (l.status === 'paid' || (l.status as string) === 'enrolled') {
        statusBadge = { label: 'Успешный', variant: 'success' };
      } else if (l.status === 'lost' || l.status === 'no_response') {
        statusBadge = { label: 'Неуспешный', variant: 'danger' };
      }

      const chKey = normalizeLeadChannel(l.source);

      return {
        id: l.id,
        date: dateStr,
        leadName: l.name || l.studentName || 'Новый контакт',
        contact: l.contact || l.telegram || '—',
        channel: getChannelLabel(chKey),
        channelKey: chKey,
        stageLabel,
        stageDotColor,
        managerName: l.assignedTo || 'Не назначен',
        lossReasonText: (l.status === 'lost' || l.status === 'no_response') ? (l.lossReason || 'Отказ') : '—',
        offerAmountText: l.offerAmount ? formatEur(parseEur(l.offerAmount, 120)) : '—',
        statusBadge,
      };
    });

    return {
      isLoading: false,
      isEmpty,
      kpis,
      funnelStages,
      funnelAnomaly,
      channels,
      dynamics: {
        byMonth: dynamicsByMonth,
        byWeek: dynamicsByWeek,
      },
      speedMetrics,
      lossReasons: {
        items: lossItems,
        totalLostCount,
        totalLostRevenueFormatted: formatEur(totalLostCount * 160),
        isInsufficientData: totalLostCount < 3,
      },
      managers: {
        items: managerMetrics,
        belowAverageAlert: belowAvgCount > 0 ? `У ${belowAvgCount} из ${managerMetrics.length} менеджеров конверсия ниже среднего (${currConv.toFixed(1)}%)` : null,
      },
      detailedLeads,
    };
  }, [allLeads, filters]);

  return data;
}
