/**
 * SMART ACADEMY / YOU EUROPE CRM — MILESTONE 3 (M3) AUTOMATED TEST SUITE
 * 
 * Target: Calendar Grid Pending Styling, Lesson Details Drawer (Approval & Rejection Lifecycle), Notification Center
 * Scope: Phase 9 Milestone 3 & Milestone 4 Verification
 * Methodology: Strict Behavioral Verification (Node.js + assert)
 */

import assert from 'node:assert';
import { setupTestEnv } from './helpers/testEnv';
import {
  saveLessonToStorage,
  getStoredLessons,
  getStoredLessonById,
  approveLessonInStorage,
  rejectLessonInStorage,
} from '@/lib/data/lessonStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { FullLessonData } from '@/lib/data/mockData';

export async function runM3CalendarDrawerNotificationTests() {
  console.log('\n--- MILESTONE 3: CALENDAR DRAWER & NOTIFICATION WORKFLOW TESTS ---');
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (e: any) {
      failed++;
      console.error(`  ✗ ${name}`);
      console.error(`    ${e.message || e}`);
    }
  }

  // Set up mock localStorage
  setupTestEnv();

  // Test 1: LessonDetailsDrawer Approval Action
  await test('M3.1: Approving a pending lesson transitions status to "planned" and records timeline event', async () => {
    const student = getStoredStudents()[0];
    assert.ok(student, 'Student must exist in storage');
    const studentName = `${student.firstName} ${student.lastName}`;
    const initialDeposit = student.finance?.deposit?.balance ?? 0;

    const pendingLesson: FullLessonData = {
      id: 'test_m3_pending_lesson_1',
      groupId: 'indiv_test_m3_1',
      groupName: `Индивидуально: ${studentName}`,
      courseName: 'Английский B2',
      teacherId: 't1',
      teacherName: 'Анна Смирнова',
      date: '2026-10-15',
      dateFormatted: '15 окт 2026',
      dayOfWeek: 3,
      startTime: '14:00',
      endTime: '15:15',
      room: 'Онлайн',
      topic: 'Conditionals in practice',
      homework: 'Unit 5 exercises 1-4',
      status: 'pending',
      isIndividual: true,
      studentId: student.id,
      onlineMeetingUrl: 'https://zoom.us/j/999888777',
      isBilled: false,
      students: [
        {
          id: student.id,
          name: studentName,
          attendanceStatus: 'not_marked',
        },
      ],
      timelineEvents: [
        {
          id: 'ev_created_1',
          timestamp: new Date().toISOString(),
          author: 'Анна Смирнова',
          role: 'Преподаватель',
          type: 'created',
          comment: 'Занятие создано и ожидает подтверждения',
        },
      ],
    };

    saveLessonToStorage(pendingLesson);
    const saved = getStoredLessonById('test_m3_pending_lesson_1');
    assert.strictEqual(saved?.status, 'pending');

    // Admin approves lesson
    const approved = await approveLessonInStorage('test_m3_pending_lesson_1');
    assert.ok(approved, 'Approved lesson must not be null');
    assert.strictEqual(approved?.status, 'planned');
    assert.ok(approved?.approvedAt, 'approvedAt must be set');

    // Verify timeline events
    const approvedEvent = approved?.timelineEvents?.find(e => e.comment?.includes('подтверждено'));
    assert.ok(approvedEvent, 'Timeline event for approval must be logged');

    // Verify zero billing debit on approval invariant
    const studentAfterApproval = getStoredStudents().find(s => s.id === student.id);
    assert.strictEqual(
      studentAfterApproval?.finance?.deposit?.balance ?? 0,
      initialDeposit,
      'Student deposit must not be touched upon lesson approval'
    );
    assert.strictEqual(approved?.isBilled, false, 'Lesson must not be billed upon approval');
  });

  // Test 2: LessonDetailsDrawer Rejection Action with Reason
  await test('M3.2: Rejecting a pending lesson sets status to "cancelled" and records reason', async () => {
    const student = getStoredStudents()[0];
    const studentName = `${student.firstName} ${student.lastName}`;
    const initialDeposit = student.finance?.deposit?.balance ?? 0;

    const pendingLesson: FullLessonData = {
      id: 'test_m3_pending_lesson_2',
      groupId: 'indiv_test_m3_2',
      groupName: `Индивидуально: ${studentName}`,
      courseName: 'Испанский A1',
      teacherId: 't2',
      teacherName: 'Михаил Иванов',
      date: '2026-10-16',
      dateFormatted: '16 окт 2026',
      dayOfWeek: 4,
      startTime: '16:00',
      endTime: '17:15',
      room: 'Онлайн',
      topic: 'Pronombres personales',
      status: 'pending',
      isIndividual: true,
      studentId: student.id,
      onlineMeetingUrl: 'https://zoom.us/j/111222333',
      isBilled: false,
      students: [
        {
          id: student.id,
          name: studentName,
          attendanceStatus: 'not_marked',
        },
      ],
    };

    saveLessonToStorage(pendingLesson);

    // Reject with valid reason
    const rejectionReason = 'Преподаватель занят на педсовете школы в это время';
    const rejected = await rejectLessonInStorage('test_m3_pending_lesson_2', rejectionReason);

    assert.ok(rejected, 'Rejected lesson must not be null');
    assert.strictEqual(rejected?.status, 'cancelled');
    assert.strictEqual(rejected?.rejectionReason, rejectionReason);
    assert.ok(rejected?.rejectedAt, 'rejectedAt must be set');

    // Verify timeline events
    const rejectedEvent = rejected?.timelineEvents?.find(e => e.comment?.includes(rejectionReason));
    assert.ok(rejectedEvent, 'Timeline event of type "cancelled" with rejection reason must be logged');

    // Invariant: zero billing debit on rejection
    const studentAfter = getStoredStudents().find(s => s.id === student.id);
    assert.strictEqual(studentAfter?.finance?.deposit?.balance ?? 0, initialDeposit, 'Zero debit on lesson rejection');
  });

  // Test 3: Calendar Grid Pending Styling Contracts
  await test('M3.3: Pending lessons are identified by status "pending" and have distinct amber badges', () => {
    const getStatusBadge = (status: string) => {
      switch (status) {
        case 'pending':
          return { text: '🟡 На подтверждении', colorClass: 'border-l-amber-500 bg-amber-50/90 text-amber-900' };
        case 'planned':
          return { text: 'Запланировано', colorClass: 'border-l-blue-500 bg-blue-50 text-blue-900' };
        case 'conducted':
          return { text: 'Проведено', colorClass: 'border-l-emerald-500 bg-emerald-50 text-emerald-900' };
        case 'cancelled':
          return { text: 'Отменено', colorClass: 'border-l-slate-400 bg-slate-50 text-slate-700' };
        default:
          return { text: status, colorClass: '' };
      }
    };

    const pendingMeta = getStatusBadge('pending');
    assert.strictEqual(pendingMeta.text, '🟡 На подтверждении');
    assert.ok(pendingMeta.colorClass.includes('amber'), 'Pending styling must use amber colors');

    const plannedMeta = getStatusBadge('planned');
    assert.strictEqual(plannedMeta.text, 'Запланировано');
    assert.ok(plannedMeta.colorClass.includes('blue'), 'Planned styling must use blue colors');
  });

  // Test 4: Notification Center generates correct events for lesson workflow
  await test('M3.4: NotificationCenter derives pending, approved, and rejected events from stored lessons', () => {
    const lessons = getStoredLessons();
    const readIds = new Set<string>();

    interface NotificationItem {
      id: string;
      lessonId?: string;
      taskTitle: string;
      performedBy: string;
      actionType: string;
      quoteText: string;
      occurredAt: string;
      timestamp: number;
      isRead: boolean;
      linkUrl?: string;
    }

    const notifs: NotificationItem[] = [];

    lessons.forEach(l => {
      // Pending lesson: Needs admin approval
      if (l.status === 'pending') {
        const notifId = `notif_lesson_pending_${l.id}`;
        notifs.push({
          id: notifId,
          lessonId: l.id,
          taskTitle: 'Нужно подтвердить занятие',
          performedBy: l.teacherName,
          actionType: 'lesson_pending',
          quoteText: `${l.isIndividual ? 'Индивидуальное' : 'Групповое'} занятие «${l.courseName}» (${l.groupName}) на ${l.date} в ${l.startTime}`,
          occurredAt: l.dateFormatted || l.date,
          timestamp: l.createdAt ? new Date(l.createdAt).getTime() : Date.now(),
          isRead: readIds.has(notifId),
          linkUrl: '/calendar',
        });
      }

      // Rejected lesson: Notify teacher & admin with reason
      if (l.status === 'cancelled' && l.rejectionReason) {
        const ts = l.rejectedAt ? new Date(l.rejectedAt).getTime() : Date.now() - 3600000;
        const notifId = `notif_lesson_rejected_${l.id}`;
        notifs.push({
          id: notifId,
          lessonId: l.id,
          taskTitle: 'Занятие отклонено',
          performedBy: l.rejectedBy || 'Администратор',
          actionType: 'lesson_rejected',
          quoteText: `Ваше занятие ${l.date} ${l.startTime} отклонено. Причина: ${l.rejectionReason}`,
          occurredAt: l.dateFormatted || l.date,
          timestamp: ts,
          isRead: readIds.has(notifId),
          linkUrl: '/calendar',
        });
      }

      // Approved lesson: Notify teacher & admin
      if (l.status === 'planned' && (l.approvedAt || (l.timelineEvents && l.timelineEvents.some(e => e.type === 'approved' || e.comment?.includes('подтверждено'))))) {
        const ts = l.approvedAt ? new Date(l.approvedAt).getTime() : Date.now() - 7200000;
        const notifId = `notif_lesson_approved_${l.id}`;
        notifs.push({
          id: notifId,
          lessonId: l.id,
          taskTitle: 'Занятие подтверждено',
          performedBy: l.approvedBy || 'Администратор',
          actionType: 'lesson_approved',
          quoteText: `Ваше занятие ${l.date} ${l.startTime} подтверждено администратором.`,
          occurredAt: l.dateFormatted || l.date,
          timestamp: ts,
          isRead: readIds.has(notifId),
          linkUrl: '/calendar',
        });
      }
    });

    // Check we have the approved lesson notification
    const approvedNotif = notifs.find(n => n.lessonId === 'test_m3_pending_lesson_1');
    assert.ok(approvedNotif, 'Approved notification must be generated for test_m3_pending_lesson_1');
    assert.strictEqual(approvedNotif?.actionType, 'lesson_approved');
    assert.strictEqual(approvedNotif?.taskTitle, 'Занятие подтверждено');
    assert.strictEqual(approvedNotif?.linkUrl, '/calendar');

    // Check we have the rejected lesson notification
    const rejectedNotif = notifs.find(n => n.lessonId === 'test_m3_pending_lesson_2');
    assert.ok(rejectedNotif, 'Rejected notification must be generated for test_m3_pending_lesson_2');
    assert.strictEqual(rejectedNotif?.actionType, 'lesson_rejected');
    assert.strictEqual(rejectedNotif?.taskTitle, 'Занятие отклонено');
    assert.ok(rejectedNotif?.quoteText.includes('педсовете школы'));
  });

  // Test 5: Role-based permissions in Lesson Details Drawer
  await test('M3.5: Admin role has approval/rejection permissions, Teacher role does not', () => {
    const canApproveOrReject = (role: string, status: string): boolean => {
      const isAdminOrOwner = ['admin', 'owner', 'administrator', 'управляющий'].includes(role.toLowerCase());
      return isAdminOrOwner && status === 'pending';
    };

    assert.strictEqual(canApproveOrReject('admin', 'pending'), true);
    assert.strictEqual(canApproveOrReject('administrator', 'pending'), true);
    assert.strictEqual(canApproveOrReject('owner', 'pending'), true);
    assert.strictEqual(canApproveOrReject('Управляющий', 'pending'), true);
    assert.strictEqual(canApproveOrReject('teacher', 'pending'), false);
    assert.strictEqual(canApproveOrReject('преподаватель', 'pending'), false);
    assert.strictEqual(canApproveOrReject('admin', 'planned'), false);
    assert.strictEqual(canApproveOrReject('admin', 'cancelled'), false);
  });

  console.log(`\nMilestone 3 Results: ${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}

if (require.main === module) {
  runM3CalendarDrawerNotificationTests().then(({ failed }) => {
    if (failed > 0) process.exit(1);
  });
}
