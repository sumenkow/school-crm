/**
 * SMART ACADEMY CRM — SUITE 30 (TS-50)
 * Tasks Workspace Invariants & SSOT Engine
 *
 * Verifies:
 * - Tier 1: Dynamic 4 KPI counters (total, overdue, today, completed; exclusion of cancelled and done from overdue/today; ISO timestamp support)
 * - Tier 2: 3 Directional Tabs (all, assigned_to_me with ID precedence, created_by_me with strict owner isolation; priority, due date, search query filtering)
 * - Tier 3: Task completion workflow (capturing completedAt, completedByName, completionResult, and timeline interaction logging)
 * - Tier 4: Lifecycle transitions (clearing completion fields when returning to work via in_progress/open; postponeCount increment on rescheduling)
 * - Tier 5: Canonical deduplication invariant (collapsing duplicate task IDs) & presentation helpers
 */

import assert from 'node:assert';
import { setupTestEnv } from './helpers/testEnv';
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
  TasksKpiSummary,
} from '../src/features/tasks/lib/tasksWorkspaceEngine';
import { FullTaskData } from '../src/lib/data/mockData';
import {
  createUnifiedTask,
  updateUnifiedTaskStatus,
} from '../src/lib/data/taskManager';
import { getStoredTasks, saveTaskToStorage } from '../src/lib/data/taskStorage';
import { getStoredInteractions } from '../src/lib/data/timelineStorage';

export async function runSuite30(): Promise<{ passed: number; failed: number }> {
  console.log('\n===============================================================');
  console.log('   SUITE 30 (TS-50): TASKS WORKSPACE INVARIANTS & ENGINE       ');
  console.log('   Validating 4 KPI Counters, 3 Tabs, Completion, Return-to-Work, Deduplication');
  console.log('===============================================================');

  // Initialize in-memory test environment
  setupTestEnv();

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ [FAIL] ${name}:`, err?.message || err);
      failed++;
      throw err;
    }
  }

  const BASE_TODAY = '2026-10-08';

  const makeSampleTask = (overrides: Partial<FullTaskData> = {}): FullTaskData => ({
    id: 'task_inv_' + Math.random().toString(36).slice(2, 9),
    title: 'Тестовая инвариантная задача',
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
    postponeCount: 0,
    ...overrides,
  });

  // =========================================================================
  // TIER 1: DYNAMIC 4 KPI COUNTERS INVARIANTS
  // =========================================================================
  console.log('\n▶ [Tier 1] Dynamic 4 KPI Counters Invariants...');

  await test('[T1.01] Empty list and nullish edge cases return zeroed KPI summary', () => {
    const emptyResult = calculateTasksKpis([], BASE_TODAY);
    assert.deepStrictEqual(emptyResult, { total: 0, overdue: 0, today: 0, completed: 0 });

    // Defensive against null/undefined array input and sparse holes
    const nullishResult = calculateTasksKpis([null as any, undefined as any, {} as any], BASE_TODAY);
    assert.strictEqual(nullishResult.total, 1);
    assert.strictEqual(nullishResult.overdue, 0);
    assert.strictEqual(nullishResult.today, 0);
    assert.strictEqual(nullishResult.completed, 0);
  });

  await test('[T1.02] Deterministic baseline calculation across active, overdue, today, and completed tasks', () => {
    const tasks: FullTaskData[] = [
      makeSampleTask({ id: 't_ov_1', status: 'open', dueDate: '2026-10-01' }), // overdue
      makeSampleTask({ id: 't_ov_2', status: 'in_progress', dueDate: '2026-10-05' }), // overdue
      makeSampleTask({ id: 't_td_1', status: 'open', dueDate: BASE_TODAY }), // today
      makeSampleTask({ id: 't_td_2', status: 'in_progress', dueDate: BASE_TODAY }), // today
      makeSampleTask({ id: 't_fut_1', status: 'open', dueDate: '2026-10-15' }), // future active
      makeSampleTask({ id: 't_done_1', status: 'done', dueDate: '2026-10-01' }), // completed (had past deadline)
      makeSampleTask({ id: 't_done_2', status: 'done', dueDate: BASE_TODAY }), // completed (had today deadline)
      makeSampleTask({ id: 't_canc_1', status: 'cancelled', dueDate: '2026-10-01' }), // cancelled
    ];

    const kpis = calculateTasksKpis(tasks, BASE_TODAY);
    assert.strictEqual(kpis.total, 7, 'Total must count all 7 non-cancelled tasks (active + completed)');
    assert.strictEqual(kpis.overdue, 2, 'Overdue must count strictly non-done open/in_progress tasks with past due dates');
    assert.strictEqual(kpis.today, 2, 'Today must count strictly non-done open/in_progress tasks with today due dates');
    assert.strictEqual(kpis.completed, 2, 'Completed must count all done tasks');
  });

  await test('[T1.03] Invariant: Completed tasks are strictly excluded from overdue and today counters', () => {
    const tasks: FullTaskData[] = [
      makeSampleTask({
        id: 'done_past',
        status: 'done',
        dueDate: '2026-09-15',
        isOverdue: true, // flag might be stale in storage
      }),
      makeSampleTask({
        id: 'done_today',
        status: 'done',
        dueDate: BASE_TODAY,
        dueDateFormatted: 'Сегодня до 12:00',
      }),
    ];

    const kpis = calculateTasksKpis(tasks, BASE_TODAY);
    assert.strictEqual(kpis.total, 2, 'Total includes completed tasks');
    assert.strictEqual(kpis.completed, 2, 'Both tasks are completed');
    assert.strictEqual(kpis.overdue, 0, 'Completed tasks must NEVER be counted in overdue');
    assert.strictEqual(kpis.today, 0, 'Completed tasks must NEVER be counted in today');
  });

  await test('[T1.04] Invariant: Cancelled tasks are completely excluded from all 4 KPI counters', () => {
    const cancelledTasks: FullTaskData[] = [
      makeSampleTask({ id: 'canc_ov', status: 'cancelled', dueDate: '2026-10-01', isOverdue: true }),
      makeSampleTask({ id: 'canc_td', status: 'cancelled', dueDate: BASE_TODAY }),
      makeSampleTask({ id: 'canc_dn', status: 'cancelled', completedAt: '2026-10-08T10:00:00Z' }),
    ];

    const kpis = calculateTasksKpis(cancelledTasks, BASE_TODAY);
    assert.deepStrictEqual(
      kpis,
      { total: 0, overdue: 0, today: 0, completed: 0 },
      'Cancelled tasks must not contribute to any KPI metric'
    );
  });

  await test('[T1.05] Date format resilience: supports ISO dates, timestamps with time component, and text indicators', () => {
    const tasks: FullTaskData[] = [
      // ISO date only
      makeSampleTask({ id: 'iso_date', status: 'open', dueDate: '2026-10-08' }),
      // Full ISO timestamp on today (with time)
      makeSampleTask({ id: 'iso_today_ts', status: 'open', dueDate: '2026-10-08T14:30:00.000Z' }),
      // Past ISO timestamp
      makeSampleTask({ id: 'iso_past_ts', status: 'open', dueDate: '2026-10-07T23:59:59.000Z' }),
      // Future ISO timestamp
      makeSampleTask({ id: 'iso_future_ts', status: 'open', dueDate: '2026-10-09T00:00:01.000Z' }),
      // Russian text indicator in dueDateFormatted
      makeSampleTask({ id: 'txt_today', status: 'open', dueDate: '', dueDateFormatted: 'сегодня в 15:00' }),
      makeSampleTask({ id: 'txt_overdue', status: 'open', dueDate: '2026-10-15', dueDateFormatted: 'Просрочено на 1 день' }),
    ];

    const kpis = calculateTasksKpis(tasks, BASE_TODAY);
    assert.strictEqual(kpis.total, 6);
    assert.strictEqual(kpis.today, 3, 'iso_date + iso_today_ts + txt_today must be in today KPI');
    assert.strictEqual(kpis.overdue, 2, 'iso_past_ts + txt_overdue must be in overdue KPI');
  });

  await test('[T1.06] KPI reactivity simulation under task completion and cancellation', () => {
    const taskA = makeSampleTask({ id: 'react_a', status: 'open', dueDate: '2026-10-05' }); // overdue
    const taskB = makeSampleTask({ id: 'react_b', status: 'open', dueDate: BASE_TODAY }); // today

    const before = calculateTasksKpis([taskA, taskB], BASE_TODAY);
    assert.strictEqual(before.total, 2);
    assert.strictEqual(before.overdue, 1);
    assert.strictEqual(before.today, 1);
    assert.strictEqual(before.completed, 0);

    // Complete taskA
    const completedA: FullTaskData = { ...taskA, status: 'done', completedAt: new Date().toISOString() };
    const afterComplete = calculateTasksKpis([completedA, taskB], BASE_TODAY);
    assert.strictEqual(afterComplete.total, 2, 'Total must remain identical');
    assert.strictEqual(afterComplete.overdue, 0, 'Overdue must decrement by 1');
    assert.strictEqual(afterComplete.today, 1, 'Today remains unchanged');
    assert.strictEqual(afterComplete.completed, 1, 'Completed increments by 1');

    // Cancel taskB
    const cancelledB: FullTaskData = { ...taskB, status: 'cancelled' };
    const afterCancel = calculateTasksKpis([completedA, cancelledB], BASE_TODAY);
    assert.strictEqual(afterCancel.total, 1, 'Total decrements by 1 when task cancelled');
    assert.strictEqual(afterCancel.today, 0, 'Today decrements by 1');
    assert.strictEqual(afterCancel.completed, 1);
  });

  // =========================================================================
  // TIER 2: 3 DIRECTIONAL TABS & MULTI-FILTER INVARIANTS
  // =========================================================================
  console.log('\n▶ [Tier 2] 3 Directional Tabs & Multi-Filter Invariants...');

  await test('[T2.01] Tab "all" returns all non-cancelled tasks regardless of assignee or creator', () => {
    const tasks = [
      makeSampleTask({ id: 'a1', status: 'open', assignedTo: 'Иван', createdByName: 'Ольга' }),
      makeSampleTask({ id: 'a2', status: 'done', assignedTo: 'Мария', createdByName: 'Сергей' }),
      makeSampleTask({ id: 'a3', status: 'cancelled', assignedTo: 'Иван' }),
    ];

    const result = filterTasksByDirection(tasks, 'all');
    assert.strictEqual(result.length, 2, 'Cancelled task must be excluded');
    assert.strictEqual(result[0].id, 'a1');
    assert.strictEqual(result[1].id, 'a2');
  });

  await test('[T2.02] Tab "assigned_to_me" prioritizes assignedToUserId over name to avoid collisions', () => {
    // Two users with distinct IDs: User A (usr_101, "Андрей"), User B (usr_102, "Андрей")
    const tasks = [
      makeSampleTask({ id: 't_me_id', assignedToUserId: 'usr_101', assignedTo: 'Другой Андрей' }),
      makeSampleTask({ id: 't_other_id', assignedToUserId: 'usr_102', assignedTo: 'Андрей Волков' }),
    ];

    const userContext: UserContext = { userId: 'usr_101', userName: 'Андрей Волков' };
    const filtered = filterTasksByDirection(tasks, 'assigned_to_me', userContext);

    assert.strictEqual(filtered.length, 1, 'Must strictly match by assignedToUserId');
    assert.strictEqual(filtered[0].id, 't_me_id');
  });

  await test('[T2.03] Tab "assigned_to_me" falls back to case-insensitive name matching when ID absent', () => {
    const tasks = [
      makeSampleTask({ id: 't_name_match', assignedTo: '  Елена Менеджер  ', assignedToUserId: undefined }),
      makeSampleTask({ id: 't_other', assignedTo: 'Анна Кузнецова', assignedToUserId: undefined }),
    ];

    const userContext: UserContext = { userName: 'елена менеджер' };
    const filtered = filterTasksByDirection(tasks, 'assigned_to_me', userContext);
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].id, 't_name_match');
  });

  await test('[T2.04] Tab "created_by_me" matches by createdByUserId or creator name', () => {
    const tasks = [
      makeSampleTask({ id: 'c_uid', createdByUserId: 'usr_creator_1', createdByName: 'Чужой' }),
      makeSampleTask({ id: 'c_name', createdByUserId: undefined, createdByName: 'Мария Иванова' }),
      makeSampleTask({ id: 'c_creator_alias', createdByUserId: undefined, createdByName: undefined, creator: 'Мария Иванова' }),
      makeSampleTask({ id: 'c_diff', createdByUserId: 'usr_other', createdByName: 'Сергей' }),
    ];

    const ctxById: UserContext = { userId: 'usr_creator_1' };
    assert.strictEqual(filterTasksByDirection(tasks, 'created_by_me', ctxById).length, 1);

    const ctxByName: UserContext = { userName: 'мария иванова' };
    const byName = filterTasksByDirection(tasks, 'created_by_me', ctxByName);
    assert.strictEqual(byName.length, 2);
    assert.strictEqual(byName[0].id, 'c_name');
    assert.strictEqual(byName[1].id, 'c_creator_alias');
  });

  await test('[T2.05] Role isolation invariant: owner-created tasks visible in "created_by_me" ONLY for owner sessions', () => {
    const ownerTask = makeSampleTask({
      id: 'owner_instruction_01',
      title: 'Поручение от директора школы',
      createdByRole: 'owner',
      createdByName: 'Владелец школы',
      createdByUserId: 'usr_owner_main',
      assignedTo: 'Елена Преподаватель',
      assignedToUserId: 'usr_teacher_elena',
    });

    // Session 1: Current user is Owner
    const ownerContext: UserContext = {
      userId: 'usr_owner_main',
      userName: 'Владелец школы',
      role: 'owner',
    };
    const forOwner = filterTasksByDirection([ownerTask], 'created_by_me', ownerContext);
    assert.strictEqual(forOwner.length, 1, 'Owner must see owner-created tasks in "created_by_me"');

    // Session 2: Current user is Teacher Elena
    const teacherContext: UserContext = {
      userId: 'usr_teacher_elena',
      userName: 'Елена Преподаватель',
      role: 'teacher',
    };
    const forTeacher = filterTasksByDirection([ownerTask], 'created_by_me', teacherContext);
    assert.strictEqual(forTeacher.length, 0, 'Teacher must NOT see owner task in "created_by_me"');

    // Elena DOES see it in "assigned_to_me"
    const assignedToTeacher = filterTasksByDirection([ownerTask], 'assigned_to_me', teacherContext);
    assert.strictEqual(assignedToTeacher.length, 1, 'Teacher sees owner task in "assigned_to_me"');
  });

  await test('[T2.06] Self-delegated task appears in both "assigned_to_me" and "created_by_me", but once in "all"', () => {
    const selfTask = makeSampleTask({
      id: 'self_delegated',
      assignedToUserId: 'usr_alex',
      assignedTo: 'Александр',
      createdByUserId: 'usr_alex',
      createdByName: 'Александр',
    });

    const ctx: UserContext = { userId: 'usr_alex', userName: 'Александр' };
    assert.strictEqual(filterTasksByDirection([selfTask], 'assigned_to_me', ctx).length, 1);
    assert.strictEqual(filterTasksByDirection([selfTask], 'created_by_me', ctx).length, 1);
    assert.strictEqual(filterTasksByDirection([selfTask], 'all', ctx).length, 1);
  });

  await test('[T2.07] Priority filter isolates high/medium/low and handles "all"', () => {
    const tasks = [
      makeSampleTask({ id: 'p_hi', priority: 'high' }),
      makeSampleTask({ id: 'p_med', priority: 'medium' }),
      makeSampleTask({ id: 'p_lo', priority: 'low' }),
    ];

    assert.strictEqual(filterTasksByCriteria(tasks, { priority: 'high' }, BASE_TODAY).length, 1);
    assert.strictEqual(filterTasksByCriteria(tasks, { priority: 'medium' }, BASE_TODAY).length, 1);
    assert.strictEqual(filterTasksByCriteria(tasks, { priority: 'low' }, BASE_TODAY).length, 1);
    assert.strictEqual(filterTasksByCriteria(tasks, { priority: 'all' }, BASE_TODAY).length, 3);
  });

  await test('[T2.08] Due date filter isolates today, overdue, and 7-day week window (excluding completed tasks)', () => {
    const tasks = [
      makeSampleTask({ id: 'd_ov_open', status: 'open', dueDate: '2026-10-01' }),
      makeSampleTask({ id: 'd_ov_done', status: 'done', dueDate: '2026-10-01' }), // must be excluded
      makeSampleTask({ id: 'd_td_open', status: 'open', dueDate: BASE_TODAY }),
      makeSampleTask({ id: 'd_td_done', status: 'done', dueDate: BASE_TODAY }), // must be excluded
      makeSampleTask({ id: 'd_wk_open', status: 'open', dueDate: '2026-10-12' }),
      makeSampleTask({ id: 'd_far_open', status: 'open', dueDate: '2026-10-25' }),
    ];

    const overdueOnly = filterTasksByCriteria(tasks, { dueDate: 'overdue' }, BASE_TODAY);
    assert.strictEqual(overdueOnly.length, 1);
    assert.strictEqual(overdueOnly[0].id, 'd_ov_open');

    const todayOnly = filterTasksByCriteria(tasks, { dueDate: 'today' }, BASE_TODAY);
    assert.strictEqual(todayOnly.length, 1);
    assert.strictEqual(todayOnly[0].id, 'd_td_open');

    const weekOnly = filterTasksByCriteria(tasks, { dueDate: 'week' }, BASE_TODAY);
    const weekIds = weekOnly.map((t) => t.id);
    assert.ok(weekIds.includes('d_td_open'));
    assert.ok(weekIds.includes('d_td_done')); // done tasks in week range are included if not filtered out
    assert.ok(weekIds.includes('d_wk_open'));
    assert.ok(!weekIds.includes('d_far_open'));
    assert.ok(!weekIds.includes('d_ov_open'));
  });

  await test('[T2.09] Multi-field search matches title, description, entities, tags, and category', () => {
    const tasks = [
      makeSampleTask({ id: 's1', title: 'Срочный звонок в банк' }),
      makeSampleTask({ id: 's2', description: 'Согласовать скидку на абонемент' }),
      makeSampleTask({ id: 's3', studentName: 'Михаил Соколов' }),
      makeSampleTask({ id: 's4', parentName: 'Екатерина Соколова' }),
      makeSampleTask({ id: 's5', leadName: 'Лид Дмитрий' }),
      makeSampleTask({ id: 's6', tag: 'VIP-Client' }),
      makeSampleTask({ id: 's7', taskType: 'Финансы' }),
    ];

    assert.strictEqual(filterTasksByCriteria(tasks, { searchQuery: 'банк' }, BASE_TODAY).length, 1);
    assert.strictEqual(filterTasksByCriteria(tasks, { searchQuery: 'скидку' }, BASE_TODAY).length, 1);
    assert.strictEqual(filterTasksByCriteria(tasks, { searchQuery: 'соколов' }, BASE_TODAY).length, 2);
    assert.strictEqual(filterTasksByCriteria(tasks, { searchQuery: 'дмитрий' }, BASE_TODAY).length, 1);
    assert.strictEqual(filterTasksByCriteria(tasks, { searchQuery: 'vip-client' }, BASE_TODAY).length, 1);
    assert.strictEqual(filterTasksByCriteria(tasks, { searchQuery: 'финансы' }, BASE_TODAY).length, 1);
  });

  await test('[T2.10] Multi-filter conjunction (Tab + Priority + Due Date + Search query)', () => {
    const target = makeSampleTask({
      id: 'conj_target',
      assignedToUserId: 'usr_me',
      priority: 'high',
      dueDate: BASE_TODAY,
      title: 'Встреча с ключевым партнером',
      status: 'open',
    });

    const wrongTab = makeSampleTask({ ...target, id: 'w_tab', assignedToUserId: 'usr_other' });
    const wrongPrio = makeSampleTask({ ...target, id: 'w_prio', priority: 'low' });
    const wrongDate = makeSampleTask({ ...target, id: 'w_date', dueDate: '2026-10-20' });
    const wrongQuery = makeSampleTask({ ...target, id: 'w_q', title: 'Обычный звонок' });

    const criteria: TaskFilterCriteria = {
      tab: 'assigned_to_me',
      priority: 'high',
      dueDate: 'today',
      searchQuery: 'партнером',
      userContext: { userId: 'usr_me' },
    };

    const result = filterTasksByCriteria([target, wrongTab, wrongPrio, wrongDate, wrongQuery], criteria, BASE_TODAY);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, 'conj_target');
  });

  // =========================================================================
  // TIER 3: TASK COMPLETION WORKFLOW & TIMELINE INTERACTION INVARIANTS
  // =========================================================================
  console.log('\n▶ [Tier 3] Task Completion Workflow & Timeline Interaction Invariants...');

  await test('[T3.01] updateUnifiedTaskStatus captures completedAt, completedByName, and completionResult', async () => {
    const created = await createUnifiedTask({
      title: 'Уточнить посещаемость группы',
      assignedTo: 'Анна Кузнецова',
      skipTimelineInteraction: true,
      notifyAdminInTelegram: false,
    });

    assert.ok(created?.id);

    const completed = await updateUnifiedTaskStatus(created.id, 'done', {
      performedBy: 'Анна Кузнецова',
      performedByUserId: 'usr_anna_10',
      completionResult: 'Все 8 учеников подтвердили присутствие на субботу',
    });

    assert.ok(completed);
    assert.strictEqual(completed.status, 'done');
    assert.strictEqual(completed.completedByName, 'Анна Кузнецова');
    assert.strictEqual(completed.completedBy, 'Анна Кузнецова');
    assert.strictEqual(completed.completedByUserId, 'usr_anna_10');
    assert.strictEqual(completed.completionResult, 'Все 8 учеников подтвердили присутствие на субботу');
    assert.strictEqual(completed.result, 'Все 8 учеников подтвердили присутствие на субботу');
    assert.ok(completed.completedAt, 'completedAt timestamp must be recorded');
    assert.ok(!isNaN(new Date(completed.completedAt!).getTime()), 'completedAt must be valid date');
  });

  await test('[T3.02] Task completion synchronously logs TimelineInteraction with result and cross-entity link', async () => {
    const taskWithStudent = await createUnifiedTask({
      title: 'Контрольный звонок родителю',
      studentId: '1',
      studentName: 'Иван Смирнов',
      assignedTo: 'Менеджер Ольга',
      skipTimelineInteraction: true,
      notifyAdminInTelegram: false,
    });

    await updateUnifiedTaskStatus(taskWithStudent.id, 'done', {
      performedBy: 'Менеджер Ольга',
      completionResult: 'Мама подтвердила оплату курса за октябрь',
    });

    const interactions = getStoredInteractions();
    const completionInteraction = interactions.find(
      (i) => i.studentId === '1' && i.author === 'Менеджер Ольга' && i.result === 'Мама подтвердила оплату курса за октябрь'
    );

    assert.ok(completionInteraction, 'Timeline interaction must be recorded in timeline storage');
    assert.strictEqual(completionInteraction.type, 'status_change');
    assert.strictEqual(completionInteraction.channel, 'other');
    assert.ok(
      completionInteraction.content.includes('Контрольный звонок родителю'),
      'Content must contain task title'
    );
  });

  await test('[T3.03] Empty completion result fallback default is preserved rather than undefined', async () => {
    const task = await createUnifiedTask({
      title: 'Подготовить раздаточные материалы',
      assignedTo: 'Преподаватель',
      skipTimelineInteraction: true,
      notifyAdminInTelegram: false,
    });

    const completed = await updateUnifiedTaskStatus(task.id, 'done', {
      performedBy: 'Преподаватель',
      completionResult: '', // empty input
    });

    assert.ok(completed);
    assert.strictEqual(completed.status, 'done');
    assert.strictEqual(completed.completionResult, 'Задача выполнена', 'Must fallback to default non-empty comment');
    assert.strictEqual(completed.result, 'Задача выполнена');
  });

  await test('[T3.04] Completed task state is durably reflected in taskStorage SSOT', async () => {
    const task = await createUnifiedTask({
      title: 'Проверить баланс кабинета',
      assignedTo: 'Бухгалтер',
      skipTimelineInteraction: true,
      notifyAdminInTelegram: false,
    });

    await updateUnifiedTaskStatus(task.id, 'done', {
      performedBy: 'Бухгалтер Светлана',
      completionResult: 'Сверка завершена, расхождений 0 EUR',
    });

    const storedTasks = await getStoredTasks();
    const stored = storedTasks.find((t) => t.id === task.id);
    assert.ok(stored);
    assert.strictEqual(stored.status, 'done');
    assert.strictEqual(stored.completionResult, 'Сверка завершена, расхождений 0 EUR');
    assert.strictEqual(stored.completedByName, 'Бухгалтер Светлана');
  });

  // =========================================================================
  // TIER 4: LIFECYCLE TRANSITIONS & RETURN TO WORK INVARIANTS
  // =========================================================================
  console.log('\n▶ [Tier 4] Lifecycle Transitions & Return to Work Invariants...');

  await test('[T4.01] "Вернуть в работу" (in_progress) clears all completion fields atomically', async () => {
    const task = await createUnifiedTask({
      title: 'Доработать отчет по посещаемости',
      assignedTo: 'Администратор',
      skipTimelineInteraction: true,
      notifyAdminInTelegram: false,
    });

    // 1. First complete it
    await updateUnifiedTaskStatus(task.id, 'done', {
      performedBy: 'Администратор',
      completionResult: 'Отчет готов',
    });

    // 2. Return to work via in_progress
    const returned = await updateUnifiedTaskStatus(task.id, 'in_progress', {
      performedBy: 'Администратор',
    });

    assert.ok(returned);
    assert.strictEqual(returned.status, 'in_progress');
    assert.strictEqual(returned.completedAt, undefined, 'completedAt must be cleared');
    assert.strictEqual(returned.completedByName, undefined, 'completedByName must be cleared');
    assert.strictEqual(returned.completedBy, undefined, 'completedBy must be cleared');
    assert.strictEqual(returned.completedByUserId, undefined, 'completedByUserId must be cleared');
    assert.strictEqual(returned.completionResult, undefined, 'completionResult must be cleared');
    assert.strictEqual(returned.result, undefined, 'result must be cleared');
  });

  await test('[T4.02] "Вернуть в работу" (open) clears completion fields and restores active KPI counter', async () => {
    const task = await createUnifiedTask({
      title: 'Перезвонить клиенту по расписанию',
      dueDate: BASE_TODAY,
      assignedTo: 'Менеджер',
      skipTimelineInteraction: true,
      notifyAdminInTelegram: false,
    });

    await updateUnifiedTaskStatus(task.id, 'done', {
      performedBy: 'Менеджер',
      completionResult: 'Звонок совершен',
    });

    const returnedOpen = await updateUnifiedTaskStatus(task.id, 'open', {
      performedBy: 'Менеджер',
    });

    assert.ok(returnedOpen);
    assert.strictEqual(returnedOpen.status, 'open');
    assert.strictEqual(returnedOpen.completedAt, undefined);
    assert.strictEqual(returnedOpen.completionResult, undefined);

    // Verify KPI calculation reflects active state
    const kpis = calculateTasksKpis([returnedOpen], BASE_TODAY);
    assert.strictEqual(kpis.total, 1);
    assert.strictEqual(kpis.completed, 0, 'No longer counted in completed');
    assert.strictEqual(kpis.today, 1, 'Restored to today KPI counter');
  });

  await test('[T4.03] Rescheduling increments postponeCount and records rescheduledReason & author', async () => {
    const task = await createUnifiedTask({
      title: 'Консультация по новому курсу',
      dueDate: '2026-10-08',
      assignedTo: 'Анна Менеджер',
      skipTimelineInteraction: true,
      notifyAdminInTelegram: false,
    });

    assert.strictEqual(task.postponeCount, 0);

    // Reschedule 1st time
    const resched1 = await updateUnifiedTaskStatus(task.id, 'open', {
      newDueDate: '2026-10-12',
      rescheduledReason: 'Клиент в отпуске до понедельника',
      performedBy: 'Анна Менеджер',
      performedByUserId: 'usr_anna_1',
    });

    assert.ok(resched1);
    assert.strictEqual(resched1.dueDate, '2026-10-12');
    assert.strictEqual(resched1.rescheduledReason, 'Клиент в отпуске до понедельника');
    assert.strictEqual(resched1.rescheduledBy, 'Анна Менеджер');
    assert.strictEqual(resched1.rescheduledByUserId, 'usr_anna_1');
    assert.strictEqual(resched1.postponeCount, 1);
    assert.ok(resched1.rescheduledAt);

    // Reschedule 2nd time
    const resched2 = await updateUnifiedTaskStatus(task.id, 'open', {
      newDueDate: '2026-10-16',
      rescheduledReason: 'Перенесено по просьбе бабушки',
      performedBy: 'Анна Менеджер',
    });

    assert.ok(resched2);
    assert.strictEqual(resched2.dueDate, '2026-10-16');
    assert.strictEqual(resched2.rescheduledReason, 'Перенесено по просьбе бабушки');
    assert.strictEqual(resched2.postponeCount, 2, 'postponeCount must increment to 2');
  });

  await test('[T4.04] Cancellation excludes task from active status lists and active KPI metrics', async () => {
    const task = await createUnifiedTask({
      title: 'Устаревшая задача для отмены',
      dueDate: BASE_TODAY,
      assignedTo: 'Администратор',
      skipTimelineInteraction: true,
      notifyAdminInTelegram: false,
    });

    const cancelled = await updateUnifiedTaskStatus(task.id, 'cancelled', {
      performedBy: 'Администратор',
    });

    assert.ok(cancelled);
    assert.strictEqual(cancelled.status, 'cancelled');

    // Directional filter should exclude it
    const activeTasks = filterTasksByDirection([cancelled], 'all');
    assert.strictEqual(activeTasks.length, 0);

    // KPI summary should ignore it
    const kpis = calculateTasksKpis([cancelled], BASE_TODAY);
    assert.strictEqual(kpis.total, 0);
  });

  // =========================================================================
  // TIER 5: CANONICAL DEDUPLICATION & PRESENTATION MODEL INVARIANTS
  // =========================================================================
  console.log('\n▶ [Tier 5] Canonical Deduplication & Presentation Model Invariants...');

  await test('[T5.01] deduplicateTasks collapses duplicate IDs while preserving first seen occurrence', () => {
    const tA_v1 = makeSampleTask({ id: 'uniq_1', title: 'Версия 1' });
    const tA_v2 = makeSampleTask({ id: 'uniq_1', title: 'Версия 2 (дубликат)' });
    const tB = makeSampleTask({ id: 'uniq_2', title: 'Вторая задача' });
    const tC = makeSampleTask({ id: 'uniq_3', title: 'Третья задача' });
    const tB_dup = makeSampleTask({ id: 'uniq_2', title: 'Дубликат B' });

    const rawList = [tA_v1, tB, tA_v2, tC, tB_dup];
    const deduped = deduplicateTasks(rawList);

    assert.strictEqual(deduped.length, 3, 'Must collapse 5 items to exactly 3 unique IDs');
    assert.strictEqual(deduped[0].id, 'uniq_1');
    assert.strictEqual(deduped[0].title, 'Версия 1');
    assert.strictEqual(deduped[1].id, 'uniq_2');
    assert.strictEqual(deduped[2].id, 'uniq_3');

    // Mathematical invariant: length matches set of unique IDs
    const idSet = new Set(rawList.map((t) => t.id));
    assert.strictEqual(deduped.length, idSet.size);
  });

  await test('[T5.02] filterAndSortTasks runs deduplication before applying filter and sort', () => {
    const tDup1 = makeSampleTask({ id: 'pipeline_dup', priority: 'high', title: 'Поручение Альфа' });
    const tDup2 = makeSampleTask({ id: 'pipeline_dup', priority: 'high', title: 'Поручение Альфа клон' });

    const result = filterAndSortTasks([tDup1, tDup2], { tab: 'all', priority: 'high' }, BASE_TODAY);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, 'pipeline_dup');
  });

  await test('[T5.03] getCardDateDisplay correctly formats done, overdue, and today badges', () => {
    // 1. Done
    const doneTask = makeSampleTask({ status: 'done', completedAt: '2026-10-02T10:00:00Z' });
    const doneDisplay = getCardDateDisplay(doneTask, BASE_TODAY);
    assert.strictEqual(doneDisplay.badge, 'Выполнено');
    assert.strictEqual(doneDisplay.badgeClass, 'bg-emerald-100 text-emerald-700');
    assert.strictEqual(doneDisplay.isOverdue, false);
    assert.strictEqual(doneDisplay.isToday, false);

    // 2. Overdue
    const overdueTask = makeSampleTask({ status: 'open', dueDate: '2026-10-05', isOverdue: true });
    const overdueDisplay = getCardDateDisplay(overdueTask, BASE_TODAY);
    assert.strictEqual(overdueDisplay.badge, 'Просрочено');
    assert.strictEqual(overdueDisplay.badgeClass, 'bg-rose-100 text-rose-700');
    assert.strictEqual(overdueDisplay.accentBorder, 'border-l-4 border-l-rose-500');
    assert.strictEqual(overdueDisplay.isOverdue, true);

    // 3. Today
    const todayTask = makeSampleTask({ status: 'open', dueDate: BASE_TODAY, dueDateFormatted: 'до 18:00' });
    const todayDisplay = getCardDateDisplay(todayTask, BASE_TODAY);
    assert.strictEqual(todayDisplay.badge, 'Сегодня');
    assert.strictEqual(todayDisplay.badgeClass, 'bg-amber-100 text-amber-800');
    assert.strictEqual(todayDisplay.accentBorder, 'border-l-4 border-l-amber-400');
    assert.strictEqual(todayDisplay.isToday, true);
  });

  await test('[T5.04] getCategoryBadgeStyle matches CRM color psychology palette', () => {
    assert.ok(getCategoryBadgeStyle('Продажи').includes('purple'));
    assert.ok(getCategoryBadgeStyle('Финансы').includes('amber'));
    assert.ok(getCategoryBadgeStyle('Расписание').includes('emerald'));
    assert.ok(getCategoryBadgeStyle('Документы').includes('blue'));
    assert.ok(getCategoryBadgeStyle('Учебная часть').includes('indigo'));
    assert.ok(getCategoryBadgeStyle('Retention').includes('rose'));
    assert.ok(getCategoryBadgeStyle('Прочее').includes('slate'));
  });

  await test('[T5.05] getInitials extracts two uppercase letters with whitespace and edge resilience', () => {
    assert.strictEqual(getInitials('Андрей Волков'), 'АВ');
    assert.strictEqual(getInitials('Иван Сергеевич Петров'), 'ИС');
    assert.strictEqual(getInitials('Елена'), 'ЕЛ');
    assert.strictEqual(getInitials('   Ольга   Смирнова   '), 'ОС');
    assert.strictEqual(getInitials(''), 'АВ');
    assert.strictEqual(getInitials(undefined), 'АВ');
  });

  await test('[T5.06] Sorting modes: priority, date_asc, and created_desc are non-mutating', () => {
    const tasks = [
      makeSampleTask({ id: 's_done', status: 'done', priority: 'high', dueDate: '2026-10-01' }),
      makeSampleTask({ id: 's_low', status: 'open', priority: 'low', dueDate: '2026-10-15' }),
      makeSampleTask({ id: 's_high', status: 'open', priority: 'high', dueDate: '2026-10-15' }),
      makeSampleTask({ id: 's_overdue_med', status: 'open', priority: 'medium', dueDate: '2026-10-05', isOverdue: true }),
    ];

    const inputCopy = [...tasks];
    const sortedByPriority = sortTasks(tasks, 'priority', BASE_TODAY);

    // Verify non-mutation
    assert.strictEqual(tasks[0].id, inputCopy[0].id);

    // Overdue open task must rank before regular open
    assert.strictEqual(sortedByPriority[0].id, 's_overdue_med');
    // Open high next
    assert.strictEqual(sortedByPriority[1].id, 's_high');
    // Open low next
    assert.strictEqual(sortedByPriority[2].id, 's_low');
    // Done task last
    assert.strictEqual(sortedByPriority[3].id, 's_done');

    // Date asc mode
    const sortedByDate = sortTasks(tasks, 'date_asc', BASE_TODAY);
    assert.strictEqual(sortedByDate[0].id, 's_done'); // 2026-10-01
    assert.strictEqual(sortedByDate[1].id, 's_overdue_med'); // 2026-10-05
  });

  console.log('\n===============================================================');
  console.log(`   ✅ ALL SUITE 30 (TS-50) TASKS WORKSPACE INVARIANTS PASSED (${passed} passed)`);
  console.log('===============================================================\n');

  return { passed, failed };
}

if (require.main === module) {
  runSuite30().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
