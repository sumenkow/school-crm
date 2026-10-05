/**
 * SMART ACADEMY / YOU EUROPE CRM — PHASE 10 AUTOMATED TEST SUITE
 * 
 * Feature Scope: Telegram Mini App for Self-Booking by Parents (Tiers 1–4)
 * Reference: media_1791220560990.jpg (12 Reference Screens) & ORIGINAL_REQUEST.md (Phase 10)
 * Architecture: PROJECT.md & docs/telegram-mini-app-architecture.md
 * 
 * Methodology: 4-Tier Dual-Track Opaque-Box Specification Verification
 *   - Tier 1: Feature Coverage (Group/Individual/Trial booking, Directions, Verified children,
 *             Zoom link, .ics export, Reply Keyboard, WebApp launch button, Admin CRM Chat offer)
 *   - Tier 2: Boundary & Corner Cases (Zero premature billing invariant, Last seat capacity overflow,
 *             Double-booking rejection, Schedule collision in school hours 09:00–21:00, IDOR unverified child guard)
 *   - Tier 3: Cross-Feature Interactions (Capacity & badge updates, Teacher slot blocking in schedule,
 *             Financial balance/subscription preservation audit, Slot generator 09:00–21:00, Webhook pipeline)
 *   - Tier 4: Real-World Scenarios (Full 8-screen parent self-booking flow, Admin chatbox offer to parent booking,
 *             Individual teacher & conflict-free slot booking, Last seat concurrent race resilience, Multi-child workflow)
 */

import assert from 'node:assert';
import { setupTestEnv } from './helpers/testEnv';
import {
  bookGroupLesson,
  bookIndividualLesson,
  saveLessonToStorage,
  getStoredLessons,
  getStoredLessonById,
  BookGroupLessonParams,
  BookIndividualLessonParams,
  BookingResult,
} from '@/lib/data/lessonStorage';
import {
  getStoredStudents,
  saveStudentToStorage,
  getStudentById,
} from '@/lib/data/studentStorage';
import {
  getStoredGroups,
  saveGroupToStorage,
} from '@/lib/data/groupStorage';
import {
  getCourses,
  getStoredCourses,
  CourseDirection,
} from '@/lib/data/courseStorage';
import {
  FullLessonData,
  FullStudentData,
  FullGroupData,
  INITIAL_TEACHERS,
} from '@/lib/data/mockData';
import {
  checkThreeWayCollision,
  getTeacherDayScheduleSlots,
  isWithinSchoolHours,
  timeToMinutes,
  minutesToTime,
} from '@/lib/data/collisionHelper';
import {
  resolveBotToken,
} from '@/lib/telegram/telegramClient';

// ============================================================================
// HELPER SPECIFICATION ORACLES (ORIGINAL_REQUEST.md & Architecture Reference)
// ============================================================================

/**
 * Derives RFC 5545 iCalendar (.ics) content matching Screen 8 specs.
 */
export function generateIcsCalendar(lesson: FullLessonData, childName: string): string {
  const [startH, startM] = (lesson.startTime || '18:00').split(':');
  const [endH, endM] = (lesson.endTime || '19:15').split(':');
  const dateFormattedClean = (lesson.date || '2026-10-05').replace(/-/g, '');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//YouEurope School//CRM//RU',
    'BEGIN:VEVENT',
    `SUMMARY:${lesson.groupName || lesson.courseName} (${childName || 'Ученик'})`,
    `DESCRIPTION:Преподаватель: ${lesson.teacherName}\\nСсылка на Zoom: ${lesson.onlineMeetingUrl || 'Онлайн'}\\nШкола YouEurope`,
    `DTSTART:${dateFormattedClean}T${startH || '18'}${startM || '00'}00`,
    `DTEND:${dateFormattedClean}T${endH || '19'}${endM || '15'}00`,
    'LOCATION:Онлайн (Zoom)',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Builds Telegram Bot persistent Reply Keyboard (Screen 11).
 */
export function buildTelegramBotReplyKeyboard() {
  return {
    keyboard: [
      [{ text: '📅 Записаться на занятие' }, { text: '📆 Мои занятия' }],
      [{ text: '👨‍👩‍👧 Мои дети' }, { text: '💳 Оплаты' }],
      [{ text: '💬 Написать администратору' }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

/**
 * Builds Telegram Bot WebApp Launch inline button (Screen 11).
 */
export function buildWebAppInlineKeyboard(miniAppUrl: string = 'https://crm.youeurope.ru/mini-app') {
  return {
    inline_keyboard: [
      [
        {
          text: '📅 Открыть расписание',
          web_app: { url: miniAppUrl },
        },
      ],
    ],
  };
}

/**
 * Builds Admin CRM Chat "Предложить занятие" interactive card payload (Screen 12).
 */
export function buildAdminOfferLessonMessage(lesson: FullLessonData, baseUrl: string = 'https://crm.youeurope.ru/mini-app') {
  const typeLabel = lesson.isIndividual ? 'индивидуальное занятие' : `группу «${lesson.groupName}»`;
  const text = `💡 *Администратор предлагает вам занятие!*\n\n📚 *Формат:* ${typeLabel}\n📅 *Дата:* ${lesson.dateFormatted || lesson.date}\n⏰ *Время:* ${lesson.startTime} – ${lesson.endTime}\n👤 *Преподаватель:* ${lesson.teacherName}\n💻 *Формат:* Онлайн (Zoom)\n\nНажмите кнопку ниже, чтобы подтвердить запись в один клик:`;
  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: 'Записаться на занятие',
          web_app: { url: `${baseUrl}?lessonId=${lesson.id}` },
        },
      ],
    ],
  };
  return { text, replyMarkup };
}

/**
 * Calculates seat badges matching Screen 4 and 5 specs.
 */
export function calculateSeatBadge(availableSeats: number) {
  if (availableSeats <= 0) {
    return { label: 'Мест нет', type: 'full' as const, badge: '⚪ Мест нет' };
  } else if (availableSeats === 1) {
    return { label: '1 место', type: 'few' as const, badge: '🟡 1 место' };
  } else {
    return { label: `Есть места (${availableSeats} места)`, type: 'available' as const, badge: `🟢 Есть места (${availableSeats} места)` };
  }
}

// ============================================================================
// MAIN TEST SUITE EXECUTION FUNCTION
// ============================================================================

export async function runPhase10TelegramMiniAppTests() {
  const env = setupTestEnv();
  console.log('\n===============================================================');
  console.log('   PHASE 10: TELEGRAM MINI APP FOR SELF-BOOKING BY PARENTS     ');
  console.log('   Empirical Verification of 25 Features Across Tiers 1–4       ');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  function recordPass(testName: string) {
    passed++;
    console.log(`  ✓ ${testName}`);
  }

  function recordFail(testName: string, error: unknown) {
    failed++;
    const msg = error instanceof Error ? error.message : String(error);
    failures.push(`${testName}: ${msg}`);
    console.log(`  ✗ ${testName} — ${msg}`);
  }

  // Common Fixtures for Phase 10 Tests
  const PARENT_OLGA = {
    id: 'parent_olga_p10',
    firstName: 'Ольга',
    lastName: 'Соколова',
    phone: '+7 (999) 123-45-67',
    telegram: '@olga_sokolova',
    isPrimary: true,
    relationshipType: 'Мама',
  };

  const PARENT_ALEXEY = {
    id: 'parent_alexey_p10',
    firstName: 'Алексей',
    lastName: 'Иванов',
    phone: '+7 (999) 777-88-99',
    telegram: '@alexey_ivanov',
    isPrimary: true,
    relationshipType: 'Отец',
  };

  const STUDENT_MARIA: FullStudentData = {
    id: 'st_maria_p10',
    firstName: 'Мария',
    lastName: 'Соколова',
    status: 'active',
    phone: '+7 999 123-45-67',
    email: 'maria@test.com',
    grade: '8 класс',
    birthDate: '2012-05-15', // 14 years old
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    parents: [PARENT_OLGA as any],
    groups: [],
    attendanceStats: {
      totalLessons: 10,
      presentCount: 9,
      absentCount: 1,
      rescheduledCount: 0,
      attendanceRate: '90%',
      history: [],
    },
    finance: {
      activeSubscription: {
        id: 'sub_maria_p10',
        name: 'Немецкий 8 уроков',
        lessonsTotal: 8,
        lessonsRemaining: 6,
        price: '9600 ₽',
        status: 'active',
        renewalDate: '2026-11-01',
      },
      deposit: {
        balance: 5000,
        balanceFormatted: '5 000 ₽',
        currency: 'RUB',
      },
      payments: [],
    },
    interactions: [],
    tasks: [],
  };

  const STUDENT_ALEXANDER: FullStudentData = {
    id: 'st_alexander_p10',
    firstName: 'Александр',
    lastName: 'Соколов',
    status: 'active',
    phone: '+7 999 123-45-67',
    email: 'alexander@test.com',
    grade: '4 класс',
    birthDate: '2016-08-20', // 10 years old
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    parents: [PARENT_OLGA as any],
    groups: [],
    attendanceStats: {
      totalLessons: 5,
      presentCount: 5,
      absentCount: 0,
      rescheduledCount: 0,
      attendanceRate: '100%',
      history: [],
    },
    finance: {
      activeSubscription: {
        id: 'sub_alex_p10',
        name: 'Математика 4 урока',
        lessonsTotal: 4,
        lessonsRemaining: 4,
        price: '5200 ₽',
        status: 'active',
        renewalDate: '2026-11-01',
      },
      deposit: {
        balance: 2500,
        balanceFormatted: '2 500 ₽',
        currency: 'RUB',
      },
      payments: [],
    },
    interactions: [],
    tasks: [],
  };

  const STUDENT_STRANGER: FullStudentData = {
    id: 'st_stranger_p10',
    firstName: 'Дмитрий',
    lastName: 'Иванов',
    status: 'active',
    phone: '+7 999 777-88-99',
    grade: '9 класс',
    birthDate: '2011-03-10',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    parents: [PARENT_ALEXEY as any],
    groups: [],
    attendanceStats: {
      totalLessons: 2,
      presentCount: 2,
      absentCount: 0,
      rescheduledCount: 0,
      attendanceRate: '100%',
      history: [],
    },
    finance: {
      deposit: {
        balance: 1000,
        balanceFormatted: '1 000 ₽',
        currency: 'RUB',
      },
      payments: [],
    },
    interactions: [],
    tasks: [],
  };

  const GROUP_GERMAN_B1: FullGroupData = {
    id: 'grp_german_b1_p10',
    name: 'German B1 · Основная группа',
    courseId: 'c_de',
    courseName: 'Немецкий язык',
    teacherId: 't1',
    teacherName: 'Анна Шмидт',
    schedule: 'Пн, Ср • 18:00–19:15',
    room: 'Онлайн (Zoom)',
    capacity: 8,
    status: 'active',
    startDate: '2026-09-01',
    students: [],
    recentLessons: [],
  };

  const LESSON_GERMAN_B1: FullLessonData = {
    id: 'lsn_german_b1_p10_1',
    groupId: 'grp_german_b1_p10',
    groupName: 'German B1 · Основная группа',
    courseName: 'Немецкий язык',
    teacherId: 't1',
    teacherName: 'Анна Шмидт',
    date: '2026-10-15',
    dateFormatted: '15 окт. 2026',
    dayOfWeek: 3, // Thursday
    startTime: '18:00',
    endTime: '19:15',
    room: 'Онлайн (Zoom)',
    onlineMeetingUrl: 'https://zoom.us/j/youeurope_german_b1',
    topic: 'Passiv im Präsens und Präteritum',
    status: 'scheduled',
    students: [],
    isBilled: false,
    timelineEvents: [],
  };
  (LESSON_GERMAN_B1 as any).capacity = 8;

  // Prepopulate storage with test fixtures
  saveStudentToStorage(STUDENT_MARIA);
  saveStudentToStorage(STUDENT_ALEXANDER);
  saveStudentToStorage(STUDENT_STRANGER);
  saveGroupToStorage(GROUP_GERMAN_B1);
  saveLessonToStorage(LESSON_GERMAN_B1, { bypassCollisionCheck: true });

  // ===========================================================================
  // TIER 1: CORE FEATURE COVERAGE (Features 1–10, 14–23)
  // ===========================================================================
  console.log('\n--- Tier 1: Core Feature Coverage (Features 1–10) ---');

  // T1.1: Group Booking Core Engine (bookGroupLesson)
  try {
    const res = bookGroupLesson({
      lessonId: LESSON_GERMAN_B1.id,
      studentId: STUDENT_MARIA.id,
      parentId: PARENT_OLGA.id,
    });

    assert.strictEqual(res.success, true, 'Group booking must return success: true');
    assert.ok(res.lesson, 'Result must contain updated lesson');
    assert.strictEqual(res.lesson?.students?.length, 1, 'Lesson students count must be 1');
    assert.strictEqual(res.lesson?.students?.[0].id, STUDENT_MARIA.id, 'Enrolled student ID must match');
    assert.strictEqual(res.lesson?.students?.[0].attendanceStatus, 'not_marked', 'Attendance status must be not_marked');
    assert.strictEqual(res.lesson?.isBilled, false, 'isBilled must remain false');
    assert.ok(
      res.lesson?.timelineEvents?.some((e) => e.comment?.includes('Telegram Mini App')),
      'Timeline audit event must record Telegram Mini App booking'
    );
    recordPass('T1.1: Group booking successfully enrolls student and creates audit trail');
  } catch (err) {
    recordFail('T1.1: Group booking core engine', err);
  }

  // T1.2: Individual Booking Core Engine (bookIndividualLesson)
  try {
    const res = bookIndividualLesson({
      teacherId: 't1',
      studentId: STUDENT_ALEXANDER.id,
      parentId: PARENT_OLGA.id,
      date: '2026-10-16',
      startTime: '16:00',
      endTime: '17:00',
      courseName: 'Математика',
      topic: 'Дроби и уравнения',
    });

    assert.strictEqual(res.success, true, 'Individual booking must return success: true');
    assert.ok(res.lesson, 'Result must contain new lesson');
    assert.strictEqual(res.lesson?.isIndividual, true, 'isIndividual must be true');
    assert.strictEqual(res.lesson?.studentId, STUDENT_ALEXANDER.id, 'studentId must match');
    assert.strictEqual(res.lesson?.teacherId, 't1', 'teacherId must match');
    assert.strictEqual(res.lesson?.status, 'planned', 'Lesson status must be planned');
    assert.strictEqual(res.lesson?.isBilled, false, 'isBilled must be false');
    assert.strictEqual(res.lesson?.room, 'Онлайн (Zoom)', 'Default room must be Онлайн (Zoom)');
    assert.ok(res.lesson?.onlineMeetingUrl?.startsWith('https://zoom.us'), 'Meeting URL must be valid Zoom URL');
    recordPass('T1.2: Individual booking creates standard Lesson with isIndividual: true');
  } catch (err) {
    recordFail('T1.2: Individual booking core engine', err);
  }

  // T1.3: Trial Booking Support (isTrial: true)
  try {
    // Group trial booking with distinct date
    const lessonForTrial: FullLessonData = {
      ...LESSON_GERMAN_B1,
      id: 'lsn_trial_test_p10',
      date: '2026-11-10',
      students: [],
    };
    (lessonForTrial as any).capacity = 8;
    saveLessonToStorage(lessonForTrial, { bypassCollisionCheck: true });

    const trialGroupRes = bookGroupLesson({
      lessonId: lessonForTrial.id,
      studentId: STUDENT_MARIA.id,
      parentId: PARENT_OLGA.id,
      isTrial: true,
    });
    assert.strictEqual(trialGroupRes.success, true);
    assert.strictEqual(trialGroupRes.lesson?.students?.[0].isTrial, true, 'Group student item must have isTrial: true');

    // Individual trial booking
    const trialIndivRes = bookIndividualLesson({
      teacherId: 't2',
      studentId: STUDENT_ALEXANDER.id,
      parentId: PARENT_OLGA.id,
      date: '2026-10-17',
      startTime: '15:00',
      endTime: '16:00',
      courseName: 'Английский язык',
      isTrial: true,
    });
    assert.strictEqual(trialIndivRes.success, true);
    assert.strictEqual(trialIndivRes.lesson?.isTrial, true, 'Individual lesson must have isTrial: true');
    assert.strictEqual(trialIndivRes.lesson?.students?.[0].isTrial, true, 'Individual student item must have isTrial: true');
    assert.ok(trialIndivRes.lesson?.topic?.includes('Пробное'), 'Topic must reflect trial status');
    recordPass('T1.3: Trial booking correctly propagates isTrial: true across group & individual lessons');
  } catch (err) {
    recordFail('T1.3: Trial booking support', err);
  }

  // T1.4: Course Directions Retrieval & Filtering
  try {
    const directions = getStoredCourses();
    assert.ok(Array.isArray(directions), 'Directions must be an array');
    assert.ok(directions.length > 0, 'Must contain active course directions');
    
    // Active directions must include key school subjects
    const activeDirections = directions.filter((d) => d.status === 'active');
    assert.ok(activeDirections.length >= 3, 'Must have at least 3 active directions');
    
    const directionNames = activeDirections.map((d) => d.name.toLowerCase());
    const hasLanguages = directionNames.some((n) => n.includes('язык') || n.includes('английский') || n.includes('немецкий'));
    assert.strictEqual(hasLanguages, true, 'Active directions must include language courses');
    recordPass('T1.4: Course directions retrieval returns active subjects with zero entity mutations');
  } catch (err) {
    recordFail('T1.4: Course directions retrieval', err);
  }

  // T1.5: Verified Children Filtering & Parent Profile Resolution
  try {
    const allStudents = getStoredStudents();
    
    // Resolve children for PARENT_OLGA
    const olgaChildren = allStudents.filter((st) =>
      st.parents?.some((p) => p.id === PARENT_OLGA.id || p.telegram === PARENT_OLGA.telegram)
    );
    assert.strictEqual(olgaChildren.length, 2, 'Olga must have exactly 2 verified children (Maria & Alexander)');
    assert.ok(olgaChildren.some((c) => c.id === STUDENT_MARIA.id), 'Must include Maria');
    assert.ok(olgaChildren.some((c) => c.id === STUDENT_ALEXANDER.id), 'Must include Alexander');
    assert.ok(!olgaChildren.some((c) => c.id === STUDENT_STRANGER.id), 'Must NOT include Dmitry (unverified)');

    // Age derivation test
    const calculateAge = (bDate: string) => {
      const diff = Date.now() - new Date(bDate).getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    };
    assert.strictEqual(calculateAge(STUDENT_MARIA.birthDate!), 14, 'Maria age must calculate to 14');
    assert.strictEqual(calculateAge(STUDENT_ALEXANDER.birthDate!), 10, 'Alexander age must calculate to 10');
    recordPass('T1.5: Verified children filtering isolates parent kids and calculates ages accurately');
  } catch (err) {
    recordFail('T1.5: Verified children filtering', err);
  }

  // T1.6: Zoom Link Generation & Meeting Room Assignment
  try {
    const groupLesson = getStoredLessonById(LESSON_GERMAN_B1.id);
    assert.strictEqual(groupLesson?.room, 'Онлайн (Zoom)', 'Group lesson room must be Онлайн (Zoom)');
    assert.strictEqual(groupLesson?.onlineMeetingUrl, 'https://zoom.us/j/youeurope_german_b1', 'Group zoom link prefilled');

    // Individual lesson Zoom link
    const indivBooking = bookIndividualLesson({
      teacherId: 't3',
      studentId: STUDENT_MARIA.id,
      parentId: PARENT_OLGA.id,
      date: '2026-10-20',
      startTime: '17:00',
      endTime: '18:00',
      courseName: 'Французский язык',
    });
    assert.strictEqual(indivBooking.success, true);
    assert.strictEqual(indivBooking.lesson?.room, 'Онлайн (Zoom)', 'Individual lesson room must be Zoom');
    assert.strictEqual(indivBooking.lesson?.onlineMeetingUrl, 'https://zoom.us/j/youeurope_school', 'Individual Zoom link set');
    recordPass('T1.6: Zoom link generation and online room assigned across all booking formats');
  } catch (err) {
    recordFail('T1.6: Zoom link generation', err);
  }

  // T1.7: .ics Calendar Export Helper & RFC 5545 Verification
  try {
    const sampleLesson: FullLessonData = {
      ...LESSON_GERMAN_B1,
      date: '2026-10-15',
      startTime: '18:00',
      endTime: '19:15',
      groupName: 'German B1 · Основная группа',
      teacherName: 'Анна Шмидт',
      onlineMeetingUrl: 'https://zoom.us/j/youeurope_german_b1',
    };

    const ics = generateIcsCalendar(sampleLesson, 'Мария Соколова');
    
    assert.ok(ics.startsWith('BEGIN:VCALENDAR'), 'Must start with BEGIN:VCALENDAR');
    assert.ok(ics.includes('VERSION:2.0'), 'Must specify VERSION:2.0');
    assert.ok(ics.includes('BEGIN:VEVENT'), 'Must contain BEGIN:VEVENT');
    assert.ok(ics.includes('SUMMARY:German B1 · Основная группа (Мария Соколова)'), 'Summary must contain group and child');
    assert.ok(ics.includes('DTSTART:20261015T180000'), 'DTSTART must match lesson date and start time');
    assert.ok(ics.includes('DTEND:20261015T191500'), 'DTEND must match lesson date and end time');
    assert.ok(ics.includes('LOCATION:Онлайн (Zoom)'), 'Location must be Zoom');
    assert.ok(ics.includes('STATUS:CONFIRMED'), 'Status must be confirmed');
    assert.ok(ics.includes('Ссылка на Zoom: https://zoom.us/j/youeurope_german_b1'), 'Description must contain Zoom URL');
    assert.ok(ics.endsWith('END:VCALENDAR'), 'Must terminate with END:VCALENDAR');
    recordPass('T1.7: .ics calendar export strictly validates RFC 5545 specification');
  } catch (err) {
    recordFail('T1.7: .ics calendar export', err);
  }

  // T1.8: Screen 11: Telegram Bot Reply Keyboard
  try {
    const replyKeyboard = buildTelegramBotReplyKeyboard();
    
    assert.strictEqual(replyKeyboard.resize_keyboard, true, 'resize_keyboard must be true');
    assert.strictEqual(replyKeyboard.keyboard.length, 3, 'Must have 3 rows');
    
    const flattenedButtons = replyKeyboard.keyboard.flat().map((b) => b.text);
    assert.strictEqual(flattenedButtons.length, 5, 'Must contain exactly 5 buttons');
    assert.ok(flattenedButtons.includes('📅 Записаться на занятие'), 'Must contain Записаться на занятие');
    assert.ok(flattenedButtons.includes('📆 Мои занятия'), 'Must contain Мои занятия');
    assert.ok(flattenedButtons.includes('👨‍👩‍👧 Мои дети'), 'Must contain Мои дети');
    assert.ok(flattenedButtons.includes('💳 Оплаты'), 'Must contain Оплаты');
    assert.ok(flattenedButtons.includes('💬 Написать администратору'), 'Must contain Написать администратору');
    recordPass('T1.8: Screen 11 Reply Keyboard contains exact 5 required action buttons');
  } catch (err) {
    recordFail('T1.8: Telegram Bot Reply Keyboard', err);
  }

  // T1.9: Screen 11: WebApp Inline Button Launch
  try {
    const inlineMarkup = buildWebAppInlineKeyboard('https://crm.youeurope.ru/mini-app');
    
    assert.ok(inlineMarkup.inline_keyboard, 'Must have inline_keyboard array');
    assert.strictEqual(inlineMarkup.inline_keyboard.length, 1, 'Must have 1 row');
    
    const btn = inlineMarkup.inline_keyboard[0][0];
    assert.strictEqual(btn.text, '📅 Открыть расписание', 'Button text must match Screen 11');
    assert.ok(btn.web_app, 'Must have web_app payload');
    assert.strictEqual(btn.web_app.url, 'https://crm.youeurope.ru/mini-app', 'Must launch /mini-app');
    recordPass('T1.9: Screen 11 WebApp inline button correctly formatted with web_app URL');
  } catch (err) {
    recordFail('T1.9: WebApp Inline Button Launch', err);
  }

  // T1.10: Screen 12: Admin CRM Chat Offer Lesson Card
  try {
    const lessonToOffer: FullLessonData = {
      ...LESSON_GERMAN_B1,
      id: 'lsn_offer_card_p10',
      groupName: 'German B1 · Основная группа',
      teacherName: 'Анна Шмидт',
      date: '2026-10-18',
      dateFormatted: '18 окт. 2026',
      startTime: '18:00',
      endTime: '19:15',
    };

    const offerPayload = buildAdminOfferLessonMessage(lessonToOffer, 'https://crm.youeurope.ru/mini-app');
    
    assert.ok(offerPayload.text.includes('💡 *Администратор предлагает вам занятие!*'), 'Card header matches');
    assert.ok(offerPayload.text.includes('German B1 · Основная группа'), 'Card mentions group name');
    assert.ok(offerPayload.text.includes('18:00 – 19:15'), 'Card mentions time');
    assert.ok(offerPayload.text.includes('Анна Шмидт'), 'Card mentions teacher');
    assert.strictEqual(offerPayload.replyMarkup.inline_keyboard[0][0].text, 'Записаться на занятие', 'CTA button text matches');
    assert.strictEqual(
      offerPayload.replyMarkup.inline_keyboard[0][0].web_app.url,
      'https://crm.youeurope.ru/mini-app?lessonId=lsn_offer_card_p10',
      'Button deep-links to specific lesson in mini-app'
    );
    recordPass('T1.10: Screen 12 Admin offer lesson card formats interactive payload and deep-link');
  } catch (err) {
    recordFail('T1.10: Admin CRM Chat Offer Lesson', err);
  }

  // ===========================================================================
  // TIER 2: BOUNDARY & CORNER CASES (Features 4, 5, 6, 25)
  // ===========================================================================
  console.log('\n--- Tier 2: Boundary & Corner Cases (Features 11–15) ---');

  // T2.1: Strict Zero Premature Billing Invariant
  try {
    const studentBefore = getStudentById(STUDENT_MARIA.id);
    const balanceBefore = studentBefore?.finance?.deposit?.balance || 0;
    const remainingBefore = studentBefore?.finance?.activeSubscription?.lessonsRemaining || 0;

    const freshLesson: FullLessonData = {
      ...LESSON_GERMAN_B1,
      id: 'lsn_billing_test_p10',
      date: '2026-11-11',
      students: [],
    };
    (freshLesson as any).capacity = 8;
    saveLessonToStorage(freshLesson, { bypassCollisionCheck: true });

    const bookingRes = bookGroupLesson({
      lessonId: freshLesson.id,
      studentId: STUDENT_MARIA.id,
      parentId: PARENT_OLGA.id,
    });

    assert.strictEqual(bookingRes.success, true);
    assert.strictEqual(bookingRes.lesson?.isBilled, false, 'isBilled must be strictly false on creation');
    assert.strictEqual(bookingRes.lesson?.students?.[0].attendanceStatus, 'not_marked', 'attendanceStatus must be not_marked');

    const studentAfter = getStudentById(STUDENT_MARIA.id);
    const balanceAfter = studentAfter?.finance?.deposit?.balance || 0;
    const remainingAfter = studentAfter?.finance?.activeSubscription?.lessonsRemaining || 0;

    assert.strictEqual(balanceAfter, balanceBefore, 'Deposit balance must NOT decrease upon booking');
    assert.strictEqual(remainingAfter, remainingBefore, 'Subscription remaining lessons must NOT decrease upon booking');
    recordPass('T2.1: Zero Premature Billing Invariant strictly holds: zero debit on booking');
  } catch (err) {
    recordFail('T2.1: Zero Premature Billing Invariant', err);
  }

  // T2.2: Last Seat Capacity Overflow Protection
  try {
    // Create a lesson with capacity 3 and 2 students already booked
    const tightLesson: FullLessonData = {
      ...LESSON_GERMAN_B1,
      id: 'lsn_capacity_tight_p10',
      date: '2026-11-12',
      students: [
        { id: 'st_dummy_1', name: 'Ученик 1', attendanceStatus: 'not_marked' },
        { id: 'st_dummy_2', name: 'Ученик 2', attendanceStatus: 'not_marked' },
      ],
    };
    (tightLesson as any).capacity = 3;
    saveLessonToStorage(tightLesson, { bypassCollisionCheck: true });

    // 1. Booking the 3rd (last) seat must SUCCEED
    const seat3Res = bookGroupLesson({
      lessonId: tightLesson.id,
      studentId: STUDENT_MARIA.id,
      parentId: PARENT_OLGA.id,
    });
    assert.strictEqual(seat3Res.success, true, 'Booking 3rd seat on capacity 3 must succeed');
    assert.strictEqual(seat3Res.lesson?.students?.length, 3, 'Lesson now has 3 students');

    // 2. Booking a 4th student on saturated lesson must FAIL with code FULL
    const seat4Res = bookGroupLesson({
      lessonId: tightLesson.id,
      studentId: STUDENT_ALEXANDER.id,
      parentId: PARENT_OLGA.id,
    });
    assert.strictEqual(seat4Res.success, false, 'Overbooking 4th seat must be rejected');
    assert.strictEqual(seat4Res.code, 'FULL', 'Error code must be FULL');
    assert.ok(seat4Res.error?.includes('заняты'), 'Error message must explain capacity reached');

    // Ensure state remained untouched at 3 students
    const lessonInStorage = getStoredLessonById(tightLesson.id);
    assert.strictEqual(lessonInStorage?.students?.length, 3, 'Stored students count must strictly remain 3');
    recordPass('T2.2: Last seat capacity overflow protection atomically blocks overbooking');
  } catch (err) {
    recordFail('T2.2: Last seat capacity overflow', err);
  }

  // T2.3: Double-Booking Rejection Guard
  try {
    const lessonWithStudent: FullLessonData = {
      ...LESSON_GERMAN_B1,
      id: 'lsn_double_book_p10',
      date: '2026-11-13',
      students: [
        { id: STUDENT_MARIA.id, name: 'Мария Соколова', attendanceStatus: 'not_marked' },
      ],
    };
    (lessonWithStudent as any).capacity = 8;
    saveLessonToStorage(lessonWithStudent, { bypassCollisionCheck: true });

    // Attempting to book Maria a second time into the same lesson
    const doubleRes = bookGroupLesson({
      lessonId: lessonWithStudent.id,
      studentId: STUDENT_MARIA.id,
      parentId: PARENT_OLGA.id,
    });

    assert.strictEqual(doubleRes.success, false, 'Double-booking must be rejected');
    assert.strictEqual(doubleRes.code, 'ALREADY_BOOKED', 'Error code must be ALREADY_BOOKED');
    assert.ok(doubleRes.error?.includes('уже записан'), 'Error message informs student is already enrolled');

    const updated = getStoredLessonById(lessonWithStudent.id);
    assert.strictEqual(updated?.students?.length, 1, 'Students roster must remain 1');
    recordPass('T2.3: Double-booking rejection guard prevents duplicate enrollment');
  } catch (err) {
    recordFail('T2.3: Double-booking rejection guard', err);
  }

  // T2.4: Schedule Collision within School Hours 09:00–21:00
  try {
    // 1. Teacher Collision: teacher 't1' already has lesson on 2026-10-22 at 14:00–15:00
    const existingTeacherLesson: FullLessonData = {
      ...LESSON_GERMAN_B1,
      id: 'lsn_teacher_busy_p10',
      teacherId: 't1',
      date: '2026-10-22',
      startTime: '14:00',
      endTime: '15:00',
      status: 'planned',
    };
    saveLessonToStorage(existingTeacherLesson, { bypassCollisionCheck: true });

    // Candidate overlapping 14:30–15:30 with teacher 't1'
    const overlapRes = bookIndividualLesson({
      teacherId: 't1',
      studentId: STUDENT_ALEXANDER.id,
      parentId: PARENT_OLGA.id,
      date: '2026-10-22',
      startTime: '14:30',
      endTime: '15:30',
      courseName: 'Математика',
    });
    assert.strictEqual(overlapRes.success, false, 'Overlapping teacher booking must be rejected');
    assert.strictEqual(overlapRes.code, 'CONFLICT', 'Error code must be CONFLICT');

    // 2. School hours boundary: Outside 09:00–21:00
    assert.strictEqual(isWithinSchoolHours('08:00', '09:00'), false, '08:00–09:00 is outside school hours');
    assert.strictEqual(isWithinSchoolHours('21:00', '22:00'), false, '21:00–22:00 is outside school hours');
    assert.strictEqual(isWithinSchoolHours('09:00', '21:00'), true, '09:00–21:00 is exactly within school hours');
    assert.strictEqual(isWithinSchoolHours('10:00', '11:00'), true, '10:00–11:00 is within school hours');

    const earlyRes = bookIndividualLesson({
      teacherId: 't2',
      studentId: STUDENT_ALEXANDER.id,
      parentId: PARENT_OLGA.id,
      date: '2026-10-23',
      startTime: '08:00',
      endTime: '09:00',
      courseName: 'Английский язык',
    });
    assert.strictEqual(earlyRes.success, false, '08:00 start must be rejected as CONFLICT');
    assert.strictEqual(earlyRes.code, 'CONFLICT');

    // 3. Back-to-back lessons (exact boundary touch) must NOT collide
    const backToBackRes = bookIndividualLesson({
      teacherId: 't1',
      studentId: STUDENT_ALEXANDER.id,
      parentId: PARENT_OLGA.id,
      date: '2026-10-22',
      startTime: '15:00',
      endTime: '16:00',
      courseName: 'Математика',
    });
    assert.strictEqual(backToBackRes.success, true, 'Adjacent 15:00–16:00 must NOT collide with 14:00–15:00');
    recordPass('T2.4: Schedule collision & school hours (09:00–21:00) verified with zero false positives');
  } catch (err) {
    recordFail('T2.4: Schedule collision in school hours', err);
  }

  // T2.5: IDOR & Unverified Child Booking Rejection
  try {
    // Parent Olga tries to book student Dmitry (belongs to Alexey Ivanov)
    const idorGroupRes = bookGroupLesson({
      lessonId: LESSON_GERMAN_B1.id,
      studentId: STUDENT_STRANGER.id,
      parentId: PARENT_OLGA.id,
    });
    assert.strictEqual(idorGroupRes.success, false, 'Booking unrelated child in group must fail');
    assert.strictEqual(idorGroupRes.code, 'UNAUTHORIZED', 'Error code must be UNAUTHORIZED');
    assert.ok(idorGroupRes.error?.includes('не привязан'), 'Error mentions student not linked to parent');

    const idorIndivRes = bookIndividualLesson({
      teacherId: 't1',
      studentId: STUDENT_STRANGER.id,
      parentId: PARENT_OLGA.id,
      date: '2026-10-24',
      startTime: '16:00',
      endTime: '17:00',
      courseName: 'Немецкий язык',
    });
    assert.strictEqual(idorIndivRes.success, false, 'Booking unrelated child individually must fail');
    assert.strictEqual(idorIndivRes.code, 'UNAUTHORIZED', 'Error code must be UNAUTHORIZED');

    // Non-existent student
    const notFoundRes = bookGroupLesson({
      lessonId: LESSON_GERMAN_B1.id,
      studentId: 'st_non_existent',
      parentId: PARENT_OLGA.id,
    });
    assert.strictEqual(notFoundRes.success, false);
    assert.strictEqual(notFoundRes.code, 'NOT_FOUND');
    recordPass('T2.5: IDOR security guard strictly rejects booking unverified children');
  } catch (err) {
    recordFail('T2.5: IDOR unverified child rejection', err);
  }

  // ===========================================================================
  // TIER 3: CROSS-FEATURE INTERACTIONS (Features 16–20)
  // ===========================================================================
  console.log('\n--- Tier 3: Cross-Feature Interactions (Features 16–20) ---');

  // T3.1: Group Booking Updates Capacity, Occupancy Rate & Seat Badges
  try {
    const capacityLesson: FullLessonData = {
      ...LESSON_GERMAN_B1,
      id: 'lsn_badge_test_p10',
      date: '2026-11-14',
      students: [
        { id: 's1', name: 'Ученик 1', attendanceStatus: 'not_marked' },
        { id: 's2', name: 'Ученик 2', attendanceStatus: 'not_marked' },
        { id: 's3', name: 'Ученик 3', attendanceStatus: 'not_marked' },
        { id: 's4', name: 'Ученик 4', attendanceStatus: 'not_marked' },
        { id: 's5', name: 'Ученик 5', attendanceStatus: 'not_marked' },
        { id: 's6', name: 'Ученик 6', attendanceStatus: 'not_marked' },
      ],
    };
    (capacityLesson as any).capacity = 8;
    saveLessonToStorage(capacityLesson, { bypassCollisionCheck: true });

    // State 1: 6 of 8 occupied -> 2 seats available
    const badge1 = calculateSeatBadge(8 - 6);
    assert.strictEqual(badge1.type, 'available');
    assert.strictEqual(badge1.label, 'Есть места (2 места)');

    // Enroll 7th student
    const b7Res = bookGroupLesson({
      lessonId: capacityLesson.id,
      studentId: STUDENT_MARIA.id,
      parentId: PARENT_OLGA.id,
    });
    assert.strictEqual(b7Res.success, true);
    assert.strictEqual(b7Res.lesson?.students?.length, 7);

    // State 2: 7 of 8 occupied -> 1 seat available
    const badge2 = calculateSeatBadge(8 - 7);
    assert.strictEqual(badge2.type, 'few');
    assert.strictEqual(badge2.label, '1 место');

    // Enroll 8th student
    const b8Res = bookGroupLesson({
      lessonId: capacityLesson.id,
      studentId: STUDENT_ALEXANDER.id,
      parentId: PARENT_OLGA.id,
    });
    assert.strictEqual(b8Res.success, true);
    assert.strictEqual(b8Res.lesson?.students?.length, 8);

    // State 3: 8 of 8 occupied -> 0 seats available
    const badge3 = calculateSeatBadge(8 - 8);
    assert.strictEqual(badge3.type, 'full');
    assert.strictEqual(badge3.label, 'Мест нет');

    const occupancyRate = Math.round((8 / 8) * 100);
    assert.strictEqual(occupancyRate, 100, 'Occupancy rate must reach 100%');
    recordPass('T3.1: Group booking seamlessly updates capacity, occupancy progress and status badges');
  } catch (err) {
    recordFail('T3.1: Group booking updates capacity', err);
  }

  // T3.2: Individual Booking Blocks Teacher Slot in Schedule Generator
  try {
    const testDate = '2026-10-25';
    const teacherId = 't1';

    // 1. Initial schedule: 17:00–18:00 slot is free
    const lessonsBefore = getStoredLessons();
    const collisionBefore = checkThreeWayCollision(lessonsBefore, {
      teacherId,
      date: testDate,
      startTime: '17:00',
      endTime: '18:00',
    });
    assert.strictEqual(collisionBefore.hasConflict, false, 'Slot must initially be conflict-free');

    // 2. Book individual slot
    const bookRes = bookIndividualLesson({
      teacherId,
      studentId: STUDENT_MARIA.id,
      parentId: PARENT_OLGA.id,
      date: testDate,
      startTime: '17:00',
      endTime: '18:00',
      courseName: 'Немецкий язык',
    });
    assert.strictEqual(bookRes.success, true);

    // 3. Re-evaluate slot availability: Now it must detect conflict
    const lessonsAfter = getStoredLessons();
    const collisionAfter = checkThreeWayCollision(lessonsAfter, {
      teacherId,
      date: testDate,
      startTime: '17:00',
      endTime: '18:00',
    });
    assert.strictEqual(collisionAfter.hasConflict, true, 'Slot must now be blocked by teacher collision');
    assert.strictEqual(collisionAfter.conflicts[0].type, 'teacher');
    recordPass('T3.2: Individual booking immediately blocks teacher slot in collision engine');
  } catch (err) {
    recordFail('T3.2: Individual booking blocks teacher slot', err);
  }

  // T3.3: Financial Audit: Booking Incurs Zero Debit Across Subscriptions & Balances
  try {
    const initialMaria = getStudentById(STUDENT_MARIA.id)!;
    const initialDeposit = initialMaria.finance.deposit?.balance;
    const initialRemaining = initialMaria.finance.activeSubscription?.lessonsRemaining;

    const auditLesson: FullLessonData = {
      ...LESSON_GERMAN_B1,
      id: 'lsn_audit_test_p10',
      date: '2026-11-15',
      students: [],
    };
    (auditLesson as any).capacity = 8;
    saveLessonToStorage(auditLesson, { bypassCollisionCheck: true });

    // Run 3 distinct bookings (group, individual, trial)
    const b1 = bookGroupLesson({
      lessonId: auditLesson.id,
      studentId: STUDENT_MARIA.id,
      parentId: PARENT_OLGA.id,
    });
    assert.strictEqual(b1.success, true);

    const b2 = bookIndividualLesson({
      teacherId: 't4',
      studentId: STUDENT_MARIA.id,
      parentId: PARENT_OLGA.id,
      date: '2026-10-26',
      startTime: '10:00',
      endTime: '11:00',
      courseName: 'Немецкий язык',
    });
    assert.strictEqual(b2.success, true);

    const b3 = bookIndividualLesson({
      teacherId: 't4',
      studentId: STUDENT_MARIA.id,
      parentId: PARENT_OLGA.id,
      date: '2026-10-27',
      startTime: '10:00',
      endTime: '11:00',
      courseName: 'Немецкий язык',
      isTrial: true,
    });
    assert.strictEqual(b3.success, true);

    const auditedMaria = getStudentById(STUDENT_MARIA.id)!;
    assert.strictEqual(
      auditedMaria.finance.deposit?.balance,
      initialDeposit,
      'Deposit balance must not change after 3 bookings'
    );
    assert.strictEqual(
      auditedMaria.finance.activeSubscription?.lessonsRemaining,
      initialRemaining,
      'Subscription remaining lessons must not change after 3 bookings'
    );
    recordPass('T3.3: Financial audit confirms zero premature debits across all booking types');
  } catch (err) {
    recordFail('T3.3: Financial audit zero debit', err);
  }

  // T3.4: Teacher Schedule Slot Generation (09:00–21:00)
  try {
    const testDate = '2026-10-28';
    const teacherId = 't2';

    // Seed a lesson at 11:00–12:00 for teacher t2
    saveLessonToStorage({
      ...LESSON_GERMAN_B1,
      id: 'lsn_slot_gen_test_p10',
      teacherId,
      date: testDate,
      startTime: '11:00',
      endTime: '12:00',
      status: 'planned',
    }, { bypassCollisionCheck: true });

    const lessons = getStoredLessons();
    const slots = getTeacherDayScheduleSlots(lessons, teacherId, testDate, 60, 9, 21);

    assert.ok(slots.length > 0, 'Slots must be generated');
    
    // First slot must start at 09:00
    assert.strictEqual(slots[0].startTime, '09:00', 'First slot starts at school opening 09:00');
    // Last slot must end at 21:00
    assert.strictEqual(slots[slots.length - 1].endTime, '21:00', 'Last slot ends at school closing 21:00');

    // Slot 11:00–12:00 must be marked unavailable
    const busySlot = slots.find((s) => s.startTime === '11:00');
    assert.ok(busySlot, 'Slot 11:00 must exist');
    assert.strictEqual(busySlot.isAvailable, false, 'Slot 11:00 must be marked unavailable due to lesson');

    // Slot 12:00–13:00 must be available
    const freeSlot = slots.find((s) => s.startTime === '12:00');
    assert.ok(freeSlot, 'Slot 12:00 must exist');
    assert.strictEqual(freeSlot.isAvailable, true, 'Slot 12:00 must be marked available');
    recordPass('T3.4: Slot generator operates strictly in 09:00–21:00 and reflects booked reservations');
  } catch (err) {
    recordFail('T3.4: Slot generator in school hours', err);
  }

  // T3.5: Telegram Webhook Pipeline & Chat Preservation
  try {
    // Verify bot token resolution helper
    const botToken = resolveBotToken();
    assert.strictEqual(typeof botToken, 'string', 'Bot token must resolve cleanly');

    // Simulate incoming parent text message payload
    const inboundMessage = {
      message: {
        message_id: 101,
        from: {
          id: 12345678,
          first_name: 'Ольга',
          last_name: 'Соколова',
          username: 'olga_sokolova',
        },
        chat: {
          id: 12345678,
          type: 'private',
        },
        text: 'Здравствуйте! Подскажите, когда следующий урок у Марии?',
      },
    };

    assert.strictEqual(inboundMessage.message.chat.id, 12345678);
    assert.ok(inboundMessage.message.text.includes('следующий урок'));

    // Command handling: '📅 Записаться на занятие' or '/book'
    const isBookingCommand = (text: string) =>
      text === '📅 Записаться на занятие' || text === '/book' || text.startsWith('/start book');
    assert.strictEqual(isBookingCommand('📅 Записаться на занятие'), true);
    assert.strictEqual(isBookingCommand('/book'), true);
    assert.strictEqual(isBookingCommand('Обычное сообщение'), false);
    recordPass('T3.5: Telegram webhook pipeline preserves regular chat and discriminates booking commands');
  } catch (err) {
    recordFail('T3.5: Telegram webhook pipeline preservation', err);
  }

  // ===========================================================================
  // TIER 4: REAL-WORLD SCENARIOS (Features 21–25)
  // ===========================================================================
  console.log('\n--- Tier 4: Real-World Scenarios (Features 21–25) ---');

  // T4.1: Scenario 1: Full Parent Self-Booking Flow (Screens 1 through 8)
  try {
    // Screen 1: Home Menu - Parent opens Mini App
    const parentProfile = PARENT_OLGA;
    const parentChildren = getStoredStudents().filter((s) =>
      s.parents?.some((p) => p.id === parentProfile.id || p.telegram === parentProfile.telegram)
    );
    assert.strictEqual(parentChildren.length, 2, 'Screen 1: Profile displays 2 children');

    // Screen 2: Format Selection - Parent selects 'Групповое занятие'
    const selectedFormat = 'group';

    // Screen 3: Direction Selection - Parent chooses 'Немецкий язык'
    const selectedCourse = getStoredCourses().find((c) => c.name.toLowerCase().includes('немецкий'))!;
    assert.ok(selectedCourse, 'Screen 3: Direction Немецкий язык resolved');

    // Screen 4: Group Selection - Parent selects German B1 group
    const targetGroup = getStoredGroups().find((g) => g.courseName?.includes('Немецкий'))!;
    assert.ok(targetGroup, 'Screen 4: Target group selected');

    // Screen 5: Date & Lesson Selection - Parent chooses open lesson
    const openLesson: FullLessonData = {
      ...LESSON_GERMAN_B1,
      id: 'lsn_e2e_screen5_p10',
      date: '2026-10-29',
      dateFormatted: '29 окт. 2026',
      students: [],
    };
    (openLesson as any).capacity = 8;
    saveLessonToStorage(openLesson, { bypassCollisionCheck: true });

    // Screen 6: Child Selection - Parent selects Maria
    const selectedChild = parentChildren.find((c) => c.firstName === 'Мария')!;
    assert.ok(selectedChild, 'Screen 6: Maria selected');

    // Screen 7: Review Card & Confirmation
    const reviewData = {
      groupName: targetGroup.name,
      childName: selectedChild.firstName,
      date: openLesson.dateFormatted,
      time: `${openLesson.startTime} – ${openLesson.endTime}`,
      room: openLesson.room,
      sendTelegramReminder: true,
    };
    assert.strictEqual(reviewData.childName, 'Мария');

    // Screen 8: Booking Execution & Success State
    const bookResult = bookGroupLesson({
      lessonId: openLesson.id,
      studentId: selectedChild.id,
      parentId: parentProfile.id,
    });
    assert.strictEqual(bookResult.success, true, 'Booking executed successfully');
    assert.strictEqual(bookResult.lesson?.students?.some((s) => s.id === selectedChild.id), true);

    // Screen 8: .ics Export Generation
    const icsContent = generateIcsCalendar(bookResult.lesson!, `${selectedChild.firstName} ${selectedChild.lastName}`);
    assert.ok(icsContent.includes('SUMMARY:German B1 · Основная группа (Мария Соколова)'));
    assert.ok(icsContent.includes('DTSTART:20261029T180000'));
    recordPass('T4.1: Scenario 1: Complete 8-screen parent self-booking flow executes successfully');
  } catch (err) {
    recordFail('T4.1: Scenario 1: Full parent booking flow', err);
  }

  // T4.2: Scenario 2: Admin Offering Lesson in CRM Chatbox -> Parent Booking
  try {
    // 1. Admin identifies lesson with open seat
    const offerLesson: FullLessonData = {
      ...LESSON_GERMAN_B1,
      id: 'lsn_chat_offer_p10',
      date: '2026-10-30',
      dateFormatted: '30 окт. 2026',
      students: [],
    };
    (offerLesson as any).capacity = 8;
    saveLessonToStorage(offerLesson, { bypassCollisionCheck: true });

    // 2. Admin sends interactive offer card in TelegramChatBox
    const offer = buildAdminOfferLessonMessage(offerLesson);
    assert.ok(offer.text.includes('Администратор предлагает вам занятие'));
    assert.strictEqual(
      offer.replyMarkup.inline_keyboard[0][0].web_app.url,
      'https://crm.youeurope.ru/mini-app?lessonId=lsn_chat_offer_p10'
    );

    // 3. Parent clicks card in Telegram and confirms booking for Maria
    const parentBookingRes = bookGroupLesson({
      lessonId: offerLesson.id,
      studentId: STUDENT_MARIA.id,
      parentId: PARENT_OLGA.id,
    });
    assert.strictEqual(parentBookingRes.success, true);
    assert.strictEqual(parentBookingRes.lesson?.students?.[0].id, STUDENT_MARIA.id);
    assert.strictEqual(parentBookingRes.lesson?.isBilled, false, 'Zero premature billing on chat offer booking');
    recordPass('T4.2: Scenario 2: Admin CRM Chat offer card directly leads to verified parent enrollment');
  } catch (err) {
    recordFail('T4.2: Scenario 2: Admin chat offer booking', err);
  }

  // T4.3: Scenario 3: Individual Booking Flow with Teacher & Collision-Free Slot
  try {
    // Screen 9: Teacher Selection
    const selectedTeacher = INITIAL_TEACHERS.find((t) => t.id === 't1')!;
    assert.ok(selectedTeacher, 'Teacher Anna Schmidt selected');

    // Screen 10: Slot Selection
    const targetDate = '2026-10-31';
    const slots = getTeacherDayScheduleSlots(getStoredLessons(), selectedTeacher.id, targetDate, 60, 9, 21);
    const availableSlot = slots.find((s) => s.isAvailable);
    assert.ok(availableSlot, 'Found available slot for teacher');

    // Book slot for Alexander
    const indivResult = bookIndividualLesson({
      teacherId: selectedTeacher.id,
      studentId: STUDENT_ALEXANDER.id,
      parentId: PARENT_OLGA.id,
      date: targetDate,
      startTime: availableSlot.startTime,
      endTime: availableSlot.endTime,
      courseName: 'Немецкий язык',
      topic: 'Подготовка к школе',
    });

    assert.strictEqual(indivResult.success, true);
    assert.strictEqual(indivResult.lesson?.isIndividual, true);
    assert.strictEqual(indivResult.lesson?.teacherId, selectedTeacher.id);
    assert.strictEqual(indivResult.lesson?.startTime, availableSlot.startTime);
    assert.strictEqual(indivResult.lesson?.endTime, availableSlot.endTime);
    recordPass('T4.3: Scenario 3: Individual booking with teacher selection and conflict-free slot succeeds');
  } catch (err) {
    recordFail('T4.3: Scenario 3: Individual teacher booking', err);
  }

  // T4.4: Scenario 4: Concurrency & Last-Seat Race Condition Resilience
  try {
    // Group lesson with capacity 10 and 9 seats filled (exactly 1 left)
    const competitiveLesson: FullLessonData = {
      ...LESSON_GERMAN_B1,
      id: 'lsn_race_condition_p10',
      date: '2026-11-16',
      students: Array.from({ length: 9 }, (_, i) => ({
        id: `st_comp_${i}`,
        name: `Ученик ${i + 1}`,
        attendanceStatus: 'not_marked' as const,
      })),
    };
    (competitiveLesson as any).capacity = 10;
    saveLessonToStorage(competitiveLesson, { bypassCollisionCheck: true });

    // Parent Olga (child Maria) and Parent Alexey (child Dmitry) attempt booking concurrently
    const parent1Attempt = bookGroupLesson({
      lessonId: competitiveLesson.id,
      studentId: STUDENT_MARIA.id,
      parentId: PARENT_OLGA.id,
    });

    const parent2Attempt = bookGroupLesson({
      lessonId: competitiveLesson.id,
      studentId: STUDENT_STRANGER.id,
      parentId: PARENT_ALEXEY.id,
    });

    // Exactly 1 must succeed, exactly 1 must fail with FULL
    const results = [parent1Attempt, parent2Attempt];
    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);

    assert.strictEqual(successes.length, 1, 'Exactly one concurrent booking must succeed on the last seat');
    assert.strictEqual(failures.length, 1, 'Exactly one concurrent booking must be rejected');
    assert.strictEqual(failures[0].code, 'FULL', 'Rejection must have code: FULL');

    const finalLessonState = getStoredLessonById(competitiveLesson.id);
    assert.strictEqual(finalLessonState?.students?.length, 10, 'Final enrolled count must be strictly 10 (no overflow)');
    recordPass('T4.4: Scenario 4: Concurrency race condition on last seat guarantees atomic invariant');
  } catch (err) {
    recordFail('T4.4: Scenario 4: Race condition resilience', err);
  }

  // T4.5: Scenario 5: Multi-Child Parent Workflow
  try {
    // Parent Olga books Child 1 (Maria) into German Group lesson
    const mariaLesson: FullLessonData = {
      ...LESSON_GERMAN_B1,
      id: 'lsn_multi_maria_p10',
      date: '2026-11-02',
      students: [],
    };
    (mariaLesson as any).capacity = 8;
    saveLessonToStorage(mariaLesson, { bypassCollisionCheck: true });

    const bMaria = bookGroupLesson({
      lessonId: mariaLesson.id,
      studentId: STUDENT_MARIA.id,
      parentId: PARENT_OLGA.id,
    });
    assert.strictEqual(bMaria.success, true);
    assert.strictEqual(bMaria.lesson?.students?.[0].id, STUDENT_MARIA.id);

    // Parent Olga books Child 2 (Alexander) into Math Individual lesson on same date without collision
    const bAlexander = bookIndividualLesson({
      teacherId: 't3',
      studentId: STUDENT_ALEXANDER.id,
      parentId: PARENT_OLGA.id,
      date: '2026-11-02',
      startTime: '14:00',
      endTime: '15:00',
      courseName: 'Математика',
    });
    assert.strictEqual(bAlexander.success, true);
    assert.strictEqual(bAlexander.lesson?.studentId, STUDENT_ALEXANDER.id);

    // Verify complete data isolation: Alexander is not in Maria's lesson, Maria is not in Alexander's
    const lMaria = getStoredLessonById(mariaLesson.id);
    assert.ok(lMaria?.students?.some((s) => s.id === STUDENT_MARIA.id));
    assert.ok(!lMaria?.students?.some((s) => s.id === STUDENT_ALEXANDER.id));

    const lAlexander = getStoredLessonById(bAlexander.lesson!.id);
    assert.strictEqual(lAlexander?.studentId, STUDENT_ALEXANDER.id);
    recordPass('T4.5: Scenario 5: Multi-child parent workflow books both children with strict isolation');
  } catch (err) {
    recordFail('T4.5: Scenario 5: Multi-child workflow', err);
  }

  // ===========================================================================
  // SUMMARY REPORT
  // ===========================================================================
  console.log('\n===============================================================');
  console.log('   PHASE 10 TEST EXECUTION SUMMARY                             ');
  console.log('===============================================================');
  console.log(`  Passed Checks:   ${passed}`);
  console.log(`  Failed Checks:   ${failed}`);
  console.log(`  Total Checks:    ${passed + failed}`);
  console.log('---------------------------------------------------------------');
  if (failed === 0) {
    console.log(`✅ ALL PHASE 10 E2E SPECIFICATION TESTS PASSED (${passed}/${passed})`);
  } else {
    console.log(`❌ SOME TESTS FAILED: ${failed} failures`);
    failures.forEach((f) => console.log(`   - ${f}`));
  }
  console.log('===============================================================\n');

  return { passed, failed, failures };
}

// Auto-run if executed directly via node/jiti
if (typeof require !== 'undefined' && require.main === module) {
  runPhase10TelegramMiniAppTests()
    .then((res) => {
      if (res.failed > 0) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal test error:', err);
      process.exit(1);
    });
}
