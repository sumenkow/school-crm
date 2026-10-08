import assert from 'assert';
import {
  checkThreeWayCollision,
  isWithinSchoolHours,
  isTimeOverlapping,
  suggestAlternativeSlots,
  CandidateLesson,
} from '../src/lib/data/collisionHelper';
import {
  saveLessonToStorage,
  getStoredLessons,
  getStoredLessonById,
} from '../src/lib/data/lessonStorage';
import { FullLessonData } from '../src/lib/data/mockData';

export async function runSuite29() {
  console.log('\n===============================================================');
  console.log('   SUITE 29 (TS-49): 3-WAY COLLISION GUARD & SHIELD INVARIANTS  ');
  console.log('   Teacher · Group · Student · Operating Hours · Reschedule    ');
  console.log('===============================================================');

  // Set up mock window / localStorage environment if needed
  if (typeof (globalThis as any).window === 'undefined') {
    const store: Record<string, string> = {};
    (globalThis as any).window = {
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    (globalThis as any).localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => {
        store[key] = val;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k in store) delete store[k];
      },
    };
    (globalThis as any).CustomEvent = class CustomEvent {
      type: string;
      detail: any;
      constructor(type: string, params?: any) {
        this.type = type;
        this.detail = params?.detail;
      }
    };
  }

  const timestamp = Date.now();

  // Baseline mock lessons for collision tests
  const baseLesson1: FullLessonData = {
    id: `les_base_1_${timestamp}`,
    groupId: 'g_english_b1',
    groupName: 'English B1 Teens',
    courseName: 'Английский язык',
    teacherId: 'teacher_maria',
    teacherName: 'Мария Иванова',
    date: '2026-10-15',
    dateFormatted: '15.10.2026',
    dayOfWeek: 3,
    startTime: '14:00',
    endTime: '15:15',
    room: 'Онлайн (Zoom 1)',
    topic: 'Unit 4: Present Perfect',
    status: 'scheduled',
    students: [
      { id: 'st_ivan', name: 'Иван Смирнов', attendanceStatus: 'not_marked' },
      { id: 'st_olga', name: 'Ольга Кузнецова', attendanceStatus: 'not_marked' },
    ],
  };

  const baseLesson2: FullLessonData = {
    id: `les_base_2_${timestamp}`,
    groupId: 'g_robotics_sat',
    groupName: 'Robotics Juniors',
    courseName: 'Робототехника',
    teacherId: 'teacher_denis',
    teacherName: 'Денис Смирнов',
    date: '2026-10-15',
    dateFormatted: '15.10.2026',
    dayOfWeek: 3,
    startTime: '16:00',
    endTime: '17:30',
    room: 'Онлайн (Zoom 2)',
    topic: 'Arduino sensors',
    status: 'scheduled',
    students: [
      { id: 'st_artem', name: 'Артем Ветров', attendanceStatus: 'not_marked' },
    ],
  };

  const cancelledLesson: FullLessonData = {
    id: `les_cancelled_${timestamp}`,
    groupId: 'g_math_adv',
    groupName: 'Math Olympiad',
    courseName: 'Математика',
    teacherId: 'teacher_maria',
    teacherName: 'Мария Иванова',
    date: '2026-10-15',
    dateFormatted: '15.10.2026',
    dayOfWeek: 3,
    startTime: '17:45',
    endTime: '19:00',
    room: 'Онлайн (Zoom 1)',
    topic: 'Cancelled topic',
    status: 'cancelled',
    students: [
      { id: 'st_ivan', name: 'Иван Смирнов', attendanceStatus: 'cancelled' },
    ],
  };

  const existingLessons: FullLessonData[] = [baseLesson1, baseLesson2, cancelledLesson];

  // =============================================================
  // TIER 1: Teacher Collision Detection
  // =============================================================
  console.log('▶ [Tier 1] Teacher Schedule Collision Invariants...');

  // 1.1 Overlap with teacher_maria (14:30 - 15:30 overlaps with 14:00 - 15:15)
  const candidateTeacherOverlap: CandidateLesson = {
    date: '2026-10-15',
    startTime: '14:30',
    endTime: '15:30',
    teacherId: 'teacher_maria',
    teacherName: 'Мария Иванова',
    groupId: 'g_different',
    groupName: 'Different Group',
  };
  const resTeacherOverlap = checkThreeWayCollision(existingLessons, candidateTeacherOverlap);
  assert.strictEqual(resTeacherOverlap.hasConflict, true, 'Must detect teacher time overlap');
  assert.ok(
    resTeacherOverlap.conflicts.some((c) => c.type === 'teacher'),
    'Conflict type must include teacher'
  );

  // 1.2 Different time on same day for teacher_maria (18:00 - 19:15)
  const candidateTeacherNoOverlap: CandidateLesson = {
    date: '2026-10-15',
    startTime: '18:00',
    endTime: '19:15',
    teacherId: 'teacher_maria',
    teacherName: 'Мария Иванова',
    groupId: 'g_different',
    groupName: 'Different Group',
  };
  const resTeacherNoOverlap = checkThreeWayCollision(existingLessons, candidateTeacherNoOverlap);
  assert.strictEqual(
    resTeacherNoOverlap.conflicts.some((c) => c.type === 'teacher'),
    false,
    'Must not conflict when teacher is free'
  );

  // 1.3 Cancelled lesson must NOT block teacher slot
  const candidateTeacherAtCancelledTime: CandidateLesson = {
    date: '2026-10-15',
    startTime: '17:45',
    endTime: '19:00',
    teacherId: 'teacher_maria',
    teacherName: 'Мария Иванова',
  };
  const resCancelled = checkThreeWayCollision(existingLessons, candidateTeacherAtCancelledTime);
  assert.strictEqual(
    resCancelled.conflicts.some((c) => c.type === 'teacher'),
    false,
    'Cancelled lesson must not cause collision'
  );
  console.log('  ✓ [T1.01] Teacher collision, free slot, and cancelled lesson exclusion verified.');

  // =============================================================
  // TIER 2: Group Collision Detection
  // =============================================================
  console.log('▶ [Tier 2] Group Schedule Collision Invariants...');

  // 2.1 Overlap for g_english_b1 with a different teacher
  const candidateGroupOverlap: CandidateLesson = {
    date: '2026-10-15',
    startTime: '14:30',
    endTime: '15:45',
    teacherId: 'teacher_denis',
    teacherName: 'Денис Смирнов',
    groupId: 'g_english_b1',
    groupName: 'English B1 Teens',
  };
  const resGroupOverlap = checkThreeWayCollision(existingLessons, candidateGroupOverlap);
  assert.strictEqual(resGroupOverlap.hasConflict, true, 'Must detect group time overlap');
  assert.ok(
    resGroupOverlap.conflicts.some((c) => c.type === 'group'),
    'Conflict type must include group'
  );

  // 2.2 Different group at the same time with free teacher
  const candidateDifferentGroup: CandidateLesson = {
    date: '2026-10-15',
    startTime: '14:00',
    endTime: '15:15',
    teacherId: 'teacher_olga',
    teacherName: 'Ольга Петрова',
    groupId: 'g_new_math',
    groupName: 'New Math Group',
  };
  const resDifferentGroup = checkThreeWayCollision(existingLessons, candidateDifferentGroup);
  assert.strictEqual(
    resDifferentGroup.conflicts.some((c) => c.type === 'group' || c.type === 'teacher'),
    false,
    'Different group and free teacher must not conflict'
  );
  console.log('  ✓ [T2.01] Group collision and independent concurrent group schedule verified.');

  // =============================================================
  // TIER 3: Student Collision Detection
  // =============================================================
  console.log('▶ [Tier 3] Student Schedule Collision Invariants...');

  // 3.1 Individual lesson overlap for student Ivan (who is in English B1 at 14:00-15:15)
  const candidateStudentOverlap: CandidateLesson = {
    date: '2026-10-15',
    startTime: '14:30',
    endTime: '15:30',
    teacherId: 'teacher_denis',
    teacherName: 'Денис Смирнов',
    isIndividual: true,
    studentId: 'st_ivan',
    studentName: 'Иван Смирнов',
  };
  const resStudentOverlap = checkThreeWayCollision(existingLessons, candidateStudentOverlap);
  assert.strictEqual(resStudentOverlap.hasConflict, true, 'Must detect student time overlap');
  assert.ok(
    resStudentOverlap.conflicts.some((c) => c.type === 'student'),
    'Conflict type must include student'
  );

  // 3.2 Student schedule free at 17:30
  const candidateStudentFree: CandidateLesson = {
    date: '2026-10-15',
    startTime: '17:30',
    endTime: '18:30',
    teacherId: 'teacher_denis',
    teacherName: 'Денис Смирнов',
    isIndividual: true,
    studentId: 'st_ivan',
    studentName: 'Иван Смирнов',
  };
  const resStudentFree = checkThreeWayCollision(existingLessons, candidateStudentFree);
  assert.strictEqual(
    resStudentFree.conflicts.some((c) => c.type === 'student'),
    false,
    'Free student time must not conflict'
  );
  console.log('  ✓ [T3.01] Student schedule overlap and individual lesson protection verified.');

  // =============================================================
  // TIER 4: School Operating Hours Invariants (09:00 – 21:00)
  // =============================================================
  console.log('▶ [Tier 4] School Operating Hours Invariants (09:00–21:00)...');

  // 4.1 Lesson before 09:00
  const candidateEarly: CandidateLesson = {
    date: '2026-10-15',
    startTime: '08:00',
    endTime: '09:15',
    teacherId: 'teacher_maria',
  };
  const resEarly = checkThreeWayCollision(existingLessons, candidateEarly);
  assert.strictEqual(resEarly.hasConflict, true);
  assert.ok(resEarly.conflicts.some((c) => c.type === 'hours'), 'Must detect early out-of-hours');

  // 4.2 Lesson after 21:00
  const candidateLate: CandidateLesson = {
    date: '2026-10-15',
    startTime: '20:30',
    endTime: '21:45',
    teacherId: 'teacher_maria',
  };
  const resLate = checkThreeWayCollision(existingLessons, candidateLate);
  assert.strictEqual(resLate.hasConflict, true);
  assert.ok(resLate.conflicts.some((c) => c.type === 'hours'), 'Must detect late out-of-hours');

  // 4.3 Valid lesson exactly in operating hours
  const candidateValidHours: CandidateLesson = {
    date: '2026-10-15',
    startTime: '09:00',
    endTime: '10:15',
    teacherId: 'teacher_maria',
  };
  assert.strictEqual(isWithinSchoolHours(candidateValidHours), true);
  console.log('  ✓ [T4.01] 09:00–21:00 boundary enforcement verified.');

  // =============================================================
  // TIER 5: Reschedule Self-Exclusion Invariant
  // =============================================================
  console.log('▶ [Tier 5] Reschedule Self-Exclusion Invariants...');

  // 5.1 When editing baseLesson1 (updating topic or shifting within same slot), candidate.id = baseLesson1.id
  const candidateSelfEdit: CandidateLesson = {
    id: baseLesson1.id,
    date: '2026-10-15',
    startTime: '14:00',
    endTime: '15:15',
    teacherId: 'teacher_maria',
    teacherName: 'Мария Иванова',
    groupId: 'g_english_b1',
    groupName: 'English B1 Teens',
  };
  const resSelfEdit = checkThreeWayCollision(existingLessons, candidateSelfEdit);
  assert.strictEqual(
    resSelfEdit.hasConflict,
    false,
    'Editing existing lesson must not conflict with itself'
  );

  // 5.2 Rescheduling baseLesson1 into baseLesson2 slot (16:00–17:30) with teacher_denis
  const candidateRescheduleConflict: CandidateLesson = {
    id: baseLesson1.id,
    date: '2026-10-15',
    startTime: '16:15',
    endTime: '17:30',
    teacherId: 'teacher_denis', // teacher_denis already has baseLesson2
    teacherName: 'Денис Смирнов',
  };
  const resRescheduleConflict = checkThreeWayCollision(existingLessons, candidateRescheduleConflict);
  assert.strictEqual(
    resRescheduleConflict.hasConflict,
    true,
    'Rescheduling into an occupied slot must trigger collision'
  );
  console.log('  ✓ [T5.01] Self-exclusion on edit and collision guard on reschedule verified.');

  // =============================================================
  // TIER 6: Nearest Free Slot Suggestions Invariants
  // =============================================================
  console.log('▶ [Tier 6] Nearest Free Slot Suggestions Generation...');

  const suggestions = suggestAlternativeSlots(existingLessons, candidateTeacherOverlap, 3);
  assert.ok(Array.isArray(suggestions), 'Suggestions must be an array');
  assert.ok(suggestions.length > 0, 'Must provide available slot suggestions');
  for (const slot of suggestions) {
    assert.ok(slot.startTime, 'Suggested slot must have startTime');
    assert.ok(slot.endTime, 'Suggested slot must have endTime');
    assert.strictEqual(
      isWithinSchoolHours(slot.startTime, slot.endTime),
      true,
      'Suggested slots must be strictly within school operating hours'
    );
  }
  console.log('  ✓ [T6.01] Non-colliding slot suggestions generation verified.');

  // =============================================================
  // TIER 7: Mutation-Level Guard in saveLessonToStorage
  // =============================================================
  console.log('▶ [Tier 7] Mutation-Level Collision Guard in Storage Layer...');

  // Save baseline lesson to storage
  saveLessonToStorage(baseLesson1, { bypassCollisionCheck: true });
  saveLessonToStorage(baseLesson2, { bypassCollisionCheck: true });

  // Try saving a colliding lesson without bypassCollisionCheck
  const collidingSaveCandidate: FullLessonData = {
    id: `les_collide_${timestamp}`,
    groupId: 'g_other',
    groupName: 'Other Group',
    courseName: 'Другой курс',
    teacherId: 'teacher_maria',
    teacherName: 'Мария Иванова',
    date: '2026-10-15',
    dateFormatted: '15.10.2026',
    dayOfWeek: 3,
    startTime: '14:15',
    endTime: '15:30',
    room: 'Онлайн (Zoom 1)',
    topic: 'Collision test topic',
    status: 'scheduled',
    students: [],
  };

  const saveBlockedResult = saveLessonToStorage(collidingSaveCandidate);
  assert.strictEqual(
    saveBlockedResult.success,
    false,
    'saveLessonToStorage must block colliding lesson'
  );
  assert.ok(saveBlockedResult.collision?.hasConflict, 'Must return collision object');

  // Save with bypassCollisionCheck
  const saveBypassedResult = saveLessonToStorage(collidingSaveCandidate, {
    bypassCollisionCheck: true,
  });
  assert.strictEqual(
    saveBypassedResult.success,
    true,
    'saveLessonToStorage with bypassCollisionCheck must succeed'
  );
  console.log('  ✓ [T7.01] Storage mutation guard successfully verified.');

  console.log('\n===============================================================');
  console.log('   ✅ ALL SUITE 29 (TS-49) 3-WAY COLLISION INVARIANTS PASSED   ');
  console.log('===============================================================\n');
}
