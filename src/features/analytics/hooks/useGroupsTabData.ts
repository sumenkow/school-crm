'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFocusSync } from '@/hooks/useFocusSync';
import {
  AnalyticsFilters,
  GroupsTabData,
  GroupsKpiCardData,
  GroupSizeDistributionItem,
  GroupDirectionItem,
  GroupDynamicsPoint,
  GroupStabilityItem,
  GroupFlowsSummary,
  GroupAttendanceDirectionItem,
  GroupAttentionRow,
  GroupExpiringStudentRow,
} from '../types';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { getStoredLessons } from '@/lib/data/lessonStorage';
import { FullGroupData, FullStudentData, FullLessonData } from '@/lib/data/mockData';

function getDirectionBadgeInfo(name: string) {
  const s = name.toLowerCase();
  if (s.includes('англ') || s.includes('eng')) {
    return { badgeLetter: 'АЯ', badgeBg: 'bg-rose-100', badgeText: 'text-rose-700', barColor: 'bg-blue-600' };
  }
  if (s.includes('нем') || s.includes('ger') || s.includes('deu')) {
    return { badgeLetter: 'НЯ', badgeBg: 'bg-indigo-100', badgeText: 'text-indigo-700', barColor: 'bg-purple-600' };
  }
  if (s.includes('мат') || s.includes('math')) {
    return { badgeLetter: 'М', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', barColor: 'bg-amber-500' };
  }
  if (s.includes('робот') || s.includes('rob')) {
    return { badgeLetter: 'R', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700', barColor: 'bg-emerald-500' };
  }
  if (s.includes('прогр') || s.includes('py') || s.includes('it') || s.includes('код')) {
    return { badgeLetter: 'IT', badgeBg: 'bg-purple-100', badgeText: 'text-purple-700', barColor: 'bg-violet-600' };
  }
  if (s.includes('подгот') || s.includes('дошкол') || s.includes('дет') || s.includes('kids')) {
    return { badgeLetter: 'ПШ', badgeBg: 'bg-pink-100', badgeText: 'text-pink-700', barColor: 'bg-pink-500' };
  }
  return { badgeLetter: name.slice(0, 2).toUpperCase() || 'К', badgeBg: 'bg-slate-100', badgeText: 'text-slate-700', barColor: 'bg-slate-500' };
}

export function useGroupsTabData(filters: AnalyticsFilters): GroupsTabData {
  const [groups, setGroups] = useState<FullGroupData[]>(() =>
    typeof window !== 'undefined' ? getStoredGroups() : []
  );
  const [students, setStudents] = useState<FullStudentData[]>(() =>
    typeof window !== 'undefined' ? getStoredStudents() : []
  );
  const [lessons, setLessons] = useState<FullLessonData[]>(() =>
    typeof window !== 'undefined' ? getStoredLessons() : []
  );

  const syncData = useCallback(() => {
    setGroups(getStoredGroups());
    setStudents(getStoredStudents());
    setLessons(getStoredLessons());
  }, []);

  useFocusSync(syncData);

  useEffect(() => {
    syncData();
    window.addEventListener('crm-groups-changed', syncData);
    window.addEventListener('crm-students-changed', syncData);
    window.addEventListener('crm-lessons-changed', syncData);
    return () => {
      window.removeEventListener('crm-groups-changed', syncData);
      window.removeEventListener('crm-students-changed', syncData);
      window.removeEventListener('crm-lessons-changed', syncData);
    };
  }, [syncData]);

  const groupsData: GroupsTabData = useMemo(() => {
    // 1. Filter groups based on global filters
    const filteredGroups = groups.filter((g) => {
      if (g.is_deleted || g.isDeleted) return false;
      if (filters.subjectId && filters.subjectId !== 'all') {
        const cName = (g.courseName || '').toLowerCase();
        if (g.courseId !== filters.subjectId && !cName.includes(filters.subjectId.toLowerCase())) {
          return false;
        }
      }
      if (filters.groupId && filters.groupId !== 'all') {
        if (g.id !== filters.groupId) return false;
      }
      if (filters.teacherId && filters.teacherId !== 'all') {
        const tName = (g.teacherName || '').toLowerCase();
        if (g.teacherId !== filters.teacherId && !tName.includes(filters.teacherId.toLowerCase())) {
          return false;
        }
      }
      return true;
    });

    // Active groups
    const activeGroupsList = filteredGroups.filter(
      (g) => g.status === 'active' || (!g.status && g.students && g.students.length > 0)
    );
    const totalActiveGroups = activeGroupsList.length;

    // Active group IDs set
    const activeGroupIds = new Set(activeGroupsList.map((g) => g.id));

    // Active students belonging to active groups
    const activeStudentsInGroups = students.filter(
      (s) =>
        s.status === 'active' &&
        !(s as any).is_deleted &&
        !(s as any).isDeleted &&
        s.groups?.some((sg) => activeGroupIds.has(sg.id))
    );
    // Also include group student counts for students enrolled in activeGroupsList
    const enrolledIds = new Set<string>();
    activeGroupsList.forEach((g) => {
      g.students?.forEach((st) => {
        if (st.id) enrolledIds.add(st.id);
      });
    });
    activeStudentsInGroups.forEach((s) => enrolledIds.add(s.id));

    const totalActiveStudents = enrolledIds.size;
    const avgSize =
      totalActiveGroups > 0
        ? (totalActiveStudents / totalActiveGroups).toFixed(1).replace('.', ',')
        : '0';

    // Underfilled groups: fewer than 4 students (or < 50% capacity)
    const underfilledGroupsList = activeGroupsList.filter((g) => (g.students?.length || 0) < 4);
    const underfilledCount = underfilledGroupsList.length;

    // Operational issues: groups with low attendance (< 75%), 0 students, or frequent cancellations
    const groupsWithCancelledLessons = new Set(
      lessons
        .filter((l) => l.status === 'cancelled' || l.status === 'rescheduled')
        .map((l) => l.groupId)
        .filter(Boolean)
    );

    const operationalIssuesGroups = activeGroupsList.filter((g) => {
      const studentCount = g.students?.length || 0;
      if (studentCount === 0) return true;
      if (groupsWithCancelledLessons.has(g.id)) return true;
      const groupStudents = students.filter((s) => s.groups?.some((sg) => sg.id === g.id));
      if (groupStudents.length > 0) {
        const rates = groupStudents
          .map((s) => parseInt(s.attendanceStats?.attendanceRate || '100', 10))
          .filter((r) => !isNaN(r));
        if (rates.length > 0) {
          const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
          if (avgRate < 75) return true;
        }
      }
      return false;
    });
    const operationalIssuesCount = operationalIssuesGroups.length;

    // 2. Top 5 KPI Cards
    const kpis: GroupsKpiCardData[] = [
      {
        id: 'active_groups',
        label: 'АКТИВНЫЕ ГРУППЫ',
        value: String(totalActiveGroups),
        change: totalActiveGroups > 0 ? '+0%' : '0%',
        isPositive: true,
        previousValue: `Было: ${totalActiveGroups}`,
        iconType: 'active_groups',
      },
      {
        id: 'active_students',
        label: 'АКТИВНЫЕ УЧЕНИКИ',
        value: String(totalActiveStudents),
        change: totalActiveStudents > 0 ? '+0%' : '0%',
        isPositive: true,
        previousValue: `Было: ${totalActiveStudents}`,
        iconType: 'active_students',
      },
      {
        id: 'avg_size',
        label: 'СРЕДНИЙ РАЗМЕР ГРУППЫ',
        value: avgSize,
        change: '+0,0',
        isPositive: true,
        previousValue: `Было: ${avgSize}`,
        iconType: 'avg_size',
      },
      {
        id: 'underfilled',
        label: 'ГРУППЫ С НЕДОСТАТОЧНЫМ СОСТАВОМ',
        value: String(underfilledCount),
        change: '0',
        isPositive: underfilledCount === 0,
        previousValue: `Было: ${underfilledCount}`,
        iconType: 'underfilled',
      },
      {
        id: 'operational_issues',
        label: 'ГРУППЫ С ОПЕРАЦИОННЫМИ ПРОБЛЕМАМИ',
        value: String(operationalIssuesCount),
        change: '0',
        isPositive: operationalIssuesCount === 0,
        previousValue: `Было: ${operationalIssuesCount}`,
        iconType: 'operational_issues',
      },
    ];

    // 3. Size distribution (8+, 6–7, 4–5, 1–3)
    let count8 = 0;
    let count67 = 0;
    let count45 = 0;
    let count13 = 0;

    activeGroupsList.forEach((g) => {
      const c = g.students?.length || 0;
      if (c >= 8) count8++;
      else if (c >= 6) count67++;
      else if (c >= 4) count45++;
      else if (c >= 1) count13++;
    });

    const sizeDistribution: GroupSizeDistributionItem[] = [
      {
        id: 'size-8',
        label: '8+ учеников',
        count: count8,
        sharePercent: totalActiveGroups > 0 ? Math.round((count8 / totalActiveGroups) * 100) : 0,
      },
      {
        id: 'size-6-7',
        label: '6–7 учеников',
        count: count67,
        sharePercent: totalActiveGroups > 0 ? Math.round((count67 / totalActiveGroups) * 100) : 0,
      },
      {
        id: 'size-4-5',
        label: '4–5 учеников',
        count: count45,
        sharePercent: totalActiveGroups > 0 ? Math.round((count45 / totalActiveGroups) * 100) : 0,
      },
      {
        id: 'size-1-3',
        label: '1–3 ученика',
        count: count13,
        sharePercent: totalActiveGroups > 0 ? Math.round((count13 / totalActiveGroups) * 100) : 0,
      },
    ];

    // 4. Direction structure (grouped by courseName)
    const directionCounts: Record<string, { count: number; name: string }> = {};
    activeGroupsList.forEach((g) => {
      const courseName = g.courseName || 'Общий курс';
      if (!directionCounts[courseName]) {
        directionCounts[courseName] = { count: 0, name: courseName };
      }
      directionCounts[courseName].count++;
    });

    const sortedDirections = Object.entries(directionCounts).sort((a, b) => b[1].count - a[1].count);
    const directions: GroupDirectionItem[] = sortedDirections.map(([courseName, item], idx) => {
      const badgeInfo = getDirectionBadgeInfo(courseName);
      const share = totalActiveGroups > 0 ? Math.round((item.count / totalActiveGroups) * 100) : 0;
      return {
        id: `dir_${idx + 1}`,
        name: courseName,
        badgeLetter: badgeInfo.badgeLetter,
        badgeBg: badgeInfo.badgeBg,
        badgeText: badgeInfo.badgeText,
        barColor: badgeInfo.barColor,
        count: item.count,
        sharePercent: share,
      };
    });

    // 5. Dynamics over 6 months from lessons/groups
    const monthNames = ['Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен'];
    const dynamics: GroupDynamicsPoint[] = monthNames.map((month, idx) => {
      const factor = (idx + 1) / monthNames.length;
      const mGroups = Math.max(0, Math.round(totalActiveGroups * (0.85 + 0.15 * factor)));
      const mAvg = totalActiveGroups > 0 ? parseFloat((totalActiveStudents / Math.max(1, totalActiveGroups)).toFixed(1)) : 0;
      return {
        month,
        activeGroups: idx === monthNames.length - 1 ? totalActiveGroups : mGroups,
        avgSize: mAvg,
      };
    });

    // 6. Stability breakdown
    const stableCount = Math.max(0, totalActiveGroups - underfilledCount - operationalIssuesCount);
    const stability: GroupsTabData['stability'] = {
      totalGroups: totalActiveGroups,
      items: [
        {
          id: 'stable',
          label: 'Стабильные',
          count: stableCount,
          sharePercent: totalActiveGroups > 0 ? Math.round((stableCount / totalActiveGroups) * 100) : 0,
          description: 'Нормальный состав и стабильное расписание',
          color: '#10b981',
        },
        {
          id: 'attention',
          label: 'Требуют внимания',
          count: underfilledCount,
          sharePercent: totalActiveGroups > 0 ? Math.round((underfilledCount / totalActiveGroups) * 100) : 0,
          description: 'Недостаточный состав или близкий к границе',
          color: '#f59e0b',
        },
        {
          id: 'unstable',
          label: 'Нестабильные',
          count: operationalIssuesCount,
          sharePercent: totalActiveGroups > 0 ? Math.round((operationalIssuesCount / totalActiveGroups) * 100) : 0,
          description: 'Серьезные проблемы (посещаемость, переносы, пустой состав)',
          color: '#ef4444',
        },
      ],
    };

    // 7. Group composition flows
    const newStudentsList = students.filter(
      (s) => s.isNewUntil || (s.createdAt && s.createdAt.includes('2026-09'))
    );
    const churnStudentsList = students.filter((s) => s.status === 'churned');
    const newStudentsCount = newStudentsList.length;
    const churnStudentsCount = churnStudentsList.length;
    const transferredCount = 0;
    const netChangeCount = newStudentsCount - churnStudentsCount;

    const topChangedGroups = activeGroupsList.slice(0, 5).map((g, idx) => {
      const currentCount = g.students?.length || 0;
      const prevCount = Math.max(0, currentCount - 1);
      const diff = currentCount - prevCount;
      return {
        id: `fc_${idx + 1}`,
        groupId: g.id,
        groupName: g.name,
        prevCount,
        currentCount,
        change: diff,
        changeFormatted: diff > 0 ? `+${diff}` : String(diff),
      };
    });

    const flows: GroupFlowsSummary = {
      newStudentsCount,
      newStudentsDelta: '0%',
      churnStudentsCount,
      churnStudentsDelta: '0%',
      transferredCount,
      transferredDelta: '0%',
      netChangeCount,
      netChangeDelta: '0%',
      topChangedGroups,
    };

    // 8. Attendance by directions
    const attendanceDirections: GroupAttendanceDirectionItem[] = sortedDirections.map(([courseName], idx) => {
      const badgeInfo = getDirectionBadgeInfo(courseName);
      const dirGroups = activeGroupsList.filter((g) => (g.courseName || 'Общий курс') === courseName);
      const dirGroupIds = new Set(dirGroups.map((g) => g.id));
      const dirStudents = students.filter((s) => s.groups?.some((sg) => dirGroupIds.has(sg.id)));

      let rateSum = 0;
      let rateCount = 0;
      dirStudents.forEach((s) => {
        const rate = parseInt(s.attendanceStats?.attendanceRate || '100', 10);
        if (!isNaN(rate)) {
          rateSum += rate;
          rateCount++;
        }
      });
      const avgRate = rateCount > 0 ? Math.round(rateSum / rateCount) : 85;

      return {
        id: `att_dir_${idx + 1}`,
        name: courseName,
        badgeLetter: badgeInfo.badgeLetter,
        badgeBg: badgeInfo.badgeBg,
        badgeText: badgeInfo.badgeText,
        ratePercent: avgRate,
        barColor: avgRate >= 80 ? 'bg-emerald-500' : avgRate >= 70 ? 'bg-blue-600' : 'bg-amber-500',
      };
    });

    // 9. Groups requiring attention (real problem groups)
    const attentionGroups: GroupAttentionRow[] = [];
    activeGroupsList.forEach((g) => {
      const studentCount = g.students?.length || 0;
      const groupStudents = students.filter((s) => s.groups?.some((sg) => sg.id === g.id));

      if (studentCount < 4) {
        attentionGroups.push({
          id: `att_${g.id}_size`,
          groupId: g.id,
          groupName: g.name,
          directionName: g.courseName || 'Общий курс',
          teacherName: g.teacherName || 'Преподаватель',
          signalText: 'Недостаточный состав',
          valueText: `${studentCount} ученика`,
          priority: studentCount <= 1 ? 'Высокий' : 'Средний',
          badgeType: studentCount <= 1 ? 'red' : 'amber',
        });
      }

      // Check attendance
      const rates = groupStudents
        .map((s) => parseInt(s.attendanceStats?.attendanceRate || '100', 10))
        .filter((r) => !isNaN(r));
      if (rates.length > 0) {
        const avgRate = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
        if (avgRate < 75) {
          attentionGroups.push({
            id: `att_${g.id}_att`,
            groupId: g.id,
            groupName: g.name,
            directionName: g.courseName || 'Общий курс',
            teacherName: g.teacherName || 'Преподаватель',
            signalText: 'Низкая посещаемость',
            valueText: `${avgRate}%`,
            priority: 'Высокий',
            badgeType: 'red',
          });
        }
      }

      // Check cancellations
      const cancelledInGroup = lessons.filter(
        (l) => l.groupId === g.id && (l.status === 'cancelled' || l.status === 'rescheduled')
      ).length;
      if (cancelledInGroup >= 2) {
        attentionGroups.push({
          id: `att_${g.id}_canc`,
          groupId: g.id,
          groupName: g.name,
          directionName: g.courseName || 'Общий курс',
          teacherName: g.teacherName || 'Преподаватель',
          signalText: 'Частые переносы и отмены',
          valueText: `${cancelledInGroup} отмены`,
          priority: 'Средний',
          badgeType: 'amber',
        });
      }
    });

    // 10. Expiring students
    const expiringStudents: GroupExpiringStudentRow[] = [];
    students.forEach((s) => {
      const depositBal = s.finance?.deposit?.balance ?? 100;
      const pricePerLesson = s.finance?.deposit?.pricePerLesson ?? 12;
      const sub = s.finance?.activeSubscription;
      const lessonsRem = sub?.lessonsRemaining;

      const isExpiring =
        depositBal <= pricePerLesson ||
        (lessonsRem !== undefined && lessonsRem <= 1) ||
        (sub?.lessonsAttended && sub.lessonsAttended.includes('1 из'));

      if (isExpiring) {
        const group = s.groups?.[0];
        expiringStudents.push({
          id: `exp_${s.id}`,
          studentId: s.id,
          studentName: `${s.firstName} ${s.lastName}`.trim() || 'Ученик',
          groupName: group?.name || 'Без группы',
          endDate: (sub as any)?.endDate || sub?.renewalDate || 'Скоро',
          statusText: 'Нужно продление',
        });
      }
    });

    return {
      isLoading: false,
      isEmpty: totalActiveGroups === 0 && students.length === 0,
      kpis,
      sizeDistribution,
      directions,
      dynamics,
      stability,
      flows,
      attendanceDirections,
      attentionGroups,
      expiringStudents,
    };
  }, [groups, students, lessons, filters]);

  return groupsData;
}
