import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/mini-app',
  '/api/telegram/webhook',
  '/api/telegram/mini-app',
  '/api/auth',
  '/api/backup/cron',
];

// Routes restricted to owner / developer only
const OWNER_ONLY_ROUTES = ['/analytics', '/settings', '/api/database/seed', '/api/school/settings'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow explicit public routes without auth
  if (PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))) {
    return NextResponse.next();
  }

  // Allow Next.js internal routes and static files only (API routes MUST NOT be bypassed!)
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Allow development bypass if cookie is present
  if (process.env.NODE_ENV === 'development' && request.cookies.get('crm_dev_bypass')?.value === 'true') {
    return response;
  }

  // No session → reject API with 401 or redirect pages to login
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // Check role restrictions for owner-only routes (/analytics, /settings, /api/database/seed, etc.)
  if (OWNER_ONLY_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))) {
    // 1. Fast path: check role from server-controlled app_metadata first, then user_metadata
    let role = (user.app_metadata?.role || user.user_metadata?.role) as string | undefined;

    // 2. Slow fallback: query profiles table only if role is missing in metadata
    if (!role) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        role = profile?.role as string | undefined;
      } catch {
        // Fallback silently if DB is unreachable
      }
    }

    const isAuditRoute = pathname === '/settings/audit' || pathname.startsWith('/settings/audit/');
    const allowedRoles = isAuditRoute ? ['developer', 'owner', 'admin'] : ['developer', 'owner'];

    if (!role || !allowedRoles.includes(role)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Insufficient privileges' },
          { status: 403 }
        );
      }
      // Redirect non-owners to dashboard
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = '/dashboard';
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static file extensions (.svg, .png, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
