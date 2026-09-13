'use client';

import { FullGroupData, INITIAL_GROUPS, FullStudentData } from './mockData';
import { getStoredStudents, saveStudentToStorage } from './studentStorage';
import { saveInteractionToStorage } from './timelineStorage';
import type { TimelineInteraction } from './mockData';

const GROUPS_STORAGE_KEY = 'crm_groups_master_v2';

/**
 * Loads all groups from localStorage merged with INITIAL_GROUPS.
 */
export function getStoredGroups(): FullGroupData[] {
  if (typeof window === 'undefined') return INITIAL_GROUPS;
  try {
    const raw = localStorage.getItem(GROUPS_STORAGE_KEY);
    if (!raw) return INITIAL_GROUPS;
    const stored: FullGroupData[] = JSON.parse(raw);
    if (!Array.isArray(stored) || stored.length === 0) return INITIAL_GROUPS;

    const storedMap = new Map<string, FullGroupData>(stored.map((g) => [g.id, g]));
    const result: FullGroupData[] = [];

    for (const init of INITIAL_GROUPS) {
      if (storedMap.has(init.id)) {
        result.push(storedMap.get(init.id)!);
        storedMap.delete(init.id);
      } else {
        result.push(init);
      }
    }

    for (const extra of storedMap.values()) {
      result.unshift(extra);
    }

    return result;
  } catch (err) {
    console.error('Failed to parse stored groups:', err);
    return INITIAL_GROUPS;
  }
}

/**
 * Persists group to localStorage, syncs in-memory INITIAL_GROUPS, and dispatches crm-groups-changed event.
 */
export function saveGroupToStorage(group: FullGroupData): void {
  // 1. In-memory update
  const idx = INITIAL_GROUPS.findIndex((g) => g.id === group.id);
  if (idx !== -1) {
    INITIAL_GROUPS[idx] = group;
  } else {
    INITIAL_GROUPS.unshift(group);
  }

  // 2. LocalStorage update
  if (typeof window !== 'undefined') {
    try {
      const all = getStoredGroups();
      const existingIdx = all.findIndex((g) => g.id === group.id);
      let updated: FullGroupData[];
      if (existingIdx !== -1) {
        updated = all.map((g) => (g.id === group.id ? group : g));
      } else {
        updated = [group, ...all];
      }
      localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(updated));

      // Dispatch event
      window.dispatchEvent(new CustomEvent('crm-groups-changed', { detail: group }));
    } catch (err) {
      console.error('Failed to save group to storage:', err);
    }
  }
}

/**
 * Finds group by id from unified storage.
 */
export function getGroupById(id: string): FullGroupData | undefined {
  const list = getStoredGroups();
  return list.find((g) => g.id === id);
}

/**
 * Synchronously excludes student from a group:
 * - Removes student from group.students and recalculates free spots / occupancy
 * - Removes group from student.groups in studentStorage
 * - Records "Исключение из группы" interaction in student timeline
 * - Dispatches 'crm-groups-changed' and 'crm-students-changed'
 */
export function excludeStudentFromGroup(params: {
  groupId?: string;
  groupName?: string;
  studentId?: string;
  studentName?: string;
  authorName?: string;
}): { updatedGroup?: FullGroupData; updatedStudent?: FullStudentData } {
  const { groupId, groupName, studentId, studentName, authorName } = params;

  let updatedGroup: FullGroupData | undefined;
  let updatedStudent: FullStudentData | undefined;

  // 1. Update Group
  const allGroups = getStoredGroups();
  const targetGroup = allGroups.find(
    (g) =>
      (groupId && g.id === groupId) ||
      (groupName && (g.name === groupName || g.name.includes(groupName) || groupName.includes(g.name)))
  );

  if (targetGroup) {
    const updatedStudentsList = targetGroup.students.filter((s) => {
      if (studentId && s.id === studentId) return false;
      if (studentName && s.name.toLowerCase().trim() === studentName.toLowerCase().trim()) return false;
      return true;
    });

    updatedGroup = {
      ...targetGroup,
      students: updatedStudentsList,
    };
    saveGroupToStorage(updatedGroup);
  }

  // 2. Update Student
  const allStudents = getStoredStudents();
  const targetStudent = allStudents.find((s) => {
    if (studentId && s.id === studentId) return true;
    if (studentName && `${s.firstName} ${s.lastName}`.toLowerCase().trim() === studentName.toLowerCase().trim()) {
      return true;
    }
    return false;
  });

  if (targetStudent) {
    const effectiveGroupName = groupName || targetGroup?.name || 'Группа';
    const effectiveGroupId = groupId || targetGroup?.id;

    const remainingGroups = (targetStudent.groups || []).filter((g) => {
      if (effectiveGroupId && g.id === effectiveGroupId) return false;
      if (effectiveGroupName) {
        if (g.name === effectiveGroupName) return false;
        if (effectiveGroupName.includes(g.name) || g.name.includes(effectiveGroupName)) return false;
      }
      return true;
    });

    const removeInteraction: TimelineInteraction = {
      id: `int_${Date.now()}`,
      studentId: targetStudent.id,
      studentName: `${targetStudent.firstName} ${targetStudent.lastName}`,
      parentId: targetStudent.parents?.[0]?.id,
      parentName: targetStudent.parents?.[0]
        ? `${targetStudent.parents[0].firstName} ${targetStudent.parents[0].lastName}`
        : undefined,
      occurredAt: 'Только что',
      channel: 'other',
      type: 'status_change',
      author: authorName || 'Администратор школы',
      content: `Исключен(а) из группы «${effectiveGroupName}».`,
      result: 'Исключение из группы',
      targetType: targetStudent.studentType === 'adult_student' ? 'student' : 'parent',
      targetName:
        targetStudent.studentType === 'adult_student'
          ? `${targetStudent.firstName} ${targetStudent.lastName}`
          : targetStudent.parents?.[0]
          ? `${targetStudent.parents[0].firstName} ${targetStudent.parents[0].lastName}`
          : `${targetStudent.firstName} ${targetStudent.lastName}`,
      targetRole: targetStudent.studentType === 'adult_student' ? 'Студент' : 'Родитель',
    };

    saveInteractionToStorage(removeInteraction);

    updatedStudent = {
      ...targetStudent,
      groups: remainingGroups,
      interactions: [removeInteraction, ...(targetStudent.interactions || [])],
    };
    saveStudentToStorage(updatedStudent);
  }

  // Notify all components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crm-groups-changed', { detail: updatedGroup }));
    window.dispatchEvent(new CustomEvent('crm-students-changed', { detail: updatedStudent }));
  }

  return { updatedGroup, updatedStudent };
}

/**
 * Synchronously enrolls student to a group:
 * - Adds student to group.students and recalculates capacity
 * - Adds group to student.groups in studentStorage
 * - Records "Зачисление в группу" interaction in student timeline
 * - Dispatches 'crm-groups-changed' and 'crm-students-changed'
 */
export function enrollStudentToGroup(params: {
  groupId: string;
  studentId: string;
  authorName?: string;
}): { updatedGroup?: FullGroupData; updatedStudent?: FullStudentData } {
  const { groupId, studentId, authorName } = params;

  let updatedGroup: FullGroupData | undefined;
  let updatedStudent: FullStudentData | undefined;

  const targetGroup = getGroupById(groupId);
  const targetStudent = getStoredStudents().find((s) => s.id === studentId);

  if (!targetGroup || !targetStudent) return {};

  // Check if already in group
  const alreadyInGroup = targetGroup.students.some((s) => s.id === targetStudent.id);
  if (!alreadyInGroup) {
    const newStudentEntry = {
      id: targetStudent.id,
      name: `${targetStudent.firstName} ${targetStudent.lastName}`,
      status: targetStudent.status || 'active',
      attendanceRate: targetStudent.attendanceStats?.attendanceRate || '100%',
      parentPhone: targetStudent.phone || targetStudent.parents?.[0]?.phone || '+7 (999) 000-00-00',
      joinedAt: new Date().toLocaleDateString('ru-RU'),
    };

    updatedGroup = {
      ...targetGroup,
      students: [newStudentEntry, ...targetGroup.students],
    };
    saveGroupToStorage(updatedGroup);
  }

  // Update student groups
  const alreadyHasGroup = (targetStudent.groups || []).some((g) => g.id === targetGroup.id);
  if (!alreadyHasGroup) {
    const newGroupEntry = {
      id: targetGroup.id,
      name: targetGroup.name,
      courseName: targetGroup.courseName,
      teacherName: targetGroup.teacherName,
      schedule: targetGroup.schedule,
      status: 'active' as const,
      joinedAt: new Date().toLocaleDateString('ru-RU'),
    };

    const enrollInteraction: TimelineInteraction = {
      id: `int_${Date.now()}`,
      studentId: targetStudent.id,
      studentName: `${targetStudent.firstName} ${targetStudent.lastName}`,
      parentId: targetStudent.parents?.[0]?.id,
      parentName: targetStudent.parents?.[0]
        ? `${targetStudent.parents[0].firstName} ${targetStudent.parents[0].lastName}`
        : undefined,
      occurredAt: 'Только что',
      channel: 'other',
      type: 'status_change',
      author: authorName || 'Администратор школы',
      content: `Зачислен(а) в группу «${targetGroup.name}» (${targetGroup.courseName}, преподаватель ${targetGroup.teacherName}, расписание: ${targetGroup.schedule}).`,
      result: 'Зачисление в группу',
      targetType: targetStudent.studentType === 'adult_student' ? 'student' : 'parent',
      targetName:
        targetStudent.studentType === 'adult_student'
          ? `${targetStudent.firstName} ${targetStudent.lastName}`
          : targetStudent.parents?.[0]
          ? `${targetStudent.parents[0].firstName} ${targetStudent.parents[0].lastName}`
          : `${targetStudent.firstName} ${targetStudent.lastName}`,
      targetRole: targetStudent.studentType === 'adult_student' ? 'Студент' : 'Родитель',
    };

    saveInteractionToStorage(enrollInteraction);

    updatedStudent = {
      ...targetStudent,
      groups: [...(targetStudent.groups || []), newGroupEntry],
      interactions: [enrollInteraction, ...(targetStudent.interactions || [])],
    };
    saveStudentToStorage(updatedStudent);
  }

  // Notify all views
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crm-groups-changed', { detail: updatedGroup }));
    window.dispatchEvent(new CustomEvent('crm-students-changed', { detail: updatedStudent }));
  }

  return { updatedGroup, updatedStudent };
}
