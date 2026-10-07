'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FullLessonData,
  FullGroupData,
  FullTeacherData,
  INITIAL_LESSONS,
  INITIAL_GROUPS,
  INITIAL_TEACHERS,
} from '@/lib/data/mockData';
import { getStoredLessons, fetchLessonsFromSupabase } from '@/lib/data/lessonStorage';
import { getStoredGroups, fetchGroupsFromSupabase } from '@/lib/data/groupStorage';
import {
  computeTeacherWorkspaceData,
  TeacherWorkspaceData,
} from '../lib/teacherWorkspaceEngine';

export interface UseTeacherWorkspaceOptions {
  teacherId?: string;
  teacherName?: string;
  initialDate?: Date;
}

export function useTeacherWorkspaceData(options?: UseTeacherWorkspaceOptions): {
  data: TeacherWorkspaceData;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  selectedTeacherId: string;
  setSelectedTeacherId: (id: string) => void;
  availableTeachers: FullTeacherData[];
  refresh: () => void;
  isLoading: boolean;
} {
  const [selectedDate, setSelectedDate] = useState<Date>(options?.initialDate || new Date());
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(options?.teacherId || 't1');
  const [lessons, setLessons] = useState<FullLessonData[]>(INITIAL_LESSONS);
  const [groups, setGroups] = useState<FullGroupData[]>(INITIAL_GROUPS);
  const [teachers, setTeachers] = useState<FullTeacherData[]>(INITIAL_TEACHERS);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const storedL = getStoredLessons();
      setLessons(storedL);

      const storedG = getStoredGroups();
      setGroups(storedG);

      // Async cloud sync fire-and-forget
      fetchLessonsFromSupabase().then((cloudL) => {
        if (cloudL && cloudL.length > 0) setLessons(cloudL);
      }).catch(() => {});

      fetchGroupsFromSupabase().then((cloudG) => {
        if (cloudG && cloudG.length > 0) setGroups(cloudG);
      }).catch(() => {});
    } catch (e) {
      console.warn('Error loading teacher workspace data:', e);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleDataChanged = () => {
      loadData();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('crm-lessons-changed', handleDataChanged);
      window.addEventListener('crm-attendance-updated', handleDataChanged);
      window.addEventListener('crm-groups-changed', handleDataChanged);

      return () => {
        window.removeEventListener('crm-lessons-changed', handleDataChanged);
        window.removeEventListener('crm-attendance-updated', handleDataChanged);
        window.removeEventListener('crm-groups-changed', handleDataChanged);
      };
    }
  }, [loadData]);

  const workspaceData = useMemo(() => {
    return computeTeacherWorkspaceData({
      teacherId: selectedTeacherId,
      teacherName: options?.teacherName,
      allLessons: lessons,
      allGroups: groups,
      allTeachers: teachers,
      selectedDate,
      now: new Date(),
    });
  }, [selectedTeacherId, options?.teacherName, lessons, groups, teachers, selectedDate]);

  return {
    data: workspaceData,
    selectedDate,
    setSelectedDate,
    selectedTeacherId,
    setSelectedTeacherId,
    availableTeachers: teachers,
    refresh: loadData,
    isLoading,
  };
}
