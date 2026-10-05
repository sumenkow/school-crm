/**
 * SMART ACADEMY CRM — EMPIRICAL CHALLENGER 1 (M1, GEN 2)
 * Adversarial Stress & Edge-Case Harness for Collision Detection & Operating Hours
 *
 * Target: src/lib/data/collisionHelper.ts
 * Verifies:
 *   1. Time conversion primitives & bijective 24h fuzzing
 *   2. Operating hours boundaries (09:00 - 21:00, exact touches, out-of-bounds, zero/inverted duration)
 *   3. Teacher collisions (planned, pending reservation, cancelled/rejected bypass, self-bypass)
 *   4. Group collisions (group overlaps, individual bypass, cancelled bypass)
 *   5. Student collisions (individual-to-individual, individual-to-group, group-to-group, multi-student)
 *   6. Room collisions (physical rooms, case-insensitivity, virtual/zoom bypass)
 *   7. Alternative slot suggestions (proximity ordering, saturated day, multi-block gaps, duration matching)
 *   8. 3-Way collision engine integration & multi-conflict aggregation
 *   9. Randomized stress fuzzing (500 candidate intervals against dynamic schedules)
 */

import assert from 'node:assert';
import { setupTestEnv } from './helpers/testEnv';
import {
  timeToMinutes,
  minutesToTime,
  isTimeOverlapping,
  isWithinSchoolHours,
  hasTeacherCollision,
  hasGroupCollision,
  hasStudentCollision,
  hasRoomCollision,
  suggestAlternativeSlots,
  checkThreeWayCollision,
  CandidateLesson,
} from '../src/lib/data/collisionHelper';
import { FullLessonData } from '../src/types';

export async function runM1Challenger1StressTests() {
  setupTestEnv();
  console.log('\n===============================================================');
  console.log('   CHALLENGER 1 (M1 GEN 2) — EMPIRICAL ADVERSARIAL HARNESS    ');
  console.log('   Target: src/lib/data/collisionHelper.ts                    ');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  function test(name: string, fn: () => void) {
    try {
      fn();
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (err: any) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      failures.push(`${name}: ${msg}`);
      console.log(`  ✗ ${name} — ${msg}`);
    }
  }

  // =========================================================================
  // SUITE 1: TIME CONVERSION PRIMITIVES & BIJECTIVE FUZZING
  // =========================================================================
  console.log('\n--- Suite 1: Time Conversion Primitives & Bijective Fuzzing ---');

  test('TC-1: timeToMinutes parses standard times accurately', () => {
    assert.strictEqual(timeToMinutes('00:00'), 0);
    assert.strictEqual(timeToMinutes('09:00'), 540);
    assert.strictEqual(timeToMinutes('09:05'), 545);
    assert.strictEqual(timeToMinutes('14:30'), 870);
    assert.strictEqual(timeToMinutes('21:00'), 1260);
    assert.strictEqual(timeToMinutes('23:59'), 1439);
  });

  test('TC-2: timeToMinutes handles malformed & edge inputs gracefully', () => {
    assert.strictEqual(timeToMinutes(''), 0);
    assert.strictEqual(timeToMinutes('invalid'), 0);
    assert.strictEqual(timeToMinutes('12'), 0);
    assert.strictEqual(timeToMinutes(':30'), 30);
    assert.strictEqual(timeToMinutes('08:xx'), 480);
    assert.strictEqual(timeToMinutes(null as any), 0);
    assert.strictEqual(timeToMinutes(undefined as any), 0);
  });

  test('TC-3: minutesToTime formats minutes to zero-padded HH:mm', () => {
    assert.strictEqual(minutesToTime(0), '00:00');
    assert.strictEqual(minutesToTime(540), '09:00');
    assert.strictEqual(minutesToTime(545), '09:05');
    assert.strictEqual(minutesToTime(870), '14:30');
    assert.strictEqual(minutesToTime(1260), '21:00');
    assert.strictEqual(minutesToTime(1439), '23:59');
  });

  test('TC-4: Bijective 24h round-trip fuzzing for all 1440 minutes in day', () => {
    for (let m = 0; m < 1440; m++) {
      const timeStr = minutesToTime(m);
      const parsed = timeToMinutes(timeStr);
      assert.strictEqual(parsed, m, `Bijective round-trip failed for minute ${m} (${timeStr})`);
    }
  });

  test('TC-5: isTimeOverlapping exhaustive interval topology matrix', () => {
    // Disjoint before
    assert.strictEqual(isTimeOverlapping('10:00', '11:00', '12:00', '13:00'), false);
    // Exact touch before [10:00, 11:00) vs [11:00, 12:00) -> NO overlap
    assert.strictEqual(isTimeOverlapping('10:00', '11:00', '11:00', '12:00'), false);
    // 1-minute overlap left [10:00, 11:01) vs [11:00, 12:00) -> OVERLAP
    assert.strictEqual(isTimeOverlapping('10:00', '11:01', '11:00', '12:00'), true);
    // Identical intervals [10:00, 11:00) vs [10:00, 11:00) -> OVERLAP
    assert.strictEqual(isTimeOverlapping('10:00', '11:00', '10:00', '11:00'), true);
    // 1-minute overlap right [10:00, 11:00) vs [10:59, 12:00) -> OVERLAP
    assert.strictEqual(isTimeOverlapping('10:00', '11:00', '10:59', '12:00'), true);
    // Exact touch after [11:00, 12:00) vs [10:00, 11:00) -> NO overlap
    assert.strictEqual(isTimeOverlapping('11:00', '12:00', '10:00', '11:00'), false);
    // Disjoint after
    assert.strictEqual(isTimeOverlapping('13:00', '14:00', '10:00', '11:00'), false);
    // Enclosed [10:15, 10:45) inside [10:00, 11:00) -> OVERLAP
    assert.strictEqual(isTimeOverlapping('10:15', '10:45', '10:00', '11:00'), true);
    // Encompassing [09:30, 11:30) over [10:00, 11:00) -> OVERLAP
    assert.strictEqual(isTimeOverlapping('09:30', '11:30', '10:00', '11:00'), true);
  });

  // =========================================================================
  // SUITE 2: OPERATING HOURS BOUNDARY GUARD (09:00 - 21:00)
  // =========================================================================
  console.log('\n--- Suite 2: Operating Hours Boundary Guard (09:00 - 21:00) ---');

  test('OH-1: Exact start 09:00 and exact end 21:00 accepted (full day & inner slots)', () => {
    // Full day 12 hours
    assert.strictEqual(isWithinSchoolHours('09:00', '21:00'), true);
    assert.strictEqual(isWithinSchoolHours({ startTime: '09:00', endTime: '21:00' } as any), true);
    // Opening boundary
    assert.strictEqual(isWithinSchoolHours('09:00', '10:00'), true);
    assert.strictEqual(isWithinSchoolHours({ startTime: '09:00', endTime: '10:00' } as any), true);
    // Closing boundary
    assert.strictEqual(isWithinSchoolHours('20:00', '21:00'), true);
    assert.strictEqual(isWithinSchoolHours({ startTime: '20:00', endTime: '21:00' } as any), true);
    // Midday
    assert.strictEqual(isWithinSchoolHours('14:00', '15:15'), true);
    assert.strictEqual(isWithinSchoolHours({ startTime: '14:00', endTime: '15:15' } as any), true);
  });

  test('OH-2: 1-minute violations outside 09:00–21:00 strictly rejected', () => {
    // Starts 1 min early (08:59)
    assert.strictEqual(isWithinSchoolHours('08:59', '10:00'), false);
    assert.strictEqual(isWithinSchoolHours({ startTime: '08:59', endTime: '10:00' } as any), false);
    // Ends 1 min late (21:01)
    assert.strictEqual(isWithinSchoolHours('20:00', '21:01'), false);
    assert.strictEqual(isWithinSchoolHours({ startTime: '20:00', endTime: '21:01' } as any), false);
    // Both sides out of bounds (08:00 - 22:00)
    assert.strictEqual(isWithinSchoolHours('08:00', '22:00'), false);
    assert.strictEqual(isWithinSchoolHours({ startTime: '08:00', endTime: '22:00' } as any), false);
  });

  test('OH-3: Zero duration and inverted time intervals strictly rejected', () => {
    // Zero duration
    assert.strictEqual(isWithinSchoolHours('10:00', '10:00'), false);
    assert.strictEqual(isWithinSchoolHours({ startTime: '10:00', endTime: '10:00' } as any), false);
    // Inverted duration
    assert.strictEqual(isWithinSchoolHours('11:00', '10:00'), false);
    assert.strictEqual(isWithinSchoolHours({ startTime: '11:00', endTime: '10:00' } as any), false);
  });

  test('OH-4: DurationMinutes numeric invocations verified', () => {
    assert.strictEqual(isWithinSchoolHours('09:00', 60), true);
    assert.strictEqual(isWithinSchoolHours('20:00', 60), true);
    assert.strictEqual(isWithinSchoolHours('20:01', 60), false); // 21:01
    assert.strictEqual(isWithinSchoolHours('08:59', 60), false);
    assert.strictEqual(isWithinSchoolHours('09:00', 720), true); // 12h
    assert.strictEqual(isWithinSchoolHours('09:00', 721), false); // 12h 1m
    assert.strictEqual(isWithinSchoolHours('09:00', 0), false); // zero duration
    assert.strictEqual(isWithinSchoolHours('09:00', -30), false); // negative
  });

  test('OH-5: Candidate with missing or empty times safely rejected', () => {
    assert.strictEqual(isWithinSchoolHours({ startTime: '', endTime: '10:00' } as any), false);
    assert.strictEqual(isWithinSchoolHours({ startTime: '09:00', endTime: '' } as any), false);
    assert.strictEqual(isWithinSchoolHours({} as any), false);
  });

  // =========================================================================
  // SUITE 3: TEACHER COLLISION GUARD & PENDING RESERVATION
  // =========================================================================
  console.log('\n--- Suite 3: Teacher Collision Guard & Pending Reservation ---');

  const baseTeacherLesson: FullLessonData = {
    id: 'l_tea_1',
    groupId: 'grp_1',
    groupName: 'English B2',
    courseName: 'English',
    teacherId: 't_m1',
    teacherName: 'Анна Смирнова',
    date: '2026-10-25',
    dateFormatted: '25 окт 2026',
    dayOfWeek: 6,
    startTime: '10:00',
    endTime: '11:15',
    room: 'Онлайн (Zoom)',
    topic: 'Conditionals',
    status: 'planned',
    students: [],
  };

  test('TC-1: Overlap on same teacher & same date triggers collision', () => {
    const candidate: CandidateLesson = {
      date: '2026-10-25',
      startTime: '10:30',
      endTime: '11:30',
      teacherId: 't_m1',
    };
    assert.strictEqual(hasTeacherCollision([baseTeacherLesson], candidate), true);
  });

  test('TC-2: Pending lesson reserves teacher slot and blocks candidate', () => {
    const pendingLesson: FullLessonData = {
      ...baseTeacherLesson,
      id: 'l_tea_pending',
      status: 'pending',
    };
    const candidate: CandidateLesson = {
      date: '2026-10-25',
      startTime: '10:00',
      endTime: '11:15',
      teacherId: 't_m1',
    };
    assert.strictEqual(hasTeacherCollision([pendingLesson], candidate), true);
  });

  test('TC-3: Cancelled and rejected lessons are bypassed (zero collision)', () => {
    const cancelledLesson: FullLessonData = {
      ...baseTeacherLesson,
      id: 'l_tea_canc',
      status: 'cancelled',
    };
    const rejectedLesson: FullLessonData = {
      ...baseTeacherLesson,
      id: 'l_tea_rej',
      status: 'rejected' as any,
    };
    const candidate: CandidateLesson = {
      date: '2026-10-25',
      startTime: '10:00',
      endTime: '11:15',
      teacherId: 't_m1',
    };
    assert.strictEqual(hasTeacherCollision([cancelledLesson], candidate), false);
    assert.strictEqual(hasTeacherCollision([rejectedLesson], candidate), false);
  });

  test('TC-4: Back-to-back lessons sharing exact boundary do NOT collide', () => {
    const candidateBefore: CandidateLesson = {
      date: '2026-10-25',
      startTime: '09:00',
      endTime: '10:00', // touches 10:00
      teacherId: 't_m1',
    };
    const candidateAfter: CandidateLesson = {
      date: '2026-10-25',
      startTime: '11:15', // touches 11:15
      endTime: '12:15',
      teacherId: 't_m1',
    };
    assert.strictEqual(hasTeacherCollision([baseTeacherLesson], candidateBefore), false);
    assert.strictEqual(hasTeacherCollision([baseTeacherLesson], candidateAfter), false);
  });

  test('TC-5: Different date or different teacher causes zero collision', () => {
    const diffDate: CandidateLesson = {
      date: '2026-10-26',
      startTime: '10:00',
      endTime: '11:15',
      teacherId: 't_m1',
    };
    const diffTeacher: CandidateLesson = {
      date: '2026-10-25',
      startTime: '10:00',
      endTime: '11:15',
      teacherId: 't_other',
    };
    assert.strictEqual(hasTeacherCollision([baseTeacherLesson], diffDate), false);
    assert.strictEqual(hasTeacherCollision([baseTeacherLesson], diffTeacher), false);
  });

  test('TC-6: Self-collision bypass: updating existing lesson does not collide with self', () => {
    const candidateSelf: CandidateLesson = {
      id: 'l_tea_1',
      date: '2026-10-25',
      startTime: '10:00',
      endTime: '11:15',
      teacherId: 't_m1',
    };
    assert.strictEqual(hasTeacherCollision([baseTeacherLesson], candidateSelf), false);
  });

  // =========================================================================
  // SUITE 4: GROUP COLLISION GUARD
  // =========================================================================
  console.log('\n--- Suite 4: Group Collision Guard ---');

  const baseGroupLesson: FullLessonData = {
    id: 'l_grp_1',
    groupId: 'grp_m1_alpha',
    groupName: 'Math Olympiad',
    courseName: 'Math',
    teacherId: 't_m1',
    teacherName: 'Анна Смирнова',
    date: '2026-10-27',
    dateFormatted: '27 окт 2026',
    dayOfWeek: 1,
    startTime: '15:00',
    endTime: '16:30',
    room: 'Онлайн (Zoom)',
    topic: 'Combinatorics',
    status: 'planned',
    students: [],
  };

  test('GC-1: Same group overlapping lesson triggers collision (even with diff teacher)', () => {
    const candidate: CandidateLesson = {
      groupId: 'grp_m1_alpha',
      teacherId: 't_diff', // Different teacher!
      date: '2026-10-27',
      startTime: '16:00',
      endTime: '17:00',
      isIndividual: false,
    };
    assert.strictEqual(hasGroupCollision([baseGroupLesson], candidate), true);
  });

  test('GC-2: Individual lesson without groupId bypasses group collision', () => {
    const indivCandidate: CandidateLesson = {
      date: '2026-10-27',
      startTime: '15:00',
      endTime: '16:30',
      isIndividual: true,
      teacherId: 't_diff',
      studentId: 'stu_solo',
    };
    assert.strictEqual(hasGroupCollision([baseGroupLesson], indivCandidate), false);
  });

  test('GC-3: Cancelled group lesson does not block group', () => {
    const cancelledGrp: FullLessonData = {
      ...baseGroupLesson,
      status: 'cancelled',
    };
    const candidate: CandidateLesson = {
      groupId: 'grp_m1_alpha',
      date: '2026-10-27',
      startTime: '15:00',
      endTime: '16:30',
    };
    assert.strictEqual(hasGroupCollision([cancelledGrp], candidate), false);
  });

  test('GC-4: Self-collision bypass on group lesson', () => {
    const candidate: CandidateLesson = {
      id: 'l_grp_1',
      groupId: 'grp_m1_alpha',
      date: '2026-10-27',
      startTime: '15:00',
      endTime: '16:30',
    };
    assert.strictEqual(hasGroupCollision([baseGroupLesson], candidate), false);
  });

  // =========================================================================
  // SUITE 5: STUDENT COLLISION GUARD (INDIVIDUAL & GROUP INTERSECTIONS)
  // =========================================================================
  console.log('\n--- Suite 5: Student Collision Guard (Individual & Group) ---');

  const baseIndivLesson: FullLessonData = {
    id: 'l_stu_indiv',
    groupId: '',
    groupName: 'Индивидуальное',
    courseName: 'Physics',
    teacherId: 't_m1',
    teacherName: 'Анна Смирнова',
    date: '2026-10-28',
    dateFormatted: '28 окт 2026',
    dayOfWeek: 2,
    startTime: '12:00',
    endTime: '13:00',
    room: 'Онлайн (Zoom)',
    topic: 'Mechanics',
    status: 'planned',
    isIndividual: true,
    studentId: 'stu_alice',
    students: [{ id: 'stu_alice', name: 'Алиса', attendanceStatus: 'not_marked' }],
  };

  test('SC-1: Individual-to-Individual student collision', () => {
    const candidate: CandidateLesson = {
      date: '2026-10-28',
      startTime: '12:30',
      endTime: '13:30',
      teacherId: 't_m2',
      isIndividual: true,
      studentId: 'stu_alice',
    };
    assert.strictEqual(hasStudentCollision([baseIndivLesson], candidate), true);
  });

  test('SC-2: Individual-to-Group student collision (student in group roster)', () => {
    // Existing is group lesson containing Alice
    const groupLessonWithAlice: FullLessonData = {
      id: 'l_grp_alice',
      groupId: 'grp_beta',
      groupName: 'French A1',
      courseName: 'French',
      teacherId: 't_french',
      teacherName: 'Жан',
      date: '2026-10-28',
      dateFormatted: '28 окт 2026',
      dayOfWeek: 2,
      startTime: '17:00',
      endTime: '18:15',
      room: 'Онлайн (Zoom)',
      topic: 'Pronunciation',
      status: 'planned',
      students: [
        { id: 'stu_bob', name: 'Боб', attendanceStatus: 'not_marked' },
        { id: 'stu_alice', name: 'Алиса', attendanceStatus: 'not_marked' },
      ],
    };

    // Candidate is an individual lesson with Alice at 17:30
    const candidate: CandidateLesson = {
      date: '2026-10-28',
      startTime: '17:30',
      endTime: '18:30',
      teacherId: 't_piano',
      isIndividual: true,
      studentId: 'stu_alice',
    };
    assert.strictEqual(hasStudentCollision([groupLessonWithAlice], candidate), true);
  });

  test('SC-3: Group-to-Group shared student collision', () => {
    const groupLesson1: FullLessonData = {
      id: 'l_grp_g1',
      groupId: 'grp_g1',
      groupName: 'Group 1',
      courseName: 'Math',
      teacherId: 't1',
      teacherName: 'T1',
      date: '2026-10-28',
      dateFormatted: '28 окт 2026',
      dayOfWeek: 2,
      startTime: '10:00',
      endTime: '11:00',
      room: 'Онлайн',
      topic: 'Math',
      status: 'planned',
      students: [
        { id: 'stu_shared', name: 'Shared Student', attendanceStatus: 'not_marked' },
        { id: 'stu_x', name: 'X', attendanceStatus: 'not_marked' },
      ],
    };

    // Candidate group lesson has stu_shared as member
    const candidate: CandidateLesson = {
      groupId: 'grp_g2',
      date: '2026-10-28',
      startTime: '10:30',
      endTime: '11:30',
      teacherId: 't2',
      students: [
        { id: 'stu_shared', name: 'Shared Student' },
        { id: 'stu_y', name: 'Y' },
      ],
    };
    assert.strictEqual(hasStudentCollision([groupLesson1], candidate), true);
  });

  test('SC-4: Disjoint student rosters cause zero collision', () => {
    const candidate: CandidateLesson = {
      date: '2026-10-28',
      startTime: '12:00',
      endTime: '13:00',
      teacherId: 't_m2',
      isIndividual: true,
      studentId: 'stu_charlie',
    };
    assert.strictEqual(hasStudentCollision([baseIndivLesson], candidate), false);
  });

  test('SC-5: Cancelled student lesson does not block student', () => {
    const cancelledIndiv: FullLessonData = {
      ...baseIndivLesson,
      status: 'cancelled',
    };
    const candidate: CandidateLesson = {
      date: '2026-10-28',
      startTime: '12:00',
      endTime: '13:00',
      studentId: 'stu_alice',
    };
    assert.strictEqual(hasStudentCollision([cancelledIndiv], candidate), false);
  });

  // =========================================================================
  // SUITE 6: ROOM COLLISION GUARD (PHYSICAL VS VIRTUAL)
  // =========================================================================
  console.log('\n--- Suite 6: Room Collision Guard (Physical vs Virtual) ---');

  const basePhysicalLesson: FullLessonData = {
    id: 'l_room_1',
    groupId: 'grp_r1',
    groupName: 'Art',
    courseName: 'Art',
    teacherId: 't1',
    teacherName: 'T1',
    date: '2026-10-29',
    dateFormatted: '29 окт 2026',
    dayOfWeek: 3,
    startTime: '11:00',
    endTime: '12:30',
    room: 'Кабинет 204',
    topic: 'Drawing',
    status: 'planned',
    students: [],
  };

  test('RC-1: Physical room collision is detected case-insensitively', () => {
    const candExact: CandidateLesson = {
      date: '2026-10-29',
      startTime: '11:30',
      endTime: '12:45',
      room: 'Кабинет 204',
      teacherId: 't_other',
    };
    const candLower: CandidateLesson = {
      date: '2026-10-29',
      startTime: '11:30',
      endTime: '12:45',
      room: 'кабинет 204',
      teacherId: 't_other',
    };
    assert.strictEqual(hasRoomCollision([basePhysicalLesson], candExact), true);
    assert.strictEqual(hasRoomCollision([basePhysicalLesson], candLower), true);
  });

  test('RC-2: Virtual rooms (Онлайн, Zoom, zoom) NEVER collide', () => {
    const baseZoomLesson: FullLessonData = {
      ...basePhysicalLesson,
      id: 'l_zoom_1',
      room: 'Онлайн (Zoom)',
    };
    const candZoom: CandidateLesson = {
      date: '2026-10-29',
      startTime: '11:00',
      endTime: '12:30',
      room: 'Онлайн (Zoom)',
      teacherId: 't_other',
    };
    const candZoomEng: CandidateLesson = {
      date: '2026-10-29',
      startTime: '11:00',
      endTime: '12:30',
      room: 'Zoom Room 1',
      teacherId: 't_other',
    };
    assert.strictEqual(hasRoomCollision([baseZoomLesson], candZoom), false);
    assert.strictEqual(hasRoomCollision([baseZoomLesson], candZoomEng), false);
  });

  test('RC-3: Candidate without room or with empty room never collides on room', () => {
    const candNoRoom: CandidateLesson = {
      date: '2026-10-29',
      startTime: '11:00',
      endTime: '12:30',
      teacherId: 't_other',
    };
    assert.strictEqual(hasRoomCollision([basePhysicalLesson], candNoRoom), false);
  });

  // =========================================================================
  // SUITE 7: ALTERNATIVE FREE SLOT SUGGESTION ENGINE
  // =========================================================================
  console.log('\n--- Suite 7: Alternative Free Slot Suggestion Engine ---');

  test('AS-1: Suggests up to count alternative slots strictly within 09:00–21:00', () => {
    const existing: FullLessonData[] = [
      {
        ...baseTeacherLesson,
        date: '2026-10-30',
        startTime: '10:00',
        endTime: '11:30',
      },
    ];
    const candidate: CandidateLesson = {
      date: '2026-10-30',
      startTime: '10:30',
      endTime: '11:45', // 75 min
      teacherId: 't_m1',
    };

    const slots = suggestAlternativeSlots(existing, candidate, 3);
    assert.strictEqual(slots.length, 3);
    slots.forEach((s) => {
      assert.strictEqual(s.date, '2026-10-30');
      const sMin = timeToMinutes(s.startTime);
      const eMin = timeToMinutes(s.endTime);
      assert.ok(sMin >= 540, `Slot start ${s.startTime} must be >= 09:00`);
      assert.ok(eMin <= 1260, `Slot end ${s.endTime} must be <= 21:00`);
      assert.strictEqual(eMin - sMin, 75, 'Duration must equal 75 min');
      assert.ok(!isTimeOverlapping(s.startTime, s.endTime, '10:00', '11:30'), 'Must not overlap busy slot');
    });
  });

  test('AS-2: Proximity sorting: slots closest to requested start time are preferred', () => {
    const existing: FullLessonData[] = [
      {
        ...baseTeacherLesson,
        date: '2026-10-30',
        startTime: '14:00',
        endTime: '15:00',
      },
    ];
    // Candidate requested 14:00 - 15:00
    const candidate: CandidateLesson = {
      date: '2026-10-30',
      startTime: '14:00',
      endTime: '15:00',
      teacherId: 't_m1',
    };

    const slots = suggestAlternativeSlots(existing, candidate, 2);
    assert.strictEqual(slots.length, 2);
    // Closest slots to 14:00 are 13:00-14:00 (starts at 13:00, touches 14:00) and 15:00-16:00 (starts right at 15:00)
    const slotTimes = slots.map((s) => `${s.startTime}-${s.endTime}`);
    assert.ok(
      slotTimes.includes('15:00-16:00') || slotTimes.includes('13:00-14:00'),
      `Slots should include nearest touch boundaries: ${JSON.stringify(slotTimes)}`
    );
  });

  test('AS-3: Saturated day (09:00 - 21:00 full) returns empty array gracefully', () => {
    const fullDayLesson: FullLessonData = {
      ...baseTeacherLesson,
      date: '2026-10-30',
      startTime: '09:00',
      endTime: '21:00',
    };
    const candidate: CandidateLesson = {
      date: '2026-10-30',
      startTime: '12:00',
      endTime: '13:00',
      teacherId: 't_m1',
    };
    const slots = suggestAlternativeSlots([fullDayLesson], candidate, 3);
    assert.strictEqual(slots.length, 0, 'No slots available in completely saturated day');
  });

  test('AS-4: Multi-block schedule gaps correctly identified', () => {
    // Schedule with two busy blocks: 09:00-12:00 and 13:00-21:00 -> Only 1-hour window 12:00-13:00 is free!
    const block1: FullLessonData = {
      ...baseTeacherLesson,
      id: 'b1',
      date: '2026-10-30',
      startTime: '09:00',
      endTime: '12:00',
    };
    const block2: FullLessonData = {
      ...baseTeacherLesson,
      id: 'b2',
      date: '2026-10-30',
      startTime: '13:00',
      endTime: '21:00',
    };

    // Candidate wants 60 min lesson
    const cand60: CandidateLesson = {
      date: '2026-10-30',
      startTime: '10:00',
      endTime: '11:00',
      teacherId: 't_m1',
    };
    const slots60 = suggestAlternativeSlots([block1, block2], cand60, 3);
    assert.strictEqual(slots60.length, 1, 'Only exact 12:00–13:00 slot can fit 60 min lesson');
    assert.strictEqual(slots60[0].startTime, '12:00');
    assert.strictEqual(slots60[0].endTime, '13:00');

    // Candidate wants 90 min lesson -> Cannot fit into 60 min gap!
    const cand90: CandidateLesson = {
      date: '2026-10-30',
      startTime: '10:00',
      endTime: '11:30',
      teacherId: 't_m1',
    };
    const slots90 = suggestAlternativeSlots([block1, block2], cand90, 3);
    assert.strictEqual(slots90.length, 0, '90-min lesson cannot fit into 60-min window');
  });

  test('AS-5: Negative or zero candidate duration safely defaults to 60 minutes', () => {
    const candidate: CandidateLesson = {
      date: '2026-10-30',
      startTime: '10:00',
      endTime: '09:00', // inverted!
      teacherId: 't_m1',
    };
    const slots = suggestAlternativeSlots([], candidate, 2);
    assert.strictEqual(slots.length, 2);
    slots.forEach((s) => {
      const dur = timeToMinutes(s.endTime) - timeToMinutes(s.startTime);
      assert.strictEqual(dur, 60, 'Should safely default to 60 minutes');
    });
  });

  // =========================================================================
  // SUITE 8: 3-WAY COLLISION ENGINE INTEGRATION & AGGREGATION
  // =========================================================================
  console.log('\n--- Suite 8: 3-Way Collision Engine Integration & Aggregation ---');

  test('CE-1: Clean candidate produces hasConflict: false and empty slots', () => {
    const candidate: CandidateLesson = {
      date: '2026-11-01',
      startTime: '10:00',
      endTime: '11:00',
      teacherId: 't_clean',
      groupId: 'grp_clean',
      studentId: 'stu_clean',
    };
    const res = checkThreeWayCollision([], candidate);
    assert.strictEqual(res.hasConflict, false);
    assert.strictEqual(res.hasCollision, false);
    assert.strictEqual(res.conflicts.length, 0);
    assert.strictEqual(res.nearestSlots.length, 0);
    assert.strictEqual(res.type, undefined);
  });

  test('CE-2: Operating hours conflict only', () => {
    const candidate: CandidateLesson = {
      date: '2026-11-01',
      startTime: '08:00',
      endTime: '09:00', // ends at 09:00 but started at 08:00
      teacherId: 't1',
    };
    const res = checkThreeWayCollision([], candidate);
    assert.strictEqual(res.hasConflict, true);
    assert.strictEqual(res.type, 'hours');
    assert.strictEqual(res.conflicts.length, 1);
    assert.strictEqual(res.conflicts[0].type, 'hours');
    assert.ok(res.nearestSlots.length > 0);
    assert.ok(res.nearestSlots[0].startTime >= '09:00');
  });

  test('CE-3: Teacher conflict only', () => {
    const existing: FullLessonData[] = [
      {
        ...baseTeacherLesson,
        date: '2026-11-01',
        startTime: '10:00',
        endTime: '11:00',
      },
    ];
    const candidate: CandidateLesson = {
      date: '2026-11-01',
      startTime: '10:30',
      endTime: '11:30',
      teacherId: 't_m1',
    };
    const res = checkThreeWayCollision(existing, candidate);
    assert.strictEqual(res.hasConflict, true);
    assert.strictEqual(res.type, 'teacher');
    assert.strictEqual(res.conflicts.length, 1);
    assert.strictEqual(res.conflicts[0].type, 'teacher');
    assert.ok(res.conflictingLesson);
  });

  test('CE-4: Group conflict only', () => {
    const existing: FullLessonData[] = [
      {
        ...baseGroupLesson,
        date: '2026-11-01',
        startTime: '14:00',
        endTime: '15:00',
      },
    ];
    const candidate: CandidateLesson = {
      date: '2026-11-01',
      startTime: '14:30',
      endTime: '15:30',
      groupId: 'grp_m1_alpha',
      teacherId: 't_other',
    };
    const res = checkThreeWayCollision(existing, candidate);
    assert.strictEqual(res.hasConflict, true);
    assert.strictEqual(res.type, 'group');
    assert.strictEqual(res.conflicts.length, 1);
    assert.strictEqual(res.conflicts[0].type, 'group');
  });

  test('CE-5: Student conflict only', () => {
    const existing: FullLessonData[] = [
      {
        ...baseIndivLesson,
        date: '2026-11-01',
        startTime: '16:00',
        endTime: '17:00',
      },
    ];
    const candidate: CandidateLesson = {
      date: '2026-11-01',
      startTime: '16:15',
      endTime: '17:15',
      teacherId: 't_diff',
      studentId: 'stu_alice',
      isIndividual: true,
    };
    const res = checkThreeWayCollision(existing, candidate);
    assert.strictEqual(res.hasConflict, true);
    assert.strictEqual(res.type, 'student');
    assert.strictEqual(res.conflicts.length, 1);
    assert.strictEqual(res.conflicts[0].type, 'student');
  });

  test('CE-6: Physical room conflict only', () => {
    const existing: FullLessonData[] = [
      {
        ...basePhysicalLesson,
        date: '2026-11-01',
        startTime: '11:00',
        endTime: '12:00',
      },
    ];
    const candidate: CandidateLesson = {
      date: '2026-11-01',
      startTime: '11:15',
      endTime: '12:15',
      room: 'Кабинет 204',
      teacherId: 't_diff',
    };
    const res = checkThreeWayCollision(existing, candidate);
    assert.strictEqual(res.hasConflict, true);
    assert.strictEqual(res.type, 'room');
    assert.strictEqual(res.conflicts.length, 1);
    assert.strictEqual(res.conflicts[0].type, 'room');
  });

  test('CE-7: Quadruple simultaneous conflict (hours + teacher + group + student)', () => {
    const existingTeacher: FullLessonData = {
      ...baseTeacherLesson,
      id: 'l_exist_1',
      date: '2026-11-01',
      startTime: '08:00',
      endTime: '09:30',
      teacherId: 't_m1',
      groupId: 'grp_alpha',
      students: [{ id: 'stu_multi', name: 'Multi', attendanceStatus: 'not_marked' }],
    };

    // Candidate starts at 08:30 (hours conflict), same teacher (teacher conflict),
    // same group (group conflict), same student (student conflict)
    const candidate: CandidateLesson = {
      date: '2026-11-01',
      startTime: '08:30',
      endTime: '09:15',
      teacherId: 't_m1',
      groupId: 'grp_alpha',
      studentId: 'stu_multi',
    };

    const res = checkThreeWayCollision([existingTeacher], candidate);
    assert.strictEqual(res.hasConflict, true);
    assert.strictEqual(res.type, 'both');
    assert.strictEqual(res.conflicts.length, 4);
    const types = res.conflicts.map((c) => c.type);
    assert.ok(types.includes('hours'));
    assert.ok(types.includes('teacher'));
    assert.ok(types.includes('group'));
    assert.ok(types.includes('student'));
  });

  // =========================================================================
  // SUITE 9: RANDOMIZED EMPIRICAL STRESS FUZZING
  // =========================================================================
  console.log('\n--- Suite 9: Randomized Empirical Stress Fuzzing (500 runs) ---');

  test('FUZZ-1: 500 randomized candidate intervals validated against dynamic schedule', () => {
    // Generate 10 existing lessons across the day
    const existingLessons: FullLessonData[] = [];
    const seedTimes = ['09:15', '11:00', '13:00', '15:30', '18:00', '19:45'];
    seedTimes.forEach((st, idx) => {
      const sMin = timeToMinutes(st);
      const eMin = sMin + 60;
      existingLessons.push({
        id: `fuzz_seed_${idx}`,
        groupId: `grp_${idx % 3}`,
        groupName: `Group ${idx % 3}`,
        courseName: 'Test',
        teacherId: `t_${idx % 2}`,
        teacherName: `Teacher ${idx % 2}`,
        date: '2026-11-05',
        dateFormatted: '05 ноя 2026',
        dayOfWeek: 4,
        startTime: st,
        endTime: minutesToTime(eMin),
        room: idx % 2 === 0 ? 'Кабинет 101' : 'Онлайн (Zoom)',
        topic: 'Fuzz',
        status: idx === 1 ? 'pending' : 'planned',
        students: [{ id: `stu_${idx % 4}`, name: `Student ${idx % 4}`, attendanceStatus: 'not_marked' }],
      });
    });

    let conflictCount = 0;
    let cleanCount = 0;

    for (let i = 0; i < 500; i++) {
      // Pick random start time between 07:00 (420) and 22:00 (1320)
      const startMin = 420 + Math.floor(Math.random() * 900);
      const duration = 15 + Math.floor(Math.random() * 8) * 15; // 15 to 120 min
      const endMin = startMin + duration;

      const cand: CandidateLesson = {
        date: '2026-11-05',
        startTime: minutesToTime(startMin),
        endTime: minutesToTime(endMin),
        teacherId: `t_${i % 3}`,
        groupId: `grp_${i % 4}`,
        studentId: `stu_${i % 5}`,
        room: i % 2 === 0 ? 'Кабинет 101' : 'Zoom',
      };

      const res = checkThreeWayCollision(existingLessons, cand);

      // Verify invariants on res
      if (startMin < 540 || endMin > 1260) {
        assert.ok(res.hasConflict, `Out-of-bounds start ${cand.startTime} - end ${cand.endTime} MUST have conflict`);
        assert.ok(res.conflicts.some((c) => c.type === 'hours'), 'Must flag hours conflict');
      }

      if (res.hasConflict) {
        conflictCount++;
        // If nearest slots were suggested, verify every suggested slot is valid
        res.nearestSlots.forEach((slot) => {
          const sM = timeToMinutes(slot.startTime);
          const eM = timeToMinutes(slot.endTime);
          assert.ok(sM >= 540 && eM <= 1260, `Suggested slot ${slot.startTime}-${slot.endTime} must be in 09:00-21:00`);
          assert.strictEqual(eM - sM, duration, 'Suggested slot must preserve duration');
          // Must not collide with existing lessons
          const recheck = checkThreeWayCollision(existingLessons, {
            ...cand,
            startTime: slot.startTime,
            endTime: slot.endTime,
          });
          assert.strictEqual(recheck.hasConflict, false, `Suggested slot ${slot.startTime}-${slot.endTime} had false suggestion!`);
        });
      } else {
        cleanCount++;
      }
    }

    console.log(`     -> Fuzzing complete: 500 candidate intervals evaluated (${conflictCount} conflicts, ${cleanCount} clean). All invariants held.`);
    assert.ok(conflictCount > 0 && cleanCount > 0, 'Fuzzing must explore both conflicting and non-conflicting paths');
  });

  console.log('\n===============================================================');
  console.log(`   CHALLENGER 1 STRESS SUMMARY: ${passed} passed, ${failed} failed.`);
  console.log('===============================================================');

  return { passed, failed, failures };
}
