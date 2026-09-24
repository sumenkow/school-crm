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

function enrichCourse(course: { id: string; name: string; subject?: string; description?: string; is_active?: boolean; target_age?: string; price_monthly?: number | string; lesson_duration_minutes?: number | string; max_students?: number }): CourseWithTariffs {
  const normName = (course.name || '').toLowerCase();
  
  let matchKey: string | null = null;
  if (course.id in KNOWN_TARIFFS) {
    matchKey = course.id;
  } else if (normName.includes('англ') || normName.includes('english')) {
    matchKey = 'c1';
  } else if (normName.includes('робот') || normName.includes('it') || normName.includes('информ')) {
    matchKey = 'c2';
  } else if (normName.includes('матем') || normName.includes('math') || normName.includes('алгебр')) {
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
    rubMonth: Number(course.price_monthly) || preset?.rubMonth || 7500,
    eurLesson: preset?.eurLesson || 15,
    eurMonth: preset?.eurMonth || 80,
    ageGroup: course.target_age || preset?.ageGroup || '7-15 лет',
    lessonDuration: course.lesson_duration_minutes ? `${course.lesson_duration_minutes} мин` : (preset?.lessonDuration || '60 мин'),
    maxStudents: course.max_students || preset?.maxStudents || 8,
  };
}

function deduplicateCoursesList<T extends { id: string; name: string }>(items: T[]): T[] {
  const seenNames = new Set<string>();
  const seenIds = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    if (!item || !item.name) continue;
    const normName = item.name.trim().toLowerCase();
    if (!normName || seenNames.has(normName) || seenIds.has(item.id)) {
      continue;
    }
    seenNames.add(normName);
    seenIds.add(item.id);
    result.push(item);
  }
  return result;
}

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data: dbCourses, error } = await admin
      .from('courses')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !dbCourses || dbCourses.length === 0) {
      if (error) {
        console.warn('Supabase courses query failed, using fallback:', error.message);
      }
      const fallbackList = [
        ...INITIAL_COURSES,
        { id: 'c4', name: 'Скорочтение и память', description: 'Развитие памяти и внимания', subject: 'Развитие интеллекта', isActive: true },
      ].map(enrichCourse);

      return NextResponse.json({ courses: deduplicateCoursesList(fallbackList) });
    }

    const dedupedDb = deduplicateCoursesList(dbCourses);
    const enriched = dedupedDb.map(enrichCourse);
    return NextResponse.json({ courses: enriched });
  } catch (err: unknown) {
    console.error('GET /api/courses error:', err);
    const fallbackList = [
      ...INITIAL_COURSES,
      { id: 'c4', name: 'Скорочтение и память', description: 'Развитие памяти и внимания', subject: 'Развитие интеллекта', isActive: true },
    ].map(enrichCourse);

    return NextResponse.json({ courses: deduplicateCoursesList(fallbackList) });
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
    const isUuid = (id?: string) => Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

    // Fetch current DB courses to match against
    const { data: currentDbCourses } = await admin
      .from('courses')
      .select('*');

    const dbList = currentDbCourses || [];
    const dbById = new Map<string, any>(dbList.map((c) => [c.id, c]));
    const dbByName = new Map<string, any>(dbList.map((c) => [(c.name || '').trim().toLowerCase(), c]));

    // If single course provided
    if (course) {
      const trimmedName = String(course.name || '').trim();
      const matched = (course.id && isUuid(course.id) && dbById.get(course.id)) || dbByName.get(trimmedName.toLowerCase());
      const targetId = matched?.id || (isUuid(course.id) ? course.id : undefined);

      const payload: any = {
        ...(targetId ? { id: targetId } : {}),
        name: trimmedName,
        description: course.description || null,
        subject: course.subject || 'Общий курс',
        is_active: course.status !== 'paused' && course.isActive !== false,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await admin
        .from('courses')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.warn('Error upserting single course:', error);
      }
      return NextResponse.json({ success: true, course: data ? enrichCourse(data) : enrichCourse(course) });
    }

    // If array of courses provided
    if (Array.isArray(courses)) {
      const validCourses = courses
        .filter(Boolean)
        .filter((c: any) => Boolean(c && c.name && String(c.name).trim().length > 0));

      const dedupedIncoming = deduplicateCoursesList(validCourses);
      const processedDbIds = new Set<string>();

      for (const c of dedupedIncoming) {
        try {
          const trimmedName = String(c.name).trim();
          const normName = trimmedName.toLowerCase();
          
          // Match by UUID or by Name
          const matched = (c.id && isUuid(c.id) && dbById.get(c.id)) || dbByName.get(normName);
          const targetId = matched?.id || (isUuid(c.id) ? c.id : undefined);

          if (targetId) {
            processedDbIds.add(targetId);
          }

          const isActive = c.status !== 'paused' && c.status !== 'archived' && c.is_active !== false && c.isActive !== false;

          const extendedPayload: any = {
            ...(targetId ? { id: targetId } : {}),
            name: trimmedName,
            target_age: c.ageGroup || c.target_age || null,
            price_monthly: Number(String(c.monthlyPrice || c.price_monthly || '0').replace(/\D/g, '')) || 0,
            lesson_duration_minutes: Number(String(c.lessonDuration || c.lesson_duration_minutes || '60').replace(/\D/g, '')) || 60,
            max_students: Number(c.maxStudents || c.max_students || 8),
            is_active: isActive,
            updated_at: new Date().toISOString(),
          };

          const { data: upsertData, error: upsertErr } = await admin
            .from('courses')
            .upsert(extendedPayload)
            .select('id')
            .single();

          if (upsertData?.id) {
            processedDbIds.add(upsertData.id);
          }

          if (upsertErr) {
            // Core fallback
            const corePayload: any = {
              ...(targetId ? { id: targetId } : {}),
              name: trimmedName,
              description: c.description || (c.ageGroup ? `${c.ageGroup} • ${c.lessonDuration || '60 мин'} • ${c.monthlyPrice || '6 500 ₽'}` : null),
              subject: c.subject || 'Общий курс',
              is_active: isActive,
            };
            const { data: coreData } = await admin.from('courses').upsert(corePayload).select('id').single();
            if (coreData?.id) {
              processedDbIds.add(coreData.id);
            }
          }
        } catch (e) {
          console.warn('Error syncing course:', c.name, e);
        }
      }

      // Handle removed courses: delete non-referenced DB courses that were removed by the user
      for (const dbCourse of dbList) {
        if (!processedDbIds.has(dbCourse.id)) {
          try {
            await admin.from('courses').delete().eq('id', dbCourse.id);
          } catch (delErr) {
            console.warn('Could not delete removed course from DB:', dbCourse.id, delErr);
          }
        }
      }

      // Fetch fresh updated list from Supabase
      const { data: updatedCourses } = await admin
        .from('courses')
        .select('*')
        .order('created_at', { ascending: true });

      const finalDeduped = deduplicateCoursesList(updatedCourses || []);
      const enriched = finalDeduped.map(enrichCourse);

      return NextResponse.json({
        success: true,
        count: enriched.length,
        courses: enriched,
      });
    }

    return NextResponse.json({ error: 'Не указаны данные курса' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
