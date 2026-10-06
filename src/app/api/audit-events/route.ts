import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getInMemoryAuditEvents } from '@/lib/audit/auditLogger';
import { AuditEvent, AuditEventsResponse } from '@/lib/audit/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Authoritative security & role check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isDev =
      process.env.NODE_ENV === 'development' &&
      request.cookies.get('crm_dev_bypass')?.value === 'true';

    let userRole: string | undefined;

    if (isDev) {
      userRole = 'developer';
    } else if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      userRole = profile?.role || (user.user_metadata?.role as string | undefined);
    }

    if (!userRole || !['developer', 'owner', 'admin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Доступ запрещен. Только администраторы и владельцы могут просматривать аудит.' },
        { status: user ? 403 : 401 }
      );
    }

    // 2. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)));
    const tab = searchParams.get('tab') || 'all';
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const actorId = searchParams.get('actorId');
    const role = searchParams.get('role');
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const result = searchParams.get('result');
    const source = searchParams.get('source');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const requestId = searchParams.get('requestId');

    // 3. Query Supabase audit_events
    let dbEvents: AuditEvent[] = [];
    let dbTotal = 0;
    let usedDb = false;

    try {
      const admin = createAdminClient();
      let query = admin
        .from('audit_events')
        .select('*', { count: 'exact' });

      // Tab filtering
      if (tab === 'changes') {
        query = query.not('changed_fields', 'is', null);
      } else if (tab === 'finance') {
        query = query.in('entity_type', ['payment', 'invoice', 'subscription', 'finance', 'refund']);
      } else if (tab === 'security') {
        query = query.or('action.ilike.AUTH_%,action.ilike.ROLE_%,action.ilike.USER_%,entity_type.in.(user,profile,auth)');
      } else if (tab === 'calendar') {
        query = query.in('entity_type', ['lesson', 'group', 'schedule']);
      } else if (tab === 'students') {
        query = query.in('entity_type', ['student', 'parent', 'lead']);
      } else if (tab === 'telegram') {
        query = query.or('source.in.(TELEGRAM,TELEGRAM_MINI_APP),entity_type.eq.telegram');
      } else if (tab === 'errors') {
        query = query.eq('result', 'FAILURE');
      }

      // Explicit filters
      if (actorId) query = query.eq('actor_id', actorId);
      if (role) query = query.eq('actor_role_snapshot', role);
      if (action) query = query.eq('action', action);
      if (entityType) query = query.eq('entity_type', entityType);
      if (result) query = query.eq('result', result);
      if (source) query = query.eq('source', source);
      if (requestId) query = query.eq('request_id', requestId);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      // Search
      if (search) {
        query = query.or(
          `actor_name_snapshot.ilike.%${search}%,entity_name_snapshot.ilike.%${search}%,description.ilike.%${search}%,request_id.ilike.%${search}%,entity_id.ilike.%${search}%`
        );
      }

      query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      const { data, count, error } = await query;

      if (!error && data) {
        dbEvents = data as AuditEvent[];
        dbTotal = count || 0;
        usedDb = true;
      }
    } catch {
      usedDb = false;
    }

    // 4. Fallback to in-memory audit log if DB returned 0 or wasn't accessible
    if (!usedDb || (dbEvents.length === 0 && dbTotal === 0)) {
      let filtered = getInMemoryAuditEvents();

      // Quick tabs
      if (tab === 'changes') {
        filtered = filtered.filter((e) => e.changed_fields && Object.keys(e.changed_fields).length > 0);
      } else if (tab === 'finance') {
        filtered = filtered.filter((e) => ['payment', 'invoice', 'subscription', 'finance', 'refund'].includes(e.entity_type));
      } else if (tab === 'security') {
        filtered = filtered.filter((e) => e.action.startsWith('AUTH_') || e.action.startsWith('ROLE_') || e.action.startsWith('USER_') || ['user', 'profile', 'auth'].includes(e.entity_type));
      } else if (tab === 'calendar') {
        filtered = filtered.filter((e) => ['lesson', 'group', 'schedule'].includes(e.entity_type));
      } else if (tab === 'students') {
        filtered = filtered.filter((e) => ['student', 'parent', 'lead'].includes(e.entity_type));
      } else if (tab === 'telegram') {
        filtered = filtered.filter((e) => ['TELEGRAM', 'TELEGRAM_MINI_APP'].includes(e.source) || e.entity_type === 'telegram');
      } else if (tab === 'errors') {
        filtered = filtered.filter((e) => e.result === 'FAILURE');
      }

      // Field filters
      if (actorId) filtered = filtered.filter((e) => e.actor_id === actorId);
      if (role) filtered = filtered.filter((e) => e.actor_role_snapshot === role);
      if (action) filtered = filtered.filter((e) => e.action === action);
      if (entityType) filtered = filtered.filter((e) => e.entity_type === entityType);
      if (result) filtered = filtered.filter((e) => e.result === result);
      if (source) filtered = filtered.filter((e) => e.source === source);
      if (requestId) filtered = filtered.filter((e) => e.request_id === requestId);
      if (startDate) filtered = filtered.filter((e) => e.created_at >= startDate);
      if (endDate) filtered = filtered.filter((e) => e.created_at <= endDate);

      // Search
      if (search) {
        filtered = filtered.filter(
          (e) =>
            e.actor_name_snapshot?.toLowerCase().includes(search) ||
            e.entity_name_snapshot?.toLowerCase().includes(search) ||
            e.description?.toLowerCase().includes(search) ||
            e.request_id?.toLowerCase().includes(search) ||
            e.entity_id?.toLowerCase().includes(search)
        );
      }

      const total = filtered.length;
      const startIndex = (page - 1) * pageSize;
      const paginated = filtered.slice(startIndex, startIndex + pageSize);

      const response: AuditEventsResponse = {
        events: paginated,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      };

      return NextResponse.json(response);
    }

    const response: AuditEventsResponse = {
      events: dbEvents,
      total: dbTotal,
      page,
      pageSize,
      totalPages: Math.ceil(dbTotal / pageSize) || 1,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('GET /api/audit-events error:', error);
    return NextResponse.json(
      { error: error?.message || 'Внутренняя ошибка сервера при чтении журнала аудита' },
      { status: 500 }
    );
  }
}
