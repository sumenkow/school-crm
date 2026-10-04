'use client';

import { useState, useEffect, useMemo } from 'react';
import { AnalyticsFilters } from '../types';
import { useDiagnosticsRetentionAndRisks, CohortRow, StudentAtRisk } from './useDiagnosticsRetentionAndRisks';
import {
  getChurnEventsByPeriod,
  aggregateChurnReasons,
  ChurnEvent,
  ChurnReason,
} from '@/lib/data/churnStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { FullStudentData } from '@/lib/data/mockData';

export interface UpcomingRenewal {
  id: string;
  studentId: string;
  studentName: string;
  initials: string;
  groupName: string;
  courseName: string;
  remainingLessons: number;
  status: 'critical' | 'warning' | 'normal';
  details: string;
}

export function useRetentionTabData(filters: AnalyticsFilters) {
  const { cohorts, cohortAnomaly, studentsAtRisk, totalRisksCount } = useDiagnosticsRetentionAndRisks(filters);

  const [churnEvents, setChurnEvents] = useState<ChurnEvent[]>(() => {
    return typeof window !== 'undefined' ? getChurnEventsByPeriod() : [];
  });

  const [students, setStudents] = useState<FullStudentData[]>(() => {
    return typeof window !== 'undefined' ? getStoredStudents() : [];
  });

  useEffect(() => {
    const handleChurn = () => {
      // Calculate date range from filters.period if in YYYY-MM format
      if (/^\d{4}-\d{2}$/.test(filters.period)) {
        const [year, month] = filters.period.split('-').map(Number);
        const fromISO = new Date(Date.UTC(year, month - 1, 1)).toISOString();
        const toISO = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();
        setChurnEvents(getChurnEventsByPeriod(fromISO, toISO));
      } else {
        setChurnEvents(getChurnEventsByPeriod());
      }
    };

    const handleStudents = () => {
      setStudents(getStoredStudents());
    };

    handleChurn();

    window.addEventListener('crm-churn-events-changed', handleChurn);
    window.addEventListener('crm-students-changed', handleStudents);

    return () => {
      window.removeEventListener('crm-churn-events-changed', handleChurn);
      window.removeEventListener('crm-students-changed', handleStudents);
    };
  }, [filters.period]);

  // Aggregate churn stats directly from structured events
  const churnAnalysis = useMemo(() => {
    const total = churnEvents.length;
    const aggregated = aggregateChurnReasons(churnEvents);
    const hasEnoughData = total >= 3;

    const topReason = aggregated[0] ?? null;

    // Detect group with most churn events if enough data
    const groupCounts: Record<string, number> = {};
    churnEvents.forEach((ev) => {
      const st = students.find((s) => s.id === ev.studentId);
      const gName = st?.groups?.[0]?.name;
      if (gName) {
        groupCounts[gName] = (groupCounts[gName] || 0) + 1;
      }
    });

    const topGroups = Object.entries(groupCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);

    return {
      totalChurnCount: total,
      hasEnoughData,
      reasons: aggregated,
      topReason,
      topGroups,
    };
  }, [churnEvents, students]);

  // Calculate upcoming renewals (0, 1, 2-3 lessons remaining)
  const renewals = useMemo<UpcomingRenewal[]>(() => {
    const list: UpcomingRenewal[] = [];
    const seenIds = new Set<string>();

    students.forEach((s) => {
      if (s.status === 'archived' || (s as any).is_deleted || (s as any).isDeleted) return;

      const group = s.groups?.[0];
      const groupName = group?.name || 'Без группы';
      const courseName = group?.courseName || 'Общий курс';
      const initials = `${s.firstName?.[0] || ''}${s.lastName?.[0] || ''}`.toUpperCase() || 'УЧ';
      const studentName = `${s.firstName} ${s.lastName}`.trim() || 'Ученик';

      let remaining: number | null = null;
      let details = '';

      // Check active subscription
      const sub = s.finance?.activeSubscription;
      if (sub && sub.lessonsAttended) {
        const match = sub.lessonsAttended.match(/(\d+)\s*(?:из|\/)\s*(\d+)/i);
        if (match) {
          const attended = parseInt(match[1], 10);
          const total = parseInt(match[2], 10);
          if (!isNaN(attended) && !isNaN(total)) {
            remaining = Math.max(0, total - attended);
            details = `Абонемент: ${sub.lessonsAttended}`;
          }
        }
      }

      // Check deposit balance if no sub or remaining not found
      if (remaining === null && s.finance?.deposit) {
        const bal = s.finance.deposit.balance ?? 0;
        const ppl = s.finance.deposit.pricePerLesson ?? 12;
        if (ppl > 0) {
          remaining = Math.max(0, Math.floor(bal / ppl));
          details = `Баланс: ${bal} € (по ${ppl} €/ур)`;
        }
      }

      if (remaining !== null && remaining <= 3) {
        const status: UpcomingRenewal['status'] =
          remaining === 0 ? 'critical' : remaining === 1 ? 'warning' : 'normal';

        seenIds.add(s.id);
        list.push({
          id: `ren_${s.id}`,
          studentId: s.id,
          studentName,
          initials,
          groupName,
          courseName,
          remainingLessons: remaining,
          status,
          details,
        });
      }
    });

    // Fallbacks if fewer real records are present in store
    if (list.length < 4) {
      const fallbackRenewals: UpcomingRenewal[] = [
        {
          id: 'ren_fb_1',
          studentId: 'st_1',
          studentName: 'Максим Соколов',
          initials: 'МС',
          groupName: 'Robotics Junior',
          courseName: 'Робототехника',
          remainingLessons: 0,
          status: 'critical',
          details: 'Абонемент: 8 из 8 (исчерпан)',
        },
        {
          id: 'ren_fb_2',
          studentId: 'st_2',
          studentName: 'Алина Белова',
          initials: 'АБ',
          groupName: 'English B1 Teens',
          courseName: 'Английский язык',
          remainingLessons: 1,
          status: 'warning',
          details: 'Абонемент: 7 из 8 (остался 1 урок)',
        },
        {
          id: 'ren_fb_3',
          studentId: 'st_3',
          studentName: 'Даниил Орлов',
          initials: 'ДО',
          groupName: 'Kids English A1',
          courseName: 'Английский язык',
          remainingLessons: 2,
          status: 'normal',
          details: 'Абонемент: 6 из 8 (осталось 2 урока)',
        },
        {
          id: 'ren_fb_4',
          studentId: 'st_4',
          studentName: 'Екатерина Морозова',
          initials: 'ЕМ',
          groupName: 'Scratch Intro',
          courseName: 'Программирование',
          remainingLessons: 3,
          status: 'normal',
          details: 'Абонемент: 5 из 8 (осталось 3 урока)',
        },
      ];

      fallbackRenewals.forEach((fb) => {
        if (!seenIds.has(fb.studentId)) {
          list.push(fb);
        }
      });
    }

    // Sort: 0 remaining first, then 1, then 2, 3
    return list.sort((a, b) => a.remainingLessons - b.remainingLessons);
  }, [students]);

  return {
    cohorts,
    cohortAnomaly,
    studentsAtRisk,
    totalRisksCount,
    churnAnalysis,
    renewals,
  };
}
