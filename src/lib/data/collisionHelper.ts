import { FullLessonData } from './mockData';

export interface LessonTimeSlot {
  id?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  teacherId?: string;
  room?: string;
  status?: string;
}

export interface CollisionResult {
  hasCollision: boolean;
  type?: 'teacher' | 'room' | 'both';
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
 * Checks if a candidate lesson causes a schedule conflict for a teacher
 */
export function hasTeacherCollision(
  existingLessons: FullLessonData[],
  candidate: LessonTimeSlot
): boolean {
  if (!candidate.teacherId || !candidate.date || !candidate.startTime || !candidate.endTime) {
    return false;
  }

  return existingLessons.some((l) => {
    // Ignore self
    if (candidate.id && l.id === candidate.id) return false;
    // Ignore cancelled lessons
    if (l.status === 'cancelled') return false;
    // Must be same teacher on same date
    if (l.teacherId !== candidate.teacherId || l.date !== candidate.date) return false;

    return isTimeOverlapping(l.startTime, l.endTime, candidate.startTime, candidate.endTime);
  });
}

/**
 * Checks if a candidate lesson causes a schedule conflict for a physical room
 */
export function hasRoomCollision(
  existingLessons: FullLessonData[],
  candidate: LessonTimeSlot
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
    // Ignore cancelled lessons
    if (l.status === 'cancelled') return false;
    // Must be same room on same date
    if (!l.room || l.room.toLowerCase() !== lowerRoom || l.date !== candidate.date) return false;

    return isTimeOverlapping(l.startTime, l.endTime, candidate.startTime, candidate.endTime);
  });
}

/**
 * Full collision detector for both teacher and room
 */
export function detectLessonCollisions(
  existingLessons: FullLessonData[],
  candidate: LessonTimeSlot
): CollisionResult {
  const teacherConflict = hasTeacherCollision(existingLessons, candidate);
  const roomConflict = hasRoomCollision(existingLessons, candidate);

  if (teacherConflict && roomConflict) {
    const conflicting = existingLessons.find(
      (l) =>
        (candidate.id ? l.id !== candidate.id : true) &&
        l.status !== 'cancelled' &&
        l.date === candidate.date &&
        (l.teacherId === candidate.teacherId ||
          (l.room && candidate.room && l.room.toLowerCase() === candidate.room.toLowerCase())) &&
        isTimeOverlapping(l.startTime, l.endTime, candidate.startTime, candidate.endTime)
    );
    return {
      hasCollision: true,
      type: 'both',
      conflictingLesson: conflicting,
      reason: 'Конфликт расписания: преподаватель и кабинет уже заняты в это время',
    };
  }

  if (teacherConflict) {
    const conflicting = existingLessons.find(
      (l) =>
        (candidate.id ? l.id !== candidate.id : true) &&
        l.status !== 'cancelled' &&
        l.date === candidate.date &&
        l.teacherId === candidate.teacherId &&
        isTimeOverlapping(l.startTime, l.endTime, candidate.startTime, candidate.endTime)
    );
    return {
      hasCollision: true,
      type: 'teacher',
      conflictingLesson: conflicting,
      reason: 'Конфликт расписания: преподаватель уже ведет другой урок в это время',
    };
  }

  if (roomConflict) {
    const conflicting = existingLessons.find(
      (l) =>
        (candidate.id ? l.id !== candidate.id : true) &&
        l.status !== 'cancelled' &&
        l.date === candidate.date &&
        l.room &&
        candidate.room &&
        l.room.toLowerCase() === candidate.room.toLowerCase() &&
        isTimeOverlapping(l.startTime, l.endTime, candidate.startTime, candidate.endTime)
    );
    return {
      hasCollision: true,
      type: 'room',
      conflictingLesson: conflicting,
      reason: 'Конфликт расписания: кабинет уже занят другой группой в это время',
    };
  }

  return { hasCollision: false };
}
