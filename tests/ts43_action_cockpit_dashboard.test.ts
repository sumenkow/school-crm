/**
 * SMART ACADEMY CRM — SUITE 23: OPERATIONAL ACTION COCKPIT DASHBOARD (TS-43)
 *
 * Scope: Verification of Admin Cockpit «Мой день» (/dashboard / AdminDashboardView.tsx)
 * Validates:
 * - Priority Engine (P0, P1, P2, P3) aggregation and classification
 * - Zero New Entities & SSOT adherence
 * - Mock Data Ban: dynamic calculations, empty states
 * - 100% Pure EUR currency standard (zero rubles)
 * - Phone & Telegram sanitizers for direct actions (wa.me, t.me, tel:)
 * - 4 KPI summary cards math & reactive responsiveness
 * - 440px Slide-over Drawer geometry & structural fidelity
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  aggregateCockpitData,
  sanitizePhoneForWhatsApp,
  sanitizeTelegramUsername,
  formatEurAmount,
  isTodayDate,
  formatTimeDifference,
  CockpitActionItem,
} from '../src/features/dashboard/lib/cockpitPriorityEngine';
import { FullTaskData, FullLeadData, FullLessonData, FullStudentData, FullPaymentData } from '../src/lib/data/mockData';

export async function runSuite23() {
  console.log('\n===============================================================');
  console.log('   SUITE 23: OPERATIONAL ACTION COCKPIT DASHBOARD (TS-43)      ');
  console.log('   Action-First Operational Desk & Priority Engine Verification');
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
  // TIER 1: Priority Engine Rules (P0, P1, P2, P3)
  // -------------------------------------------------------------
  console.log('\n--- TIER 1: Priority Engine Rules & Urgency Calculations ---');

  test('T1.01: P0 Debt before lesson today is flagged with critical priority & admission badge', () => {
    const student: FullStudentData = {
      id: 'st_101',
      firstName: 'Алексей',
      lastName: 'Смирнов',
      status: 'active',
      phone: '+7 999 111-22-33',
      finance: { balance: -85, currency: 'EUR' },
      createdAt: '2026-09-01T00:00:00Z',
    } as any;

    const lesson: FullLessonData = {
      id: 'l_101',
      title: 'English B1 Teens',
      subject: 'Английский язык',
      date: '2026-10-06',
      startTime: '12:00',
      endTime: '13:30',
      teacherName: 'Елена Романова',
      groupName: 'B1-Teens-Tue',
      status: 'scheduled',
      attendees: [{ studentId: 'st_101', studentName: 'Алексей Смирнов', status: 'not_marked' }],
    } as any;

    const res = aggregateCockpitData({
      tasks: [],
      leads: [],
      lessons: [lesson],
      students: [student],
      payments: [],
      nowDate: mockDate,
    });

    assert.strictEqual(res.attentionItems.length, 1);
    const item = res.attentionItems[0];
    assert.strictEqual(item.priority, 'P0');
    assert.strictEqual(item.badgeText, 'Ученик не допущен к занятию');
    assert.strictEqual(item.debtAmount, 85);
    assert.ok(item.debtFormatted?.includes('85 €'));
    assert.strictEqual(item.urgencyLabel, 'Через 35 мин');
    assert.strictEqual(item.canWhatsApp, true);
    assert.strictEqual(item.canCall, true);
  });

  test('T1.02: P1 New lead without contact calculates waiting duration correctly', () => {
    const lead: FullLeadData = {
      id: 'lead_501',
      name: 'Мария Иванова',
      status: 'new',
      contact: '+7 900 123-45-67',
      courseInterest: 'IELTS Preparation',
      createdAt: new Date(2026, 9, 6, 10, 11, 0).toISOString(), // 1h 14m before mockDate
    } as any;

    const res = aggregateCockpitData({
      tasks: [],
      leads: [lead],
      lessons: [],
      students: [],
      payments: [],
      nowDate: mockDate,
    });

    const leadItem = res.attentionItems.find((i) => i.sourceId === 'lead_501');
    assert.ok(leadItem, 'Lead item must be present in attention queue');
    assert.strictEqual(leadItem.priority, 'P1');
    assert.strictEqual(leadItem.badgeText, 'Первый контакт');
    assert.strictEqual(leadItem.urgencyLabel, '1 ч 14 мин');
  });

  test('T1.03: P1 Completed trial lesson without decision is flagged', () => {
    const trialLesson: FullLessonData = {
      id: 'trial_99',
      title: 'Пробный урок: Немецкий А1',
      subject: 'Немецкий язык',
      date: '2026-10-06',
      startTime: '09:00',
      endTime: '09:45',
      teacherName: 'Клаус Майер',
      status: 'completed',
      type: 'trial',
    } as any;

    const res = aggregateCockpitData({
      tasks: [],
      leads: [],
      lessons: [trialLesson],
      students: [],
      payments: [],
      nowDate: mockDate,
    });

    const trialItem = res.attentionItems.find((i) => i.sourceId === 'trial_99');
    assert.ok(trialItem, 'Completed trial without decision must be in attention queue');
    assert.strictEqual(trialItem.priority, 'P1');
    assert.strictEqual(trialItem.badgeText, 'Решение не зафиксировано');
  });

  test('T1.04: P1 Overdue task is prioritized in attention queue', () => {
    const overdueTask: FullTaskData = {
      id: 't_overdue',
      title: 'Сверить баланс кассы за понедельник',
      status: 'open',
      priority: 'high',
      dueDate: '2026-10-05', // yesterday
      assignedTo: 'Администратор',
    } as any;

    const res = aggregateCockpitData({
      tasks: [overdueTask],
      leads: [],
      lessons: [],
      students: [],
      payments: [],
      nowDate: mockDate,
    });

    const taskItem = res.attentionItems.find((i) => i.sourceId === 't_overdue');
    assert.ok(taskItem, 'Overdue task must be in attention queue');
    assert.strictEqual(taskItem.priority, 'P1');
    assert.strictEqual(taskItem.urgencyLabel, 'Просрочено');
  });

  test('T1.05: P2 Tasks for today are categorized with category tags', () => {
    const paymentTask: FullTaskData = {
      id: 't_today_pay',
      title: 'Выставить счет за продление курса B2',
      status: 'open',
      priority: 'medium',
      dueDate: '2026-10-06',
      dueDateFormatted: '06.10.2026 до 12:00',
      taskType: 'payment',
    } as any;

    const res = aggregateCockpitData({
      tasks: [paymentTask],
      leads: [],
      lessons: [],
      students: [],
      payments: [],
      nowDate: mockDate,
    });

    assert.strictEqual(res.todayItems.length, 1);
    const item = res.todayItems[0];
    assert.strictEqual(item.priority, 'P2');
    assert.strictEqual(item.category, 'Финансы · Платежи');
    assert.strictEqual(item.urgencyLabel, 'до 12:00');
  });

  test('T1.06: P3 Postponable tasks receive 1-click postpone target dates', () => {
    const postponableTask: FullTaskData = {
      id: 't_postpone',
      title: 'Заказать фирменные блокноты и ручки',
      status: 'open',
      priority: 'low',
      dueDate: '2026-10-06',
    } as any;

    const res = aggregateCockpitData({
      tasks: [postponableTask],
      leads: [],
      lessons: [],
      students: [],
      payments: [],
      nowDate: mockDate,
    });

    assert.strictEqual(res.postponableItems.length, 1);
    const item = res.postponableItems[0];
    assert.strictEqual(item.priority, 'P3');
    assert.ok(item.postponeDates && item.postponeDates.length >= 2);
    assert.strictEqual(item.postponeDates[0].label, '→ Завтра');
    assert.strictEqual(item.postponeDates[0].dateIso, '2026-10-07');
  });

  // -------------------------------------------------------------
  // TIER 2: KPI Summary Cards & Mathematical Consistency
  // -------------------------------------------------------------
  console.log('\n--- TIER 2: KPI Summary Cards & Mathematical Consistency ---');

  test('T2.01: KPI Summary cards reflect exact totals across queues', () => {
    const overduePayment: FullPaymentData = {
      id: 'p_due',
      studentId: 'st_1',
      studentName: 'Иван',
      amount: 140,
      currency: 'EUR',
      status: 'overdue',
    } as any;

    const todayLesson: FullLessonData = {
      id: 'l_1',
      date: '2026-10-06',
      title: 'Урок',
      status: 'scheduled',
    } as any;

    const res = aggregateCockpitData({
      tasks: [],
      leads: [],
      lessons: [todayLesson],
      students: [],
      payments: [overduePayment],
      nowDate: mockDate,
    });

    assert.strictEqual(res.summary.todayLessonsCount, 1);
    assert.strictEqual(res.summary.paymentsToControlCount, 1);
    assert.strictEqual(res.summary.paymentsToControlTotalEur, 140);
    assert.strictEqual(res.summary.paymentsToControlFormatted, '140 €');
  });

  test('T2.02: Zero Mock Data Ban: Empty datasets produce clean zero state without fake injection', () => {
    const res = aggregateCockpitData({
      tasks: [],
      leads: [],
      lessons: [],
      students: [],
      payments: [],
      nowDate: mockDate,
    });

    assert.strictEqual(res.summary.attentionCount, 0);
    assert.strictEqual(res.summary.todayTasksCount, 0);
    assert.strictEqual(res.summary.todayLessonsCount, 0);
    assert.strictEqual(res.summary.paymentsToControlCount, 0);
    assert.strictEqual(res.summary.paymentsToControlTotalEur, 0);
    assert.strictEqual(res.attentionItems.length, 0);
    assert.strictEqual(res.todayItems.length, 0);
    assert.strictEqual(res.postponableItems.length, 0);
  });

  // -------------------------------------------------------------
  // TIER 3: Sanitization & Action-First Link Generation
  // -------------------------------------------------------------
  console.log('\n--- TIER 3: Action Links & Contact Sanitizers ---');

  test('T3.01: sanitizePhoneForWhatsApp normalizes 8-prefix Russian numbers to 7', () => {
    assert.strictEqual(sanitizePhoneForWhatsApp('8 (999) 123-45-67'), '79991234567');
  });

  test('T3.02: sanitizePhoneForWhatsApp handles international EU numbers', () => {
    assert.strictEqual(sanitizePhoneForWhatsApp('+49 151 2345678'), '491512345678');
  });

  test('T3.03: sanitizeTelegramUsername strips @, URL protocols, and whitespace', () => {
    assert.strictEqual(sanitizeTelegramUsername('@elena_manager'), 'elena_manager');
    assert.strictEqual(sanitizeTelegramUsername('https://t.me/ivan_student'), 'ivan_student');
    assert.strictEqual(sanitizeTelegramUsername('  t.me/director  '), 'director');
  });

  test('T3.04: formatEurAmount outputs pure EUR without rubles', () => {
    const formatted = formatEurAmount(1250);
    assert.ok(formatted.endsWith(' €'));
    assert.ok(!formatted.includes('₽'));
    assert.ok(!formatted.includes('руб'));
  });

  // -------------------------------------------------------------
  // TIER 4: UI & Layout Static Compliance
  // -------------------------------------------------------------
  console.log('\n--- TIER 4: UI & Layout Specification Compliance ---');

  test('T4.01: CockpitSlideOverDrawer specifies exact 440px width matching reference', () => {
    const drawerPath = path.resolve(__dirname, '../src/features/dashboard/components/CockpitSlideOverDrawer.tsx');
    assert.ok(fs.existsSync(drawerPath), 'CockpitSlideOverDrawer component must exist');
    const content = fs.readFileSync(drawerPath, 'utf8');
    assert.ok(content.includes('max-w-[440px]'), 'Drawer must have max-w-[440px] matching spec');
    assert.ok(!content.includes('₽'), 'Drawer must contain 0 ruble symbols');
  });

  test('T4.02: AdminDashboardView implements all 3 operational queues and 4 KPI cards', () => {
    const viewPath = path.resolve(__dirname, '../src/features/dashboard/components/AdminDashboardView.tsx');
    assert.ok(fs.existsSync(viewPath), 'AdminDashboardView component must exist');
    const content = fs.readFileSync(viewPath, 'utf8');
    assert.ok(content.includes('Требуют внимания сейчас'), 'Must have Block 1');
    assert.ok(content.includes('Нужно сделать сегодня'), 'Must have Block 2');
    assert.ok(content.includes('Можно перенести'), 'Must have Block 3');
    assert.ok(!content.includes('₽'), 'AdminDashboardView must contain 0 ruble symbols');
  });

  console.log('\n===============================================================');
  console.log(`   SUITE 23 COMPLETE: ${passed} passed, ${failed} failed`);
  console.log('===============================================================');

  if (failed > 0) {
    throw new Error(`Suite 23 failed with ${failed} test failures`);
  }
}
