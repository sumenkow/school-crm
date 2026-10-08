/**
 * SMART ACADEMY CRM — EMPIRICAL CHALLENGER 1 (M1)
 * Adversarial Stress & Edge-Case Harness for Tasks Workspace Engine
 *
 * Target: src/features/tasks/lib/tasksWorkspaceEngine.ts
 */

import assert from 'node:assert';
import {
  calculateTasksKpis,
  deduplicateTasks,
  filterTasksByDirection,
  filterTasksByCriteria,
  sortTasks,
  filterAndSortTasks,
  getTodayIso,
  getCardDateDisplay,
  getCategoryBadgeStyle,
  getInitials,
  DirectionalTab,
  TaskSortMode,
  TaskFilterCriteria,
  UserContext,
} from '../src/features/tasks/lib/tasksWorkspaceEngine';
import { FullTaskData } from '../src/lib/data/mockData';

export async function runM1TasksStressTests(): Promise<{ passed: number; failed: number; failures: string[] }> {
  console.log('\n===============================================================');
  console.log('   CHALLENGER 1 (M1) — EMPIRICAL TASKS WORKSPACE STRESS HARNESS');
  console.log('   Target: src/features/tasks/lib/tasksWorkspaceEngine.ts     ');
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
      console.log(`  ✗ [FAIL] ${name} — ${msg}`);
    }
  }

  const BASE_TODAY = '2026-10-08';

  const createSampleTask = (overrides: Partial<FullTaskData> = {}): FullTaskData => ({
    id: 'task_' + Math.random().toString(36).slice(2, 9),
    title: 'Тестовая задача',
    taskType: 'Retention',
    status: 'open',
    priority: 'medium',
    assignedTo: 'Андрей Волков',
    assignedToUserId: 'usr_admin_1',
    dueDate: BASE_TODAY,
    dueDateFormatted: 'до 18:00',
    createdByRole: 'admin',
    createdByName: 'Андрей Волков',
    createdByUserId: 'usr_admin_1',
    ...overrides,
  });

  // =========================================================================
  // SUITE 1: EMPTY LISTS & NULL / UNDEFINED DATA RESILIENCE
  // =========================================================================
  console.log('\n--- Suite 1: Empty Lists & Null/Undefined Robustness ---');

  test('T1.01: calculateTasksKpis returns all 0 for empty task list', () => {
    const kpis = calculateTasksKpis([], BASE_TODAY);
    assert.deepStrictEqual(kpis, { total: 0, overdue: 0, today: 0, completed: 0 });
  });

  test('T1.02: deduplicateTasks returns empty array for empty task list', () => {
    const res = deduplicateTasks([]);
    assert.deepStrictEqual(res, []);
  });

  test('T1.03: filterTasksByDirection returns empty array for empty task list', () => {
    assert.deepStrictEqual(filterTasksByDirection([], 'all'), []);
    assert.deepStrictEqual(filterTasksByDirection([], 'assigned_to_me'), []);
    assert.deepStrictEqual(filterTasksByDirection([], 'created_by_me'), []);
  });

  test('T1.04: filterTasksByCriteria returns empty array for empty task list', () => {
    const res = filterTasksByCriteria([], { tab: 'all', priority: 'high', dueDate: 'today' }, BASE_TODAY);
    assert.deepStrictEqual(res, []);
  });

  test('T1.05: sortTasks returns empty array for empty task list', () => {
    assert.deepStrictEqual(sortTasks([], 'priority', BASE_TODAY), []);
    assert.deepStrictEqual(sortTasks([], 'date_asc', BASE_TODAY), []);
    assert.deepStrictEqual(sortTasks([], 'created_desc', BASE_TODAY), []);
  });

  test('T1.06: deduplicateTasks filters out null, undefined, and missing ID elements', () => {
    const malformed = [
      null as any,
      undefined as any,
      {} as any,
      { id: '' } as any,
      createSampleTask({ id: 'valid_1' }),
      null as any,
      createSampleTask({ id: 'valid_2' }),
    ];
    const deduped = deduplicateTasks(malformed);
    assert.strictEqual(deduped.length, 2);
    assert.strictEqual(deduped[0].id, 'valid_1');
    assert.strictEqual(deduped[1].id, 'valid_2');
  });

  test('T1.08: calculateTasksKpis resilience when array contains null or undefined elements', () => {
    // If raw array from storage or network contains null/undefined entries:
    const kpis = calculateTasksKpis([null as any, undefined as any], BASE_TODAY);
    assert.deepStrictEqual(kpis, { total: 0, overdue: 0, today: 0, completed: 0 });
  });

  test('T1.09: filterTasksByDirection resilience when array contains null elements', () => {
    const res = filterTasksByDirection([null as any, undefined as any], 'all');
    assert.deepStrictEqual(res, []);
  });

  test('T1.10: filterTasksByCriteria resilience when array contains null elements', () => {
    const res = filterTasksByCriteria([null as any, undefined as any], { tab: 'all' }, BASE_TODAY);
    assert.deepStrictEqual(res, []);
  });

  test('T1.07: Tasks with undefined / missing optional fields do not crash engine', () => {
    const strippedTask: FullTaskData = {
      id: 'stripped_1',
      title: 'Stripped task',
      taskType: 'Retention',
      assignedTo: 'Андрей',
      dueDate: '',
      dueDateFormatted: '',
      status: 'open',
      priority: 'low',
    };
    const kpis = calculateTasksKpis([strippedTask], BASE_TODAY);
    assert.strictEqual(kpis.total, 1);
    assert.strictEqual(kpis.overdue, 0);
    assert.strictEqual(kpis.today, 0);
    assert.strictEqual(kpis.completed, 0);

    const filtered = filterTasksByCriteria([strippedTask], { searchQuery: 'strip' }, BASE_TODAY);
    assert.strictEqual(filtered.length, 1);

    const sorted = sortTasks([strippedTask], 'priority', BASE_TODAY);
    assert.strictEqual(sorted.length, 1);
  });

  // =========================================================================
  // SUITE 2: CANONICAL DEDUPLICATION INVARIANTS
  // =========================================================================
  console.log('\n--- Suite 2: Deduplication Invariants ---');

  test('T2.01: deduplicateTasks removes duplicate IDs while preserving first seen', () => {
    const t1A = createSampleTask({ id: 't_dup_1', title: 'Original Version' });
    const t1B = createSampleTask({ id: 't_dup_1', title: 'Duplicate Version 2' });
    const t1C = createSampleTask({ id: 't_dup_1', title: 'Duplicate Version 3' });
    const t2 = createSampleTask({ id: 't_dup_2', title: 'Other Task' });

    const result = deduplicateTasks([t1A, t2, t1B, t1C]);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].id, 't_dup_1');
    assert.strictEqual(result[0].title, 'Original Version');
    assert.strictEqual(result[1].id, 't_dup_2');
  });

  test('T2.02: filterAndSortTasks deduplicates before filtering and sorting', () => {
    const t1A = createSampleTask({ id: 'same_id', priority: 'high', title: 'Task Alpha' });
    const t1B = createSampleTask({ id: 'same_id', priority: 'high', title: 'Task Alpha Duplicate' });
    const res = filterAndSortTasks([t1A, t1B], { tab: 'all', priority: 'high' }, BASE_TODAY);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].id, 'same_id');
  });

  // =========================================================================
  // SUITE 3: KPI METRICS CALCULATION & CONFLICTING DATES / ISO STRINGS
  // =========================================================================
  console.log('\n--- Suite 3: KPI Calculations & Conflicting Dates ---');

  test('T3.01: Completed tasks count exclusively towards completed, never overdue or today', () => {
    const tasks: FullTaskData[] = [
      createSampleTask({
        id: 'done_overdue_date',
        status: 'done',
        dueDate: '2026-10-01', // Past
        isOverdue: true,
      }),
      createSampleTask({
        id: 'done_today_date',
        status: 'done',
        dueDate: BASE_TODAY,
      }),
    ];

    const kpis = calculateTasksKpis(tasks, BASE_TODAY);
    assert.strictEqual(kpis.total, 2);
    assert.strictEqual(kpis.completed, 2);
    assert.strictEqual(kpis.overdue, 0, 'Completed tasks must never be counted as overdue');
    assert.strictEqual(kpis.today, 0, 'Completed tasks must never be counted as today');
  });

  test('T3.02: Cancelled tasks are completely excluded from all 4 KPIs', () => {
    const tasks: FullTaskData[] = [
      createSampleTask({ id: 'canc_1', status: 'cancelled', dueDate: '2026-10-01' }),
      createSampleTask({ id: 'canc_2', status: 'cancelled', dueDate: BASE_TODAY }),
      createSampleTask({ id: 'canc_3', status: 'cancelled' }),
      createSampleTask({ id: 'open_1', status: 'open', dueDate: BASE_TODAY }),
    ];

    const kpis = calculateTasksKpis(tasks, BASE_TODAY);
    assert.strictEqual(kpis.total, 1);
    assert.strictEqual(kpis.today, 1);
    assert.strictEqual(kpis.overdue, 0);
    assert.strictEqual(kpis.completed, 0);
  });

  test('T3.03: Overdue tasks identified by dueDate < todayIso, isOverdue flag, or dueDateFormatted', () => {
    const tasks: FullTaskData[] = [
      createSampleTask({ id: 'ov_date', status: 'open', dueDate: '2026-10-07' }), // past date
      createSampleTask({ id: 'ov_flag', status: 'open', dueDate: '2026-10-20', isOverdue: true }), // future date but flag set
      createSampleTask({ id: 'ov_text', status: 'open', dueDateFormatted: 'Просрочено на 2 дня' }),
    ];

    const kpis = calculateTasksKpis(tasks, BASE_TODAY);
    assert.strictEqual(kpis.total, 3);
    assert.strictEqual(kpis.overdue, 3);
    assert.strictEqual(kpis.today, 0);
  });

  test('T3.04: ISO string edge-of-day comparison behavior', () => {
    // If dueDate has a timestamp on the same day:
    const tasks: FullTaskData[] = [
      createSampleTask({ id: 'iso_past', status: 'open', dueDate: '2026-10-07T23:59:59.999Z' }),
      createSampleTask({ id: 'iso_plain_today', status: 'open', dueDate: '2026-10-08' }),
      createSampleTask({ id: 'iso_future', status: 'open', dueDate: '2026-10-09T00:00:00.000Z' }),
    ];

    const kpis = calculateTasksKpis(tasks, BASE_TODAY);
    assert.strictEqual(kpis.total, 3);
    assert.strictEqual(kpis.overdue, 1, '2026-10-07 timestamp must be overdue');
    assert.strictEqual(kpis.today, 1, '2026-10-08 plain date must be today');
  });

  test('T3.05: Edge case: dueDate with full ISO timestamp on today (e.g. 2026-10-08T15:00:00Z)', () => {
    // A task scheduled for today with full ISO timestamp:
    const taskWithTimestamp = createSampleTask({
      id: 'iso_today_ts',
      status: 'open',
      dueDate: '2026-10-08T15:00:00Z',
      dueDateFormatted: 'до 18:00',
    });

    const kpis = calculateTasksKpis([taskWithTimestamp], BASE_TODAY);
    assert.strictEqual(kpis.today, 1, 'Task with dueDate="2026-10-08T15:00:00Z" must count towards today KPI');
  });

  // =========================================================================
  // SUITE 4: DIRECTIONAL NAVIGATION TABS & ROLE-BASED ACCESS EDGE CASES
  // =========================================================================
  console.log('\n--- Suite 4: Directional Tabs & Role-Based Edge Cases ---');

  test('T4.01: Tab "assigned_to_me" matches by assignedToUserId', () => {
    const tasks = [
      createSampleTask({ id: 't1', assignedToUserId: 'usr_target', assignedTo: 'Другое имя' }),
      createSampleTask({ id: 't2', assignedToUserId: 'usr_other', assignedTo: 'Иван' }),
    ];
    const userContext: UserContext = { userId: 'usr_target', userName: 'Иван', role: 'admin' };
    const res = filterTasksByDirection(tasks, 'assigned_to_me', userContext);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].id, 't1');
  });

  test('T4.02: Tab "assigned_to_me" matches case-insensitively by userName when userId not matching', () => {
    const tasks = [
      createSampleTask({ id: 't1', assignedTo: '  Елена Менеджер  ' }),
      createSampleTask({ id: 't2', assignedTo: 'Андрей Волков' }),
    ];
    const userContext: UserContext = { userName: 'елена менеджер' };
    const res = filterTasksByDirection(tasks, 'assigned_to_me', userContext);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].id, 't1');
  });

  test('T4.03: Tab "assigned_to_me" fallback for demo admin account when context empty', () => {
    const tasks = [
      createSampleTask({ id: 't1', assignedTo: 'Андрей Волков' }),
      createSampleTask({ id: 't2', assignedTo: 'Мария Иванова' }),
    ];
    const res = filterTasksByDirection(tasks, 'assigned_to_me', {});
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].id, 't1');
  });

  test('T4.04: Tab "created_by_me" matches by createdByUserId', () => {
    const tasks = [
      createSampleTask({ id: 't1', createdByUserId: 'usr_creator_99', createdByName: 'Чужой' }),
      createSampleTask({ id: 't2', createdByUserId: 'usr_other_1', createdByName: 'Некто' }),
    ];
    const userContext: UserContext = { userId: 'usr_creator_99' };
    const res = filterTasksByDirection(tasks, 'created_by_me', userContext);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].id, 't1');
  });

  test('T4.05: Tab "created_by_me" matches by createdByName or creator field', () => {
    const tasks = [
      createSampleTask({ id: 't1', createdByName: 'Сергей Петров', creator: undefined }),
      createSampleTask({ id: 't2', createdByName: undefined, creator: 'Сергей Петров' }),
      createSampleTask({ id: 't3', createdByName: 'Ольга', creator: 'Ольга' }),
    ];
    const userContext: UserContext = { userName: 'сергей петров' };
    const res = filterTasksByDirection(tasks, 'created_by_me', userContext);
    assert.strictEqual(res.length, 2);
    assert.strictEqual(res[0].id, 't1');
    assert.strictEqual(res[1].id, 't2');
  });

  test('T4.06: Task self-delegation (created by user AND assigned to user)', () => {
    const selfTask = createSampleTask({
      id: 'self_1',
      assignedToUserId: 'usr_self',
      assignedTo: 'Анна',
      createdByUserId: 'usr_self',
      createdByName: 'Анна',
    });

    const userContext: UserContext = { userId: 'usr_self', userName: 'Анна' };

    const inAssigned = filterTasksByDirection([selfTask], 'assigned_to_me', userContext);
    const inCreated = filterTasksByDirection([selfTask], 'created_by_me', userContext);
    const inAll = filterTasksByDirection([selfTask], 'all', userContext);

    assert.strictEqual(inAssigned.length, 1, 'Self-assigned task must be in assigned_to_me');
    assert.strictEqual(inCreated.length, 1, 'Self-assigned task must be in created_by_me');
    assert.strictEqual(inAll.length, 1, 'Self-assigned task must be in all');
  });

  test('T4.07: ADVERSARIAL CHALLENGE — createdByRole="owner" task visibility in "created_by_me"', () => {
    // A task created by the School Owner:
    const ownerCreatedTask = createSampleTask({
      id: 'owner_task_1',
      title: 'Поручение от директора',
      createdByRole: 'owner',
      createdByName: 'Владелец школы',
      createdByUserId: 'usr_owner_real',
      assignedTo: 'Мария Преподаватель',
      assignedToUserId: 'usr_teacher_maria',
    });

    // Case A: Current user is the School Owner:
    const ownerContext: UserContext = {
      userId: 'usr_owner_real',
      userName: 'Владелец школы',
      role: 'owner',
    };
    const forOwner = filterTasksByDirection([ownerCreatedTask], 'created_by_me', ownerContext);
    assert.strictEqual(forOwner.length, 1, 'Owner must see owner-created tasks in created_by_me');

    // Case B: Current user is Teacher Maria:
    const teacherContext: UserContext = {
      userId: 'usr_teacher_maria',
      userName: 'Мария Преподаватель',
      role: 'teacher',
    };
    const forTeacher = filterTasksByDirection([ownerCreatedTask], 'created_by_me', teacherContext);
    console.log(`    [Observation] Task created by owner returned in teacher's created_by_me: ${forTeacher.length > 0}`);
    assert.strictEqual(forTeacher.length, 0, 'Teacher must NOT see owner-created tasks in "created_by_me"');
  });

  test('T4.08: Unknown role handling in directional tabs', () => {
    const tasks = [
      createSampleTask({ id: 't1', assignedToUserId: 'usr_1', createdByUserId: 'usr_2' }),
    ];
    const unknownContext: UserContext = { userId: 'usr_unknown', role: 'guest_observer' };
    const assigned = filterTasksByDirection(tasks, 'assigned_to_me', unknownContext);
    const created = filterTasksByDirection(tasks, 'created_by_me', unknownContext);
    const all = filterTasksByDirection(tasks, 'all', unknownContext);

    assert.strictEqual(assigned.length, 0);
    assert.strictEqual(all.length, 1);
  });

  // =========================================================================
  // SUITE 5: MULTI-FILTER COMBINATIONS & BOUNDARY DATES
  // =========================================================================
  console.log('\n--- Suite 5: Multi-Filter Combinations & Boundary Dates ---');

  test('T5.01: Priority filter isolates matching priority strictly', () => {
    const tasks = [
      createSampleTask({ id: 'p_hi', priority: 'high' }),
      createSampleTask({ id: 'p_med', priority: 'medium' }),
      createSampleTask({ id: 'p_lo', priority: 'low' }),
    ];

    const highOnly = filterTasksByCriteria(tasks, { priority: 'high' }, BASE_TODAY);
    assert.strictEqual(highOnly.length, 1);
    assert.strictEqual(highOnly[0].id, 'p_hi');

    const medOnly = filterTasksByCriteria(tasks, { priority: 'medium' }, BASE_TODAY);
    assert.strictEqual(medOnly.length, 1);
    assert.strictEqual(medOnly[0].id, 'p_med');

    const lowOnly = filterTasksByCriteria(tasks, { priority: 'low' }, BASE_TODAY);
    assert.strictEqual(lowOnly.length, 1);
    assert.strictEqual(lowOnly[0].id, 'p_lo');

    const allPrio = filterTasksByCriteria(tasks, { priority: 'all' }, BASE_TODAY);
    assert.strictEqual(allPrio.length, 3);
  });

  test('T5.02: Due date filter "today" includes today tasks and excludes done tasks', () => {
    const tasks = [
      createSampleTask({ id: 'td_open', status: 'open', dueDate: BASE_TODAY }),
      createSampleTask({ id: 'td_done', status: 'done', dueDate: BASE_TODAY }),
      createSampleTask({ id: 'td_fmt', status: 'in_progress', dueDateFormatted: 'Сегодня до 16:00' }),
      createSampleTask({ id: 'td_future', status: 'open', dueDate: '2026-10-15' }),
    ];

    const res = filterTasksByCriteria(tasks, { dueDate: 'today' }, BASE_TODAY);
    assert.strictEqual(res.length, 2);
    const ids = res.map((t) => t.id);
    assert.ok(ids.includes('td_open'));
    assert.ok(ids.includes('td_fmt'));
    assert.ok(!ids.includes('td_done'), 'Done task must not appear in today filter');
  });

  test('T5.03: Due date filter "overdue" excludes done tasks', () => {
    const tasks = [
      createSampleTask({ id: 'ov_open', status: 'open', dueDate: '2026-10-01' }),
      createSampleTask({ id: 'ov_done', status: 'done', dueDate: '2026-10-01' }),
    ];

    const res = filterTasksByCriteria(tasks, { dueDate: 'overdue' }, BASE_TODAY);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].id, 'ov_open');
  });

  test('T5.04: Due date filter "week" boundaries [today, today + 7 days]', () => {
    const tasks = [
      createSampleTask({ id: 'w_past', dueDate: '2026-10-07' }), // before today
      createSampleTask({ id: 'w_today', dueDate: '2026-10-08' }), // today
      createSampleTask({ id: 'w_in_week', dueDate: '2026-10-12' }), // in 4 days
      createSampleTask({ id: 'w_exact_7th', dueDate: '2026-10-15' }), // exactly in 7 days
      createSampleTask({ id: 'w_day_8', dueDate: '2026-10-16' }), // in 8 days
    ];

    const res = filterTasksByCriteria(tasks, { dueDate: 'week' }, BASE_TODAY);
    const ids = res.map((t) => t.id);
    assert.ok(!ids.includes('w_past'), 'Past date must not be in week');
    assert.ok(ids.includes('w_today'), 'Today must be in week');
    assert.ok(ids.includes('w_in_week'), 'In-week date must be in week');
    assert.ok(ids.includes('w_exact_7th'), '7th day boundary must be in week');
    assert.ok(!ids.includes('w_day_8'), '8th day must not be in week');
  });

  test('T5.05: Search query matches across multiple fields case-insensitively', () => {
    const tasks = [
      createSampleTask({ id: 's_title', title: 'Эксклюзивное предложение', taskType: 'Other' }),
      createSampleTask({ id: 's_desc', description: 'Связаться с мамой через Telegram', taskType: 'Other' }),
      createSampleTask({ id: 's_student', studentName: 'Владислав Соколов', taskType: 'Other' }),
      createSampleTask({ id: 's_lead', leadName: 'Лид Потенциальный', taskType: 'Other' }),
      createSampleTask({ id: 's_tag', tag: 'VipTag', taskType: 'Other' }),
    ];

    assert.strictEqual(filterTasksByCriteria(tasks, { searchQuery: 'эксклюзив' }, BASE_TODAY).length, 1);
    assert.strictEqual(filterTasksByCriteria(tasks, { searchQuery: 'telegram' }, BASE_TODAY).length, 1);
    assert.strictEqual(filterTasksByCriteria(tasks, { searchQuery: 'соколов' }, BASE_TODAY).length, 1);
    assert.strictEqual(filterTasksByCriteria(tasks, { searchQuery: 'потенциал' }, BASE_TODAY).length, 1);
    assert.strictEqual(filterTasksByCriteria(tasks, { searchQuery: 'viptag' }, BASE_TODAY).length, 1);
  });

  test('T5.06: Multi-filter conjunction (Tab + Priority + DueDate + Search)', () => {
    const matching = createSampleTask({
      id: 'match_all',
      assignedToUserId: 'usr_me',
      priority: 'high',
      dueDate: BASE_TODAY,
      title: 'Срочный звонок клиенту',
      status: 'open',
    });

    const nonMatchingPrio = createSampleTask({
      id: 'fail_prio',
      assignedToUserId: 'usr_me',
      priority: 'low',
      dueDate: BASE_TODAY,
      title: 'Срочный звонок клиенту',
      status: 'open',
    });

    const nonMatchingDate = createSampleTask({
      id: 'fail_date',
      assignedToUserId: 'usr_me',
      priority: 'high',
      dueDate: '2026-10-20',
      title: 'Срочный звонок клиенту',
      status: 'open',
    });

    const criteria: TaskFilterCriteria = {
      tab: 'assigned_to_me',
      priority: 'high',
      dueDate: 'today',
      searchQuery: 'звонок',
      userContext: { userId: 'usr_me' },
    };

    const res = filterTasksByCriteria([matching, nonMatchingPrio, nonMatchingDate], criteria, BASE_TODAY);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].id, 'match_all');
  });

  // =========================================================================
  // SUITE 6: SORTING MODES & INVARIANTS
  // =========================================================================
  console.log('\n--- Suite 6: Sorting Modes & Invariants ---');

  test('T6.01: Priority sort: in-progress before done, overdue before not-overdue, high > med > low', () => {
    const tasks = [
      createSampleTask({ id: 'done_high', status: 'done', priority: 'high', dueDate: '2026-10-01' }),
      createSampleTask({ id: 'open_low', status: 'open', priority: 'low', dueDate: '2026-10-15' }),
      createSampleTask({ id: 'open_high', status: 'open', priority: 'high', dueDate: '2026-10-15' }),
      createSampleTask({ id: 'open_overdue_med', status: 'open', priority: 'medium', dueDate: '2026-10-05', isOverdue: true }),
    ];

    const sorted = sortTasks(tasks, 'priority', BASE_TODAY);
    const ids = sorted.map((t) => t.id);

    // Overdue open task should be at top:
    assert.strictEqual(ids[0], 'open_overdue_med', 'Overdue open task must rank before regular open');
    // Then open high:
    assert.strictEqual(ids[1], 'open_high', 'Open high must rank next');
    // Then open low:
    assert.strictEqual(ids[2], 'open_low', 'Open low must rank before done');
    // Then done task at very end:
    assert.strictEqual(ids[3], 'done_high', 'Done tasks must always sort to the end');
  });

  test('T6.02: date_asc sort puts earliest dueDate first, missing dates at end', () => {
    const tasks = [
      createSampleTask({ id: 'd_late', dueDate: '2026-10-20' }),
      createSampleTask({ id: 'd_none', dueDate: undefined }),
      createSampleTask({ id: 'd_early', dueDate: '2026-10-05' }),
      createSampleTask({ id: 'd_mid', dueDate: '2026-10-10' }),
    ];

    const sorted = sortTasks(tasks, 'date_asc', BASE_TODAY);
    const ids = sorted.map((t) => t.id);
    assert.strictEqual(ids[0], 'd_early');
    assert.strictEqual(ids[1], 'd_mid');
    assert.strictEqual(ids[2], 'd_late');
    assert.strictEqual(ids[3], 'd_none');
  });

  test('T6.03: sortTasks does not mutate original array', () => {
    const t1 = createSampleTask({ id: 'b', priority: 'low' });
    const t2 = createSampleTask({ id: 'a', priority: 'high' });
    const original = [t1, t2];
    const copy = [...original];

    sortTasks(original, 'priority', BASE_TODAY);
    assert.strictEqual(original[0].id, copy[0].id);
    assert.strictEqual(original[1].id, copy[1].id);
  });

  // =========================================================================
  // SUITE 7: PRESENTATION HELPERS (BADGES, INITIALS, COLORS)
  // =========================================================================
  console.log('\n--- Suite 7: Presentation Helpers ---');

  test('T7.01: getCardDateDisplay maps statuses and dates accurately', () => {
    const doneTask = createSampleTask({ status: 'done', completedAt: '2026-10-05T14:00:00Z' });
    const doneDisplay = getCardDateDisplay(doneTask, BASE_TODAY);
    assert.strictEqual(doneDisplay.badge, 'Выполнено');
    assert.strictEqual(doneDisplay.badgeClass, 'bg-emerald-100 text-emerald-700');

    const overdueTask = createSampleTask({ status: 'open', dueDate: '2026-10-02', isOverdue: true });
    const overdueDisplay = getCardDateDisplay(overdueTask, BASE_TODAY);
    assert.strictEqual(overdueDisplay.badge, 'Просрочено');
    assert.strictEqual(overdueDisplay.badgeClass, 'bg-rose-100 text-rose-700');

    const todayTask = createSampleTask({ status: 'open', dueDate: BASE_TODAY, dueDateFormatted: 'до 18:00' });
    const todayDisplay = getCardDateDisplay(todayTask, BASE_TODAY);
    assert.strictEqual(todayDisplay.badge, 'Сегодня');
    assert.strictEqual(todayDisplay.badgeClass, 'bg-amber-100 text-amber-800');
  });

  test('T7.02: getCategoryBadgeStyle conforms to color psychology', () => {
    assert.ok(getCategoryBadgeStyle('Продажи').includes('purple'));
    assert.ok(getCategoryBadgeStyle('Финансы').includes('amber'));
    assert.ok(getCategoryBadgeStyle('Расписание').includes('emerald'));
    assert.ok(getCategoryBadgeStyle('Документы').includes('blue'));
    assert.ok(getCategoryBadgeStyle('Учебная часть').includes('indigo'));
    assert.ok(getCategoryBadgeStyle('Retention').includes('rose'));
    assert.ok(getCategoryBadgeStyle('Неизвестное').includes('slate'));
  });

  test('T7.03: getInitials handles names, single names, and nullish gracefully', () => {
    assert.strictEqual(getInitials('Андрей Волков'), 'АВ');
    assert.strictEqual(getInitials('Иван'), 'ИВ');
    assert.strictEqual(getInitials('   Мария    Иванова  '), 'МИ');
    assert.strictEqual(getInitials(undefined), 'АВ');
  });

  console.log(`\nM1 Tasks Stress Harness completed: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    console.log('\n❌ EMPIRICAL FAILURES DETECTED:');
    failures.forEach((f, idx) => console.log(`  ${idx + 1}. ${f}`));
  }
  return { passed, failed, failures };
}
