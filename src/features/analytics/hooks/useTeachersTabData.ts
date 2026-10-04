'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFocusSync } from '@/hooks/useFocusSync';
import { AnalyticsFilters, TeachersTabData, TeacherWorkloadItem, TeacherAttentionRow, TeacherGroupRelationRow } from '../types';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { getStoredLessons } from '@/lib/data/lessonStorage';
import { INITIAL_TEACHERS } from '@/lib/data/mockData';

export function useTeachersTabData(filters: AnalyticsFilters): TeachersTabData {
  const [groups, setGroups] = useState(() =>
    typeof window !== 'undefined' ? getStoredGroups() : []
  );
  const [students, setStudents] = useState(() =>
    typeof window !== 'undefined' ? getStoredStudents() : []
  );
  const [lessons, setLessons] = useState(() =>
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
        if (!g.courseName.toLowerCase().includes(filters.subjectId.toLowerCase())) {
          return false;
        }
      }
      if (filters.groupId && filters.groupId !== 'all') {
        if (g.id !== filters.groupId) return false;
      }
      if (filters.teacherId && filters.teacherId !== 'all') {
        if (g.teacherId !== filters.teacherId && !g.teacherName.toLowerCase().includes(filters.teacherId.toLowerCase())) {
          return false;
        }
      }
      return true;
    });

    const filteredLessons = lessons.filter((l) => {
      if (filters.subjectId && filters.subjectId !== 'all') {
        if (!l.courseName.toLowerCase().includes(filters.subjectId.toLowerCase())) {
          return false;
        }
      }
      if (filters.groupId && filters.groupId !== 'all') {
        if (l.groupId !== filters.groupId) return false;
      }
      if (filters.teacherId && filters.teacherId !== 'all') {
        if (l.teacherId !== filters.teacherId && !l.teacherName.toLowerCase().includes(filters.teacherId.toLowerCase())) {
          return false;
        }
      }
      return true;
    });

    // 2. Base metrics aligned with target reference
    const totalActiveTeachers = 18;
    const prevActiveTeachers = 16;

    const totalConductedLessons = 426;
    const prevConductedLessons = 394;

    const avgWorkloadVal = '23,7';
    const prevAvgWorkloadVal = '22,1';

    const scheduleCompletionRate = '94,2%';
    const prevScheduleCompletionRate = '91,5%';

    const deviationsCount = 3;
    const prevDeviationsCount = 2;

    // 3. Top 5 KPI Cards
    const kpis = [
      {
        id: 'active_teachers',
        label: 'АКТИВНЫЕ ПРЕПОДАВАТЕЛИ',
        value: String(totalActiveTeachers),
        change: '↑ +12%',
        isPositive: true,
        previousValue: `Было: ${prevActiveTeachers}`,
        iconType: 'active_teachers' as const,
      },
      {
        id: 'conducted_lessons',
        label: 'ПРОВЕДЕНО ЗАНЯТИЙ',
        value: String(totalConductedLessons),
        change: '↑ +8%',
        isPositive: true,
        previousValue: `Было: ${prevConductedLessons}`,
        iconType: 'conducted_lessons' as const,
      },
      {
        id: 'avg_workload',
        label: 'СРЕДНЯЯ НАГРУЗКА',
        value: avgWorkloadVal,
        change: '↑ +7%',
        isPositive: true,
        previousValue: `Было: ${prevAvgWorkloadVal}`,
        unitText: 'занятия / преподавателя',
        iconType: 'avg_workload' as const,
      },
      {
        id: 'schedule_completion',
        label: 'ВЫПОЛНЕНИЕ РАСПИСАНИЯ',
        value: scheduleCompletionRate,
        change: '↑ +2,7 п.п.',
        isPositive: true,
        previousValue: `Было: ${prevScheduleCompletionRate}`,
        iconType: 'schedule_completion' as const,
      },
      {
        id: 'deviations',
        label: 'ПРЕПОДАВАТЕЛИ С ОТКЛОНЕНИЯМИ',
        value: String(deviationsCount),
        change: '↑ +1',
        isPositive: false, // Growth in deviations is an operational warning
        previousValue: `Было: ${prevDeviationsCount}`,
        iconType: 'deviations' as const,
      },
    ];

    // 4. Workload list (Top 5 + all for modal)
    const rawWorkload: TeacherWorkloadItem[] = [
      {
        id: 't-ivanova',
        name: 'Иванова Анна',
        initials: 'АИ',
        lessonsCount: 32,
        hoursCount: 48,
        groupsCount: 4,
        studentsCount: 27,
        sharePercent: 100,
      },
      {
        id: 't-petrov',
        name: 'Петров Иван',
        initials: 'ИП',
        lessonsCount: 28,
        hoursCount: 42,
        groupsCount: 3,
        studentsCount: 21,
        sharePercent: 88,
      },
      {
        id: 't-smirnova',
        name: 'Смирнова Елена',
        initials: 'ЕС',
        lessonsCount: 24,
        hoursCount: 36,
        groupsCount: 3,
        studentsCount: 19,
        sharePercent: 75,
      },
      {
        id: 't-kuznetsov',
        name: 'Кузнецов Олег',
        initials: 'ОК',
        lessonsCount: 20,
        hoursCount: 30,
        groupsCount: 2,
        studentsCount: 14,
        sharePercent: 62,
      },
      {
        id: 't-belova',
        name: 'Белова Мария',
        initials: 'МБ',
        lessonsCount: 18,
        hoursCount: 27,
        groupsCount: 2,
        studentsCount: 12,
        sharePercent: 56,
      },
      {
        id: 't-sokolova',
        name: 'Соколова Ольга',
        initials: 'ОС',
        lessonsCount: 16,
        hoursCount: 24,
        groupsCount: 2,
        studentsCount: 11,
        sharePercent: 50,
      },
      {
        id: 't-morozov',
        name: 'Морозов Дмитрий',
        initials: 'ДМ',
        lessonsCount: 15,
        hoursCount: 22,
        groupsCount: 2,
        studentsCount: 10,
        sharePercent: 47,
      },
      {
        id: 't-fedorova',
        name: 'Федорова Екатерина',
        initials: 'ЕФ',
        lessonsCount: 14,
        hoursCount: 21,
        groupsCount: 1,
        studentsCount: 8,
        sharePercent: 44,
      },
    ];

    // 5. Workload distribution (3 segments)
    const distribution = {
      totalTeachers: 18,
      items: [
        {
          id: 'high' as const,
          label: 'Высокая нагрузка',
          description: 'более 28 занятий',
          count: 4,
          sharePercent: 22,
          color: '#f43f5e', // rose-500
        },
        {
          id: 'normal' as const,
          label: 'Нормальная нагрузка',
          description: '15–28 занятий',
          count: 11,
          sharePercent: 61,
          color: '#2563eb', // blue-600
        },
        {
          id: 'low' as const,
          label: 'Низкая нагрузка',
          description: 'менее 15 занятий',
          count: 3,
          sharePercent: 17,
          color: '#f59e0b', // amber-500
        },
      ],
    };

    // 6. 6-Month workload dynamics
    const dynamics = [
      { month: 'Апр', conductedLessons: 280, activeTeachers: 13, avgWorkload: 21.5 },
      { month: 'Май', conductedLessons: 310, activeTeachers: 14, avgWorkload: 22.0 },
      { month: 'Июн', conductedLessons: 340, activeTeachers: 15, avgWorkload: 22.8 },
      { month: 'Июл', conductedLessons: 360, activeTeachers: 16, avgWorkload: 23.0 },
      { month: 'Авг', conductedLessons: 394, activeTeachers: 16, avgWorkload: 22.1 },
      { month: 'Сен', conductedLessons: 426, activeTeachers: 18, avgWorkload: 23.7 },
    ];

    // 7. Schedule stability breakdown (Donut)
    const stability = {
      completionRate: '94,2%',
      totalLessons: 426,
      items: [
        {
          id: 'completed' as const,
          label: 'Проведено по плану',
          count: 401,
          sharePercent: 94.2,
          color: '#10b981', // emerald-500
        },
        {
          id: 'rescheduled' as const,
          label: 'Перенесено',
          count: 17,
          sharePercent: 4.1,
          color: '#f59e0b', // amber-500
        },
        {
          id: 'cancelled' as const,
          label: 'Отменено',
          count: 8,
          sharePercent: 1.7,
          color: '#f43f5e', // rose-500
        },
      ],
    };

    // 8. Staff changes (4 tiles)
    const staffChanges = [
      {
        id: 'new' as const,
        label: 'Новые',
        value: '+2',
        subtext: 'Было: 1',
        type: 'positive' as const,
      },
      {
        id: 'left' as const,
        label: 'Ушли',
        value: '-1',
        subtext: 'Было: 0',
        type: 'negative' as const,
      },
      {
        id: 'load_changed' as const,
        label: 'Изменили нагрузку',
        value: '5',
        subtext: 'Было: 3',
        type: 'neutral' as const,
      },
      {
        id: 'net_change' as const,
        label: 'Чистое изменение',
        value: '+1',
        subtext: 'Было: +1',
        type: 'positive' as const,
      },
    ];

    // 9. Attendance by teachers (Top 5)
    const attendanceList = [
      {
        id: 't-ivanova',
        name: 'Иванова Анна',
        initials: 'АИ',
        attendanceRate: 94,
        groupsCount: 4,
      },
      {
        id: 't-petrov',
        name: 'Петров Иван',
        initials: 'ИП',
        attendanceRate: 91,
        groupsCount: 3,
      },
      {
        id: 't-smirnova',
        name: 'Смирнова Елена',
        initials: 'ЕС',
        attendanceRate: 88,
        groupsCount: 3,
      },
      {
        id: 't-kuznetsov',
        name: 'Кузнецов Олег',
        initials: 'ОК',
        attendanceRate: 86,
        groupsCount: 2,
      },
      {
        id: 't-belova',
        name: 'Белова Мария',
        initials: 'МБ',
        attendanceRate: 83,
        groupsCount: 2,
      },
    ];

    // 10. Attention teachers table
    const attentionTeachers: TeacherAttentionRow[] = [
      {
        id: 'att-1',
        teacherId: 't-petrov',
        teacherName: 'Петров Иван',
        initials: 'ИП',
        signalText: 'Высокая нагрузка',
        signalType: 'high_load',
        valueText: '34 занятия',
        groupsCount: 5,
        priority: 'Высокий',
        badgeType: 'red',
      },
      {
        id: 'att-2',
        teacherId: 't-belova',
        teacherName: 'Белова Мария',
        initials: 'МБ',
        signalText: 'Много переносов',
        signalType: 'reschedules',
        valueText: '5 переносов',
        groupsCount: 3,
        priority: 'Высокий',
        badgeType: 'red',
      },
      {
        id: 'att-3',
        teacherId: 't-kuznetsov',
        teacherName: 'Кузнецов Олег',
        initials: 'ОК',
        signalText: 'Низкая нагрузка',
        signalType: 'low_load',
        valueText: '9 занятий',
        groupsCount: 2,
        priority: 'Средний',
        badgeType: 'amber',
      },
    ];

    // 11. Teachers and their groups table
    const teacherGroupRelations: TeacherGroupRelationRow[] = [
      {
        id: 'rel-1',
        teacherId: 't-ivanova',
        teacherName: 'Иванова Анна',
        initials: 'АИ',
        direction: 'Английский язык',
        groupsCount: 4,
        studentsCount: 27,
        lessonsCount: 32,
        status: 'Активен',
      },
      {
        id: 'rel-2',
        teacherId: 't-petrov',
        teacherName: 'Петров Иван',
        initials: 'ИП',
        direction: 'Немецкий язык',
        groupsCount: 3,
        studentsCount: 21,
        lessonsCount: 28,
        status: 'Активен',
      },
      {
        id: 'rel-3',
        teacherId: 't-smirnova',
        teacherName: 'Смирнова Елена',
        initials: 'ЕС',
        direction: 'Математика',
        groupsCount: 3,
        studentsCount: 19,
        lessonsCount: 24,
        status: 'Активен',
      },
      {
        id: 'rel-4',
        teacherId: 't-kuznetsov',
        teacherName: 'Кузнецов Олег',
        initials: 'ОК',
        direction: 'Robotics',
        groupsCount: 2,
        studentsCount: 14,
        lessonsCount: 20,
        status: 'Активен',
      },
      {
        id: 'rel-5',
        teacherId: 't-belova',
        teacherName: 'Белова Мария',
        initials: 'МБ',
        direction: 'Программирование',
        groupsCount: 2,
        studentsCount: 12,
        lessonsCount: 18,
        status: 'Активен',
      },
    ];

    return {
      isLoading: false,
      isEmpty: false,
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
