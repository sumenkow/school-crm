'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Check,
  AlertCircle,
  Users,
  GraduationCap,
  Video,
  Sparkles,
  Clock,
  Calendar,
  Copy,
  Send,
  Mail,
  Lock,
  User,
  Search,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import {
  FullLessonData,
  TimelineInteraction,
  INITIAL_TEACHERS,
  FullStudentData,
  FullGroupData,
  FullTeacherData,
} from '@/lib/data/mockData';
import { getStoredTeachers } from '@/lib/data/teacherStorage';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { saveLessonToStorage, getStoredLessons } from '@/lib/data/lessonStorage';
import { saveInteractionToStorage } from '@/lib/data/timelineStorage';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { useLanguage } from '@/context/LanguageContext';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  checkThreeWayCollision,
  CandidateLesson,
  ConflictDetail,
  AvailableSlot,
} from '@/lib/data/collisionHelper';
import { CollisionWarningModal } from './CollisionWarningModal';
import { LessonCreatedSuccessModal } from './LessonCreatedSuccessModal';

export interface ScheduleLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduled?: (newLesson: FullLessonData) => void;
  initialDate?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  defaultGroupId?: string;
  initialTeacherId?: string;
  initialStudentId?: string;
  initialType?: 'group' | 'individual';
}

function getStudentWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${count} учеников`;
  if (mod10 === 1) return `${count} ученик`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} ученика`;
  return `${count} учеников`;
}

function calculateEndTime(start: string, durationMinutes: number = 75): string {
  try {
    const [h, m] = start.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '20:00';
    const totalMinutes = h * 60 + m + durationMinutes;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  } catch {
    return '20:00';
  }
}

function getGroupAgeBracket(group?: FullGroupData): string {
  if (!group) return '14–16 лет';
  if (group.notes) {
    const m = group.notes.match(/(\d+[-–]\d+\s*лет|\d+[-–]\d+\s*года|\d+\s*лет|\d+\s*года)/i);
    if (m) return m[1];
  }
  const name = (group.name || '').toLowerCase();
  if (name.includes('teen')) return '14–16 лет';
  if (name.includes('kid')) return '7–10 лет';
  if (name.includes('junior')) return '10–13 лет';
  if (name.includes('adult')) return '18+ лет';
  return '14–16 лет';
}

function getTeacherZoomUrl(tName: string = ''): string {
  const lower = tName.toLowerCase();
  if (lower.includes('мария')) return 'https://zoom.us/j/teacher-maria-english';
  if (lower.includes('денис')) return 'https://zoom.us/j/teacher-denis-robotics';
  if (lower.includes('ольга')) return 'https://zoom.us/j/teacher-olga-math';
  if (lower.includes('алексей')) return 'https://zoom.us/j/teacher-alexey-phys';
  if (lower.includes('анна')) return 'https://zoom.us/j/teacher-anna-deutsch';
  return 'https://zoom.us/j/school-online-room';
}

function getStudentInitials(name?: string): string {
  if (!name) return 'УЧ';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getStudentFullName(st?: FullStudentData | null): string {
  if (!st) return 'Ученик';
  const customName = (st as unknown as { name?: string }).name;
  if (customName) return customName;
  return `${st.firstName || ''} ${st.lastName || ''}`.trim() || 'Ученик';
}

export function ScheduleLessonModal({
  isOpen,
  onClose,
  onScheduled,
  initialDate,
  initialStartTime,
  initialEndTime,
  defaultGroupId,
  initialTeacherId,
  initialStudentId,
  initialType = 'group',
}: ScheduleLessonModalProps) {
  const toast = useToast();
  const { role, userName } = useRole();
  const { language } = useLanguage();
  const locale = language === 'en' ? 'en-US' : language === 'de' ? 'de-DE' : 'ru-RU';

  const isTeacher = role === 'teacher';

  // 1. Type Switcher state (F15)
  const [lessonType, setLessonType] = useState<'group' | 'individual'>(initialType);

  // Group Flow states (F16)
  const [groups, setGroups] = useState<FullGroupData[]>(() =>
    typeof window !== 'undefined' ? getStoredGroups() : []
  );
  const [groupId, setGroupId] = useState(defaultGroupId || '');
  const [showEnrolledStudents, setShowEnrolledStudents] = useState(false);

  // Individual Flow states (F17)
  const [allStudents, setAllStudents] = useState<FullStudentData[]>(() =>
    typeof window !== 'undefined' ? getStoredStudents() : []
  );
  const [selectedStudent, setSelectedStudent] = useState<FullStudentData | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const studentSearchRef = useRef<HTMLDivElement>(null);

  // Teacher State & Role Locking (F14)
  const [teachers, setTeachers] = useState<FullTeacherData[]>(() =>
    typeof window !== 'undefined' ? getStoredTeachers() : INITIAL_TEACHERS
  );
  const [teacherId, setTeacherId] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedT = getStoredTeachers();
      return storedT[0]?.id || 't1';
    }
    return 't1';
  });
  const [teacherName, setTeacherName] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedT = getStoredTeachers();
      return storedT[0]?.name || '';
    }
    return '';
  });

  // Schedule & Timing states (F18)
  const [date, setDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(initialStartTime || '18:45');
  const [endTime, setEndTime] = useState(initialEndTime || '20:00');
  const [durationMinutes, setDurationMinutes] = useState(75);

  // Online & Curriculum states (F19, F20, F21)
  const [onlineUrl, setOnlineUrl] = useState('https://zoom.us/j/teacher-room-english');
  const [topic, setTopic] = useState('');
  const [homework, setHomework] = useState('');
  const [isTrial, setIsTrial] = useState(false);
  const [sendHwNotification, setSendHwNotification] = useState(false);
  const [sendTgReminder, setSendTgReminder] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Collision Warning Modal State (F23, F24, F25)
  const [isCollisionModalOpen, setIsCollisionModalOpen] = useState(false);
  const [collisionData, setCollisionData] = useState<{
    conflicts: ConflictDetail[];
    nearestSlots: AvailableSlot[];
  }>({ conflicts: [], nearestSlots: [] });

  // Success State Modal State (F26, F27)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [createdLessonData, setCreatedLessonData] = useState<FullLessonData | null>(null);

  // Handle clicking outside student dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        studentSearchRef.current &&
        !studentSearchRef.current.contains(e.target as Node)
      ) {
        setIsStudentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getGroupDurationMinutes = (g?: { schedule?: string }) => {
    if (!g?.schedule) return 75;
    const timeMatch = g.schedule.match(/(\d{1,2}:\d{2})\s*[–\-]\s*(\d{1,2}:\d{2})/);
    if (timeMatch) {
      const [sH, sM] = timeMatch[1].split(':').map(Number);
      const [eH, eM] = timeMatch[2].split(':').map(Number);
      const diff = eH * 60 + eM - (sH * 60 + sM);
      if (diff > 0) return diff;
    }
    return 75;
  };

  const applyGroupDefaults = (
    grpId: string,
    currentGroups = groups,
    userStartTime?: string
  ) => {
    const g = currentGroups.find((grp) => grp.id === grpId);
    if (!g) return;

    if (!isTeacher) {
      if (g.teacherId) setTeacherId(g.teacherId);
      if (g.teacherName) {
        setTeacherName(g.teacherName);
        setOnlineUrl(getTeacherZoomUrl(g.teacherName));
      }
    }

    const durMin = getGroupDurationMinutes(g);
    setDurationMinutes(durMin);

    if (userStartTime) {
      setStartTime(userStartTime);
      setEndTime(calculateEndTime(userStartTime, durMin));
    } else if (g.schedule) {
      const timeMatch = g.schedule.match(/(\d{1,2}:\d{2})\s*[–\-]\s*(\d{1,2}:\d{2})/);
      if (timeMatch) {
        setStartTime(timeMatch[1]);
        setEndTime(timeMatch[2]);
      } else {
        setEndTime(calculateEndTime(startTime, durMin));
      }
    } else {
      setEndTime(calculateEndTime(startTime, durMin));
    }
  };

  // Synchronize on modal open
  useEffect(() => {
    if (isOpen) {
      const stored = getStoredGroups();
      setGroups(stored);
      const studentsStored = getStoredStudents();
      setAllStudents(studentsStored);

      setLessonType(initialType);
      setShowEnrolledStudents(false);
      setIsCollisionModalOpen(false);
      setIsSuccessModalOpen(false);
      setCreatedLessonData(null);

      // Handle Teacher Role Locking (F14)
      const storedTeachers = getStoredTeachers();
      setTeachers(storedTeachers);

      if (isTeacher) {
        const found = storedTeachers.find(
          (t) =>
            t.name.toLowerCase() === (userName || '').toLowerCase() ||
            (initialTeacherId && t.id === initialTeacherId)
        );
        const lockedId = found ? found.id : initialTeacherId || storedTeachers[0]?.id || 't1';
        const lockedName = found ? found.name : userName || storedTeachers[0]?.name || '';
        setTeacherId(lockedId);
        setTeacherName(lockedName);
        setOnlineUrl(getTeacherZoomUrl(lockedName));
      } else {
        const tId = initialTeacherId || storedTeachers[0]?.id || 't1';
        setTeacherId(tId);
        const found = storedTeachers.find((t) => t.id === tId) || storedTeachers[0];
        if (found) {
          setTeacherName(found.name);
          setOnlineUrl(getTeacherZoomUrl(found.name));
        }
      }

      // Initial Student selection if provided
      if (initialStudentId) {
        const st = studentsStored.find((s) => s.id === initialStudentId);
        if (st) {
          setSelectedStudent(st);
          setLessonType('individual');
        }
      } else {
        setSelectedStudent(null);
      }

      const targetGroupId = defaultGroupId || (stored.length > 0 ? stored[0].id : '');
      setGroupId(targetGroupId);
      applyGroupDefaults(targetGroupId, stored, initialStartTime);

      if (initialDate) setDate(initialDate);
      if (initialStartTime) {
        setStartTime(initialStartTime);
        if (initialEndTime) {
          setEndTime(initialEndTime);
        } else {
          setEndTime(calculateEndTime(initialStartTime, 75));
        }
      }
    }
  }, [
    isOpen,
    initialDate,
    initialStartTime,
    initialEndTime,
    defaultGroupId,
    initialTeacherId,
    initialStudentId,
    initialType,
    isTeacher,
    userName,
  ]);

  const selectedGroup = useMemo(() => {
    return (
      groups.find((g) => g.id === groupId) ||
      groups[0] || {
        id: '',
        name: '',
        courseName: '',
        teacherId: '',
        teacherName: '',
        students: [],
        schedule: '',
        capacity: 8,
      }
    );
  }, [groups, groupId]);

  // Filtered students for autocomplete
  const filteredStudents = useMemo(() => {
    const q = studentSearchQuery.trim().toLowerCase();
    if (!q) return allStudents.slice(0, 8);
    return allStudents
      .filter((s) => {
        const fullName = getStudentFullName(s).toLowerCase();
        const phone = (s.phone || '').toLowerCase();
        const course = (s.groups?.[0]?.courseName || s.groups?.[0]?.name || '').toLowerCase();
        return fullName.includes(q) || phone.includes(q) || course.includes(q);
      })
      .slice(0, 10);
  }, [allStudents, studentSearchQuery]);

  if (!isOpen) return null;

  const handleGroupChange = (newGroupId: string) => {
    setGroupId(newGroupId);
    applyGroupDefaults(newGroupId);
  };

  const handleTeacherChange = (newTeacherId: string) => {
    if (isTeacher) return; // Strict role lock
    setTeacherId(newTeacherId);
    const found = teachers.find((t) => t.id === newTeacherId);
    if (found) {
      setTeacherName(found.name);
      setOnlineUrl(getTeacherZoomUrl(found.name));
    }
  };

  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    setEndTime(calculateEndTime(newStart, durationMinutes));
  };

  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    try {
      const [sH, sM] = startTime.split(':').map(Number);
      const [eH, eM] = newEnd.split(':').map(Number);
      const diff = eH * 60 + eM - (sH * 60 + sM);
      if (diff > 0) {
        setDurationMinutes(diff);
      }
    } catch {}
  };

  const handleSelectStudent = (st: FullStudentData) => {
    setSelectedStudent(st);
    setIsStudentDropdownOpen(false);
    setStudentSearchQuery('');

    // Pre-fill course and teacher if student has groups
    if (st.groups && st.groups.length > 0) {
      const g = st.groups[0];
      if (!isTeacher && g.teacherName) {
        const found = teachers.find(
          (t) => t.name.toLowerCase() === g.teacherName.toLowerCase()
        );
        if (found) {
          setTeacherId(found.id);
          setTeacherName(found.name);
          setOnlineUrl(getTeacherZoomUrl(found.name));
        }
      }
    }
  };

  const handleCopyLink = () => {
    if (onlineUrl) {
      navigator.clipboard.writeText(onlineUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success('Ссылка на Zoom скопирована');
    }
  };

  const handleCollisionSlotSelect = (slot: AvailableSlot) => {
    setStartTime(slot.startTime);
    setEndTime(slot.endTime);
    if (slot.date) setDate(slot.date);
    setIsCollisionModalOpen(false);
    toast.success(`Выбрано свободное время: ${slot.startTime} – ${slot.endTime}`);
  };

  // Real-time 3-Way Collision Check (F23, F24, F25)
  const inlineCollision = useMemo(() => {
    if (!isOpen || !date || !startTime || !endTime) {
      return { hasConflict: false, conflicts: [], nearestSlots: [] };
    }
    const existingLessons = getStoredLessons();
    const enrolledStudents: FullLessonData['students'] =
      lessonType === 'individual' && selectedStudent
        ? [
            {
              id: selectedStudent.id,
              name: getStudentFullName(selectedStudent),
              attendanceStatus: 'not_marked' as const,
              isTrial,
            },
          ]
        : (selectedGroup?.students || []).map((s) => ({
            id: s.id,
            name: s.name,
            attendanceStatus: 'not_marked' as const,
            isTrial,
          }));

    const candidateLesson: CandidateLesson = {
      date,
      startTime,
      endTime,
      teacherId,
      teacherName,
      isIndividual: lessonType === 'individual',
      groupId: lessonType === 'group' ? selectedGroup?.id : undefined,
      groupName: lessonType === 'group' ? selectedGroup?.name : undefined,
      studentId: lessonType === 'individual' ? selectedStudent?.id : undefined,
      studentName: lessonType === 'individual' && selectedStudent ? getStudentFullName(selectedStudent) : undefined,
      students: enrolledStudents,
      room: 'Онлайн (Zoom)',
    };

    return checkThreeWayCollision(existingLessons, candidateLesson);
  }, [
    isOpen,
    date,
    startTime,
    endTime,
    teacherId,
    teacherName,
    lessonType,
    selectedGroup,
    selectedStudent,
    isTrial,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation for Individual Flow
    if (lessonType === 'individual' && !selectedStudent) {
      toast.error('Пожалуйста, выберите ученика для индивидуального занятия');
      return;
    }

    setIsSubmitting(true);

    try {
      const dateFormatted = new Date(date).toLocaleDateString(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const dayOfWeek = new Date(date).getDay() === 0 ? 6 : new Date(date).getDay() - 1;

      // Prepare students array
      let enrolledStudents: FullLessonData['students'] = [];
      let candidateStudentId: string | undefined = undefined;
      let candidateStudentName: string | undefined = undefined;

      if (lessonType === 'individual' && selectedStudent) {
        const fullName = getStudentFullName(selectedStudent);
        candidateStudentId = selectedStudent.id;
        candidateStudentName = fullName;
        enrolledStudents = [
          {
            id: selectedStudent.id,
            name: fullName,
            attendanceStatus: 'not_marked' as const,
            isTrial,
          },
        ];
      } else {
        enrolledStudents = (selectedGroup.students || []).map((s) => {
          return {
            id: s.id,
            name: s.name,
            attendanceStatus: 'not_marked' as const,
            isTrial,
          };
        });
      }

      // Construct Candidate for 3-Way Collision Check
      const candidateLesson: CandidateLesson = {
        date,
        startTime,
        endTime,
        teacherId,
        teacherName,
        isIndividual: lessonType === 'individual',
        groupId: lessonType === 'group' ? selectedGroup.id : undefined,
        groupName: lessonType === 'group' ? selectedGroup.name : undefined,
        studentId: candidateStudentId,
        studentName: candidateStudentName,
        students: enrolledStudents,
        room: 'Онлайн (Zoom)',
      };

      // Real-time 3-Way Collision Check (F23, F24, F25)
      const existingLessons = getStoredLessons();
      const collisionResult = checkThreeWayCollision(existingLessons, candidateLesson);

      if (collisionResult.hasConflict) {
        setCollisionData({
          conflicts: collisionResult.conflicts,
          nearestSlots: collisionResult.nearestSlots,
        });
        setIsCollisionModalOpen(true);
        setIsSubmitting(false);
        return;
      }

      // Status determination (F22): Teacher creates 'pending', Admin creates 'scheduled'
      const initialStatus = isTeacher ? 'pending' : 'scheduled';
      const newLessonId = `l_${Date.now()}`;

      const newLesson: FullLessonData = {
        id: newLessonId,
        groupId: lessonType === 'group' ? selectedGroup.id : '',
        groupName:
          lessonType === 'group'
            ? selectedGroup.name
            : `Индивидуально: ${candidateStudentName || 'Ученик'}`,
        courseName:
          lessonType === 'group'
            ? selectedGroup.courseName
            : selectedStudent?.groups?.[0]?.courseName || 'Индивидуальный курс',
        teacherId: teacherId || teachers[0]?.id || 't1',
        teacherName: teacherName || teachers[0]?.name || '',
        date,
        dateFormatted,
        dayOfWeek,
        startTime,
        endTime,
        room: 'Онлайн (Zoom)',
        topic: topic.trim() || 'Плановое занятие',
        homework: homework.trim() || undefined,
        onlineMeetingUrl: onlineUrl.trim() || 'https://zoom.us/j/teacher-room-english',
        status: initialStatus,
        isTrial,
        isIndividual: lessonType === 'individual',
        studentId: candidateStudentId,
        studentName: candidateStudentName,
        createdByRole: isTeacher ? 'teacher' : role || 'admin',
        students: enrolledStudents,
        timelineEvents: [
          {
            id: `ev_${Date.now()}_create`,
            timestamp: `${new Date().toLocaleDateString('ru-RU')}, ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`,
            author: userName || (isTeacher ? teacherName : 'Администратор'),
            role: isTeacher ? 'Преподаватель' : 'Администратор',
            type: 'created',
            comment: isTeacher
              ? `Создано занятие на подтверждение на ${dateFormatted} (${startTime}–${endTime})`
              : `Создано занятие на ${dateFormatted} (${startTime}–${endTime})`,
          },
        ],
      };

      // 1. Save to local storage (with mutation guard bypassed since we just checked collisions)
      const saveRes = saveLessonToStorage(newLesson, { bypassCollisionCheck: true });
      if (!saveRes.success && saveRes.error) {
        throw new Error(saveRes.error);
      }

      // 2. Supabase sync
      try {
        const supabase = createClient();
        await supabase.from('lessons').insert([
          {
            id: newLesson.id,
            group_id: newLesson.groupId || null,
            teacher_id: newLesson.teacherId,
            date: newLesson.date,
            start_time: newLesson.startTime,
            end_time: newLesson.endTime,
            topic: newLesson.topic,
            homework: newLesson.homework,
            zoom_url: newLesson.onlineMeetingUrl,
            room: 'Онлайн (Zoom)',
            status: initialStatus,
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        console.warn('Supabase insert notice:', err);
      }

      // 3. Optional timeline interactions for parents
      const now = new Date();
      const timeFormatted = now.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      });

      for (const st of enrolledStudents) {
        const fullStudent = allStudents.find((s) => s.id === st.id);
        const parentId = fullStudent?.parents?.[0]?.id;
        const parentName = fullStudent?.parents?.[0]
          ? `${fullStudent.parents[0].firstName} ${fullStudent.parents[0].lastName}`
          : undefined;

        const interaction: TimelineInteraction = {
          id: `int_sch_${Date.now()}_${st.id}`,
          studentId: st.id,
          studentName: st.name,
          parentId,
          parentName,
          occurredAt: `Сегодня, ${timeFormatted}`,
          author: userName || newLesson.teacherName || 'Преподаватель',
          channel: 'other',
          type: 'organizational',
          content: `📅 ${isTeacher ? 'Создано на подтверждение' : 'Запланировано'} занятие: «${newLesson.groupName}» на ${dateFormatted} в ${startTime}–${endTime}.`,
        };

        saveInteractionToStorage(interaction);
      }

      window.dispatchEvent(
        new CustomEvent('crm-lessons-changed', { detail: { lessonId: newLesson.id } })
      );
      window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed'));

      if (sendHwNotification && homework.trim()) {
        toast.info(
          `Домашнее задание поставлено в очередь на отправку родителям (${enrolledStudents.length} сообщений)`
        );
      }
      if (sendTgReminder) {
        toast.info('Напоминание о занятии запланировано в Telegram');
      }

      // Open Success State Modal (F26, F27)
      setCreatedLessonData(newLesson);
      setIsSuccessModalOpen(true);
    } catch (err: any) {
      console.error('Failed to schedule lesson:', err);
      toast.error(err.message || 'Ошибка при сохранении занятия');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAnother = () => {
    setIsSuccessModalOpen(false);
    setCreatedLessonData(null);
    setTopic('');
    setHomework('');
    setSelectedStudent(null);
    setStudentSearchQuery('');
  };

  const handleCloseSuccess = () => {
    setIsSuccessModalOpen(false);
    if (createdLessonData && onScheduled) {
      onScheduled(createdLessonData);
    }
    onClose();
  };

  const studentCount = selectedGroup.students?.length || 0;
  const ageBracket = getGroupAgeBracket(selectedGroup);

  const modalFooter = (
    <div className="flex items-center justify-end gap-3 w-full">
      <button
        type="button"
        onClick={onClose}
        disabled={isSubmitting}
        className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
      >
        Отмена
      </button>
      {/* Dynamic CTA Button (F22) */}
      <button
        type="submit"
        form="schedule-lesson-form"
        disabled={isSubmitting}
        className={cn(
          'px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50',
          isTeacher
            ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
        )}
      >
        {isTeacher ? <Send className="h-4 w-4" /> : <Check className="h-4 w-4" />}
        <span>
          {isSubmitting
            ? 'Сохранение...'
            : isTeacher
            ? 'Отправить на подтверждение'
            : 'Создать занятие'}
        </span>
      </button>
    </div>
  );

  return (
    <>
      <ResponsiveModal
        isOpen={isOpen && !isSuccessModalOpen}
        onClose={onClose}
        title="Создание занятия"
        subtitle="Назначение группового или индивидуального урока в расписание школы"
        headerBg="bg-white text-slate-900 border-b border-slate-100"
        footer={modalFooter}
      >
        <form id="schedule-lesson-form" onSubmit={handleSubmit} className="space-y-4">
          {/* TYPE SWITCHER TABS (F15) */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setLessonType('group');
                setDurationMinutes(getGroupDurationMinutes(selectedGroup));
                setEndTime(calculateEndTime(startTime, getGroupDurationMinutes(selectedGroup)));
              }}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                lessonType === 'group'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>👥 Групповое занятие</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLessonType('individual');
                setDurationMinutes(60);
                setEndTime(calculateEndTime(startTime, 60));
              }}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                lessonType === 'individual'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <User className="w-3.5 h-3.5 text-purple-600" />
              <span>👤 Индивидуальное занятие</span>
            </button>
          </div>

          {/* TARGET SELECTION & TEACHER ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* GROUP FLOW (F16) */}
            {lessonType === 'group' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Учебная группа <span className="text-rose-500">*</span>
                </label>
                <select
                  value={groupId}
                  onChange={(e) => handleGroupChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 shadow-2xs cursor-pointer"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} • {g.courseName || 'Курс'} ({g.students?.length || 0} уч.)
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              /* INDIVIDUAL FLOW (F17) */
              <div className="relative" ref={studentSearchRef}>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ученик <span className="text-rose-500">*</span>
                </label>

                {selectedStudent ? (
                  <div className="flex items-center justify-between p-2 px-3 border border-purple-200 bg-purple-50/60 rounded-xl text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                        {getStudentInitials(getStudentFullName(selectedStudent))}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-purple-950 truncate block">
                          {getStudentFullName(selectedStudent)}
                        </span>
                        <span className="text-[10px] text-purple-700 truncate block">
                          {selectedStudent.groups?.[0]?.courseName || 'Индивидуальный курс'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudent(null);
                        setStudentSearchQuery('');
                      }}
                      className="text-purple-600 hover:text-purple-900 p-1 rounded-lg hover:bg-purple-100/80 cursor-pointer transition-colors"
                      title="Сменить ученика"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={studentSearchQuery}
                      onChange={(e) => {
                        setStudentSearchQuery(e.target.value);
                        setIsStudentDropdownOpen(true);
                      }}
                      onFocus={() => setIsStudentDropdownOpen(true)}
                      placeholder="Поиск по имени, телефону или курсу..."
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 text-slate-800 shadow-2xs placeholder:text-slate-400"
                    />

                    {/* Live Student Autocomplete Dropdown */}
                    {isStudentDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                        {filteredStudents.length > 0 ? (
                          filteredStudents.map((st) => {
                            const name = getStudentFullName(st);
                            const course =
                              st.groups?.[0]?.courseName ||
                              st.groups?.[0]?.name ||
                              'Индивидуальный курс';
                            return (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => handleSelectStudent(st)}
                                className="w-full p-2.5 hover:bg-slate-50 flex items-center justify-between text-left cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                                    {getStudentInitials(name)}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-semibold text-xs text-slate-900 truncate block">
                                      {name}
                                    </span>
                                    <span className="text-[11px] text-slate-500 truncate block">
                                      {course}
                                    </span>
                                  </div>
                                </div>
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 ml-2">
                                  {st.status === 'active'
                                    ? 'Активный ученик'
                                    : st.status === 'trial'
                                    ? 'Пробный'
                                    : 'Ученик'}
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-3 text-center text-xs text-slate-400">
                            Ученик не найден
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TEACHER FIELD & ROLE IMPERSONATION PROTECTION (F14) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Преподаватель <span className="text-rose-500">*</span>
              </label>

              {isTeacher ? (
                /* Locked read-only field for teachers */
                <div className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-100 font-semibold text-slate-700 shadow-2xs flex items-center justify-between cursor-not-allowed select-none">
                  <span className="truncate">{teacherName} (текущий пользователь)</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1.5" />
                </div>
              ) : (
                /* Interactive selectable dropdown for Admins / Owners */
                <select
                  value={teacherId}
                  onChange={(e) => handleTeacherChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 shadow-2xs cursor-pointer"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.role || 'Преподаватель'})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* GROUP INFO PREVIEW CARD & "ПОСМОТРЕТЬ УЧЕНИКОВ" (F16) */}
          {lessonType === 'group' && (
            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 font-medium text-slate-700">
                  <GraduationCap className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="font-bold text-slate-900">
                    {selectedGroup.courseName || selectedGroup.name}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span>{getStudentWord(studentCount)}</span>
                  <span className="text-slate-400">•</span>
                  <span>{ageBracket}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-blue-700 font-semibold">{durationMinutes} мин</span>
                </div>

                {studentCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowEnrolledStudents(!showEnrolledStudents)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>Посмотреть учеников ({studentCount})</span>
                    {showEnrolledStudents ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>

              {/* Enrolled Students Roster Expansion */}
              {showEnrolledStudents && studentCount > 0 && (
                <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-1.5 animate-in fade-in duration-150">
                  {(selectedGroup.students || []).map((st) => (
                    <div
                      key={st.id}
                      className="p-1.5 px-2 bg-white rounded-lg border border-slate-200/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {getStudentInitials(st.name)}
                        </div>
                        <span className="font-medium text-slate-800 truncate">{st.name}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-slate-100 text-slate-600 shrink-0">
                        {st.status === 'active' ? 'Активен' : 'Пауза'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DATE, TIME & DURATION ROW (F18) */}
          <div className="space-y-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Дата занятия <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Начало <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Окончание <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 shadow-2xs"
                />
              </div>
            </div>

            {/* Helper Duration Caption */}
            <p className="text-[11px] text-slate-500 flex items-center gap-1 pt-0.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Длительность: {durationMinutes} минут (
                {lessonType === 'group'
                  ? 'по выбранному направлению'
                  : 'по индивидуальному направлению'}
                )
              </span>
            </p>

            {/* Inline 3-Way Collision Warning Banner & 1-Click Free Slot Chips */}
            {inlineCollision.hasConflict && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <div className="font-bold text-amber-950">
                      ⚠️ Обнаружена накладка в расписании
                    </div>
                    <div className="text-[11px] text-amber-800">
                      {inlineCollision.conflicts.map((c) => c.message).join('. ')}
                    </div>
                  </div>
                </div>

                {inlineCollision.nearestSlots.length > 0 && (
                  <div className="pt-1 border-t border-amber-200/80">
                    <div className="text-[11px] font-semibold text-amber-900 mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Свободное время в рабочих часах (кликните для выбора):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {inlineCollision.nearestSlots.map((slot, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => handleCollisionSlotSelect(slot)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:border-blue-500 hover:bg-blue-50 text-blue-900 text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          <span>🕒 {slot.startTime} – {slot.endTime}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ONLINE ZOOM URL (F19) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ссылка на онлайн-занятие (Zoom)
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="url"
                  value={onlineUrl}
                  onChange={(e) => setOnlineUrl(e.target.value)}
                  placeholder="https://zoom.us/j/teacher-room"
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 shadow-2xs"
                />
                <Video className="w-3.5 h-3.5 text-indigo-500 absolute left-2.5 top-2.5" />
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{copiedLink ? 'Скопировано' : 'Скопировать'}</span>
              </button>
            </div>
          </div>

          {/* TOPIC AND HOMEWORK (F20) */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Тема занятия <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Например: Вводный урок: Perfekt mit haben und sein"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Домашнее задание
              </label>
              <textarea
                rows={2}
                value={homework}
                onChange={(e) => setHomework(e.target.value)}
                placeholder="Например: Упражнения 4-6 на стр. 42..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400 shadow-2xs"
              />
            </div>
          </div>

          {/* NOTIFICATION AND TRIAL OPTIONS (F21) */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Оповещения и параметры
            </span>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sendTgReminder}
                onChange={(e) => setSendTgReminder(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer h-3.5 w-3.5"
              />
              <span className="flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-sky-500" />
                Отправить уведомление ученикам и родителям в Telegram
              </span>
            </label>

            {homework.trim() && (
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none animate-in fade-in">
                <input
                  type="checkbox"
                  checked={sendHwNotification}
                  onChange={(e) => setSendHwNotification(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer h-3.5 w-3.5"
                />
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  Отправить ДЗ родителям на email после создания
                </span>
              </label>
            )}

            <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2">
              <input
                type="checkbox"
                id="has_trial"
                checked={isTrial}
                onChange={(e) => setIsTrial(e.target.checked)}
                className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer h-3.5 w-3.5"
              />
              <label
                htmlFor="has_trial"
                className="text-xs font-medium text-slate-700 cursor-pointer flex items-center gap-1"
              >
                <span>🎯</span>
                <span>Отметить как пробное занятие</span>
              </label>
            </div>
          </div>
        </form>
      </ResponsiveModal>

      {/* COLLISION WARNING MODAL («Время занято») (F23, F24, F25) */}
      <CollisionWarningModal
        isOpen={isCollisionModalOpen}
        onClose={() => setIsCollisionModalOpen(false)}
        conflicts={collisionData.conflicts}
        nearestSlots={collisionData.nearestSlots}
        onSelectSlot={handleCollisionSlotSelect}
        candidateDate={date}
        candidateStartTime={startTime}
        candidateEndTime={endTime}
      />

      {/* SUCCESS STATE MODAL («Занятие создано») (F26, F27) */}
      <LessonCreatedSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={handleCloseSuccess}
        onCreateAnother={handleCreateAnother}
        lesson={createdLessonData}
        userRole={role}
      />
    </>
  );
}

export default ScheduleLessonModal;
