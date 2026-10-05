import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_TEACHERS } from '@/lib/data/mockData';
import { getStoredLessons } from '@/lib/data/lessonStorage';
import { getTeacherDayScheduleSlots } from '@/lib/data/collisionHelper';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const date = searchParams.get('date');
    const duration = parseInt(searchParams.get('duration') || '60', 10);

    const existingLessons = getStoredLessons();

    // If specific teacher & date are requested: return calculated slots (Screen 10)
    if (teacherId && date) {
      const slots = getTeacherDayScheduleSlots(
        existingLessons,
        teacherId,
        date,
        duration,
        9, // from 09:00 to 21:00 (operating hours)
        21
      );

      const teacher = INITIAL_TEACHERS.find((t) => t.id === teacherId);

      return NextResponse.json({
        success: true,
        teacher: teacher ? { id: teacher.id, name: teacher.name, role: teacher.role } : null,
        date,
        durationMinutes: duration,
        slots,
      });
    }

    // Otherwise return list of teachers for individual lessons (Screen 9)
    // Ratings and review counts matching the visual reference
    const teacherMetadata: Record<string, { rating: number; reviewCount: number; subject: string }> = {
      t1: { rating: 4.9, reviewCount: 24, subject: 'Немецкий язык' },
      t2: { rating: 4.8, reviewCount: 18, subject: 'Английский язык' },
      t3: { rating: 4.9, reviewCount: 12, subject: 'Французский язык' },
      t4: { rating: 5.0, reviewCount: 15, subject: 'Немецкий язык' },
    };

    const teachersList = INITIAL_TEACHERS.map((t) => {
      const meta = teacherMetadata[t.id] || { rating: 4.9, reviewCount: 10, subject: 'Иностранные языки' };
      return {
        id: t.id,
        name: t.name,
        role: t.role,
        subject: meta.subject,
        rating: meta.rating,
        reviewCount: meta.reviewCount,
        avatarUrl: `/avatars/${t.id}.png`,
        activeGroupsCount: t.activeGroups?.length || 0,
      };
    });

    return NextResponse.json({
      success: true,
      teachers: teachersList,
    });
  } catch (err: any) {
    console.error('Error fetching teachers for Mini App:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
