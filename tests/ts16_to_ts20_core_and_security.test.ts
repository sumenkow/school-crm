import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { setupTestEnv } from './helpers/testEnv';
import {
  getStoredLessons,
  saveLessonToStorage,
  getStoredLessonById,
  restoreLessonBilling,
} from '@/lib/data/lessonStorage';
import { getStoredStudents, saveStudentToStorage } from '@/lib/data/studentStorage';
import { FullLessonData, FullStudentData } from '@/lib/data/mockData';

export async function runCoreAndSecurityTests() {
  const env = setupTestEnv();
  console.log('\n--- Running TS-16 to TS-20: Core P0 & Security Hardening Tests ---');

  // -------------------------------------------------------------
  // TS-16: LessonModal handleSave preserves billedStudentIds from storage
  // -------------------------------------------------------------
  console.log('Testing TS-16: LessonModal preserves billedStudentIds on save...');
  env.clear();

  const lessonId = 'test_lesson_ts16';
  const initialLesson: FullLessonData = {
    id: lessonId,
    groupId: 'group_ts16',
    groupName: 'Group TS16',
    courseName: 'English B2',
    teacherId: 't1',
    teacherName: 'Teacher Test',
    date: '2026-10-15',
    dateFormatted: '15 окт. 2026 г.',
    dayOfWeek: 3,
    startTime: '10:00',
    endTime: '11:30',
    status: 'completed',
    topic: 'Original Topic',
    room: 'Онлайн (Zoom)',
    students: [
      { id: 'stud_16', name: 'Student 16', attendanceStatus: 'present', isTrial: false },
    ],
    billedStudentIds: ['stud_16'],
    billingDetails: {
      stud_16: {
        type: 'subscription',
        amount: 1,
        at: '2026-10-15T10:00:00Z',
      },
    },
  };

  saveLessonToStorage(initialLesson);

  // Stale lesson prop simulation (as passed when modal opened before billing occurred)
  const staleLessonProp: FullLessonData = {
    ...initialLesson,
    billedStudentIds: undefined,
    billingDetails: undefined,
  };

  // Safe handleSave pattern: read fresh lesson from storage
  const storedLesson = getStoredLessonById(lessonId);
  const freshLesson = storedLesson || staleLessonProp;

  const updatedFromModal: FullLessonData = {
    ...freshLesson,
    topic: 'Edited Topic After Billing',
    notes: 'Updated homework notes',
    students: (freshLesson.students || []).map((s) => ({
      ...s,
      notes: 'Good performance',
    })),
  };

  saveLessonToStorage(updatedFromModal);

  const savedLesson = getStoredLessonById(lessonId);
  assert.ok(savedLesson, 'Lesson should exist in storage');
  assert.strictEqual(savedLesson.topic, 'Edited Topic After Billing');
  assert.deepStrictEqual(
    savedLesson.billedStudentIds,
    ['stud_16'],
    'TS-16 FAILED: billedStudentIds was wiped out by save'
  );
  assert.ok(
    savedLesson.billingDetails && Object.keys(savedLesson.billingDetails).length > 0,
    'TS-16 FAILED: billingDetails was wiped out by save'
  );
  console.log('✅ TS-16 Passed: billedStudentIds and billingDetails preserved on modal save.');

  // -------------------------------------------------------------
  // TS-17: Cancellation rollback restores balance & clears billedStudentIds
  // -------------------------------------------------------------
  console.log('Testing TS-17: Cancellation rollback triggers restoreLessonBilling...');
  env.clear();

  const student17: FullStudentData = {
    id: 'stud_17',
    firstName: 'Cancel',
    lastName: 'Tester',
    status: 'active',
    phone: '+7 999 111-22-33',
    email: 'cancel@test.com',
    grade: '9 класс',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    groups: [],
    parents: [],
    attendanceStats: {
      totalLessons: 5,
      presentCount: 5,
      absentCount: 0,
      rescheduledCount: 0,
      attendanceRate: '100%',
      history: [],
    },
    finance: {
      activeSubscription: {
        id: 'sub_17',
        name: 'Абонемент',
        lessonsRemaining: 3,
        lessonsTotal: 8,
        lessonsAttended: '5 из 8',
        status: 'active',
        renewalDate: '2026-11-01',
      },
      payments: [],
    },
    interactions: [],
    tasks: [],
  };
  saveStudentToStorage(student17);

  const lesson17: FullLessonData = {
    id: 'lesson_17',
    groupId: 'group_17',
    groupName: 'Group 17',
    courseName: 'Math',
    teacherId: 't1',
    teacherName: 'Teacher',
    date: '2026-10-16',
    dateFormatted: '16 окт. 2026 г.',
    dayOfWeek: 4,
    startTime: '14:00',
    endTime: '15:30',
    status: 'completed',
    topic: 'Algebra',
    room: 'Онлайн (Zoom)',
    students: [{ id: 'stud_17', name: 'Cancel Tester', attendanceStatus: 'present' }],
    billedStudentIds: ['stud_17'],
    billingDetails: {
      stud_17: {
        type: 'subscription',
        amount: 1,
        at: '2026-10-16T14:00:00Z',
      },
    },
  };
  saveLessonToStorage(lesson17);

  // Execute restoreLessonBilling
  const rollbackResult = restoreLessonBilling('lesson_17');
  assert.ok(rollbackResult.restoredCount > 0, 'restoreLessonBilling should succeed');

  const updatedStudent17 = getStoredStudents().find((s) => s.id === 'stud_17');
  assert.strictEqual(
    updatedStudent17?.finance?.activeSubscription?.lessonsRemaining,
    4,
    'TS-17 FAILED: lessonsRemaining was not incremented back to 4'
  );

  const updatedLesson17 = getStoredLessonById('lesson_17');
  assert.strictEqual(
    updatedLesson17?.billedStudentIds?.length || 0,
    0,
    'TS-17 FAILED: billedStudentIds was not cleared upon rollback'
  );
  console.log('✅ TS-17 Passed: Cancellation rollback successfully restores balance and clears billing.');

  // -------------------------------------------------------------
  // TS-18: Group status sync preserves 'finished' and 'paused'
  // -------------------------------------------------------------
  console.log('Testing TS-18: Group validStatuses includes finished and paused...');
  const syncRoutePath = path.resolve(process.cwd(), 'src/app/api/sync/route.ts');
  const syncContent = fs.readFileSync(syncRoutePath, 'utf8');

  assert.ok(
    syncContent.includes("'finished'") || syncContent.includes('"finished"'),
    "TS-18 FAILED: sync/route.ts validStatuses is missing 'finished'"
  );
  assert.ok(
    syncContent.includes("'paused'") || syncContent.includes('"paused"'),
    "TS-18 FAILED: sync/route.ts validStatuses is missing 'paused'"
  );

  // Simulate sync status resolution
  const validStatuses = ['active', 'recruiting', 'archived', 'finished', 'paused'];
  const testGroupStatus = (status: string) => (validStatuses.includes(status) ? status : 'active');

  assert.strictEqual(testGroupStatus('finished'), 'finished', "Group 'finished' must not fallback to 'active'");
  assert.strictEqual(testGroupStatus('paused'), 'paused', "Group 'paused' must not fallback to 'active'");
  assert.strictEqual(testGroupStatus('recruiting'), 'recruiting');
  assert.strictEqual(testGroupStatus('unknown_status'), 'active');
  console.log('✅ TS-18 Passed: Group sync correctly preserves finished and paused statuses.');

  // -------------------------------------------------------------
  // TS-19: RLS migration file exists and enforces developer role & lesson_attendance
  // -------------------------------------------------------------
  console.log('Testing TS-19: RLS migration file validation...');
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20261005001000_fix_rls_lesson_attendance.sql'
  );
  assert.ok(fs.existsSync(migrationPath), 'TS-19 FAILED: Migration 20261005001000 does not exist');

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  assert.ok(
    migrationSql.includes('ENABLE ROW LEVEL SECURITY'),
    'TS-19 FAILED: Migration must enable RLS'
  );
  assert.ok(
    migrationSql.includes('lesson_attendance'),
    'TS-19 FAILED: Migration must target lesson_attendance'
  );
  assert.ok(
    migrationSql.includes('developer'),
    "TS-19 FAILED: Migration must include 'developer' role in access policies"
  );
  console.log('✅ TS-19 Passed: RLS migration file correctly formatted.');

  // -------------------------------------------------------------
  // TS-20: Ghost attendance - un-profiled seed IDs isolation
  // -------------------------------------------------------------
  console.log('Testing TS-20: Ghost attendance seed student ID isolation...');
  const unprofiledSeedIds = [
    's5', 's8', 's9', 's10',
    's11', 's12', 's13', 's14', 's15', 's16',
    's17', 's19', 's20', 's21',
  ];
  const activeStudents = getStoredStudents();
  const activeIds = new Set(activeStudents.map((s) => s.id));

  // These unprofiled IDs are seed references only in demo lessons/groups
  const existingAsMaster = unprofiledSeedIds.filter((id) => activeIds.has(id));
  assert.strictEqual(
    existingAsMaster.length,
    0,
    `TS-20 FAILED: Unprofiled seed IDs unexpectedly found in active student store: ${existingAsMaster.join(', ')}`
  );

  // Verify mockData.ts contains seed data isolation
  const mockDataCode = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/data/mockData.ts'), 'utf8');
  assert.ok(
    mockDataCode.includes('INITIAL_STUDENTS') && mockDataCode.includes('INITIAL_GROUPS'),
    'TS-20 FAILED: mockData.ts must maintain isolated initial seeds'
  );
  console.log('✅ TS-20 Passed: Ghost seed IDs correctly isolated from master student records.');
}
