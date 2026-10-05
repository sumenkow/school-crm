import { runBillingTests } from './ts01_to_ts05_billing.test';
import { runSyncAndDomainTests } from './ts06_to_ts09_sync_and_domain.test';
import { runAnalyticsAndSecurityTests } from './ts10_to_ts15_analytics_and_security.test';

async function main() {
  console.log('===============================================================');
  console.log('   SMART ACADEMY CRM — AUTOMATED CRITICAL VERIFICATION SUITE   ');
  console.log('   Validating P0 & P1 Bug Fixes (TS-01 through TS-15)          ');
  console.log('===============================================================');

  const startTime = Date.now();
  let passedSuites = 0;
  const totalSuites = 3;

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

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n===============================================================');
    console.log(`✅ ALL 15 AUTOMATED TESTS PASSED SUCCESSFULLY (${passedSuites}/${totalSuites} suites in ${duration}s)`);
    console.log('===============================================================');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ TEST SUITE FAILED:', error);
    process.exit(1);
  }
}

main();
