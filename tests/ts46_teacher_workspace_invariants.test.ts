import assert from 'assert';
import {
  computeTeacherWorkspaceData,
  mapLessonToTeacherRow,
  calculateTimeUntil,
} from '../src/features/teacher/lib/teacherWorkspaceEngine';
import { FullLessonData, INITIAL_LESSONS, INITIAL_GROUPS, INITIAL_TEACHERS } from '../src/lib/data/mockData';

export async function runSuite26() {
  console.log('\n===============================================================');
  console.log('   SUITE 26: TS-46 TEACHER WORKSPACE INVARIANTS & ENGINE       ');
  console.log('   Desktop 1440x900 Zero-Scroll, Next Lesson, SSOT & Sorting   ');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}:`, err?.message || err);
      failed++;
    }
  }

  // ─── TIER 1: STRICT CHRONOLOGICAL SORTING & DEDUPLICATION ────────────────────
  test('T1.01: Lessons in teacher schedule are strictly sorted by startTime ASC', () => {
    const unsortedLessons: FullLessonData[] = [
      {
        id: 'l_1845',
        groupId: 'g1',
        groupName: 'English B1 Teens',
        courseName: 'Английский язык',
        teacherId: 't1',
        teacherName: 'Мария Иванова',
        date: '2026-10-06',
        dateFormatted: '06 окт',
        dayOfWeek: 1,
        startTime: '18:45',
        endTime: '20:15',
        room: 'Онлайн (Zoom)',
        topic: 'Modal verbs',
        status: 'scheduled',
        students: [{ id: 's1', name: 'Иван', attendanceStatus: 'present' }],
      },
      {
        id: 'l_1500',
        groupId: 'g2',
        groupName: 'Олимпиадная математика',
        courseName: 'Математика',
        teacherId: 't1',
        teacherName: 'Мария Иванова',
        date: '2026-10-06',
        dateFormatted: '06 окт',
        dayOfWeek: 1,
        startTime: '15:00',
        endTime: '16:30',
        room: 'Кабинет 302',
        topic: 'Логические задачи',
        status: 'completed',
        students: [{ id: 's2', name: 'Анна', attendanceStatus: 'present' }],
      },
      {
        id: 'l_1600',
        groupId: 'g3',
        groupName: 'Kids Starter',
        courseName: 'Английский',
        teacherId: 't1',
        teacherName: 'Мария Иванова',
        date: '2026-10-06',
        dateFormatted: '06 окт',
        dayOfWeek: 1,
        startTime: '16:00',
        endTime: '17:15',
        room: 'Кабинет 101',
        topic: 'Colors and Fruits',
        status: 'completed',
        students: [{ id: 's3', name: 'Максим', attendanceStatus: 'present' }],
      },
    ];

    const result = computeTeacherWorkspaceData({
      teacherId: 't1',
      allLessons: unsortedLessons,
      selectedDate: new Date('2026-10-06T12:00:00Z'),
    });

    assert.strictEqual(result.todayLessons.length, 3);
    assert.strictEqual(result.todayLessons[0].startTime, '15:00');
    assert.strictEqual(result.todayLessons[1].startTime, '16:00');
    assert.strictEqual(result.todayLessons[2].startTime, '18:45');
  });

  test('T1.02: Canonical Deduplication ensures 1 unique lesson.id = strictly 1 row in schedule', () => {
    const duplicatedLessons: FullLessonData[] = [
      {
        id: 'l_dup_1',
        groupId: 'g1',
        groupName: 'English B1 Teens',
        courseName: 'Английский язык',
        teacherId: 't1',
        teacherName: 'Мария Иванова',
        date: '2026-10-06',
        dateFormatted: '06 окт',
        dayOfWeek: 1,
        startTime: '18:45',
        endTime: '20:15',
        room: 'Онлайн (Zoom)',
        topic: 'Modal verbs',
        status: 'scheduled',
        students: [],
      },
      {
        id: 'l_dup_1', // Duplicate ID
        groupId: 'g1',
        groupName: 'English B1 Teens',
        courseName: 'Английский язык',
        teacherId: 't1',
        teacherName: 'Мария Иванова',
        date: '2026-10-06',
        dateFormatted: '06 окт',
        dayOfWeek: 1,
        startTime: '18:45',
        endTime: '20:15',
        room: 'Онлайн (Zoom)',
        topic: 'Modal verbs (clone)',
        status: 'scheduled',
        students: [],
      },
    ];

    const result = computeTeacherWorkspaceData({
      teacherId: 't1',
      allLessons: duplicatedLessons,
      selectedDate: new Date('2026-10-06T12:00:00Z'),
    });

    assert.strictEqual(result.todayLessons.length, 1, 'Duplicate lesson ID must be deduplicated to exactly 1 row');
    assert.strictEqual(result.todayLessons[0].id, 'l_dup_1');
  });

  // ─── TIER 2: NEXT LESSON PRIORITY RESOLUTION (P0) ────────────────────────────
  test('T2.01: Active in-progress lesson is prioritized as Next Lesson', () => {
    const mockLessons: FullLessonData[] = [
      {
        id: 'l_past',
        groupId: 'g1',
        groupName: 'Олимпиадная математика',
        courseName: 'Математика',
        teacherId: 't1',
        teacherName: 'Мария Иванова',
        date: '2026-10-06',
        dateFormatted: '06 окт',
        dayOfWeek: 1,
        startTime: '15:00',
        endTime: '16:30',
        room: 'Кабинет 302',
        topic: 'Логика',
        status: 'completed',
        students: [{ id: 's1', name: 'Иван', attendanceStatus: 'present' }],
      },
      {
        id: 'l_current',
        groupId: 'g2',
        groupName: 'Robotics Junior',
        courseName: 'Робототехника',
        teacherId: 't1',
        teacherName: 'Мария Иванова',
        date: '2026-10-06',
        dateFormatted: '06 окт',
        dayOfWeek: 1,
        startTime: '17:00',
        endTime: '18:30',
        room: 'Кабинет 104',
        topic: 'Сборка манипулятора',
        status: 'scheduled',
        students: [{ id: 's2', name: 'Ольга', attendanceStatus: 'not_marked' }],
      },
      {
        id: 'l_future',
        groupId: 'g3',
        groupName: 'English B1 Teens',
        courseName: 'Английский язык',
        teacherId: 't1',
        teacherName: 'Мария Иванова',
        date: '2026-10-06',
        dateFormatted: '06 окт',
        dayOfWeek: 1,
        startTime: '18:45',
        endTime: '20:15',
        room: 'Онлайн (Zoom)',
        topic: 'Modal verbs',
        status: 'scheduled',
        students: [{ id: 's3', name: 'Анна', attendanceStatus: 'not_marked' }],
      },
    ];

    // Reference time: 17:30 (during l_current)
    const simulatedNow = new Date('2026-10-06T17:30:00');

    const result = computeTeacherWorkspaceData({
      teacherId: 't1',
      allLessons: mockLessons,
      selectedDate: new Date('2026-10-06T12:00:00Z'),
      now: simulatedNow,
    });

    assert.ok(result.nextLesson, 'Next lesson must be resolved');
    assert.strictEqual(result.nextLesson?.id, 'l_current');
    assert.strictEqual(result.nextLesson?.operationalState, 'in_progress');
    assert.strictEqual(result.nextLesson?.primaryAction.type, 'open_journal');
  });

  test('T2.02: Upcoming lesson starting soon displays countdown and primary CTA', () => {
    const mockLessons: FullLessonData[] = [
      {
        id: 'l_upcoming',
        groupId: 'g1',
        groupName: 'English B1 Teens',
        courseName: 'Английский язык',
        teacherId: 't1',
        teacherName: 'Мария Иванова',
        date: '2026-10-06',
        dateFormatted: '06 окт',
        dayOfWeek: 1,
        startTime: '18:45',
        endTime: '20:15',
        room: 'Онлайн (Zoom)',
        topic: 'Modal verbs of deduction',
        status: 'scheduled',
        students: [{ id: 's1', name: 'Иван', attendanceStatus: 'not_marked' }],
      },
    ];

    // Reference time: 18:10 (35 minutes before 18:45)
    const simulatedNow = new Date('2026-10-06T18:10:00');

    const result = computeTeacherWorkspaceData({
      teacherId: 't1',
      allLessons: mockLessons,
      selectedDate: new Date('2026-10-06T12:00:00Z'),
      now: simulatedNow,
    });

    assert.ok(result.nextLesson);
    assert.strictEqual(result.nextLesson?.id, 'l_upcoming');
    assert.strictEqual(result.nextLesson?.timeUntilFormatted, 'через 35 мин');
    assert.strictEqual(result.nextLesson?.operationalState, 'starting_soon');
  });

  // ─── TIER 3: ATTENTION ALERTS & JOURNAL COMPLETION (P1) ──────────────────────
  test('T3.01: Missing journal on past lesson triggers Warning alert', () => {
    const pastLessonMissingJournal: FullLessonData = {
      id: 'l_unfilled',
      groupId: 'g1',
      groupName: 'Python Start (12-15 лет)',
      courseName: 'Программирование',
      teacherId: 't1',
      teacherName: 'Мария Иванова',
      date: '2026-10-06',
      dateFormatted: '06 окт',
      dayOfWeek: 1,
      startTime: '15:00',
      endTime: '16:00',
      room: 'Кабинет 201',
      topic: 'Логические переправы',
      status: 'scheduled',
      students: [{ id: 's1', name: 'Иван', attendanceStatus: 'not_marked' }],
    };

    // Reference time: 16:30 (lesson is already past)
    const simulatedNow = new Date('2026-10-06T16:30:00');

    const result = computeTeacherWorkspaceData({
      teacherId: 't1',
      allLessons: [pastLessonMissingJournal],
      selectedDate: new Date('2026-10-06T12:00:00Z'),
      now: simulatedNow,
    });

    const alert = result.attentionAlerts.find((a) => a.category === 'missing_journal');
    assert.ok(alert, 'Missing journal alert must be generated');
    assert.strictEqual(alert?.severity, 'warning');
    assert.strictEqual(alert?.actionType, 'open_journal');
  });

  // ─── TIER 4: FINANCIAL PRIVACY & ZERO MOCK INVARIANTS ────────────────────────
  test('T4.01: Financial amounts are completely excluded from teacher workspace output', () => {
    const result = computeTeacherWorkspaceData({
      teacherId: 't1',
      selectedDate: new Date('2026-10-06T12:00:00Z'),
    });

    const serialized = JSON.stringify(result);
    // Strict privacy checks: no currency digits or financial labels
    assert.strictEqual(serialized.includes('₽'), false, 'Teacher workspace must not contain rubles');
    assert.strictEqual(serialized.includes('руб'), false, 'Teacher workspace must not contain rubles');
    assert.strictEqual(serialized.includes('долг'), false, 'Commercial debt terms must not appear in teacher schedule rows');
  });

  console.log(`\nSuite 26 completed: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    throw new Error(`Suite 26 failed with ${failed} failure(s)`);
  }
  return { passed, failed };
}

if (require.main === module) {
  runSuite26().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
