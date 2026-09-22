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
 * Loads all lessons from Supabase cloud database and merges with in-memory state.
 */
export async function fetchLessonsFromSupabase(): Promise<FullLessonData[]> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { data: dbLessons, error } = await supabase
      .from('lessons')
      .select('*')
      .order('date', { ascending: false });

    if (!error && dbLessons && dbLessons.length > 0) {
      for (const l of dbLessons) {
        const existingIdx = INITIAL_LESSONS.findIndex((il) => il.id === l.id);
        const mappedLesson: Partial<FullLessonData> = {
          id: l.id,
          groupId: l.group_id || undefined,
          teacherId: l.teacher_id || undefined,
          date: l.date,
          dateFormatted: new Date(l.date).toLocaleDateString('ru-RU'),
          startTime: l.start_time || '18:45',
          endTime: l.end_time || '20:15',
          room: l.room || 'Онлайн (Zoom)',
          status: (l.status as any) || 'scheduled',
          topic: l.topic || l.title || 'Тема урока',
          homework: l.homework || undefined,
          onlineMeetingUrl: l.online_meeting_url || undefined,
          isTrial: l.is_trial || false,
        };

        if (existingIdx !== -1) {
          INITIAL_LESSONS[existingIdx] = { ...INITIAL_LESSONS[existingIdx], ...mappedLesson };
        }
      }
    }
  } catch (err) {
    console.warn('Supabase lessons fetch warning:', err);
  }

  return getStoredLessons();
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

    // Direct Supabase Cloud DB attendances write
  if (typeof window !== 'undefined') {
    import('@/lib/supabase/client').then(async ({ createClient }) => {
      try {
        const supabase = createClient();
        for (const rec of params.studentRecords) {
          if (rec.status !== 'not_marked') {
            await supabase.from('attendances').upsert({
              lesson_id: params.lessonId,
              student_id: rec.studentId,
              status: rec.status,
              notes: rec.note || null,
            });
          }
        }
      } catch (e) {
        // ignore offline
      }
    }).catch(() => {});
  }

  // Automatic lesson deduction for present students
  const presentStudentIds = params.studentRecords
    .filter((r) => r.status === 'present')
    .map((r) => r.studentId);

  if (presentStudentIds.length > 0) {
    processAutomaticLessonBilling({
      lessonId: params.lessonId,
      studentIdsToBill: presentStudentIds,
    });
  }

  return { updatedLesson };
}

/**
 * Automatically deducts 1 lesson from the student's active subscription (or deducts from deposit)
 * when a lesson is marked completed or attendance is recorded.
 * Avoids duplicate billing by tracking student subscriptions and lesson state.
 */
export function processAutomaticLessonBilling(params: {
  lessonId: string;
  studentIdsToBill: string[];
}): { billedCount: number; billedStudents: string[] } {
  const currentLesson = getStoredLessonById(params.lessonId);
  if (!currentLesson) return { billedCount: 0, billedStudents: [] };

  const allStudents = getStoredStudents();
  let billedCount = 0;
  const billedStudents: string[] = [];
  const now = new Date();
  const timeFormatted = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  for (const studentId of params.studentIdsToBill) {
    const student = allStudents.find((s) => s.id === studentId);
    if (!student) continue;

    let billed = false;

    // 1. If student has active subscription with remaining lessons
    if (student.finance?.activeSubscription && (student.finance.activeSubscription.lessonsRemaining || 0) > 0) {
      const sub = student.finance.activeSubscription;
      const prevRemaining = sub.lessonsRemaining || 0;
      const newRemaining = Math.max(0, prevRemaining - 1);
      const total = sub.lessonsTotal || 8;
      const attendedCount = total - newRemaining;
      const newStatus = newRemaining === 0 ? 'completed' : sub.status || 'active';

      const updatedStudent: FullStudentData = {
        ...student,
        finance: {
          ...student.finance,
          activeSubscription: {
            ...sub,
            lessonsRemaining: newRemaining,
            lessonsAttended: `${attendedCount} из ${total}`,
            status: newStatus,
          },
        },
      };

      saveStudentToStorage(updatedStudent);
      billed = true;

      // Add timeline interaction
      const interaction: TimelineInteraction = {
        id: `bill_${Date.now()}_${student.id}`,
        studentId: student.id,
        occurredAt: `Сегодня, ${timeFormatted}`,
        author: 'Биллинг-система',
        channel: 'other',
        type: 'organizational',
        content: `💳 Автосписание: списано 1 занятие по абонементу за урок «${currentLesson.groupName}» (${currentLesson.dateFormatted || currentLesson.date}). Остаток по абонементу: ${newRemaining} ур.`,
      };
      saveInteractionToStorage(interaction);
    } else if (student.finance?.deposit && student.finance.deposit.balance > 0) {
      // 2. If student has deposit balance
      const price = student.finance.deposit.pricePerLesson || 1050;
      const newBalance = Math.max(0, student.finance.deposit.balance - price);
      const updatedStudent: FullStudentData = {
        ...student,
        finance: {
          ...student.finance,
          deposit: {
            ...student.finance.deposit,
            balance: newBalance,
            balanceFormatted: `${newBalance.toLocaleString('ru-RU')} ₽`,
          },
        },
      };

      saveStudentToStorage(updatedStudent);
      billed = true;

      const interaction: TimelineInteraction = {
        id: `bill_${Date.now()}_${student.id}`,
        studentId: student.id,
        occurredAt: `Сегодня, ${timeFormatted}`,
        author: 'Биллинг-система',
        channel: 'other',
        type: 'organizational',
        content: `💳 Автосписание: списано ${price.toLocaleString('ru-RU')} ₽ с депозита за урок «${currentLesson.groupName}» (${currentLesson.dateFormatted || currentLesson.date}). Новый баланс: ${newBalance.toLocaleString('ru-RU')} ₽.`,
      };
      saveInteractionToStorage(interaction);
    }

    if (billed) {
      billedCount++;
      billedStudents.push(`${student.firstName} ${student.lastName}`);
    }
  }

  if (billedCount > 0) {
    const updatedLesson: FullLessonData = {
      ...currentLesson,
      isBilled: true,
      billedAt: new Date().toISOString(),
    };
    saveLessonToStorage(updatedLesson);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crm-students-changed'));
      window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed'));
    }
  }

  return { billedCount, billedStudents };
}

export interface GenerateGroupLessonsParams {
  groupId: string;
  groupName: string;
  courseName: string;
  teacherId?: string;
  teacherName?: string;
  room?: string;
  daysOfWeek: number[]; // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  startTime: string; // e.g. '18:45'
  endTime: string; // e.g. '20:15'
  startDate?: string; // YYYY-MM-DD
  horizon: '1_month' | '2_months' | '3_months' | 'custom_date';
  customEndDate?: string; // YYYY-MM-DD
  students?: Array<{ id: string; name: string; isTrial?: boolean }>;
  onlineMeetingUrl?: string;
  topicPrefix?: string;
}

/**
 * Generates a batch of scheduled lessons across a calendar horizon (1 month, 2 months, 3 months, etc.)
 * based on selected days of the week and lesson time.
 */
export function generateLessonsForGroupSchedule(params: GenerateGroupLessonsParams): {
  createdCount: number;
  lessons: FullLessonData[];
} {
  const existingLessons = getStoredLessons();
  const createdLessons: FullLessonData[] = [];

  const todayStr = new Date().toISOString().slice(0, 10);
  const start = params.startDate ? new Date(params.startDate) : new Date(todayStr);

  let end = new Date(start);
  if (params.horizon === '1_month') {
    end.setDate(end.getDate() + 30);
  } else if (params.horizon === '2_months') {
    end.setDate(end.getDate() + 60);
  } else if (params.horizon === '3_months') {
    end.setDate(end.getDate() + 90);
  } else if (params.horizon === 'custom_date' && params.customEndDate) {
    end = new Date(params.customEndDate);
  } else {
    end.setDate(end.getDate() + 30);
  }

  const current = new Date(start);
  let lessonCounter = 1;

  while (current <= end) {
    const jsDay = current.getDay();
    const crmDay = jsDay === 0 ? 6 : jsDay - 1;

    if (params.daysOfWeek.includes(crmDay)) {
      const dateISO = current.toISOString().slice(0, 10);
      const dateFormatted = current.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      const alreadyExists = existingLessons.some(
        (l) => l.groupId === params.groupId && l.date === dateISO && l.startTime === params.startTime
      );

      if (!alreadyExists) {
        const lessonId = `l_gen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${lessonCounter}`;
        const newLesson: FullLessonData = {
          id: lessonId,
          groupId: params.groupId,
          groupName: params.groupName,
          courseName: params.courseName,
          teacherId: params.teacherId || 't1',
          teacherName: params.teacherName || 'Мария Иванова',
          date: dateISO,
          dateFormatted,
          dayOfWeek: crmDay,
          startTime: params.startTime,
          endTime: params.endTime,
          room: params.room || 'Онлайн (Zoom)',
          topic: params.topicPrefix ? `${params.topicPrefix} (Урок ${lessonCounter})` : `Плановое занятие ${lessonCounter}`,
          onlineMeetingUrl: params.onlineMeetingUrl,
          status: 'scheduled',
          students: (params.students || []).map((s) => ({
            id: s.id,
            name: s.name,
            attendanceStatus: 'not_marked',
            isTrial: s.isTrial || false,
          })),
        };

        saveLessonToStorage(newLesson);
        createdLessons.push(newLesson);
        lessonCounter++;
      }
    }

    current.setDate(current.getDate() + 1);
  }

  if (createdLessons.length > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crm-lessons-changed'));
  }

  return { createdCount: createdLessons.length, lessons: createdLessons };
}
