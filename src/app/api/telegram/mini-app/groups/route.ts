import { NextRequest, NextResponse } from 'next/server';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { getStoredLessons } from '@/lib/data/lessonStorage';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function formatLessonHelper(l: any, maxCapacity: number, enrolledCount: number) {
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
    dayOfWeek: l.dayOfWeek || 1,
    startTime: l.startTime || '18:00',
    endTime: l.endTime || '19:15',
    timeLabel: `${l.startTime || '18:00'} – ${l.endTime || '19:15'}`,
    teacherName: l.teacherName || 'Преподаватель',
    topic: l.topic || 'Тема урока',
    room: l.room || 'Онлайн (Zoom)',
    onlineMeetingUrl: l.onlineMeetingUrl,
    availableSeats: lessonAvailable,
    maxCapacity,
    seatStatusLabel,
    seatBadgeType,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId') || '';
    const directionName = (searchParams.get('directionName') || '').toLowerCase().trim();
    const courseId = searchParams.get('courseId') || '';

    const allGroups = getStoredGroups();
    const allLessons = getStoredLessons();

    // =========================================================================
    // 1. SPECIFIC LESSON DEEP LINK LOOKUP (?lessonId=...)
    // =========================================================================
    if (lessonId) {
      let matchedLesson = allLessons.find((l) => l.id === lessonId);
      let matchedGroup = matchedLesson ? allGroups.find((g) => g.id === matchedLesson!.groupId) : null;

      // Check Supabase if not found in memory
      if (!matchedLesson && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        try {
          const supabase = createAdminClient();
          const { data: dbLesson } = await supabase.from('lessons').select('*').eq('id', lessonId).maybeSingle();
          if (dbLesson) {
            matchedLesson = {
              id: dbLesson.id,
              groupId: dbLesson.group_id,
              groupName: dbLesson.group_name || 'Группа',
              teacherName: dbLesson.teacher_name || 'Преподаватель',
              topic: dbLesson.topic || 'Занятие',
              date: dbLesson.date || dbLesson.lesson_date,
              startTime: dbLesson.start_time,
              endTime: dbLesson.end_time,
              status: dbLesson.status || 'scheduled',
              room: dbLesson.room || 'Онлайн (Zoom)',
              onlineMeetingUrl: dbLesson.online_meeting_url || dbLesson.zoom_url,
              students: [],
            } as any;

            if (dbLesson.group_id) {
              const { data: dbGroup } = await supabase.from('groups').select('*').eq('id', dbLesson.group_id).maybeSingle();
              if (dbGroup) {
                matchedGroup = {
                  id: dbGroup.id,
                  name: dbGroup.name,
                  courseName: dbGroup.course_name,
                  teacherName: dbGroup.teacher_name,
                  schedule: dbGroup.schedule || dbGroup.schedule_text,
                  capacity: dbGroup.capacity || 8,
                  students: [],
                } as any;
              }
            }
          }
        } catch (dbErr) {
          console.warn('Supabase lesson deep link lookup fallback:', dbErr);
        }
      }

      if (matchedLesson) {
        const parentGroup = matchedGroup || {
          id: matchedLesson.groupId || 'group_default',
          name: matchedLesson.groupName || 'Групповое занятие',
          courseName: matchedLesson.groupName || 'Курс',
          teacherName: matchedLesson.teacherName || 'Преподаватель',
          schedule: `${matchedLesson.date} • ${matchedLesson.startTime} - ${matchedLesson.endTime}`,
          capacity: 8,
          students: [],
        };

        const maxCap = parentGroup.capacity || 8;
        const enrolled = parentGroup.students?.length || 0;
        const formattedL = formatLessonHelper(matchedLesson, maxCap, enrolled);

        const formattedG = {
          id: parentGroup.id,
          name: parentGroup.name,
          courseName: parentGroup.courseName,
          teacherName: parentGroup.teacherName,
          schedule: parentGroup.schedule || `${matchedLesson.date} • ${matchedLesson.startTime} - ${matchedLesson.endTime}`,
          ageBracket: '14–16 лет',
          capacity: maxCap,
          enrolledCount: enrolled,
          availableSeats: Math.max(0, maxCap - enrolled),
          occupancyRate: Math.round((enrolled / maxCap) * 100),
          lessons: [formattedL],
        };

        return NextResponse.json({
          success: true,
          lesson: formattedL,
          group: formattedG,
          groups: [formattedG],
        });
      }
    }

    // =========================================================================
    // 2. STANDARD DIRECTION / COURSE FILTERING
    // =========================================================================
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
        .map((l) => formatLessonHelper(l, maxCapacity, enrolledCount));

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
