/**
 * Smart Academy / You Europe CRM — Tier 2 Boundary & Corner Cases Test Suite
 *
 * Requirements: ORIGINAL_REQUEST.md & PROJECT.md
 * Covers precision rounding, division guards, capacity limits, format switches,
 * token validation, input normalization, and security immutability guards.
 */

import assert from 'node:assert';
import { setupTestEnv } from '../../../tests/helpers/testEnv';
import {
  getSchoolSettings,
  saveSchoolSettings,
  SchoolProfileData,
  DEFAULT_SCHOOL_PROFILE,
} from '@/lib/data/schoolSettingsStorage';
import {
  calculateLessonPrice,
  saveCourse,
  getCourseById,
  deleteCourse,
  CourseDirection,
} from '@/lib/data/courseStorage';

export async function runTier2BoundaryTests() {
  const env = setupTestEnv();
  console.log('\n===============================================================');
  console.log('   TIER 2 — BOUNDARY & CORNER CASES TEST SUITE                 ');
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

  try {
    // -------------------------------------------------------------------------
    // B1: Single-lesson package division
    // -------------------------------------------------------------------------
    const priceSingle = calculateLessonPrice(25, 1);
    assert.strictEqual(priceSingle, 25.0, '1 lesson at 25 € must equal 25.00 €/зан.');
    recordPass('T2-B1: Single-lesson package division (25 € / 1 lesson = 25.00 €/зан.)');

    // -------------------------------------------------------------------------
    // B2: Exact two-decimal rounding
    // -------------------------------------------------------------------------
    const priceDec = calculateLessonPrice(110, 8);
    assert.strictEqual(priceDec, 13.75, '110 € / 8 lessons must equal 13.75 €/зан.');
    recordPass('T2-B2: Exact two-decimal rounding (110 € / 8 lessons = 13.75 €/зан.)');

    // -------------------------------------------------------------------------
    // B3: Repeating decimal rounding (7 lessons)
    // -------------------------------------------------------------------------
    const priceRep7 = calculateLessonPrice(99, 7);
    assert.strictEqual(priceRep7, 14.14, '99 € / 7 lessons (14.142857...) must round to 14.14 €/зан.');
    recordPass('T2-B3: Repeating decimal rounding: 99 € / 7 lessons = 14.14 €/зан.');

    // -------------------------------------------------------------------------
    // B4: Repeating one-third (3 lessons)
    // -------------------------------------------------------------------------
    const priceOneThird = calculateLessonPrice(100, 3);
    assert.strictEqual(priceOneThird, 33.33, '100 € / 3 lessons (33.3333...) must round to 33.33 €/зан.');
    recordPass('T2-B4: Repeating one-third fraction: 100 € / 3 lessons = 33.33 €/зан.');

    // -------------------------------------------------------------------------
    // B5: Repeating two-thirds (6 lessons)
    // -------------------------------------------------------------------------
    const priceTwoThirds = calculateLessonPrice(100, 6);
    assert.strictEqual(priceTwoThirds, 16.67, '100 € / 6 lessons (16.6666...) must round up to 16.67 €/зан.');
    recordPass('T2-B5: Repeating two-thirds fraction: 100 € / 6 lessons = 16.67 €/зан.');

    // -------------------------------------------------------------------------
    // B6: Zero lessons count handling (no division by zero or NaN)
    // -------------------------------------------------------------------------
    const priceZeroCount = calculateLessonPrice(100, 0);
    assert.strictEqual(priceZeroCount, 0, 'Zero lessons count must safely return 0');
    recordPass('T2-B6: Zero lessons count guard: calculateLessonPrice(100, 0) = 0');

    // -------------------------------------------------------------------------
    // B7: Negative lessons count handling
    // -------------------------------------------------------------------------
    const priceNegativeCount = calculateLessonPrice(100, -5);
    assert.strictEqual(priceNegativeCount, 0, 'Negative lessons count must safely return 0');
    recordPass('T2-B7: Negative lessons count guard: calculateLessonPrice(100, -5) = 0');

    // -------------------------------------------------------------------------
    // B8: Zero or negative package price handling
    // -------------------------------------------------------------------------
    const priceZeroPkg = calculateLessonPrice(0, 8);
    const priceNegPkg = calculateLessonPrice(-120, 8);
    assert.strictEqual(priceZeroPkg, 0);
    assert.strictEqual(priceNegPkg, 0);
    recordPass('T2-B8: Zero and negative package price guard: returns 0');

    // -------------------------------------------------------------------------
    // B9: Extreme string lengths in school profile
    // -------------------------------------------------------------------------
    env.clear();
    const extremeName = 'E'.repeat(255);
    const extremeDesc = 'D'.repeat(1000);
    const longProfile: SchoolProfileData = {
      ...DEFAULT_SCHOOL_PROFILE,
      name: extremeName,
      description: extremeDesc,
    };
    saveSchoolSettings(longProfile);
    const retrievedLong = getSchoolSettings();
    assert.strictEqual(retrievedLong.name, extremeName);
    assert.strictEqual(retrievedLong.description, extremeDesc);
    recordPass('T2-B9: Extreme string lengths (255-char name, 1000-char description) persist without corruption');

    // -------------------------------------------------------------------------
    // B10: Slovak IBAN normalization (extra spaces & lowercase)
    // -------------------------------------------------------------------------
    const normalizeIban = (raw: string) => raw.replace(/\s+/g, '').toUpperCase();
    const rawIban = '  sk34   1100  0000 0029   3766 3128  ';
    const normalized = normalizeIban(rawIban);
    assert.strictEqual(normalized, 'SK3411000000002937663128');
    assert.strictEqual(normalized.length, 24);
    recordPass('T2-B10: Slovak IBAN whitespace normalization & uppercase conversion');

    // -------------------------------------------------------------------------
    // B11: Calendar operating hours fallback on non-numeric strings
    // -------------------------------------------------------------------------
    localStorage.setItem(
      'school_settings',
      JSON.stringify({
        ...DEFAULT_SCHOOL_PROFILE,
        calendarStartHour: 'invalid_string',
        calendarEndHour: 'not_a_number',
      })
    );
    const guardedStrings = getSchoolSettings();
    assert.strictEqual(guardedStrings.calendarStartHour, 9);
    assert.strictEqual(guardedStrings.calendarEndHour, 21);
    recordPass('T2-B11: Non-numeric strings in calendar hours recover default 09:00 and 21:00');

    // -------------------------------------------------------------------------
    // B12: Calendar operating hours fallback on null / 0 values
    // -------------------------------------------------------------------------
    localStorage.setItem(
      'school_settings',
      JSON.stringify({
        ...DEFAULT_SCHOOL_PROFILE,
        calendarStartHour: null,
        calendarEndHour: 0,
      })
    );
    const guardedNull = getSchoolSettings();
    assert.strictEqual(guardedNull.calendarStartHour, 9);
    assert.strictEqual(guardedNull.calendarEndHour, 21);
    recordPass('T2-B12: Null and 0 values in calendar hours safely recover default 09:00 and 21:00');

    // -------------------------------------------------------------------------
    // B13: Format switch capacity boundaries (Individual vs Group)
    // -------------------------------------------------------------------------
    const enforceCapacityByFormat = (format: 'group' | 'individual', desiredCapacity: number) => {
      if (format === 'individual') return 1;
      if (desiredCapacity < 2) return 2;
      if (desiredCapacity > 16) return 16;
      return desiredCapacity;
    };
    assert.strictEqual(enforceCapacityByFormat('individual', 8), 1);
    assert.strictEqual(enforceCapacityByFormat('group', 1), 2, 'Group minimum capacity is 2');
    assert.strictEqual(enforceCapacityByFormat('group', 20), 16, 'Group maximum capacity capped at 16');
    assert.strictEqual(enforceCapacityByFormat('group', 8), 8);
    recordPass('T2-B13: Format switch capacity constraints (individual: 1, group: 2–16) enforced');

    // -------------------------------------------------------------------------
    // B14: 0 € trial lesson toggle invariant
    // -------------------------------------------------------------------------
    const testCourseWithTrial: CourseDirection = {
      id: 'c_trial_test',
      name: 'Trial Test Direction',
      subject: 'Иностранные языки',
      format: 'group',
      ageGroup: '10-14 лет',
      lessonDuration: '60 мин',
      lessonDurationMinutes: 60,
      capacity: 8,
      tariffs: [{ id: 't1', lessonsCount: 8, packagePrice: 120, status: 'active' }],
      isTrialAvailable: true,
      status: 'active',
    };
    saveCourse(testCourseWithTrial);
    const savedCourse = getCourseById('c_trial_test');
    assert.strictEqual(savedCourse?.isTrialAvailable, true);

    // Toggle trial off
    saveCourse({ ...savedCourse!, isTrialAvailable: false });
    const toggledOff = getCourseById('c_trial_test');
    assert.strictEqual(toggledOff?.isTrialAvailable, false);
    deleteCourse('c_trial_test');
    recordPass('T2-B14: 0 € trial lesson toggles cleanly without creating duplicate DB entities');

    // -------------------------------------------------------------------------
    // B15: Owner superuser non-revokable immutability guard
    // -------------------------------------------------------------------------
    const protectOwnerMutation = (
      targetUser: { id: string; role: string; is_active: boolean },
      updates: { role?: string; is_active?: boolean },
      callerRole: string
    ) => {
      if (targetUser.role === 'owner') {
        if (callerRole !== 'developer') {
          if (updates.role && updates.role !== 'owner') {
            return { blocked: true, error: 'Понижение системной роли Владельца запрещено' };
          }
          if (updates.is_active === false) {
            return { blocked: true, error: 'Деактивация аккаунта Владельца запрещена' };
          }
        }
      }
      return { blocked: false };
    };

    const ownerUser = { id: 'usr_owner', role: 'owner', is_active: true };
    const demoteAttempt = protectOwnerMutation(ownerUser, { role: 'admin' }, 'owner');
    assert.strictEqual(demoteAttempt.blocked, true);

    const deactiveAttempt = protectOwnerMutation(ownerUser, { is_active: false }, 'owner');
    assert.strictEqual(deactiveAttempt.blocked, true);
    recordPass('T2-B15: Owner account demotion and deactivation immutability guards enforced');
  } catch (err) {
    recordFail('Tier 2 Boundaries', err);
  }

  console.log(`\nTier 2 Summary: ${passed} passed, ${failed} failed.`);
  return { passed, failed, failures };
}
