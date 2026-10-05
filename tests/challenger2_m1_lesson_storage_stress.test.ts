/**
 * SMART ACADEMY / YOU EUROPE CRM — CHALLENGER 2 (M1, GEN 2) ADVERSARIAL STRESS TEST
 *
 * Empirical verification of:
 * 1. Financial Safety Invariant (Zero premature billing on creation, approval, and non-present attendance)
 * 2. Strict Attendance Billing (Billing strictly occurs ONLY on attendance 'present')
 * 3. State Machine Transitions (pending -> planned with rejectionReason cleared; pending -> cancelled with rejectionReason)
 * 4. Mutation-Level Collision & Storage Integrity (saveLessonToStorage guards, collision bypasses)
 * 5. Billing Rollback & Idempotency (restoreLessonBilling, duplicate prevention)
 */

import assert from 'node:assert';
import { setupTestEnv } from './helpers/testEnv';
import {
  saveLessonToStorage,
  getStoredLessons,
  getStoredLessonById,
  approveLessonInStorage,
  rejectLessonInStorage,
  recordLessonAttendanceBatch,
  processAutomaticLessonBilling,
  restoreLessonBilling,
} from '@/lib/data/lessonStorage';
import { getStoredStudents, saveStudentToStorage } from '@/lib/data/studentStorage';
import { checkThreeWayCollision } from '@/lib/data/collisionHelper';
import { FullLessonData, FullStudentData } from '@/lib/data/mockData';

function createMockStudent(id: string, name: string, options?: {
  remainingLessons?: number;
  depositBalance?: number;
  pricePerLesson?: number;
}): FullStudentData {
  const remaining = options?.remainingLessons ?? 8;
  const deposit = options?.depositBalance ?? 100;
  const price = options?.pricePerLesson ?? 20;

  return {
    id,
    firstName: name,
    lastName: 'Тестов',
    status: 'active',
    phone: `+7 999 000 ${id.slice(-4)}`,
    email: `${id}@test.smartacademy.eu`,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    groups: [
      {
        id: 'grp_adv_1',
        name: 'German B1 Intensive',
        courseName: 'Немецкий язык',
        teacherName: 'Мария Иванова',
        schedule: 'Пн, Чт • 10:00–11:15',
        status: 'active',
        joinedAt: '01.09.2026',
      },
    ],
    parents: [],
    attendanceStats: {
      totalLessons: 10,
      presentCount: 10,
      absentCount: 0,
      rescheduledCount: 0,
      attendanceRate: '100%',
      history: [],
    },
    finance: {
      activeSubscription: {
        id: `sub_${id}`,
        name: 'Абонемент 8 занятий',
        lessonsRemaining: remaining,
        lessonsTotal: 8,
        lessonsAttended: `${8 - remaining} из 8`,
        status: remaining > 0 ? 'active' : 'completed',
        renewalDate: '2026-12-01',
      },
      deposit: {
        balance: deposit,
        balanceFormatted: `€${deposit}`,
        currency: 'EUR',
        pricePerLesson: price,
      },
      payments: [],
    },
    interactions: [],
    tasks: [],
  };
}

export async function runChallenger2M1LessonStorageTests() {
  const env = setupTestEnv();

  console.log('\n===============================================================');
  console.log('   CHALLENGER 2 (M1, GEN 2): LESSON STORAGE & BILLING HARNESS ');
  console.log('   Empirical Verification of Invariants & State Transitions   ');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  function recordPass(testName: string) {
    passed++;
    console.log(`  ✓ [CHALLENGER-2] ${testName}`);
  }

  function recordFail(testName: string, error: unknown) {
    failed++;
    const msg = error instanceof Error ? error.message : String(error);
    failures.push(`${testName}: ${msg}`);
    console.error(`  ✗ [CHALLENGER-2 FAIL] ${testName} — ${msg}`);
  }

  // =========================================================================
  // SUITE 1: ZERO PREMATURE BILLING INVARIANT
  // =========================================================================
  console.log('\n--- Suite 1: Financial Safety Invariant (Zero Premature Billing) ---');

  // Test 1.1: Pending group lesson creation strictly does NOT debit student balances
  try {
    const s1 = createMockStudent('stu_adv_1_1', 'Анна', { remainingLessons: 8, depositBalance: 120 });
    saveStudentToStorage(s1);

    const pendingLesson: FullLessonData = {
      id: 'l_adv_1_1_pending',
      groupId: 'grp_adv_1',
      groupName: 'German B1 Intensive',
      courseName: 'Немецкий язык',
      teacherId: 't1',
      teacherName: 'Мария Иванова',
      date: '2026-11-10',
      dateFormatted: '10 ноя 2026',
      dayOfWeek: 1,
      startTime: '10:00',
      endTime: '11:15',
      room: 'Онлайн (Zoom)',
      topic: 'Modal Verbs Deep Dive',
      status: 'pending',
      students: [{ id: 'stu_adv_1_1', name: 'Анна Тестов', attendanceStatus: 'not_marked' }],
    };

    const saveRes = saveLessonToStorage(pendingLesson);
    assert.strictEqual(saveRes.success, true, 'Pending lesson must save successfully');

    const studentAfterSave = getStoredStudents().find((s) => s.id === 'stu_adv_1_1');
    assert.strictEqual(
      studentAfterSave?.finance?.activeSubscription?.lessonsRemaining,
      8,
      'Subscription lessonsRemaining must remain 8 after pending lesson creation'
    );
    assert.strictEqual(
      studentAfterSave?.finance?.deposit?.balance,
      120,
      'Deposit balance must remain 120 after pending lesson creation'
    );
    recordPass('1.1: Pending group lesson creation incurs ZERO debit to subscription or deposit');
  } catch (err) {
    recordFail('1.1', err);
  }

  // Test 1.2: Pending individual lesson creation does NOT debit balance
  try {
    const s2 = createMockStudent('stu_adv_1_2', 'Борис', { remainingLessons: 5, depositBalance: 80 });
    saveStudentToStorage(s2);

    const pendingIndiv: FullLessonData = {
      id: 'l_adv_1_2_indiv',
      groupId: '',
      groupName: 'Индивидуальное занятие',
      courseName: 'Немецкий язык',
      teacherId: 't1',
      teacherName: 'Мария Иванова',
      date: '2026-11-10',
      dateFormatted: '10 ноя 2026',
      dayOfWeek: 1,
      startTime: '12:00',
      endTime: '13:00',
      room: 'Онлайн (Zoom)',
      topic: 'Individual Goethe Prep',
      status: 'pending',
      isIndividual: true,
      studentId: 'stu_adv_1_2',
      students: [{ id: 'stu_adv_1_2', name: 'Борис Тестов', attendanceStatus: 'not_marked' }],
    };

    saveLessonToStorage(pendingIndiv);

    const studentAfterIndiv = getStoredStudents().find((s) => s.id === 'stu_adv_1_2');
    assert.strictEqual(
      studentAfterIndiv?.finance?.activeSubscription?.lessonsRemaining,
      5,
      'Subscription lessonsRemaining must stay 5 on individual pending creation'
    );
    assert.strictEqual(
      studentAfterIndiv?.finance?.deposit?.balance,
      80,
      'Deposit balance must stay 80 on individual pending creation'
    );
    recordPass('1.2: Pending individual lesson creation incurs ZERO debit');
  } catch (err) {
    recordFail('1.2', err);
  }

  // Test 1.3: Administrative approval (approveLessonInStorage) strictly incurs ZERO debit
  try {
    const approved = await approveLessonInStorage('l_adv_1_1_pending');
    assert.ok(approved, 'Lesson must be returned on approval');
    assert.strictEqual(approved?.status, 'planned', 'Approved lesson must have status planned');

    const studentAfterApprove = getStoredStudents().find((s) => s.id === 'stu_adv_1_1');
    assert.strictEqual(
      studentAfterApprove?.finance?.activeSubscription?.lessonsRemaining,
      8,
      'Subscription lessonsRemaining must remain 8 after admin approval'
    );
    assert.strictEqual(
      studentAfterApprove?.finance?.deposit?.balance,
      120,
      'Deposit balance must remain 120 after admin approval'
    );
    recordPass('1.3: Administrative approval (pending -> planned) incurs ZERO debit');
  } catch (err) {
    recordFail('1.3', err);
  }

  // Test 1.4: Administrative rejection (rejectLessonInStorage) strictly incurs ZERO debit
  try {
    const sReject = createMockStudent('stu_adv_1_4', 'Виктор', { remainingLessons: 6, depositBalance: 100 });
    saveStudentToStorage(sReject);

    const toReject: FullLessonData = {
      id: 'l_adv_1_4_reject',
      groupId: 'grp_adv_1',
      groupName: 'German B1 Intensive',
      courseName: 'Немецкий язык',
      teacherId: 't1',
      teacherName: 'Мария Иванова',
      date: '2026-11-11',
      dateFormatted: '11 ноя 2026',
      dayOfWeek: 2,
      startTime: '10:00',
      endTime: '11:15',
      room: 'Онлайн (Zoom)',
      topic: 'Speaking Club',
      status: 'pending',
      students: [{ id: 'stu_adv_1_4', name: 'Виктор Тестов', attendanceStatus: 'not_marked' }],
    };
    saveLessonToStorage(toReject);

    const rejected = await rejectLessonInStorage('l_adv_1_4_reject', 'Занятость зала');
    assert.ok(rejected, 'Rejected lesson must return');
    assert.strictEqual(rejected?.status, 'cancelled');

    const studentAfterReject = getStoredStudents().find((s) => s.id === 'stu_adv_1_4');
    assert.strictEqual(
      studentAfterReject?.finance?.activeSubscription?.lessonsRemaining,
      6,
      'Subscription lessonsRemaining must remain 6 after admin rejection'
    );
    assert.strictEqual(
      studentAfterReject?.finance?.deposit?.balance,
      100,
      'Deposit balance must remain 100 after admin rejection'
    );
    recordPass('1.4: Administrative rejection (pending -> cancelled) incurs ZERO debit');
  } catch (err) {
    recordFail('1.4', err);
  }

  // Test 1.5: Non-present attendance statuses strictly incur ZERO debit
  try {
    const sNonPresent = createMockStudent('stu_adv_1_5', 'Галина', { remainingLessons: 7 });
    saveStudentToStorage(sNonPresent);

    const plannedLesson: FullLessonData = {
      id: 'l_adv_1_5_absent',
      groupId: 'grp_adv_1',
      groupName: 'German B1 Intensive',
      courseName: 'Немецкий язык',
      teacherId: 't1',
      teacherName: 'Мария Иванова',
      date: '2026-11-12',
      dateFormatted: '12 ноя 2026',
      dayOfWeek: 3,
      startTime: '10:00',
      endTime: '11:15',
      room: 'Онлайн (Zoom)',
      topic: 'Writing Assessment',
      status: 'planned',
      students: [{ id: 'stu_adv_1_5', name: 'Галина Тестов', attendanceStatus: 'not_marked' }],
    };
    saveLessonToStorage(plannedLesson);

    // Test absent
    recordLessonAttendanceBatch({
      lessonId: 'l_adv_1_5_absent',
      status: 'completed',
      studentRecords: [{ studentId: 'stu_adv_1_5', studentName: 'Галина Тестов', status: 'absent' }],
    });

    let stuCheck = getStoredStudents().find((s) => s.id === 'stu_adv_1_5');
    assert.strictEqual(stuCheck?.finance?.activeSubscription?.lessonsRemaining, 7, 'Absent must not debit');

    // Test excused
    recordLessonAttendanceBatch({
      lessonId: 'l_adv_1_5_absent',
      status: 'completed',
      studentRecords: [{ studentId: 'stu_adv_1_5', studentName: 'Галина Тестов', status: 'excused' }],
    });
    stuCheck = getStoredStudents().find((s) => s.id === 'stu_adv_1_5');
    assert.strictEqual(stuCheck?.finance?.activeSubscription?.lessonsRemaining, 7, 'Excused must not debit');

    // Test rescheduled
    recordLessonAttendanceBatch({
      lessonId: 'l_adv_1_5_absent',
      status: 'completed',
      studentRecords: [{ studentId: 'stu_adv_1_5', studentName: 'Галина Тестов', status: 'rescheduled' }],
    });
    stuCheck = getStoredStudents().find((s) => s.id === 'stu_adv_1_5');
    assert.strictEqual(stuCheck?.finance?.activeSubscription?.lessonsRemaining, 7, 'Rescheduled must not debit');

    recordPass('1.5: Non-present attendance (absent, excused, rescheduled) strictly incurs ZERO debit');
  } catch (err) {
    recordFail('1.5', err);
  }

  // =========================================================================
  // SUITE 2: STRICT ATTENDANCE BILLING INVARIANT
  // =========================================================================
  console.log('\n--- Suite 2: Strict Attendance Billing (Billing strictly ONLY on present) ---');

  // Test 2.1: Mixed cohort billing: ONLY present students are billed
  try {
    const stPresent = createMockStudent('stu_mix_present', 'Дмитрий', { remainingLessons: 4 });
    const stAbsent = createMockStudent('stu_mix_absent', 'Елена', { remainingLessons: 4 });
    const stExcused = createMockStudent('stu_mix_excused', 'Жанна', { remainingLessons: 4 });
    const stUnmarked = createMockStudent('stu_mix_unmarked', 'Игорь', { remainingLessons: 4 });

    saveStudentToStorage(stPresent);
    saveStudentToStorage(stAbsent);
    saveStudentToStorage(stExcused);
    saveStudentToStorage(stUnmarked);

    const mixedLesson: FullLessonData = {
      id: 'l_mixed_attendance',
      groupId: 'grp_adv_1',
      groupName: 'German B1 Intensive',
      courseName: 'Немецкий язык',
      teacherId: 't1',
      teacherName: 'Мария Иванова',
      date: '2026-11-13',
      dateFormatted: '13 ноя 2026',
      dayOfWeek: 4,
      startTime: '10:00',
      endTime: '11:15',
      room: 'Онлайн (Zoom)',
      topic: 'Mixed Attendance Test',
      status: 'planned',
      students: [
        { id: 'stu_mix_present', name: 'Дмитрий Тестов', attendanceStatus: 'not_marked' },
        { id: 'stu_mix_absent', name: 'Елена Тестов', attendanceStatus: 'not_marked' },
        { id: 'stu_mix_excused', name: 'Жанна Тестов', attendanceStatus: 'not_marked' },
        { id: 'stu_mix_unmarked', name: 'Игорь Тестов', attendanceStatus: 'not_marked' },
      ],
    };
    saveLessonToStorage(mixedLesson);

    recordLessonAttendanceBatch({
      lessonId: 'l_mixed_attendance',
      status: 'completed',
      studentRecords: [
        { studentId: 'stu_mix_present', studentName: 'Дмитрий Тестов', status: 'present' },
        { studentId: 'stu_mix_absent', studentName: 'Елена Тестов', status: 'absent' },
        { studentId: 'stu_mix_excused', studentName: 'Жанна Тестов', status: 'excused' },
        { studentId: 'stu_mix_unmarked', studentName: 'Игорь Тестов', status: 'not_marked' },
      ],
    });

    const studentsAfter = getStoredStudents();
    const chkPresent = studentsAfter.find((s) => s.id === 'stu_mix_present');
    const chkAbsent = studentsAfter.find((s) => s.id === 'stu_mix_absent');
    const chkExcused = studentsAfter.find((s) => s.id === 'stu_mix_excused');
    const chkUnmarked = studentsAfter.find((s) => s.id === 'stu_mix_unmarked');

    assert.strictEqual(chkPresent?.finance?.activeSubscription?.lessonsRemaining, 3, 'Present student debited exactly 1 lesson (4 -> 3)');
    assert.strictEqual(chkAbsent?.finance?.activeSubscription?.lessonsRemaining, 4, 'Absent student NOT debited (remains 4)');
    assert.strictEqual(chkExcused?.finance?.activeSubscription?.lessonsRemaining, 4, 'Excused student NOT debited (remains 4)');
    assert.strictEqual(chkUnmarked?.finance?.activeSubscription?.lessonsRemaining, 4, 'Unmarked student NOT debited (remains 4)');

    recordPass('2.1: Mixed cohort: ONLY student marked present is billed; all others preserved');
  } catch (err) {
    recordFail('2.1', err);
  }

  // Test 2.2: Deposit billing fallback when no subscription
  try {
    const stDepositOnly = createMockStudent('stu_dep_only', 'Константин', {
      remainingLessons: 0,
      depositBalance: 100,
      pricePerLesson: 25,
    });
    // Remove active subscription to force deposit billing
    delete (stDepositOnly.finance as any).activeSubscription;
    saveStudentToStorage(stDepositOnly);

    const depositLesson: FullLessonData = {
      id: 'l_deposit_billing',
      groupId: 'grp_adv_1',
      groupName: 'German B1 Intensive',
      courseName: 'Немецкий язык',
      teacherId: 't1',
      teacherName: 'Мария Иванова',
      date: '2026-11-14',
      dateFormatted: '14 ноя 2026',
      dayOfWeek: 5,
      startTime: '10:00',
      endTime: '11:15',
      room: 'Онлайн (Zoom)',
      topic: 'Deposit Billing Test',
      status: 'planned',
      students: [{ id: 'stu_dep_only', name: 'Константин Тестов', attendanceStatus: 'not_marked' }],
    };
    saveLessonToStorage(depositLesson);

    recordLessonAttendanceBatch({
      lessonId: 'l_deposit_billing',
      status: 'completed',
      studentRecords: [{ studentId: 'stu_dep_only', studentName: 'Константин Тестов', status: 'present' }],
    });

    const chkDeposit = getStoredStudents().find((s) => s.id === 'stu_dep_only');
    assert.strictEqual(chkDeposit?.finance?.deposit?.balance, 75, 'Deposit debited exactly pricePerLesson (€100 - €25 = €75)');

    recordPass('2.2: Deposit billing deducts exact pricePerLesson when student has no active subscription');
  } catch (err) {
    recordFail('2.2', err);
  }

  // Test 2.3: Idempotency: Multiple billing executions for same lesson do NOT duplicate debit
  try {
    const initialStu = getStoredStudents().find((s) => s.id === 'stu_mix_present');
    const remainingBeforeDuplicate = initialStu?.finance?.activeSubscription?.lessonsRemaining ?? 3;

    // Call processAutomaticLessonBilling directly for same lesson and student
    const dupRes = processAutomaticLessonBilling({
      lessonId: 'l_mixed_attendance',
      studentIdsToBill: ['stu_mix_present'],
    });

    assert.strictEqual(dupRes.status, 'already_billed', 'Duplicate billing must return already_billed');
    assert.strictEqual(dupRes.billedCount, 0, 'Duplicate billing billedCount must be 0');

    const stuAfterDuplicate = getStoredStudents().find((s) => s.id === 'stu_mix_present');
    assert.strictEqual(
      stuAfterDuplicate?.finance?.activeSubscription?.lessonsRemaining,
      remainingBeforeDuplicate,
      'Subscription lessonsRemaining must NOT decrement a second time'
    );

    recordPass('2.3: Billing idempotency: repeated billing calls return already_billed with zero duplicate debit');
  } catch (err) {
    recordFail('2.3', err);
  }

  // =========================================================================
  // SUITE 3: STATE MACHINE TRANSITIONS & COLLISION RELEASING
  // =========================================================================
  console.log('\n--- Suite 3: State Machine Transitions (approve/reject/slot release) ---');

  // Test 3.1: approveLessonInStorage clears rejectionReason and sets approvedAt
  try {
    const lessonWithRejection: FullLessonData = {
      id: 'l_reappr_test',
      groupId: 'grp_adv_1',
      groupName: 'German B1 Intensive',
      courseName: 'Немецкий язык',
      teacherId: 't1',
      teacherName: 'Мария Иванова',
      date: '2026-11-15',
      dateFormatted: '15 ноя 2026',
      dayOfWeek: 6,
      startTime: '10:00',
      endTime: '11:15',
      room: 'Онлайн (Zoom)',
      topic: 'Re-approval Test',
      status: 'pending',
      rejectionReason: 'Ранее отклонено',
      timelineEvents: [],
      students: [],
    };
    saveLessonToStorage(lessonWithRejection);

    const approved = await approveLessonInStorage('l_reappr_test');
    assert.ok(approved);
    assert.strictEqual(approved?.status, 'planned');
    assert.strictEqual(approved?.rejectionReason, undefined, 'rejectionReason must be cleared to undefined');
    assert.ok(approved?.approvedAt, 'approvedAt timestamp must be populated');
    assert.ok(Array.isArray(approved?.timelineEvents) && approved.timelineEvents.length > 0, 'Timeline event must be appended');

    const fetched = getStoredLessonById('l_reappr_test');
    assert.strictEqual(fetched?.status, 'planned');
    assert.strictEqual(fetched?.rejectionReason, undefined);

    recordPass('3.1: approveLessonInStorage transitions pending -> planned, clears rejectionReason, records audit trail');
  } catch (err) {
    recordFail('3.1', err);
  }

  // Test 3.2: rejectLessonInStorage sets cancelled, persists reason, records rejectedAt
  try {
    const lessonToReject: FullLessonData = {
      id: 'l_rej_reason_test',
      groupId: 'grp_adv_1',
      groupName: 'German B1 Intensive',
      courseName: 'Немецкий язык',
      teacherId: 't1',
      teacherName: 'Мария Иванова',
      date: '2026-11-16',
      dateFormatted: '16 ноя 2026',
      dayOfWeek: 0,
      startTime: '10:00',
      endTime: '11:15',
      room: 'Онлайн (Zoom)',
      topic: 'Rejection Reason Test',
      status: 'pending',
      timelineEvents: [],
      students: [],
    };
    saveLessonToStorage(lessonToReject);

    const reasonText = 'Учитель заболел, занятие переносится на следующую неделю';
    const rejected = await rejectLessonInStorage('l_rej_reason_test', reasonText);
    assert.ok(rejected);
    assert.strictEqual(rejected?.status, 'cancelled');
    assert.strictEqual(rejected?.rejectionReason, reasonText, 'rejectionReason must match passed reason');
    assert.ok(rejected?.rejectedAt, 'rejectedAt timestamp must be recorded');

    const storedRej = getStoredLessonById('l_rej_reason_test');
    assert.strictEqual(storedRej?.status, 'cancelled');
    assert.strictEqual(storedRej?.rejectionReason, reasonText);

    recordPass('3.2: rejectLessonInStorage transitions pending -> cancelled with exact rejectionReason');
  } catch (err) {
    recordFail('3.2', err);
  }

  // Test 3.3: Empty rejection reason gracefully defaults
  try {
    const lessonEmptyRej: FullLessonData = {
      id: 'l_rej_empty_reason',
      groupId: 'grp_adv_1',
      groupName: 'German B1 Intensive',
      courseName: 'Немецкий язык',
      teacherId: 't1',
      teacherName: 'Мария Иванова',
      date: '2026-11-17',
      dateFormatted: '17 ноя 2026',
      dayOfWeek: 1,
      startTime: '10:00',
      endTime: '11:15',
      room: 'Онлайн (Zoom)',
      topic: 'Empty Reason Test',
      status: 'pending',
      students: [],
    };
    saveLessonToStorage(lessonEmptyRej);

    const rejectedDefault = await rejectLessonInStorage('l_rej_empty_reason', '');
    assert.strictEqual(
      rejectedDefault?.rejectionReason,
      'Отклонено администратором',
      'Empty reason must fallback to "Отклонено администратором"'
    );

    recordPass('3.3: Empty rejection reason safely falls back to default description');
  } catch (err) {
    recordFail('3.3', err);
  }

  // Test 3.4: Rejection releases schedule slot immediately
  try {
    const slotLesson: FullLessonData = {
      id: 'l_slot_blocker',
      groupId: 'grp_adv_1',
      groupName: 'German B1 Intensive',
      courseName: 'Немецкий язык',
      teacherId: 't_unique_slot',
      teacherName: 'Олег Прохоров',
      date: '2026-11-18',
      dateFormatted: '18 ноя 2026',
      dayOfWeek: 2,
      startTime: '15:00',
      endTime: '16:15',
      room: 'Онлайн (Zoom)',
      topic: 'Slot Blocker',
      status: 'pending',
      students: [],
    };
    saveLessonToStorage(slotLesson);

    // Verify slot is blocked while pending
    const candidateSameTime = {
      date: '2026-11-18',
      startTime: '15:00',
      endTime: '16:15',
      teacherId: 't_unique_slot',
    };
    const colBefore = checkThreeWayCollision(getStoredLessons(), candidateSameTime);
    assert.strictEqual(colBefore.hasConflict, true, 'Slot must be blocked by pending lesson');

    // Reject the pending lesson
    await rejectLessonInStorage('l_slot_blocker', 'Отмена урока');

    // Verify slot is now completely free
    const colAfter = checkThreeWayCollision(getStoredLessons(), candidateSameTime);
    assert.strictEqual(colAfter.hasConflict, false, 'Slot must be freed immediately after rejection');

    recordPass('3.4: Rejection immediately unblocks schedule slot for new bookings');
  } catch (err) {
    recordFail('3.4', err);
  }

  // Test 3.5: Non-existent ID handling returns null safely
  try {
    const approveNull = await approveLessonInStorage('non_existent_random_id');
    assert.strictEqual(approveNull, null, 'Approving non-existent lesson must return null');

    const rejectNull = await rejectLessonInStorage('non_existent_random_id', 'Причина');
    assert.strictEqual(rejectNull, null, 'Rejecting non-existent lesson must return null');

    recordPass('3.5: approve/reject operations on non-existent lesson ID safely return null');
  } catch (err) {
    recordFail('3.5', err);
  }

  // =========================================================================
  // SUITE 4: MUTATION-LEVEL COLLISION PROTECTION
  // =========================================================================
  console.log('\n--- Suite 4: Mutation-Level Collision Protection ---');

  // Test 4.1: Direct saveLessonToStorage rejects collision
  try {
    const existingActive: FullLessonData = {
      id: 'l_active_existing',
      groupId: 'grp_adv_1',
      groupName: 'German B1 Intensive',
      courseName: 'Немецкий язык',
      teacherId: 't_mut_guard',
      teacherName: 'Наталья Ковалева',
      date: '2026-11-19',
      dateFormatted: '19 ноя 2026',
      dayOfWeek: 3,
      startTime: '14:00',
      endTime: '15:15',
      room: 'Онлайн (Zoom)',
      topic: 'Active Lesson',
      status: 'planned',
      students: [],
    };
    const res1 = saveLessonToStorage(existingActive);
    assert.strictEqual(res1.success, true);

    const conflictingAttempt: FullLessonData = {
      id: 'l_conflict_attempt',
      groupId: 'grp_adv_other',
      groupName: 'Other Group',
      courseName: 'Немецкий язык',
      teacherId: 't_mut_guard', // Same teacher!
      teacherName: 'Наталья Ковалева',
      date: '2026-11-19',
      dateFormatted: '19 ноя 2026',
      dayOfWeek: 3,
      startTime: '14:30',
      endTime: '15:45', // Overlaps 14:00-15:15!
      room: 'Онлайн (Zoom)',
      topic: 'Conflicting Lesson',
      status: 'pending',
      students: [],
    };

    const res2 = saveLessonToStorage(conflictingAttempt);
    assert.strictEqual(res2.success, false, 'saveLessonToStorage must reject colliding lesson');
    assert.ok(res2.error && res2.error.includes('Конфликт преподавателя'), 'Error must specify teacher conflict');

    const notSaved = getStoredLessonById('l_conflict_attempt');
    assert.strictEqual(notSaved, undefined, 'Conflicting lesson must NOT be persisted to storage');

    recordPass('4.1: saveLessonToStorage mutation guard actively blocks conflicting lessons');
  } catch (err) {
    recordFail('4.1', err);
  }

  // Test 4.2: Operating hours violation blocked at mutation level
  try {
    const outOfHoursAttempt: FullLessonData = {
      id: 'l_out_of_hours',
      groupId: 'grp_adv_1',
      groupName: 'German B1 Intensive',
      courseName: 'Немецкий язык',
      teacherId: 't1',
      teacherName: 'Мария Иванова',
      date: '2026-11-20',
      dateFormatted: '20 ноя 2026',
      dayOfWeek: 4,
      startTime: '08:00', // Before 09:00!
      endTime: '09:15',
      room: 'Онлайн (Zoom)',
      topic: 'Early Bird',
      status: 'pending',
      students: [],
    };

    const saveRes = saveLessonToStorage(outOfHoursAttempt);
    assert.strictEqual(saveRes.success, false, 'Out-of-hours lesson must be blocked');
    assert.ok(saveRes.error && saveRes.error.includes('09:00'), 'Error must specify school operating hours');

    recordPass('4.2: saveLessonToStorage mutation guard actively blocks out-of-hours lessons (<09:00)');
  } catch (err) {
    recordFail('4.2', err);
  }

  // Test 4.3: Bypass option allows legitimate administrative overrides
  try {
    const bypassLesson: FullLessonData = {
      id: 'l_bypassed_lesson',
      groupId: 'grp_adv_override',
      groupName: 'Override Group',
      courseName: 'Немецкий язык',
      teacherId: 't_mut_guard',
      teacherName: 'Наталья Ковалева',
      date: '2026-11-19',
      dateFormatted: '19 ноя 2026',
      dayOfWeek: 3,
      startTime: '14:30',
      endTime: '15:45',
      room: 'Онлайн (Zoom)',
      topic: 'Admin Emergency Override',
      status: 'planned',
      students: [],
    };

    const saveRes = saveLessonToStorage(bypassLesson, { bypassCollisionCheck: true });
    assert.strictEqual(saveRes.success, true, 'Bypass option must allow save');

    const saved = getStoredLessonById('l_bypassed_lesson');
    assert.ok(saved, 'Bypassed lesson must be saved in storage');

    recordPass('4.3: saveLessonToStorage options.bypassCollisionCheck functions correctly for admin overrides');
  } catch (err) {
    recordFail('4.3', err);
  }

  // =========================================================================
  // SUITE 5: BILLING ROLLBACK & REFUND INTEGRITY
  // =========================================================================
  console.log('\n--- Suite 5: Billing Rollback & Refund Integrity ---');

  // Test 5.1: restoreLessonBilling refunds subscription lesson upon cancellation
  try {
    const sRefund = createMockStudent('stu_refund_sub', 'Павел', { remainingLessons: 3 });
    saveStudentToStorage(sRefund);

    const completedLesson: FullLessonData = {
      id: 'l_to_refund_sub',
      groupId: 'grp_adv_1',
      groupName: 'German B1 Intensive',
      courseName: 'Немецкий язык',
      teacherId: 't1',
      teacherName: 'Мария Иванова',
      date: '2026-11-21',
      dateFormatted: '21 ноя 2026',
      dayOfWeek: 5,
      startTime: '10:00',
      endTime: '11:15',
      room: 'Онлайн (Zoom)',
      topic: 'Refund Test',
      status: 'planned',
      students: [{ id: 'stu_refund_sub', name: 'Павел Тестов', attendanceStatus: 'not_marked' }],
    };
    saveLessonToStorage(completedLesson);

    // Bill the lesson: 3 -> 2
    recordLessonAttendanceBatch({
      lessonId: 'l_to_refund_sub',
      status: 'completed',
      studentRecords: [{ studentId: 'stu_refund_sub', studentName: 'Павел Тестов', status: 'present' }],
    });

    let stuBilled = getStoredStudents().find((s) => s.id === 'stu_refund_sub');
    assert.strictEqual(stuBilled?.finance?.activeSubscription?.lessonsRemaining, 2, 'Debited to 2');

    // Now restore/rollback billing
    const refundRes = restoreLessonBilling('l_to_refund_sub');
    assert.strictEqual(refundRes.success, true);
    assert.strictEqual(refundRes.restoredCount, 1);

    let stuRestored = getStoredStudents().find((s) => s.id === 'stu_refund_sub');
    assert.strictEqual(
      stuRestored?.finance?.activeSubscription?.lessonsRemaining,
      3,
      'Subscription lessonsRemaining successfully restored back to 3'
    );

    // Test rollback idempotency: restoring again does NOT refund again
    const secondRefund = restoreLessonBilling('l_to_refund_sub');
    assert.strictEqual(secondRefund.restoredCount, 0, 'Second rollback must restore 0');
    let stuAfterSecond = getStoredStudents().find((s) => s.id === 'stu_refund_sub');
    assert.strictEqual(
      stuAfterSecond?.finance?.activeSubscription?.lessonsRemaining,
      3,
      'Subscription remaining must NOT increment past 3'
    );

    recordPass('5.1: restoreLessonBilling successfully refunds subscription lessons with idempotency protection');
  } catch (err) {
    recordFail('5.1', err);
  }

  // =========================================================================
  // HARNESS SUMMARY
  // =========================================================================
  console.log('\n===============================================================');
  console.log('   CHALLENGER 2 (M1, GEN 2) TEST SUMMARY                      ');
  console.log('===============================================================');
  console.log(`  Passed Checks:   ${passed}`);
  console.log(`  Failed Checks:   ${failed}`);
  console.log(`  Total Checks:    ${passed + failed}`);
  console.log('---------------------------------------------------------------');
  if (failed === 0) {
    console.log(`✅ ALL CHALLENGER 2 STRESS TESTS PASSED (${passed}/${passed + failed})`);
  } else {
    console.log(`❌ FAILURES DETECTED: ${failed}`);
    failures.forEach((f) => console.log(`  - ${f}`));
  }
  console.log('===============================================================\n');

  return { passed, failed, failures };
}

if (typeof require !== 'undefined' && require.main === module) {
  runChallenger2M1LessonStorageTests()
    .then((res) => {
      if (res.failed > 0) process.exit(1);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal test error:', err);
      process.exit(1);
    });
}
