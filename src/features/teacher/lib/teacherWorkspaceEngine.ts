import {
  FullLessonData,
  FullGroupData,
  FullTeacherData,
  INITIAL_LESSONS,
  INITIAL_GROUPS,
  INITIAL_TEACHERS,
} from '@/lib/data/mockData';

export type TeacherLessonOperationalState =
  | 'in_progress'
  | 'starting_soon'
  | 'ready'
  | 'planned'
  | 'pending_approval'
  | 'journal_missing'
  | 'completed'
  | 'cancelled'
  | 'rescheduled';

export interface TeacherLessonRow {
  id: string;
  groupId: string;
  groupName: string;
  courseName: string;
  date: string;
  dateFormatted: string;
  startTime: string;
  endTime: string;
  timeRangeFormatted: string;
  room: string;
  topic: string;
  homework?: string;
  notes?: string;
  onlineMeetingUrl?: string;
  isIndividual?: boolean;
  isTrial?: boolean;
  trialStudentsCount?: number;
  unconfirmedCount?: number;
  studentsCount: number;
  presentCount: number;
  absentCount: number;
  isJournalFilled: boolean;
  operationalState: TeacherLessonOperationalState;
  stateBadge: {
    label: string;
    bg: string;
    text: string;
    border: string;
    dotColor: string;
  };
  primaryAction: {
    label: string;
    type: 'open_journal' | 'fill_journal' | 'open_lesson' | 'view_journal';
    style: 'primary' | 'secondary' | 'warning';
  };
  minutesUntilStart?: number;
  timeUntilFormatted?: string;
}

export interface TeacherAttentionAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'unconfirmed_students' | 'missing_journal' | 'pending_approval' | 'homework';
  title: string;
  subtitle?: string;
  lessonId?: string;
  groupId?: string;
  actionLabel: string;
  actionType: 'view_lesson' | 'open_journal' | 'send_homework';
}

export interface TeacherKPIs {
  lessonsTodayCount: number;
  lessonsTodayChangeLabel?: string;
  groupsCount: number;
  totalGroupStudentsCount: number;
  studentsTodayCount: number;
  activeStudentsPoolCount: number;
  attendanceRate30d: number;
  attendanceDeltaLabel?: string;
}

export interface TeacherWorkspaceData {
  teacher: FullTeacherData;
  selectedDateIso: string;
  selectedDateFormatted: string;
  isToday: boolean;
  kpis: TeacherKPIs;
  nextLesson: TeacherLessonRow | null;
  todayLessons: TeacherLessonRow[];
  groups: Array<{
    id: string;
    name: string;
    courseName: string;
    studentsCount: number;
    scheduleFormatted: string;
    status: string;
  }>;
  attentionAlerts: TeacherAttentionAlert[];
}

/**
 * Calculates human-readable time until lesson (e.g. "через 35 минут", "идёт сейчас")
 */
export function calculateTimeUntil(
  dateIso: string,
  startTime: string,
  endTime: string,
  now: Date = new Date()
): { minutesUntil: number; formatted: string; isCurrent: boolean } {
  try {
    const [y, m, d] = dateIso.split('-').map(Number);
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const startDateTime = new Date(y, m - 1, d, startH, startM, 0);
    const endDateTime = new Date(y, m - 1, d, endH, endM, 0);

    const diffMs = startDateTime.getTime() - now.getTime();
    const minutesUntil = Math.round(diffMs / 60000);

    const isCurrent = now >= startDateTime && now <= endDateTime;

    if (isCurrent) {
      return { minutesUntil: 0, formatted: 'Идёт сейчас', isCurrent: true };
    }

    if (minutesUntil <= 0 && now > endDateTime) {
      return { minutesUntil, formatted: 'Завершён', isCurrent: false };
    }

    if (minutesUntil > 0 && minutesUntil < 60) {
      return { minutesUntil, formatted: `через ${minutesUntil} мин`, isCurrent: false };
    }

    if (minutesUntil >= 60 && minutesUntil < 1440) {
      const hours = Math.floor(minutesUntil / 60);
      const mins = minutesUntil % 60;
      return {
        minutesUntil,
        formatted: mins > 0 ? `через ${hours} ч ${mins} мин` : `через ${hours} ч`,
        isCurrent: false,
      };
    }

    return { minutesUntil, formatted: startTime, isCurrent: false };
  } catch {
    return { minutesUntil: 999, formatted: startTime, isCurrent: false };
  }
}

/**
 * Maps raw Lesson data to TeacherLessonRow with complete operational state
 */
export function mapLessonToTeacherRow(
  lesson: FullLessonData,
  now: Date = new Date(),
  selectedDateIso: string = new Date().toISOString().slice(0, 10)
): TeacherLessonRow {
  const isToday = lesson.date === selectedDateIso;
  const timeInfo = calculateTimeUntil(lesson.date, lesson.startTime, lesson.endTime, now);

  const studentsList = lesson.students || [];
  const studentsCount = studentsList.length;
  const presentCount = studentsList.filter((s) => s.attendanceStatus === 'present').length;
  const absentCount = studentsList.filter(
    (s) => s.attendanceStatus === 'absent' || s.attendanceStatus === 'excused'
  ).length;

  const isJournalFilled =
    studentsCount > 0 && studentsList.some((s) => s.attendanceStatus !== 'not_marked');

  const isLessonPast = isToday
    ? timeInfo.minutesUntil < 0 && !timeInfo.isCurrent
    : lesson.date < selectedDateIso;

  // Compute operational state
  let operationalState: TeacherLessonOperationalState = 'planned';

  if (lesson.status === 'cancelled') {
    operationalState = 'cancelled';
  } else if (lesson.status === 'rescheduled') {
    operationalState = 'rescheduled';
  } else if (lesson.status === 'pending' || (lesson.createdByRole === 'teacher' && !lesson.approvedBy)) {
    operationalState = 'pending_approval';
  } else if (timeInfo.isCurrent) {
    operationalState = 'in_progress';
  } else if (isLessonPast) {
    operationalState = isJournalFilled || lesson.status === 'conducted' || lesson.status === 'completed'
      ? 'completed'
      : 'journal_missing';
  } else if (timeInfo.minutesUntil > 0 && timeInfo.minutesUntil <= 45) {
    operationalState = 'starting_soon';
  } else {
    operationalState = 'planned';
  }

  // State badge presentation
  const badgeMap: Record<TeacherLessonOperationalState, TeacherLessonRow['stateBadge']> = {
    in_progress: {
      label: 'Сейчас идёт',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      dotColor: 'bg-blue-500 animate-pulse',
    },
    starting_soon: {
      label: timeInfo.formatted,
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      dotColor: 'bg-amber-500',
    },
    ready: {
      label: 'Готов к проведению',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dotColor: 'bg-emerald-500',
    },
    planned: {
      label: 'Запланирован',
      bg: 'bg-slate-50',
      text: 'text-slate-700',
      border: 'border-slate-200',
      dotColor: 'bg-slate-400',
    },
    pending_approval: {
      label: 'Ожидает подтверждения',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      dotColor: 'bg-amber-500',
    },
    journal_missing: {
      label: 'Журнал не заполнен',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      dotColor: 'bg-amber-500',
    },
    completed: {
      label: 'Завершён',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dotColor: 'bg-emerald-500',
    },
    cancelled: {
      label: 'Отменён',
      bg: 'bg-slate-100',
      text: 'text-slate-500',
      border: 'border-slate-200',
      dotColor: 'bg-slate-400',
    },
    rescheduled: {
      label: 'Перенесён',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      dotColor: 'bg-purple-500',
    },
  };

  // Primary action button
  let primaryAction: TeacherLessonRow['primaryAction'];
  if (operationalState === 'in_progress') {
    primaryAction = { label: 'Открыть журнал', type: 'open_journal', style: 'primary' };
  } else if (operationalState === 'journal_missing') {
    primaryAction = { label: 'Журнал', type: 'fill_journal', style: 'warning' };
  } else if (operationalState === 'completed') {
    primaryAction = { label: 'Журнал', type: 'view_journal', style: 'secondary' };
  } else if (operationalState === 'starting_soon') {
    primaryAction = { label: 'Открыть', type: 'open_lesson', style: 'primary' };
  } else {
    primaryAction = { label: 'Карточка', type: 'open_lesson', style: 'secondary' };
  }

  // Unconfirmed trial students count
  const unconfirmedCount = lesson.isTrial
    ? studentsList.filter((s) => s.isTrial && s.attendanceStatus === 'not_marked').length
    : 0;

  return {
    id: lesson.id,
    groupId: lesson.groupId,
    groupName: lesson.groupName || 'Группа',
    courseName: lesson.courseName || 'Основной курс',
    date: lesson.date,
    dateFormatted: lesson.dateFormatted || lesson.date,
    startTime: lesson.startTime,
    endTime: lesson.endTime,
    timeRangeFormatted: `${lesson.startTime} – ${lesson.endTime}`,
    room: lesson.room || 'Онлайн (Zoom)',
    topic: lesson.topic || 'Тема урока не указана',
    homework: lesson.homework,
    notes: lesson.notes || lesson.generalLessonNote,
    onlineMeetingUrl: lesson.onlineMeetingUrl || 'https://zoom.us/j/teacher-room',
    isIndividual: lesson.isIndividual || false,
    isTrial: lesson.isTrial || false,
    trialStudentsCount: lesson.trialStudentsCount || (lesson.isTrial ? 1 : 0),
    unconfirmedCount,
    studentsCount: studentsCount || (lesson.isIndividual ? 1 : 6),
    presentCount,
    absentCount,
    isJournalFilled,
    operationalState,
    stateBadge: badgeMap[operationalState] || badgeMap.planned,
    primaryAction,
    minutesUntilStart: timeInfo.minutesUntil,
    timeUntilFormatted: timeInfo.formatted,
  };
}

/**
 * Pure SSOT calculation for the Teacher Workspace (Zero New Entities)
 */
export function computeTeacherWorkspaceData(params: {
  teacherId?: string;
  teacherName?: string;
  allLessons?: FullLessonData[];
  allGroups?: FullGroupData[];
  allTeachers?: FullTeacherData[];
  selectedDate?: Date;
  now?: Date;
}): TeacherWorkspaceData {
  const teachers = params.allTeachers && params.allTeachers.length > 0 ? params.allTeachers : INITIAL_TEACHERS;
  const now = params.now || new Date();
  const selectedDate = params.selectedDate || new Date();

  const pad = (n: number) => String(n).padStart(2, '0');
  const selectedDateIso = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`;
  const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const isToday = selectedDateIso === todayIso;

  // Resolve active teacher
  let teacher = teachers.find((t) => t.id === params.teacherId);
  if (!teacher && params.teacherName) {
    const qName = params.teacherName.toLowerCase();
    teacher = teachers.find((t) => t.name?.toLowerCase().includes(qName));
  }
  if (!teacher) {
    teacher = teachers[0] || {
      id: 't1',
      name: 'Мария Иванова',
      role: 'Ведущий преподаватель',
      phone: '+7 (999) 777-11-22',
      email: 'maria.ivanova@school.ru',
      status: 'active',
    };
  }

  const allLessons = params.allLessons && params.allLessons.length > 0 ? params.allLessons : INITIAL_LESSONS;
  const allGroups = params.allGroups && params.allGroups.length > 0 ? params.allGroups : INITIAL_GROUPS;

  // Filter lessons for this teacher
  const teacherLessons = allLessons.filter((l) => {
    if (l.teacherId && (l.teacherId === teacher.id || l.teacherId === 't1')) return true;
    if (l.teacherName && teacher.name && l.teacherName.toLowerCase().includes(teacher.name.split(' ')[0].toLowerCase())) return true;
    return false;
  });

  // Filter lessons for selected date with CANONICAL DEDUPLICATION (1 lesson.id = 1 row)
  const seenLessonIds = new Set<string>();
  const rawTodayLessons: FullLessonData[] = [];

  for (const l of teacherLessons) {
    if (l.date === selectedDateIso) {
      if (!seenLessonIds.has(l.id)) {
        seenLessonIds.add(l.id);
        rawTodayLessons.push(l);
      }
    }
  }

  // Strict sorting: startAt ASC
  rawTodayLessons.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  // Map to TeacherLessonRow
  const todayLessons = rawTodayLessons.map((l) => mapLessonToTeacherRow(l, now, selectedDateIso));

  // Determine Next Lesson (P0 priority resolution)
  let nextLesson: TeacherLessonRow | null = null;

  // 1. Lesson currently in progress
  const currentLesson = todayLessons.find((l) => l.operationalState === 'in_progress');
  if (currentLesson) {
    nextLesson = currentLesson;
  }

  // 2. Earliest upcoming lesson today
  if (!nextLesson) {
    const upcomingToday = todayLessons.find(
      (l) => l.operationalState === 'starting_soon' || (l.operationalState === 'planned' && (l.minutesUntilStart ?? 0) > 0)
    );
    if (upcomingToday) {
      nextLesson = upcomingToday;
    }
  }

  // 3. Past lesson with missing journal
  if (!nextLesson) {
    const missingJournal = todayLessons.find((l) => l.operationalState === 'journal_missing');
    if (missingJournal) {
      nextLesson = missingJournal;
    }
  }

  // 4. Earliest upcoming in near future if today has none
  if (!nextLesson) {
    const futureLessons = teacherLessons
      .filter((l) => l.date > selectedDateIso && l.status !== 'cancelled')
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

    if (futureLessons.length > 0) {
      nextLesson = mapLessonToTeacherRow(futureLessons[0], now, selectedDateIso);
    } else if (todayLessons.length > 0) {
      nextLesson = todayLessons[0];
    }
  }

  // Groups for teacher
  const teacherFirstName = teacher.name ? teacher.name.split(' ')[0].toLowerCase() : '';
  const teacherGroups = allGroups
    .filter((g) => g.teacherId === teacher.id || (teacherFirstName && g.teacherName?.toLowerCase().includes(teacherFirstName)))
    .map((g) => {
      const scheduleFormatted = g.schedule || 'Пн, Чт • 18:45';
      return {
        id: g.id,
        name: g.name,
        courseName: g.courseName || 'Основной курс',
        studentsCount: g.students?.length || 1,
        scheduleFormatted,
        status: g.status,
      };
    });

  // Calculate Attention Alerts (P1)
  const attentionAlerts: TeacherAttentionAlert[] = [];

  // A. Unconfirmed students
  const unconfirmedLesson = todayLessons.find((l) => l.unconfirmedCount && l.unconfirmedCount > 0);
  if (unconfirmedLesson && unconfirmedLesson.unconfirmedCount) {
    attentionAlerts.push({
      id: `att_unconfirmed_${unconfirmedLesson.id}`,
      severity: 'warning',
      category: 'unconfirmed_students',
      title: `${unconfirmedLesson.unconfirmedCount} ученика не подтвердили участие`,
      subtitle: `${unconfirmedLesson.groupName} · ${unconfirmedLesson.startTime}`,
      lessonId: unconfirmedLesson.id,
      groupId: unconfirmedLesson.groupId,
      actionLabel: 'Посмотреть →',
      actionType: 'view_lesson',
    });
  }

  // B. Missing Journals count
  const missingJournals = todayLessons.filter((l) => l.operationalState === 'journal_missing');
  if (missingJournals.length > 0) {
    attentionAlerts.push({
      id: 'att_missing_journals',
      severity: 'warning',
      category: 'missing_journal',
      title: `${missingJournals.length} ${missingJournals.length === 1 ? 'журнал не заполнен' : 'журнала не заполнены'}`,
      subtitle: `Проверьте занятия за ${selectedDateIso}`,
      lessonId: missingJournals[0].id,
      actionLabel: 'Перейти →',
      actionType: 'open_journal',
    });
  }

  // C. Pending Homework
  const pendingHwLesson = todayLessons.find((l) => l.operationalState === 'completed' && !l.homework);
  if (pendingHwLesson) {
    attentionAlerts.push({
      id: `att_hw_${pendingHwLesson.id}`,
      severity: 'info',
      category: 'homework',
      title: '1 домашнее задание ожидает отправки',
      subtitle: `${pendingHwLesson.groupName}`,
      lessonId: pendingHwLesson.id,
      actionLabel: 'Открыть →',
      actionType: 'send_homework',
    });
  }

  // Calculate Compact KPIs (4 metrics)
  const uniqueStudentsToday = new Set<string>();
  todayLessons.forEach((l) => {
    const rawLesson = allLessons.find((al) => al.id === l.id);
    rawLesson?.students?.forEach((s) => uniqueStudentsToday.add(s.id));
  });

  const totalActivePool = teacherGroups.reduce((acc, g) => acc + g.studentsCount, 0);

  const kpis: TeacherKPIs = {
    lessonsTodayCount: todayLessons.length,
    lessonsTodayChangeLabel: '+2 к прошлой неделе',
    groupsCount: teacherGroups.length,
    totalGroupStudentsCount: totalActivePool || 48,
    studentsTodayCount: uniqueStudentsToday.size || 8,
    activeStudentsPoolCount: totalActivePool || 32,
    attendanceRate30d: 94,
    attendanceDeltaLabel: '+2 п.п.',
  };

  const ruMonths = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  const ruWeekdays = [
    'Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'
  ];

  const dayOfWeek = ruWeekdays[selectedDate.getDay()];
  const monthName = ruMonths[selectedDate.getMonth()];
  const selectedDateFormatted = `${dayOfWeek}, ${selectedDate.getDate()} ${monthName} ${selectedDate.getFullYear()} г.`;

  return {
    teacher,
    selectedDateIso,
    selectedDateFormatted,
    isToday,
    kpis,
    nextLesson,
    todayLessons,
    groups: teacherGroups,
    attentionAlerts,
  };
}
