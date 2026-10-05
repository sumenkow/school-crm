const path = require('path');
const jiti = require('jiti')(__filename, {
  alias: {
    '@/lib/supabase/client': path.resolve(__dirname, './helpers/mockSupabaseClient.ts'),
    '@': path.resolve(__dirname, '../src'),
  },
});
const { runPhase8SettingsAdminTests } = jiti('../src/__tests__/phase8_settings_admin.test.ts');

async function run() {
  const result = await runPhase8SettingsAdminTests();
  if (result.failed > 0) {
    console.log(`\nBaseline established: ${result.passed} passed, ${result.failed} failed/pending.`);
  } else {
    console.log(`\nAll Phase 8 tests passed! (${result.passed} passed).`);
  }
}

run();
