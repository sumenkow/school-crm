import { runBillingTests } from './ts01_to_ts05_billing.test';
import { runSyncAndDomainTests } from './ts06_to_ts09_sync_and_domain.test';
import { runAnalyticsAndSecurityTests } from './ts10_to_ts15_analytics_and_security.test';
import { runCoreAndSecurityTests } from './ts16_to_ts20_core_and_security.test';
import { runAnalyticsAndE2ETests } from './ts21_to_ts26_analytics_and_e2e.test';
import { runPhase8SettingsAdminTests } from '../src/__tests__/phase8_settings_admin.test';

async function main() {
  console.log('===============================================================');
  console.log('   SMART ACADEMY CRM — AUTOMATED CRITICAL VERIFICATION SUITE   ');
  console.log('   Validating P0 & P1 Hardening (TS-01..TS-26) & Phase 8 Tiers ');
  console.log('===============================================================');

  const startTime = Date.now();
  let passedSuites = 0;
  const totalSuites = 6;

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
