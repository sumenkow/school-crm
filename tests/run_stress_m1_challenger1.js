const path = require('path');
const jiti = require('jiti')(__filename, {
  alias: {
    '@/lib/supabase/client': path.resolve(__dirname, './helpers/mockSupabaseClient.ts'),
    '@': path.resolve(__dirname, '../src'),
  },
});
const { runM1Challenger1StressTests } = jiti('./stress_m1_challenger1.ts');

async function run() {
  const result = await runM1Challenger1StressTests();
  if (result.failed > 0) {
    console.error(`\n❌ Challenger 1 M1 Gen 2 stress tests failed: ${result.failed} failures.`);
    process.exit(1);
  } else {
    console.log(`\n✅ Challenger 1 M1 Gen 2 stress tests completed: ${result.passed} passed.`);
    process.exit(0);
  }
}

run();
