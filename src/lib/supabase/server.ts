import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase client for use in Server Components, Route Handlers, and Server Actions.
 * Reads and writes cookies from the Next.js headers() API.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — cookies can't be set there.
            // This is fine if middleware is refreshing user sessions.
          }
        },
      },
    }
  );
}

/**
 * Creates a Supabase admin client using the service_role key.
 * Only use in trusted server-side contexts (API routes, server actions).
 * NEVER expose service_role key to the client.
 */
export function createAdminClient() {
  const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
