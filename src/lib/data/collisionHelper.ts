import { FullLessonData } from '@/types';

export interface CandidateLesson {
  id?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  teacherId?: string;
  teacherName?: string;
  groupId?: string;
  groupName?: string;
  studentId?: string;
  studentName?: string;
  isIndividual?: boolean;
  room?: string;
  students?: Array<{ id: string; name?: string; attendanceStatus?: string }>;
  status?: string;
}

export type LessonTimeSlot = CandidateLesson;

export interface ConflictDetail {
  type: 'teacher' | 'group' | 'student' | 'hours' | 'room';
  message: string;
  conflictingLesson?: FullLessonData;
}

export interface AvailableSlot {
  date?: string;
  startTime: string;
  endTime: string;
  label?: string; // e.g. "17:15 – 18:30"
}

export interface CollisionResult {
  hasConflict: boolean;
  conflicts: ConflictDetail[];
  nearestSlots: AvailableSlot[];
  // Backward compatibility fields
  hasCollision: boolean;
  type?: 'teacher' | 'room' | 'both' | 'group' | 'student' | 'hours';
  conflictingLesson?: FullLessonData;
  reason?: string;
}

/**
 * Converts HH:mm time string to minutes since midnight
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10) || 0);
  return h * 60 + m;
}

/**
 * Converts minutes since midnight back to HH:mm formatted string
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(h)}:${pad(m)}`;
}

/**
 * Checks if two time intervals [startA, endA) and [startB, endB) overlap
 */
export function isTimeOverlapping(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const sA = timeToMinutes(startA);
  const eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  const eB = timeToMinutes(endB);

  // Overlap condition: max(startA, startB) < min(endA, endB)
  return Math.max(sA, sB) < Math.min(eA, eB);
}

/**
 * Strictly verifies whether a lesson or time slot is within school operating hours (09:00–21:00).
 * Supports flexible invocations:
 * - isWithinSchoolHours(candidate: CandidateLesson)
 * - isWithinSchoolHours(startTime: string, durationMinutes: number, startHour?: number, endHour?: number)
 * - isWithinSchoolHours(startTime: string, endTime: string, startHour?: number, endHour?: number)
 */
export function isWithinSchoolHours(
  timeStrOrCandidate: string | CandidateLesson,
  durationOrEndTime?: number | string,
  startHour: number = 9,
  endHour: number = 21
): boolean {
  const schoolOpenMin = startHour * 60; // 09:00 = 540
  const schoolCloseMin = endHour * 60; // 21:00 = 1260

  if (typeof timeStrOrCandidate === 'object' && timeStrOrCandidate !== null) {
    const candidate = timeStrOrCandidate;
    if (!candidate.startTime || !candidate.endTime) return false;
    const startMin = timeToMinutes(candidate.startTime);
    const endMin = timeToMinutes(candidate.endTime);
    return startMin >= schoolOpenMin && endMin <= schoolCloseMin && endMin > startMin;
  }

  const timeStr = timeStrOrCandidate;
  const startMin = timeToMinutes(timeStr);

  if (typeof durationOrEndTime === 'number') {
    const duration = durationOrEndTime;
    if (duration <= 0) return false;
    const endMin = startMin + duration;
    return startMin >= schoolOpenMin && endMin <= schoolCloseMin;
  }

  if (typeof durationOrEndTime === 'string') {
    const endMin = timeToMinutes(durationOrEndTime);
    return startMin >= schoolOpenMin && endMin <= schoolCloseMin && endMin > startMin;
  }

  // If only start time was provided without duration, check that it's within operating window
  return startMin >= schoolOpenMin && startMin <= schoolCloseMin;
}

/**
 * Checks if a candidate lesson causes a schedule conflict for a teacher.
 * Pending lessons ('pending') and planned/scheduled lessons ('planned' | 'scheduled') reserve the slot.
 * Cancelled and rejected lessons are ignored.
 */
export function hasTeacherCollision(
  existingLessons: FullLessonData[],
  candidate: CandidateLesson
): boolean {
  if (!candidate.teacherId || !candidate.date || !candidate.startTime || !candidate.endTime) {
    return false;
  }

  return existingLessons.some((l) => {
    // Ignore self
    if (candidate.id && l.id === candidate.id) return false;
    // Ignore cancelled / rejected lessons
    if (l.status === 'cancelled' || (l.status as string) === 'rejected') return false;
    // Must be same teacher on same date
    if (l.teacherId !== candidate.teacherId || l.date !== candidate.date) return false;

    return isTimeOverlapping(l.startTime, l.endTime, candidate.startTime, candidate.endTime);
  });
}

/**
 * Checks if a candidate lesson causes a schedule conflict for a group.
 * Group lessons cannot overlap with other lessons for the same group.
 */
export function hasGroupCollision(
  existingLessons: FullLessonData[],
  candidate: CandidateLesson
): boolean {
  if (!candidate.groupId || !candidate.date || !candidate.startTime || !candidate.endTime) {
    return false;
  }

  // Individual lessons without group are not group-bound
  if (candidate.isIndividual && !candidate.groupId) {
    return false;
  }

  return existingLessons.some((l) => {
    // Ignore self
    if (candidate.id && l.id === candidate.id) return false;
    // Ignore cancelled / rejected lessons
    if (l.status === 'cancelled' || (l.status as string) === 'rejected') return false;
    // Must be same group on same date
    if (!l.groupId || l.groupId !== candidate.groupId || l.date !== candidate.date) return false;

    return isTimeOverlapping(l.startTime, l.endTime, candidate.startTime, candidate.endTime);
  });
}

/**
 * Checks if a candidate lesson causes a schedule conflict for any participating student.
 * An individual student cannot participate in two lessons simultaneously (group or individual).
 */
export function hasStudentCollision(
  existingLessons: FullLessonData[],
  candidate: CandidateLesson
): boolean {
  if (!candidate.date || !candidate.startTime || !candidate.endTime) {
    return false;
  }

  const candidateStudentIds = new Set<string>();
  if (candidate.studentId) {
    candidateStudentIds.add(candidate.studentId);
  }
  if (candidate.students && Array.isArray(candidate.students)) {
    for (const s of candidate.students) {
      if (s && s.id) candidateStudentIds.add(s.id);
    }
  }

  if (candidateStudentIds.size === 0) {
    return false;
  }

  return existingLessons.some((l) => {
    // Ignore self
    if (candidate.id && l.id === candidate.id) return false;
    // Ignore cancelled / rejected lessons
    if (l.status === 'cancelled' || (l.status as string) === 'rejected') return false;
    // Must be same date
    if (l.date !== candidate.date) return false;
    // Must overlap in time
    if (!isTimeOverlapping(l.startTime, l.endTime, candidate.startTime, candidate.endTime)) {
      return false;
    }

    // Check if l has any of the candidate's students
    if (l.studentId && candidateStudentIds.has(l.studentId)) return true;
    if (l.students && l.students.some((s) => candidateStudentIds.has(s.id))) return true;

    return false;
  });
}

/**
 * Checks if a candidate lesson causes a schedule conflict for a physical room.
 * Virtual rooms ('online', 'zoom') never collide.
 */
export function hasRoomCollision(
  existingLessons: FullLessonData[],
  candidate: CandidateLesson
): boolean {
  if (!candidate.room || !candidate.date || !candidate.startTime || !candidate.endTime) {
    return false;
  }

  // Ignore virtual / online rooms
  const lowerRoom = candidate.room.toLowerCase();
  if (lowerRoom.includes('online') || lowerRoom.includes('zoom') || lowerRoom.includes('онлайн')) {
    return false;
  }

  return existingLessons.some((l) => {
    // Ignore self
    if (candidate.id && l.id === candidate.id) return false;
    // Ignore cancelled / rejected lessons
    if (l.status === 'cancelled' || (l.status as string) === 'rejected') return false;
    // Must be same room on same date
    if (!l.room || l.room.toLowerCase() !== lowerRoom || l.date !== candidate.date) return false;

    return isTimeOverlapping(l.startTime, l.endTime, candidate.startTime, candidate.endTime);
  });
}

/**
 * Suggests up to `count` (default 3) non-colliding time slots for candidate on candidate.date
 * strictly within school operating hours (09:00 – 21:00).
 */
export function suggestAlternativeSlots(
  existingLessons: FullLessonData[],
  candidate: CandidateLesson,
  count: number = 3
): AvailableSlot[] {
  const schoolOpenMin = 9 * 60; // 09:00 = 540
  const schoolCloseMin = 21 * 60; // 21:00 = 1260

  const reqStartMin = timeToMinutes(candidate.startTime) || 540;
  let durationMinutes = timeToMinutes(candidate.endTime) - timeToMinutes(candidate.startTime);
  if (durationMinutes <= 0 || isNaN(durationMinutes)) {
    durationMinutes = 60;
  }

  const candidateStudentIds = new Set<string>();
  if (candidate.studentId) candidateStudentIds.add(candidate.studentId);
  if (candidate.students && Array.isArray(candidate.students)) {
    for (const s of candidate.students) {
      if (s && s.id) candidateStudentIds.add(s.id);
    }
  }

  // 1. Gather all busy intervals on candidate date for teacher, group, student, and room
  const busyIntervals: Array<{ start: number; end: number }> = [];

  for (const l of existingLessons) {
    if (candidate.id && l.id === candidate.id) continue;
    if (l.status === 'cancelled' || (l.status as string) === 'rejected') continue;
    if (l.date !== candidate.date) continue;

    const teacherMatch = candidate.teacherId && l.teacherId === candidate.teacherId;
    const groupMatch = candidate.groupId && l.groupId === candidate.groupId;
    let studentMatch = false;
    if (candidateStudentIds.size > 0) {
      if (l.studentId && candidateStudentIds.has(l.studentId)) studentMatch = true;
      if (l.students && l.students.some((s) => candidateStudentIds.has(s.id))) studentMatch = true;
    }
    const roomMatch =
      candidate.room &&
      !candidate.room.toLowerCase().includes('zoom') &&
      !candidate.room.toLowerCase().includes('online') &&
      !candidate.room.toLowerCase().includes('онлайн') &&
      l.room &&
      l.room.toLowerCase() === candidate.room.toLowerCase();

    if (teacherMatch || groupMatch || studentMatch || roomMatch) {
      const s = timeToMinutes(l.startTime);
      const e = timeToMinutes(l.endTime);
      if (e > s) {
        busyIntervals.push({ start: s, end: e });
      }
    }
  }

  // 2. Identify potential start times
  const potentialStarts = new Set<number>();

  // Add 15-minute grid start times
  for (let m = schoolOpenMin; m <= schoolCloseMin - durationMinutes; m += 15) {
    potentialStarts.add(m);
  }

  // Add start times immediately following busy intervals
  for (const b of busyIntervals) {
    if (b.end >= schoolOpenMin && b.end <= schoolCloseMin - durationMinutes) {
      potentialStarts.add(b.end);
    }
  }

  // 3. Filter valid non-colliding slots
  const validStarts: number[] = [];

  for (const sMin of potentialStarts) {
    const eMin = sMin + durationMinutes;
    if (sMin < schoolOpenMin || eMin > schoolCloseMin) continue;

    const hasCollision = busyIntervals.some(
      (b) => Math.max(sMin, b.start) < Math.min(eMin, b.end)
    );

    if (!hasCollision) {
      validStarts.push(sMin);
    }
  }

  if (validStarts.length === 0) {
    return [];
  }

  // 4. Sort by proximity to requested start time.
  // Slots at or after requested time are prioritized slightly over earlier slots.
  validStarts.sort((a, b) => {
    const distA = Math.abs(a - reqStartMin);
    const distB = Math.abs(b - reqStartMin);
    if (distA !== distB) return distA - distB;
    // Prefer forward in time if equal distance
    return (a >= reqStartMin ? 0 : 1) - (b >= reqStartMin ? 0 : 1);
  });

  // Take top `count` slots and sort them chronologically for display
  const topSlots = validStarts.slice(0, count).sort((a, b) => a - b);

  return topSlots.map((sMin) => {
    const eMin = sMin + durationMinutes;
    const startStr = minutesToTime(sMin);
    const endStr = minutesToTime(eMin);
    return {
      date: candidate.date,
      startTime: startStr,
      endTime: endStr,
      label: `${startStr} – ${endStr}`,
    };
  });
}

/**
 * Comprehensive 3-Way Collision Detection Engine
 * Validates:
 * 1. School operating hours (09:00 – 21:00)
 * 2. Teacher schedule collision
 * 3. Group schedule collision
 * 4. Student schedule collision
 * 5. Physical room collision (if applicable)
 * Returns CollisionResult with conflicts and nearest free slot suggestions.
 */
export function checkThreeWayCollision(
  existingLessons: FullLessonData[],
  candidate: CandidateLesson
): CollisionResult {
  const conflicts: ConflictDetail[] = [];

  // Guard 1: School Operating Hours (09:00 - 21:00)
  const isHoursOk = isWithinSchoolHours(candidate);
  if (!isHoursOk) {
    conflicts.push({
      type: 'hours',
      message: 'Время занятия выходит за рамки рабочих часов школы (09:00 – 21:00)',
    });
  }

  // Guard 2: Teacher Collision Guard
  if (candidate.teacherId && candidate.date && candidate.startTime && candidate.endTime) {
    const conflictingTeacherLesson = existingLessons.find((l) => {
      if (candidate.id && l.id === candidate.id) return false;
      if (l.status === 'cancelled' || (l.status as string) === 'rejected') return false;
      if (l.teacherId !== candidate.teacherId || l.date !== candidate.date) return false;
      return isTimeOverlapping(l.startTime, l.endTime, candidate.startTime, candidate.endTime);
    });

    if (conflictingTeacherLesson) {
      conflicts.push({
        type: 'teacher',
        message: `Конфликт преподавателя: ${conflictingTeacherLesson.teacherName || 'Преподаватель'} уже ведёт урок (${conflictingTeacherLesson.startTime} – ${conflictingTeacherLesson.endTime})`,
        conflictingLesson: conflictingTeacherLesson,
      });
    }
  }

  // Guard 3: Group Collision Guard
  const isGroupLesson = !candidate.isIndividual || !!candidate.groupId;
  if (isGroupLesson && candidate.groupId && candidate.date && candidate.startTime && candidate.endTime) {
    const conflictingGroupLesson = existingLessons.find((l) => {
      if (candidate.id && l.id === candidate.id) return false;
      if (l.status === 'cancelled' || (l.status as string) === 'rejected') return false;
      if (!l.groupId || l.groupId !== candidate.groupId || l.date !== candidate.date) return false;
      return isTimeOverlapping(l.startTime, l.endTime, candidate.startTime, candidate.endTime);
    });

    if (conflictingGroupLesson) {
      conflicts.push({
        type: 'group',
        message: `Конфликт группы: группа ${conflictingGroupLesson.groupName || candidate.groupId} уже имеет урок (${conflictingGroupLesson.startTime} – ${conflictingGroupLesson.endTime})`,
        conflictingLesson: conflictingGroupLesson,
      });
    }
  }

  // Guard 4: Student Collision Guard
  const candidateStudentIds = new Set<string>();
  if (candidate.studentId) candidateStudentIds.add(candidate.studentId);
  if (candidate.students && Array.isArray(candidate.students)) {
    for (const s of candidate.students) {
      if (s && s.id) candidateStudentIds.add(s.id);
    }
  }

  if (candidateStudentIds.size > 0 && candidate.date && candidate.startTime && candidate.endTime) {
    const conflictingStudentLesson = existingLessons.find((l) => {
      if (candidate.id && l.id === candidate.id) return false;
      if (l.status === 'cancelled' || (l.status as string) === 'rejected') return false;
      if (l.date !== candidate.date) return false;
      if (!isTimeOverlapping(l.startTime, l.endTime, candidate.startTime, candidate.endTime)) return false;

      if (l.studentId && candidateStudentIds.has(l.studentId)) return true;
      if (l.students && l.students.some((s) => candidateStudentIds.has(s.id))) return true;
      return false;
    });

    if (conflictingStudentLesson) {
      const matchStudent = conflictingStudentLesson.students?.find((s) => candidateStudentIds.has(s.id));
      const studentLabel = matchStudent?.name || candidate.studentName || 'Ученик';
      conflicts.push({
        type: 'student',
        message: `Конфликт ученика: ${studentLabel} уже записан(а) на занятие (${conflictingStudentLesson.startTime} – ${conflictingStudentLesson.endTime})`,
        conflictingLesson: conflictingStudentLesson,
      });
    }
  }

  // Guard 5: Physical Room Collision Guard
  if (candidate.room && hasRoomCollision(existingLessons, candidate)) {
    const conflictingRoomLesson = existingLessons.find((l) => {
      if (candidate.id && l.id === candidate.id) return false;
      if (l.status === 'cancelled' || (l.status as string) === 'rejected') return false;
      if (l.date !== candidate.date) return false;
      if (!l.room || l.room.toLowerCase() !== candidate.room?.toLowerCase()) return false;
      return isTimeOverlapping(l.startTime, l.endTime, candidate.startTime, candidate.endTime);
    });

    if (conflictingRoomLesson) {
      conflicts.push({
        type: 'room',
        message: `Конфликт кабинета: кабинет ${candidate.room} уже занят (${conflictingRoomLesson.startTime} – ${conflictingRoomLesson.endTime})`,
        conflictingLesson: conflictingRoomLesson,
      });
    }
  }

  const hasConflict = conflicts.length > 0;
  const nearestSlots = hasConflict ? suggestAlternativeSlots(existingLessons, candidate, 3) : [];

  return {
    hasConflict,
    hasCollision: hasConflict,
    conflicts,
    nearestSlots,
    conflictingLesson: conflicts[0]?.conflictingLesson,
    type: conflicts.length > 1 ? 'both' : conflicts[0]?.type,
    reason: conflicts.map((c) => c.message).join('; '),
  };
}

/**
 * Legacy full collision detector for backward compatibility.
 * Delegates to checkThreeWayCollision and returns formatted CollisionResult.
 */
export function detectLessonCollisions(
  existingLessons: FullLessonData[],
  candidate: CandidateLesson
): CollisionResult {
  return checkThreeWayCollision(existingLessons, candidate);
}

export interface TeacherTimeSlot {
  startTime: string;
  endTime: string;
  label: string;
  isAvailable: boolean;
  reason?: string;
}

/**
 * Calculates time slots for an individual teacher on a specific date,
 * checking overlaps against existing teacher lessons within working hours.
 */
export function getTeacherDayScheduleSlots(
  existingLessons: FullLessonData[],
  teacherId: string,
  date: string,
  durationMinutes: number = 60,
  startHour: number = 10,
  endHour: number = 21
): TeacherTimeSlot[] {
  const slots: TeacherTimeSlot[] = [];
  const startMin = Math.max(9 * 60, startHour * 60);
  const endMin = Math.min(21 * 60, endHour * 60);

  // Active lessons for this teacher on this date
  const teacherLessonsOnDate = existingLessons.filter((l) => {
    if (l.teacherId !== teacherId) return false;
    if (l.date !== date) return false;
    if (l.status === 'cancelled' || (l.status as string) === 'rejected') return false;
    return true;
  });

  for (let m = startMin; m + durationMinutes <= endMin; m += durationMinutes) {
    const sTime = minutesToTime(m);
    const eTime = minutesToTime(m + durationMinutes);

    const isBusy = teacherLessonsOnDate.some((l) =>
      isTimeOverlapping(l.startTime, l.endTime, sTime, eTime)
    );

    slots.push({
      startTime: sTime,
      endTime: eTime,
      label: `${sTime} – ${eTime}`,
      isAvailable: !isBusy,
      reason: isBusy ? 'Занято' : 'Свободно',
    });
  }

  return slots;
}
