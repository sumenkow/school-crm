'use client';

import { FullLessonData, INITIAL_LESSONS, INITIAL_STUDENTS, FullStudentData, TimelineInteraction } from './mockData';
import { getStoredStudents, saveStudentToStorage } from './studentStorage';
import { saveInteractionToStorage, sortTimelineChronologicalDesc } from './timelineStorage';

const LESSONS_STORAGE_KEY = 'crm_lessons_master_v2';

/**
 * Loads all lessons from localStorage merged with INITIAL_LESSONS.
 */
export function getStoredLessons(): FullLessonData[] {
  if (typeof window === 'undefined') return INITIAL_LESSONS;
  try {
    const raw = localStorage.getItem(LESSONS_STORAGE_KEY);
    if (!raw) return INITIAL_LESSONS;
    const stored: FullLessonData[] = JSON.parse(raw);
    if (!Array.isArray(stored) || stored.length === 0) return INITIAL_LESSONS;

    const storedMap = new Map<string, FullLessonData>(stored.map((l) => [l.id, l]));
    const result: FullLessonData[] = [];

    for (const init of INITIAL_LESSONS) {
      if (storedMap.has(init.id)) {
        result.push(storedMap.get(init.id)!);
        storedMap.delete(init.id);
      } else {
        result.push(init);
      }
    }

    for (const extra of storedMap.values()) {
      result.unshift(extra);
    }

    return result;
  } catch (err) {
    console.error('Failed to parse stored lessons:', err);
    return INITIAL_LESSONS;
  }
}

/**
 * Retrieves a single lesson by ID from stored lessons.
 */
export function getStoredLessonById(lessonId: string): FullLessonData | undefined {
  const all = getStoredLessons();
  return all.find((l) => l.id === lessonId);
}

/**
 * Persists a lesson to in-memory INITIAL_LESSONS, localStorage, and triggers Supabase cloud sync.
 */
export function saveLessonToStorage(lesson: FullLessonData): void {
  // 1. In-memory update
  const idx = INITIAL_LESSONS.findIndex((l) => l.id === lesson.id);
  if (idx !== -1) {
    INITIAL_LESSONS[idx] = lesson;
  } else {
    INITIAL_LESSONS.unshift(lesson);
  }

  // 2. LocalStorage update
  if (typeof window !== 'undefined') {
    try {
      const all = getStoredLessons();
      const existingIdx = all.findIndex((l) => l.id === lesson.id);
      const updated = existingIdx !== -1
        ? all.map((item) => (item.id === lesson.id ? lesson : item))
        : [lesson, ...all];

      localStorage.setItem(LESSONS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: { lessonId: lesson.id } }));
    } catch (err) {
      console.error('Failed to save lesson to localStorage:', err);
    }

    // 3. Supabase dual-write (fire-and-forget)
    import('@/lib/supabase/client').then(async ({ createClient }) => {
      try {
        const supabase = createClient();
        await supabase.from('lessons').upsert({
          id: lesson.id,
          group_id: lesson.groupId || null,
          teacher_id: lesson.teacherId || null,
          title: lesson.topic || lesson.groupName,
          date: lesson.date,
          start_time: lesson.startTime,
          end_time: lesson.endTime,
          room: lesson.room,
          status: lesson.status,
          topic: lesson.topic,
          homework: lesson.homework,
          online_meeting_url: lesson.onlineMeetingUrl,
          is_trial: lesson.isTrial || false,
          is_mock_data: false,
        });
      } catch (e) {
        // ignore in offline / dev mode
      }
    }).catch(() => {});
  }
}

/**
 * Updates attendance for a batch of students in a lesson,
 * recalculates student attendance statistics, updates student records and timeline,
 * and persists everything immediately to Supabase and LocalStorage.
 */
export function recordLessonAttendanceBatch(params: {
  lessonId: string;
  topic: string;
  homework?: string;
  teacherName: string;
  studentRecords: Array<{
    studentId: string;
    studentName: string;
    status: 'present' | 'absent' | 'excused' | 'rescheduled' | 'not_marked';
    note?: string;
  }>;
}): { updatedLesson: FullLessonData | null } {
  const currentLesson = getStoredLessonById(params.lessonId);
  if (!currentLesson) return { updatedLesson: null };

  const allStudents = getStoredStudents();

  const updatedStudentsInLesson = currentLesson.students.map((ls) => {
    const record = params.studentRecords.find((r) => r.studentId === ls.id);
    if (record) {
      return {
        ...ls,
        attendanceStatus: record.status,
        notes: record.note || ls.notes,
      };
    }
    return ls;
  });

  const updatedLesson: FullLessonData = {
    ...currentLesson,
    status: 'completed',
    topic: params.topic || currentLesson.topic,
    homework: params.homework !== undefined ? params.homework : currentLesson.homework,
    students: updatedStudentsInLesson,
  };

  saveLessonToStorage(updatedLesson);

  // Update each student in studentStorage
  params.studentRecords.forEach((rec) => {
    if (rec.status === 'not_marked') return;

    const student = allStudents.find((s) => s.id === rec.studentId);
    if (!student) return;

    const existingHistory = student.attendanceStats?.history || [];
    const dateFormatted = currentLesson.dateFormatted || currentLesson.date;

    // Filter out existing history entry for this lesson date if any
    const filteredHistory = existingHistory.filter((h) => h.date !== dateFormatted || h.groupName !== currentLesson.groupName);

    const historyStatus: 'present' | 'absent' | 'rescheduled' | 'cancelled' =
      rec.status === 'present' ? 'present' : rec.status === 'rescheduled' ? 'rescheduled' : 'absent';

    const newHistoryItem = {
      date: dateFormatted,
      groupName: currentLesson.groupName,
      status: historyStatus,
      topic: params.topic || currentLesson.topic,
      notes: rec.note,
    };

    const newHistory = [newHistoryItem, ...filteredHistory];
    const total = newHistory.length;
    const present = newHistory.filter((h) => h.status === 'present').length;
    const absent = newHistory.filter((h) => h.status === 'absent').length;
    const rescheduled = newHistory.filter((h) => h.status === 'rescheduled').length;
    const rate = total > 0 ? `${Math.round((present / total) * 100)}%` : '100%';

    const updatedStudent: FullStudentData = {
      ...student,
      attendanceStats: {
        totalLessons: total,
        presentCount: present,
        absentCount: absent,
        rescheduledCount: rescheduled,
        attendanceRate: rate,
        history: newHistory,
      },
    };

    saveStudentToStorage(updatedStudent);

    // If teacher provided a note, also record it in the student's timeline
    if (rec.note && rec.note.trim()) {
      const now = new Date();
      const timeFormatted = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      const interaction: TimelineInteraction = {
        id: `int_att_${Date.now()}_${rec.studentId}`,
        studentId: rec.studentId,
        occurredAt: `Сегодня, ${timeFormatted}`,
        author: params.teacherName || 'Преподаватель',
        channel: 'other',
        type: 'status_change',
        content: `Посещаемость: ${rec.status === 'present' ? 'Присутствовал' : rec.status === 'absent' ? 'Пропуск' : 'Перенос'}. Комментарий преподавателя: "${rec.note.trim()}" (Урок: ${currentLesson.groupName})`,
      };
      saveInteractionToStorage(interaction);
    }
  });

  return { updatedLesson };
}
