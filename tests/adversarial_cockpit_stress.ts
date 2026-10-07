/**
 * SMART ACADEMY CRM — ADVERSARIAL STRESS TEST SUITE
 * Challenger 1: Empirical Code & Runtime Challenger
 *
 * Scope: Adversarial edge cases and stress testing of:
 * - aggregateCockpitData
 * - filterCockpitItems
 * - sortCockpitItems
 * - Phone and Telegram sanitizers
 * - Boundary dates, missing fields, malformed names, negative amounts, scale fuzzing
 */

import assert from 'node:assert';
import {
  aggregateCockpitData,
  filterCockpitItems,
  sortCockpitItems,
  getFilteredAndSortedItems,
  sanitizePhoneForWhatsApp,
  sanitizeTelegramUsername,
  formatEurAmount,
  isTodayDate,
  isBeforeDate,
  isOverdueDate,
  CockpitActionItem,
  CockpitSSOTParams,
} from '../src/features/dashboard/lib/cockpitPriorityEngine';
import { FullTaskData, FullLeadData, FullLessonData, FullStudentData, FullPaymentData } from '../src/lib/data/mockData';
import { EuropeanInvoiceData } from '../src/lib/data/invoiceStorage';
import { UpcomingPaymentItem } from '../src/lib/data/upcomingPaymentsHelper';

export async function runAdversarialCockpitStressTests() {
  console.log('\n===============================================================');
  console.log('   CHALLENGER 1: ADVERSARIAL COCKPIT STRESS TEST SUITE         ');
  console.log('   Empirical Validation of Invariants, Edge Cases & Fuzzing    ');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ ${name}:`, err.message);
      failed++;
    }
  }

  const mockNow = new Date(2026, 9, 6, 12, 0, 0); // 2026-10-06 12:00:00

  // -------------------------------------------------------------
  // TIER 1: Empty & Minimal Collections Invariants
  // -------------------------------------------------------------
  console.log('\n--- TIER 1: Empty & Minimal Collections Invariants ---');

  test('T1.01: Pure empty collections with all optional fields omitted', () => {
    const res = aggregateCockpitData({
      tasks: [],
      leads: [],
      lessons: [],
      students: [],
      payments: [],
    });

    assert.strictEqual(res.summary.overdueCount, 0);
    assert.strictEqual(res.summary.needsAttentionCount, 0);
    assert.strictEqual(res.summary.tasksTodayCount, 0);
    assert.strictEqual(res.summary.lessonsUnconfirmedCount, 0);
    assert.strictEqual(res.summary.paymentsUnderControlCount, 0);
    assert.strictEqual(res.summary.paymentsAmountEUR, 0);

    // Labels must be non-empty valid Russian descriptions
    assert.ok(res.summary.overdueLabel.includes('Всё в графике') || res.summary.overdueLabel.includes('0'));
    assert.ok(res.summary.needsAttentionLabel.includes('Сбоев нет') || res.summary.needsAttentionLabel.includes('0'));
    assert.ok(res.summary.tasksTodayLabel.includes('План закрыт') || res.summary.tasksTodayLabel.includes('0'));
    assert.ok(res.summary.lessonsUnconfirmedLabel.includes('Всё подтверждено') || res.summary.lessonsUnconfirmedLabel.includes('0'));
    assert.ok(res.summary.paymentsUnderControlLabel.includes('Все счета закрыты') || res.summary.paymentsUnderControlLabel.includes('0'));

    // Queues must be empty
    assert.strictEqual(res.overdueItems.length, 0);
    assert.strictEqual(res.needsAttentionItems.length, 0);
    assert.strictEqual(res.todayItems.length, 0);
    assert.strictEqual(res.postponableItems.length, 0);
    assert.strictEqual(res.allQueueItems.length, 0);

    // Widgets must be all 0
    assert.strictEqual(res.widgets.leadsWidget.totalActiveLeads, 0);
    assert.strictEqual(res.widgets.trialsWidget.totalTrials, 0);
    assert.strictEqual(res.widgets.paymentsWidget.totalControlEUR, 0);
    assert.strictEqual(res.widgets.scheduleWidget.totalTodayLessons, 0);
    assert.strictEqual(res.widgets.confirmationsWidget.totalTodayLessons, 0);

    // Tab counts must be all 0
    for (const [tab, count] of Object.entries(res.tabCounts)) {
      assert.strictEqual(count, 0, `Tab ${tab} count must be 0`);
    }
  });

  test('T1.02: Sparse collections: only lessons exist, no students/tasks/leads', () => {
    const lesson: FullLessonData = {
      id: 'les_sparse_1',
      title: 'Математика ОГЭ',
      date: '2026-10-06',
      startTime: '16:00',
      endTime: '17:30',
      teacherName: 'Анна Васильева',
      status: 'scheduled',
      students: [],
    } as any;

    const res = aggregateCockpitData({
      tasks: [],
      leads: [],
      lessons: [lesson],
      students: [],
      payments: [],
      nowDate: mockNow,
      selectedDate: mockNow,
    });

    assert.strictEqual(res.summary.todayLessonsCount, 1);
    assert.strictEqual(res.summary.lessonsUnconfirmedCount, 1, 'Empty students array means unconfirmed attendance');
    assert.strictEqual(res.widgets.scheduleWidget.scheduled, 1);
    assert.strictEqual(res.widgets.confirmationsWidget.unconfirmed, 1);
  });

  test('T1.03: Incomplete entity objects with missing optional properties', () => {
    const rawTask: any = { id: 't_raw_1', title: 'Bare task' };
    const rawLead: any = { id: 'l_raw_1', name: 'Bare lead', status: 'new' };
    const rawStudent: any = { id: 's_raw_1', firstName: 'Bare' };
    const rawPayment: any = { id: 'p_raw_1', status: 'completed' };

    // Should not throw or crash
    const res = aggregateCockpitData({
      tasks: [rawTask],
      leads: [rawLead],
      lessons: [],
      students: [rawStudent],
      payments: [rawPayment],
      nowDate: mockNow,
    });

    assert.ok(res !== null);
    assert.strictEqual(typeof res.summary.overdueCount, 'number');
  });

  // -------------------------------------------------------------
  // TIER 2: Boundary & Malformed Dates Stress
  // -------------------------------------------------------------
  console.log('\n--- TIER 2: Boundary & Malformed Dates Stress ---');

  test('T2.01: Malformed and corrupted date strings in isTodayDate, isBeforeDate, isOverdueDate', () => {
    const invalidDates = [
      '',
      '   ',
      'invalid-date',
      '99.99.9999',
      '2026-02-31',
      '2026-13-40',
      'undefined',
      'null',
      '0000-00-00',
      'abc-def-ghi',
      '2026/10/06', // slash format
      '2026-10-06T25:70:99Z',
    ];

    for (const d of invalidDates) {
      assert.doesNotThrow(() => isTodayDate(d, mockNow), `isTodayDate crashed on "${d}"`);
      assert.doesNotThrow(() => isBeforeDate(d, mockNow), `isBeforeDate crashed on "${d}"`);
      assert.doesNotThrow(() => isOverdueDate(d, mockNow), `isOverdueDate crashed on "${d}"`);
    }

    assert.strictEqual(isTodayDate('', mockNow), false);
    assert.strictEqual(isTodayDate(undefined, mockNow), false);
    assert.strictEqual(isBeforeDate('', mockNow), false);
    assert.strictEqual(isBeforeDate(undefined, mockNow), false);
    assert.strictEqual(isOverdueDate('', mockNow), false);
    assert.strictEqual(isOverdueDate(undefined, mockNow), false);
  });

  test('T2.02: Boundary dates: Leap year and year boundaries', () => {
    const leapDate = new Date(2024, 1, 29); // 2024-02-29
    assert.strictEqual(isTodayDate('2024-02-29', leapDate), true);
    assert.strictEqual(isTodayDate('29.02.2024', leapDate), true);
    assert.strictEqual(isBeforeDate('2024-02-28', leapDate), true);
    assert.strictEqual(isBeforeDate('2024-03-01', leapDate), false);

    // Year boundary
    const newYear = new Date(2027, 0, 1); // 2027-01-01
    assert.strictEqual(isBeforeDate('2026-12-31', newYear), true);
    assert.strictEqual(isBeforeDate('31.12.2026', newYear), true);
    assert.strictEqual(isBeforeDate('2027-01-02', newYear), false);
  });

  test('T2.03: Tasks and invoices with malformed dates do not break aggregation', () => {
    const taskWithBadDate: FullTaskData = {
      id: 'task_bad_date',
      title: 'Bad date task',
      status: 'open',
      priority: 'high',
      dueDate: 'not-a-real-date',
    } as any;

    const invoiceWithBadDate: EuropeanInvoiceData = {
      id: 'inv_bad_date',
      invoiceNumber: 999999,
      variableSymbol: '999999',
      issueDate: '99.99.9999',
      dueDate: 'invalid',
      studentId: 'st_1',
      studentName: 'Test',
      totalAmountEUR: 100,
      status: 'pending',
      currency: 'EUR',
    } as any;

    const res = aggregateCockpitData({
      tasks: [taskWithBadDate],
      leads: [],
      lessons: [],
      students: [],
      payments: [],
      invoices: [invoiceWithBadDate],
      nowDate: mockNow,
    });

    assert.ok(res.summary.overdueCount >= 0);
  });

  // -------------------------------------------------------------
  // TIER 3: Malformed Names, Unicode & Contact Sanitization
  // -------------------------------------------------------------
  console.log('\n--- TIER 3: Malformed Names, Unicode & Contact Sanitization ---');

  test('T3.01: sanitizePhoneForWhatsApp handles null, non-digits, international formats', () => {
    assert.strictEqual(sanitizePhoneForWhatsApp(undefined), '');
    assert.strictEqual(sanitizePhoneForWhatsApp(''), '');
    assert.strictEqual(sanitizePhoneForWhatsApp('   '), '');
    assert.strictEqual(sanitizePhoneForWhatsApp('no digits here'), '');
    assert.strictEqual(sanitizePhoneForWhatsApp('+7 (999) 123-45-67'), '79991234567');
    assert.strictEqual(sanitizePhoneForWhatsApp('89991234567'), '79991234567');
    assert.strictEqual(sanitizePhoneForWhatsApp('+49 151 23456789'), '4915123456789');
    assert.strictEqual(sanitizePhoneForWhatsApp('+421 905 123 456'), '421905123456');
    assert.strictEqual(sanitizePhoneForWhatsApp('123'), '123');
  });

  test('T3.02: sanitizeTelegramUsername strips @, URLs, trailing slashes, spaces', () => {
    assert.strictEqual(sanitizeTelegramUsername(undefined), '');
    assert.strictEqual(sanitizeTelegramUsername(''), '');
    assert.strictEqual(sanitizeTelegramUsername('   '), '');
    assert.strictEqual(sanitizeTelegramUsername('@alex_sm'), 'alex_sm');
    assert.strictEqual(sanitizeTelegramUsername('https://t.me/alex_sm'), 'alex_sm');
    assert.strictEqual(sanitizeTelegramUsername('http://t.me/alex_sm'), 'alex_sm');
    assert.strictEqual(sanitizeTelegramUsername('telegram.me/alex_sm'), 'alex_sm');
    assert.strictEqual(sanitizeTelegramUsername('t.me/@alex_sm'), 'alex_sm');
    assert.strictEqual(sanitizeTelegramUsername('  @alex_sm  '), 'alex_sm');
  });

  test('T3.03: Malformed names and unicode emojis in entities', () => {
    const weirdLead: FullLeadData = {
      id: 'lead_emoji',
      name: '🎉 Иван 🚀 Смирнов-Кузнецов 🧑‍🎓',
      status: 'new',
      contact: '+7 (999) 000-11-22',
      telegram: '@ivan_🚀',
      createdAt: '2026-10-01T10:00:00.000Z',
    } as any;

    const res = aggregateCockpitData({
      tasks: [],
      leads: [weirdLead],
      lessons: [],
      students: [],
      payments: [],
      nowDate: mockNow,
    });

    assert.strictEqual(res.overdueItems.length, 1);
    assert.ok(res.overdueItems[0].title.includes('🎉 Иван 🚀'));
    assert.strictEqual(res.overdueItems[0].canWhatsApp, true);
    assert.strictEqual(res.overdueItems[0].canTelegram, true);
  });

  // -------------------------------------------------------------
  // TIER 4: Negative, Fractional, Extreme Amounts & Currency Purity
  // -------------------------------------------------------------
  console.log('\n--- TIER 4: Negative, Fractional, Extreme Amounts & Currency Purity ---');

  test('T4.01: Negative student balances and debt calculations', () => {
    const studentNegativeBalance: FullStudentData = {
      id: 'st_neg_1',
      firstName: 'Олег',
      lastName: 'Попов',
      status: 'active',
      finance: { balance: -250, currency: 'EUR' },
    } as any;

    const todayLesson: FullLessonData = {
      id: 'les_neg_1',
      title: 'Python Pro',
      date: '2026-10-06',
      startTime: '15:00',
      status: 'scheduled',
      teacherName: 'Иван Учитель',
      students: [{ id: 'st_neg_1', name: 'Олег Попов' } as any],
    } as any;

    const res = aggregateCockpitData({
      tasks: [],
      leads: [],
      lessons: [todayLesson],
      students: [studentNegativeBalance],
      payments: [],
      nowDate: mockNow,
      selectedDate: mockNow,
    });

    // Debt must be positive 250 € (Math.abs of negative balance)
    assert.strictEqual(res.summary.needsAttentionCount, 1);
    const item = res.needsAttentionItems.find((i) => i.studentId === 'st_neg_1');
    assert.ok(item !== undefined);
    assert.strictEqual(item!.debtAmount, 250);
    assert.ok(item!.debtFormatted?.includes('250 €'));
    assert.ok(!item!.debtFormatted?.includes('-250'));
  });

  test('T4.02: formatEurAmount handles fractional, zero, and large numbers cleanly', () => {
    assert.strictEqual(formatEurAmount(0), '0 €');
    assert.strictEqual(formatEurAmount(-0), '0 €');
    assert.strictEqual(formatEurAmount(99.4), '99 €');
    assert.strictEqual(formatEurAmount(99.6), '100 €');
    assert.strictEqual(formatEurAmount(1500), '1 500 €');
    assert.strictEqual(formatEurAmount(1000000), '1 000 000 €');
  });

  test('T4.03: 100% Currency purity across all aggregated queues and summary', () => {
    const invoice: EuropeanInvoiceData = {
      id: 'inv_cur_1',
      invoiceNumber: 1001,
      variableSymbol: '1001',
      issueDate: '01.10.2026',
      dueDate: '04.10.2026',
      studentId: 'st_1',
      studentName: 'Анна',
      totalAmountEUR: 320,
      status: 'overdue',
      currency: 'EUR',
    } as any;

    const res = aggregateCockpitData({
      tasks: [],
      leads: [],
      lessons: [],
      students: [],
      payments: [],
      invoices: [invoice],
      nowDate: mockNow,
    });

    const jsonStr = JSON.stringify(res);
    assert.strictEqual(jsonStr.includes('₽'), false, 'Engine output must contain 0 ruble symbols');
    assert.strictEqual(jsonStr.toLowerCase().includes('руб'), false, 'Engine output must contain 0 ruble words');
  });

  test('T4.04: Pending non-overdue invoice does not block student with lesson today', () => {
    const studentWithPendingInv: FullStudentData = {
      id: 'st_pending_1',
      firstName: 'Дмитрий',
      lastName: 'Смирнов',
      status: 'active',
      finance: { balance: 0, currency: 'EUR' },
    } as any;

    const todayLesson: FullLessonData = {
      id: 'les_pending_1',
      title: 'Math',
      date: '2026-10-06',
      startTime: '16:00',
      status: 'scheduled',
      teacherName: 'Елена Учитель',
      students: [{ id: 'st_pending_1', name: 'Дмитрий Смирнов' } as any],
    } as any;

    // Due date is in the future (2026-10-20)
    const futurePendingInvoice: EuropeanInvoiceData = {
      id: 'inv_future_1',
      invoiceNumber: 5001,
      variableSymbol: '5001',
      issueDate: '01.10.2026',
      dueDate: '20.10.2026',
      studentId: 'st_pending_1',
      studentName: 'Дмитрий Смирнов',
      totalAmountEUR: 300,
      status: 'pending',
      currency: 'EUR',
    } as any;

    const res = aggregateCockpitData({
      tasks: [],
      leads: [],
      lessons: [todayLesson],
      students: [studentWithPendingInv],
      invoices: [futurePendingInvoice],
      payments: [],
      nowDate: mockNow,
      selectedDate: mockNow,
    });

    // Student should NOT have P0 debt blocking admission
    const debtItem = res.needsAttentionItems.find((i) => i.studentId === 'st_pending_1' && i.badgeText?.includes('не допущен'));
    assert.strictEqual(debtItem, undefined, 'Future pending invoice must not block student admission');
  });

  // -------------------------------------------------------------
  // TIER 5: filterCockpitItems Adversarial Edge Cases
  // -------------------------------------------------------------
  console.log('\n--- TIER 5: filterCockpitItems Adversarial Edge Cases ---');

  test('T5.01: filterCockpitItems with empty array on all tabs and unknown tabs', () => {
    const tabs = ['all', 'overdue', 'attention', 'today', 'leads', 'trials', 'payments', 'lessons', 'messages', 'unknown_tab', '', '__proto__'];
    for (const t of tabs) {
      const filtered = filterCockpitItems([], t);
      assert.deepStrictEqual(filtered, []);
    }
  });

  test('T5.02: filterCockpitItems preserves input array immutability', () => {
    const sampleItems: CockpitActionItem[] = [
      { id: '1', sourceEntity: 'task', sourceId: 't1', priority: 'P1', category: 'Продажи · Лиды', title: 'Лид 1', blockType: 'overdue' },
      { id: '2', sourceEntity: 'task', sourceId: 't2', priority: 'P2', category: 'Календарь · Занятия', title: 'Урок 1', blockType: 'today' },
    ];
    const clone = [...sampleItems];
    filterCockpitItems(sampleItems, 'overdue');
    assert.deepStrictEqual(sampleItems, clone, 'Original items array must not be mutated');
  });

  test('T5.03: filterCockpitItems with bare items missing all string fields', () => {
    const bareItem: CockpitActionItem = {
      id: 'bare_1',
      sourceEntity: 'task',
      sourceId: 't_bare',
      priority: 'P2',
      category: '',
      title: '',
    };
    // Should not throw TypeError on toLowerCase()
    assert.doesNotThrow(() => filterCockpitItems([bareItem], 'leads'));
    assert.doesNotThrow(() => filterCockpitItems([bareItem], 'trials'));
    assert.doesNotThrow(() => filterCockpitItems([bareItem], 'payments'));
    assert.doesNotThrow(() => filterCockpitItems([bareItem], 'lessons'));
    assert.doesNotThrow(() => filterCockpitItems([bareItem], 'messages'));
    assert.doesNotThrow(() => filterCockpitItems([bareItem], 'overdue'));
    assert.doesNotThrow(() => filterCockpitItems([bareItem], 'attention'));
  });

  test('T5.04: filterCockpitItems Russian tab aliases fallback safely', () => {
    const item: CockpitActionItem = {
      id: '1',
      sourceEntity: 'task',
      sourceId: 't1',
      priority: 'P1',
      category: 'Продажи · Лиды',
      title: 'Лид 1',
      blockType: 'overdue',
    };
    // normalizeTabKey maps unknown to fallback or handled gracefully
    const resAll = filterCockpitItems([item], 'все');
    assert.strictEqual(resAll.length, 1);
  });

  // -------------------------------------------------------------
  // TIER 6: sortCockpitItems Adversarial Edge Cases
  // -------------------------------------------------------------
  console.log('\n--- TIER 6: sortCockpitItems Adversarial Edge Cases ---');

  test('T6.01: sortCockpitItems empty array and single-item array', () => {
    assert.deepStrictEqual(sortCockpitItems([], 'priority'), []);
    assert.deepStrictEqual(sortCockpitItems([], 'time'), []);
    assert.deepStrictEqual(sortCockpitItems([], 'client'), []);

    const single: CockpitActionItem[] = [{ id: '1', sourceEntity: 'task', sourceId: 't1', priority: 'P1', category: 'test', title: 'Single' }];
    assert.deepStrictEqual(sortCockpitItems(single, 'priority'), single);
    assert.deepStrictEqual(sortCockpitItems(single, 'time'), single);
    assert.deepStrictEqual(sortCockpitItems(single, 'client'), single);
  });

  test('T6.02: sortCockpitItems input immutability', () => {
    const items: CockpitActionItem[] = [
      { id: 'b', sourceEntity: 'task', sourceId: 'tb', priority: 'P2', category: '', title: 'B', studentName: 'Борис' },
      { id: 'a', sourceEntity: 'task', sourceId: 'ta', priority: 'P1', category: '', title: 'A', studentName: 'Анна' },
    ];
    const originalFirstId = items[0].id;
    const sorted = sortCockpitItems(items, 'priority');
    assert.strictEqual(items[0].id, originalFirstId, 'Original array order must be untouched');
    assert.strictEqual(sorted[0].id, 'a');
  });

  test('T6.03: sort by "client" handles missing names, whitespace, Russian and Latin', () => {
    const items: CockpitActionItem[] = [
      { id: '1', sourceEntity: 'task', sourceId: 't1', priority: 'P1', category: '', title: '1', studentName: 'Ярослав' },
      { id: '2', sourceEntity: 'task', sourceId: 't2', priority: 'P1', category: '', title: '2', studentName: undefined, leadName: undefined },
      { id: '3', sourceEntity: 'task', sourceId: 't3', priority: 'P1', category: '', title: '3', leadName: 'Анна' },
      { id: '4', sourceEntity: 'task', sourceId: 't4', priority: 'P1', category: '', title: '4', parentName: 'Борис' },
      { id: '5', sourceEntity: 'task', sourceId: 't5', priority: 'P1', category: '', title: '5', studentName: '   ' },
    ];

    const sorted = sortCockpitItems(items, 'client');
    const sortedNames = sorted.map((i) => (i.studentName || i.leadName || i.parentName || '').trim());
    // Named items must come before empty/whitespace items
    assert.strictEqual(sortedNames[0], 'Анна');
    assert.strictEqual(sortedNames[1], 'Борис');
    assert.strictEqual(sortedNames[2], 'Ярослав');
    assert.strictEqual(sortedNames[3], '');
    assert.strictEqual(sortedNames[4], '');
  });

  test('T6.04: sort by "time" handles overdue precedence and missing times', () => {
    const items: CockpitActionItem[] = [
      { id: '1', sourceEntity: 'task', sourceId: 't1', priority: 'P2', category: '', title: '1', blockType: 'today', timelineTime: '15:00' },
      { id: '2', sourceEntity: 'task', sourceId: 't2', priority: 'P1', category: '', title: '2', blockType: 'overdue' },
      { id: '3', sourceEntity: 'task', sourceId: 't3', priority: 'P2', category: '', title: '3', blockType: 'today', timelineTime: '10:00' },
      { id: '4', sourceEntity: 'task', sourceId: 't4', priority: 'P2', category: '', title: '4', blockType: 'today' }, // no time
      { id: '5', sourceEntity: 'task', sourceId: 't5', priority: 'P2', category: '', title: '5', blockType: 'today', timelineTime: '9:00' }, // single digit hour
    ];

    const sorted = sortCockpitItems(items, 'time');
    assert.strictEqual(sorted[0].id, '2', 'Overdue item must be first');
    assert.strictEqual(sorted[1].id, '5', '9:00 must come before 10:00');
    assert.strictEqual(sorted[2].id, '3', '10:00 must come before 15:00');
    assert.strictEqual(sorted[3].id, '1', '15:00 must come after 10:00');
    assert.strictEqual(sorted[4].id, '4', 'Items with no time come last');
  });

  test('T6.05: sort by "priority" with unknown priorities falls back gracefully', () => {
    const items: CockpitActionItem[] = [
      { id: '1', sourceEntity: 'task', sourceId: 't1', priority: 'P3', category: '', title: '1' },
      { id: '2', sourceEntity: 'task', sourceId: 't2', priority: 'P0', category: '', title: '2' },
      { id: '3', sourceEntity: 'task', sourceId: 't3', priority: 'UNKNOWN' as any, category: '', title: '3' },
      { id: '4', sourceEntity: 'task', sourceId: 't4', priority: 'P1', category: '', title: '4' },
    ];

    const sorted = sortCockpitItems(items, 'priority');
    assert.strictEqual(sorted[0].priority, 'P0');
    assert.strictEqual(sorted[1].priority, 'P1');
    assert.strictEqual(sorted[2].priority, 'P3');
    assert.strictEqual(sorted[3].priority, 'UNKNOWN' as any);
  });

  // -------------------------------------------------------------
  // TIER 7: High-Volume Fuzzing & Stress Benchmark (6,000 Entities)
  // -------------------------------------------------------------
  console.log('\n--- TIER 7: High-Volume Fuzzing & Stress Benchmark ---');

  test('T7.01: Aggregation and sorting under high load (6,000 mixed entities)', () => {
    const bigTasks: FullTaskData[] = [];
    const bigLeads: FullLeadData[] = [];
    const bigLessons: FullLessonData[] = [];
    const bigStudents: FullStudentData[] = [];
    const bigPayments: FullPaymentData[] = [];
    const bigInvoices: EuropeanInvoiceData[] = [];

    const statuses = ['open', 'done', 'cancelled'];
    const priorities = ['low', 'medium', 'high'];

    for (let i = 0; i < 1000; i++) {
      bigTasks.push({
        id: `fuzz_task_${i}`,
        title: `Task #${i}`,
        status: statuses[i % statuses.length],
        priority: priorities[i % priorities.length],
        dueDate: i % 3 === 0 ? '2026-10-04' : '2026-10-06',
        studentName: i % 2 === 0 ? `Student ${i}` : undefined,
      } as any);

      bigLeads.push({
        id: `fuzz_lead_${i}`,
        name: `Lead ${i}`,
        status: i % 4 === 0 ? 'new' : 'contacted',
        createdAt: '2026-10-01T10:00:00.000Z',
        contact: `+7 999 000 ${String(i).padStart(4, '0')}`,
      } as any);

      bigLessons.push({
        id: `fuzz_lesson_${i}`,
        title: `Lesson ${i}`,
        date: '2026-10-06',
        startTime: `${String((i % 12) + 9).padStart(2, '0')}:00`,
        status: i % 5 === 0 ? 'cancelled' : 'scheduled',
        teacherName: i % 6 === 0 ? 'Не назначен' : `Teacher ${i % 10}`,
        students: [{ id: `fuzz_student_${i % 100}`, name: `Student ${i % 100}` } as any],
      } as any);

      bigStudents.push({
        id: `fuzz_student_${i}`,
        firstName: `First${i}`,
        lastName: `Last${i}`,
        status: 'active',
        finance: { balance: i % 10 === 0 ? -120 : 50, currency: 'EUR' },
      } as any);

      bigPayments.push({
        id: `fuzz_pay_${i}`,
        amount: (i * 15) % 300,
        status: i % 7 === 0 ? 'overdue' : 'completed',
        studentId: `fuzz_student_${i}`,
        currency: 'EUR',
      } as any);

      bigInvoices.push({
        id: `fuzz_inv_${i}`,
        invoiceNumber: 10000 + i,
        variableSymbol: String(10000 + i),
        studentId: `fuzz_student_${i}`,
        studentName: `First${i} Last${i}`,
        totalAmountEUR: (i * 20) % 400,
        status: i % 8 === 0 ? 'overdue' : 'paid',
        dueDate: '01.10.2026',
        currency: 'EUR',
      } as any);
    }

    const t0 = Date.now();
    const res = aggregateCockpitData({
      tasks: bigTasks,
      leads: bigLeads,
      lessons: bigLessons,
      students: bigStudents,
      payments: bigPayments,
      invoices: bigInvoices,
      nowDate: mockNow,
      selectedDate: mockNow,
    });
    const aggDuration = Date.now() - t0;

    assert.ok(res.allQueueItems.length > 0);

    const t1 = Date.now();
    for (const tab of ['all', 'overdue', 'attention', 'today', 'leads', 'trials', 'payments', 'lessons', 'messages']) {
      const filtered = filterCockpitItems(res.allQueueItems, tab);
      sortCockpitItems(filtered, 'priority');
      sortCockpitItems(filtered, 'time');
      sortCockpitItems(filtered, 'client');
    }
    const filterSortDuration = Date.now() - t1;

    console.log(`     [Benchmark] Aggregated 6,000 entities in ${aggDuration}ms`);
    console.log(`     [Benchmark] Filtered 9 tabs x 3 sorts in ${filterSortDuration}ms`);

    assert.ok(aggDuration < 500, `Aggregation should complete under 500ms (took ${aggDuration}ms)`);
    assert.ok(filterSortDuration < 500, `Filtering & sorting should complete under 500ms (took ${filterSortDuration}ms)`);
  });

  console.log('\n===============================================================');
  console.log(`   ADVERSARIAL STRESS SUITE RESULT: ${passed} passed, ${failed} failed`);
  console.log('===============================================================');

  if (failed > 0) {
    throw new Error(`Adversarial stress test suite failed with ${failed} failures`);
  }
}
