const path = require('path');
const jiti = require('jiti')(__filename, {
  alias: {
    '@/lib/supabase/client': path.resolve(__dirname, './helpers/mockSupabaseClient.ts'),
    '@': path.resolve(__dirname, '../src'),
  },
});
const { runChallenger2StressTests } = jiti('./challenger2_stress_test.ts');

async function run() {
  const result = await runChallenger2StressTests();
  if (result.failed > 0) {
    console.error(`\nChallenger 2 suite failed with ${result.failed} failures.`);
    process.exit(1);
  } else {
    console.log(`\nAll Challenger 2 stress tests passed! (${result.passed} passed).`);
    process.exit(0);
  }
}

run();
