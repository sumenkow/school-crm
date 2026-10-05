'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFocusSync } from '@/hooks/useFocusSync';
import {
  AnalyticsFilters,
  TeachersTabData,
  TeachersKpiCardData,
  TeacherWorkloadItem,
  TeacherDynamicsPoint,
  TeacherStaffChangeTile,
  TeacherAttendanceItem,
  TeacherAttentionRow,
  TeacherGroupRelationRow,
} from '../types';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { getStoredLessons } from '@/lib/data/lessonStorage';
import { FullGroupData, FullStudentData, FullLessonData, INITIAL_TEACHERS } from '@/lib/data/mockData';

export function useTeachersTabData(filters: AnalyticsFilters): TeachersTabData {
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

  const teachersData: TeachersTabData = useMemo(() => {
    // 1. Filter entities according to global filters
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

    const filteredLessons = lessons.filter((l) => {
      if (filters.subjectId && filters.subjectId !== 'all') {
        const cName = (l.courseName || '').toLowerCase();
        if ((l as any).courseId !== filters.subjectId && !cName.includes(filters.subjectId.toLowerCase())) {
          return false;
        }
      }
      if (filters.groupId && filters.groupId !== 'all') {
        if (l.groupId !== filters.groupId) return false;
      }
      if (filters.teacherId && filters.teacherId !== 'all') {
        const tName = (l.teacherName || '').toLowerCase();
        if (l.teacherId !== filters.teacherId && !tName.includes(filters.teacherId.toLowerCase())) {
          return false;
        }
      }
      return true;
    });

    // 2. Build unique teachers registry from INITIAL_TEACHERS, groups, and lessons
    const teachersMap = new Map<string, { id: string; name: string; role?: string; status?: string }>();

    INITIAL_TEACHERS.forEach((t) => {
      if (t.id && t.name) {
        teachersMap.set(t.id, { id: t.id, name: t.name, role: t.role, status: t.status });
      }
    });

    groups.forEach((g) => {
      if (g.teacherId && g.teacherName) {
        if (!teachersMap.has(g.teacherId)) {
          teachersMap.set(g.teacherId, { id: g.teacherId, name: g.teacherName, role: g.courseName, status: 'active' });
        }
      }
    });

    lessons.forEach((l) => {
      if (l.teacherId && l.teacherName) {
        if (!teachersMap.has(l.teacherId)) {
          teachersMap.set(l.teacherId, { id: l.teacherId, name: l.teacherName, role: l.courseName, status: 'active' });
        }
      }
    });

    // Filter teachers according to global filter
    const activeTeachersList = Array.from(teachersMap.values()).filter((t) => {
      if (filters.teacherId && filters.teacherId !== 'all') {
        if (t.id !== filters.teacherId && !t.name.toLowerCase().includes(filters.teacherId.toLowerCase())) {
          return false;
        }
      }
      if (filters.subjectId && filters.subjectId !== 'all') {
        const hasMatchingGroup = filteredGroups.some(
          (g) => g.teacherId === t.id || (g.teacherName && g.teacherName.toLowerCase() === t.name.toLowerCase())
        );
        const hasMatchingLesson = filteredLessons.some(
          (l) => l.teacherId === t.id || (l.teacherName && l.teacherName.toLowerCase() === t.name.toLowerCase())
        );
        if (!hasMatchingGroup && !hasMatchingLesson) return false;
      }
      return true;
    });

    // 3. Calculate metrics per teacher
    interface ComputedTeacher {
      id: string;
      name: string;
      initials: string;
      direction: string;
      lessonsCount: number;
      conductedCount: number;
      rescheduledCount: number;
      cancelledCount: number;
      hoursCount: number;
      groupsCount: number;
      studentsCount: number;
      attendanceRate: number;
      status: string;
    }

    const computedTeachers: ComputedTeacher[] = activeTeachersList.map((t) => {
      const tGroups = filteredGroups.filter(
        (g) => g.teacherId === t.id || (g.teacherName && g.teacherName.toLowerCase() === t.name.toLowerCase())
      );
      const tLessons = filteredLessons.filter(
        (l) => l.teacherId === t.id || (l.teacherName && l.teacherName.toLowerCase() === t.name.toLowerCase())
      );

      const conducted = tLessons.filter(
        (l) => l.status === 'completed' || (!l.status && new Date(l.date) <= new Date())
      ).length;
      const rescheduled = tLessons.filter((l) => l.status === 'rescheduled').length;
      const cancelled = tLessons.filter((l) => l.status === 'cancelled').length;
      const totalLessons = tLessons.length > 0 ? tLessons.length : conducted;

      // Hours count: 1.5h per lesson
      const hoursCount = Math.round(totalLessons * 1.5);

      // Unique students count in teacher's groups
      const studentIds = new Set<string>();
      tGroups.forEach((g) => {
        g.students?.forEach((st) => {
          if (st.id) studentIds.add(st.id);
        });
      });
      students.forEach((s) => {
        if (s.groups?.some((sg) => tGroups.some((tg) => tg.id === sg.id))) {
          studentIds.add(s.id);
        }
      });

      // Attendance rate calculation
      let attRate = 90;
      const rates: number[] = [];
      studentIds.forEach((sid) => {
        const st = students.find((s) => s.id === sid);
        if (st?.attendanceStats?.attendanceRate) {
          const r = parseInt(st.attendanceStats.attendanceRate, 10);
          if (!isNaN(r)) rates.push(r);
        }
      });
      if (rates.length > 0) {
        attRate = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
      }

      // Initials
      const parts = t.name.split(' ').filter(Boolean);
      const initials = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : t.name.slice(0, 2).toUpperCase();

      const direction = tGroups[0]?.courseName || t.role || 'Общий курс';

      return {
        id: t.id,
        name: t.name,
        initials,
        direction,
        lessonsCount: totalLessons,
        conductedCount: conducted,
        rescheduledCount: rescheduled,
        cancelledCount: cancelled,
        hoursCount,
        groupsCount: tGroups.length,
        studentsCount: studentIds.size,
        attendanceRate: attRate,
        status: t.status === 'inactive' ? 'Неактивен' : 'Активен',
      };
    });

    const totalActiveTeachers = computedTeachers.filter((t) => t.groupsCount > 0 || t.lessonsCount > 0).length;
    const totalConductedLessons = computedTeachers.reduce((s, t) => s + t.conductedCount, 0);
    const totalAllLessons = filteredLessons.length > 0 ? filteredLessons.length : totalConductedLessons;

    const avgWorkloadNum = totalActiveTeachers > 0 ? totalConductedLessons / totalActiveTeachers : 0;
    const avgWorkloadVal = avgWorkloadNum.toFixed(1).replace('.', ',');

    const scheduleCompletionRate =
      totalAllLessons > 0
        ? `${((totalConductedLessons / totalAllLessons) * 100).toFixed(1).replace('.', ',')}%`
        : '100%';

    // Attention teachers identification
    const attentionTeachers: TeacherAttentionRow[] = [];
    computedTeachers.forEach((t) => {
      if (t.lessonsCount > 28) {
        attentionTeachers.push({
          id: `att_${t.id}_high`,
          teacherId: t.id,
          teacherName: t.name,
          initials: t.initials,
          signalText: 'Высокая нагрузка',
          signalType: 'high_load',
          valueText: `${t.lessonsCount} занятий`,
          groupsCount: t.groupsCount,
          priority: 'Высокий',
          badgeType: 'red',
        });
      } else if (t.rescheduledCount >= 2) {
        attentionTeachers.push({
          id: `att_${t.id}_resch`,
          teacherId: t.id,
          teacherName: t.name,
          initials: t.initials,
          signalText: 'Много переносов',
          signalType: 'reschedules',
          valueText: `${t.rescheduledCount} переносов`,
          groupsCount: t.groupsCount,
          priority: 'Высокий',
          badgeType: 'red',
        });
      } else if (t.groupsCount > 0 && t.lessonsCount < 10) {
        attentionTeachers.push({
          id: `att_${t.id}_low`,
          teacherId: t.id,
          teacherName: t.name,
          initials: t.initials,
          signalText: 'Низкая нагрузка',
          signalType: 'low_load',
          valueText: `${t.lessonsCount} занятий`,
          groupsCount: t.groupsCount,
          priority: 'Средний',
          badgeType: 'amber',
        });
      } else if (t.attendanceRate < 80) {
        attentionTeachers.push({
          id: `att_${t.id}_att`,
          teacherId: t.id,
          teacherName: t.name,
          initials: t.initials,
          signalText: 'Низкая явка',
          signalType: 'low_attendance',
          valueText: `${t.attendanceRate}%`,
          groupsCount: t.groupsCount,
          priority: 'Высокий',
          badgeType: 'red',
        });
      }
    });

    const deviationsCount = attentionTeachers.length;

    // 4. Top 5 KPI Cards
    const kpis: TeachersKpiCardData[] = [
      {
        id: 'active_teachers',
        label: 'АКТИВНЫЕ ПРЕПОДАВАТЕЛИ',
        value: String(totalActiveTeachers),
        change: totalActiveTeachers > 0 ? '+0%' : '0%',
        isPositive: true,
        previousValue: `Было: ${totalActiveTeachers}`,
        iconType: 'active_teachers',
      },
      {
        id: 'conducted_lessons',
        label: 'ПРОВЕДЕНО ЗАНЯТИЙ',
        value: String(totalConductedLessons),
        change: totalConductedLessons > 0 ? '+0%' : '0%',
        isPositive: true,
        previousValue: `Было: ${totalConductedLessons}`,
        iconType: 'conducted_lessons',
      },
      {
        id: 'avg_workload',
        label: 'СРЕДНЯЯ НАГРУЗКА',
        value: avgWorkloadVal,
        change: '+0,0',
        isPositive: true,
        previousValue: `Было: ${avgWorkloadVal}`,
        unitText: 'занятия / преподавателя',
        iconType: 'avg_workload',
      },
      {
        id: 'schedule_completion',
        label: 'ВЫПОЛНЕНИЕ РАСПИСАНИЯ',
        value: scheduleCompletionRate,
        change: '+0,0 п.п.',
        isPositive: true,
        previousValue: `Было: ${scheduleCompletionRate}`,
        iconType: 'schedule_completion',
      },
      {
        id: 'deviations',
        label: 'ПРЕПОДАВАТЕЛИ С ОТКЛОНЕНИЯМИ',
        value: String(deviationsCount),
        change: '0',
        isPositive: deviationsCount === 0,
        previousValue: `Было: ${deviationsCount}`,
        iconType: 'deviations',
      },
    ];

    // 5. Workload list
    const maxLessons = Math.max(1, ...computedTeachers.map((t) => t.lessonsCount));
    const sortedByWorkload = [...computedTeachers].sort((a, b) => b.lessonsCount - a.lessonsCount);

    const rawWorkload: TeacherWorkloadItem[] = sortedByWorkload.map((t) => ({
      id: t.id,
      name: t.name,
      initials: t.initials,
      lessonsCount: t.lessonsCount,
      hoursCount: t.hoursCount,
      groupsCount: t.groupsCount,
      studentsCount: t.studentsCount,
      sharePercent: maxLessons > 0 ? Math.round((t.lessonsCount / maxLessons) * 100) : 0,
    }));

    // 6. Workload distribution (3 segments)
    let highCount = 0;
    let normalCount = 0;
    let lowCount = 0;

    computedTeachers.forEach((t) => {
      if (t.lessonsCount > 28) highCount++;
      else if (t.lessonsCount >= 15) normalCount++;
      else lowCount++;
    });

    const totalTeachersCount = computedTeachers.length || 1;
    const distribution: TeachersTabData['distribution'] = {
      totalTeachers: computedTeachers.length,
      items: [
        {
          id: 'high',
          label: 'Высокая нагрузка',
          description: 'более 28 занятий',
          count: highCount,
          sharePercent: Math.round((highCount / totalTeachersCount) * 100),
          color: '#f43f5e',
        },
        {
          id: 'normal',
          label: 'Нормальная нагрузка',
          description: '15–28 занятий',
          count: normalCount,
          sharePercent: Math.round((normalCount / totalTeachersCount) * 100),
          color: '#2563eb',
        },
        {
          id: 'low',
          label: 'Низкая нагрузка',
          description: 'менее 15 занятий',
          count: lowCount,
          sharePercent: Math.round((lowCount / totalTeachersCount) * 100),
          color: '#f59e0b',
        },
      ],
    };

    // 7. 6-Month workload dynamics
    const monthLabels = ['Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен'];
    const dynamics: TeacherDynamicsPoint[] = monthLabels.map((month, idx) => {
      const factor = (idx + 1) / monthLabels.length;
      const mConducted = Math.max(0, Math.round(totalConductedLessons * (0.85 + 0.15 * factor)));
      const mActive = totalActiveTeachers;
      const mAvg = mActive > 0 ? parseFloat((mConducted / mActive).toFixed(1)) : 0;
      return {
        month,
        conductedLessons: idx === monthLabels.length - 1 ? totalConductedLessons : mConducted,
        activeTeachers: mActive,
        avgWorkload: mAvg,
      };
    });

    // 8. Schedule stability breakdown (Donut)
    const totalCompleted = computedTeachers.reduce((s, t) => s + t.conductedCount, 0);
    const totalRescheduled = computedTeachers.reduce((s, t) => s + t.rescheduledCount, 0);
    const totalCancelled = computedTeachers.reduce((s, t) => s + t.cancelledCount, 0);
    const sumAllLessons = Math.max(1, totalCompleted + totalRescheduled + totalCancelled);

    const stability: TeachersTabData['stability'] = {
      completionRate: scheduleCompletionRate,
      totalLessons: totalAllLessons,
      items: [
        {
          id: 'completed',
          label: 'Проведено по плану',
          count: totalCompleted,
          sharePercent: parseFloat(((totalCompleted / sumAllLessons) * 100).toFixed(1)),
          color: '#10b981',
        },
        {
          id: 'rescheduled',
          label: 'Перенесено',
          count: totalRescheduled,
          sharePercent: parseFloat(((totalRescheduled / sumAllLessons) * 100).toFixed(1)),
          color: '#f59e0b',
        },
        {
          id: 'cancelled',
          label: 'Отменено',
          count: totalCancelled,
          sharePercent: parseFloat(((totalCancelled / sumAllLessons) * 100).toFixed(1)),
          color: '#f43f5e',
        },
      ],
    };

    // 9. Staff changes (4 tiles)
    const staffChanges: TeacherStaffChangeTile[] = [
      {
        id: 'new',
        label: 'Новые',
        value: '+0',
        subtext: 'За период: 0',
        type: 'positive',
      },
      {
        id: 'left',
        label: 'Ушли',
        value: '0',
        subtext: 'За период: 0',
        type: 'neutral',
      },
      {
        id: 'load_changed',
        label: 'Изменили нагрузку',
        value: String(deviationsCount),
        subtext: `Отклонений: ${deviationsCount}`,
        type: 'neutral',
      },
      {
        id: 'net_change',
        label: 'Чистое изменение',
        value: '+0',
        subtext: 'Баланс штата',
        type: 'positive',
      },
    ];

    // 10. Attendance by teachers (Top active)
    const attendanceList: TeacherAttendanceItem[] = [...computedTeachers]
      .filter((t) => t.groupsCount > 0 || t.lessonsCount > 0)
      .sort((a, b) => b.attendanceRate - a.attendanceRate)
      .map((t) => ({
        id: t.id,
        name: t.name,
        initials: t.initials,
        attendanceRate: t.attendanceRate,
        groupsCount: t.groupsCount,
      }));

    // 11. Teachers and their groups table
    const teacherGroupRelations: TeacherGroupRelationRow[] = computedTeachers
      .filter((t) => t.groupsCount > 0 || t.lessonsCount > 0)
      .map((t) => ({
        id: `rel_${t.id}`,
        teacherId: t.id,
        teacherName: t.name,
        initials: t.initials,
        direction: t.direction,
        groupsCount: t.groupsCount,
        studentsCount: t.studentsCount,
        lessonsCount: t.lessonsCount,
        status: t.status,
      }));

    return {
      isLoading: false,
      isEmpty: computedTeachers.length === 0,
      kpis,
      workloadList: rawWorkload,
      distribution,
      dynamics,
      stability,
      staffChanges,
      attendanceList,
      attentionTeachers,
      teacherGroupRelations,
    };
  }, [groups, students, lessons, filters]);

  return teachersData;
}
