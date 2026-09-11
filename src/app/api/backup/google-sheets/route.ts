import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDatabaseRecords } from '@/lib/backup/formatData';
import {
  INITIAL_STUDENTS,
  INITIAL_COURSES,
  INITIAL_GROUPS
} from '@/lib/data/mockData';

export const dynamic = 'force-dynamic';

async function checkAccess() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Необходима авторизация', status: 401 };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'owner' && profile.role !== 'admin')) {
    return { error: 'Недостаточно прав для выполнения синхронизации', status: 403 };
  }

  return { user, role: profile.role };
}

export async function POST(request: NextRequest) {
  const authCheck = await checkAccess();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const body = await request.json();
    const webhookUrl = body.webhookUrl?.trim();

    if (!webhookUrl || !webhookUrl.startsWith('https://')) {
      return NextResponse.json({ error: 'Укажите корректный URL вебхука Google Таблицы (начинается с https://)' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch all entities from Supabase
    const [
      { data: profiles },
      { data: teachers },
      { data: students },
      { data: parents },
      { data: courses },
      { data: groups },
      { data: payments },
    ] = await Promise.all([
      admin.from('profiles').select('*').order('created_at', { ascending: false }),
      admin.from('teachers').select('*').order('created_at', { ascending: false }),
      admin.from('students').select('*').order('created_at', { ascending: false }),
      admin.from('parents').select('*').order('created_at', { ascending: false }),
      admin.from('courses').select('*').order('created_at', { ascending: false }),
      admin.from('groups').select('*, courses(name), teachers(first_name, last_name)').order('created_at', { ascending: false }),
      admin.from('payments').select('*').order('created_at', { ascending: false }),
    ]);

    const formatted = formatDatabaseRecords({
      profiles: profiles || [],
      teachers: teachers || [],
      students: students && students.length > 0 ? students : INITIAL_STUDENTS,
      parents: parents || [],
      courses: courses && courses.length > 0 ? courses : INITIAL_COURSES,
      groups: groups && groups.length > 0 ? groups : (INITIAL_GROUPS as any),
      payments: payments || [],
    });

    // Send payload to Google Sheets Webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        schoolName: 'School CRM',
        timestamp: formatted.timestamp,
        tables: formatted.tables,
      }),
      redirect: 'follow',
    });

    if (!response.ok) {
      return NextResponse.json({
        error: `Google Sheets вернул статус ошибки: ${response.status} ${response.statusText}`,
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      syncedTables: Object.keys(formatted.tables),
      totalRecords: formatted.totalRecords,
      timestamp: formatted.timestamp,
    });
  } catch (err: unknown) {
    console.error('Google Sheets backup error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Ошибка отправки в Google Sheets: ' + message }, { status: 500 });
  }
}
