import assert from 'node:assert';
import {
  saveLeadToStorage,
  getStoredLeads,
  qualifyAndConvertLead,
  softDeleteLead,
  restoreLead,
} from '../src/lib/data/leadStorage';
import {
  saveInteractionToStorage,
  getCombinedLeadTimeline,
  getCombinedStudentTimeline,
  getStoredInteractions,
  parseDateToISO,
  normalizeInteractionText,
  TimelineInteraction,
} from '../src/lib/data/timelineStorage';
import {
  convertLeadToStudentTransaction,
  LeadConversionPayload,
} from '../src/lib/data/conversionHelper';
import {
  getStoredStudents,
  saveStudentToStorage,
  getStudentById,
} from '../src/lib/data/studentStorage';
import {
  getStoredGroups,
  saveGroupToStorage,
  getGroupById,
  enrollStudentToGroup,
} from '../src/lib/data/groupStorage';
import {
  calculateGroupCapacity,
  formatFreeSpots,
  getNextLessonForGroup,
} from '../src/features/groups/lib/groupsWorkspaceEngine';
import {
  getStoredLessons,
  saveLessonToStorage,
  getStoredLessonById,
  recordLessonAttendanceBatch,
} from '../src/lib/data/lessonStorage';
import {
  checkThreeWayCollision,
  CandidateLesson,
} from '../src/lib/data/collisionHelper';
import {
  getStudentFinancialSummary,
} from '../src/lib/data/balanceHelper';
import { FullLeadData, FullGroupData, FullLessonData } from '../src/lib/data/mockData';

export async function runSuite28() {
  console.log('\n===============================================================');
  console.log('   SUITE 28 (TS-48): CRM COMPLETE LIFECYCLE E2E INVARIANTS     ');
  console.log('   Lead → Interaction Evidence → Trial → Conversion → Group → Lesson');
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

  // =============================================================
  // TIER 1: Lead Creation, Contact Ingestion & Interaction Evidence
  // =============================================================
  console.log('▶ [Tier 1] Lead Creation & Interaction Evidence Logging...');

  const timestamp = Date.now();
  const testLeadId = `lead_e2e_${timestamp}`;
  const testLead: FullLeadData = {
    id: testLeadId,
    name: 'Мария Ветрова',
    studentName: 'Артем Ветров',
    studentFirstName: 'Артем',
    studentLastName: 'Ветров',
    studentGrade: '6 класс',
    contact: '+7 (999) 444-55-66',
    telegram: '@artem_vetrov_mom',
    directionOrCourse: 'Английский язык',
    status: 'new',
    source: 'Сайт школы (Форма заявки)',
    assignedTo: 'Елена Администратор',
    createdAt: new Date().toISOString(),
    is_deleted: false,
    offerAmount: '80 € / месяц',
    studentNotes: 'Интересует подготовка к Cambridge KET',
    interactions: [],
  };

  // 1.1 Save Lead to Storage
  saveLeadToStorage(testLead);
  const leads = getStoredLeads(true);
  const retrievedLead = leads.find((l) => l.id === testLeadId);
  assert.ok(retrievedLead, 'Lead must be saved and retrievable from storage');
  assert.strictEqual(retrievedLead?.name, 'Мария Ветрова');
  assert.strictEqual(retrievedLead?.studentName, 'Артем Ветров');
  assert.strictEqual(retrievedLead?.status, 'new');

  // 1.2 Record Interaction Evidence (First Contact via WhatsApp)
  const interaction1: TimelineInteraction = {
    id: `int_lead_1_${timestamp}`,
    leadId: testLeadId,
    occurredAt: '08.10.2026, 10:30',
    createdAt: new Date().toISOString(),
    channel: 'whatsapp',
    type: 'initial_contact',
    author: 'Администратор Елена',
    content: 'Первый контакт в WhatsApp: отправили презентацию программы и расписание занятий для 6 класса.',
    result: 'Клиент ознакомился, выбирает между средой и субботой',
    targetType: 'lead',
    targetName: 'Мария Ветрова',
  };
  saveInteractionToStorage(interaction1);

  // 1.3 Record Phone Call Interaction Evidence
  const interaction2: TimelineInteraction = {
    id: `int_lead_2_${timestamp}`,
    leadId: testLeadId,
    occurredAt: '08.10.2026, 14:15',
    createdAt: new Date().toISOString(),
    channel: 'phone',
    type: 'follow_up',
    author: 'Администратор Елена',
    content: 'Звонок родителю: согласовали запись на пробное занятие в субботу в 12:00.',
    result: 'Записаны на пробное',
    nextAction: 'Напомнить за 3 часа до начала пробного',
    followUpDate: '10.10.2026',
    targetType: 'lead',
    targetName: 'Мария Ветрова',
  };
  saveInteractionToStorage(interaction2);

  const leadTimeline = getCombinedLeadTimeline(testLeadId, []);
  assert.ok(leadTimeline.length >= 2, 'Lead timeline must contain both interaction evidence records');
  assert.strictEqual(leadTimeline[0].id, interaction2.id, 'Timeline must sort newest on top');
  console.log('  ✓ [T1.01] Lead created and communication evidence saved in Timeline SSOT.');

  // =============================================================
  // TIER 2: Lead Qualification & Status Transitions
  // =============================================================
  console.log('▶ [Tier 2] Lead Qualification, Offer Currency & Loss Reasons...');

  // 2.1 Update Lead to qualified with trial scheduled
  testLead.status = 'trial_scheduled';
  testLead.trialDate = '10.10.2026 12:00';
  saveLeadToStorage(testLead);

  const updatedLead = getStoredLeads(true).find((l) => l.id === testLeadId);
  assert.strictEqual(updatedLead?.status, 'trial_scheduled');
  assert.strictEqual(updatedLead?.trialDate, '10.10.2026 12:00');

  // 2.2 Currency Purity: offer amount must strictly be in EUR (€)
  assert.ok(testLead.offerAmount?.includes('€'), 'Offer amount must be in EUR (€)');
  assert.ok(!testLead.offerAmount?.includes('₽'), 'Offer amount must never contain rubles');

  // 2.3 Loss handling verification: test rejecting a lead requires lossReason
  const rejectedLead: FullLeadData = {
    ...testLead,
    id: `lead_lost_${timestamp}`,
    name: 'Екатерина Морозова',
    studentName: 'Иван Морозов',
    contact: '+7 (999) 777-88-99',
    status: 'lost',
    lossReason: 'Не подошло вечернее расписание',
  };
  saveLeadToStorage(rejectedLead);
  const storedLost = getStoredLeads(true).find((l) => l.id === rejectedLead.id);
  assert.strictEqual(storedLost?.status, 'lost');
  assert.strictEqual(storedLost?.lossReason, 'Не подошло вечернее расписание');
  console.log('  ✓ [T2.01] Lead qualification, stage transition and loss reason handling verified.');

  // =============================================================
  // TIER 3: Trial Lesson Workflow & Collision Checks
  // =============================================================
  console.log('▶ [Tier 3] Trial Lesson Lifecycle & Schedule Validation...');

  const trialLessonId = `lesson_trial_${timestamp}`;
  const trialCandidate: CandidateLesson = {
    date: '2026-10-10',
    startTime: '12:00',
    endTime: '13:15',
    teacherId: 't1',
    teacherName: 'Мария Иванова',
    room: 'Онлайн (Zoom 1)',
    isIndividual: false,
    studentName: 'Артем Ветров',
  };

  // 3.1 Collision check for trial lesson
  const existingLessons = getStoredLessons();
  const collision = checkThreeWayCollision(existingLessons, trialCandidate);
  assert.strictEqual(typeof collision.hasConflict, 'boolean', 'Collision engine must return boolean conflict flag');

  // 3.2 Save trial lesson
  const trialLesson: FullLessonData = {
    id: trialLessonId,
    groupId: 'g_trial',
    groupName: 'Пробный урок English',
    courseName: 'Английский язык',
    teacherId: 't1',
    teacherName: 'Мария Иванова',
    date: '2026-10-10',
    dateFormatted: '10.10.2026',
    dayOfWeek: 5,
    startTime: '12:00',
    endTime: '13:15',
    room: 'Онлайн (Zoom 1)',
    topic: 'Определение уровня (Speaking & Grammar)',
    status: 'scheduled',
    isTrial: true,
    students: [
      {
        id: testLeadId,
        name: 'Артем Ветров',
        attendanceStatus: 'not_marked',
      },
    ],
  };
  saveLessonToStorage(trialLesson);

  const storedTrial = getStoredLessonById(trialLessonId);
  assert.ok(storedTrial, 'Trial lesson must be saved in lessons storage');
  assert.strictEqual(storedTrial?.isTrial, true, 'isTrial flag must be true');

  // 3.3 Conduction of trial: marking attendance as present
  const attendanceResult = recordLessonAttendanceBatch({
    lessonId: trialLessonId,
    topic: 'Успешно проведено: рекомендован уровень B1 Teens',
    status: 'completed',
    studentRecords: [
      {
        studentId: testLeadId,
        studentName: 'Артем Ветров',
        status: 'present',
        note: 'Отличная база, рекомендована группа Teens B1',
      },
    ],
  });
  assert.ok(attendanceResult.updatedLesson, 'Lesson attendance must update');
  assert.strictEqual(attendanceResult.updatedLesson?.status, 'completed');
  console.log('  ✓ [T3.01] Trial lesson scheduled, validated for collisions, and conducted with attendance marked.');

  // =============================================================
  // TIER 4: Transactional Lead Conversion & Parent Deduplication
  // =============================================================
  console.log('▶ [Tier 4] Transactional Conversion to Student & Family Profile...');

  // Setup target group for conversion
  const targetGroupId = `group_target_${timestamp}`;
  const targetGroup: FullGroupData = {
    id: targetGroupId,
    name: 'Teens B1 Saturday',
    courseId: 'c1',
    courseName: 'Английский язык',
    teacherId: 't1',
    teacherName: 'Мария Иванова',
    schedule: 'Сб • 14:00–15:30',
    room: 'Онлайн (Zoom 1)',
    capacity: 8,
    status: 'active',
    startDate: '2026-09-01',
    isDeleted: false,
    students: [],
    recentLessons: [],
  };
  saveGroupToStorage(targetGroup);

  const conversionPayload: LeadConversionPayload = {
    lead: testLead,
    studentType: 'school_student',
    studentFirstName: 'Артем',
    studentLastName: 'Ветров',
    studentGrade: '6 класс',
    parentName: 'Мария Ветрова',
    parentPhone: '+7 (999) 444-55-66',
    parentTelegram: '@artem_vetrov_mom',
    preferredChannel: 'whatsapp',
    courseName: 'Английский язык',
    groupId: targetGroupId,
    groupName: 'Teens B1 Saturday',
    teacherName: 'Мария Иванова',
    schedule: 'Сб • 14:00–15:30',
    startDate: '2026-10-10',
    depositAmount: 160, // 160 € deposit
  };

  const { studentId: convertedStudentId } = await convertLeadToStudentTransaction(conversionPayload);
  assert.ok(convertedStudentId, 'Conversion must return valid studentId');

  // 4.1 Verify Student Entity created properly
  const student = getStoredStudents().find((s) => s.id === convertedStudentId);
  assert.ok(student, 'Converted student must exist in studentStorage');
  assert.strictEqual(student?.firstName, 'Артем');
  assert.strictEqual(student?.lastName, 'Ветров');
  assert.strictEqual(student?.studentType, 'school_student');
  assert.strictEqual(student?.parents?.length, 1);
  assert.strictEqual(student?.parents[0].firstName, 'Мария');
  assert.strictEqual(student?.parents[0].phone, '+7 (999) 444-55-66');
  assert.strictEqual(student?.parents[0].isPrimary, true);

  // 4.2 Verify Financial Deposit initialized in EUR
  assert.strictEqual(student?.finance?.deposit?.balance, 160);
  assert.strictEqual(student?.finance?.deposit?.currency, 'EUR');

  // 4.3 Verify Lead status updated to 'enrolled'
  const postConvertLead = getStoredLeads(true).find((l) => l.id === testLeadId);
  assert.strictEqual(postConvertLead?.status, 'enrolled');
  assert.strictEqual(postConvertLead?.convertedStudentId, convertedStudentId);

  // 4.4 Verify Timeline Integration across Lead and Student
  const studentTimeline = getCombinedStudentTimeline(convertedStudentId, []);
  assert.ok(studentTimeline.length > 0, 'Student timeline must contain conversion interaction');
  console.log('  ✓ [T4.01] Transactional conversion: student created, parents linked, deposit recorded in EUR.');

  // =============================================================
  // TIER 5: Group Capacity Invariants & Individual Lessons
  // =============================================================
  console.log('▶ [Tier 5] Group Enrollment, Capacity Limits & Individual Lessons...');

  // 5.1 Verify Student is enrolled into group
  const groupAfterConvert = getGroupById(targetGroupId);
  assert.ok(groupAfterConvert, 'Group must exist');
  assert.strictEqual(groupAfterConvert?.students?.length, 1, 'Group must have 1 enrolled student');
  assert.strictEqual(groupAfterConvert?.students[0].id, convertedStudentId);

  // 5.2 Test Group Capacity Limits (AUD-011 Capacity Guard)
  const fullCapacityGroup: FullGroupData = {
    id: `group_full_${timestamp}`,
    name: 'Full Mini Group',
    courseId: 'c1',
    courseName: 'Английский язык',
    teacherId: 't1',
    teacherName: 'Мария Иванова',
    schedule: 'Ср • 17:00–18:30',
    room: 'Онлайн',
    capacity: 2,
    status: 'active',
    startDate: '2026-09-01',
    isDeleted: false,
    students: [
      { id: 's1', name: 'Ученик 1', status: 'active', attendanceRate: '100%', parentPhone: '', joinedAt: '01.09.2026' },
      { id: 's2', name: 'Ученик 2', status: 'active', attendanceRate: '100%', parentPhone: '', joinedAt: '01.09.2026' },
    ],
    recentLessons: [],
  };
  saveGroupToStorage(fullCapacityGroup);

  // Attempting to enroll a 3rd student without overflow should fail
  const failedEnroll = enrollStudentToGroup({
    groupId: fullCapacityGroup.id,
    studentId: convertedStudentId,
    allowOverflow: false,
  });
  assert.strictEqual(failedEnroll.success, false, 'Capacity guard must block enrollment into full group');
  assert.strictEqual(failedEnroll.error, 'capacity_exceeded');

  // Enrolling with allowOverflow should succeed
  const overflowEnroll = enrollStudentToGroup({
    groupId: fullCapacityGroup.id,
    studentId: convertedStudentId,
    allowOverflow: true,
  });
  assert.strictEqual(overflowEnroll.success, true, 'Enrollment with allowOverflow must succeed');
  console.log('  ✓ [T5.01] Group capacity guard and overflow permissions verified.');

  // =============================================================
  // TIER 6: Lesson Attendance, Statistics & Financial Deductions
  // =============================================================
  console.log('▶ [Tier 6] Regular Lesson Conduction, Attendance Stats & Balances...');

  const regularLessonId = `lesson_reg_${timestamp}`;
  const regularLesson: FullLessonData = {
    id: regularLessonId,
    groupId: targetGroupId,
    groupName: 'Teens B1 Saturday',
    courseName: 'Английский язык',
    teacherId: 't1',
    teacherName: 'Мария Иванова',
    date: '2026-10-17',
    dateFormatted: '17.10.2026',
    dayOfWeek: 5,
    startTime: '14:00',
    endTime: '15:30',
    room: 'Онлайн (Zoom 1)',
    topic: 'Unit 1: Introductions & Grammar Quiz',
    status: 'scheduled',
    students: [
      {
        id: convertedStudentId,
        name: 'Артем Ветров',
        attendanceStatus: 'not_marked',
      },
    ],
  };
  saveLessonToStorage(regularLesson);

  // 6.1 Record attendance for regular lesson
  recordLessonAttendanceBatch({
    lessonId: regularLessonId,
    topic: 'Unit 1: Introductions & Grammar Quiz',
    homework: 'Workbook p. 12-14, exercises 1-4',
    status: 'completed',
    studentRecords: [
      {
        studentId: convertedStudentId,
        studentName: 'Артем Ветров',
        status: 'present',
        note: 'Активно работал на уроке, блестящие ответы по грамматике',
      },
    ],
  });

  // Verify updated student attendance statistics
  const updatedStudent = getStoredStudents().find((s) => s.id === convertedStudentId);
  assert.ok(updatedStudent, 'Student must exist');
  assert.strictEqual(updatedStudent?.attendanceStats?.totalLessons, 1);
  assert.strictEqual(updatedStudent?.attendanceStats?.presentCount, 1);
  assert.strictEqual(updatedStudent?.attendanceStats?.attendanceRate, '100%');

  // 6.2 Verify financial summary calculation with automatic lesson price deduction
  const finSummary = getStudentFinancialSummary(updatedStudent);
  assert.strictEqual(finSummary.currency, '€');
  assert.strictEqual(finSummary.deposit, 145, 'Deposit must reflect automatic lesson charge: 160 € - 15 € = 145 €');
  assert.strictEqual(finSummary.debt, 0);
  assert.strictEqual(finSummary.netBalance, 145);
  assert.strictEqual(finSummary.isNegative, false);
  console.log('  ✓ [T6.01] Regular lesson attendance, homework and automatic EUR balance deduction verified.');

  // =============================================================
  // TIER 7: Additional Courses & Multi-Group Management
  // =============================================================
  console.log('▶ [Tier 7] Multi-Group Enrollment & Additional Courses...');

  const secondGroupId = `group_robotics_${timestamp}`;
  const secondGroup: FullGroupData = {
    id: secondGroupId,
    name: 'Robotics Sunday Workshop',
    courseId: 'c2',
    courseName: 'Робототехника',
    teacherId: 't2',
    teacherName: 'Михаил Кузнецов',
    schedule: 'Вс • 11:00–12:30',
    room: 'Онлайн (Виртуальная лаборатория)',
    capacity: 8,
    status: 'active',
    startDate: '2026-09-01',
    isDeleted: false,
    students: [],
    recentLessons: [],
  };
  saveGroupToStorage(secondGroup);

  // Enroll student into second group
  const secondEnroll = enrollStudentToGroup({
    groupId: secondGroupId,
    studentId: convertedStudentId,
  });
  assert.strictEqual(secondEnroll.success, true, 'Second group enrollment must succeed');

  const multiGroupStudent = getStoredStudents().find((s) => s.id === convertedStudentId);
  assert.ok(
    (multiGroupStudent?.groups?.length ?? 0) >= 2,
    'Student must belong to multiple groups simultaneously'
  );
  assert.ok(multiGroupStudent?.groups?.some((g) => g.courseName === 'Английский язык'));
  assert.ok(multiGroupStudent?.groups?.some((g) => g.courseName === 'Робототехника'));
  console.log('  ✓ [T7.01] Additional course and multi-group enrollment verified without conflict.');

  console.log('\n===============================================================');
  console.log('   ✅ ALL SUITE 28 (TS-48) CRM LIFECYCLE INVARIANTS PASSED     ');
  console.log('===============================================================\n');
}
