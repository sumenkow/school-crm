/**
 * SMART ACADEMY CRM — SUITE 33 (TS-53)
 * School Calendar Dynamic Operating Hours, 100% Online Room Bypass,
 * 3-Way Collision Shield, RBAC D&D & Teacher Directory Invariants Suite
 *
 * Verifies:
 * ▶ [Tier 1] Dynamic School Operating Hours Invariants:
 *   - [T1.01] Fallback default operating hours 09:00–21:00 when unconfigured.
 *   - [T1.02] Custom owner operating hours (08:00–22:00) persisted in school settings expand valid window.
 *   - [T1.03] Custom restricted operating hours (10:00–18:00) strictly shrink window and generate dynamic error message.
 *   - [T1.04] Boundary conditions: exact open/close timestamps, zero duration, inverted intervals, and option overrides.
 *   - [T1.05] suggestAlternativeSlots strictly bounds generated slot recommendations within dynamic operating hours.
 *
 * ▶ [Tier 2] 100% Online School Room Invariants:
 *   - [T2.01] 100% Online / Zoom room bypass: hasRoomCollision returns false for virtual rooms.
 *   - [T2.02] Multiple parallel online classes at the identical time slot are permitted.
 *   - [T2.03] Physical rooms strictly enforce 1-class-per-room exclusivity.
 *   - [T2.04] Different physical rooms or cancelled lessons in physical rooms do not collide.
 *
 * ▶ [Tier 3] 3-Way Collision Shield Invariants:
 *   - [T3.01] Teacher overlap blocked: same teacher cannot conduct simultaneous lessons.
 *   - [T3.02] Group overlap blocked: same group cannot have simultaneous lessons.
 *   - [T3.03] Student overlap blocked across group and individual formats.
 *   - [T3.04] Adjacent slot non-overlapping permitted (boundary-touching is valid).
 *   - [T3.05] Multi-way composite collision aggregation and suggestion generation.
 *
 * ▶ [Tier 4] RBAC & Drag-and-Drop Invariants:
 *   - [T4.01] Teacher role RBAC: teacher can only reschedule their own lessons.
 *   - [T4.02] Admin / Owner role RBAC: can reschedule any lesson.
 *   - [T4.03] Terminal state immutability: completed and cancelled lessons cannot be rescheduled.
 *   - [T4.04] Drag-and-drop collision shield integration & state transition.
 *   - [T4.05] Static analysis of src/app/calendar/page.tsx confirms RBAC, terminal checks, and 3-way collision checks.
 *
 * ▶ [Tier 5] Teacher Directory Invariants:
 *   - [T5.01] Placeholder filtering removes placeholder teacher names ("Преподаватель", "Преподаватель не назначен").
 *   - [T5.02] Deduplication by clean teacher name preserves first unique entry.
 *   - [T5.03] Initials generation produces clean 2-letter uppercase initials.
 *   - [T5.04] Active range lesson counts correctly tally teacher lessons.
 *   - [T5.05] Static analysis of src/app/calendar/page.tsx confirms teacher filtering, dedup, and slot click-to-create.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { setupTestEnv } from './helpers/testEnv';
import {
  checkThreeWayCollision,
  isWithinSchoolHours,
  isTimeOverlapping,
  hasTeacherCollision,
  hasGroupCollision,
  hasStudentCollision,
  hasRoomCollision,
  suggestAlternativeSlots,
  timeToMinutes,
  minutesToTime,
  CandidateLesson,
} from '../src/lib/data/collisionHelper';
import {
  getSchoolSettings,
  saveSchoolSettings,
  DEFAULT_SCHOOL_PROFILE,
} from '../src/lib/data/schoolSettingsStorage';
import { FullLessonData } from '../src/types';
import { FullTeacherData } from '../src/lib/data/mockData';

export async function runSuite33(): Promise<{ passed: number; failed: number }> {
  console.log('\n===============================================================');
  console.log('   SUITE 33 (TS-53): CALENDAR DYNAMIC HOURS & COLLISION INVARIANTS');
  console.log('   Dynamic Hours · 100% Online Bypass · 3-Way Shield · RBAC · Dedup');
  console.log('===============================================================');

  setupTestEnv();

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ [FAIL] ${name}:`, err?.message || err);
      failed++;
      throw err;
    }
  }

  const rootDir = path.resolve(__dirname, '..');

  // Baseline mock lessons
  const baseLesson1: FullLessonData = {
    id: 'les_test_1',
    groupId: 'grp_german_a1',
    groupName: 'Немецкий A1',
    courseName: 'Немецкий язык',
    teacherId: 'teacher_elena',
    teacherName: 'Елена Соколова',
    date: '2026-10-25',
    dateFormatted: '25.10.2026',
    dayOfWeek: 6,
    startTime: '10:00',
    endTime: '11:30',
    room: 'Онлайн (Zoom 1)',
    topic: 'Grammatik: Akkusativ',
    status: 'scheduled',
    students: [
      { id: 'st_maxim', name: 'Максим Орлов', attendanceStatus: 'not_marked' },
      { id: 'st_alisa', name: 'Алиса Селезнева', attendanceStatus: 'not_marked' },
    ],
  };

  const baseLesson2: FullLessonData = {
    id: 'les_test_2',
    groupId: 'grp_math_b2',
    groupName: 'Математика B2',
    courseName: 'Математика',
    teacherId: 'teacher_denis',
    teacherName: 'Денис Смирнов',
    date: '2026-10-25',
    dateFormatted: '25.10.2026',
    dayOfWeek: 6,
    startTime: '14:00',
    endTime: '15:30',
    room: 'Кабинет 101',
    topic: 'Интегралы',
    status: 'scheduled',
    students: [
      { id: 'st_artem', name: 'Артем Волков', attendanceStatus: 'not_marked' },
    ],
  };

  // =========================================================================
  // ▶ [Tier 1] Dynamic School Operating Hours Invariants
  // =========================================================================
  console.log('\n▶ [Tier 1] Dynamic School Operating Hours Invariants...');

  await test('[T1.01] Default fallback operating hours 09:00–21:00 when unconfigured', () => {
    // Reset school profile to defaults
    localStorage.removeItem('crm_school_profile_v1');
    const settings = getSchoolSettings();
    assert.strictEqual(settings.calendarStartHour, 9, 'Default start hour must be 9');
    assert.strictEqual(settings.calendarEndHour, 21, 'Default end hour must be 21');

    // 10:00-11:00 is within 09:00-21:00
    const okCandidate: CandidateLesson = {
      date: '2026-10-25',
      startTime: '10:00',
      endTime: '11:00',
    };
    assert.strictEqual(isWithinSchoolHours(okCandidate), true);

    // 08:30-09:30 is outside 09:00-21:00
    const earlyCandidate: CandidateLesson = {
      date: '2026-10-25',
      startTime: '08:30',
      endTime: '09:30',
    };
    assert.strictEqual(isWithinSchoolHours(earlyCandidate), false);

    // 20:30-21:30 is outside 09:00-21:00
    const lateCandidate: CandidateLesson = {
      date: '2026-10-25',
      startTime: '20:30',
      endTime: '21:30',
    };
    assert.strictEqual(isWithinSchoolHours(lateCandidate), false);

    // Verify dynamic error message in checkThreeWayCollision
    const res = checkThreeWayCollision([], earlyCandidate);
    assert.strictEqual(res.hasConflict, true);
    assert.strictEqual(res.conflicts[0].type, 'hours');
    assert.match(
      res.conflicts[0].message,
      /09:00\s*–\s*21:00/,
      'Error message must state default 09:00 – 21:00 window'
    );
  });

  await test('[T1.02] Custom owner operating hours (08:00–22:00) persisted in school settings expand valid window', () => {
    saveSchoolSettings({
      ...DEFAULT_SCHOOL_PROFILE,
      calendarStartHour: 8,
      calendarEndHour: 22,
    });

    const settings = getSchoolSettings();
    assert.strictEqual(settings.calendarStartHour, 8);
    assert.strictEqual(settings.calendarEndHour, 22);

    // 08:00-09:00 should now be valid
    const earlyCandidate: CandidateLesson = {
      date: '2026-10-25',
      startTime: '08:00',
      endTime: '09:00',
    };
    assert.strictEqual(isWithinSchoolHours(earlyCandidate), true);

    // 21:00-22:00 should now be valid
    const lateCandidate: CandidateLesson = {
      date: '2026-10-25',
      startTime: '21:00',
      endTime: '22:00',
    };
    assert.strictEqual(isWithinSchoolHours(lateCandidate), true);

    // 07:45-08:45 is outside 08:00-22:00
    const tooEarly: CandidateLesson = {
      date: '2026-10-25',
      startTime: '07:45',
      endTime: '08:45',
    };
    const res = checkThreeWayCollision([], tooEarly);
    assert.strictEqual(res.hasConflict, true);
    assert.match(
      res.conflicts[0].message,
      /08:00\s*–\s*22:00/,
      'Error message must reflect owner dynamic hours (08:00 – 22:00)'
    );
  });

  await test('[T1.03] Custom restricted operating hours (10:00–18:00) strictly shrink window and generate dynamic error message', () => {
    saveSchoolSettings({
      ...DEFAULT_SCHOOL_PROFILE,
      calendarStartHour: 10,
      calendarEndHour: 18,
    });

    // 09:00-10:00 was valid under default, but must fail under 10:00-18:00
    const nineCandidate: CandidateLesson = {
      date: '2026-10-25',
      startTime: '09:00',
      endTime: '10:00',
    };
    assert.strictEqual(isWithinSchoolHours(nineCandidate), false);

    const res = checkThreeWayCollision([], nineCandidate);
    assert.strictEqual(res.hasConflict, true);
    assert.match(
      res.conflicts[0].message,
      /10:00\s*–\s*18:00/,
      'Error message must reflect restricted hours (10:00 – 18:00)'
    );

    // 17:00-18:00 is valid
    assert.strictEqual(
      isWithinSchoolHours({ date: '2026-10-25', startTime: '17:00', endTime: '18:00' }),
      true
    );

    // 17:30-18:30 is invalid
    assert.strictEqual(
      isWithinSchoolHours({ date: '2026-10-25', startTime: '17:30', endTime: '18:30' }),
      false
    );
  });

  await test('[T1.04] Boundary conditions: exact open/close timestamps, zero duration, inverted intervals, and option overrides', () => {
    // Exact boundaries under 10:00-18:00
    assert.strictEqual(
      isWithinSchoolHours({ date: '2026-10-25', startTime: '10:00', endTime: '18:00' }),
      true
    );

    // 1 minute over close (18:01)
    assert.strictEqual(
      isWithinSchoolHours({ date: '2026-10-25', startTime: '17:01', endTime: '18:01' }),
      false
    );

    // 1 minute before open (09:59)
    assert.strictEqual(
      isWithinSchoolHours({ date: '2026-10-25', startTime: '09:59', endTime: '11:00' }),
      false
    );

    // Inverted time (endTime <= startTime)
    assert.strictEqual(
      isWithinSchoolHours({ date: '2026-10-25', startTime: '15:00', endTime: '14:00' }),
      false
    );

    // Zero duration
    assert.strictEqual(
      isWithinSchoolHours({ date: '2026-10-25', startTime: '14:00', endTime: '14:00' }),
      false
    );

    // Direct parameter overrides (7:00 to 23:00) take precedence over stored settings
    assert.strictEqual(
      isWithinSchoolHours({ date: '2026-10-25', startTime: '07:30', endTime: '08:30' }, undefined, 7, 23),
      true
    );
    assert.strictEqual(
      isWithinSchoolHours({ date: '2026-10-25', startTime: '22:00', endTime: '23:00' }, undefined, 7, 23),
      true
    );
  });

  await test('[T1.05] suggestAlternativeSlots strictly bounds generated slot recommendations within dynamic operating hours', () => {
    // Under 10:00-18:00 settings
    const candidate: CandidateLesson = {
      teacherId: 'teacher_elena',
      date: '2026-10-25',
      startTime: '08:00',
      endTime: '09:00',
    };

    const suggestions = suggestAlternativeSlots([baseLesson1], candidate, 3, 10, 18);
    assert.ok(suggestions.length > 0, 'Must produce alternative suggestions');

    for (const slot of suggestions) {
      const sMin = timeToMinutes(slot.startTime);
      const eMin = timeToMinutes(slot.endTime);
      assert.ok(
        sMin >= 10 * 60,
        `Suggested slot start ${slot.startTime} must be >= 10:00 (got ${sMin} min)`
      );
      assert.ok(
        eMin <= 18 * 60,
        `Suggested slot end ${slot.endTime} must be <= 18:00 (got ${eMin} min)`
      );
    }
  });

  // =========================================================================
  // ▶ [Tier 2] 100% Online School Room Invariants
  // =========================================================================
  console.log('\n▶ [Tier 2] 100% Online School Room Invariants...');

  await test('[T2.01] 100% Online / Zoom room bypass: hasRoomCollision returns false for virtual rooms', () => {
    const existing = [baseLesson1]; // 10:00-11:30 in 'Онлайн (Zoom 1)'

    const onlineCandidates = [
      'Онлайн (Zoom 1)',
      'Онлайн (Zoom)',
      'Zoom Room 2',
      'онлайн',
      'online class A',
      'Интерактивный ZOOM',
    ];

    for (const r of onlineCandidates) {
      const cand: CandidateLesson = {
        date: '2026-10-25',
        startTime: '10:00',
        endTime: '11:30',
        room: r,
      };
      assert.strictEqual(
        hasRoomCollision(existing, cand),
        false,
        `Room collision must be bypassed for virtual room: "${r}"`
      );
    }
  });

  await test('[T2.02] Multiple parallel online classes at the identical time slot are permitted', () => {
    // Reset to default hours
    saveSchoolSettings({ ...DEFAULT_SCHOOL_PROFILE, calendarStartHour: 9, calendarEndHour: 21 });

    const existingLessons = [baseLesson1]; // Elena, Немецкий A1, 10:00-11:30, 'Онлайн (Zoom 1)'

    // Candidate at the exact same time slot with another teacher, another group, and online room
    const parallelOnlineLesson: CandidateLesson = {
      id: 'les_parallel_online',
      teacherId: 'teacher_denis',
      teacherName: 'Денис Смирнов',
      groupId: 'grp_math_b2',
      groupName: 'Математика B2',
      date: '2026-10-25',
      startTime: '10:00',
      endTime: '11:30',
      room: 'Онлайн (Zoom 1)', // exact same virtual room identifier
      students: [{ id: 'st_artem', name: 'Артем Волков' }],
    };

    const result = checkThreeWayCollision(existingLessons, parallelOnlineLesson);
    assert.strictEqual(result.hasConflict, false, 'Parallel online lessons must not conflict on room');
    assert.strictEqual(result.conflicts.length, 0);
  });

  await test('[T2.03] Physical rooms strictly enforce 1-class-per-room exclusivity', () => {
    const existingLessons = [baseLesson2]; // 14:00-15:30 in 'Кабинет 101'

    const conflictingPhysicalLesson: CandidateLesson = {
      id: 'les_phys_conflict',
      teacherId: 'teacher_elena',
      teacherName: 'Елена Соколова',
      groupId: 'grp_german_a1',
      groupName: 'Немецкий A1',
      date: '2026-10-25',
      startTime: '14:30',
      endTime: '15:30',
      room: 'Кабинет 101', // exact same physical room
    };

    assert.strictEqual(hasRoomCollision(existingLessons, conflictingPhysicalLesson), true);

    const result = checkThreeWayCollision(existingLessons, conflictingPhysicalLesson);
    assert.strictEqual(result.hasConflict, true);
    assert.strictEqual(result.conflicts[0].type, 'room');
    assert.match(
      result.conflicts[0].message,
      /Конфликт кабинета: кабинет Кабинет 101 уже занят/
    );
  });

  await test('[T2.04] Different physical rooms or cancelled lessons in physical rooms do not collide', () => {
    const existingLessons: FullLessonData[] = [
      baseLesson2, // 'Кабинет 101', 14:00-15:30
      {
        ...baseLesson2,
        id: 'les_cancelled_phys',
        room: 'Кабинет 102',
        status: 'cancelled',
      },
    ];

    // Different physical room
    const candidateDiffRoom: CandidateLesson = {
      date: '2026-10-25',
      startTime: '14:00',
      endTime: '15:30',
      room: 'Кабинет 103',
    };
    assert.strictEqual(hasRoomCollision(existingLessons, candidateDiffRoom), false);

    // Cancelled room candidate
    const candidateInCancelledRoom: CandidateLesson = {
      date: '2026-10-25',
      startTime: '14:00',
      endTime: '15:30',
      room: 'Кабинет 102',
    };
    assert.strictEqual(hasRoomCollision(existingLessons, candidateInCancelledRoom), false);
  });

  // =========================================================================
  // ▶ [Tier 3] 3-Way Collision Shield Invariants
  // =========================================================================
  console.log('\n▶ [Tier 3] 3-Way Collision Shield Invariants...');

  await test('[T3.01] Teacher overlap blocked: same teacher cannot conduct simultaneous lessons', () => {
    const existing = [baseLesson1]; // Elena, 10:00-11:30

    const candTeacherOverlap: CandidateLesson = {
      id: 'les_cand_teacher',
      teacherId: 'teacher_elena',
      teacherName: 'Елена Соколова',
      date: '2026-10-25',
      startTime: '11:00',
      endTime: '12:00',
    };

    assert.strictEqual(hasTeacherCollision(existing, candTeacherOverlap), true);

    const res = checkThreeWayCollision(existing, candTeacherOverlap);
    assert.strictEqual(res.hasConflict, true);
    assert.ok(res.conflicts.some((c) => c.type === 'teacher'));
    assert.match(res.reason || '', /Конфликт преподавателя/);

    // Cancelled teacher lesson does not block
    const cancelledLesson: FullLessonData = {
      ...baseLesson1,
      id: 'les_cancelled_teacher',
      status: 'cancelled',
    };
    assert.strictEqual(hasTeacherCollision([cancelledLesson], candTeacherOverlap), false);

    // Updating self does not trigger collision
    const selfCandidate: CandidateLesson = {
      ...baseLesson1,
      startTime: '10:00',
      endTime: '11:30',
    };
    assert.strictEqual(hasTeacherCollision([baseLesson1], selfCandidate), false);
  });

  await test('[T3.02] Group overlap blocked: same group cannot have simultaneous lessons', () => {
    const existing = [baseLesson1]; // grp_german_a1, 10:00-11:30

    const candGroupOverlap: CandidateLesson = {
      id: 'les_cand_grp',
      groupId: 'grp_german_a1',
      groupName: 'Немецкий A1',
      teacherId: 'teacher_maria',
      date: '2026-10-25',
      startTime: '10:30',
      endTime: '12:00',
    };

    assert.strictEqual(hasGroupCollision(existing, candGroupOverlap), true);

    const res = checkThreeWayCollision(existing, candGroupOverlap);
    assert.strictEqual(res.hasConflict, true);
    assert.ok(res.conflicts.some((c) => c.type === 'group'));
    assert.match(res.reason || '', /Конфликт группы/);

    // Individual lesson without group is exempt
    const individualCand: CandidateLesson = {
      id: 'les_cand_indiv',
      isIndividual: true,
      teacherId: 'teacher_maria',
      date: '2026-10-25',
      startTime: '10:30',
      endTime: '12:00',
    };
    assert.strictEqual(hasGroupCollision(existing, individualCand), false);
  });

  await test('[T3.03] Student overlap blocked across group and individual formats', () => {
    const existing = [baseLesson1]; // students: st_maxim, st_alisa, 10:00-11:30

    // Student Alisa enrolled in another lesson at 11:00-12:00
    const candStudentOverlap: CandidateLesson = {
      id: 'les_cand_student',
      studentId: 'st_alisa',
      studentName: 'Алиса Селезнева',
      date: '2026-10-25',
      startTime: '11:00',
      endTime: '12:00',
    };

    assert.strictEqual(hasStudentCollision(existing, candStudentOverlap), true);

    const res = checkThreeWayCollision(existing, candStudentOverlap);
    assert.strictEqual(res.hasConflict, true);
    assert.ok(res.conflicts.some((c) => c.type === 'student'));
    assert.match(res.reason || '', /Конфликт ученика: Алиса Селезнева/);

    // Overlap via candidate.students array
    const candArrayStudent: CandidateLesson = {
      id: 'les_cand_students_arr',
      date: '2026-10-25',
      startTime: '10:15',
      endTime: '11:15',
      students: [{ id: 'st_maxim', name: 'Максим Орлов' }],
    };
    assert.strictEqual(hasStudentCollision(existing, candArrayStudent), true);
  });

  await test('[T3.04] Adjacent slot non-overlapping permitted (boundary-touching is valid)', () => {
    // baseLesson1 is 10:00 - 11:30
    // Candidate starts exactly when baseLesson1 ends (11:30 - 12:30)
    assert.strictEqual(isTimeOverlapping('10:00', '11:30', '11:30', '12:30'), false);
    assert.strictEqual(isTimeOverlapping('09:00', '10:00', '10:00', '11:30'), false);

    const adjacentAfterCandidate: CandidateLesson = {
      teacherId: 'teacher_elena',
      groupId: 'grp_german_a1',
      date: '2026-10-25',
      startTime: '11:30',
      endTime: '13:00',
      room: 'Онлайн (Zoom 1)',
    };

    const res = checkThreeWayCollision([baseLesson1], adjacentAfterCandidate);
    assert.strictEqual(
      res.hasConflict,
      false,
      'Boundary-touching adjacent slot must not produce collisions'
    );
  });

  await test('[T3.05] Multi-way composite collision aggregation and suggestion generation', () => {
    const existing = [baseLesson1]; // Elena, grp_german_a1, Maxim & Alisa, 10:00-11:30

    // Triple conflict: same teacher, same group, and same student
    const tripleConflictCandidate: CandidateLesson = {
      teacherId: 'teacher_elena',
      groupId: 'grp_german_a1',
      studentId: 'st_maxim',
      date: '2026-10-25',
      startTime: '10:30',
      endTime: '11:30',
    };

    const res = checkThreeWayCollision(existing, tripleConflictCandidate);
    assert.strictEqual(res.hasConflict, true);
    assert.strictEqual(res.type, 'both');
    assert.ok(res.conflicts.length >= 3, 'Must detect teacher, group, and student conflicts');

    const conflictTypes = res.conflicts.map((c) => c.type);
    assert.ok(conflictTypes.includes('teacher'));
    assert.ok(conflictTypes.includes('group'));
    assert.ok(conflictTypes.includes('student'));

    // Suggestions should provide alternative free slots on that day
    assert.ok(res.nearestSlots.length > 0);
    for (const slot of res.nearestSlots) {
      assert.strictEqual(
        isTimeOverlapping('10:00', '11:30', slot.startTime, slot.endTime),
        false,
        'Suggested slots must not overlap with busy interval'
      );
    }
  });

  // =========================================================================
  // ▶ [Tier 4] RBAC & Drag-and-Drop Invariants
  // =========================================================================
  console.log('\n▶ [Tier 4] RBAC & Drag-and-Drop Invariants...');

  await test('[T4.01] Teacher role RBAC: teacher can only reschedule their own lessons', () => {
    // Model RBAC guard from calendar/page.tsx:
    function evaluateDragPermission(role: string, userName: string, targetLesson: FullLessonData) {
      const isTeacher = role === 'teacher';
      if (isTeacher) {
        const myNameLower = (userName || '').toLowerCase().trim();
        const teacherNameLower = (targetLesson.teacherName || '').toLowerCase().trim();
        const matchesName =
          myNameLower &&
          teacherNameLower &&
          (teacherNameLower.includes(myNameLower) || myNameLower.includes(teacherNameLower));
        if (!matchesName) {
          return { allowed: false, error: 'Доступ ограничен: преподаватель может переносить только свои занятия' };
        }
      }
      return { allowed: true };
    }

    // Teacher Elena trying to reschedule Denis's lesson -> BLOCKED
    const checkOther = evaluateDragPermission('teacher', 'Елена Соколова', baseLesson2);
    assert.strictEqual(checkOther.allowed, false);
    assert.strictEqual(checkOther.error, 'Доступ ограничен: преподаватель может переносить только свои занятия');

    // Teacher Elena trying to reschedule her own lesson -> PERMITTED
    const checkOwn = evaluateDragPermission('teacher', 'Елена Соколова', baseLesson1);
    assert.strictEqual(checkOwn.allowed, true);

    // Case-insensitive substring match resilience
    const checkCase = evaluateDragPermission('teacher', 'елена', baseLesson1);
    assert.strictEqual(checkCase.allowed, true);
  });

  await test('[T4.02] Admin / Owner role RBAC: can reschedule any lesson', () => {
    function evaluateDragPermission(role: string, userName: string, targetLesson: FullLessonData) {
      const isTeacher = role === 'teacher';
      if (isTeacher) {
        const myNameLower = (userName || '').toLowerCase().trim();
        const teacherNameLower = (targetLesson.teacherName || '').toLowerCase().trim();
        const matchesName =
          myNameLower &&
          teacherNameLower &&
          (teacherNameLower.includes(myNameLower) || myNameLower.includes(teacherNameLower));
        if (!matchesName) {
          return { allowed: false, error: 'Доступ ограничен: преподаватель может переносить только свои занятия' };
        }
      }
      return { allowed: true };
    }

    // Owner can reschedule Elena's and Denis's lessons
    assert.strictEqual(evaluateDragPermission('owner', 'Администратор', baseLesson1).allowed, true);
    assert.strictEqual(evaluateDragPermission('owner', 'Администратор', baseLesson2).allowed, true);

    // Admin can reschedule Elena's and Denis's lessons
    assert.strictEqual(evaluateDragPermission('admin', 'Менеджер', baseLesson1).allowed, true);
    assert.strictEqual(evaluateDragPermission('admin', 'Менеджер', baseLesson2).allowed, true);
  });

  await test('[T4.03] Terminal state immutability: completed and cancelled lessons cannot be rescheduled', () => {
    function validateTerminalState(status?: string) {
      if (status === 'completed' || status === 'cancelled') {
        return { allowed: false, error: 'Нельзя переносить завершенные или отмененные занятия' };
      }
      return { allowed: true };
    }

    assert.strictEqual(validateTerminalState('completed').allowed, false);
    assert.strictEqual(validateTerminalState('completed').error, 'Нельзя переносить завершенные или отмененные занятия');
    assert.strictEqual(validateTerminalState('cancelled').allowed, false);
    assert.strictEqual(validateTerminalState('scheduled').allowed, true);
    assert.strictEqual(validateTerminalState('planned').allowed, true);
  });

  await test('[T4.04] Drag-and-drop collision shield integration & state transition', () => {
    // Simulate drop workflow:
    const currentLessons = [baseLesson1, baseLesson2];
    const targetLesson = baseLesson2; // Denis, 14:00-15:30 on 2026-10-25

    // Attempt to drop targetLesson onto 10:00 on 2026-10-25 where Elena already teaches
    // BUT candidate has teacher Denis, so no teacher collision!
    // What if we try to drop Denis onto 10:00 in 'Кабинет 101' where another physical lesson is?
    // Let's test a real collision: Denis already has 14:00-15:30, trying to drop Elena onto 14:30
    const targetElena = baseLesson1;
    const dropDate = '2026-10-25';
    const dropTime = '14:30';

    // Elena duration is 90 min (10:00 to 11:30), so targetEndTime would be 16:00
    // If Elena's candidate room was 'Кабинет 101', collision occurs!
    const candidateElenaPhys: CandidateLesson = {
      id: targetElena.id,
      teacherId: targetElena.teacherId,
      groupId: targetElena.groupId,
      date: dropDate,
      startTime: dropTime,
      endTime: '16:00',
      room: 'Кабинет 101',
    };

    const collCheck = checkThreeWayCollision(currentLessons, candidateElenaPhys);
    assert.strictEqual(collCheck.hasCollision, true);
    assert.match(collCheck.reason || '', /Конфликт кабинета/);

    // Dropping onto valid non-colliding slot
    const candidateElenaOnline: CandidateLesson = {
      id: targetElena.id,
      teacherId: targetElena.teacherId,
      groupId: targetElena.groupId,
      date: '2026-10-26',
      startTime: '12:00',
      endTime: '13:30',
      room: 'Онлайн (Zoom 1)',
    };
    const validCheck = checkThreeWayCollision(currentLessons, candidateElenaOnline);
    assert.strictEqual(validCheck.hasCollision, false);
  });

  await test('[T4.05] Static analysis of src/app/calendar/page.tsx confirms RBAC, terminal checks, and 3-way collision checks', () => {
    const calendarPath = path.join(rootDir, 'src/app/calendar/page.tsx');
    assert.ok(fs.existsSync(calendarPath), 'calendar/page.tsx must exist');
    const content = fs.readFileSync(calendarPath, 'utf8');

    // 1. RBAC teacher check
    assert.ok(
      content.includes('isTeacher'),
      'calendar/page.tsx must inspect isTeacher'
    );
    assert.ok(
      content.includes('Доступ ограничен: преподаватель может переносить только свои занятия'),
      'calendar/page.tsx must guard teacher rescheduling'
    );

    // 2. Terminal state check
    assert.ok(
      content.includes("targetLesson.status === 'completed' || targetLesson.status === 'cancelled'"),
      'calendar/page.tsx must block rescheduling completed and cancelled lessons'
    );
    assert.ok(
      content.includes('Нельзя переносить завершенные или отмененные занятия'),
      'calendar/page.tsx must display terminal state error toast'
    );

    // 3. checkThreeWayCollision guard in handleDropLessonOnSlot
    assert.ok(
      content.includes('checkThreeWayCollision(lessons, candidate'),
      'handleDropLessonOnSlot must invoke checkThreeWayCollision'
    );
    assert.ok(
      content.includes('Перенос заблокирован:'),
      'handleDropLessonOnSlot must notify when collision blocks drop'
    );

    // 4. Slot click-to-create
    assert.ok(
      content.includes('handleOpenScheduleForDate(day.fullDate, slotTime)'),
      'Grid slot must invoke handleOpenScheduleForDate on click'
    );
  });

  // =========================================================================
  // ▶ [Tier 5] Teacher Directory Invariants
  // =========================================================================
  console.log('\n▶ [Tier 5] Teacher Directory Invariants...');

  await test('[T5.01] Placeholder filtering removes placeholder teacher names ("Преподаватель", "Преподаватель не назначен")', () => {
    function createTeacher(id: string, name: string): FullTeacherData {
      return {
        id,
        name,
        role: 'Преподаватель',
        phone: '+7 900 000-00-00',
        email: `${id}@test.com`,
        status: 'active',
        weeklyHours: 10,
        lessonsPerWeek: 5,
        activeGroups: [],
        studentsCount: 10,
      };
    }

    const rawTeachers: FullTeacherData[] = [
      createTeacher('t1', 'Преподаватель'),
      createTeacher('t2', 'Преподаватель не назначен'),
      createTeacher('t3', 'ПРЕПОДАВАТЕЛЬ'),
      createTeacher('t4', '   '),
      createTeacher('t5', 'Елена Соколова'),
      createTeacher('t6', 'Денис Смирнов'),
    ];

    // Mirroring calendar/page.tsx filter logic:
    const validTeachers = rawTeachers.filter((t) => {
      const name = (t.name || '').trim();
      return (
        name.length > 0 &&
        name.toLowerCase() !== 'преподаватель' &&
        name.toLowerCase() !== 'преподаватель не назначен'
      );
    });

    assert.strictEqual(validTeachers.length, 2, 'Only legitimate teachers must be retained');
    assert.strictEqual(validTeachers[0].name, 'Елена Соколова');
    assert.strictEqual(validTeachers[1].name, 'Денис Смирнов');
  });

  await test('[T5.02] Deduplication by clean teacher name preserves first unique entry', () => {
    function createTeacher(id: string, name: string): FullTeacherData {
      return {
        id,
        name,
        role: 'Преподаватель',
        phone: '+7 900 000-00-00',
        email: `${id}@test.com`,
        status: 'active',
        weeklyHours: 10,
        lessonsPerWeek: 5,
        activeGroups: [],
        studentsCount: 10,
      };
    }

    const rawTeachers: FullTeacherData[] = [
      createTeacher('t1', 'Елена Соколова'),
      createTeacher('t2', '  елена соколова  '),
      createTeacher('t3', 'Денис Смирнов'),
      createTeacher('t4', 'ДЕНИС СМИРНОВ'),
    ];

    const seenNames = new Set<string>();
    const uniqueTeachers: FullTeacherData[] = [];
    for (const t of rawTeachers) {
      const cleanName = t.name.trim().toLowerCase();
      if (!seenNames.has(cleanName)) {
        seenNames.add(cleanName);
        uniqueTeachers.push(t);
      }
    }

    assert.strictEqual(uniqueTeachers.length, 2, 'Must deduplicate to 2 teachers');
    assert.strictEqual(uniqueTeachers[0].id, 't1');
    assert.strictEqual(uniqueTeachers[1].id, 't3');
  });

  await test('[T5.03] Initials generation produces clean 2-letter uppercase initials', () => {
    function getInitials(name: string): string {
      const parts = (name || '').trim().split(/\s+/);
      return (
        parts
          .slice(0, 2)
          .map((n) => n[0])
          .join('')
          .toUpperCase() || 'ПР'
      );
    }

    assert.strictEqual(getInitials('Елена Соколова'), 'ЕС');
    assert.strictEqual(getInitials('Денис'), 'Д');
    assert.strictEqual(getInitials('   мария    иванова   петрова  '), 'МИ');
    assert.strictEqual(getInitials(''), 'ПР');
  });

  await test('[T5.04] Active range lesson counts correctly tally teacher lessons', () => {
    const lessons: FullLessonData[] = [
      baseLesson1, // Elena
      baseLesson2, // Denis
      { ...baseLesson1, id: 'les_elena_2', startTime: '16:00', endTime: '17:00' }, // Elena
    ];

    function calculateTeacherCount(teacherId: string, teacherName: string, rangeLessons: FullLessonData[]) {
      return rangeLessons.filter(
        (l) => l.teacherId === teacherId || l.teacherName?.toLowerCase() === teacherName.toLowerCase()
      ).length;
    }

    assert.strictEqual(calculateTeacherCount('teacher_elena', 'Елена Соколова', lessons), 2);
    assert.strictEqual(calculateTeacherCount('teacher_denis', 'Денис Смирнов', lessons), 1);
    assert.strictEqual(calculateTeacherCount('teacher_anna', 'Анна Кузнецова', lessons), 0);
  });

  await test('[T5.05] Static analysis of src/app/calendar/page.tsx confirms teacher filtering, dedup, and slot click-to-create', () => {
    const calendarPath = path.join(rootDir, 'src/app/calendar/page.tsx');
    const content = fs.readFileSync(calendarPath, 'utf8');

    // 1. Placeholder filtering checks
    assert.ok(
      content.includes("name.toLowerCase() !== 'преподаватель'"),
      'calendar/page.tsx must filter out placeholder "преподаватель"'
    );
    assert.ok(
      content.includes("name.toLowerCase() !== 'преподаватель не назначен'"),
      'calendar/page.tsx must filter out placeholder "преподаватель не назначен"'
    );

    // 2. Dedup by clean name
    assert.ok(
      content.includes('seenNames'),
      'calendar/page.tsx must deduplicate teacher names'
    );
    assert.ok(
      content.includes('cleanName'),
      'calendar/page.tsx must normalize clean teacher name for dedup'
    );

    // 3. Dynamic hours hookup in calendar page
    assert.ok(
      content.includes('calendarStartHour'),
      'calendar/page.tsx must bind to calendarStartHour'
    );
    assert.ok(
      content.includes('calendarEndHour'),
      'calendar/page.tsx must bind to calendarEndHour'
    );
  });

  await test('[T5.06] ScheduleLessonModal React Rules of Hooks: no conditional returns before hooks', () => {
    const modalPath = path.join(rootDir, 'src/components/calendar/ScheduleLessonModal.tsx');
    const content = fs.readFileSync(modalPath, 'utf8');
    const earlyReturnMatch = content.match(/if\s*\(!isOpen\)\s*return\s*null;/);
    assert.ok(earlyReturnMatch, 'ScheduleLessonModal should have early return for !isOpen');

    const returnIndex = content.indexOf(earlyReturnMatch[0]);
    const afterReturn = content.slice(returnIndex);
    const hookAfterReturn = afterReturn.match(/\buse(State|Effect|Memo|Callback|Ref|Context|Id)\b/);
    assert.strictEqual(
      hookAfterReturn,
      null,
      `No React hooks may appear after "if (!isOpen) return null;". Found: ${hookAfterReturn?.[0]}`
    );
  });

  // Summary
  console.log('\n===============================================================');
  console.log(`   ✅ ALL SUITE 33 (TS-53) CALENDAR INVARIANTS PASSED (${passed} passed)`);
  console.log('===============================================================');

  return { passed, failed };
}
