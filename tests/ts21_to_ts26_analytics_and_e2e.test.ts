import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { setupTestEnv } from './helpers/testEnv';
import {
  hasTeacherCollision,
  hasRoomCollision,
  detectLessonCollisions,
} from '@/lib/data/collisionHelper';
import {
  getStoredLessons,
  saveLessonToStorage,
  processAutomaticLessonBilling,
  restoreLessonBilling,
} from '@/lib/data/lessonStorage';
import { getStoredStudents, saveStudentToStorage } from '@/lib/data/studentStorage';
import { getStoredLeads, saveLeadToStorage } from '@/lib/data/leadStorage';
import { getStoredGroups, saveGroupToStorage } from '@/lib/data/groupStorage';
import { convertLeadToStudentTransaction } from '@/lib/data/conversionHelper';
import { FullLessonData, FullStudentData, FullLeadData, FullGroupData } from '@/lib/data/mockData';

export async function runAnalyticsAndE2ETests() {
  const env = setupTestEnv();
  console.log('\n--- Running TS-21 to TS-26: Analytics, Collision & E2E Tests ---');

  // -------------------------------------------------------------
  // TS-21: Currency check — No ₽ in lessonStorage runtime code
  // -------------------------------------------------------------
  console.log('Testing TS-21: Currency symbol purity in lessonStorage...');
  const lessonStoragePath = path.resolve(process.cwd(), 'src/lib/data/lessonStorage.ts');
  const lessonStorageCode = fs.readFileSync(lessonStoragePath, 'utf8');

  // Check lines that aren't pure comments
  const runtimeLinesWithRuble = lessonStorageCode
    .split('\n')
    .filter((line) => line.includes('₽') && !line.trim().startsWith('//') && !line.trim().startsWith('*'));

  assert.strictEqual(
    runtimeLinesWithRuble.length,
    0,
    `TS-21 FAILED: Found ₽ in lessonStorage.ts runtime lines: ${runtimeLinesWithRuble.join('; ')}`
  );
  console.log('✅ TS-21 Passed: No runtime ₽ symbols in billing lessonStorage.');

  // -------------------------------------------------------------
  // TS-22: Analytics hooks — No fake demo names or static hardcoded revenue in Teachers hook
  // -------------------------------------------------------------
  console.log('Testing TS-22: Analytics hooks hardcoded mock purge...');
  const teachersHookPath = path.resolve(
    process.cwd(),
    'src/features/analytics/hooks/useTeachersTabData.ts'
  );
  const teachersHookCode = fs.readFileSync(teachersHookPath, 'utf8');

  // Forbidden demo names
  const forbiddenDemoNames = ['Петров', 'Иванов', 'Сидоров', 'Кузнецов', 'Морозов'];
  for (const name of forbiddenDemoNames) {
    assert.ok(
      !teachersHookCode.includes(name),
      `TS-22 FAILED: useTeachersTabData.ts contains hardcoded demo teacher '${name}'`
    );
  }
  assert.ok(
    !teachersHookCode.includes('32450'),
    'TS-22 FAILED: useTeachersTabData contains hardcoded 32450 value'
  );
  console.log('✅ TS-22 Passed: useTeachersTabData is free of static hardcoded mock names.');

  // -------------------------------------------------------------
  // TS-23: Teacher collision detection
  // -------------------------------------------------------------
  console.log('Testing TS-23: Teacher schedule collision prevention...');
  const existingLessons: FullLessonData[] = [
    {
      id: 'l_exist_1',
      groupId: 'g1',
      groupName: 'Group 1',
      courseName: 'English B2',
      topic: 'Grammar',
      teacherId: 'teacher_alpha',
      teacherName: 'Teacher Alpha',
      date: '2026-10-20',
      dateFormatted: '20 окт. 2026 г.',
      dayOfWeek: 1,
      startTime: '10:00',
      endTime: '11:30',
      room: 'Кабинет 1',
      status: 'scheduled',
      students: [],
    },
  ];

  // Overlapping lesson with same teacher (10:30–12:00 overlaps 10:00–11:30)
  const overlappingTeacher = hasTeacherCollision(existingLessons, {
    teacherId: 'teacher_alpha',
    date: '2026-10-20',
    startTime: '10:30',
    endTime: '12:00',
  });
  assert.strictEqual(overlappingTeacher, true, 'TS-23 FAILED: Overlapping teacher not detected');

  // Non-overlapping lesson (11:30–13:00 does not overlap 10:00–11:30)
  const nonOverlappingTeacher = hasTeacherCollision(existingLessons, {
    teacherId: 'teacher_alpha',
    date: '2026-10-20',
    startTime: '11:30',
    endTime: '13:00',
  });
  assert.strictEqual(nonOverlappingTeacher, false, 'TS-23 FAILED: False positive collision detected');
  console.log('✅ TS-23 Passed: Teacher schedule collision logic verified.');

  // -------------------------------------------------------------
  // TS-24: Physical room collision detection
  // -------------------------------------------------------------
  console.log('Testing TS-24: Room schedule collision prevention...');
  // Overlapping lesson in same physical room with DIFFERENT teacher
  const overlappingRoom = hasRoomCollision(existingLessons, {
    room: 'Кабинет 1',
    date: '2026-10-20',
    startTime: '10:15',
    endTime: '11:15',
  });
  assert.strictEqual(overlappingRoom, true, 'TS-24 FAILED: Overlapping room not detected');

  // Different room at same time
  const differentRoom = hasRoomCollision(existingLessons, {
    room: 'Кабинет 2',
    date: '2026-10-20',
    startTime: '10:00',
    endTime: '11:30',
  });
  assert.strictEqual(differentRoom, false, 'TS-24 FAILED: Different room flagged as collision');

  // Online / Zoom room should not collide
  const onlineLesson = hasRoomCollision(existingLessons, {
    room: 'Онлайн (Zoom)',
    date: '2026-10-20',
    startTime: '10:00',
    endTime: '11:30',
  });
  assert.strictEqual(onlineLesson, false, 'TS-24 FAILED: Online rooms must not trigger physical collision');
  console.log('✅ TS-24 Passed: Room schedule collision logic verified.');

  // -------------------------------------------------------------
  // TS-25: Modal accessibility attributes
  // -------------------------------------------------------------
  console.log('Testing TS-25: Modal dialog accessibility attributes...');
  const modalFiles = [
    'src/components/crm/ConvertLeadModal.tsx',
    'src/components/crm/EnrollStudentFromLeadModal.tsx',
    'src/components/calendar/LessonModal.tsx',
  ];

  for (const relPath of modalFiles) {
    const fullPath = path.resolve(process.cwd(), relPath);
    assert.ok(fs.existsSync(fullPath), `Modal file missing: ${relPath}`);
    const code = fs.readFileSync(fullPath, 'utf8');

    const hasRoleDialog = code.includes('role="dialog"') || code.includes("role='dialog'");
    const hasAriaModal = code.includes('aria-modal="true"') || code.includes("aria-modal='true'");

    assert.ok(
      hasRoleDialog,
      `TS-25 FAILED: ${relPath} missing role="dialog"`
    );
    assert.ok(
      hasAriaModal,
      `TS-25 FAILED: ${relPath} missing aria-modal="true"`
    );
  }
  console.log('✅ TS-25 Passed: All 3 target modals have role="dialog" and aria-modal="true".');

  // -------------------------------------------------------------
  // TS-26: E2E Lead Conversion & Financial Lifecycle Integrity
  // -------------------------------------------------------------
  console.log('Testing TS-26: E2E Lead Conversion & Billing Lifecycle...');
  env.clear();

  // 1. Create a lead
  const testLead: FullLeadData = {
    id: 'lead_e2e_26',
    name: 'Мама Анна',
    contact: '+7 900 777-88-99',
    telegram: '@anna_lead',
    studentName: 'Миша Тестов',
    studentFirstName: 'Миша',
    studentLastName: 'Тестов',
    directionOrCourse: 'Robotics',
    clientType: 'school_student',
    status: 'trial_held',
    interactions: [],
    assignedTo: 'Admin',
    source: 'Сайт',
    createdAt: '2026-10-01T10:00:00Z',
  };
  saveLeadToStorage(testLead);

  // 2. Create target group
  const testGroup: FullGroupData = {
    id: 'group_e2e_26',
    name: 'Robotics Young',
    courseId: 'course_rob',
    courseName: 'Robotics',
    teacherId: 't1',
    teacherName: 'Инженер Иван',
    schedule: 'Сб • 12:00–13:30',
    capacity: 8,
    room: 'Кабинет 1',
    status: 'active',
    startDate: '2026-10-01',
    students: [],
    recentLessons: [],
  };
  saveGroupToStorage(testGroup);

  // 3. Perform conversion transaction
  const conversionResult = await convertLeadToStudentTransaction({
    lead: testLead,
    studentType: 'school_student',
    studentFirstName: 'Миша',
    studentLastName: 'Тестов',
    studentGrade: '5 класс',
    parentName: 'Мама Анна',
    parentPhone: '+7 900 777-88-99',
    parentTelegram: '@anna_lead',
    courseName: 'Robotics',
    groupId: 'group_e2e_26',
    groupName: 'Robotics Young',
    teacherName: 'Инженер Иван',
    schedule: 'Сб • 12:00–13:30',
    startDate: '2026-10-01',
    depositAmount: 50,
  });

  assert.ok(conversionResult.studentId, 'Conversion must return studentId');

  // Verify student created
  const storedStudent = getStoredStudents().find((s) => s.id === conversionResult.studentId);
  assert.ok(storedStudent, 'Student must exist in storage after conversion');
  assert.strictEqual(storedStudent.firstName, 'Миша');
  assert.strictEqual(storedStudent.lastName, 'Тестов');
  assert.strictEqual(storedStudent.finance?.deposit?.balance, 50);

  // Verify lead status updated to 'enrolled'
  const updatedLead = getStoredLeads(true).find((l) => l.id === testLead.id);
  assert.strictEqual(
    updatedLead?.status,
    'enrolled',
    "TS-26 FAILED: Lead status should be 'enrolled' after conversion"
  );

  // Verify group student enrolled
  const updatedGroup = getStoredGroups().find((g) => g.id === 'group_e2e_26');
  assert.ok(
    updatedGroup?.students.some((s) => s.id === conversionResult.studentId),
    'Student must be enrolled in group students list'
  );

  // 4. Create lesson and process billing
  const lesson26: FullLessonData = {
    id: 'lesson_e2e_26',
    groupId: 'group_e2e_26',
    groupName: 'Robotics Young',
    courseName: 'Robotics',
    teacherId: 't1',
    teacherName: 'Инженер Иван',
    date: '2026-10-25',
    dateFormatted: '25 окт. 2026 г.',
    dayOfWeek: 5,
    startTime: '12:00',
    endTime: '13:30',
    status: 'scheduled',
    topic: 'Введение в робототехнику',
    room: 'Кабинет 1',
    students: [
      { id: conversionResult.studentId, name: 'Миша Тестов', attendanceStatus: 'present' },
    ],
  };
  saveLessonToStorage(lesson26);

  // Process billing for lesson
  const billingRes = processAutomaticLessonBilling({
    lessonId: lesson26.id,
    studentIdsToBill: [conversionResult.studentId],
  });
  assert.strictEqual(billingRes.billedCount, 1, 'Should bill 1 student');

  const studentAfterBilling = getStoredStudents().find((s) => s.id === conversionResult.studentId);
  // Deposit 50€ deducted by 15€ = 35€
  assert.strictEqual(
    studentAfterBilling?.finance?.deposit?.balance,
    35,
    'Deposit should be reduced from 50 to 35'
  );

  // 5. Rollback billing (lesson cancelled)
  const rollbackRes = restoreLessonBilling('lesson_e2e_26');
  assert.ok(rollbackRes.restoredCount > 0, 'Rollback must succeed');

  const studentAfterRollback = getStoredStudents().find((s) => s.id === conversionResult.studentId);
  assert.strictEqual(
    studentAfterRollback?.finance?.deposit?.balance,
    50,
    'Deposit must be fully restored to 50€ after cancellation'
  );

  console.log('✅ TS-26 Passed: End-to-end Lead -> Enrollment -> Billing -> Rollback cycle verified.');
}
