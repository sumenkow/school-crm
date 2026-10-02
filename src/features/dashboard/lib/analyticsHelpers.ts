import { FullPaymentData, FullLeadData, FullGroupData, FullStudentData } from '@/lib/data/mockData';
import { parsePaymentAmountEUR, getEurRubRate } from '@/lib/data/currencyHelper';

export type AnalyticsPeriod = '6m' | '12m' | 'year';

export const MONTH_NAMES_RU = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
];

export const FULL_MONTH_NAMES_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

export function parseDateSafe(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (trimmed.includes('.')) {
    const parts = trimmed.split(' ')[0].split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

export interface MonthBucket {
  year: number;
  month: number; // 0-11
  key: string;   // "2026-09"
  label: string; // "Сен 2026" or "Сен"
}

export function getPeriodMonthBuckets(period: AnalyticsPeriod, refDate = new Date()): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  const currentYear = refDate.getFullYear();
  const currentMonth = refDate.getMonth();

  if (period === 'year') {
    // Current year months from 0 to currentMonth
    for (let m = 0; m <= currentMonth; m++) {
      buckets.push({
        year: currentYear,
        month: m,
        key: `${currentYear}-${String(m + 1).padStart(2, '0')}`,
        label: MONTH_NAMES_RU[m],
      });
    }
  } else {
    const count = period === '6m' ? 6 : 12;
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      buckets.push({
        year: y,
        month: m,
        key: `${y}-${String(m + 1).padStart(2, '0')}`,
        label: `${MONTH_NAMES_RU[m]}${y !== currentYear ? ` '${String(y).slice(2)}` : ''}`,
      });
    }
  }

  return buckets;
}

export interface MonthlyRevenuePoint {
  key: string;
  label: string;
  revenueEur: number;
  count: number;
}

export interface RevenueAnalyticsResult {
  data: MonthlyRevenuePoint[];
  totalRevenueEur: number;
  avgMonthlyRevenueEur: number;
  previousPeriodTotalEur: number | null;
  deltaPercent: number | null;
}

export function aggregateRevenueByPeriod(
  payments: FullPaymentData[],
  period: AnalyticsPeriod,
  refDate = new Date()
): RevenueAnalyticsResult {
  const rate = getEurRubRate();
  const buckets = getPeriodMonthBuckets(period, refDate);
  const bucketMap = new Map<string, { revenueEur: number; count: number }>();

  buckets.forEach(b => {
    bucketMap.set(b.key, { revenueEur: 0, count: 0 });
  });

  // Aggregate current period
  payments.forEach(p => {
    if (p.status !== 'paid') return;
    const d = parseDateSafe(p.paymentDate);
    if (!d) return;

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (bucketMap.has(key)) {
      const entry = bucketMap.get(key)!;
      const amtEur = parsePaymentAmountEUR(p.amount, rate);
      entry.revenueEur += amtEur;
      entry.count += 1;
    }
  });

  const data: MonthlyRevenuePoint[] = buckets.map(b => {
    const entry = bucketMap.get(b.key) || { revenueEur: 0, count: 0 };
    return {
      key: b.key,
      label: b.label,
      revenueEur: Math.round(entry.revenueEur * 100) / 100,
      count: entry.count,
    };
  });

  const totalRevenueEur = Math.round(data.reduce((sum, pt) => sum + pt.revenueEur, 0));
  const activeMonths = data.filter(d => d.count > 0).length || 1;
  const avgMonthlyRevenueEur = Math.round(totalRevenueEur / (data.length || 1));

  // Compute previous period if applicable
  let previousPeriodTotalEur: number | null = null;
  let deltaPercent: number | null = null;

  if (period === '6m' || period === '12m') {
    const count = period === '6m' ? 6 : 12;
    const prevBuckets: string[] = [];
    const currentYear = refDate.getFullYear();
    const currentMonth = refDate.getMonth();

    for (let i = count * 2 - 1; i >= count; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      prevBuckets.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    let prevSum = 0;
    let hasPrevData = false;

    payments.forEach(p => {
      if (p.status !== 'paid') return;
      const d = parseDateSafe(p.paymentDate);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (prevBuckets.includes(key)) {
        hasPrevData = true;
        prevSum += parsePaymentAmountEUR(p.amount, rate);
      }
    });

    if (hasPrevData && prevSum > 0) {
      previousPeriodTotalEur = Math.round(prevSum);
      deltaPercent = Math.round(((totalRevenueEur - prevSum) / prevSum) * 100);
    }
  }

  return {
    data,
    totalRevenueEur,
    avgMonthlyRevenueEur,
    previousPeriodTotalEur,
    deltaPercent,
  };
}

export interface MonthlyLeadsPoint {
  key: string;
  label: string;
  totalLeads: number;
  paidLeads: number;
  conversionRate: number;
}

export interface LeadsAnalyticsResult {
  data: MonthlyLeadsPoint[];
  totalLeads: number;
  totalPaid: number;
  overallConversionRate: number;
}

export function aggregateLeadsByPeriod(
  leads: FullLeadData[],
  period: AnalyticsPeriod,
  refDate = new Date()
): LeadsAnalyticsResult {
  const buckets = getPeriodMonthBuckets(period, refDate);
  const bucketMap = new Map<string, { total: number; paid: number }>();

  buckets.forEach(b => {
    bucketMap.set(b.key, { total: 0, paid: 0 });
  });

  const activeLeads = leads.filter(l => !l.is_deleted && !(l as any).isDeleted);

  activeLeads.forEach(l => {
    const d = parseDateSafe(l.createdAt);
    if (!d) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (bucketMap.has(key)) {
      const entry = bucketMap.get(key)!;
      entry.total += 1;
      if (l.status === 'paid') {
        entry.paid += 1;
      }
    }
  });

  const data: MonthlyLeadsPoint[] = buckets.map(b => {
    const entry = bucketMap.get(b.key) || { total: 0, paid: 0 };
    const conv = entry.total > 0 ? Math.round((entry.paid / entry.total) * 100) : 0;
    return {
      key: b.key,
      label: b.label,
      totalLeads: entry.total,
      paidLeads: entry.paid,
      conversionRate: conv,
    };
  });

  const totalLeads = data.reduce((sum, d) => sum + d.totalLeads, 0);
  const totalPaid = data.reduce((sum, d) => sum + d.paidLeads, 0);
  const overallConversionRate = totalLeads > 0 ? Math.round((totalPaid / totalLeads) * 100) : 0;

  return {
    data,
    totalLeads,
    totalPaid,
    overallConversionRate,
  };
}

export interface GroupOccupancyItem {
  id: string;
  name: string;
  courseName: string;
  enrolled: number;
  capacity: number;
  occupancyPercent: number;
  status: string;
}

export function getTopOccupiedGroups(groups: FullGroupData[], limit = 5): GroupOccupancyItem[] {
  // STRICT CONSTRAINT: Calculate only if the Group entity has capacity and students count fields.
  const validGroups = groups.filter(g => {
    if (g.is_deleted || g.isDeleted) return false;
    if (g.status !== 'active' && g.status !== 'recruiting') return false;
    if (typeof g.capacity !== 'number' || g.capacity <= 0) return false;
    if (!Array.isArray(g.students)) return false;
    return true;
  });

  const items: GroupOccupancyItem[] = validGroups.map(g => {
    const enrolled = g.students.length;
    const capacity = g.capacity;
    const occupancyPercent = Math.min(100, Math.round((enrolled / capacity) * 100));
    return {
      id: g.id,
      name: g.name,
      courseName: g.courseName,
      enrolled,
      capacity,
      occupancyPercent,
      status: g.status,
    };
  });

  // Sort by enrolled / occupancy descending
  items.sort((a, b) => b.occupancyPercent - a.occupancyPercent);

  return items.slice(0, limit);
}
