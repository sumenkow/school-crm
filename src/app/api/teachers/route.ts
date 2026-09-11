import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { INITIAL_TEACHERS, FullTeacherData } from '@/lib/data/mockData';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('id');

    const admin = createAdminClient();

    // Query teachers with profile data
    const { data: dbTeachers, error } = await admin
      .from('teachers')
      .select('*, profiles(id, full_name, email, phone, is_active, role)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching teachers from Supabase:', error);
      // Fallback to mock data if database error
      if (teacherId) {
        const found = INITIAL_TEACHERS.find((t) => t.id === teacherId);
        return NextResponse.json({ teacher: found || null });
      }
      return NextResponse.json({ teachers: INITIAL_TEACHERS });
    }

    // Map database teachers to FullTeacherData
    const mappedDbTeachers: FullTeacherData[] = (dbTeachers || []).map((t) => {
      const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
      const fullName = (
        t.first_name || t.last_name
          ? `${t.first_name || ''} ${t.last_name || ''}`.trim()
          : profile?.full_name || t.email || 'Преподаватель'
      );

      const isArchived = t.status === 'archived' || t.status === 'inactive' || profile?.is_active === false;

      return {
        id: t.id,
        name: fullName,
        role: 'Преподаватель',
        phone: t.phone || profile?.phone || '—',
        telegram: t.telegram || undefined,
        email: t.email || profile?.email || undefined,
        bio: t.bio || undefined,
        status: isArchived ? 'archived' : 'active',
        weeklyHours: 0,
        lessonsPerWeek: 0,
        studentsCount: 0,
        activeGroups: [],
      };
    });

    // Merge with INITIAL_TEACHERS (excluding duplicates by email or name)
    const existingEmails = new Set(
      mappedDbTeachers
        .map((t) => t.email?.toLowerCase().trim())
        .filter(Boolean)
    );
    const existingNames = new Set(
      mappedDbTeachers.map((t) => t.name.toLowerCase().trim())
    );

    const mergedMockTeachers = INITIAL_TEACHERS.filter((mockT) => {
      const emailMatch = mockT.email && existingEmails.has(mockT.email.toLowerCase().trim());
      const nameMatch = existingNames.has(mockT.name.toLowerCase().trim());
      return !emailMatch && !nameMatch;
    });

    const allTeachers = [...mappedDbTeachers, ...mergedMockTeachers];

    // If specific teacher requested
    if (teacherId) {
      const found =
        allTeachers.find((t) => t.id === teacherId) ||
        mappedDbTeachers.find((t) => t.id === teacherId) ||
        INITIAL_TEACHERS.find((t) => t.id === teacherId);

      return NextResponse.json({ teacher: found || null });
    }

    return NextResponse.json({ teachers: allTeachers });
  } catch (err: unknown) {
    console.error('GET /api/teachers exception:', err);
    // Fallback to mock data on error
    return NextResponse.json({ teachers: INITIAL_TEACHERS });
  }
}
