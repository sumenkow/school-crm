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

// ==========================================
// UNIFIED DASHBOARD METRICS (Single Source of Truth)
// ==========================================

export interface DashboardFinanceSummary {
  paidEur: number;
  paidConfirmed: number;
  expectedEur: number;
  overdueEur: number;
  prevMonthPaidEur: number;
  deltaPercent: number | null;
  prevMonthName: string;
  currentMonthName: string;
  monthlyTarget: number;
  forecast: number;
  goalPercent: number;
  sparklinePoints: number[];
}

export function getDashboardFinanceMetrics(
  payments: FullPaymentData[],
  students: FullStudentData[],
  refDate = new Date()
): DashboardFinanceSummary {
  const rate = getEurRubRate();
  const currentMonth = refDate.getMonth();
  const currentYear = refDate.getFullYear();
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  let paidEur = 0;
  let prevMonthPaidEur = 0;
  let expectedEur = 0;
  let overdueEur = 0;

  // Monthly buckets for last 6 months sparkline
  const monthBuckets: { year: number; month: number; sum: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    monthBuckets.push({ year: d.getFullYear(), month: d.getMonth(), sum: 0 });
  }

  payments.forEach(p => {
    const amt = parsePaymentAmountEUR(p.amount, rate);
    const d = parseDateSafe(p.paymentDate);

    if (p.status === 'paid') {
      if (d) {
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          paidEur += amt;
        } else if (d.getMonth() === prevMonth && d.getFullYear() === prevYear) {
          prevMonthPaidEur += amt;
        }

        // Add to sparkline buckets
        monthBuckets.forEach(b => {
          if (b.month === d.getMonth() && b.year === d.getFullYear()) {
            b.sum += amt;
          }
        });
      } else {
        paidEur += amt;
      }
    } else if (p.status === 'expected' || (p as any).status === 'pending') {
      expectedEur += amt;
    } else if (p.status === 'overdue') {
      overdueEur += amt;
    }
  });

  // Calculate target based on active students
  const activeCount = students.filter(s => s.status === 'active').length || 1;
  const monthlyTarget = Math.max(2500, activeCount * 120);
  const forecast = Math.round(paidEur + expectedEur * 0.8);
  const goalPercent = monthlyTarget > 0 ? Math.min(100, Math.round((forecast / monthlyTarget) * 100)) : 0;

  // Delta calculation: only if prevMonthPaidEur > 0
  let deltaPercent: number | null = null;
  if (prevMonthPaidEur > 0) {
    deltaPercent = Math.round(((paidEur - prevMonthPaidEur) / prevMonthPaidEur) * 100);
  }

  const sparklinePoints = monthBuckets.map(b => Math.round(b.sum * 100) / 100);

  return {
    paidEur: Math.round(paidEur * 100) / 100,
    paidConfirmed: Math.round(paidEur * 100) / 100,
    expectedEur: Math.round(expectedEur * 100) / 100,
    overdueEur: Math.round(overdueEur * 100) / 100,
    prevMonthPaidEur: Math.round(prevMonthPaidEur * 100) / 100,
    deltaPercent,
    prevMonthName: FULL_MONTH_NAMES_RU[prevMonth]?.toLowerCase() || 'предыдущему месяцу',
    currentMonthName: FULL_MONTH_NAMES_RU[currentMonth]?.toLowerCase() || 'текущий месяц',
    monthlyTarget,
    forecast,
    goalPercent,
    sparklinePoints,
  };
}

export function generateSparklinePath(
  data: number[],
  width = 64,
  height = 32,
  padding = 4
): { path: string; lastPoint: { x: number; y: number } | null; hasData: boolean } {
  if (!data || data.length < 2) {
    return {
      path: `M ${padding} ${height - padding} L ${width - padding} ${height - padding}`,
      lastPoint: null,
      hasData: false,
    };
  }

  const maxVal = Math.max(...data);
  const minVal = Math.min(...data);

  if (maxVal === 0 && minVal === 0) {
    return {
      path: `M ${padding} ${height - padding} L ${width - padding} ${height - padding}`,
      lastPoint: null,
      hasData: false,
    };
  }

  const range = maxVal - minVal || 1;
  const stepX = (width - padding * 2) / (data.length - 1);

  const points = data.map((val, idx) => {
    const x = Math.round((padding + idx * stepX) * 10) / 10;
    const normalizedY = (val - minVal) / range;
    const y = Math.round((height - padding - normalizedY * (height - padding * 2)) * 10) / 10;
    return { x, y };
  });

  const lastPoint = points[points.length - 1];

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    path += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  return { path, lastPoint, hasData: true };
}

