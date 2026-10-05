/**
 * Smart Academy / You Europe CRM — Empirical Stress & Adversarial Test Suite
 * Executed by Challenger 1 (teamwork_preview_challenger_1)
 *
 * Verifies:
 * 1. Dynamic Calculated Pricing (packagePrice / lessonsCount, oracles, fuzzing, repeating decimals, zero manual input)
 * 2. Learning Formats (Individual capacity strictly locked to 1 & '—', Group capacity limits 2-30)
 * 3. 100% Online School Constraints (zero physical rooms, branches, or classrooms)
 * 4. Event broadcasting & SSOT consistency
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { setupTestEnv } from './helpers/testEnv';
import {
  calcPricePerLesson,
  calculateLessonPrice,
  getCourses,
  getCourseById,
  saveCourse,
  deleteCourse,
  archiveCourse,
  searchCourses,
  INITIAL_COURSE_DIRECTIONS,
  CourseDirection,
} from '../src/lib/data/courseStorage';
import {
  getSchoolSettings,
  saveSchoolSettings,
  DEFAULT_SCHOOL_PROFILE,
  SchoolProfileData,
} from '../src/lib/data/schoolSettingsStorage';

export async function runChallengerStressTests() {
  const env = setupTestEnv();
  console.log('\n===============================================================');
  console.log('   CHALLENGER 1 — EMPIRICAL STRESS & ADVERSARIAL HARNESS       ');
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
      console.log(`  ✗ ${name} — ${msg}`);
    }
  }

  // =========================================================================
  // SUITE 1: DYNAMIC CALCULATED PRICING STRESS & ORACLES
  // =========================================================================
  console.log('\n--- Suite 1: Dynamic Calculated Pricing Stress & Oracles ---');

  // Math Oracle function
  const oracleCalc = (pkg: number, count: number): number => {
    if (count <= 0 || pkg <= 0 || !Number.isFinite(pkg) || !Number.isFinite(count)) return 0;
    return Math.round((pkg / count) * 100) / 100;
  };

  test('S1.1: Oracle equivalence for canonical tariff packages', () => {
    const canonicalCases = [
      { pkg: 60, count: 4, expected: 15.0 },
      { pkg: 110, count: 8, expected: 13.75 },
      { pkg: 200, count: 16, expected: 12.5 },
      { pkg: 70, count: 4, expected: 17.5 },
      { pkg: 130, count: 8, expected: 16.25 },
      { pkg: 240, count: 16, expected: 15.0 },
      { pkg: 80, count: 4, expected: 20.0 },
      { pkg: 150, count: 8, expected: 18.75 },
      { pkg: 280, count: 16, expected: 17.5 },
      { pkg: 140, count: 4, expected: 35.0 },
      { pkg: 260, count: 8, expected: 32.5 },
      { pkg: 480, count: 16, expected: 30.0 },
    ];

    for (const c of canonicalCases) {
      const res1 = calculateLessonPrice(c.pkg, c.count);
      const res2 = calcPricePerLesson({ packagePrice: c.pkg, lessonsCount: c.count });
      const oracle = oracleCalc(c.pkg, c.count);

      assert.strictEqual(res1, c.expected, `calculateLessonPrice(${c.pkg}, ${c.count}) mismatch`);
      assert.strictEqual(res2, c.expected, `calcPricePerLesson object mismatch`);
      assert.strictEqual(res1, oracle, `Oracle mismatch for ${c.pkg} / ${c.count}`);
    }
  });

  test('S1.2: Boundary cases: single lesson (1 lesson)', () => {
    assert.strictEqual(calculateLessonPrice(25, 1), 25.0);
    assert.strictEqual(calculateLessonPrice(100, 1), 100.0);
    assert.strictEqual(calculateLessonPrice(1, 1), 1.0);
  });

  test('S1.3: Boundary cases: zero & negative lessons count', () => {
    assert.strictEqual(calculateLessonPrice(100, 0), 0, '0 lessons must return 0');
    assert.strictEqual(calculateLessonPrice(100, -1), 0, '-1 lessons must return 0');
    assert.strictEqual(calculateLessonPrice(100, -100), 0, '-100 lessons must return 0');
  });

  test('S1.4: Boundary cases: zero & negative package prices', () => {
    assert.strictEqual(calculateLessonPrice(0, 8), 0, '0 price must return 0');
    assert.strictEqual(calculateLessonPrice(-50, 8), 0, '-50 price must return 0');
    assert.strictEqual(calculateLessonPrice(-1000, 4), 0, '-1000 price must return 0');
  });

  test('S1.5: Repeating & fractional divisions to exactly 2 decimals', () => {
    const fractions = [
      { pkg: 100, count: 3, expected: 33.33 },
      { pkg: 99, count: 7, expected: 14.14 },
      { pkg: 100, count: 6, expected: 16.67 },
      { pkg: 1, count: 3, expected: 0.33 },
      { pkg: 2, count: 3, expected: 0.67 },
      { pkg: 10, count: 3, expected: 3.33 },
      { pkg: 70, count: 3, expected: 23.33 },
      { pkg: 140, count: 3, expected: 46.67 },
      { pkg: 200, count: 7, expected: 28.57 },
      { pkg: 350, count: 9, expected: 38.89 },
      { pkg: 110, count: 9, expected: 12.22 },
      { pkg: 130, count: 11, expected: 11.82 },
      { pkg: 50, count: 7, expected: 7.14 },
    ];

    for (const f of fractions) {
      const res = calculateLessonPrice(f.pkg, f.count);
      assert.strictEqual(res, f.expected, `Fraction ${f.pkg} / ${f.count} got ${res}, expected ${f.expected}`);
    }
  });

  test('S1.6: Fuzzing / Random Generator Test (1,000 randomized cases)', () => {
    for (let i = 0; i < 1000; i++) {
      const randPkg = Math.floor(Math.random() * 5000) + 1; // 1..5000 €
      const randCount = Math.floor(Math.random() * 100) + 1; // 1..100 lessons
      const calculated = calculateLessonPrice(randPkg, randCount);
      const expected = oracleCalc(randPkg, randCount);

      assert.strictEqual(
        calculated,
        expected,
        `Fuzz failure at pkg=${randPkg}, count=${randCount}: calculated ${calculated} vs oracle ${expected}`
      );
    }
  });

  test('S1.7: Hostile & non-numeric values in calcPricePerLesson', () => {
    assert.strictEqual(calcPricePerLesson(null), 0);
    assert.strictEqual(calcPricePerLesson(undefined), 0);
    assert.strictEqual(calcPricePerLesson({}), 0);
    assert.strictEqual(calcPricePerLesson({ packagePrice: 120 }), 0);
    assert.strictEqual(calcPricePerLesson({ lessonsCount: 8 }), 0);
    assert.strictEqual(calcPricePerLesson(NaN as any, 8), 0);
    assert.strictEqual(calcPricePerLesson(100, NaN as any), 0);
  });

  test('S1.8: Verification of NO manual lesson price storage or input', () => {
    // 1. Inspect courseStorage.ts source
    const courseStoragePath = path.resolve(__dirname, '../src/lib/data/courseStorage.ts');
    const courseStorageSource = fs.readFileSync(courseStoragePath, 'utf8');

    // CourseTariff must not have lessonPrice property
    const tariffInterfaceMatch = courseStorageSource.match(/export interface CourseTariff {([\s\S]*?)}/);
    assert(tariffInterfaceMatch, 'CourseTariff interface must exist');
    assert(
      !tariffInterfaceMatch[1].includes('lessonPrice'),
      'CourseTariff MUST NOT contain a manual lessonPrice field'
    );
    assert(
      !tariffInterfaceMatch[1].includes('pricePerLesson'),
      'CourseTariff MUST NOT contain a manual pricePerLesson field'
    );

    // 2. Inspect CourseDirectionDrawer.tsx source
    const drawerPath = path.resolve(__dirname, '../src/components/settings/CourseDirectionDrawer.tsx');
    const drawerSource = fs.readFileSync(drawerPath, 'utf8');

    // Confirm price per lesson is rendered as read-only badge, not input
    assert(
      drawerSource.includes('{pricePerLesson.toFixed(2)} €/зан.'),
      'Price per lesson must be rendered as formatted read-only text'
    );
    assert(
      !drawerSource.includes('handleUpdateTariff(index, \'pricePerLesson\''),
      'No handler for manual pricePerLesson input can exist'
    );
    assert(
      !drawerSource.includes('handleUpdateTariff(index, \'lessonPrice\''),
      'No handler for manual lessonPrice input can exist'
    );
  });

  // =========================================================================
  // SUITE 2: LEARNING FORMATS & CAPACITY LIMITS
  // =========================================================================
  console.log('\n--- Suite 2: Learning Formats & Capacity Limits ---');

  test('S2.1: Individual format capacity is strictly locked to 1 in storage', () => {
    env.clear();
    // Attempt to save an individual course with a rogue capacity of 10
    const rogueIndiv = saveCourse({
      name: 'Rogue Individual Course',
      format: 'individual',
      capacity: 10,
      subject: 'Иностранные языки',
      ageGroup: 'Любой возраст',
      lessonDurationMinutes: 60,
      tariffs: [{ id: 't1', lessonsCount: 4, packagePrice: 140, status: 'active' }],
    });

    assert.strictEqual(
      rogueIndiv.capacity,
      1,
      'normalizeCourseDirection must force capacity to 1 for individual format'
    );
    assert.strictEqual(
      rogueIndiv.maxStudents,
      1,
      'maxStudents compatibility field must also be 1'
    );

    const fetched = getCourseById(rogueIndiv.id);
    assert.strictEqual(fetched?.capacity, 1, 'Persisted individual course capacity must be 1');
  });

  test('S2.2: Individual format displays «—» in table and card UI code', () => {
    const adminCoursesPath = path.resolve(__dirname, '../src/app/admin/courses/page.tsx');
    const adminCoursesSource = fs.readFileSync(adminCoursesPath, 'utf8');

    // Table view check
    assert(
      adminCoursesSource.includes("{isIndiv ? (\n                            <span\n                              className=\"text-slate-400 font-bold text-sm select-none\"") ||
      adminCoursesSource.includes("isIndiv ? (\n                            <span") ||
      adminCoursesSource.includes("isIndiv ? '—' :"),
      'Admin courses page must render "—" for individual format'
    );

    // Cards view check
    assert(
      adminCoursesSource.includes("{isIndiv ? '—' : `${direction.capacity} уч.`}"),
      'Cards view must display "—" for individual format and "{capacity} уч." for group'
    );

    // Drawer check
    const drawerPath = path.resolve(__dirname, '../src/components/settings/CourseDirectionDrawer.tsx');
    const drawerSource = fs.readFileSync(drawerPath, 'utf8');
    assert(
      drawerSource.includes('value="—"') && drawerSource.includes('disabled'),
      'Drawer must render a disabled input with value "—" when format is individual'
    );
  });

  test('S2.3: All 26 INITIAL_COURSE_DIRECTIONS satisfy format & capacity rules', () => {
    assert.strictEqual(INITIAL_COURSE_DIRECTIONS.length, 26, 'Must have exactly 26 initial directions');

    const indivs = INITIAL_COURSE_DIRECTIONS.filter((c) => c.format === 'individual');
    const groups = INITIAL_COURSE_DIRECTIONS.filter((c) => c.format === 'group');

    assert.strictEqual(indivs.length, 4, 'Must have 4 canonical individual directions');
    assert.strictEqual(groups.length, 22, 'Must have 22 canonical group directions');

    for (const ind of indivs) {
      assert.strictEqual(ind.capacity, 1, `Individual direction ${ind.id} must have capacity 1`);
    }

    for (const grp of groups) {
      assert(
        grp.capacity >= 2 && grp.capacity <= 30,
        `Group direction ${grp.id} capacity ${grp.capacity} must be in [2, 30]`
      );
      assert(
        grp.capacity === 6 || grp.capacity === 8,
        `Group direction ${grp.id} capacity must be default 6 or 8 (found ${grp.capacity})`
      );
    }
  });

  test('S2.4: Group capacity handling in Drawer (min=2, max=30, default 8)', () => {
    const drawerPath = path.resolve(__dirname, '../src/components/settings/CourseDirectionDrawer.tsx');
    const drawerSource = fs.readFileSync(drawerPath, 'utf8');

    assert(
      drawerSource.includes('min={2}'),
      'Capacity input must enforce min={2}'
    );
    assert(
      drawerSource.includes('max={30}'),
      'Capacity input must enforce max={30}'
    );
    assert(
      drawerSource.includes('if (capacity <= 1) setCapacity(8)'),
      'Switching from individual to group must reset capacity to default 8'
    );
  });

  test('S2.5: Group direction storage & update with valid capacities (2, 8, 16, 30)', () => {
    env.clear();
    for (const cap of [2, 8, 16, 30]) {
      const saved = saveCourse({
        name: `Group Direction ${cap}`,
        format: 'group',
        capacity: cap,
        subject: 'Точные науки',
        ageGroup: '10-15 лет',
        lessonDurationMinutes: 60,
        tariffs: [{ id: 't1', lessonsCount: 8, packagePrice: 120, status: 'active' }],
      });

      assert.strictEqual(saved.capacity, cap);
      const fetched = getCourseById(saved.id);
      assert.strictEqual(fetched?.capacity, cap);
    }
  });

  test('S2.6: Group capacity boundary enforcement (clamping to [2, 30])', () => {
    env.clear();
    // Test 1: Rogue group with capacity = 1 (violates group minimum 2)
    const grpLow = saveCourse({
      name: 'Group Low Capacity',
      format: 'group',
      capacity: 1,
      subject: 'Точные науки',
      ageGroup: '10-15 лет',
      lessonDurationMinutes: 60,
      tariffs: [{ id: 't1', lessonsCount: 8, packagePrice: 120, status: 'active' }],
    });
    assert(
      grpLow.capacity >= 2,
      `Group capacity 1 must be clamped to minimum 2, but got ${grpLow.capacity}`
    );

    // Test 2: Rogue group with capacity = 50 (violates group maximum 30)
    const grpHigh = saveCourse({
      name: 'Group High Capacity',
      format: 'group',
      capacity: 50,
      subject: 'Точные науки',
      ageGroup: '10-15 лет',
      lessonDurationMinutes: 60,
      tariffs: [{ id: 't1', lessonsCount: 8, packagePrice: 120, status: 'active' }],
    });
    assert(
      grpHigh.capacity <= 30,
      `Group capacity 50 must be clamped to maximum 30, but got ${grpHigh.capacity}`
    );
  });

  // =========================================================================
  // SUITE 3: 100% ONLINE SCHOOL CONSTRAINTS
  // =========================================================================
  console.log('\n--- Suite 3: 100% Online School Constraints ---');

  test('S3.1: DEFAULT_SCHOOL_PROFILE enforces online-only properties', () => {
    assert.strictEqual(DEFAULT_SCHOOL_PROFILE.schoolFormat, 'online');
    assert.strictEqual(DEFAULT_SCHOOL_PROFILE.branchName, 'Онлайн-школа');
    assert.strictEqual(DEFAULT_SCHOOL_PROFILE.address, '');
    assert.strictEqual(DEFAULT_SCHOOL_PROFILE.roomsDescription, 'Интерактивные онлайн-комнаты');
    assert.strictEqual(DEFAULT_SCHOOL_PROFILE.onlinePlatform, 'Zoom');
    assert.strictEqual(DEFAULT_SCHOOL_PROFILE.currency, 'EUR');
  });

  test('S3.2: getSchoolSettings strictly sanitizes schoolFormat to online', () => {
    env.clear();
    // Simulate malicious/corrupted offline profile injection in localStorage
    localStorage.setItem(
      'crm_school_profile_v1',
      JSON.stringify({
        name: 'Offline Academy',
        schoolFormat: 'offline',
        branchName: 'Филиал на Ленина',
        address: 'ул. Ленина, д. 42',
        roomsDescription: 'Аудитории 101, 102',
      })
    );

    const settings = getSchoolSettings();
    assert.strictEqual(
      settings.schoolFormat,
      'online',
      'getSchoolSettings must strictly override schoolFormat to online'
    );
    assert.strictEqual(
      settings.currency,
      'EUR',
      'getSchoolSettings must strictly override currency to EUR'
    );
  });

  test('S3.3: School Profile UI enforces Zero Classrooms architecture', () => {
    const profilePagePath = path.resolve(__dirname, '../src/app/settings/profile/page.tsx');
    const profilePageSource = fs.readFileSync(profilePagePath, 'utf8');

    // Verify presence of Zero Classrooms lock badge
    assert(
      profilePageSource.includes('Системное ограничение (Zero Classrooms)'),
      'Profile page must have "Системное ограничение (Zero Classrooms)" badge'
    );
    assert(
      profilePageSource.includes('Школа работает только в онлайн-формате'),
      'Profile page must state online-only format'
    );

    // Verify handleSave sanitizes physical parameters
    assert(
      profilePageSource.includes("schoolFormat: 'online'"),
      'handleSave must enforce schoolFormat: online'
    );
    assert(
      profilePageSource.includes("address: ''"),
      'handleSave must blank out address'
    );
    assert(
      profilePageSource.includes("branchName: 'Онлайн-школа'"),
      'handleSave must force branchName: Онлайн-школа'
    );
    assert(
      profilePageSource.includes("roomsDescription: 'Интерактивные онлайн-комнаты'"),
      'handleSave must force roomsDescription: Интерактивные онлайн-комнаты'
    );
  });

  test('S3.4: Zero physical rooms across all course directions', () => {
    const courses = getCourses();
    for (const c of courses) {
      assert.strictEqual(
        (c as any).roomId,
        undefined,
        `Course ${c.name} must not contain roomId`
      );
      assert.strictEqual(
        (c as any).classroom,
        undefined,
        `Course ${c.name} must not contain classroom`
      );
      assert.strictEqual(
        (c as any).branchId,
        undefined,
        `Course ${c.name} must not contain branchId`
      );
    }
  });

  // =========================================================================
  // SUITE 4: EVENT BROADCASTING & CRUD RESILIENCE
  // =========================================================================
  console.log('\n--- Suite 4: Event Broadcasting & CRUD Resilience ---');

  test('S4.1: CustomEvent dispatch on course save and delete', () => {
    env.clear();
    let coursesEventFired = false;
    let groupsEventFired = false;

    window.addEventListener('crm-courses-changed', () => {
      coursesEventFired = true;
    });
    window.addEventListener('crm-groups-changed', () => {
      groupsEventFired = true;
    });

    const created = saveCourse({
      name: 'Event Test Course',
      format: 'group',
      capacity: 8,
      subject: 'Развитие интеллекта',
      ageGroup: '7-11 лет',
      lessonDurationMinutes: 45,
      tariffs: [{ id: 't1', lessonsCount: 8, packagePrice: 100, status: 'active' }],
    });

    assert(coursesEventFired, 'crm-courses-changed event must be dispatched on save');
    assert(groupsEventFired, 'crm-groups-changed event must be dispatched on save');

    coursesEventFired = false;
    groupsEventFired = false;

    deleteCourse(created.id);
    assert(coursesEventFired, 'crm-courses-changed event must be dispatched on delete');
    assert(groupsEventFired, 'crm-groups-changed event must be dispatched on delete');
  });

  test('S4.2: Course archiving toggles status between active and archived', () => {
    env.clear();
    const created = saveCourse({
      name: 'Archive Toggle Test',
      format: 'group',
      capacity: 6,
      subject: 'Иностранные языки',
      ageGroup: '10-15 лет',
      lessonDurationMinutes: 60,
      tariffs: [{ id: 't1', lessonsCount: 8, packagePrice: 120, status: 'active' }],
      status: 'active',
    });

    assert.strictEqual(created.status, 'active');

    const archived = archiveCourse(created.id);
    assert.strictEqual(archived?.status, 'archived');
    assert.strictEqual(archived?.is_active, false);

    const unarchived = archiveCourse(created.id);
    assert.strictEqual(unarchived?.status, 'active');
    assert.strictEqual(unarchived?.is_active, true);

    deleteCourse(created.id);
  });

  test('S4.3: searchCourses filters accurately by query, format, and status', () => {
    env.clear();
    const initial = getCourses();
    assert.strictEqual(initial.length, 26);

    // Search by query
    const germanMatches = searchCourses('Немецкий');
    assert(germanMatches.length > 0);
    assert(germanMatches.every((c) => c.name.toLowerCase().includes('немецк')));

    // Search by format: individual
    const indivMatches = searchCourses('', { format: 'individual' });
    assert.strictEqual(indivMatches.length, 4);
    assert(indivMatches.every((c) => c.format === 'individual'));

    // Search by format: group
    const groupMatches = searchCourses('', { format: 'group' });
    assert.strictEqual(groupMatches.length, 22);
    assert(groupMatches.every((c) => c.format === 'group'));

    // Search by status: active
    const activeMatches = searchCourses('', { status: 'active' });
    const archivedMatches = searchCourses('', { status: 'archived' });
    assert.strictEqual(activeMatches.length + archivedMatches.length, 26);
  });

  console.log('\n===============================================================');
  console.log(`CHALLENGER 1 STRESS SUMMARY: ${passed} passed, ${failed} failed.`);
  console.log('===============================================================');

  return { passed, failed, failures };
}

// Auto-run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runChallengerStressTests()
    .then((res) => {
      if (res.failed > 0) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal stress test error:', err);
      process.exit(1);
    });
}
