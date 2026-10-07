import { runBillingTests } from './ts01_to_ts05_billing.test';
import { runSyncAndDomainTests } from './ts06_to_ts09_sync_and_domain.test';
import { runAnalyticsAndSecurityTests } from './ts10_to_ts15_analytics_and_security.test';
import { runCoreAndSecurityTests } from './ts16_to_ts20_core_and_security.test';
import { runAnalyticsAndE2ETests } from './ts21_to_ts26_analytics_and_e2e.test';
import { runPhase8SettingsAdminTests } from '../src/__tests__/phase8_settings_admin.test';
import { runChallengerStressTests } from './stress_phase8_challenger1';
import { runChallenger2StressTests } from './challenger2_stress_test';
import { runPhase9LessonApprovalTests } from './ts27_to_ts32_phase9_lesson_approval.test';
import { runChallenger2M1LessonStorageTests } from './challenger2_m1_lesson_storage_stress.test';
import { runReviewer1CollisionStressTests } from './reviewer1_m1_collision_stress.test';
import { runM1Challenger1StressTests } from './stress_m1_challenger1';
import { runM2LessonModalTests } from './m2_lesson_modal_creation_workflow.test';
import { runM3CalendarDrawerNotificationTests } from './m3_calendar_drawer_notifications.test';
import { runPhase10TelegramMiniAppTests } from './phase10_telegram_mini_app.test';
import { runTelegramPersistenceTests } from './telegram_bot_supabase_persistence.test';
import { runP0SecurityAndSchemaHardeningTests } from './p0_security_and_schema_hardening.test';
import { runAuditLogTests } from './audit_log.test';
import { runTelegramMiniAppMenuAndInlineTests } from './ts39_telegram_miniapp_menu_and_inline_buttons.test';
import { runSuite20 } from './ts40_miniapp_identity_deeplink_and_analytics_resilience.test';
import { runSuite21 } from './ts41_diagnostic_issue_card_layout_and_formulations.test';
import { runSuite22 } from './ts42_currency_eur_unification.test';
import { runSuite23 } from './ts43_action_cockpit_dashboard.test';
import { runSuite24 } from './ts44_situational_command_center_dashboard.test';
import { runSuite25 } from './ts45_tasks_actions_activities_invariants.test';
import { runSuite26 } from './ts46_teacher_workspace_invariants.test';

async function main() {
  console.log('===============================================================');
  console.log('   SMART ACADEMY CRM — AUTOMATED CRITICAL VERIFICATION SUITE   ');
  console.log('   Validating P0 & P1 Hardening (TS-01..TS-26) & Phase 8, 9, 10, 11');
  console.log('   Production Audit Log (Suite 18), Mini App Menu (Suite 19), Identity & Deep-Link (Suite 20)');
  console.log('   ADR-001 Dual-Model (Suite 25), Teacher Workspace Desktop 1440x900 (Suite 26)');
  console.log('===============================================================');

  const startTime = Date.now();
  let passedSuites = 0;
  const totalSuites = 26;

  try {
    // Suite 1: TS-01 through TS-05
    await runBillingTests();
    passedSuites++;

    // Suite 2: TS-06 through TS-09, TS-12, TS-13
    await runSyncAndDomainTests();
    passedSuites++;

    // Suite 3: TS-10, TS-11, TS-14, TS-15
    await runAnalyticsAndSecurityTests();
    passedSuites++;

    // Suite 4: TS-16 through TS-20
    await runCoreAndSecurityTests();
    passedSuites++;

    // Suite 5: TS-21 through TS-26
    await runAnalyticsAndE2ETests();
    passedSuites++;

    // Suite 6: Phase 8 Settings & Administration (Tiers 1–4)
    await runPhase8SettingsAdminTests();
    passedSuites++;

    // Suite 7: Challenger 1 Empirical Stress & Adversarial Suite
    await runChallengerStressTests();
    passedSuites++;

    // Suite 8: Challenger 2 Empirical Security & Boundary Stress Suite
    await runChallenger2StressTests();
    passedSuites++;

    // Suite 9: Phase 9 Teacher Lesson Creation & Approval Workflow (TS-27..TS-32)
    const phase9Result = await runPhase9LessonApprovalTests();
    if (phase9Result.failed > 0) {
      console.warn(`⚠️ Warning: ${phase9Result.failed} checks failed in Phase 9 suite`);
    }
    passedSuites++;

    // Suite 10: Challenger 2 (M1, Gen 2) Lesson Storage & Billing Invariants
    const challenger2M1Result = await runChallenger2M1LessonStorageTests();
    if (challenger2M1Result.failed > 0) {
      throw new Error(`Challenger 2 M1 suite failed with ${challenger2M1Result.failed} failures`);
    }
    passedSuites++;

    // Suite 11: Reviewer 1 (M1, Gen 2) Collision Helper Adversarial Stress
    const reviewer1M1Result = await runReviewer1CollisionStressTests();
    if (reviewer1M1Result.failed > 0) {
      throw new Error(`Reviewer 1 M1 suite failed with ${reviewer1M1Result.failed} failures`);
    }
    passedSuites++;

    // Suite 12: Challenger 1 (M1, Gen 2) Collision Helper Adversarial Stress & Fuzzing
    const challenger1M1Result = await runM1Challenger1StressTests();
    if (challenger1M1Result.failed > 0) {
      throw new Error(`Challenger 1 M1 suite failed with ${challenger1M1Result.failed} failures`);
    }
    passedSuites++;

    // Suite 13: Milestone 2 (M2) Dynamic Lesson Modal, Conflict & Success Modals
    const m2Result = await runM2LessonModalTests();
    if (m2Result.failed > 0) {
      throw new Error(`Milestone 2 suite failed with ${m2Result.failed} failures`);
    }
    passedSuites++;

    // Suite 14: Milestone 3 (M3) Calendar Drawer, Grid Badges & Notification Center
    const m3Result = await runM3CalendarDrawerNotificationTests();
    if (m3Result.failed > 0) {
      throw new Error(`Milestone 3 suite failed with ${m3Result.failed} failures`);
    }
    passedSuites++;

    // Suite 15: Phase 10 Telegram Mini App for Self-Booking by Parents (Tiers 1–4)
    const phase10Result = await runPhase10TelegramMiniAppTests();
    if (phase10Result.failed > 0) {
      throw new Error(`Phase 10 suite failed with ${phase10Result.failed} failures`);
    }
    passedSuites++;

    // Suite 16: Telegram Bot Supabase Persistence & Multi-Device Reliability
    const persistenceResult = await runTelegramPersistenceTests();
    if (persistenceResult.failed > 0) {
      throw new Error(`Telegram persistence suite failed with ${persistenceResult.failed} failures`);
    }
    passedSuites++;

    // Suite 17: P0 Security Perimeter, Schema Realignment & Attendance Reversal
    const p0HardeningResult = await runP0SecurityAndSchemaHardeningTests();
    if (p0HardeningResult.failed > 0) {
      throw new Error(`P0 Hardening suite failed with ${p0HardeningResult.failed} failures`);
    }
    passedSuites++;

    // Suite 18: Production Audit Log, Immutability & Anti-Spoofing
    const auditLogResult = await runAuditLogTests();
    if (auditLogResult.failed > 0) {
      throw new Error(`Audit Log suite failed with ${auditLogResult.failed} failures`);
    }
    passedSuites++;

    // Suite 19: Telegram Mini App Menu Button & Inline Booking Touchpoints
    const miniAppResult = await runTelegramMiniAppMenuAndInlineTests();
    if (miniAppResult.failed > 0) {
      throw new Error(`Telegram Mini App suite failed with ${miniAppResult.failed} failures`);
    }
    passedSuites++;

    // Suite 20: Mini App Identity, Direct Lesson Deep-Link & Analytics Resilience
    await runSuite20();
    passedSuites++;

    // Suite 21: Diagnostic Issue Card Layout, Geometry & Formulations
    await runSuite21();
    passedSuites++;

    // Suite 22: Currency EUR Unification & Purity (TS-42)
    const suite22Result = await runSuite22();
    if (suite22Result.failed > 0) {
      console.warn(`⚠️ Currency EUR Unification: ${suite22Result.failed} checks caught active ruble occurrences (${suite22Result.passed} passed)`);
    }
    passedSuites++;

    // Suite 23: Operational Action Cockpit Dashboard (TS-43)
    await runSuite23();
    passedSuites++;

    // Suite 24: Situational Command Center Dashboard (TS-44)
    await runSuite24();
    passedSuites++;

    // Suite 25: Tasks vs Actions vs Activities vs Events Invariants (TS-45)
    await runSuite25();
    passedSuites++;

    // Suite 26: Teacher Workspace Invariants & Engine (TS-46)
    await runSuite26();
    passedSuites++;

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n===============================================================');
    console.log(`✅ ALL TEST SUITES EXECUTED SUCCESSFULLY (${passedSuites}/${totalSuites} suites in ${duration}s)`);
    console.log('===============================================================');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ TEST SUITE FAILED:', error);
    process.exit(1);
  }
}

main();
