/**
 * Smart Academy / You Europe CRM — Phase 8 Settings & Administration Test Suite
 *
 * Integrated facade delegating directly to the modularized 4-Tier test suite:
 *   - src/__tests__/settings/tier1_features.test.ts
 *   - src/__tests__/settings/tier2_boundaries.test.ts
 *   - src/__tests__/settings/tier3_cross_feature.test.ts
 *   - src/__tests__/settings/tier4_scenarios.test.ts
 *   - src/__tests__/settings/index.ts
 */

import { runAllSettingsE2ETests } from './settings/index';
export { calculateLessonPrice } from '@/lib/data/courseStorage';
export { isSidebarItemActive, maskBotToken } from './settings/tier1_features.test';

export async function runPhase8SettingsAdminTests() {
  const result = await runAllSettingsE2ETests();
  return {
    passed: result.totalPassed,
    failed: result.totalFailed,
    failures: result.failures,
  };
}

// Auto-run if executed directly via node/jiti
if (typeof require !== 'undefined' && require.main === module) {
  runPhase8SettingsAdminTests()
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
