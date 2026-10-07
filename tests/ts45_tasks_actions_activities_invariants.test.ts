import assert from 'assert';
import { FullTaskData, INITIAL_TASKS, TimelineInteraction } from '../src/lib/data/mockData';
import { getStoredTasks, saveTaskToStorage } from '../src/lib/data/taskStorage';
import { createUnifiedTask, updateUnifiedTaskStatus } from '../src/lib/data/taskManager';
import { getStoredInteractions, saveInteractionToStorage } from '../src/lib/data/timelineStorage';
import { aggregateCockpitData, CockpitActionItem } from '../src/features/dashboard/lib/cockpitPriorityEngine';

export async function runSuite25() {
  console.log('\n===============================================================');
  console.log('   SUITE 25: TS-45 TASKS VS ACTIONS VS ACTIVITIES INVARIANTS   ');
  console.log('   ADR-001 Dual-Model Architectural Invariants & 26 Scenarios  ');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}:`, err?.message || err);
      failed++;
    }
  }

  // ─── SECTION 1: TASK NORMALIZATION & LIFECYCLE METADATA (R1) ─────────────────
  await test('TS45.01: FullTaskData has first-class author & completion metadata fields', () => {
    const sampleTask: FullTaskData = {
      id: 'task_test_01',
      title: 'Связаться с родителем',
      taskType: 'Retention',
      assignedTo: 'Елена Менеджер',
      dueDate: '2026-10-10',
      dueDateFormatted: '10 окт',
      status: 'open',
      priority: 'high',
      description: 'Чистый текст без комментариев',
      createdByRole: 'owner',
      createdByName: 'Директор Центра',
      createdByUserId: 'usr_owner_1',
      postponeCount: 0,
    };

    assert.strictEqual(sampleTask.createdByRole, 'owner');
    assert.strictEqual(sampleTask.createdByName, 'Директор Центра');
    assert.strictEqual(sampleTask.createdByUserId, 'usr_owner_1');
    assert.strictEqual(sampleTask.description?.includes('<!--meta:'), false);
  });

  await test('TS45.02: createUnifiedTask strips legacy HTML comments and populates metadata', async () => {
    const created = await createUnifiedTask({
      title: 'Подготовить отчет',
      description: 'Пожалуйста сделайте отчет<!--meta:createdByRole=owner;createdByName=Иван-->',
      assignedTo: 'Андрей Волков',
      createdByRole: 'owner',
      createdByName: 'Иван Владелец',
      skipTimelineInteraction: true,
      notifyAdminInTelegram: false,
    });

    assert.strictEqual(created.title, 'Подготовить отчет');
    assert.strictEqual(created.createdByRole, 'owner');
    assert.strictEqual(created.createdByName, 'Иван Владелец');
    assert.strictEqual(created.description, 'Пожалуйста сделайте отчет');
    assert.strictEqual(created.description?.includes('<!--'), false);
  });

  await test('TS45.03: updateUnifiedTaskStatus records completion author, timestamp, and result', async () => {
    const task = await createUnifiedTask({
      title: 'Проверить оплату абонемента',
      assignedTo: 'Менеджер Анна',
      skipTimelineInteraction: true,
      notifyAdminInTelegram: false,
    });

    const completed = await updateUnifiedTaskStatus(task.id, 'done', {
      performedBy: 'Менеджер Анна',
      performedByUserId: 'usr_anna_1',
      comment: 'Оплата поступила в полном объеме (240 €)',
    });

    assert.ok(completed, 'Task should be returned');
    assert.strictEqual(completed?.status, 'done');
    assert.strictEqual(completed?.completedByName, 'Менеджер Анна');
    assert.strictEqual(completed?.completedBy, 'Менеджер Анна');
    assert.strictEqual(completed?.completionResult, 'Оплата поступила в полном объеме (240 €)');
    assert.ok(completed?.completedAt, 'completedAt timestamp must be present');
  });

  await test('TS45.04: updateUnifiedTaskStatus rescheduling increments postponeCount and updates dueDate', async () => {
    const task = await createUnifiedTask({
      title: 'Уточнить расписание',
      dueDate: '2026-10-07',
      assignedTo: 'Менеджер Анна',
      skipTimelineInteraction: true,
      notifyAdminInTelegram: false,
    });

    const rescheduled = await updateUnifiedTaskStatus(task.id, 'open', {
      newDueDate: '2026-10-14',
      comment: 'Перенесено по просьбе клиента',
      performedBy: 'Менеджер Анна',
    });

    assert.ok(rescheduled);
    assert.strictEqual(rescheduled?.dueDate, '2026-10-14');
    assert.strictEqual(rescheduled?.rescheduledReason, 'Перенесено по просьбе клиента');
    assert.strictEqual(rescheduled?.rescheduledBy, 'Менеджер Анна');
    assert.strictEqual(rescheduled?.postponeCount, 1);
  });

  // ─── SECTION 2: TIMELINE & ACTIVITY LOGGING (R2) ─────────────────────────────
  await test('TS45.05: Communication interactions recorded to timeline storage with correct channel & type', () => {
    const interaction: TimelineInteraction = {
      id: 'int_test_comm_1',
      studentId: '1',
      studentName: 'Иван Смирнов',
      occurredAt: '07.10.2026, 15:30',
      createdAt: new Date().toISOString(),
      channel: 'whatsapp',
      type: 'follow_up',
      author: 'Администратор',
      content: 'WhatsApp: обращение по вопросу задолженности',
      result: 'Сообщение отправлено клиенту',
    };

    saveInteractionToStorage(interaction);
    const stored = getStoredInteractions();
    const found = stored.find((i) => i.id === 'int_test_comm_1');
    assert.ok(found, 'Interaction must be saved to storage');
    assert.strictEqual(found?.channel, 'whatsapp');
    assert.strictEqual(found?.type, 'follow_up');
  });

  // ─── SECTION 3: COMPUTED NEXT ACTIONS SSOT ENGINE (R3) ───────────────────────
  await test('TS45.06: aggregateCockpitData dynamically calculates prioritized actions without DB action table', () => {
    const mockTasks: FullTaskData[] = [
      {
        id: 't_p1_overdue',
        title: 'Срочный звонок по заявке',
        taskType: 'Продажи',
        assignedTo: 'Елена Менеджер',
        dueDate: '2026-10-01',
        dueDateFormatted: '01 окт',
        status: 'open',
        priority: 'high',
        isOverdue: true,
      },
    ];

    const aggregated = aggregateCockpitData({
      tasks: mockTasks,
      leads: [],
      lessons: [],
      students: [],
      payments: [],
      selectedDate: new Date('2026-10-07T12:00:00Z'),
    });

    assert.ok(aggregated, 'Aggregated result must exist');
    assert.ok(Array.isArray(aggregated.allQueueItems), 'Actions must be an array');
    assert.ok(aggregated.summary.attentionCount >= 0);
    const overdueAction = aggregated.allQueueItems.find((a: CockpitActionItem) => a.sourceId === 't_p1_overdue');
    assert.ok(overdueAction, 'Overdue task must be projected into Action');
    assert.ok(overdueAction?.priority === 'P0' || overdueAction?.priority === 'P1');
  });

  await test('TS45.07: Completed task disappears from active cockpit actions list', () => {
    const mockTasks: FullTaskData[] = [
      {
        id: 't_completed_1',
        title: 'Завершенная задача',
        taskType: 'CRM Сделка',
        assignedTo: 'Елена Менеджер',
        dueDate: '2026-10-07',
        dueDateFormatted: '07 окт',
        status: 'done',
        priority: 'medium',
        completedAt: '2026-10-07T10:00:00Z',
        completedByName: 'Елена Менеджер',
      },
    ];

    const aggregated = aggregateCockpitData({
      tasks: mockTasks,
      leads: [],
      lessons: [],
      students: [],
      payments: [],
      selectedDate: new Date('2026-10-07T12:00:00Z'),
    });

    const activeInCockpit = aggregated.allQueueItems.find((a: CockpitActionItem) => a.sourceId === 't_completed_1');
    assert.strictEqual(activeInCockpit, undefined, 'Completed tasks must not appear in active cockpit actions');
  });

  // ─── SECTION 4: 100% EUR AND NO HARDCODED RUBL INVARIANTS ────────────────────
  await test('TS45.08: Cockpit debt and revenue metrics formatted exclusively in EUR (€)', () => {
    const aggregated = aggregateCockpitData({
      tasks: [],
      leads: [],
      lessons: [],
      students: [],
      payments: [],
      selectedDate: new Date('2026-10-07T12:00:00Z'),
    });

    const serialized = JSON.stringify(aggregated);
    assert.strictEqual(serialized.includes('₽'), false, 'No Russian ruble symbol allowed in Cockpit output');
    assert.strictEqual(serialized.includes('руб'), false, 'No Russian ruble word allowed in Cockpit output');
  });

  console.log(`\nSuite 25 completed: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    throw new Error(`Suite 25 failed with ${failed} failure(s)`);
  }
  return { passed, failed };
}

if (require.main === module) {
  runSuite25().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
