/**
 * Smart Academy / You Europe CRM — Settings & Administration Master E2E Runner
 *
 * Runs all 4 Tiers:
 *   - Tier 1: Core Feature Coverage (F1 to F13)
 *   - Tier 2: Boundary & Corner Cases
 *   - Tier 3: Cross-Feature Combinations
 *   - Tier 4: Real-World Application Scenarios
 */

import { runTier1FeatureTests } from './tier1_features.test';
import { runTier2BoundaryTests } from './tier2_boundaries.test';
import { runTier3CrossFeatureTests } from './tier3_cross_feature.test';
import { runTier4ScenarioTests } from './tier4_scenarios.test';

export interface SuiteResults {
  totalPassed: number;
  totalFailed: number;
  tier1: { passed: number; failed: number };
  tier2: { passed: number; failed: number };
  tier3: { passed: number; failed: number };
  tier4: { passed: number; failed: number };
  failures: string[];
}

export async function runAllSettingsE2ETests(): Promise<SuiteResults> {
  const startTime = Date.now();
  console.log('===============================================================');
  console.log('   PHASE 8 SETTINGS & ADMINISTRATION MASTER E2E TEST SUITE     ');
  console.log('   Executing Tiers 1–4 across Features F1 through F13          ');
  console.log('===============================================================');

  const allFailures: string[] = [];

  // Run Tier 1
  const t1 = await runTier1FeatureTests();
  allFailures.push(...t1.failures);

  // Run Tier 2
  const t2 = await runTier2BoundaryTests();
  allFailures.push(...t2.failures);

  // Run Tier 3
  const t3 = await runTier3CrossFeatureTests();
  allFailures.push(...t3.failures);

  // Run Tier 4
  const t4 = await runTier4ScenarioTests();
  allFailures.push(...t4.failures);

  const totalPassed = t1.passed + t2.passed + t3.passed + t4.passed;
  const totalFailed = t1.failed + t2.failed + t3.failed + t4.failed;
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n===============================================================');
  console.log('   SETTINGS & ADMINISTRATION TEST EXECUTION SUMMARY            ');
  console.log('===============================================================');
  console.log(`  Tier 1 (Feature Coverage F1–F13):    ${t1.passed} passed, ${t1.failed} failed`);
  console.log(`  Tier 2 (Boundary & Corner Cases):    ${t2.passed} passed, ${t2.failed} failed`);
  console.log(`  Tier 3 (Cross-Feature Combinations): ${t3.passed} passed, ${t3.failed} failed`);
  console.log(`  Tier 4 (Real-World Scenarios):       ${t4.passed} passed, ${t4.failed} failed`);
  console.log('---------------------------------------------------------------');
  console.log(`  TOTAL: ${totalPassed} PASSED, ${totalFailed} FAILED (in ${duration}s)`);
  console.log('===============================================================');

  if (allFailures.length > 0) {
    console.log('\nFailures Detected:');
    allFailures.forEach((f) => console.log(`  - ${f}`));
  }

  return {
    totalPassed,
    totalFailed,
    tier1: { passed: t1.passed, failed: t1.failed },
    tier2: { passed: t2.passed, failed: t2.failed },
    tier3: { passed: t3.passed, failed: t3.failed },
    tier4: { passed: t4.passed, failed: t4.failed },
    failures: allFailures,
  };
}

// Auto-run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runAllSettingsE2ETests()
    .then((res) => {
      if (res.totalFailed > 0) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal test error:', err);
      process.exit(1);
    });
}
