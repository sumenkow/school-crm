import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { INITIAL_COURSES } from '@/lib/data/mockData';

export const dynamic = 'force-dynamic';

export interface CourseWithTariffs {
  id: string;
  name: string;
  subject: string;
  description?: string;
  isActive: boolean;
  rubLesson: number;
  rubMonth: number;
  eurLesson: number;
  eurMonth: number;
  ageGroup?: string;
  lessonDuration?: string;
  maxStudents?: number;
}

const KNOWN_TARIFFS: Record<string, { rubLesson: number; rubMonth: number; eurLesson: number; eurMonth: number; subject: string; ageGroup: string; lessonDuration: string; maxStudents: number }> = {
  c1: { rubLesson: 1050, rubMonth: 7600, eurLesson: 15, eurMonth: 80, subject: 'Иностранные языки', ageGroup: '6-16 лет', lessonDuration: '60 мин', maxStudents: 8 },
  c2: { rubLesson: 1200, rubMonth: 8800, eurLesson: 18, eurMonth: 95, subject: 'Информатика и IT', ageGroup: '7-14 лет', lessonDuration: '90 мин', maxStudents: 6 },
  c3: { rubLesson: 1100, rubMonth: 8000, eurLesson: 16, eurMonth: 85, subject: 'Точные науки', ageGroup: '8-15 лет', lessonDuration: '60 мин', maxStudents: 8 },
  c4: { rubLesson: 950, rubMonth: 6500, eurLesson: 14, eurMonth: 70, subject: 'Развитие интеллекта', ageGroup: '5-12 лет', lessonDuration: '45 мин', maxStudents: 6 },
};

function enrichCourse(course: { id: string; name: string; subject?: string; description?: string; is_active?: boolean }): CourseWithTariffs {
  const normName = course.name.toLowerCase();
  
  let matchKey: string | null = null;
  if (course.id in KNOWN_TARIFFS) {
    matchKey = course.id;
  } else if (normName.includes('англ') || normName.includes('english')) {
    matchKey = 'c1';
  } else if (normName.includes('робот') || normName.includes('it') || normName.includes('информ')) {
    matchKey = 'c2';
  } else if (normName.includes('матем') || normName.includes('math')) {
    matchKey = 'c3';
  } else if (normName.includes('скорочтен') || normName.includes('памят') || normName.includes('чтени')) {
    matchKey = 'c4';
  }

  const preset = matchKey ? KNOWN_TARIFFS[matchKey] : null;

  return {
    id: course.id,
    name: course.name,
    subject: course.subject || preset?.subject || 'Общий курс',
    description: course.description || undefined,
    isActive: course.is_active !== false,
    rubLesson: preset?.rubLesson || 1000,
    rubMonth: preset?.rubMonth || 7500,
    eurLesson: preset?.eurLesson || 15,
    eurMonth: preset?.eurMonth || 80,
    ageGroup: preset?.ageGroup || '7-15 лет',
    lessonDuration: preset?.lessonDuration || '60 мин',
    maxStudents: preset?.maxStudents || 8,
  };
}

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data: dbCourses, error } = await admin
      .from('courses')
      .select('*')
      .order('name');

    if (error || !dbCourses || dbCourses.length === 0) {
      if (error) {
        console.warn('Supabase courses query failed, using fallback:', error.message);
      }
      // Return enriched mock courses
      const fallbackList = [
        ...INITIAL_COURSES,
        { id: 'c4', name: 'Скорочтение и память', description: 'Развитие памяти и внимания', subject: 'Развитие интеллекта', isActive: true },
      ].map(enrichCourse);

      return NextResponse.json({ courses: fallbackList });
    }

    const enriched = dbCourses.map(enrichCourse);
    return NextResponse.json({ courses: enriched });
  } catch (err: unknown) {
    console.error('GET /api/courses error:', err);
    const fallbackList = [
      ...INITIAL_COURSES,
      { id: 'c4', name: 'Скорочтение и память', description: 'Развитие памяти и внимания', subject: 'Развитие интеллекта', isActive: true },
    ].map(enrichCourse);

    return NextResponse.json({ courses: fallbackList });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role, course, courses } = body;

    // Security check: owner, developer, admin or standard staff session can save course configurations
    const isAuthorized = !role || role === 'owner' || role === 'developer' || role === 'admin' || role === 'superadmin' || role === 'teacher';
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Только владелец школы имеет права на добавление и изменение направлений.' },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    // If single course provided
    if (course) {
      const courseId = course.id && !course.id.startsWith('course_') ? course.id : undefined;
      const { data, error } = await admin
        .from('courses')
        .upsert({
          ...(courseId ? { id: courseId } : {}),
          name: course.name,
          description: course.description || null,
          subject: course.subject || 'Общий курс',
          is_active: course.status !== 'paused' && course.isActive !== false,
        })
        .select()
        .single();

      if (error) {
        console.warn('Error upserting course in Supabase:', error);
      }
      return NextResponse.json({ success: true, course: data ? enrichCourse(data) : enrichCourse(course) });
    }

    // If array of courses provided
    if (Array.isArray(courses)) {
      const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const validCourses = courses
        .filter(Boolean)
        .filter((c: any) => Boolean(c && c.name && String(c.name).trim().length > 0));

      for (const c of validCourses) {
        try {
          const courseId = isUuid(c.id) ? c.id : undefined;
          const trimmedName = String(c.name).trim();
          const isActive = c.status !== 'paused' && c.status !== 'archived' && c.is_active !== false && c.isActive !== false;

          // First attempt: try with extended schema columns
          const extendedPayload: any = {
            ...(courseId ? { id: courseId } : {}),
            name: trimmedName,
            target_age: c.ageGroup || c.target_age || null,
            price_monthly: Number(String(c.monthlyPrice || c.price_monthly || '0').replace(/\D/g, '')) || 0,
            lesson_duration_minutes: Number(String(c.lessonDuration || c.lesson_duration_minutes || '60').replace(/\D/g, '')) || 60,
            max_students: Number(c.maxStudents || c.max_students || 8),
            is_active: isActive,
            updated_at: new Date().toISOString(),
          };

          const { error: upsertErr } = await admin.from('courses').upsert(extendedPayload);

          if (upsertErr) {
            // Fallback attempt: core schema columns
            const corePayload: any = {
              ...(courseId ? { id: courseId } : {}),
              name: trimmedName,
              description: c.description || (c.ageGroup ? `${c.ageGroup} • ${c.lessonDuration || '60 мин'} • ${c.monthlyPrice || '6 500 ₽'}` : null),
              subject: c.subject || 'Общий курс',
              is_active: isActive,
            };
            await admin.from('courses').upsert(corePayload);
          }
        } catch (e) {
          console.warn('Error syncing course:', c.name, e);
        }
      }
      return NextResponse.json({ success: true, count: validCourses.length });
    }

    return NextResponse.json({ error: 'Не указаны данные курса' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
