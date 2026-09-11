import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDatabaseRecords } from '@/lib/backup/formatData';
import { generateExcelWorkbook } from '@/lib/backup/excelGenerator';
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
    return { error: 'Недостаточно прав. Экспорт доступен только руководству школы.', status: 403 };
  }

  return { user, role: profile.role };
}

export async function GET(request: NextRequest) {
  const authCheck = await checkAccess();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
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

    // Format records into human-readable representation
    const formatted = formatDatabaseRecords({
      profiles: profiles || [],
      teachers: teachers || [],
      students: students && students.length > 0 ? students : INITIAL_STUDENTS,
      parents: parents || [],
      courses: courses && courses.length > 0 ? courses : INITIAL_COURSES,
      groups: groups && groups.length > 0 ? groups : (INITIAL_GROUPS as any),
      payments: payments || [],
    });

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'excel';
    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'json') {
      return NextResponse.json(formatted);
    }

    // Generate Excel Workbook
    const xmlContent = generateExcelWorkbook(formatted.tables);

    return new NextResponse(xmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
        'Content-Disposition': `attachment; filename="school_crm_backup_${dateStr}.xls"`,
      },
    });
  } catch (err: unknown) {
    console.error('Backup export failed:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Ошибка экспорта: ' + message }, { status: 500 });
  }
}
