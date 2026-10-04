'use client';

import { useState, useEffect, useMemo } from 'react';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { getStoredLessons } from '@/lib/data/lessonStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { INITIAL_TEACHERS, FullGroupData, FullLessonData, FullStudentData } from '@/lib/data/mockData';
import { getEurRubRate } from '@/lib/data/currencyHelper';
import { AnalyticsFilters } from '../types';

export interface TeacherPerformanceItem {
  id: string;
  name: string;
  role: string;
  initials: string;
  groupsCount: number;
  occupancyRate: number;
  isLowOccupancy: boolean;
  attendanceRate: number;
  retentionRate: number;
  trialConversionRate: number;
  dynamicsText: string;
  dynamicsType: 'positive' | 'negative' | 'neutral';
  hasAnomaly: boolean;
}

export type GroupCapacityStatus = 'underfilled' | 'almost_full' | 'full';

export interface GroupCapacityItem {
  id: string;
  name: string;
  courseName: string;
  teacherName: string;
  enrolled: number;
  capacity: number;
  occupancyPercent: number;
  potentialEur: number;
  potentialRub: number;
  status: GroupCapacityStatus;
  statusLabel: string;
}

export function useDiagnosticsTeachersAndGroups(filters: AnalyticsFilters) {
  const [groups, setGroups] = useState<FullGroupData[]>(() =>
    typeof window !== 'undefined' ? getStoredGroups() : []
  );
  const [lessons, setLessons] = useState<FullLessonData[]>(() =>
    typeof window !== 'undefined' ? getStoredLessons() : []
  );
  const [students, setStudents] = useState<FullStudentData[]>(() =>
    typeof window !== 'undefined' ? getStoredStudents() : []
  );
  const [rate, setRate] = useState<number>(() => getEurRubRate());

  const [teacherFilter, setTeacherFilter] = useState<'all' | 'anomalies' | 'high'>('anomalies');
  const [groupSubjectFilter, setGroupSubjectFilter] = useState<string>('all');

  useEffect(() => {
    const handleGroups = () => setGroups(getStoredGroups());
    const handleLessons = () => setLessons(getStoredLessons());
    const handleStudents = () => setStudents(getStoredStudents());
    const handleRate = () => setRate(getEurRubRate());

    window.addEventListener('crm-groups-changed', handleGroups);
    window.addEventListener('crm-lessons-changed', handleLessons);
    window.addEventListener('crm-students-changed', handleStudents);
    window.addEventListener('crm-currency-rate-changed', handleRate);

    return () => {
      window.removeEventListener('crm-groups-changed', handleGroups);
      window.removeEventListener('crm-lessons-changed', handleLessons);
      window.removeEventListener('crm-students-changed', handleStudents);
      window.removeEventListener('crm-currency-rate-changed', handleRate);
    };
  }, []);

  // Filter groups
  const activeGroups = useMemo(() => {
    return groups.filter((g) => !g.is_deleted && !g.isDeleted);
  }, [groups]);

  // ==========================================
  // 1. TEACHERS PERFORMANCE
  // ==========================================
  const teachersPerformance = useMemo<TeacherPerformanceItem[]>(() => {
    const defaultStats = [
      {
        id: 't1',
        name: 'Мария Иванова',
        role: 'Английский язык',
        initials: 'МИ',
        groupsCount: 3,
        occupancyRate: 75,
        isLowOccupancy: false,
        attendanceRate: 92,
        retentionRate: 94,
        trialConversionRate: 68,
        dynamicsText: '+6%',
        dynamicsType: 'positive' as const,
        hasAnomaly: false,
      },
      {
        id: 't2',
        name: 'Денис Смирнов',
        role: 'Робототехника и IT',
        initials: 'ДС',
        groupsCount: 2,
        occupancyRate: 45,
        isLowOccupancy: true,
        attendanceRate: 76,
        retentionRate: 82,
        trialConversionRate: 42,
        dynamicsText: '-18%',
        dynamicsType: 'negative' as const,
        hasAnomaly: true,
      },
      {
        id: 't3',
        name: 'Ольга Соколова',
        role: 'Олимпиадная математика',
        initials: 'ОС',
        groupsCount: 2,
        occupancyRate: 62,
        isLowOccupancy: false,
        attendanceRate: 84,
        retentionRate: 89,
        trialConversionRate: 55,
        dynamicsText: '-4%',
        dynamicsType: 'negative' as const,
        hasAnomaly: true,
      },
      {
        id: 't4',
        name: 'Анна Кузнецова',
        role: 'Немецкий язык',
        initials: 'АК',
        groupsCount: 1,
        occupancyRate: 35,
        isLowOccupancy: true,
        attendanceRate: 80,
        retentionRate: 85,
        trialConversionRate: 50,
        dynamicsText: '-12%',
        dynamicsType: 'negative' as const,
        hasAnomaly: true,
      },
    ];

    // Compute dynamic values if real lessons & groups exist for teacher
    return defaultStats.map((item) => {
      const teacherGroups = activeGroups.filter(
        (g) => g.teacherId === item.id || g.teacherName?.toLowerCase().includes(item.name.toLowerCase().split(' ')[1] || '')
      );
      if (teacherGroups.length > 0) {
        let totalEnrolled = 0;
        let totalCap = 0;
        teacherGroups.forEach((g) => {
          totalEnrolled += g.students?.length || 0;
          totalCap += g.capacity || 8;
        });
        const occ = totalCap > 0 ? Math.round((totalEnrolled / totalCap) * 100) : item.occupancyRate;
        return {
          ...item,
          groupsCount: teacherGroups.length,
          occupancyRate: occ,
          isLowOccupancy: occ < 50,
          hasAnomaly: occ < 50 || item.attendanceRate < 80 || item.dynamicsType === 'negative',
        };
      }
      return item;
    });
  }, [activeGroups]);

  const filteredTeachers = useMemo(() => {
    if (teacherFilter === 'anomalies') {
      return teachersPerformance.filter((t) => t.hasAnomaly);
    }
    if (teacherFilter === 'high') {
      return teachersPerformance.filter((t) => t.dynamicsType === 'positive');
    }
    return teachersPerformance;
  }, [teachersPerformance, teacherFilter]);

  // Helper to resolve meaningful academic course name
  const resolveCourseDirection = (group: FullGroupData) => {
    if (group.courseName && group.courseName !== 'Основной курс' && group.courseName !== 'Общий курс') {
      return group.courseName;
    }
    const name = (group.name || '').toLowerCase();
    if (name.includes('english') || name.includes('starter') || name.includes('грамматика') || name.includes('разговорный')) {
      return 'Английский язык';
    }
    if (name.includes('математик')) {
      return 'Олимпиадная математика';
    }
    if (name.includes('python') || name.includes('robot') || name.includes('it')) {
      return 'Робототехника и IT';
    }
    if (name.includes('немецк') || name.includes('german')) {
      return 'Немецкий язык';
    }
    return group.courseName || 'Английский язык';
  };

  // ==========================================
  // 2. GROUPS CAPACITY
  // ==========================================
  const groupsCapacity = useMemo<GroupCapacityItem[]>(() => {
    return activeGroups.map((g) => {
      const cap = g.capacity || 8;
      const enrolled = g.students?.length || 0;
      const occ = cap > 0 ? Math.round((enrolled / cap) * 100) : 100;
      const vacant = Math.max(0, cap - enrolled);
      const price = g.pricing?.pricePerMonth || 80;
      const potentialEur = vacant * price;
      const potentialRub = Math.round(potentialEur * rate);

      let status: GroupCapacityStatus = 'almost_full';
      let statusLabel = 'Почти заполнена';

      if (occ < 50) {
        status = 'underfilled';
        statusLabel = 'Недозаполнена';
      } else if (occ >= 85) {
        status = 'full';
        statusLabel = 'Заполнена';
      }

      return {
        id: g.id,
        name: g.name,
        courseName: resolveCourseDirection(g),
        teacherName: g.teacherName || 'Преподаватель',
        enrolled,
        capacity: cap,
        occupancyPercent: occ,
        potentialEur,
        potentialRub,
        status,
        statusLabel,
      };
    });
  }, [activeGroups, rate]);

  const filteredGroupsCapacity = useMemo(() => {
    if (groupSubjectFilter === 'all') return groupsCapacity;
    return groupsCapacity.filter(
      (g) =>
        g.courseName.toLowerCase().includes(groupSubjectFilter.toLowerCase()) ||
        g.name.toLowerCase().includes(groupSubjectFilter.toLowerCase())
    );
  }, [groupsCapacity, groupSubjectFilter]);

  return {
    teachers: filteredTeachers,
    allTeachersCount: teachersPerformance.length,
    teacherFilter,
    setTeacherFilter,
    groups: filteredGroupsCapacity,
    allGroupsCount: groupsCapacity.length,
    groupSubjectFilter,
    setGroupSubjectFilter,
  };
}
