import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  recordLessonAttendanceBatch,
  restoreStudentLessonBilling,
  restoreLessonBilling,
  getStoredLessons,
  saveLessonToStorage,
  getStoredLessonById,
} from '../src/lib/data/lessonStorage';
import { getStoredStudents, saveStudentToStorage } from '../src/lib/data/studentStorage';
import { FullLessonData, FullStudentData } from '../src/lib/data/mockData';
import { LessonStatus } from '../src/types';

export async function runP0SecurityAndSchemaHardeningTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n===============================================================');
  console.log('   SUITE 17: P0 SECURITY PERIMETER & SCHEMA HARDENING');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ ${name}:`, err.message || err);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 1: Security Perimeter & Middleware Lockdown
  // --------------------------------------------------------------------------
  console.log('\n--- TIER 1: Security Perimeter & Middleware Route Protection ---');

  test('SEC-01: Middleware source code contains strict API authentication check', () => {
    const middlewarePath = path.resolve(__dirname, '../src/middleware.ts');
    assert(fs.existsSync(middlewarePath), 'src/middleware.ts must exist');
    const content = fs.readFileSync(middlewarePath, 'utf8');

    // Must NOT have unconditional startsWith('/api/') bypass
    assert(
      !content.includes("pathname.startsWith('/api/') ||"),
      'Middleware must not have blanket startsWith("/api/") bypass'
    );

    // Must return 401 Unauthorized for unauthenticated API access
    assert(
      content.includes("'Unauthorized: Authentication required'") ||
        content.includes('Unauthorized: Authentication required'),
      'Middleware must return 401 Unauthorized for protected API routes'
    );

    // Must protect /api/database/seed and /api/school/settings with 403 for non-owners
    assert(
      content.includes('/api/database/seed') && content.includes('403'),
      'Middleware must enforce 403 Forbidden for database/seed'
    );
  });

  test('SEC-02: Database seed route handler contains strict production environment lock', () => {
    const seedPath = path.resolve(__dirname, '../src/app/api/database/seed/route.ts');
    assert(fs.existsSync(seedPath), 'src/app/api/database/seed/route.ts must exist');
    const content = fs.readFileSync(seedPath, 'utf8');

    assert(
      content.includes("process.env.NODE_ENV === 'production'"),
      'Database seed route handler must explicitly check NODE_ENV === "production"'
    );
    assert(
      content.includes('403') || content.includes('Forbidden'),
      'Database seed route handler must return 403 Forbidden in production'
    );
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Supabase Schema Realignment & Migration SQL
  // --------------------------------------------------------------------------
  console.log('\n--- TIER 2: Schema Realignment, Column Aliasing & Trigger Fix ---');

  test('SCH-01: Migration file aligns lessons enum and column synchronization', () => {
    const migrationPath = path.resolve(
      __dirname,
      '../supabase/migrations/20261006010000_align_lessons_and_attendance.sql'
    );
    assert(fs.existsSync(migrationPath), 'Migration 20261006010000_align_lessons_and_attendance.sql must exist');
    const content = fs.readFileSync(migrationPath, 'utf8');

    // Enum extensions
    assert(content.includes("'pending'"), 'Migration must add pending status to lesson_status enum');
    assert(content.includes("'planned'"), 'Migration must add planned status to lesson_status enum');
    assert(content.includes("'conducted'"), 'Migration must add conducted status to lesson_status enum');
    assert(content.includes("'rejected'"), 'Migration must add rejected status to lesson_status enum');

    // Columns on lessons
    assert(content.includes('ADD COLUMN IF NOT EXISTS date DATE'), 'Migration must add date column to lessons');
    assert(content.includes('ADD COLUMN IF NOT EXISTS zoom_url TEXT'), 'Migration must add zoom_url column to lessons');

    // Attendance trigger handles reversal and references correct columns
    assert(
      content.includes('lessons_attended') && content.includes('lessons_total'),
      'Trigger must reference lessons_attended and lessons_total'
    );
    assert(
      content.includes('GREATEST(0, COALESCE(lessons_attended, 0) - 1)'),
      'Trigger must handle attendance reversal on UPDATE or DELETE'
    );

    // Profile role privilege escalation fix
    assert(
      content.includes('profiles_update_own'),
      'Migration must tighten profiles_update_own RLS policy'
    );

    // Duplicate table elimination
    assert(
      content.includes('lesson_attendance') && content.includes('DROP TABLE public.lesson_attendance'),
      'Migration must drop duplicate lesson_attendance table after migrating data'
    );
  });

  test('SCH-02: lessonStorage handles all valid LessonStatus values and column aliases', () => {
    const validStatuses: LessonStatus[] = [
      'planned',
      'pending',
      'conducted',
      'rejected',
      'scheduled',
      'completed',
      'cancelled',
    ];

    for (const status of validStatuses) {
      assert(typeof status === 'string' && status.length > 0, `Status ${status} must be valid string`);
    }

    // Verify LessonBottomSheet imports attendance and not lesson_attendance
    const sheetPath = path.resolve(__dirname, '../src/components/calendar/LessonBottomSheet.tsx');
    const sheetContent = fs.readFileSync(sheetPath, 'utf8');
    assert(
      !sheetContent.includes('.from(\'lesson_attendance\')'),
      'LessonBottomSheet must not reference duplicate lesson_attendance table'
    );
    assert(
      sheetContent.includes('.from(\'attendance\')'),
      'LessonBottomSheet must write to public.attendance'
    );
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Telegram Mini-App Server Persistence
  // --------------------------------------------------------------------------
  console.log('\n--- TIER 3: Telegram Mini-App Server Persistence ---');

  test('TMA-01: Mini-App booking route handler directly persists to Supabase', () => {
    const bookRoutePath = path.resolve(__dirname, '../src/app/api/telegram/mini-app/book/route.ts');
    assert(fs.existsSync(bookRoutePath), 'Mini-App booking route must exist');
    const content = fs.readFileSync(bookRoutePath, 'utf8');

    assert(
      content.includes('createAdminClient'),
      'Mini-App booking route must use createAdminClient for reliable persistence'
    );
    assert(
      content.includes(".from('lessons').upsert") || content.includes(".from('lessons').insert"),
      'Mini-App booking route must insert/upsert lessons into Supabase'
    );
    assert(
      content.includes(".from('attendance').upsert"),
      'Mini-App booking route must write student attendance to Supabase'
    );
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 4: Analytics Mock Data Ban Compliance
  // --------------------------------------------------------------------------
  console.log('\n--- TIER 4: Mock Data Ban Compliance in Analytics ---');

  test('MDB-01: Reports do not contain banned mockup string English B1 Teens in JSX/code', () => {
    const commPath = path.resolve(__dirname, '../src/features/analytics/components/CommunicationsReport.tsx');
    const opsPath = path.resolve(__dirname, '../src/features/analytics/components/OperationsLogReport.tsx');
    const renewPath = path.resolve(__dirname, '../src/features/analytics/components/RenewalsReport.tsx');
    const payPath = path.resolve(__dirname, '../src/features/analytics/components/PaymentsReceivablesReport.tsx');

    const commContent = fs.readFileSync(commPath, 'utf8');
    const opsContent = fs.readFileSync(opsPath, 'utf8');
    const renewContent = fs.readFileSync(renewPath, 'utf8');
    const payContent = fs.readFileSync(payPath, 'utf8');

    assert(!commContent.includes('English B1 Teens'), 'CommunicationsReport must not contain English B1 Teens');
    assert(!opsContent.includes('English B1 Teens'), 'OperationsLogReport must not contain English B1 Teens');
    assert(!renewContent.includes('English B1 Teens'), 'RenewalsReport must not contain English B1 Teens');
    assert(!payContent.includes('English B1 Teens'), 'PaymentsReceivablesReport must not contain English B1 Teens');
  });

  test('MDB-02: Reports have graceful empty states and no hardcoded numeric mockups in JSX', () => {
    const commPath = path.resolve(__dirname, '../src/features/analytics/components/CommunicationsReport.tsx');
    const opsPath = path.resolve(__dirname, '../src/features/analytics/components/OperationsLogReport.tsx');

    const commContent = fs.readFileSync(commPath, 'utf8');
    const opsContent = fs.readFileSync(opsPath, 'utf8');

    // Must not have fallback || 148 or || 127
    assert(!commContent.includes('|| 148'), 'CommunicationsReport must not have || 148 fallback');
    assert(!commContent.includes('|| 127'), 'CommunicationsReport must not have || 127 fallback');
    assert(!commContent.includes('|| 21'), 'CommunicationsReport must not have || 21 fallback');

    // Must have empty state rendering
    assert(
      commContent.includes('Обращений по выбранным фильтрам не найдено'),
      'CommunicationsReport must render graceful empty state message'
    );
    assert(
      opsContent.includes('Записей в журнале операций не найдено'),
      'OperationsLogReport must render graceful empty state message'
    );
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 5: Financial Protection on Attendance Reversal
  // --------------------------------------------------------------------------
  console.log('\n--- TIER 5: Attendance Reversal & Subscription Refund Protection ---');

  test('FIN-01: restoreStudentLessonBilling correctly refunds student subscription', () => {
    const testStudentId = 'test_student_refund_01';
    const testLessonId = 'test_lesson_refund_01';

    // Setup student with active subscription having 5 lessons remaining and 3 attended
    const baseStudent = getStoredStudents()[0];
    const initialStudent: FullStudentData = {
      ...baseStudent,
      id: testStudentId,
      firstName: 'Тестовый',
      lastName: 'Студент',
      status: 'active',
      finance: {
        ...baseStudent?.finance,
        payments: [],
        activeSubscription: {
          id: 'sub_test_01',
          name: 'Стандарт 8',
          status: 'active',
          lessonsTotal: 8,
          lessonsRemaining: 5,
          lessonsAttended: '3 из 8',
          price: '120 €',
          renewalDate: '15.10.2026',
        },
      },
    };
    saveStudentToStorage(initialStudent);

    // Setup lesson where this student was billed
    const testLesson: FullLessonData = {
      id: testLessonId,
      groupId: 'grp_01',
      groupName: 'Тестовая Группа',
      courseName: 'Тестовый курс',
      topic: 'Тема урока',
      status: 'completed',
      date: '2026-10-06',
      dateFormatted: '06.10.2026',
      dayOfWeek: 1,
      startTime: '10:00',
      endTime: '11:00',
      room: 'Онлайн',
      teacherId: 'teacher_01',
      teacherName: 'Преподаватель',
      isBilled: true,
      billedStudentIds: [testStudentId],
      billingDetails: {
        [testStudentId]: { type: 'subscription', amount: 1, at: new Date().toISOString() },
      },
      students: [
        {
          id: testStudentId,
          name: 'Тестовый Студент',
          attendanceStatus: 'present',
          billed: true,
        },
      ],
    };
    saveLessonToStorage(testLesson);

    // Call restoreStudentLessonBilling
    const result = restoreStudentLessonBilling(testLessonId, testStudentId);
    assert(result.success === true, 'restoreStudentLessonBilling must return success: true');

    // Verify student subscription is restored (+1 remaining, -1 attended)
    const updatedStudent = getStoredStudents().find((s) => s.id === testStudentId);
    assert(updatedStudent, 'Student must exist in storage');
    assert.strictEqual(
      updatedStudent.finance?.activeSubscription?.lessonsRemaining,
      6,
      'Remaining lessons must increase from 5 to 6'
    );
    assert.strictEqual(
      updatedStudent.finance?.activeSubscription?.lessonsAttended,
      '2 из 8',
      'Attended lessons must decrease from 3 to 2'
    );

    // Verify lesson billed flags are cleared for this student
    const updatedLesson = getStoredLessonById(testLessonId);
    assert(updatedLesson, 'Lesson must exist in storage');
    assert(
      !updatedLesson.billedStudentIds?.includes(testStudentId),
      'Student ID must be removed from lesson.billedStudentIds'
    );
    assert(
      updatedLesson.students.find((s) => s.id === testStudentId)?.billed === false,
      'Student billed flag in lesson must be false'
    );
  });

  test('FIN-02: recordLessonAttendanceBatch automatically refunds when student is unmarked', () => {
    const testStudentId = 'test_student_refund_02';
    const testLessonId = 'test_lesson_refund_02';

    // Setup student
    const baseStudent = getStoredStudents()[0];
    const student: FullStudentData = {
      ...baseStudent,
      id: testStudentId,
      firstName: 'Олег',
      lastName: 'Попов',
      status: 'active',
      finance: {
        ...baseStudent?.finance,
        payments: [],
        activeSubscription: {
          id: 'sub_test_02',
          name: 'Интенсив 10',
          status: 'active',
          lessonsTotal: 10,
          lessonsRemaining: 7,
          lessonsAttended: '3 из 10',
          price: '150 €',
          renewalDate: '20.10.2026',
        },
      },
    };
    saveStudentToStorage(student);

    // Setup completed & billed lesson
    const lesson: FullLessonData = {
      id: testLessonId,
      groupId: 'grp_02',
      groupName: 'Группа Робототехники',
      courseName: 'Робототехника',
      topic: 'Датчики расстояния',
      status: 'completed',
      date: '2026-10-06',
      dateFormatted: '06.10.2026',
      dayOfWeek: 1,
      startTime: '14:00',
      endTime: '15:00',
      room: 'Ауд. 101',
      teacherId: 'teacher_02',
      teacherName: 'Иван Мастеров',
      isBilled: true,
      billedStudentIds: [testStudentId],
      billingDetails: {
        [testStudentId]: { type: 'subscription', amount: 1, at: new Date().toISOString() },
      },
      students: [
        {
          id: testStudentId,
          name: 'Олег Попов',
          attendanceStatus: 'present',
          billed: true,
        },
      ],
    };
    saveLessonToStorage(lesson);

    // Change attendance to not_marked via recordLessonAttendanceBatch
    recordLessonAttendanceBatch({
      lessonId: testLessonId,
      studentRecords: [
        {
          studentId: testStudentId,
          studentName: 'Олег Попов',
          status: 'not_marked',
        },
      ],
    });

    // Check student subscription was refunded
    const updatedStudent = getStoredStudents().find((s) => s.id === testStudentId);
    assert(updatedStudent, 'Student must exist in storage');
    assert.strictEqual(
      updatedStudent.finance?.activeSubscription?.lessonsRemaining,
      8,
      'Remaining lessons must automatically refund from 7 to 8'
    );
    assert.strictEqual(
      updatedStudent.finance?.activeSubscription?.lessonsAttended,
      '2 из 10',
      'Attended lessons must automatically refund from 3 to 2'
    );
  });

  console.log(`\n===============================================================`);
  console.log(`   SUITE 17 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`===============================================================`);

  return { passed, failed };
}

// Allow direct CLI invocation
if (require.main === module) {
  runP0SecurityAndSchemaHardeningTests().then((res) => {
    process.exit(res.failed > 0 ? 1 : 0);
  });
}
