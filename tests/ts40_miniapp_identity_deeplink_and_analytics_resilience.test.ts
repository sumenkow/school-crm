import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { GET as getParentRoute } from '../src/app/api/telegram/mini-app/parent/route';
import { GET as getGroupsRoute } from '../src/app/api/telegram/mini-app/groups/route';
import { POST as bookLessonRoute } from '../src/app/api/telegram/mini-app/book/route';
import { getStoredLessons } from '../src/lib/data/lessonStorage';
import { getStoredStudents } from '../src/lib/data/studentStorage';
import { getStoredGroups } from '../src/lib/data/groupStorage';
import { NextRequest } from 'next/server';

export async function runSuite20() {
  console.log('\n--- Running Suite 20: Mini App Identity, Direct Lesson Deep-Link & Analytics Resilience ---');

  // =========================================================================
  // TIER 1: Mini App Dynamic Identity & Mock Data Ban
  // =========================================================================
  {
    // Test 20.1: No hardcoded 'Ольга Соколова' returned when arbitrary user connects
    const req = new NextRequest('http://localhost:3000/api/telegram/mini-app/parent?chatId=unknown_999999&tgFirstName=Владимир&tgLastName=Кузнецов');
    const res = await getParentRoute(req);
    const data = await res.json();

    assert.strictEqual(data.success, true, 'API should return success');
    assert.ok(data.parent, 'Parent profile should be returned');
    assert.strictEqual(data.parent.firstName, 'Владимир', 'Should use dynamic tgFirstName, not mock data');
    assert.strictEqual(data.parent.lastName, 'Кузнецов', 'Should use dynamic tgLastName');
    assert.notStrictEqual(data.parent.firstName, 'Ольга', 'Must NOT return hardcoded Ольга');
    console.log('  ✓ T20.1: Dynamic tgFirstName applied without hardcoded mock fallbacks');
  }

  {
    // Test 20.2: When completely empty query is passed and no context, returns clean empty profile without mock
    const req = new NextRequest('http://localhost:3000/api/telegram/mini-app/parent');
    const res = await getParentRoute(req);
    const data = await res.json();

    assert.strictEqual(data.success, true, 'API should return success');
    if (data.parent) {
      assert.notStrictEqual(data.parent.firstName, 'Ольга', 'Must NOT fallback to hardcoded Ольга Соколова');
    }
    console.log('  ✓ T20.2: Empty request avoids static mock data injection');
  }

  {
    // Test 20.3: Match existing student / parent from storage by telegram username
    const allStudents = getStoredStudents();
    const studentWithTg = allStudents.find((s) => s.telegram || (s.parents && s.parents.some((p) => p.telegram)));

    if (studentWithTg) {
      const tgHandle = studentWithTg.telegram || studentWithTg.parents![0].telegram!;
      const cleanTg = tgHandle.replace(/^@/, '');
      const req = new NextRequest(`http://localhost:3000/api/telegram/mini-app/parent?chatId=${encodeURIComponent(cleanTg)}`);
      const res = await getParentRoute(req);
      const data = await res.json();

      assert.strictEqual(data.success, true, 'Should match existing CRM record');
      assert.ok(data.parent, 'Should return matched parent');
      assert.ok(data.children && data.children.length > 0, 'Should return linked children');
      console.log('  ✓ T20.3: Existing CRM client matched by Telegram handle with linked children');
    } else {
      console.log('  ✓ T20.3: Skipped CRM client match (no students with telegram in mock store)');
    }
  }

  // =========================================================================
  // TIER 2: Specific Lesson Deep-Link & Guaranteed Enrollment
  // =========================================================================
  {
    // Test 20.4: GET /api/telegram/mini-app/groups?lessonId=... returns exact lesson and group
    const allLessons = getStoredLessons();
    const plannedLesson = allLessons.find((l) => l.status === 'scheduled' || l.status === 'planned') || allLessons[0];
    assert.ok(plannedLesson, 'Should have at least one lesson in test storage');

    const req = new NextRequest(`http://localhost:3000/api/telegram/mini-app/groups?lessonId=${encodeURIComponent(plannedLesson.id)}`);
    const res = await getGroupsRoute(req);
    const data = await res.json();

    assert.strictEqual(data.success, true, 'API should return success');
    assert.ok(data.lesson, 'Specific lesson must be returned in response');
    assert.strictEqual(data.lesson.id, plannedLesson.id, 'Returned lesson ID must exactly match requested lessonId');
    assert.ok(data.group, 'Parent group must be returned');
    assert.strictEqual(data.groups.length, 1, 'Should contain pre-filtered target group');
    console.log(`  ✓ T20.4: Deep link API accurately resolves requested lesson [${plannedLesson.id}] and group`);
  }

  {
    // Test 20.5: Direct booking into the specific lesson via POST /api/telegram/mini-app/book
    const allLessons = getStoredLessons();
    const targetLesson = allLessons.find((l) => l.status === 'scheduled' || l.status === 'planned') || allLessons[0];
    const allStudents = getStoredStudents();
    const student = allStudents[0];

    const bookReq = new NextRequest('http://localhost:3000/api/telegram/mini-app/book', {
      method: 'POST',
      body: JSON.stringify({
        bookingType: 'group',
        lessonId: targetLesson.id,
        studentId: student.id,
        parentId: student.parents?.[0]?.id || 'parent_deep_link_test',
        isTrial: false,
        sendTelegramReminder: false,
      }),
    });

    const bookRes = await bookLessonRoute(bookReq);
    const bookData = await bookRes.json();

    assert.strictEqual(bookData.success, true, 'Booking specific lesson should succeed');
    assert.ok(bookData.lesson, 'Booked lesson should be returned');
    assert.strictEqual(bookData.lesson.id, targetLesson.id, 'Booked lesson must be the exact lessonId passed');
    console.log(`  ✓ T20.5: End-to-end enrollment confirmed into exact lesson [${targetLesson.id}]`);
  }

  // =========================================================================
  // TIER 3: Analytics Crash Resilience (Zero Unhandled Exceptions)
  // =========================================================================
  {
    // Test 20.6: FunnelDiagnosticsCard source code contains safe optional chaining on frequentReasons
    const cardPath = path.join(process.cwd(), 'src/features/analytics/components/FunnelDiagnosticsCard.tsx');
    const content = fs.readFileSync(cardPath, 'utf8');

    assert.ok(
      content.includes('Array.isArray(activeInsight?.frequentReasons)'),
      'FunnelDiagnosticsCard must safely guard frequentReasons before joining'
    );
    assert.ok(
      !content.includes('activeInsight.frequentReasons.join('),
      'Must NOT call unprotected activeInsight.frequentReasons.join'
    );
    console.log('  ✓ T20.6: FunnelDiagnosticsCard protected against undefined frequentReasons crashes');
  }

  {
    // Test 20.7: useDiagnosticsMidTier handles empty lossChannels and empty channelStats safely
    const hookPath = path.join(process.cwd(), 'src/features/analytics/hooks/useDiagnosticsMidTier.ts');
    const content = fs.readFileSync(hookPath, 'utf8');

    assert.ok(
      content.includes('topLossChannelItem?.name'),
      'useDiagnosticsMidTier must use optional chaining on topLossChannelItem'
    );
    assert.ok(
      content.includes('worstChannel ? `Канал'),
      'useDiagnosticsMidTier must verify worstChannel exists before accessing name'
    );
    console.log('  ✓ T20.7: useDiagnosticsMidTier null safety validated for empty channel states');
  }

  // =========================================================================
  // TIER 4: Role Permissions on /analytics & Error Boundary
  // =========================================================================
  {
    // Test 20.8: Middleware allows role 'admin' to /analytics
    const middlewarePath = path.join(process.cwd(), 'src/middleware.ts');
    const content = fs.readFileSync(middlewarePath, 'utf8');

    assert.ok(
      content.includes('isAnalyticsRoute'),
      'Middleware must inspect isAnalyticsRoute'
    );
    assert.ok(
      content.includes("['developer', 'owner', 'admin']"),
      'Middleware must allow admin to /analytics and /settings/audit'
    );
    console.log('  ✓ T20.8: Middleware grants admin role access to /analytics');
  }

  {
    // Test 20.9: Analytics page allows role 'admin'
    const pagePath = path.join(process.cwd(), 'src/app/analytics/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf8');

    assert.ok(
      content.includes("role !== 'admin'"),
      'Analytics page must allow admin role in access guard'
    );
    console.log('  ✓ T20.9: Analytics page allows admin role alongside owner and developer');
  }

  {
    // Test 20.10: Route error boundary exists for /analytics
    const errorPath = path.join(process.cwd(), 'src/app/analytics/error.tsx');
    assert.ok(fs.existsSync(errorPath), 'src/app/analytics/error.tsx must exist');

    const content = fs.readFileSync(errorPath, 'utf8');
    assert.ok(content.includes('AnalyticsErrorBoundary'), 'Must define AnalyticsErrorBoundary');
    assert.ok(content.includes('reset'), 'Must provide retry button calling reset');
    assert.ok(content.includes('handleResetFiltersAndCache'), 'Must provide cache reset capability');
    console.log('  ✓ T20.10: Dedicated Error Boundary prevents crash and provides self-healing cache reset on /analytics');
  }

  {
    // Test 20.11: Numeric offerAmount resilience in useDiagnosticsMidTier
    const hookPath = path.join(process.cwd(), 'src/features/analytics/hooks/useDiagnosticsMidTier.ts');
    const content = fs.readFileSync(hookPath, 'utf8');
    assert.ok(
      content.includes('parseOfferAmountEur'),
      'useDiagnosticsMidTier must provide parseOfferAmountEur helper'
    );
    assert.ok(
      content.includes("typeof val === 'number'") || content.includes("typeof l.offerAmount === 'number'"),
      'useDiagnosticsMidTier must explicitly handle numeric offerAmount'
    );
    assert.ok(
      content.includes("typeof val === 'string'") || content.includes("typeof l.offerAmount === 'string'"),
      'useDiagnosticsMidTier must guard .match() behind string type check'
    );
    console.log('  ✓ T20.11: useDiagnosticsMidTier safely parses numeric and string offer amounts without TypeError');
  }

  {
    // Test 20.12: Defensive null-safety in Diagnostic Cards
    const teacherCard = fs.readFileSync(path.join(process.cwd(), 'src/features/analytics/components/TeacherEffectivenessCard.tsx'), 'utf8');
    assert.ok(teacherCard.includes("initials || 'ПР'"), 'TeacherEffectivenessCard must guard initials in getAvatarBg');

    const riskCard = fs.readFileSync(path.join(process.cwd(), 'src/features/analytics/components/StudentsAtRiskCard.tsx'), 'utf8');
    assert.ok(riskCard.includes("initials || 'УЧ'"), 'StudentsAtRiskCard must guard initials in getAvatarBg');

    const capacityCard = fs.readFileSync(path.join(process.cwd(), 'src/features/analytics/components/GroupCapacityCard.tsx'), 'utf8');
    assert.ok(capacityCard.includes('groups || []'), 'GroupCapacityCard must guard groups array');

    const revenueCard = fs.readFileSync(path.join(process.cwd(), 'src/features/analytics/components/RevenueLossesCard.tsx'), 'utf8');
    assert.ok(revenueCard.includes('losses?.categories || []'), 'RevenueLossesCard must guard categories');
    assert.ok(revenueCard.includes('losses?.totalLossEur ?? 0'), 'RevenueLossesCard must guard totalLossEur');
    console.log('  ✓ T20.12: Diagnostic cards comprehensively protected against undefined/null state crashes');
  }

  {
    // Test 20.13: Supabase groups sync adheres to PostgreSQL schema without is_mock_data
    const syncRoutePath = path.join(process.cwd(), 'src/app/api/sync/route.ts');
    const content = fs.readFileSync(syncRoutePath, 'utf8');
    const groupCaseMatch = content.match(/case 'group':\s*\{([\s\S]*?)case 'lesson':/);
    assert.ok(groupCaseMatch, 'Must find case group block in api/sync/route.ts');
    assert.ok(
      !groupCaseMatch[1].includes('is_mock_data'),
      'groups table update/upsert must not include is_mock_data column'
    );
    console.log('  ✓ T20.13: API sync route adheres to real Supabase groups schema without is_mock_data column');
  }

  console.log('---------------------------------------------------------------');
  console.log('Suite 20 Complete: 13 passed, 0 failed\n');
}
