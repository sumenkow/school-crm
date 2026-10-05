/**
 * SMART ACADEMY / YOU EUROPE CRM — REVIEWER 1 (M1, GEN 2) ADVERSARIAL STRESS TEST
 *
 * Empirical verification of:
 * 1. Boundary & Inverted Intervals in `isWithinSchoolHours`
 * 2. Overlap & Touching Intervals in `hasTeacherCollision`, `hasGroupCollision`, `hasStudentCollision`, `hasRoomCollision`
 * 3. Virtual Room Bypass in `hasRoomCollision`
 * 4. Multi-Constraint Aggregation in `checkThreeWayCollision`
 * 5. Dynamic Slot Search & Proximity Ordering in `suggestAlternativeSlots`
 */

import assert from 'node:assert';
import {
  isWithinSchoolHours,
  hasTeacherCollision,
  hasGroupCollision,
  hasStudentCollision,
  hasRoomCollision,
  checkThreeWayCollision,
  suggestAlternativeSlots,
  timeToMinutes,
  minutesToTime,
  CandidateLesson,
} from '@/lib/data/collisionHelper';
import { FullLessonData } from '@/types';

export async function runReviewer1CollisionStressTests() {
  console.log('\n===============================================================');
  console.log('   REVIEWER 1 (M1, GEN 2): COLLISION HELPER STRESS HARNESS    ');
  console.log('   Empirical Verification of Math, Intervals & Invariants     ');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  function recordPass(testName: string) {
    passed++;
    console.log(`  ✓ [REVIEWER-1] ${testName}`);
  }

  function recordFail(testName: string, error: unknown) {
    failed++;
    const msg = error instanceof Error ? error.message : String(error);
    failures.push(`${testName}: ${msg}`);
    console.error(`  ✗ [REVIEWER-1 FAIL] ${testName} — ${msg}`);
  }

  // =========================================================================
  // SUITE 1: OPERATING HOURS & TIME CONVERSIONS
  // =========================================================================
  console.log('\n--- Suite 1: Operating Hours & Time Arithmetic Invariants ---');

  try {
    assert.strictEqual(timeToMinutes('09:00'), 540);
    assert.strictEqual(timeToMinutes('21:00'), 1260);
    assert.strictEqual(timeToMinutes('00:00'), 0);
    assert.strictEqual(timeToMinutes(''), 0);
    assert.strictEqual(minutesToTime(540), '09:00');
    assert.strictEqual(minutesToTime(1260), '21:00');
    assert.strictEqual(minutesToTime(9), '00:09');
    recordPass('1.1: timeToMinutes and minutesToTime maintain bi-directional fidelity');
  } catch (err) {
    recordFail('1.1', err);
  }

  try {
    // Exact boundaries
    assert.strictEqual(isWithinSchoolHours('09:00', '21:00'), true);
    assert.strictEqual(isWithinSchoolHours('09:00', '10:00'), true);
    assert.strictEqual(isWithinSchoolHours('20:00', '21:00'), true);
    // Boundary violations
    assert.strictEqual(isWithinSchoolHours('08:59', '10:00'), false);
    assert.strictEqual(isWithinSchoolHours('20:00', '21:01'), false);
    assert.strictEqual(isWithinSchoolHours('08:59', '21:01'), false);
    // Zero & inverted duration
    assert.strictEqual(isWithinSchoolHours('10:00', '10:00'), false);
    assert.strictEqual(isWithinSchoolHours('11:00', '10:00'), false);
    // Object signature
    assert.strictEqual(isWithinSchoolHours({ startTime: '09:00', endTime: '21:00' } as any), true);
    assert.strictEqual(isWithinSchoolHours({ startTime: '08:59', endTime: '10:00' } as any), false);
    assert.strictEqual(isWithinSchoolHours({ startTime: '10:00', endTime: '21:01' } as any), false);
    assert.strictEqual(isWithinSchoolHours({ startTime: '', endTime: '' } as any), false);
    // Number duration signature
    assert.strictEqual(isWithinSchoolHours('09:00', 60), true);
    assert.strictEqual(isWithinSchoolHours('08:59', 60), false);
    assert.strictEqual(isWithinSchoolHours('20:01', 60), false);
    assert.strictEqual(isWithinSchoolHours('10:00', 0), false);
    assert.strictEqual(isWithinSchoolHours('10:00', -30), false);
    recordPass('1.2: isWithinSchoolHours strictly enforces 09:00–21:00 across all polymorphic signatures');
  } catch (err) {
    recordFail('1.2', err);
  }

  // =========================================================================
  // SUITE 2: TEACHER & GROUP COLLISION BOUNDARIES
  // =========================================================================
  console.log('\n--- Suite 2: Teacher & Group Interval Collision Invariants ---');

  const baseLesson: FullLessonData = {
    id: 'l_base_1',
    groupId: 'grp_m1_1',
    groupName: 'Math Teens',
    courseName: 'Математика',
    teacherId: 't_m1_1',
    teacherName: 'Наталья Ковалева',
    date: '2026-10-15',
    dateFormatted: '15 окт 2026',
    dayOfWeek: 3,
    startTime: '10:00',
    endTime: '11:15',
    room: 'Кабинет 204',
    topic: 'Algebra Basics',
    status: 'planned',
    students: [{ id: 'stu_m1_1', name: 'Иван Кузнецов', attendanceStatus: 'not_marked' }],
  };

  try {
    // Touching intervals: zero collision
    assert.strictEqual(
      hasTeacherCollision([baseLesson], {
        date: '2026-10-15',
        teacherId: 't_m1_1',
        startTime: '11:15',
        endTime: '12:30',
      }),
      false
    );
    assert.strictEqual(
      hasTeacherCollision([baseLesson], {
        date: '2026-10-15',
        teacherId: 't_m1_1',
        startTime: '08:45',
        endTime: '10:00',
      }),
      false
    );
    // 1-minute overlap: collision detected
    assert.strictEqual(
      hasTeacherCollision([baseLesson], {
        date: '2026-10-15',
        teacherId: 't_m1_1',
        startTime: '11:14',
        endTime: '12:30',
      }),
      true
    );
    // Different date: no collision
    assert.strictEqual(
      hasTeacherCollision([baseLesson], {
        date: '2026-10-16',
        teacherId: 't_m1_1',
        startTime: '10:00',
        endTime: '11:15',
      }),
      false
    );
    // Self-edit bypass
    assert.strictEqual(
      hasTeacherCollision([baseLesson], {
        id: 'l_base_1',
        date: '2026-10-15',
        teacherId: 't_m1_1',
        startTime: '10:00',
        endTime: '11:15',
      }),
      false
    );
    // Cancelled / rejected lessons ignored
    assert.strictEqual(
      hasTeacherCollision([{ ...baseLesson, status: 'cancelled' }], {
        date: '2026-10-15',
        teacherId: 't_m1_1',
        startTime: '10:00',
        endTime: '11:15',
      }),
      false
    );
    assert.strictEqual(
      hasTeacherCollision([{ ...baseLesson, status: 'rejected' }], {
        date: '2026-10-15',
        teacherId: 't_m1_1',
        startTime: '10:00',
        endTime: '11:15',
      }),
      false
    );
    // Pending lesson actively blocks
    assert.strictEqual(
      hasTeacherCollision([{ ...baseLesson, status: 'pending' }], {
        date: '2026-10-15',
        teacherId: 't_m1_1',
        startTime: '10:00',
        endTime: '11:15',
      }),
      true
    );
    recordPass('2.1: hasTeacherCollision adheres to interval boundary, status, and self-bypass invariants');
  } catch (err) {
    recordFail('2.1', err);
  }

  try {
    // Group collision on same group and date
    assert.strictEqual(
      hasGroupCollision([baseLesson], {
        date: '2026-10-15',
        groupId: 'grp_m1_1',
        startTime: '10:30',
        endTime: '11:45',
      }),
      true
    );
    // Different group: no collision
    assert.strictEqual(
      hasGroupCollision([baseLesson], {
        date: '2026-10-15',
        groupId: 'grp_m1_other',
        startTime: '10:30',
        endTime: '11:45',
      }),
      false
    );
    // Individual lesson with no groupId ignores group collision
    assert.strictEqual(
      hasGroupCollision([baseLesson], {
        date: '2026-10-15',
        isIndividual: true,
        startTime: '10:30',
        endTime: '11:45',
      }),
      false
    );
    recordPass('2.2: hasGroupCollision correctly isolates group schedules');
  } catch (err) {
    recordFail('2.2', err);
  }

  // =========================================================================
  // SUITE 3: STUDENT & PHYSICAL ROOM COLLISION
  // =========================================================================
  console.log('\n--- Suite 3: Student & Room Collision Invariants ---');

  try {
    // Cross-check: individual studentId collides with group student
    assert.strictEqual(
      hasStudentCollision([baseLesson], {
        date: '2026-10-15',
        studentId: 'stu_m1_1',
        startTime: '10:30',
        endTime: '11:45',
      }),
      true
    );
    // Cross-check: candidate group students array collides with group student
    assert.strictEqual(
      hasStudentCollision([baseLesson], {
        date: '2026-10-15',
        students: [{ id: 'stu_m1_1' }],
        startTime: '10:30',
        endTime: '11:45',
      }),
      true
    );
    // Cross-check: candidate studentId collides with individual lesson studentId
    const indivLesson: FullLessonData = {
      ...baseLesson,
      id: 'l_indiv_1',
      groupId: '',
      isIndividual: true,
      studentId: 'stu_m1_2',
      students: [],
    };
    assert.strictEqual(
      hasStudentCollision([indivLesson], {
        date: '2026-10-15',
        studentId: 'stu_m1_2',
        startTime: '10:30',
        endTime: '11:45',
      }),
      true
    );
    // Different student: no collision
    assert.strictEqual(
      hasStudentCollision([indivLesson], {
        date: '2026-10-15',
        studentId: 'stu_m1_diff',
        startTime: '10:30',
        endTime: '11:45',
      }),
      false
    );
    recordPass('3.1: hasStudentCollision seamlessly resolves individual and group student overlaps');
  } catch (err) {
    recordFail('3.1', err);
  }

  try {
    // Physical room collision (case-insensitive)
    assert.strictEqual(
      hasRoomCollision([baseLesson], {
        date: '2026-10-15',
        room: 'кабинет 204',
        startTime: '10:30',
        endTime: '11:45',
      }),
      true
    );
    // Virtual room bypass (Zoom, Online, Онлайн)
    const zoomLesson = { ...baseLesson, room: 'Онлайн (Zoom 1)' };
    assert.strictEqual(
      hasRoomCollision([zoomLesson], {
        date: '2026-10-15',
        room: 'Онлайн (Zoom 1)',
        startTime: '10:30',
        endTime: '11:45',
      }),
      false
    );
    assert.strictEqual(
      hasRoomCollision([zoomLesson], {
        date: '2026-10-15',
        room: 'Online room',
        startTime: '10:30',
        endTime: '11:45',
      }),
      false
    );
    recordPass('3.2: hasRoomCollision checks physical rooms while strictly bypassing virtual online rooms');
  } catch (err) {
    recordFail('3.2', err);
  }

  // =========================================================================
  // SUITE 4: THREE-WAY AGGREGATION & ALTERNATIVE SLOT SUGGESTIONS
  // =========================================================================
  console.log('\n--- Suite 4: Comprehensive 3-Way Engine & Alternative Slots ---');

  try {
    // Simultaneous 5-way conflict
    const multiCand: CandidateLesson = {
      date: '2026-10-15',
      startTime: '08:30', // Hours conflict
      endTime: '10:30', // Overlaps baseLesson (10:00–11:15)
      teacherId: 't_m1_1', // Teacher conflict
      groupId: 'grp_m1_1', // Group conflict
      studentId: 'stu_m1_1', // Student conflict
      room: 'Кабинет 204', // Room conflict
    };

    const res = checkThreeWayCollision([baseLesson], multiCand);
    assert.strictEqual(res.hasConflict, true);
    assert.strictEqual(res.hasCollision, true);
    assert.strictEqual(res.type, 'both');
    assert.strictEqual(res.conflicts.length, 5);
    const types = res.conflicts.map((c) => c.type);
    assert.ok(types.includes('hours'));
    assert.ok(types.includes('teacher'));
    assert.ok(types.includes('group'));
    assert.ok(types.includes('student'));
    assert.ok(types.includes('room'));
    assert.ok(res.nearestSlots.length > 0);
    recordPass('4.1: checkThreeWayCollision simultaneously captures all 5 conflict dimensions');
  } catch (err) {
    recordFail('4.1', err);
  }

  try {
    // Fully saturated day: 09:00 to 21:00 booked continuously
    const saturatedLessons: FullLessonData[] = [];
    for (let h = 9; h < 21; h++) {
      saturatedLessons.push({
        ...baseLesson,
        id: `sat_l_${h}`,
        startTime: `${String(h).padStart(2, '0')}:00`,
        endTime: `${String(h + 1).padStart(2, '0')}:00`,
      });
    }

    const noSlots = suggestAlternativeSlots(saturatedLessons, {
      date: '2026-10-15',
      teacherId: 't_m1_1',
      startTime: '10:00',
      endTime: '11:00',
    });
    assert.strictEqual(noSlots.length, 0, 'Saturated day must yield 0 slots');

    // Remove 14:00–15:00 hole
    const oneSlotAvailable = saturatedLessons.filter((l) => l.startTime !== '14:00');
    const slots = suggestAlternativeSlots(oneSlotAvailable, {
      date: '2026-10-15',
      teacherId: 't_m1_1',
      startTime: '10:00',
      endTime: '11:00',
    });
    assert.strictEqual(slots.length, 1);
    assert.strictEqual(slots[0].startTime, '14:00');
    assert.strictEqual(slots[0].endTime, '15:00');
    assert.strictEqual(slots[0].label, '14:00 – 15:00');

    recordPass('4.2: suggestAlternativeSlots identifies isolated open slots with zero false suggestions');
  } catch (err) {
    recordFail('4.2', err);
  }

  // =========================================================================
  // SUMMARY METRICS
  // =========================================================================
  console.log('\n===============================================================');
  console.log('   REVIEWER 1 (M1, GEN 2) TEST SUMMARY                        ');
  console.log('===============================================================');
  console.log(`  Passed Checks:   ${passed}`);
  console.log(`  Failed Checks:   ${failed}`);
  console.log(`  Total Checks:    ${passed + failed}`);
  console.log('---------------------------------------------------------------');
  if (failed === 0) {
    console.log(`✅ ALL REVIEWER 1 STRESS TESTS PASSED (${passed}/${passed + failed})`);
  } else {
    console.log(`❌ FAILURES DETECTED: ${failed}`);
    failures.forEach((f) => console.log(`  - ${f}`));
  }
  console.log('===============================================================\n');

  return { passed, failed, failures };
}
