import { NextResponse } from 'next/server';
import { getStoredCourses } from '@/lib/data/courseStorage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const allCourses = getStoredCourses();
    const active = allCourses.filter((c) => c.status === 'active' || c.isActive);

    // Map icons / flags for prominent European school directions
    const getDirectionIcon = (name: string, subject: string): string => {
      const n = name.toLowerCase();
      if (n.includes('немецк') || n.includes('deutsch') || n.includes('german')) return '🇩🇪';
      if (n.includes('английск') || n.includes('english')) return '🇬🇧';
      if (n.includes('француз') || n.includes('french')) return '🇫🇷';
      if (n.includes('испан') || n.includes('spanish')) return '🇪🇸';
      if (n.includes('математ') || subject.includes('Точные науки')) return '🧮';
      if (n.includes('робот') || n.includes('программир') || subject.includes('IT')) return '🤖';
      if (n.includes('экзамен') || n.includes('подготовк')) return '🎓';
      return '📚';
    };

    const formatted = active.map((c) => ({
      id: c.id,
      name: c.name,
      subject: c.subject,
      description: c.description || (c.format === 'group' ? 'Группы и индивидуально' : 'Индивидуально'),
      format: c.format,
      ageGroup: c.ageGroup || '14–16 лет',
      lessonDuration: c.lessonDuration || '75 мин',
      lessonDurationMinutes: c.lessonDurationMinutes || 75,
      capacity: c.capacity || 8,
      isTrialAvailable: Boolean(c.isTrialAvailable),
      icon: getDirectionIcon(c.name, c.subject),
    }));

    return NextResponse.json({
      success: true,
      directions: formatted,
    });
  } catch (err: any) {
    console.error('Error fetching course directions for Mini App:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
