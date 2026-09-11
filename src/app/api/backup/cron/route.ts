import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDatabaseRecords } from '@/lib/backup/formatData';
import {
  INITIAL_STUDENTS,
  INITIAL_COURSES,
  INITIAL_GROUPS
} from '@/lib/data/mockData';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const authHeader = request.headers.get('authorization');

    const expectedSecret = process.env.CRON_SECRET;
    if (expectedSecret) {
      const token = authHeader?.replace('Bearer ', '') || secret;
      if (token !== expectedSecret) {
        return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
      }
    }

    const webhookUrl = process.env.GOOGLE_SHEETS_BACKUP_WEBHOOK;
    const admin = createAdminClient();

    // Fetch records
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

    let sheetsSyncResult = 'skipped (no webhook url configured)';

    if (webhookUrl) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolName: 'School CRM',
            timestamp: formatted.timestamp,
            tables: formatted.tables,
          }),
          redirect: 'follow',
        });
        sheetsSyncResult = response.ok ? 'success' : `failed (${response.status})`;
      } catch (e: any) {
        sheetsSyncResult = `error: ${e.message}`;
      }
    }

    return NextResponse.json({
      success: true,
      job: 'daily_database_backup',
      timestamp: formatted.timestamp,
      totalRecords: formatted.totalRecords,
      googleSheetsSync: sheetsSyncResult,
    });
  } catch (err: unknown) {
    console.error('Cron backup error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
