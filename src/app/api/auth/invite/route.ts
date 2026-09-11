import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@/types';

export async function POST(request: NextRequest) {
  // Verify the requester is logged in and is an owner
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check requester role from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'owner') {
    return NextResponse.json({ error: 'Только владелец может приглашать сотрудников' }, { status: 403 });
  }

  // Parse invite data
  const body = await request.json();
  const { email, role, full_name } = body as {
    email: string;
    role: UserRole;
    full_name: string;
  };

  if (!email || !role || !full_name) {
    return NextResponse.json({ error: 'Укажите email, имя и роль' }, { status: 400 });
  }

  // Send invite via Supabase Admin API
  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role, full_name },
    redirectTo: `${siteUrl}/auth/callback`,
  });

  if (error) {
    const msg = error.message.includes('already been registered')
      ? 'Пользователь с таким email уже зарегистрирован'
      : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ success: true, userId: data.user?.id });
}
