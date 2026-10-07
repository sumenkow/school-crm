/**
 * SMART ACADEMY CRM — SUITE 24: SITUATIONAL COMMAND CENTER DASHBOARD (TS-44)
 *
 * Scope: Verification of Situational Command Center «Мой день» (/dashboard / AdminDashboardView.tsx)
 * Validates:
 * - Tier 1: Dynamic calculation of 5 KPI metrics (Overdue, Needs Attention, Tasks Today, Lessons Unconfirmed, Payments under Control) + Zero Mock Data Ban (0 with positive label when empty).
 * - Tier 2: Filtering by 9 horizontal tabs with dynamic count badges (Все, Просрочено, Требуют внимания, Сегодня, Лиды, Пробные, Оплаты, Уроки, Сообщения).
 * - Tier 3: 3-mode sorting logic (По приоритету ∨, По времени / дедлайну, По клиенту).
 * - Tier 4: Accordion state handling & queue aggregation (Block 1 🔴 Просрочено, Block 2 🟠 Требуют внимания сейчас, Block 3 🔵 Задачи на сегодня).
 * - Tier 5: Right column 5 operational mini-widgets data aggregation (Leads, Trials, Payments in EUR, Schedule today, Lesson confirmations).
 * - Tier 6: Action handlers + Zero New Entities + 100% pure EUR (€) currency validation.
 */

import assert from 'node:assert';
import { runAdversarialCockpitStressTests } from './adversarial_cockpit_stress';
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
} from '../src/features/dashboard/lib/cockpitPriorityEngine';
import { FullTaskData, FullLeadData, FullLessonData, FullStudentData, FullPaymentData } from '../src/lib/data/mockData';
import { EuropeanInvoiceData } from '../src/lib/data/invoiceStorage';
import { UpcomingPaymentItem } from '../src/lib/data/upcomingPaymentsHelper';

export async function runSuite24() {
  console.log('\n===============================================================');
  console.log('   SUITE 24: SITUATIONAL COMMAND CENTER DASHBOARD (TS-44)      ');
  console.log('   6-Tier Verification of Dynamic SSOT Engine & Command Desk   ');
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

  const mockDate = new Date(2026, 9, 6, 11, 25, 0); // 2026-10-06 11:25:00

  // -------------------------------------------------------------
  // TIER 1: Dynamic Calculation of 5 KPI Metrics & Zero Mock Data Ban
  // -------------------------------------------------------------
  console.log('\n--- TIER 1: Dynamic Calculation of 5 KPI Metrics & Mock Data Ban ---');

  test('T1.01: Metric 1 🔴 [X] просрочено sums overdue tasks, overdue invoices/payments, and stuck leads', () => {
    const overdueTask: FullTaskData = {
      id: 'task_overdue_1',
      title: 'Сверить кассу за прошлый месяц',
      status: 'open',
      priority: 'high',
      dueDate: '2026-10-04', // past
    } as any;

    const overdueInvoice: EuropeanInvoiceData = {
      id: 'inv_overdue_1',
      invoiceNumber: 20260401,
      variableSymbol: '20260401',
      issueDate: '20.09.2026',
      dueDate: '01.10.2026', // past
      studentId: 'st_99',
      studentName: 'Максим Громов',
      totalAmountEUR: 160,
      status: 'overdue',
      currency: 'EUR',
    } as any;

    const stuckLead: FullLeadData = {
      id: 'lead_stuck_1',
      name: 'Ольга Васильева',
      status: 'new',
      contact: '+7 911 222-33-44',
      createdAt: '2026-10-03T10:00:00.000Z', // > 24h ago
    } as any;

    const res = aggregateCockpitData({
      tasks: [overdueTask],
      leads: [stuckLead],
      lessons: [],
      students: [],
      payments: [],
      invoices: [overdueInvoice],
      nowDate: mockDate,
    });

    assert.strictEqual(res.summary.overdueCount, 3, 'Must sum 1 task + 1 invoice + 1 stuck lead');
    assert.ok(res.summary.overdueLabel.includes('3 просрочено'), 'Label must dynamically reflect count');
    assert.strictEqual(res.overdueItems.length, 3, 'overdueItems queue must contain all 3 items');
  });

  test('T1.02: Metric 2 🟠 [X] требуют внимания sums debt before today lesson, disrupted lessons, completed trials, and message inquiries', () => {
    const studentWithDebt: FullStudentData = {
      id: 'st_debt_1',
      firstName: 'Даниил',
      lastName: 'Калинин',
      status: 'active',
      finance: { balance: -95, currency: 'EUR' },
    } as any;

    const todayLesson: FullLessonData = {
      id: 'lesson_today_1',
      title: 'Робототехника Advanced',
      date: '2026-10-06',
      startTime: '14:00',
      endTime: '15:30',
      teacherName: 'Игорь Семенов',
      status: 'scheduled',
      students: [{ id: 'st_debt_1', name: 'Даниил Калинин', status: 'not_marked' }],
    } as any;

    const cancelledLesson: FullLessonData = {
      id: 'lesson_cancelled_1',
      title: 'Шахматы Начальный уровень',
      date: '2026-10-06',
      startTime: '16:00',
      status: 'cancelled',
      teacherName: 'Не назначен',
    } as any;

    const completedTrial: FullLessonData = {
      id: 'trial_done_1',
      title: 'Пробный урок: Python Junior',
      date: '2026-10-06',
      startTime: '10:00',
      status: 'completed',
      type: 'trial',
      teacherName: 'Сергей Попов',
    } as any;

    const messageTask: FullTaskData = {
      id: 'task_msg_1',
      title: 'Запрос на перенос занятия от мамы Ивана',
      status: 'open',
      priority: 'high',
      dueDate: '2026-10-06',
      taskType: 'chat',
    } as any;

    const res = aggregateCockpitData({
      tasks: [messageTask],
      leads: [],
      lessons: [todayLesson, cancelledLesson, completedTrial],
      students: [studentWithDebt],
      payments: [],
      nowDate: mockDate,
    });

    assert.strictEqual(res.summary.needsAttentionCount, 4, 'Must count debt before lesson, cancelled lesson, trial without decision, and message');
    assert.ok(res.summary.needsAttentionLabel.includes('4 требуют внимания'));
  });

  test('T1.03: Metric 3 🔵 [X] задач на сегодня counts only active tasks due today', () => {
    const todayTask1: FullTaskData = {
      id: 't_today_1',
      title: 'Подготовить материалы для урока B1',
      status: 'open',
      priority: 'medium',
      dueDate: '2026-10-06',
    } as any;

    const todayTask2: FullTaskData = {
      id: 't_today_2',
      title: 'Позвонить родителю по продлению',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-10-06',
    } as any;

    const completedTodayTask: FullTaskData = {
      id: 't_done_1',
      title: 'Отправить договор',
      status: 'done',
      dueDate: '2026-10-06',
    } as any;

    const cancelledTask: FullTaskData = {
      id: 't_cancel_1',
      title: 'Отмененная задача',
      status: 'cancelled',
      dueDate: '2026-10-06',
    } as any;

    const res = aggregateCockpitData({
      tasks: [todayTask1, todayTask2, completedTodayTask, cancelledTask],
      leads: [],
      lessons: [],
      students: [],
      payments: [],
      nowDate: mockDate,
    });

    assert.strictEqual(res.summary.tasksTodayCount, 2, 'Only active tasks for today must be counted');
    assert.ok(res.summary.tasksTodayLabel.includes('2 задач на сегодня'));
  });

  test('T1.04: Metric 4 🟣 [X] уроков не подтверждены reflects today lessons with unconfirmed attendance or missing teacher', () => {
    const lesson1: FullLessonData = {
      id: 'l_unconf_1',
      title: 'Математика ОГЭ',
      date: '2026-10-06',
      teacherName: 'Анна Васильевна',
      status: 'scheduled',
      students: [{ id: 's1', status: 'not_marked' }],
    } as any;

    const lesson2: FullLessonData = {
      id: 'l_unconf_2',
      title: 'Физика ЕГЭ',
      date: '2026-10-06',
      teacherName: 'Не назначен',
      status: 'scheduled',
      students: [{ id: 's2', status: 'present' }],
    } as any;

    const res = aggregateCockpitData({
      tasks: [],
      leads: [],
      lessons: [lesson1, lesson2],
      students: [],
      payments: [],
      nowDate: mockDate,
    });

    assert.strictEqual(res.summary.lessonsUnconfirmedCount, 2);
    assert.ok(res.summary.lessonsUnconfirmedLabel.includes('2 уроков не подтверждены'));
  });

  test('T1.05: Metric 5 🟢 [X] оплаты под контролем calculates exact amount in EUR summing overdue and near upcoming', () => {
    const overduePayment: FullPaymentData = {
      id: 'pay_overdue_1',
      amount: 140,
      currency: 'EUR',
      status: 'overdue',
      studentId: 'st_p1',
    } as any;

    const overdueInvoice: EuropeanInvoiceData = {
      id: 'inv_1',
      invoiceNumber: 20260402,
      totalAmountEUR: 260,
      status: 'overdue',
      currency: 'EUR',
      studentId: 'st_p2',
    } as any;

    const upcomingPayments: UpcomingPaymentItem[] = [
      {
        studentId: 'st_up1',
        studentName: 'Иван',
        amount: 320,
        currency: 'EUR',
        dueDate: '2026-10-07',
        daysRemaining: 1,
      } as any,
      {
        studentId: 'st_up2',
        studentName: 'Елена',
        amount: 180,
        currency: 'EUR',
        dueDate: '2026-10-09',
        daysRemaining: 3,
      } as any,
      {
        studentId: 'st_up3',
        studentName: 'Пётр',
        amount: 500,
        currency: 'EUR',
        dueDate: '2026-10-20',
        daysRemaining: 14, // > 3 days -> not under immediate control
      } as any,
    ];

    const res = aggregateCockpitData({
      tasks: [],
      leads: [],
      lessons: [],
      students: [],
      payments: [overduePayment],
      invoices: [overdueInvoice],
      upcomingPayments,
      nowDate: mockDate,
    });

    // Overdue: 140 + 260 = 400 €; Upcoming <= 3 days: 320 + 180 = 500 €; Total = 900 €
    assert.strictEqual(res.summary.paymentsUnderControlCount, 4, '1 payment + 1 invoice + 2 upcoming');
    assert.strictEqual(res.summary.paymentsAmountEUR, 900, 'Sum must strictly equal 900 EUR');
    assert.ok(res.summary.paymentsUnderControlFormatted.includes('900 €'));
    assert.ok(!res.summary.paymentsUnderControlFormatted.includes('₽'));
  });

  test('T1.06: Zero Mock Data Ban: Empty datasets produce strictly 0 with positive labels without hardcoding', () => {
    const res = aggregateCockpitData({
      tasks: [],
      leads: [],
      lessons: [],
      students: [],
      payments: [],
      invoices: [],
      upcomingPayments: [],
      nowDate: mockDate,
    });

    assert.strictEqual(res.summary.overdueCount, 0);
    assert.strictEqual(res.summary.overdueLabel, 'Долгов и просрочек нет · Всё в графике');
    assert.strictEqual(res.summary.needsAttentionCount, 0);
    assert.strictEqual(res.summary.needsAttentionLabel, 'Все под контролем · Сбоев нет');
    assert.strictEqual(res.summary.tasksTodayCount, 0);
    assert.strictEqual(res.summary.tasksTodayLabel, 'Все задачи выполнены · План закрыт');
    assert.strictEqual(res.summary.lessonsUnconfirmedCount, 0);
    assert.strictEqual(res.summary.lessonsUnconfirmedLabel, 'Всё подтверждено · Составы готовы');
    assert.strictEqual(res.summary.paymentsUnderControlCount, 0);
    assert.strictEqual(res.summary.paymentsAmountEUR, 0);
    assert.strictEqual(res.summary.paymentsUnderControlFormatted, '0 €');
    assert.strictEqual(res.summary.paymentsUnderControlLabel, 'Долгов нет · Все счета закрыты');

    assert.strictEqual(res.overdueItems.length, 0);
    assert.strictEqual(res.needsAttentionItems.length, 0);
    assert.strictEqual(res.todayChecklistItems.length, 0);
  });

  // -------------------------------------------------------------
  // TIER 2: Filtering by 9 Horizontal Tabs & Badge Counts
  // -------------------------------------------------------------
  console.log('\n--- TIER 2: Filtering by 9 Horizontal Tabs & Dynamic Count Badges ---');

  test('T2.01: All 9 tabs exist with non-negative badge counts', () => {
    const res = aggregateCockpitData({
      tasks: [],
      leads: [],
      lessons: [],
      students: [],
      payments: [],
      invoices: [],
      nowDate: mockDate,
    });

    const expectedTabs = ['all', 'overdue', 'attention', 'today', 'leads', 'trials', 'payments', 'lessons', 'messages'];
    for (const tab of expectedTabs) {
      assert.ok(tab in res.tabCounts, `tabCounts must include key '${tab}'`);
      assert.strictEqual(typeof (res.tabCounts as any)[tab], 'number');
      assert.ok((res.tabCounts as any)[tab] >= 0);
    }
  });

  test('T2.02: Tab filtering isolation: Просрочено, Требуют внимания, Сегодня', () => {
    const overdueItem: CockpitActionItem = {
      id: 'ov_1',
      sourceEntity: 'task',
      sourceId: 't1',
      blockType: 'overdue',
      priority: 'P1',
      category: 'Финансы · Просрочка',
      title: 'Просроченный счет',
      urgencyLabel: 'Просрочено',
    };

    const attentionItem: CockpitActionItem = {
      id: 'att_1',
      sourceEntity: 'lesson',
      sourceId: 'l1',
      blockType: 'attention',
      priority: 'P0',
      category: 'Финансы · Долг перед уроком',
      title: 'Долг перед уроком',
    };

    const todayItem: CockpitActionItem = {
      id: 'td_1',
      sourceEntity: 'task',
      sourceId: 't2',
      blockType: 'today',
      priority: 'P2',
      category: 'Ученики · Документы',
      title: 'Задача на сегодня',
    };

    const allItems = [overdueItem, attentionItem, todayItem];

    const filteredOverdue = filterCockpitItems(allItems, 'Просрочено');
    assert.strictEqual(filteredOverdue.length, 1);
    assert.strictEqual(filteredOverdue[0].id, 'ov_1');

    const filteredAttention = filterCockpitItems(allItems, 'Требуют внимания');
    assert.strictEqual(filteredAttention.length, 1);
    assert.strictEqual(filteredAttention[0].id, 'att_1');

    const filteredToday = filterCockpitItems(allItems, 'Сегодня');
    assert.strictEqual(filteredToday.length, 1);
    assert.strictEqual(filteredToday[0].id, 'td_1');
  });

  test('T2.03: Entity tabs isolation: Лиды, Пробные, Оплаты, Уроки, Сообщения', () => {
    const leadItem: CockpitActionItem = {
      id: 'item_lead',
      sourceEntity: 'lead',
      sourceId: 'ld_1',
      leadId: 'ld_1',
      priority: 'P1',
      category: 'Продажи · Лиды',
      title: 'Новый лид',
    };

    const trialItem: CockpitActionItem = {
      id: 'item_trial',
      sourceEntity: 'lesson',
      sourceId: 'tr_1',
      priority: 'P1',
      category: 'Продажи · Пробный урок',
      title: 'Пробный урок по химии',
    };

    const paymentItem: CockpitActionItem = {
      id: 'item_pay',
      sourceEntity: 'invoice',
      sourceId: 'inv_1',
      priority: 'P1',
      category: 'Финансы · Платежи',
      title: 'Счёт №20260401',
      debtAmount: 200,
    };

    const lessonItem: CockpitActionItem = {
      id: 'item_les',
      sourceEntity: 'lesson',
      sourceId: 'ls_1',
      lessonId: 'ls_1',
      priority: 'P1',
      category: 'Календарь · Занятия',
      title: 'Урок физики',
    };

    const messageItem: CockpitActionItem = {
      id: 'item_msg',
      sourceEntity: 'task',
      sourceId: 'msg_1',
      priority: 'P1',
      category: 'Сообщения · Поддержка',
      title: 'Входящее сообщение в Telegram',
    };

    const pool = [leadItem, trialItem, paymentItem, lessonItem, messageItem];

    assert.strictEqual(filterCockpitItems(pool, 'Лиды').length, 1);
    assert.strictEqual(filterCockpitItems(pool, 'Лиды')[0].id, 'item_lead');

    assert.strictEqual(filterCockpitItems(pool, 'Пробные').length, 1);
    assert.strictEqual(filterCockpitItems(pool, 'Пробные')[0].id, 'item_trial');

    assert.strictEqual(filterCockpitItems(pool, 'Оплаты').length, 1);
    assert.strictEqual(filterCockpitItems(pool, 'Оплаты')[0].id, 'item_pay');

    assert.strictEqual(filterCockpitItems(pool, 'Уроки').length, 1);
    assert.strictEqual(filterCockpitItems(pool, 'Уроки')[0].id, 'item_les');

    assert.strictEqual(filterCockpitItems(pool, 'Сообщения').length, 1);
    assert.strictEqual(filterCockpitItems(pool, 'Сообщения')[0].id, 'item_msg');
  });

  test('T2.04: Dynamic count badges match length of filtered items', () => {
    const taskToday: FullTaskData = {
      id: 't_t1',
      title: 'Задача 1',
      status: 'open',
      dueDate: '2026-10-06',
    } as any;

    const leadNew: FullLeadData = {
      id: 'l_n1',
      name: 'Лид 1',
      status: 'new',
      createdAt: '2026-10-06T10:00:00.000Z',
    } as any;

    const res = aggregateCockpitData({
      tasks: [taskToday],
      leads: [leadNew],
      lessons: [],
      students: [],
      payments: [],
      nowDate: mockDate,
    });

    assert.strictEqual(res.tabCounts.all, res.allQueueItems.length);
    assert.strictEqual(res.tabCounts.today, filterCockpitItems(res.allQueueItems, 'today').length);
    assert.strictEqual(res.tabCounts.leads, filterCockpitItems(res.allQueueItems, 'leads').length);
  });

  // -------------------------------------------------------------
  // TIER 3: 3-Mode Sorting Logic
  // -------------------------------------------------------------
  console.log('\n--- TIER 3: 3-Mode Sorting Logic (Priority, Time, Client) ---');

  test('T3.01: Priority Sort (По приоритету ∨) orders P0 -> P1 -> P2 -> P3 strictly', () => {
    const p3: CockpitActionItem = { id: '3', sourceEntity: 'task', sourceId: '3', priority: 'P3', category: 'C', title: 'Low' };
    const p0: CockpitActionItem = { id: '0', sourceEntity: 'student', sourceId: '0', priority: 'P0', category: 'C', title: 'Critical' };
    const p2: CockpitActionItem = { id: '2', sourceEntity: 'task', sourceId: '2', priority: 'P2', category: 'C', title: 'Today' };
    const p1: CockpitActionItem = { id: '1', sourceEntity: 'lesson', sourceId: '1', priority: 'P1', category: 'C', title: 'Attention' };

    const sorted = sortCockpitItems([p3, p2, p0, p1], 'priority');
    assert.deepStrictEqual(sorted.map((i) => i.priority), ['P0', 'P1', 'P2', 'P3']);
  });

  test('T3.02: Time / Deadline Sort orders overdue first, then ascending timeline time', () => {
    const item15: CockpitActionItem = { id: 't15', sourceEntity: 'task', sourceId: '1', priority: 'P2', category: 'C', title: 'A', timelineTime: '15:00' };
    const item10: CockpitActionItem = { id: 't10', sourceEntity: 'task', sourceId: '2', priority: 'P2', category: 'C', title: 'B', timelineTime: '10:00' };
    const item12: CockpitActionItem = { id: 't12', sourceEntity: 'task', sourceId: '3', priority: 'P2', category: 'C', title: 'C', timelineTime: '12:00' };
    const itemOverdue: CockpitActionItem = { id: 'ov', sourceEntity: 'task', sourceId: '4', priority: 'P1', category: 'C', title: 'D', blockType: 'overdue', urgencyLabel: 'Просрочено' };

    const sorted = sortCockpitItems([item15, itemOverdue, item12, item10], 'time');
    assert.strictEqual(sorted[0].id, 'ov', 'Overdue item must be placed first in time sort');
    assert.strictEqual(sorted[1].timelineTime, '10:00');
    assert.strictEqual(sorted[2].timelineTime, '12:00');
    assert.strictEqual(sorted[3].timelineTime, '15:00');
  });

  test('T3.03: Client Name Sort orders alphabetically A-Z and handles null names safely', () => {
    const itemA: CockpitActionItem = { id: '1', sourceEntity: 'task', sourceId: '1', priority: 'P2', category: 'C', title: 'T1', studentName: 'Анна Иванова' };
    const itemB: CockpitActionItem = { id: '2', sourceEntity: 'lead', sourceId: '2', priority: 'P1', category: 'C', title: 'T2', leadName: 'Борис Павлов' };
    const itemY: CockpitActionItem = { id: '3', sourceEntity: 'task', sourceId: '3', priority: 'P2', category: 'C', title: 'T3', studentName: 'Ярослав Ковалев' };
    const itemNoClient: CockpitActionItem = { id: '4', sourceEntity: 'task', sourceId: '4', priority: 'P2', category: 'C', title: 'Общая задача школы' };

    const sorted = sortCockpitItems([itemY, itemNoClient, itemA, itemB], 'client');
    assert.strictEqual(sorted[0].studentName, 'Анна Иванова');
    assert.strictEqual(sorted[1].leadName, 'Борис Павлов');
    assert.strictEqual(sorted[2].studentName, 'Ярослав Ковалев');
    assert.strictEqual(sorted[3].id, '4', 'Item without client name must be placed last');
  });

  test('T3.04: Combined helper getFilteredAndSortedItems filters tab and sorts correctly', () => {
    const item1: CockpitActionItem = { id: '1', sourceEntity: 'lead', sourceId: '1', leadName: 'Зоя', priority: 'P1', category: 'Продажи · Лиды', title: 'Лид 1' };
    const item2: CockpitActionItem = { id: '2', sourceEntity: 'lead', sourceId: '2', leadName: 'Алексей', priority: 'P1', category: 'Продажи · Лиды', title: 'Лид 2' };
    const item3: CockpitActionItem = { id: '3', sourceEntity: 'task', sourceId: '3', priority: 'P2', category: 'Финансы', title: 'Оплата' };

    const result = getFilteredAndSortedItems([item1, item3, item2], 'Лиды', 'client');
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].leadName, 'Алексей');
    assert.strictEqual(result[1].leadName, 'Зоя');
  });

  // -------------------------------------------------------------
  // TIER 4: Accordion State Handling & Queue Aggregation (65% Column)
  // -------------------------------------------------------------
  console.log('\n--- TIER 4: Accordion State Handling & Queue Aggregation ---');

  test('T4.01: Block 1 (🔴 Просрочено) aggregates overdue invoices, stuck leads, and overdue tasks', () => {
    const inv: EuropeanInvoiceData = {
      id: 'inv_b1',
      invoiceNumber: 20260405,
      studentName: 'Светлана Соколова',
      totalAmountEUR: 310,
      status: 'overdue',
      parentPhone: '+7 (999) 000-11-22',
      courseName: 'Немецкий B2',
    } as any;

    const lead: FullLeadData = {
      id: 'ld_b1',
      name: 'Кирилл Романов',
      status: 'new',
      createdAt: '2026-10-01T00:00:00.000Z',
      contact: '+7 (900) 888-77-66',
    } as any;

    const task: FullTaskData = {
      id: 't_b1',
      title: 'Проверить поступление оплаты',
      status: 'open',
      dueDate: '2026-10-02',
    } as any;

    const res = aggregateCockpitData({
      tasks: [task],
      leads: [lead],
      lessons: [],
      students: [],
      payments: [],
      invoices: [inv],
      nowDate: mockDate,
    });

    assert.strictEqual(res.overdueItems.length, 3);
    for (const item of res.overdueItems) {
      assert.strictEqual(item.blockType, 'overdue');
    }

    const invItem = res.overdueItems.find((i) => i.sourceEntity === 'invoice');
    assert.ok(invItem);
    assert.strictEqual(invItem.canOpenInvoice, true);
    assert.strictEqual(invItem.canWhatsApp, true);
    assert.ok(invItem.title.includes('310 €'));

    const taskItem = res.overdueItems.find((i) => i.sourceEntity === 'task');
    assert.ok(taskItem);
    assert.strictEqual(taskItem.canComplete, true);
    assert.strictEqual(taskItem.canPostpone, true);
  });

  test('T4.02: Block 2 (🟠 Требуют внимания сейчас) aggregates P0 debt before lesson, trial without decision, and message inquiries', () => {
    const student: FullStudentData = {
      id: 'st_b2',
      firstName: 'Артур',
      lastName: 'Ким',
      finance: { balance: -70, currency: 'EUR' },
      parents: [{ id: 'par_1', firstName: 'Олег', lastName: 'Ким', phone: '+7 900 111-22-33' }] as any,
    } as any;

    const lesson: FullLessonData = {
      id: 'l_b2',
      title: 'Английский разговорный',
      date: '2026-10-06',
      startTime: '13:00',
      teacherName: 'Сара Коннор',
      status: 'scheduled',
      students: [{ id: 'st_b2', name: 'Артур Ким', status: 'not_marked' }],
    } as any;

    const res = aggregateCockpitData({
      tasks: [],
      leads: [],
      lessons: [lesson],
      students: [student],
      payments: [],
      nowDate: mockDate,
    });

    assert.ok(res.needsAttentionItems.length >= 1);
    const debtItem = res.needsAttentionItems.find((i) => i.priority === 'P0');
    assert.ok(debtItem);
    assert.strictEqual(debtItem.badgeText, 'Ученик не допущен к занятию');
    assert.strictEqual(debtItem.canWhatsApp, true);
    assert.strictEqual(debtItem.canCall, true);
    assert.strictEqual(debtItem.canOpenInvoice, true);
  });

  test('T4.03: Block 3 (🔵 Задачи на сегодня) checklist provides timeline stamps and categories', () => {
    const task: FullTaskData = {
      id: 't_b3',
      title: 'Отправить расписание в группу',
      status: 'open',
      priority: 'medium',
      dueDate: '2026-10-06',
      dueDateFormatted: '06.10.2026 до 13:00',
      taskType: 'lead_followup',
    } as any;

    const res = aggregateCockpitData({
      tasks: [task],
      leads: [],
      lessons: [],
      students: [],
      payments: [],
      nowDate: mockDate,
    });

    assert.strictEqual(res.todayChecklistItems.length, 1);
    const item = res.todayChecklistItems[0];
    assert.strictEqual(item.blockType, 'today');
    assert.strictEqual(item.timelineTime, '13:00');
    assert.strictEqual(item.category, 'Продажи · Лиды');
    assert.strictEqual(item.canComplete, true);
    assert.strictEqual(item.canPostpone, true);
  });

  // -------------------------------------------------------------
  // TIER 5: Right Column 5 Operational Mini-Widgets (35% Column)
  // -------------------------------------------------------------
  console.log('\n--- TIER 5: Right Column 5 Operational Mini-Widgets ---');

  test('T5.01: Widget 1 🟣 Лиды и заявки aggregates noContact, awaitingReply, trialScheduled', () => {
    const leads: FullLeadData[] = [
      { id: '1', name: 'Лид 1', status: 'new' } as any,
      { id: '2', name: 'Лид 2', status: 'contacted' } as any,
      { id: '3', name: 'Лид 3', status: 'trial_scheduled' } as any,
      { id: '4', name: 'Лид 4', status: 'lost' } as any,
    ];

    const res = aggregateCockpitData({
      tasks: [],
      leads,
      lessons: [],
      students: [],
      payments: [],
      nowDate: mockDate,
    });

    assert.strictEqual(res.widgets.leadsWidget.noContact, 1);
    assert.strictEqual(res.widgets.leadsWidget.awaitingReply, 1);
    assert.strictEqual(res.widgets.leadsWidget.trialScheduled, 1);
    assert.strictEqual(res.widgets.leadsWidget.totalActiveLeads, 3);
  });

  test('T5.02: Widget 2 🎓 Пробные занятия aggregates today, completedNoDecision, awaitingConfirmation', () => {
    const lessons: FullLessonData[] = [
      { id: 'tr_today', date: '2026-10-06', type: 'trial', status: 'scheduled' } as any,
      { id: 'tr_done', date: '2026-10-05', type: 'trial', status: 'completed' } as any,
      { id: 'tr_wait', date: '2026-10-08', type: 'trial', status: 'scheduled', confirmationStatus: 'pending' } as any,
    ];

    const res = aggregateCockpitData({
      tasks: [],
      leads: [],
      lessons,
      students: [],
      payments: [],
      nowDate: mockDate,
    });

    assert.strictEqual(res.widgets.trialsWidget.today, 1);
    assert.strictEqual(res.widgets.trialsWidget.completedNoDecision, 1);
    assert.strictEqual(res.widgets.trialsWidget.awaitingConfirmation, 2);
    assert.strictEqual(res.widgets.trialsWidget.totalTrials, 3);
  });

  test('T5.03: Widget 3 🟢 Оплаты и счета aggregates overdue and today/tomorrow in pure EUR', () => {
    const invoices: EuropeanInvoiceData[] = [
      { id: 'inv_1', invoiceNumber: 101, status: 'overdue', totalAmountEUR: 200 } as any,
    ];
    const upcoming: UpcomingPaymentItem[] = [
      { studentId: 's1', amount: 300, daysRemaining: 0 } as any, // today
      { studentId: 's2', amount: 150, daysRemaining: 1 } as any, // tomorrow
      { studentId: 's3', amount: 400, daysRemaining: 3 } as any, // in 3 days
    ];

    const res = aggregateCockpitData({
      tasks: [],
      leads: [],
      lessons: [],
      students: [],
      payments: [],
      invoices,
      upcomingPayments: upcoming,
      nowDate: mockDate,
    });

    assert.strictEqual(res.widgets.paymentsWidget.overdueEUR, 200);
    assert.strictEqual(res.widgets.paymentsWidget.overdueCount, 1);
    assert.strictEqual(res.widgets.paymentsWidget.todayTomorrowEUR, 450); // 300 + 150
    assert.strictEqual(res.widgets.paymentsWidget.todayTomorrowCount, 2);
    assert.strictEqual(res.widgets.paymentsWidget.totalControlEUR, 1050); // 200 + 300 + 150 + 400
  });

  test('T5.04: Widget 4 📅 Занятия сегодня aggregates scheduled and attention lessons', () => {
    const lessons: FullLessonData[] = [
      { id: 'l1', date: '2026-10-06', status: 'scheduled', teacherName: 'Мария Сидорова' } as any,
      { id: 'l2', date: '2026-10-06', status: 'cancelled', teacherName: 'Иван Петров' } as any,
      { id: 'l3', date: '2026-10-06', status: 'scheduled', teacherName: 'Не назначен' } as any,
    ];

    const res = aggregateCockpitData({
      tasks: [],
      leads: [],
      lessons,
      students: [],
      payments: [],
      nowDate: mockDate,
    });

    assert.strictEqual(res.widgets.scheduleWidget.scheduled, 1);
    assert.strictEqual(res.widgets.scheduleWidget.attention, 2);
    assert.strictEqual(res.widgets.scheduleWidget.totalTodayLessons, 3);
  });

  test('T5.05: Widget 5 👥 Подтверждение уроков aggregates unconfirmed and unassigned', () => {
    const lessons: FullLessonData[] = [
      { id: 'l1', date: '2026-10-06', status: 'scheduled', teacherName: 'Мария', students: [{ id: 's1', status: 'not_marked' }] } as any,
      { id: 'l2', date: '2026-10-06', status: 'scheduled', teacherName: 'Не назначен', students: [{ id: 's2', status: 'present' }] } as any,
    ];

    const res = aggregateCockpitData({
      tasks: [],
      leads: [],
      lessons,
      students: [],
      payments: [],
      nowDate: mockDate,
    });

    assert.strictEqual(res.widgets.confirmationsWidget.unconfirmed, 1);
    assert.strictEqual(res.widgets.confirmationsWidget.unassigned, 1);
    assert.strictEqual(res.widgets.confirmationsWidget.totalTodayLessons, 2);
  });

  test('T5.06: Zero Mock Data Ban: Empty datasets produce strictly 0 across all 5 widgets', () => {
    const res = aggregateCockpitData({
      tasks: [],
      leads: [],
      lessons: [],
      students: [],
      payments: [],
      invoices: [],
      upcomingPayments: [],
      nowDate: mockDate,
    });

    assert.strictEqual(res.widgets.leadsWidget.noContact, 0);
    assert.strictEqual(res.widgets.leadsWidget.awaitingReply, 0);
    assert.strictEqual(res.widgets.leadsWidget.trialScheduled, 0);
    assert.strictEqual(res.widgets.leadsWidget.totalActiveLeads, 0);

    assert.strictEqual(res.widgets.trialsWidget.today, 0);
    assert.strictEqual(res.widgets.trialsWidget.completedNoDecision, 0);
    assert.strictEqual(res.widgets.trialsWidget.totalTrials, 0);

    assert.strictEqual(res.widgets.paymentsWidget.overdueEUR, 0);
    assert.strictEqual(res.widgets.paymentsWidget.todayTomorrowEUR, 0);
    assert.strictEqual(res.widgets.paymentsWidget.totalControlEUR, 0);

    assert.strictEqual(res.widgets.scheduleWidget.scheduled, 0);
    assert.strictEqual(res.widgets.scheduleWidget.attention, 0);
    assert.strictEqual(res.widgets.scheduleWidget.totalTodayLessons, 0);

    assert.strictEqual(res.widgets.confirmationsWidget.unconfirmed, 0);
    assert.strictEqual(res.widgets.confirmationsWidget.unassigned, 0);
    assert.strictEqual(res.widgets.confirmationsWidget.totalTodayLessons, 0);
  });

  // -------------------------------------------------------------
  // TIER 6: Action Handlers, Zero New Entities & Currency Purity
  // -------------------------------------------------------------
  console.log('\n--- TIER 6: Action Handlers, Zero New Entities & Currency Purity ---');

  test('T6.01: sanitizePhoneForWhatsApp formats international and domestic numbers correctly', () => {
    assert.strictEqual(sanitizePhoneForWhatsApp('8 (999) 777-88-99'), '79997778899');
    assert.strictEqual(sanitizePhoneForWhatsApp('+49 30 123456'), '4930123456');
    assert.strictEqual(sanitizePhoneForWhatsApp('+421 912 345 678'), '421912345678');
    assert.strictEqual(sanitizePhoneForWhatsApp(''), '');
  });

  test('T6.02: sanitizeTelegramUsername strips @, full links and spaces', () => {
    assert.strictEqual(sanitizeTelegramUsername('@smart_admin'), 'smart_admin');
    assert.strictEqual(sanitizeTelegramUsername('https://t.me/director_school'), 'director_school');
    assert.strictEqual(sanitizeTelegramUsername('  t.me/user_crm  '), 'user_crm');
    assert.strictEqual(sanitizeTelegramUsername(''), '');
  });

  test('T6.03: 100% Pure EUR currency validation: zero rubles in engine output', () => {
    const formatted = formatEurAmount(1250);
    assert.ok(formatted.endsWith(' €'));
    assert.ok(!formatted.includes('₽'));
    assert.ok(!formatted.includes('руб'));

    const res = aggregateCockpitData({
      tasks: [],
      leads: [],
      lessons: [],
      students: [],
      payments: [{ id: 'p1', amount: 150, currency: 'EUR', status: 'overdue' } as any],
      nowDate: mockDate,
    });

    const json = JSON.stringify(res);
    assert.ok(!json.includes('₽'), 'Aggregated output must contain 0 ruble symbols');
    assert.ok(!json.includes('руб'), 'Aggregated output must contain 0 rub strings');
  });

  test('T6.04: Zero New Entities: pure in-memory calculation relies strictly on existing entities', () => {
    // Validates that engine accepts only standard parameters and does not require synthetic DB tables
    const params = {
      tasks: [],
      leads: [],
      lessons: [],
      students: [],
      payments: [],
      invoices: [],
      upcomingPayments: [],
      nowDate: mockDate,
    };
    const res = aggregateCockpitData(params);
    assert.ok(res.summary);
    assert.ok(res.overdueItems);
    assert.ok(res.needsAttentionItems);
    assert.ok(res.todayChecklistItems);
    assert.ok(res.widgets);
    assert.ok(res.tabCounts);
  });

  // -------------------------------------------------------------
  // TIER 7: Adversarial Invariants, Edge Cases & Fuzzing Stress
  // -------------------------------------------------------------
  await runAdversarialCockpitStressTests();

  console.log('\n===============================================================');
  console.log(`   SUITE 24 COMPLETE: ${passed} passed, ${failed} failed`);
  console.log('===============================================================');

  if (failed > 0) {
    throw new Error(`Suite 24 failed with ${failed} test failures`);
  }
}
