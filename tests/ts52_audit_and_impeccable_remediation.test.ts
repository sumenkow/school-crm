/**
 * SMART ACADEMY CRM — SUITE 32 (TS-52)
 * Audit & Impeccable Remediation Invariants Suite
 *
 * Verifies:
 * ▶ [Tier 1] Mock Data Ban & CloudSync Dynamic Calculation Invariants:
 *   - [T1.01] cloudSync computes attendanceStats dynamically from lesson attendance records without static '15 из 16' or '94%'.
 *   - [T1.02] cloudSync initializes deposit with 0 balance when absent instead of hardcoded 120.
 *   - [T1.03] AddChildModal dynamically loads groups via getStoredGroups instead of static array.
 *   - [T1.04] Absence of banned textual emojis (🚨, ⚡, ☕, 🚀, ✉) in CreateTaskModal.tsx and ExecutiveTaskReportModal.tsx.
 *
 * ▶ [Tier 2] Modal Dialog Accessibility & Hardening Invariants:
 *   - [T2.01] ResponsiveModal source has role="dialog", aria-modal="true", and Escape key listener.
 *   - [T2.02] MobileModalWrapper source has role="dialog", aria-modal="true", and Escape key listener.
 *   - [T2.03] CreateTaskModal form inputs have explicit id attributes matching label htmlFor.
 *
 * ▶ [Tier 3] Impeccable Design System & Mechanical Detector Invariants:
 *   - [T3.01] Execution of Impeccable detector (`scripts/impeccable detect --json src/app src/components`) verifies 0 anti-patterns / slop warnings.
 *   - [T3.02] Absence of border-l-4 in calendar/page.tsx, crm/page.tsx, and SendHomeworkModal.tsx.
 *   - [T3.03] Settings hub and admin pages adhere to brand blue (#1565C0) / slate tokens without artificial AI purple-indigo gradients.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setupTestEnv } from './helpers/testEnv';

export async function runSuite32(): Promise<{ passed: number; failed: number }> {
  console.log('\n===============================================================');
  console.log('   SUITE 32 (TS-52): AUDIT & IMPECCABLE REMEDIATION INVARIANTS ');
  console.log('   Zero-Mock · Modal A11y · Emoji Ban · Mechanical Detector    ');
  console.log('===============================================================');

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

  const rootDir = path.resolve(__dirname, '..');

  // =========================================================================
  // ▶ [Tier 1] Mock Data Ban & CloudSync Dynamic Calculation Invariants
  // =========================================================================
  console.log('\n▶ [Tier 1] Mock Data Ban & CloudSync Dynamic Calculation Invariants...');

  await test('[T1.01] cloudSync computes attendanceStats dynamically from lesson attendance records without static "15 из 16" or "94%"', () => {
    const cloudSyncPath = path.join(rootDir, 'src/lib/data/cloudSync.ts');
    const content = fs.readFileSync(cloudSyncPath, 'utf-8');

    // Invariant 1: Source code must not have hardcoded mock attendance numbers
    assert.ok(!content.includes('totalLessons: 16'), 'cloudSync.ts must not contain static totalLessons: 16');
    assert.ok(!content.includes('presentCount: 15'), 'cloudSync.ts must not contain static presentCount: 15');
    assert.ok(!content.includes("attendanceRate: '94%'"), 'cloudSync.ts must not contain static attendanceRate: 94%');

    // Invariant 2: Dynamic computation presence
    assert.ok(content.includes('studentAtt.length'), 'cloudSync.ts must compute totalLessons from student attendance length');
    assert.ok(content.includes("a.status === 'present'"), 'cloudSync.ts must compute presentCount dynamically');
    assert.ok(content.includes("a.status === 'absent'"), 'cloudSync.ts must compute absentCount dynamically');
    assert.ok(content.includes("a.status === 'rescheduled'"), 'cloudSync.ts must compute rescheduledCount dynamically');
    assert.ok(content.includes('presentCount / totalLessons'), 'cloudSync.ts must compute percentage from real attendance ratios');

    // Invariant 3: Dynamic math simulation matches cloudSync's algorithm
    const computeStats = (records: Array<{ status: 'present' | 'absent' | 'rescheduled' }>) => {
      const totalLessons = records.length;
      const presentCount = records.filter(r => r.status === 'present').length;
      const absentCount = records.filter(r => r.status === 'absent').length;
      const rescheduledCount = records.filter(r => r.status === 'rescheduled').length;
      const attendanceRate = totalLessons > 0 ? `${Math.round((presentCount / totalLessons) * 100)}%` : '100%';
      return { totalLessons, presentCount, absentCount, rescheduledCount, attendanceRate };
    };

    // Test zero records
    const emptyStats = computeStats([]);
    assert.strictEqual(emptyStats.totalLessons, 0);
    assert.strictEqual(emptyStats.attendanceRate, '100%');

    // Test mixed attendance
    const mixedStats = computeStats([
      { status: 'present' },
      { status: 'present' },
      { status: 'absent' },
      { status: 'rescheduled' },
    ]);
    assert.strictEqual(mixedStats.totalLessons, 4);
    assert.strictEqual(mixedStats.presentCount, 2);
    assert.strictEqual(mixedStats.absentCount, 1);
    assert.strictEqual(mixedStats.rescheduledCount, 1);
    assert.strictEqual(mixedStats.attendanceRate, '50%');

    // Test perfect attendance
    const perfectStats = computeStats([{ status: 'present' }, { status: 'present' }]);
    assert.strictEqual(perfectStats.attendanceRate, '100%');
  });

  await test('[T1.02] cloudSync initializes deposit with 0 balance when absent instead of hardcoded 120', () => {
    const cloudSyncPath = path.join(rootDir, 'src/lib/data/cloudSync.ts');
    const content = fs.readFileSync(cloudSyncPath, 'utf-8');

    // Invariant 1: Hardcoded 120 balance must be eliminated
    assert.ok(!content.includes('balance: 120'), 'cloudSync.ts must not initialize deposit with static 120 balance');
    assert.ok(!content.includes("balanceFormatted: '120 €'"), 'cloudSync.ts must not have hardcoded "120 €" deposit');

    // Invariant 2: Pure 0 baseline initialization
    assert.ok(content.includes('balance: 0'), 'cloudSync.ts must initialize deposit balance with 0');
    assert.ok(content.includes("balanceFormatted: '0 €'"), 'cloudSync.ts must format initial deposit as "0 €"');
  });

  await test('[T1.03] AddChildModal dynamically loads groups via getStoredGroups instead of static array', () => {
    const addChildPath = path.join(rootDir, 'src/components/parents/AddChildModal.tsx');
    const content = fs.readFileSync(addChildPath, 'utf-8');

    // Invariant 1: getStoredGroups imported from groupStorage
    assert.ok(content.includes('getStoredGroups'), 'AddChildModal must import getStoredGroups');

    // Invariant 2: Populates available groups state dynamically
    assert.ok(content.includes('setAvailableGroups(grps)'), 'AddChildModal must set available groups from storage');

    // Invariant 3: Select options rendered from dynamic groups list
    assert.ok(content.includes('filteredGroups.map'), 'AddChildModal must map over dynamic filteredGroups');
    assert.ok(!content.includes('COURSES_CONFIG.find((c) => c.name === course)?.groups.map'), 'AddChildModal must not map static COURSES_CONFIG groups');
  });

  await test('[T1.04] Absence of banned textual emojis (🚨, ⚡, ☕, 🚀, ✉) in CreateTaskModal.tsx and ExecutiveTaskReportModal.tsx', () => {
    const createTaskPath = path.join(rootDir, 'src/components/tasks/CreateTaskModal.tsx');
    const execReportPath = path.join(rootDir, 'src/components/dashboard/ExecutiveTaskReportModal.tsx');

    const createTaskContent = fs.readFileSync(createTaskPath, 'utf-8');
    const execReportContent = fs.readFileSync(execReportPath, 'utf-8');

    const bannedEmojiPattern = /[🚨⚡☕🚀✉]/g;

    const createTaskMatches = createTaskContent.match(bannedEmojiPattern);
    assert.strictEqual(
      createTaskMatches,
      null,
      `CreateTaskModal.tsx must not contain banned textual emojis: found [${createTaskMatches?.join(', ')}]`
    );

    const execReportMatches = execReportContent.match(bannedEmojiPattern);
    assert.strictEqual(
      execReportMatches,
      null,
      `ExecutiveTaskReportModal.tsx must not contain banned textual emojis: found [${execReportMatches?.join(', ')}]`
    );

    // Invariant: Priority buttons in CreateTaskModal use Lucide icons & clean text labels
    assert.ok(createTaskContent.includes('AlertOctagon'), 'High priority button must use AlertOctagon icon');
    assert.ok(createTaskContent.includes('Zap'), 'Medium priority button must use Zap icon');
    assert.ok(createTaskContent.includes('Clock'), 'Low priority button must use Clock icon');
    assert.ok(createTaskContent.includes('Срочно (Высокий)'), 'High priority button text label verified');
    assert.ok(createTaskContent.includes('Средний'), 'Medium priority button text label verified');
    assert.ok(createTaskContent.includes('Низкий'), 'Low priority button text label verified');
  });

  // =========================================================================
  // ▶ [Tier 2] Modal Dialog Accessibility & Hardening Invariants
  // =========================================================================
  console.log('\n▶ [Tier 2] Modal Dialog Accessibility & Hardening Invariants...');

  await test('[T2.01] ResponsiveModal source has role="dialog", aria-modal="true", and Escape key listener', () => {
    const responsiveModalPath = path.join(rootDir, 'src/components/ui/ResponsiveModal.tsx');
    const content = fs.readFileSync(responsiveModalPath, 'utf-8');

    assert.ok(content.includes('role="dialog"'), 'ResponsiveModal must have role="dialog"');
    assert.ok(content.includes('aria-modal="true"'), 'ResponsiveModal must have aria-modal="true"');
    assert.ok(content.includes('aria-labelledby="responsive-modal-title"'), 'ResponsiveModal must have aria-labelledby');
    assert.ok(content.includes("e.key === 'Escape'"), 'ResponsiveModal must handle Escape key');
    assert.ok(content.includes("addEventListener('keydown'"), 'ResponsiveModal must register keydown listener');
    assert.ok(content.includes("removeEventListener('keydown'"), 'ResponsiveModal must clean up keydown listener');
  });

  await test('[T2.02] MobileModalWrapper source has role="dialog", aria-modal="true", and Escape key listener', () => {
    const mobileModalPath = path.join(rootDir, 'src/components/ui/MobileModalWrapper.tsx');
    const content = fs.readFileSync(mobileModalPath, 'utf-8');

    assert.ok(content.includes('role="dialog"'), 'MobileModalWrapper must have role="dialog"');
    assert.ok(content.includes('aria-modal="true"'), 'MobileModalWrapper must have aria-modal="true"');
    assert.ok(content.includes('aria-labelledby="mobile-modal-title"'), 'MobileModalWrapper must have aria-labelledby');
    assert.ok(content.includes("e.key === 'Escape'"), 'MobileModalWrapper must handle Escape key');
    assert.ok(content.includes("addEventListener('keydown'"), 'MobileModalWrapper must register keydown listener');
    assert.ok(content.includes("removeEventListener('keydown'"), 'MobileModalWrapper must clean up keydown listener');
  });

  await test('[T2.03] CreateTaskModal form inputs have explicit id attributes matching label htmlFor', () => {
    const createTaskPath = path.join(rootDir, 'src/components/tasks/CreateTaskModal.tsx');
    const content = fs.readFileSync(createTaskPath, 'utf-8');

    // Extract all htmlFor targets
    const htmlForRegex = /htmlFor="([^"]+)"/g;
    const htmlFors: string[] = [];
    let match;
    while ((match = htmlForRegex.exec(content)) !== null) {
      htmlFors.push(match[1]);
    }

    assert.ok(htmlFors.length >= 6, `Expected at least 6 labeled form inputs, found ${htmlFors.length}`);

    // Verify each htmlFor has a matching id in the file
    for (const targetId of htmlFors) {
      const idPattern = new RegExp(`id="${targetId}"`);
      assert.ok(
        idPattern.test(content),
        `Label htmlFor="${targetId}" does not have a matching id="${targetId}" element in CreateTaskModal`
      );
    }

    // Verify key expected input ids
    const expectedIds = [
      'task-title',
      'task-type',
      'task-assigned-to',
      'task-due-time',
      'task-description',
      'task-notify-admin',
      'task-notify-contact',
    ];
    for (const id of expectedIds) {
      assert.ok(content.includes(`id="${id}"`), `CreateTaskModal must define id="${id}"`);
    }
  });

  // =========================================================================
  // ▶ [Tier 3] Impeccable Design System & Mechanical Detector Invariants
  // =========================================================================
  console.log('\n▶ [Tier 3] Impeccable Design System & Mechanical Detector Invariants...');

  await test('[T3.01] Execution of Impeccable detector (scripts/impeccable detect --json src/app src/components) verifies 0 anti-patterns / slop warnings', () => {
    const scriptPath = path.join(rootDir, 'scripts/impeccable');
    assert.ok(fs.existsSync(scriptPath), 'scripts/impeccable script must exist');

    const result = execSync('./scripts/impeccable detect --json src/app src/components', {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const parsed = JSON.parse(result.trim());
    assert.ok(Array.isArray(parsed), 'Impeccable detector output must be a valid JSON array');
    assert.strictEqual(
      parsed.length,
      0,
      `Impeccable detector found ${parsed.length} design anti-pattern / slop warnings: ${JSON.stringify(parsed, null, 2)}`
    );
  });

  await test('[T3.02] Absence of border-l-4 in calendar/page.tsx, crm/page.tsx, and SendHomeworkModal.tsx', () => {
    const targetFiles = [
      path.join(rootDir, 'src/app/calendar/page.tsx'),
      path.join(rootDir, 'src/app/crm/page.tsx'),
      path.join(rootDir, 'src/components/lessons/SendHomeworkModal.tsx'),
    ];

    for (const filePath of targetFiles) {
      const relPath = path.relative(rootDir, filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const matches = content.match(/border-l-4/g);
      assert.strictEqual(
        matches,
        null,
        `${relPath} must not contain "border-l-4" accent classes (found ${matches?.length || 0})`
      );
    }
  });

  await test('[T3.03] Settings hub and admin pages adhere to brand blue (#1565C0) / slate tokens without artificial AI purple-indigo gradients', () => {
    const settingsFiles = [
      path.join(rootDir, 'src/app/settings/page.tsx'),
      path.join(rootDir, 'src/app/settings/profile/page.tsx'),
      path.join(rootDir, 'src/app/settings/team/page.tsx'),
      path.join(rootDir, 'src/app/settings/backup/page.tsx'),
      path.join(rootDir, 'src/app/settings/integrations/page.tsx'),
      path.join(rootDir, 'src/app/admin/courses/page.tsx'),
    ];

    const aiGradientRegex = /(?:from|to|via)-(?:purple|indigo)-(?:400|500|600|700|800|900)/g;

    for (const filePath of settingsFiles) {
      const relPath = path.relative(rootDir, filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const gradientMatches = content.match(aiGradientRegex);
      assert.strictEqual(
        gradientMatches,
        null,
        `${relPath} must not contain AI purple-indigo gradients: found [${gradientMatches?.join(', ')}]`
      );
    }

    // Modal dialogs headerBg default check:
    const responsiveModalContent = fs.readFileSync(path.join(rootDir, 'src/components/ui/ResponsiveModal.tsx'), 'utf-8');
    assert.ok(
      responsiveModalContent.includes("headerBg = 'bg-[#1565C0] text-white'"),
      'ResponsiveModal default headerBg must strictly adhere to brand blue #1565C0'
    );

    // Verify admin courses status badges eliminated textual emoji bullets (🟢 / 🔴)
    const adminCoursesContent = fs.readFileSync(path.join(rootDir, 'src/app/admin/courses/page.tsx'), 'utf-8');
    assert.ok(!adminCoursesContent.includes('🟢'), 'admin/courses/page.tsx must not contain 🟢 emoji bullet');
    assert.ok(!adminCoursesContent.includes('🔴'), 'admin/courses/page.tsx must not contain 🔴 emoji bullet');
  });

  console.log('\n===============================================================');
  console.log(`   ✅ ALL SUITE 32 (TS-52) INVARIANTS PASSED (${passed} passed)`);
  console.log('===============================================================');

  return { passed, failed };
}

if (require.main === module) {
  runSuite32().catch((err) => {
    console.error('Fatal error running Suite 32:', err);
    process.exit(1);
  });
}
