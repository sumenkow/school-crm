const path = require('path');
const jiti = require('jiti')(__filename, {
  alias: {
    '@/lib/supabase/client': path.resolve(__dirname, './helpers/mockSupabaseClient.ts'),
    '@': path.resolve(__dirname, '../src'),
  },
});
jiti('./run_all_tests.ts');
