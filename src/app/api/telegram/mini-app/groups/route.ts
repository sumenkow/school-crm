import { NextRequest, NextResponse } from 'next/server';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { getStoredLessons } from '@/lib/data/lessonStorage';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const directionName = (searchParams.get('directionName') || '').toLowerCase().trim();
    const courseId = searchParams.get('courseId') || '';

    const allGroups = getStoredGroups();
    const allLessons = getStoredLessons();

    // Filter groups by direction
    const matchingGroups = allGroups.filter((g) => {
      if (g.status !== 'active' && g.status !== 'recruiting') return false;
      if (courseId && g.courseId === courseId) return true;
      if (directionName) {
        const cName = (g.courseName || '').toLowerCase();
        const gName = (g.name || '').toLowerCase();
        return cName.includes(directionName) || gName.includes(directionName) || directionName.includes(cName);
      }
      return true;
    });

    const groupsWithLessons = matchingGroups.map((g) => {
      const maxCapacity = g.capacity || 8;
      const enrolledCount = g.students?.length || 0;
      const availableSeats = Math.max(0, maxCapacity - enrolledCount);
      const occupancyRate = Math.round((enrolledCount / maxCapacity) * 100);

      // Find future/planned lessons for this group
      const groupLessons = allLessons
        .filter((l) => l.groupId === g.id && (l.status === 'scheduled' || l.status === 'planned'))
        .sort((a, b) => {
          const comp = a.date.localeCompare(b.date);
          if (comp !== 0) return comp;
          return a.startTime.localeCompare(b.startTime);
        })
        .slice(0, 10)
        .map((l) => {
          const lessonOccupied = l.students?.length || enrolledCount;
          const lessonAvailable = Math.max(0, maxCapacity - lessonOccupied);

          let seatStatusLabel = '🟢 Есть места';
          let seatBadgeType: 'available' | 'few' | 'full' = 'available';

          if (lessonAvailable === 0) {
            seatStatusLabel = 'Мест нет';
            seatBadgeType = 'full';
          } else if (lessonAvailable === 1) {
            seatStatusLabel = '1 место';
            seatBadgeType = 'few';
          } else {
            seatStatusLabel = `Есть места (${lessonAvailable} места)`;
            seatBadgeType = 'available';
          }

          return {
            id: l.id,
            date: l.date,
            dateFormatted: l.dateFormatted || l.date,
            dayOfWeek: l.dayOfWeek,
            startTime: l.startTime,
            endTime: l.endTime,
            timeLabel: `${l.startTime} – ${l.endTime}`,
            teacherName: l.teacherName,
            topic: l.topic,
            room: l.room || 'Онлайн (Zoom)',
            onlineMeetingUrl: l.onlineMeetingUrl,
            availableSeats: lessonAvailable,
            maxCapacity,
            seatStatusLabel,
            seatBadgeType,
          };
        });

      return {
        id: g.id,
        name: g.name,
        courseName: g.courseName,
        teacherName: g.teacherName,
        schedule: g.schedule || 'Пн, Ср • 18:00–19:15',
        ageBracket: '14–16 лет',
        capacity: maxCapacity,
        enrolledCount,
        availableSeats,
        occupancyRate,
        lessons: groupLessons,
      };
    });

    return NextResponse.json({
      success: true,
      groups: groupsWithLessons,
    });
  } catch (err: any) {
    console.error('Error fetching groups in Mini App:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
