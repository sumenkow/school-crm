import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logAuditEvent } from '@/lib/audit/auditLogger';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await logAuditEvent({
      action: 'AUTH_LOGOUT',
      entityType: 'auth',
      entityId: user.id,
      entityNameSnapshot: user.email || user.id,
      description: `Пользователь ${user.email || user.id} вышел из системы`,
      source: 'WEB',
      req: request,
    });
  }

  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/login', request.nextUrl.origin));
}
