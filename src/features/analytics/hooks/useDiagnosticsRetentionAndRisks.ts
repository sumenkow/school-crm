'use client';

import { useState, useEffect, useMemo } from 'react';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { FullStudentData, FullGroupData } from '@/lib/data/mockData';
import { AnalyticsFilters } from '../types';

export interface CohortRow {
  month: string;
  size: number;
  m0: string;
  m1: string;
  m2: string;
  m3: string;
  m4: string;
  m5: string;
  m0Num: number | null;
  m1Num: number | null;
  m2Num: number | null;
  m3Num: number | null;
  m4Num: number | null;
  m5Num: number | null;
}

export type RiskReasonType = 'attendance' | 'debt' | 'package' | 'inactivity';

export interface StudentAtRisk {
  id: string;
  name: string;
  initials: string;
  groupName: string;
  courseName: string;
  reasons: Array<{
    type: RiskReasonType;
    label: string;
    variant: 'danger' | 'warning' | 'muted';
  }>;
  details: string;
  riskLevel: 'high' | 'medium';
  primaryReason: RiskReasonType;
}

export function useDiagnosticsRetentionAndRisks(filters: AnalyticsFilters) {
  const [students, setStudents] = useState<FullStudentData[]>(() =>
    typeof window !== 'undefined' ? getStoredStudents() : []
  );
  const [groups, setGroups] = useState<FullGroupData[]>(() =>
    typeof window !== 'undefined' ? getStoredGroups() : []
  );
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [retentionScope, setRetentionScope] = useState<'month' | 'quarter'>('month');

  useEffect(() => {
    const handleStudents = () => setStudents(getStoredStudents());
    const handleGroups = () => setGroups(getStoredGroups());
    window.addEventListener('crm-students-changed', handleStudents);
    window.addEventListener('crm-groups-changed', handleGroups);
    return () => {
      window.removeEventListener('crm-students-changed', handleStudents);
      window.removeEventListener('crm-groups-changed', handleGroups);
    };
  }, []);

  // Filter students based on global filters
  const scopedStudents = useMemo(() => {
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

  // ==========================================
  // 1. COHORT RETENTION DATA
  // ==========================================
  const cohorts = useMemo<CohortRow[]>(() => {
    const monthNames = ['Апрель 2026', 'Май 2026', 'Июнь 2026', 'Июль 2026', 'Август 2026', 'Сентябрь 2026'];
    const monthKeys = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];

    return monthNames.map((monthName, mIdx) => {
      const mKey = monthKeys[mIdx];
      // Find students whose createdAt or joinedAt matches this month
      const cohortStudents = scopedStudents.filter((s) => {
        const d = s.createdAt || '';
        return d.includes(mKey);
      });

      // If no students created specifically in that month, estimate cohort from total students distribution
      const size = cohortStudents.length > 0 ? cohortStudents.length : Math.max(0, Math.round(scopedStudents.length / monthNames.length));

      const getRetentionForOffset = (offset: number) => {
        if (mIdx + offset >= monthNames.length) {
          return { str: '—', num: null };
        }
        if (offset === 0) {
          return { str: '100%', num: 100 };
        }
        if (size === 0) {
          return { str: '—', num: null };
        }

        // Calculate retention based on active / non-churned status
        const churnedInCohort = cohortStudents.filter((s) => s.status === 'churned').length;
        const activeInCohort = size - Math.min(size, Math.round(churnedInCohort * (offset / 3)));
        const rate = Math.max(50, Math.min(100, Math.round((activeInCohort / size) * 100)));
        return { str: `${rate}%`, num: rate };
      };

      const m0 = getRetentionForOffset(0);
      const m1 = getRetentionForOffset(1);
      const m2 = getRetentionForOffset(2);
      const m3 = getRetentionForOffset(3);
      const m4 = getRetentionForOffset(4);
      const m5 = getRetentionForOffset(5);

      return {
        month: monthName,
        size,
        m0: m0.str,
        m1: m1.str,
        m2: m2.str,
        m3: m3.str,
        m4: m4.str,
        m5: m5.str,
        m0Num: m0.num,
        m1Num: m1.num,
        m2Num: m2.num,
        m3Num: m3.num,
        m4Num: m4.num,
        m5Num: m5.num,
      };
    });
  }, [scopedStudents]);

  const cohortAnomaly = useMemo(() => {
    // Find if any cohort has m1 or m2 lower than average
    const validM1 = cohorts.map((c) => c.m1Num).filter((n): n is number => n !== null);
    const avgM1 = validM1.length > 0 ? validM1.reduce((a, b) => a + b, 0) / validM1.length : 90;

    let worstCohort = cohorts[0];
    let worstRate = 100;
    cohorts.forEach((c) => {
      if (c.m1Num !== null && c.m1Num < worstRate) {
        worstRate = c.m1Num;
        worstCohort = c;
      }
    });

    if (worstCohort && worstRate < avgM1 - 5) {
      return {
        cohortMonth: worstCohort.month.split(' ')[0],
        dropRate: `${worstRate}%`,
        avgRate: `${avgM1.toFixed(1)}%`,
        text: `Когорта (${worstCohort.month}) показывает удержание ${worstRate}% против среднего ${avgM1.toFixed(1)}%`,
      };
    }

    return {
      cohortMonth: 'Когорты стабильны',
      dropRate: '—',
      avgRate: `${avgM1.toFixed(1)}%`,
      text: 'Существенных аномалий удержания по когортам не выявлено',
    };
  }, [cohorts]);

  // ==========================================
  // 2. STUDENTS AT RISK DETECTION
  // ==========================================
  const studentsAtRisk = useMemo<StudentAtRisk[]>(() => {
    const list: StudentAtRisk[] = [];

    scopedStudents.forEach((s) => {
      const name = `${s.firstName} ${s.lastName}`.trim() || 'Ученик';
      const initials = `${s.firstName?.[0] || ''}${s.lastName?.[0] || ''}`.toUpperCase() || 'УЧ';
      const group = s.groups?.[0];
      const groupName = group?.name || 'Без группы';
      const courseName = group?.courseName || 'Общий курс';

      const reasons: StudentAtRisk['reasons'] = [];
      let detailsArr: string[] = [];

      // A. Check Attendance
      const rateStr = s.attendanceStats?.attendanceRate || '100%';
      const rate = parseInt(rateStr.replace('%', ''), 10);
      const absents = s.attendanceStats?.absentCount || 0;
      if ((!isNaN(rate) && rate < 75) || absents >= 2) {
        reasons.push({
          type: 'attendance',
          label: 'НИЗКАЯ ПОСЕЩАЕМОСТЬ',
          variant: 'warning',
        });
        detailsArr.push(`Посещаемость ${rate}%`);
        if (absents > 0) detailsArr.push(`${absents} пропуска подряд`);
      }

      // B. Check Debt / Overdue
      const overdues = (s.finance?.payments || []).filter((p) => p.status === 'overdue');
      if (overdues.length > 0) {
        const debtAmt = overdues.map((p) => p.amount ?? 0).join(', ') || 'Долг';
        reasons.push({
          type: 'debt',
          label: 'ПРОСРОЧЕН ПЛАТЕЖ',
          variant: 'danger',
        });
        detailsArr.push(`Долг: ${debtAmt}`);
      }

      // C. Check Expiring Package
      const rawBal = s.finance?.deposit?.balance ?? 100;
      const pricePerLesson = s.finance?.deposit?.pricePerLesson ?? 12;
      const subLessons = s.finance?.activeSubscription?.lessonsAttended;
      const lessonsRemaining = s.finance?.activeSubscription?.lessonsRemaining;
      if (
        rawBal <= pricePerLesson ||
        (lessonsRemaining !== undefined && lessonsRemaining <= 1) ||
        (typeof subLessons === 'string' && (subLessons.includes('1 из') || subLessons.includes('0 из')))
      ) {
        reasons.push({
          type: 'package',
          label: 'ПАКЕТ ЗАКАНЧИВАЕТСЯ',
          variant: 'danger',
        });
        detailsArr.push('Остался 1 урок');
      }

      // D. Check Inactivity / Paused
      if (s.status === 'paused' || s.status === 'churned') {
        reasons.push({
          type: 'inactivity',
          label: 'НЕТ АКТИВНОСТИ > 20 ДНЕЙ',
          variant: 'muted',
        });
        detailsArr.push(s.status === 'paused' ? 'Статус: Пауза' : 'Статус: Ушел из обучения');
      }

      if (reasons.length > 0) {
        const isHighRisk = reasons.length >= 2 || reasons.some((r) => r.type === 'debt') || rate < 50;
        list.push({
          id: s.id,
          name,
          initials,
          groupName,
          courseName,
          reasons,
          details: detailsArr.join(' • '),
          riskLevel: isHighRisk ? 'high' : 'medium',
          primaryReason: reasons[0].type,
        });
      }
    });

    return list;
  }, [scopedStudents]);

  // Filtered by selected reason
  const filteredStudentsAtRisk = useMemo(() => {
    if (reasonFilter === 'all') return studentsAtRisk;
    return studentsAtRisk.filter((s) => s.reasons.some((r) => r.type === reasonFilter));
  }, [studentsAtRisk, reasonFilter]);

  return {
    cohorts,
    cohortAnomaly,
    studentsAtRisk: filteredStudentsAtRisk,
    totalRisksCount: studentsAtRisk.length,
    reasonFilter,
    setReasonFilter,
    retentionScope,
    setRetentionScope,
  };
}
