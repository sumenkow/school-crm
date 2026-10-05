'use client';

import { FullLessonData, INITIAL_LESSONS, INITIAL_STUDENTS, FullStudentData, TimelineInteraction } from './mockData';
import { getStoredStudents, saveStudentToStorage } from './studentStorage';
import { saveInteractionToStorage, sortTimelineChronologicalDesc, getEquivalentIds } from './timelineStorage';
import { persistEntityToCloud } from './cloudSync';

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

    const seenIds = new Set<string>();
    const result: FullLessonData[] = [];

    for (const l of stored) {
      if (!l || !l.id) continue;
      if (seenIds.has(l.id)) continue;
      seenIds.add(l.id);
      result.push(l);
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

    // 3. Supabase Cloud DB write via sync layer
    persistEntityToCloud('lesson', lesson);
  }
}

/**
 * Deletes a lesson from in-memory INITIAL_LESSONS, localStorage, and triggers Supabase cloud deletion.
 */
export function deleteLessonFromStorage(lessonId: string): void {
  // 1. In-memory deletion
  const idx = INITIAL_LESSONS.findIndex((l) => l.id === lessonId);
  if (idx !== -1) {
    INITIAL_LESSONS.splice(idx, 1);
  }

  // 2. LocalStorage deletion
  if (typeof window !== 'undefined') {
    try {
      const all = getStoredLessons();
      const updated = all.filter((item) => item.id !== lessonId);
      localStorage.setItem(LESSONS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: { lessonId, deleted: true } }));
    } catch (err) {
      console.error('Failed to delete lesson from localStorage:', err);
    }

    // 3. Supabase Cloud DB deletion
    try {
      import('@/lib/supabase/client').then(({ createClient }) => {
        const supabase = createClient();
        supabase.from('lessons').delete().eq('id', lessonId).then();
      }).catch((e) => console.warn('Supabase delete import error:', e));
    } catch (err) {
      console.warn('Supabase lesson deletion warning:', err);
    }
  }
}

/**
 * Updates attendance for a batch of students in a lesson,
 * recalculates student attendance statistics, updates student records and timeline,
 * and persists everything immediately to Supabase and LocalStorage.
 */
export function recordLessonAttendanceBatch(params: {
  lessonId: string;
  topic?: string;
  homework?: string;
  teacherName?: string;
  status?: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  studentRecords: Array<{
    studentId: string;
    studentName: string;
    status: 'present' | 'absent' | 'excused' | 'rescheduled' | 'cancelled' | 'not_marked';
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
        notes: record.note !== undefined ? record.note : ls.notes,
      };
    }
    return ls;
  });

  const updatedLesson: FullLessonData = {
    ...currentLesson,
    status: params.status || currentLesson.status || 'completed',
    topic: params.topic || currentLesson.topic,
    homework: params.homework !== undefined ? params.homework : currentLesson.homework,
    students: updatedStudentsInLesson,
  };

  saveLessonToStorage(updatedLesson);

  // Update each student in studentStorage
  params.studentRecords.forEach((rec) => {
    if (rec.status === 'not_marked') return;

    const eqSet = getEquivalentIds(rec.studentId);
    const recNameClean = (rec.studentName || '').trim().toLowerCase();

    console.log('[CRM-DEBUG] recordLessonAttendanceBatch: processing rec', { recStudentId: rec.studentId, recStudentName: rec.studentName, hasNote: !!rec.note?.trim(), allStudentsCount: allStudents.length });
    
    // Priority 1: name-based search (most reliable — IDs in lessons can be stale/wrong)
    // This handles the case where lesson.students[].id="1" but in storage id="1"
    // maps to a different renamed student (e.g. "Иван Смирнов") while "Вася Пупкин"
    // lives at id="b6666666-..."
    let student: (typeof allStudents)[0] | undefined;
    if (recNameClean) {
      const matchingByName = allStudents.filter((s) => {
        const directName = `${s.firstName || ''} ${s.lastName || ''}`.trim().toLowerCase();
        const reversedName = `${s.lastName || ''} ${s.firstName || ''}`.trim().toLowerCase();
        return directName === recNameClean || reversedName === recNameClean;
      });

      if (matchingByName.length === 1) {
        student = matchingByName[0];
      } else if (matchingByName.length > 1) {
        // Disambiguate: prefer the one matching by ID, then by group
        const idMatch = matchingByName.find((s) => s.id === rec.studentId || eqSet.has(s.id));
        const groupMatch = !idMatch && matchingByName.find((s) =>
          (s.groups || []).some(
            (g) =>
              (currentLesson.groupId && g.id === currentLesson.groupId) ||
              (currentLesson.groupName && g.name?.toLowerCase() === currentLesson.groupName.toLowerCase())
          )
        );
        student = idMatch || groupMatch || matchingByName[0];
      }
    }

    // Priority 2: Fallback to ID / equivalence match (if no name or name gave no result)
    if (!student) {
      student = allStudents.find((s) => s.id === rec.studentId || eqSet.has(s.id));
    }

    if (!student) {
      console.warn('[CRM-DEBUG] recordLessonAttendanceBatch: student NOT FOUND for', { recStudentId: rec.studentId, recStudentName: rec.studentName, allStudentIds: allStudents.map(s => s.id) });
      return;
    }
    console.log('[CRM-DEBUG] recordLessonAttendanceBatch: student FOUND', { studentId: student.id, studentName: `${student.firstName} ${student.lastName}` });

    const existingHistory = student.attendanceStats?.history || [];
    const dateFormatted = currentLesson.dateFormatted || currentLesson.date;

    // Filter out existing history entry for this lesson date if any
    const filteredHistory = existingHistory.filter((h) => h.date !== dateFormatted || h.groupName !== currentLesson.groupName);

    const historyStatus: 'present' | 'absent' | 'rescheduled' | 'cancelled' | 'sick' | 'excused' =
      rec.status === 'present'
        ? 'present'
        : rec.status === 'rescheduled'
        ? 'rescheduled'
        : rec.status === 'excused'
        ? 'excused'
        : 'absent';

    const isPresent = historyStatus === 'present';
    const cleanNote = rec.note?.trim() || undefined;

    const newHistoryItem = {
      date: dateFormatted,
      groupName: currentLesson.groupName,
      status: historyStatus,
      topic: params.topic || currentLesson.topic,
      notes: cleanNote,
      reason: !isPresent ? cleanNote : undefined,
      feedback: cleanNote,
      teacherName: params.teacherName || currentLesson.teacherName,
      time: currentLesson.endTime || currentLesson.startTime,
    };

    const newHistory = [newHistoryItem, ...filteredHistory];
    const total = newHistory.length;
    const present = newHistory.filter((h) => h.status === 'present').length;
    const absent = newHistory.filter((h) => h.status === 'absent').length;
    const rescheduled = newHistory.filter((h) => h.status === 'rescheduled').length;
    const rate = total > 0 ? `${Math.round((present / total) * 100)}%` : '100%';

    let updatedComments = [...(student.teacherComments || [])];
    let updatedInteractions = [...(student.interactions || [])];

    if (cleanNote) {
      const teacherAuthor = params.teacherName || currentLesson.teacherName || 'Преподаватель';
      const commentTime = currentLesson.endTime || currentLesson.startTime || new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      const commentDateFormatted = `${dateFormatted}, ${commentTime}`.trim();

      // 1. Add to student.teacherComments
      const teacherCommentId = `tc_att_${Date.now()}_${student.id}`;
      updatedComments = updatedComments.filter(
        (c) => !(c.groupName === currentLesson.groupName && c.date?.includes(dateFormatted))
      );
      updatedComments.unshift({
        id: teacherCommentId,
        studentId: student.id,
        author: teacherAuthor.includes('(') ? teacherAuthor : `${teacherAuthor} (Преподаватель)`,
        date: commentDateFormatted,
        groupName: currentLesson.groupName,
        lessonTopic: params.topic || currentLesson.topic,
        category: 'progress',
        content: cleanNote,
      });

      // 2. Add to timeline interaction
      const now = new Date();
      const timeFormatted = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      const primaryParent = student.parents?.[0];
      const parentName = primaryParent ? `${primaryParent.firstName || ''} ${primaryParent.lastName || ''}`.trim() : undefined;

      const interaction: TimelineInteraction = {
        id: `int_att_${Date.now()}_${student.id}`,
        studentId: student.id,
        studentName: `${student.firstName || ''} ${student.lastName || ''}`.trim() || rec.studentName,
        parentId: primaryParent?.id,
        parentName,
        targetType: primaryParent ? 'parent' : 'student',
        targetName: parentName || rec.studentName,
        targetRole: primaryParent ? (primaryParent.relationshipType || 'Родитель') : 'Ученик',
        occurredAt: `Сегодня, ${timeFormatted}`,
        createdAt: now.toISOString(),
        author: teacherAuthor,
        channel: 'note',
        type: 'teacher_comment',
        content: `💬 Комментарий преподавателя по уроку «${currentLesson.groupName}» (${rec.status === 'present' ? 'Был на уроке' : rec.status === 'absent' ? 'Пропуск' : 'Перенос'}): «${cleanNote}»`,
      };

      console.log('[CRM-DEBUG] saveInteractionToStorage called', { interactionId: interaction.id, studentId: interaction.studentId, studentName: interaction.studentName, content: interaction.content.slice(0, 80) });
      saveInteractionToStorage(interaction);
      updatedInteractions = [interaction, ...updatedInteractions];
    }

    const updatedStudent: FullStudentData = {
      ...student,
      teacherComments: updatedComments,
      interactions: updatedInteractions,
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

    // Sync in-memory allStudents array so subsequent records don't overwrite with stale data
    const allIdx = allStudents.findIndex((s) => s.id === student.id || eqSet.has(s.id));
    if (allIdx !== -1) {
      allStudents[allIdx] = updatedStudent;
    }

    // Sync in-memory INITIAL_STUDENTS
    const idx = INITIAL_STUDENTS.findIndex((s) => s.id === student.id || eqSet.has(s.id));
    if (idx !== -1) {
      INITIAL_STUDENTS[idx] = updatedStudent;
    }
  });

  // Direct Supabase Cloud DB attendance write
  if (typeof window !== 'undefined') {
    persistEntityToCloud('attendance', {
      lessonId: params.lessonId,
      studentRecords: params.studentRecords,
    });

    import('@/lib/supabase/client').then(async ({ createClient }) => {
      try {
        const supabase = createClient();
        for (const rec of params.studentRecords) {
          if (rec.status !== 'not_marked') {
            const recNameClean = (rec.studentName || '').trim().toLowerCase();
            const matchedStudent = allStudents.find((s) => {
              const directName = `${s.firstName || ''} ${s.lastName || ''}`.trim().toLowerCase();
              const reversedName = `${s.lastName || ''} ${s.firstName || ''}`.trim().toLowerCase();
              return (recNameClean && (directName === recNameClean || reversedName === recNameClean)) || s.id === rec.studentId;
            });
            const finalStudentId = matchedStudent?.id || rec.studentId;

            await supabase.from('attendance').upsert({
              lesson_id: params.lessonId,
              student_id: finalStudentId,
              status: rec.status,
              notes: rec.note || null,
              marked_at: new Date().toISOString(),
            }, { onConflict: 'lesson_id,student_id' });
          }
        }
      } catch {
        // ignore offline
      }
    }).catch(() => {});
  }

  // Automatic lesson deduction for present students using resolved student IDs
  const presentStudentIds = params.studentRecords
    .filter((r) => r.status === 'present')
    .map((r) => {
      const recNameClean = (r.studentName || '').trim().toLowerCase();
      const matched = allStudents.find((s) => {
        const directName = `${s.firstName || ''} ${s.lastName || ''}`.trim().toLowerCase();
        const reversedName = `${s.lastName || ''} ${s.firstName || ''}`.trim().toLowerCase();
        return (recNameClean && (directName === recNameClean || reversedName === recNameClean)) || s.id === r.studentId;
      });
      return matched?.id || r.studentId;
    });

  if (presentStudentIds.length > 0) {
    processAutomaticLessonBilling({
      lessonId: params.lessonId,
      studentIdsToBill: presentStudentIds,
    });
  }

  return { updatedLesson: getStoredLessonById(params.lessonId) || updatedLesson };
}

export interface BillingProcessResult {
  status: 'success' | 'already_billed' | 'no_op' | 'not_found';
  billedCount: number;
  billedStudents: string[];
}

export interface RestoreBillingResult {
  restoredCount: number;
  restoredStudents: string[];
}

/**
 * Automatically deducts 1 lesson from the student's active subscription (or deducts from deposit)
 * when a lesson is marked completed or attendance is recorded.
 * Avoids duplicate billing by maintaining an idempotency key (lessonId, studentId)
 * and tracking billed student IDs on the lesson object.
 */
export function processAutomaticLessonBilling(params: {
  lessonId: string;
  studentIdsToBill: string[];
}): BillingProcessResult {
  const currentLesson = getStoredLessonById(params.lessonId);
  if (!currentLesson) return { status: 'not_found', billedCount: 0, billedStudents: [] };

  if (!params.studentIdsToBill || params.studentIdsToBill.length === 0) {
    return { status: 'no_op', billedCount: 0, billedStudents: [] };
  }

  // Idempotency tracking: check lesson.billedStudentIds and per-student billed flag in lesson.students
  const existingBilledIds = new Set<string>(currentLesson.billedStudentIds || []);
  for (const s of currentLesson.students || []) {
    if (s.billed) {
      existingBilledIds.add(s.id);
      const eq = getEquivalentIds(s.id);
      eq.forEach((id) => existingBilledIds.add(id));
    }
  }

  // Filter students who are already billed (idempotency key: lessonId + studentId)
  const unbilledStudentIds = params.studentIdsToBill.filter((id) => {
    if (existingBilledIds.has(id)) return false;
    const eq = getEquivalentIds(id);
    for (const eid of eq) {
      if (existingBilledIds.has(eid)) return false;
    }
    return true;
  });

  if (unbilledStudentIds.length === 0) {
    return { status: 'already_billed', billedCount: 0, billedStudents: [] };
  }

  const allStudents = getStoredStudents();
  let billedCount = 0;
  const billedStudents: string[] = [];
  const newlyBilledIds: string[] = [];
  const updatedBillingDetails: Record<string, { type: 'subscription' | 'deposit'; amount?: number; at?: string }> = {
    ...(currentLesson.billingDetails || {}),
  };

  const now = new Date();
  const timeFormatted = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  for (const studentId of unbilledStudentIds) {
    // AUD-004 Requirement:
    // Billing is strictly allowed ONLY for students with attendanceStatus === 'present'.
    // NEVER bill not_marked, absent, excused, rescheduled, or cancelled.
    const lessonStudent = currentLesson.students?.find(
      (s) => s.id === studentId || getEquivalentIds(studentId).has(s.id)
    );

    if (!lessonStudent || lessonStudent.attendanceStatus !== 'present') {
      continue;
    }

    const student = allStudents.find((s) => s.id === studentId || getEquivalentIds(studentId).has(s.id));
    if (!student) continue;

    let billed = false;

    // 1. If student has active subscription with remaining lessons
    if (student.finance?.activeSubscription && (student.finance.activeSubscription.lessonsRemaining || 0) > 0) {
      const sub = student.finance.activeSubscription;
      const prevRemaining = sub.lessonsRemaining || 0;
      const newRemaining = Math.max(0, prevRemaining - 1);
      const total = sub.lessonsTotal || 8;

      const match = typeof sub.lessonsAttended === 'string' ? sub.lessonsAttended.match(/^(\d+)/) : null;
      const prevAttended = match
        ? parseInt(match[1], 10)
        : typeof sub.lessonsAttended === 'number'
        ? sub.lessonsAttended
        : Math.max(0, total - prevRemaining);
      const newAttended = prevAttended + 1;
      const newStatus = newRemaining === 0 ? 'completed' : sub.status || 'active';

      const updatedStudent: FullStudentData = {
        ...student,
        finance: {
          ...student.finance,
          activeSubscription: {
            ...sub,
            lessonsRemaining: newRemaining,
            lessonsAttended: `${newAttended} из ${total}`,
            status: newStatus,
          },
        },
      };

      saveStudentToStorage(updatedStudent);
      billed = true;
      newlyBilledIds.push(student.id);
      if (studentId !== student.id) newlyBilledIds.push(studentId);
      updatedBillingDetails[student.id] = {
        type: 'subscription',
        amount: 1,
        at: now.toISOString(),
      };

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
      newlyBilledIds.push(student.id);
      if (studentId !== student.id) newlyBilledIds.push(studentId);
      updatedBillingDetails[student.id] = {
        type: 'deposit',
        amount: price,
        at: now.toISOString(),
      };

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
    const combinedBilledStudentIds = Array.from(
      new Set([...(currentLesson.billedStudentIds || []), ...newlyBilledIds])
    );

    const updatedStudentsList = (currentLesson.students || []).map((s) => {
      if (newlyBilledIds.includes(s.id) || newlyBilledIds.some((nbId) => getEquivalentIds(nbId).has(s.id))) {
        return { ...s, billed: true };
      }
      return s;
    });

    const updatedLesson: FullLessonData = {
      ...currentLesson,
      isBilled: true,
      billedAt: now.toISOString(),
      billedStudentIds: combinedBilledStudentIds,
      billingDetails: updatedBillingDetails,
      students: updatedStudentsList,
    };

    saveLessonToStorage(updatedLesson);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: updatedLesson }));
      window.dispatchEvent(new CustomEvent('crm-students-changed'));
      window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed'));
    }

    return { status: 'success', billedCount, billedStudents };
  }

  // If no new billing occurred
  return {
    status: params.studentIdsToBill.length > unbilledStudentIds.length ? 'already_billed' : 'no_op',
    billedCount: 0,
    billedStudents: [],
  };
}

/**
 * Rolls back automatic billing when a completed lesson is changed to cancelled.
 * Reverts subscription deduction, refunds deposit balance, and records timeline interactions.
 */
export function restoreLessonBilling(lessonId: string): RestoreBillingResult {
  const currentLesson = getStoredLessonById(lessonId);
  if (!currentLesson) return { restoredCount: 0, restoredStudents: [] };

  const billedStudentIds = currentLesson.billedStudentIds && currentLesson.billedStudentIds.length > 0
    ? currentLesson.billedStudentIds
    : (currentLesson.students || []).filter((s) => s.billed).map((s) => s.id);

  if (!billedStudentIds || billedStudentIds.length === 0) {
    return { restoredCount: 0, restoredStudents: [] };
  }

  const allStudents = getStoredStudents();
  let restoredCount = 0;
  const restoredStudents: string[] = [];
  const processedStudentIds = new Set<string>();

  const now = new Date();
  const timeFormatted = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  for (const studentId of billedStudentIds) {
    const student = allStudents.find((s) => s.id === studentId || getEquivalentIds(studentId).has(s.id));
    if (!student) continue;

    // Prevent double refunding if studentId was listed multiple times (or equivalent IDs)
    if (processedStudentIds.has(student.id)) continue;
    processedStudentIds.add(student.id);

    const billingDetail = currentLesson.billingDetails?.[studentId] || currentLesson.billingDetails?.[student.id];
    let restored = false;

    if (billingDetail?.type === 'deposit') {
      // Refund deposit
      const refundAmount = billingDetail.amount || student.finance?.deposit?.pricePerLesson || 1050;
      const currentBalance = student.finance?.deposit?.balance || 0;
      const newBalance = currentBalance + refundAmount;

      const updatedStudent: FullStudentData = {
        ...student,
        finance: {
          ...student.finance,
          deposit: {
            ...student.finance?.deposit,
            balance: newBalance,
            balanceFormatted: `${newBalance.toLocaleString('ru-RU')} ₽`,
            currency: student.finance?.deposit?.currency || 'RUB',
          },
        },
      };

      saveStudentToStorage(updatedStudent);
      restored = true;
    } else if (student.finance?.activeSubscription) {
      // Restore subscription: Increment activeSubscription.lessonsRemaining by 1, Decrement activeSubscription.lessonsAttended by 1
      const sub = student.finance.activeSubscription;
      const currentRemaining = sub.lessonsRemaining ?? 0;
      const newRemaining = currentRemaining + 1;
      const total = sub.lessonsTotal || 8;

      const match = typeof sub.lessonsAttended === 'string' ? sub.lessonsAttended.match(/^(\d+)/) : null;
      const currentAttended = match
        ? parseInt(match[1], 10)
        : typeof sub.lessonsAttended === 'number'
        ? sub.lessonsAttended
        : Math.max(0, total - currentRemaining);
      const newAttended = Math.max(0, currentAttended - 1);

      const updatedStudent: FullStudentData = {
        ...student,
        finance: {
          ...student.finance,
          activeSubscription: {
            ...sub,
            lessonsRemaining: newRemaining,
            lessonsAttended: `${newAttended} из ${total}`,
            status: 'active',
          },
        },
      };

      saveStudentToStorage(updatedStudent);
      restored = true;
    } else if (student.finance?.deposit) {
      // Fallback if no subscription but deposit exists
      const refundAmount = student.finance.deposit.pricePerLesson || 1050;
      const currentBalance = student.finance.deposit.balance || 0;
      const newBalance = currentBalance + refundAmount;

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
      restored = true;
    }

    if (restored) {
      restoredCount++;
      restoredStudents.push(`${student.firstName} ${student.lastName}`);

      // Record interaction in student timeline: Возврат списания занятия в связи с отменой урока
      const interaction: TimelineInteraction = {
        id: `refund_${Date.now()}_${student.id}`,
        studentId: student.id,
        occurredAt: `Сегодня, ${timeFormatted}`,
        author: 'Биллинг-система',
        channel: 'other',
        type: 'organizational',
        content: `💳 Возврат списания занятия в связи с отменой урока «${currentLesson.groupName || ''}» (${currentLesson.dateFormatted || currentLesson.date}).`,
      };
      saveInteractionToStorage(interaction);
    }
  }

  // Clear billedStudentIds on the lesson
  const updatedLesson: FullLessonData = {
    ...currentLesson,
    isBilled: false,
    billedStudentIds: [],
    billingDetails: {},
    students: (currentLesson.students || []).map((s) => ({
      ...s,
      billed: false,
    })),
  };

  saveLessonToStorage(updatedLesson);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: updatedLesson }));
    window.dispatchEvent(new CustomEvent('crm-students-changed'));
    window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed'));
  }

  return { restoredCount, restoredStudents };
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
