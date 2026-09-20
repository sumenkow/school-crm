'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { StudentProfileDesktop } from '@/features/students/components/StudentProfileDesktop';
import { INITIAL_STUDENTS, INITIAL_GROUPS, FullStudentData, TimelineInteraction, TeacherComment, FullLessonData } from '@/lib/data/mockData';
import { getCombinedStudentTimeline, saveInteractionToStorage, getInteractionTargetInfo } from '@/lib/data/timelineStorage';
import { getStudentById, saveStudentToStorage, deductLessonFromDeposit, reconcileAllStudentDepositsAndDebts, softDeleteStudent } from '@/lib/data/studentStorage';
import { getStoredLessons } from '@/lib/data/lessonStorage';
import { getStudentFinancialSummary } from '@/lib/data/balanceHelper';
import { excludeStudentFromGroup, enrollStudentToGroup } from '@/lib/data/groupStorage';
import { RecordPaymentModal } from '@/components/finance/RecordPaymentModal';
import { ScheduleLessonModal } from '@/components/calendar/ScheduleLessonModal';
import {
  ArrowLeft,
  Calendar,
  Phone,
  MessageSquare,
  Mail,
  Users,
  GraduationCap,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Plus,
  Edit,
  Send,
  Wallet,
  MinusCircle,
  CheckSquare,
  Sparkles,
  ChevronRight,
  ChevronDown,
  UserCheck,
  FileText,
  Check,
  MessageSquarePlus,
  BookOpen,
  X,
  ExternalLink,
  Video,
  PhoneCall,
  Banknote,
  Filter,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { useLanguage } from '@/context/LanguageContext';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { getTasksForStudent, updateUnifiedTaskStatus, createUnifiedTask } from '@/lib/data/taskManager';
import { saveTaskToStorage } from '@/lib/data/taskStorage';
import { getUpcomingPaymentForStudent } from '@/lib/data/upcomingPaymentsHelper';
import { getStudentLessonPaymentStatus } from '@/lib/data/lessonPaymentStatusHelper';
import { UpcomingPaymentAlert } from '@/components/common/UpcomingPaymentAlert';
import { formatAgeAndGrade, formatGradeRussian, formatBirthDate } from '@/lib/data/studentAgeHelper';
import { DatePicker } from '@/components/common/DatePicker';
import type { Task } from '@/types';
import type { FullTaskData } from '@/lib/data/mockData';

function parseLedgerTimestamp(dateStr: string): number {
  if (!dateStr) return 0;
  let cleaned = dateStr.trim();
  let timeStr = '12:00';
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    cleaned = parts[0].trim();
    timeStr = parts[1].trim();
  }
  if (cleaned.includes('.')) {
    const dParts = cleaned.split('.');
    if (dParts.length === 3) {
      const year = dParts[2].length === 4 ? dParts[2] : `20${dParts[2]}`;
      const month = dParts[1].padStart(2, '0');
      const day = dParts[0].padStart(2, '0');
      const iso = `${year}-${month}-${day}T${timeStr.length === 5 ? timeStr + ':00' : '12:00:00'}`;
      const ts = new Date(iso).getTime();
      if (!isNaN(ts)) return ts;
    }
  }
  const ts = new Date(dateStr).getTime();
  return isNaN(ts) ? 0 : ts;
}

export function getOverdueDays(dueDateStr?: string): number {
  if (!dueDateStr) return 0;
  let due: Date | null = null;
  if (dueDateStr.includes('.')) {
    const parts = dueDateStr.split('.').map((p) => p.trim());
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      due = new Date(year, month, day);
    }
  } else if (dueDateStr.includes('-')) {
    due = new Date(dueDateStr);
  }
  if (!due || isNaN(due.getTime())) return 0;

  const now = new Date();
  const baseline = new Date(2026, 8, 19); // 19.09.2026
  const compareDate = now.getTime() > baseline.getTime() ? now : baseline;

  compareDate.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffMs = compareDate.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

export interface LedgerEventItem {
  id: string;
  type: 'deposit' | 'deduction';
  date: string;
  timestamp: number;
  description: string;
  method: string;
  amountEUR: number;
  runningBalanceEUR: number;
}

export function buildChronologicalLedger(student: FullStudentData, customPricePerLesson: number): LedgerEventItem[] {
  const rawPayments = (student.finance?.payments || []).map((p, idx) => ({
    id: `pay_${p.id || idx}`,
    type: 'deposit' as const,
    date: p.date ? (p.date.includes(',') ? p.date : `${p.date}, 10:00`) : '01.09.2026, 10:00',
    description: `Пополнение депозита / абонемента (${p.period || 'Сентябрь'})`,
    method: p.method || 'Карта / СБП',
    amountEUR: typeof p.amount === 'number' ? p.amount : (parseFloat(String(p.amount).replace(/[^\d.]/g, '')) || 120),
  }));

  const rawDeductions = (student.attendanceStats?.history || [])
    .filter((h) => h.status === 'present' || h.status === 'absent')
    .map((h, idx) => {
      const isManual = (h as any).isManualAdmin || (h as any).enteredBy === 'admin';
      const teacherName = (h as any).teacherName || (h as any).author || student.groups?.[0]?.teacherName || 'Мария Иванова';
      const initiator = isManual ? `Администратор: ${(h as any).author || 'Администрация'}` : `Преподаватель: ${teacherName}`;

      const lessonDateStr = h.date ? (h.date.includes(',') ? h.date : `${h.date}, 18:45`) : '08.09.2026, 18:45';

      return {
        id: `ded_${idx}`,
        type: 'deduction' as const,
        date: lessonDateStr,
        description: `Списание за занятие от ${h.date || 'занятие'}: «${h.topic || 'Урок'}» (${h.groupName || student.groups?.[0]?.name || 'Группа'})`,
        method: initiator,
        amountEUR: customPricePerLesson || 12,
      };
    });

  let allEvents = [...rawPayments, ...rawDeductions];

  if (allEvents.length === 0) {
    allEvents = [
      {
        id: 'sample_1',
        type: 'deposit',
        date: '01.09.2026, 10:00',
        description: 'Пополнение баланса предоплаты',
        method: 'Карта / СБП',
        amountEUR: 120,
      },
      {
        id: 'sample_2',
        type: 'deduction',
        date: '08.09.2026, 18:45',
        description: `Списание за занятие от 08.09.2026: «Разговорный клуб» (${student.groups?.[0]?.name || 'English B1'})`,
        method: `Преподаватель: ${student.groups?.[0]?.teacherName || 'Мария Иванова'}`,
        amountEUR: customPricePerLesson || 12,
      },
    ];
  }

  // 1. Sort CHRONOLOGICALLY ASCENDING (oldest to newest) to compute running balance
  allEvents.sort((a, b) => parseLedgerTimestamp(a.date) - parseLedgerTimestamp(b.date));

  // 2. Compute running balance forward in time
  let currentBalance = 0;
  const processed = allEvents.map((ev) => {
    if (ev.type === 'deposit') {
      currentBalance += ev.amountEUR;
    } else {
      currentBalance -= ev.amountEUR;
    }
    return {
      ...ev,
      timestamp: parseLedgerTimestamp(ev.date),
      runningBalanceEUR: Math.max(0, currentBalance),
    };
  });

  // 3. Sort CHRONOLOGICALLY DESCENDING (newest first) for UI display and email statement
  processed.sort((a, b) => b.timestamp - a.timestamp);

  return processed;
}

function getTimelineCategoryAndIcon(int: TimelineInteraction) {
  const contentLower = (int.content || '').toLowerCase();
  const channelLower = (int.channel || '').toLowerCase();
  const typeLower = (int.type || '').toLowerCase();

  // 1. Finance / Payments
  if (
    typeLower === 'payment' ||
    contentLower.includes('оплата') ||
    contentLower.includes('пополнение') ||
    contentLower.includes('абонемент') ||
    contentLower.includes('платеж') ||
    contentLower.includes('чек') ||
    contentLower.includes('внесен') ||
    contentLower.includes('руб') ||
    contentLower.includes('€') ||
    contentLower.includes('$')
  ) {
    return {
      category: 'finance',
      icon: Banknote,
      iconBg: 'bg-emerald-500 text-white shadow-xs ring-2 ring-emerald-200',
      badgeBg: 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold',
      channelLabel: '💳 Оплата',
    };
  }

  // 2. Tasks
  if (
    typeLower === 'task' ||
    typeLower === 'follow_up' ||
    contentLower.includes('задача') ||
    contentLower.includes('поручен') ||
    contentLower.includes('выполнил') ||
    contentLower.includes('перенос')
  ) {
    const isDone = contentLower.includes('выполнен') || contentLower.includes('закрыт');
    return {
      category: 'tasks',
      icon: isDone ? CheckCircle2 : Clock,
      iconBg: isDone
        ? 'bg-emerald-500 text-white shadow-xs ring-2 ring-emerald-200'
        : 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-200',
      badgeBg: isDone
        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold'
        : 'bg-amber-50 text-amber-800 border border-amber-300 font-bold',
      channelLabel: isDone ? '✓ Задача выполнена' : '⚡ Задача',
    };
  }

  // 3. Lead Lifecycle / Conversion / Funnel
  if (
    typeLower === 'initial_contact' ||
    typeLower === 'trial' ||
    typeLower === 'status_change' ||
    contentLower.includes('лид') ||
    contentLower.includes('воронк') ||
    contentLower.includes('зачислен') ||
    contentLower.includes('заявка') ||
    contentLower.includes('этап') ||
    (int as any).leadId
  ) {
    return {
      category: 'lead',
      icon: Filter,
      iconBg: 'bg-indigo-500 text-white shadow-xs ring-2 ring-indigo-200',
      badgeBg: 'bg-indigo-50 text-indigo-800 border border-indigo-300 font-bold',
      channelLabel: typeLower === 'initial_contact' ? 'Заявка с сайта' : 'История лида',
    };
  }

  // 4. Communication: WhatsApp
  if (channelLower === 'whatsapp' || contentLower.includes('whatsapp') || contentLower.includes('ватсап')) {
    return {
      category: 'communication',
      icon: MessageSquare,
      iconBg: 'bg-emerald-500 text-white shadow-xs ring-2 ring-emerald-200',
      badgeBg: 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold',
      channelLabel: 'WhatsApp',
    };
  }

  // 5. Communication: Telegram
  if (channelLower === 'telegram' || contentLower.includes('telegram') || contentLower.includes('телеграм')) {
    return {
      category: 'communication',
      icon: Send,
      iconBg: 'bg-sky-500 text-white shadow-xs ring-2 ring-sky-200',
      badgeBg: 'bg-sky-50 text-sky-800 border border-sky-300 font-bold',
      channelLabel: 'Telegram',
    };
  }

  // 6. Communication: Phone Call
  if (channelLower === 'phone' || contentLower.includes('звонок') || contentLower.includes('позвон')) {
    return {
      category: 'communication',
      icon: PhoneCall,
      iconBg: 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-200',
      badgeBg: 'bg-amber-50 text-amber-800 border border-amber-300 font-bold',
      channelLabel: 'Телефонный звонок',
    };
  }

  // 7. Communication: Meeting / Zoom
  if (channelLower === 'call' || typeLower === 'call' || channelLower === 'meeting' || contentLower.includes('встреч') || contentLower.includes('zoom')) {
    return {
      category: 'communication',
      icon: Video,
      iconBg: 'bg-purple-500 text-white shadow-xs ring-2 ring-purple-200',
      badgeBg: 'bg-purple-50 text-purple-800 border border-purple-300 font-bold',
      channelLabel: 'Онлайн-встреча',
    };
  }

  // 8. Communication: Email
  if (channelLower === 'email' || contentLower.includes('email') || contentLower.includes('письм')) {
    return {
      category: 'communication',
      icon: Mail,
      iconBg: 'bg-indigo-500 text-white shadow-xs ring-2 ring-indigo-200',
      badgeBg: 'bg-indigo-50 text-indigo-800 border border-indigo-300 font-bold',
      channelLabel: 'Email',
    };
  }

  // Default Fallback
  return {
    category: 'communication',
    icon: MessageSquare,
    iconBg: 'bg-blue-500 text-white shadow-xs ring-2 ring-blue-200',
    badgeBg: 'bg-slate-100 text-slate-700 border border-slate-200 font-semibold',
    channelLabel: channelLower === 'other' ? 'Заметка' : channelLower || 'Система',
  };
}

export default function StudentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { role, userName } = useRole();
  const { t } = useLanguage();
  const studentId = params.id as string;
  const tabParam = searchParams.get('tab');
  const actionParam = searchParams.get('action');

  const [student, setStudent] = useState<FullStudentData>(() => {
    return getStudentById(studentId) || INITIAL_STUDENTS.find((s) => s.id === studentId) || INITIAL_STUDENTS[0];
  });

  // Keep latest student ref for auto-save on unmount / navigation away
  const latestStudentRef = useRef(student);
  useEffect(() => {
    latestStudentRef.current = student;
  }, [student]);

  useEffect(() => {
    return () => {
      if (latestStudentRef.current) {
        saveStudentToStorage(latestStudentRef.current);
      }
    };
  }, []);

  // Re-sync on studentId or when storage updates
  useEffect(() => {
    const loaded = getStudentById(studentId);
    if (loaded) {
      setStudent(loaded);
    }

    const handleSync = (e: any) => {
      const fresh = (e?.detail?.id === studentId ? e.detail : null) || getStudentById(studentId);
      if (fresh) {
        setStudent(fresh);
        latestStudentRef.current = fresh;
      }
    };

    window.addEventListener('crm-students-changed', handleSync);
    window.addEventListener('crm-payments-changed', () => {
      const fresh = getStudentById(studentId);
      if (fresh) {
        setStudent(fresh);
        latestStudentRef.current = fresh;
      }
    });
    window.addEventListener('crm-groups-changed', () => {
      const fresh = getStudentById(studentId);
      if (fresh) {
        setStudent(fresh);
        latestStudentRef.current = fresh;
      }
    });
    window.addEventListener('focus', () => {
      const fresh = getStudentById(studentId);
      if (fresh) {
        setStudent(fresh);
        latestStudentRef.current = fresh;
      }
    });
    return () => {
      window.removeEventListener('crm-students-changed', handleSync);
    };
  }, [studentId]);

  const [isSaving, setIsSaving] = useState(false);

  // Auto-save status listeners
  useEffect(() => {
    const handleSavingStart = () => setIsSaving(true);
    const handleSavingEnd = () => setIsSaving(false);

    window.addEventListener('crm-student-save-start', handleSavingStart);
    window.addEventListener('crm-student-save-end', handleSavingEnd);
    return () => {
      window.removeEventListener('crm-student-save-start', handleSavingStart);
      window.removeEventListener('crm-student-save-end', handleSavingEnd);
    };
  }, []);

  // Supabase Realtime Channel subscription for cross-user sync
  useEffect(() => {
    if (!studentId) return;

    let supabaseClient: any = null;
    let channel: any = null;

    import('@/lib/supabase/client')
      .then(({ createClient }) => {
        supabaseClient = createClient();
        channel = supabaseClient
          .channel(`student-details-${studentId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'students', filter: `id=eq.${studentId}` },
            () => {
              const fresh = getStudentById(studentId);
              if (fresh) setStudent(fresh);
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'tasks', filter: `student_id=eq.${studentId}` },
            () => {
              const fresh = getStudentById(studentId);
              if (fresh) setStudent(fresh);
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'interactions', filter: `student_id=eq.${studentId}` },
            () => {
              const fresh = getStudentById(studentId);
              if (fresh) setStudent(fresh);
            }
          )
          .subscribe();
      })
      .catch((err) => {
        console.warn('Realtime channel error:', err);
      });

    return () => {
      if (supabaseClient && channel) {
        supabaseClient.removeChannel(channel);
      }
    };
  }, [studentId]);

  const [activeTab, setActiveTab] = useState<'education' | 'finance' | 'profile' | 'tasks' | 'timeline'>(() => {
    if (tabParam) {
      if (['attendance', 'teacher_comments', 'education', 'academic'].includes(tabParam)) return 'education';
      if (['finance', 'profile', 'family', 'tasks', 'timeline'].includes(tabParam)) {
        if (tabParam === 'family') return 'profile';
        return tabParam as any;
      }
    }
    return 'education';
  });

  useEffect(() => {
    if (tabParam) {
      if (['attendance', 'teacher_comments', 'education', 'academic'].includes(tabParam)) {
        setActiveTab('education');
      } else if (['finance', 'profile', 'family', 'tasks', 'timeline'].includes(tabParam)) {
        setActiveTab(tabParam === 'family' ? 'profile' : (tabParam as any));
      }
    }
  }, [tabParam]);

  // Next Upcoming Lesson State
  const [upcomingLesson, setUpcomingLesson] = useState<FullLessonData | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const computeNextLesson = () => {
    if (typeof window === 'undefined') return;
    const allLessons = getStoredLessons();
    const studentGroupIds = new Set((student.groups || []).map((g) => g.id));
    const nowMs = Date.now();

    const parseLessonDateMs = (l: FullLessonData): number => {
      if (!l.date) return 0;
      let isoDate = l.date;
      if (l.date.includes('.')) {
        const parts = l.date.split('.');
        if (parts.length === 3) {
          isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      const time = l.startTime && l.startTime.length >= 4 ? l.startTime : '00:00';
      const parsed = new Date(`${isoDate}T${time.length === 5 ? time + ':00' : time}`).getTime();
      return isNaN(parsed) ? 0 : parsed;
    };
    
    const candidates = allLessons.filter((l) => {
      if (l.status === 'cancelled' || l.status === 'completed') return false;
      const lessonMs = parseLessonDateMs(l);
      if (lessonMs <= nowMs) return false;
      const isStudentInLesson = (l.students || []).some((s) => s.id === student.id);
      const isGroupMatched = l.groupId && studentGroupIds.has(l.groupId);
      return isStudentInLesson || isGroupMatched;
    });

    candidates.sort((a, b) => {
      const timeA = parseLessonDateMs(a);
      const timeB = parseLessonDateMs(b);
      return timeA - timeB;
    });

    setUpcomingLesson(candidates[0] || null);
  };

  useEffect(() => {
    computeNextLesson();
    const handleSync = () => computeNextLesson();
    window.addEventListener('crm-lessons-changed', handleSync);
    window.addEventListener('crm-groups-changed', handleSync);
    return () => {
      window.removeEventListener('crm-lessons-changed', handleSync);
      window.removeEventListener('crm-groups-changed', handleSync);
    };
  }, [student.id, student.groups]);

  // Selected parent and task for modal window
  const [selectedParentForModal, setSelectedParentForModal] = useState<any | null>(null);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<Task | null>(null);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [taskModalTab, setTaskModalTab] = useState<'details' | 'reschedule'>('details');
  const [taskOutcomeComment, setTaskOutcomeComment] = useState('');
  const [rescheduleNewDate, setRescheduleNewDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Edit student modal state
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Flexible per-lesson rate & Email Statement states
  const [customPricePerLesson, setCustomPricePerLesson] = useState<number>(() => {
    return (student.finance?.deposit?.pricePerLesson as number) || 12;
  });
  const [isEditingPricePerLesson, setIsEditingPricePerLesson] = useState(false);
  const [tempPricePerLesson, setTempPricePerLesson] = useState<string>('12');

  const [isEmailStatementModalOpen, setIsEmailStatementModalOpen] = useState(false);
  const [statementPeriod, setStatementPeriod] = useState<'current_month' | 'all_time'>('current_month');
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'deposits' | 'deductions'>('all');
  const [editStudentForm, setEditStudentForm] = useState({
    firstName: student.firstName,
    lastName: student.lastName,
    birthDate: student.birthDate || '',
    grade: student.grade || '',
    phone: student.phone || '',
    telegram: student.telegram || '',
    status: student.status,
    studentType: student.studentType || 'school_student',
    notes: student.notes || '',
    groups: student.groups || [],
  });

  // Enroll in group modal state
  const [isEnrollGroupModalOpen, setIsEnrollGroupModalOpen] = useState(false);
  const [selectedGroupIdToEnroll, setSelectedGroupIdToEnroll] = useState('');

  const handleEnrollGroup = (groupId: string) => {
    if (!groupId) return;
    const targetGroup = INITIAL_GROUPS.find((g) => g.id === groupId);
    if (!targetGroup) return;

    if (student.groups.some((g) => g.id === targetGroup.id || g.name === targetGroup.name)) {
      toast.error('Ученик уже зачислен в эту группу');
      return;
    }

    const { updatedStudent } = enrollStudentToGroup({
      groupId,
      studentId: student.id,
      authorName: userName || 'Администратор школы',
    });

    if (updatedStudent) {
      setStudent(updatedStudent);
    }
    toast.success(`Ученик успешно зачислен в группу «${targetGroup.name}»!`);
    setIsEnrollGroupModalOpen(false);
    setSelectedGroupIdToEnroll('');
  };

  const handleRemoveGroup = (groupId: string, groupName: string) => {
    const { updatedStudent } = excludeStudentFromGroup({
      groupId,
      groupName,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      authorName: userName || 'Администратор школы',
    });

    if (updatedStudent) {
      setStudent(updatedStudent);
    } else {
      const updatedGroups = student.groups.filter((g) => (groupId ? g.id !== groupId : true) && (groupName ? g.name !== groupName : true));
      const removeInteraction: TimelineInteraction = {
        id: `int_${Date.now()}`,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        parentId: student.parents[0]?.id,
        parentName: student.parents[0] ? `${student.parents[0].firstName} ${student.parents[0].lastName}` : undefined,
        occurredAt: 'Только что',
        channel: 'other',
        type: 'status_change',
        author: userName || 'Администратор школы',
        content: `Исключен(а) из группы «${groupName}».`,
        result: 'Исключение из группы',
        targetType: student.studentType === 'adult_student' ? 'student' : 'parent',
        targetName: student.studentType === 'adult_student' ? `${student.firstName} ${student.lastName}` : (student.parents[0] ? `${student.parents[0].firstName} ${student.parents[0].lastName}` : `${student.firstName} ${student.lastName}`),
        targetRole: student.studentType === 'adult_student' ? 'Студент' : 'Родитель',
      };

      const updatedStudentFallback: FullStudentData = {
        ...student,
        groups: updatedGroups,
        interactions: [removeInteraction, ...student.interactions],
      };

      setStudent(updatedStudentFallback);
      saveStudentToStorage(updatedStudentFallback);
      saveInteractionToStorage(removeInteraction);
    }

    toast.success(`Ученик исключен из группы «${groupName}»`);
  };

  // Adult Student Conversion Modal state
  const [isConvertAdultModalOpen, setIsConvertAdultModalOpen] = useState(false);
  const [studentDirectPhone, setStudentDirectPhone] = useState(student.phone || student.parents[0]?.phone || '');
  const [studentDirectTelegram, setStudentDirectTelegram] = useState(student.telegram || '');
  const [studentOccupation, setStudentOccupation] = useState('');

  const handleConvertToAdult = (e: React.FormEvent) => {
    e.preventDefault();
    const directPhone = studentDirectPhone.trim() || student.phone || '—';
    const directTg = studentDirectTelegram.trim() || student.telegram;

    const parentsNames = student.parents.map((p) => `${p.firstName} ${p.lastName}`).join(', ');

    const conversionInteraction: TimelineInteraction = {
      id: `int_${Date.now()}`,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      parentId: student.parents[0]?.id,
      parentName: student.parents[0] ? `${student.parents[0].firstName} ${student.parents[0].lastName}` : undefined,
      occurredAt: 'Только что',
      channel: 'other',
      type: 'status_change',
      author: userName || 'Администратор школы',
      content: `Ученик достиг совершеннолетия и конвертирован в статус «Студент». Прямой контакт: ${directPhone}. Данные родителей (${parentsNames || 'нет'}) сохранены как семейные контакты.`,
      result: 'Конвертация в совершеннолетнего студента завершена',
    };

    const updatedStudent: FullStudentData = {
      ...student,
      studentType: 'adult_student',
      phone: directPhone,
      telegram: directTg || undefined,
      notes: [
        student.notes,
        studentOccupation ? `Род занятий: ${studentOccupation}` : '',
        `Конвертирован в студента ${new Date().toLocaleDateString('ru-RU')}. Данные родителей унаследованы.`
      ].filter(Boolean).join('\n\n'),
      interactions: [conversionInteraction, ...student.interactions],
    };

    setStudent(updatedStudent);
    saveStudentToStorage(updatedStudent);
    saveInteractionToStorage(conversionInteraction);
    setIsConvertAdultModalOpen(false);
    toast.success(`Ученик успешно конвертирован в статус «Студент» с сохранением данных родителей!`);
  };

  const handleOpenEditStudentModal = () => {
    setEditStudentForm({
      firstName: student.firstName,
      lastName: student.lastName,
      birthDate: student.birthDate || '',
      grade: student.grade || '',
      phone: student.phone || '',
      telegram: student.telegram || '',
      status: student.status,
      studentType: student.studentType || 'school_student',
      notes: student.notes || '',
      groups: [...student.groups],
    });
    setIsEditStudentModalOpen(true);
  };

  const handleSaveStudentEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const newFirstName = editStudentForm.firstName.trim() || student.firstName;
    const newLastName = editStudentForm.lastName.trim() || student.lastName;
    const newBirthDate = editStudentForm.birthDate.trim() || undefined;
    const newGrade = editStudentForm.grade.trim() || undefined;
    const newPhone = editStudentForm.phone.trim() || undefined;
    const newTelegram = editStudentForm.telegram.trim() || undefined;
    const newStatus = editStudentForm.status;
    const newStudentType = editStudentForm.studentType as any;
    const newNotes = editStudentForm.notes.trim() || undefined;
    const newGroups = editStudentForm.groups;

    const changes: string[] = [];
    if (newFirstName !== student.firstName || newLastName !== student.lastName) {
      changes.push(`ФИО: ${student.firstName} ${student.lastName} → ${newFirstName} ${newLastName}`);
    }
    if (newPhone !== student.phone) {
      changes.push(`Телефон: ${student.phone || 'не указан'} → ${newPhone || 'не указан'}`);
    }
    if (newTelegram !== student.telegram) {
      changes.push(`Telegram: ${student.telegram || 'не указан'} → ${newTelegram || 'не указан'}`);
    }
    if (newBirthDate !== student.birthDate) {
      changes.push(`Дата рождения: ${student.birthDate || 'не указана'} → ${newBirthDate || 'не указана'}`);
    }
    if (newGrade !== student.grade) {
      changes.push(`Класс: ${student.grade || 'не указан'} → ${newGrade || 'не указан'}`);
    }
    if (newStatus !== student.status) {
      changes.push(`Статус: ${student.status} → ${newStatus}`);
    }
    if (newStudentType !== student.studentType) {
      changes.push(`Тип: ${student.studentType === 'adult_student' ? 'Студент' : 'Школьник'} → ${newStudentType === 'adult_student' ? 'Студент' : 'Школьник'}`);
    }
    if (newNotes !== student.notes) {
      changes.push('Заметки и особенности');
    }
    const oldGroupIds = student.groups.map((g) => g.id).sort().join(',');
    const newGroupIds = newGroups.map((g) => g.id).sort().join(',');
    if (oldGroupIds !== newGroupIds) {
      changes.push(`Группы: ${newGroups.map((g) => g.name).join(', ') || 'нет групп'}`);
    }

    const editInteraction: TimelineInteraction = {
      id: `int_${Date.now()}`,
      studentId: student.id,
      studentName: `${newFirstName} ${newLastName}`,
      parentId: student.parents[0]?.id,
      parentName: student.parents[0] ? `${student.parents[0].firstName} ${student.parents[0].lastName}` : undefined,
      occurredAt: 'Только что',
      channel: 'other',
      type: 'status_change',
      author: userName || 'Администратор школы',
      content: changes.length > 0
        ? `Изменение личных данных: ${changes.join('; ')}`
        : 'Изменение личных данных: карточка обновлена администратором',
      result: 'Изменение личных данных',
      targetType: newStudentType === 'adult_student' ? 'student' : 'student',
      targetName: `${newFirstName} ${newLastName}`,
      targetRole: newStudentType === 'adult_student' ? 'Студент' : 'Ученик',
    };

    const updated: FullStudentData = {
      ...student,
      firstName: newFirstName,
      lastName: newLastName,
      birthDate: newBirthDate,
      grade: newGrade,
      phone: newPhone,
      telegram: newTelegram,
      status: newStatus,
      studentType: newStudentType,
      notes: newNotes,
      groups: newGroups,
      updatedAt: new Date().toISOString(),
      interactions: [editInteraction, ...student.interactions],
    };

    setStudent(updated);
    saveStudentToStorage(updated);
    saveInteractionToStorage(editInteraction);
    window.dispatchEvent(new CustomEvent('crm-students-changed', { detail: updated }));

    const idx = INITIAL_STUDENTS.findIndex((s) => s.id === student.id);
    if (idx !== -1) {
      INITIAL_STUDENTS[idx] = updated;
    }

    toast.success('Данные сохранены и зафиксированы в таймлайне ("Изменение личных данных")');
    setIsEditStudentModalOpen(false);
  };

  // Task creation modal state
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);

  // Notes editing state
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState(student.notes || '');

  // Teacher comment state
  const [newTeacherCommentText, setNewTeacherCommentText] = useState('');
  const [newTeacherCommentCategory, setNewTeacherCommentCategory] = useState<'progress' | 'homework' | 'behavior' | 'general'>('progress');
  const [newTeacherCommentGroup, setNewTeacherCommentGroup] = useState(student.groups[0]?.name || 'Основная группа');
  const [newTeacherCommentTopic, setNewTeacherCommentTopic] = useState('');

  // New interaction form state
  const [newNoteText, setNewNoteText] = useState('');
  const [newChannel, setNewChannel] = useState<'telegram' | 'whatsapp' | 'phone' | 'call'>('telegram');
  const [newFollowUpDate, setNewFollowUpDate] = useState('');
  const [interactionTarget, setInteractionTarget] = useState<string>('student');
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'communication' | 'tasks' | 'finance' | 'lead'>('all');

  useEffect(() => {
    const parentIds = (student.parents || []).map((p) => p.id);
    const combined = getCombinedStudentTimeline(student.id, student.interactions, parentIds);
    if (combined.length !== student.interactions.length) {
      setStudent((prev) => ({ ...prev, interactions: combined }));
    }
  }, [student.id]);

  const handleTaskCreated = (newTask: FullTaskData) => {
    const taskItem: Task = {
      id: newTask.id,
      title: newTask.title,
      taskType: newTask.taskType,
      studentId: student.id,
      assignedTo: newTask.assignedTo,
      dueDate: newTask.dueDateFormatted || newTask.dueDate,
      status: 'open',
      priority: newTask.priority,
    };

    const targetIsParent = Boolean(newTask.parentId);
    const taskInteraction: TimelineInteraction = {
      id: `int_${Date.now()}`,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      parentId: newTask.parentId || student.parents[0]?.id,
      parentName: newTask.parentName || (student.parents[0] ? `${student.parents[0].firstName} ${student.parents[0].lastName}` : undefined),
      occurredAt: 'Только что',
      channel: 'other',
      type: 'status_change',
      author: userName || 'Администратор школы',
      content: `Создана задача: «${newTask.title}» (${newTask.taskType}, срок: ${newTask.dueDateFormatted || newTask.dueDate}, ответственный: ${newTask.assignedTo}${targetIsParent ? `, контакт: ${newTask.parentName}` : ''}).`,
      result: `Задача закреплена за ${newTask.assignedTo}`,
      targetType: targetIsParent ? 'parent' : (student.studentType === 'adult_student' ? 'student' : 'student'),
      targetName: targetIsParent ? (newTask.parentName || 'Родитель') : `${student.firstName} ${student.lastName}`,
      targetRole: targetIsParent ? 'Родитель' : (student.studentType === 'adult_student' ? 'Студент' : 'Ученик'),
    };

    const fullNewTask: FullTaskData = {
      ...newTask,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      parentId: newTask.parentId || student.parents[0]?.id,
      parentName: newTask.parentName || (student.parents[0] ? `${student.parents[0].firstName} ${student.parents[0].lastName}` : undefined),
    };

    const updatedStudent: FullStudentData = {
      ...student,
      tasks: [taskItem, ...student.tasks],
      interactions: [taskInteraction, ...student.interactions],
    };

    setStudent(updatedStudent);
    saveStudentToStorage(updatedStudent);
    saveTaskToStorage(fullNewTask);
    saveInteractionToStorage(taskInteraction);
    window.dispatchEvent(new CustomEvent('crm-students-changed', { detail: updatedStudent }));
    window.dispatchEvent(new CustomEvent('crm-tasks-changed', { detail: fullNewTask }));
    window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed', { detail: taskInteraction }));

    const idx = INITIAL_STUDENTS.findIndex((s) => s.id === student.id);
    if (idx !== -1) {
      INITIAL_STUDENTS[idx] = {
        ...INITIAL_STUDENTS[idx],
        tasks: [taskItem, ...(INITIAL_STUDENTS[idx].tasks || [])],
        interactions: [taskInteraction, ...(INITIAL_STUDENTS[idx].interactions || [])],
      };
    }

    toast.success(`Задача «${newTask.title}» успешно создана и добавлена в таймлайн!`);
    setIsCreateTaskModalOpen(false);
  };

  const handleSaveNotes = () => {
    const updatedNotes = editedNotes.trim();
    if (updatedNotes !== (student.notes || '').trim()) {
      const notesInteraction: TimelineInteraction = {
        id: `int_${Date.now()}`,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        parentId: student.parents[0]?.id,
        parentName: student.parents[0] ? `${student.parents[0].firstName} ${student.parents[0].lastName}` : undefined,
        occurredAt: 'Только что',
        channel: 'other',
        type: 'status_change',
        author: userName || 'Администратор школы',
        content: `Изменение личных данных: обновлены заметки и особенности ученика`,
        result: 'Изменение личных данных',
        targetType: student.studentType === 'adult_student' ? 'student' : 'student',
        targetName: `${student.firstName} ${student.lastName}`,
        targetRole: student.studentType === 'adult_student' ? 'Студент' : 'Ученик',
      };
      saveInteractionToStorage(notesInteraction);
      const updatedStudent: FullStudentData = {
        ...student,
        notes: updatedNotes,
        updatedAt: new Date().toISOString(),
        interactions: [notesInteraction, ...student.interactions],
      };
      setStudent(updatedStudent);
      saveStudentToStorage(updatedStudent);
      window.dispatchEvent(new CustomEvent('crm-students-changed', { detail: updatedStudent }));
    } else {
      setStudent((prev) => ({ ...prev, notes: updatedNotes }));
    }

    // Sync with in-memory INITIAL_STUDENTS
    const idx = INITIAL_STUDENTS.findIndex((s) => s.id === student.id);
    if (idx !== -1) {
      INITIAL_STUDENTS[idx] = { ...INITIAL_STUDENTS[idx], notes: updatedNotes };
    }

    setIsEditingNotes(false);
    toast.success('Заметки сохранены и зафиксированы в таймлайне ("Изменение личных данных")!');
  };

  const handleAddTeacherComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherCommentText.trim()) return;

    const now = new Date();
    const dateFormatted = `${now.toLocaleDateString('ru-RU')}, ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;

    const newComment: TeacherComment = {
      id: `tc_${Date.now()}`,
      studentId: student.id,
      author: userName || 'Преподаватель',
      date: dateFormatted,
      groupName: newTeacherCommentGroup,
      lessonTopic: newTeacherCommentTopic.trim() || undefined,
      category: newTeacherCommentCategory,
      content: newTeacherCommentText.trim(),
    };

    const categoryLabelMap: Record<string, string> = {
      progress: 'Успеваемость и прогресс',
      homework: 'Домашнее задание',
      behavior: 'Поведение',
      general: 'Общий отзыв',
    };

    const commentInteraction: TimelineInteraction = {
      id: `int_tc_${Date.now()}`,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      occurredAt: 'Только что',
      channel: 'other',
      type: 'other',
      author: userName || 'Преподаватель',
      content: `[${newTeacherCommentGroup}] ${newTeacherCommentText.trim()}`,
      result: `Отзыв преподавателя: ${categoryLabelMap[newTeacherCommentCategory] || 'Отзыв'}`,
    };

    saveInteractionToStorage(commentInteraction);

    const updatedComments = [newComment, ...(student.teacherComments || [])];
    const updatedInteractions = [commentInteraction, ...(student.interactions || [])];

    const updatedStudent: FullStudentData = {
      ...student,
      teacherComments: updatedComments,
      interactions: updatedInteractions,
    };

    setStudent(updatedStudent);
    saveStudentToStorage(updatedStudent);

    // Sync with in-memory INITIAL_STUDENTS
    const idx = INITIAL_STUDENTS.findIndex((s) => s.id === student.id);
    if (idx !== -1) {
      INITIAL_STUDENTS[idx] = {
        ...INITIAL_STUDENTS[idx],
        teacherComments: updatedComments,
        interactions: updatedInteractions,
      };
    }

    // Trigger reactive window events for Timeline and Realtime
    window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed', { detail: commentInteraction }));
    window.dispatchEvent(new CustomEvent('crm-students-changed', { detail: updatedStudent }));

    setNewTeacherCommentText('');
    setNewTeacherCommentTopic('');
    toast.success('Комментарий преподавателя сохранен и опубликован в Timeline!');
  };

  const targetParent = student.parents.find((p) => p.isPrimary) || student.parents[0];
  const representativeEmail = student.studentType === 'adult_student'
    ? (student.email || targetParent?.email)
    : targetParent?.email;
  const representativeName = student.studentType === 'adult_student'
    ? `${student.firstName} ${student.lastName}`
    : (targetParent ? `${targetParent.firstName} ${targetParent.lastName}` : `${student.firstName} ${student.lastName}`);

  const handleOpenEmailStatementModal = () => {
    if (!representativeEmail) {
      toast.error('У представителя не указан e-mail. Укажите адрес в контактах');
      return;
    }
    setIsEmailStatementModalOpen(true);
  };

  const [isSendingEmailStatement, setIsSendingEmailStatement] = useState(false);

  const handleSendEmailStatement = async () => {
    if (!representativeEmail || isSendingEmailStatement) return;
    setIsSendingEmailStatement(true);

    const courseName = student.groups?.[0]?.courseName || student.groups?.[0]?.name || 'Общий курс';
    const periodLabel = statementPeriod === 'current_month' ? 'Сентябрь 2026' : 'За всё время';

    const depositBalanceEUR = student.finance?.deposit?.balance || 120;
    const overdueDebtEUR = (student.finance?.payments || [])
      .filter((p) => p.status === 'overdue')
      .reduce((sum, p) => sum + (parseFloat(String(p.amount).replace(/[^\d.]/g, '')) || 0), 0);

    // Prepare chronological ledger items for email
    const ledgerItems = buildChronologicalLedger(student, customPricePerLesson || 12);
    const filteredLedger = statementPeriod === 'current_month'
      ? ledgerItems.slice(0, 15)
      : ledgerItems;

    const emailLedgerItems = filteredLedger.map((item) => ({
      date: item.date,
      description: item.description,
      method: item.method,
      amountEUR: item.type === 'deposit' ? item.amountEUR : -item.amountEUR,
      balanceEUR: item.runningBalanceEUR,
      type: item.type,
    }));

    try {
      const response = await fetch('/api/reports/statement/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: representativeEmail,
          representativeName,
          studentName: `${student.firstName} ${student.lastName}`,
          periodLabel,
          courseName,
          depositBalance: depositBalanceEUR,
          debtBalance: overdueDebtEUR,
          currencySymbol: '€',
          ledgerItems: emailLedgerItems,
          senderName: 'You Europe',
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        toast.error(resData.error || 'Ошибка отправки выписки через Resend API');
        setIsSendingEmailStatement(false);
        return;
      }

      toast.success(`Выписка успешно отправлена на ${representativeEmail}`);
      setIsEmailStatementModalOpen(false);

      const emailInteraction: TimelineInteraction = {
        id: `int_email_${Date.now()}`,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        parentId: targetParent?.id,
        parentName: targetParent ? `${targetParent.firstName} ${targetParent.lastName}` : undefined,
        occurredAt: 'Только что',
        channel: 'email',
        type: 'other',
        author: userName || 'Сотрудник',
        content: `Выписка по оплатам и урокам (${periodLabel}) успешно отправлена на e-mail ${representativeEmail} через Resend.`,
        result: `Отправлено на ${representativeEmail}`,
      };

      saveInteractionToStorage(emailInteraction);

      const updatedInteractions = [emailInteraction, ...(student.interactions || [])];
      const updatedStudent: FullStudentData = {
        ...student,
        interactions: updatedInteractions,
      };
      setStudent(updatedStudent);
      saveStudentToStorage(updatedStudent);

      window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed', { detail: emailInteraction }));
      window.dispatchEvent(new CustomEvent('crm-students-changed', { detail: updatedStudent }));
    } catch (err: any) {
      console.error('Error sending statement:', err);
      toast.error(err.message || 'Сетевая ошибка при отправке выписки');
    } finally {
      setIsSendingEmailStatement(false);
    }
  };

  const handleSavePricePerLesson = () => {
    const parsed = parseFloat(tempPricePerLesson);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Введите корректную стоимость занятия (число в евро)');
      return;
    }
    setCustomPricePerLesson(parsed);
    setIsEditingPricePerLesson(false);

    const updatedStudent: FullStudentData = {
      ...student,
      finance: {
        ...student.finance,
        deposit: {
          ...student.finance?.deposit,
          balance: student.finance?.deposit?.balance || 120,
          balanceFormatted: `${(student.finance?.deposit?.balance || 120).toLocaleString('ru-RU')} €`,
          currency: 'EUR',
          pricePerLesson: parsed,
          pricePerLessonFormatted: `${parsed.toLocaleString('ru-RU')} €`,
        },
      },
    };

    setStudent(updatedStudent);
    saveStudentToStorage(updatedStudent);
    window.dispatchEvent(new CustomEvent('crm-students-changed', { detail: updatedStudent }));
    toast.success(`Индивидуальная ставка за урок обновлена: ${parsed} €`);
  };

  const handleDeductDeposit = () => {
    const topic = student.attendanceStats?.history?.[0]?.topic || 'Онлайн-занятие по расписанию';
    const res = deductLessonFromDeposit(student.id, undefined, topic);
    if (res.success) {
      toast.success(res.message);
      const fresh = getStudentById(student.id);
      if (fresh) {
        setStudent(fresh);
        latestStudentRef.current = fresh;
      }
    }
  };

  const handleAddInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const isStudent = interactionTarget === 'student';
    const targetParentId = !isStudent ? interactionTarget.replace('parent_', '') : null;
    const targetParent = targetParentId ? student.parents.find((p) => p.id === targetParentId) || student.parents[0] : undefined;

    const newEntry: TimelineInteraction = {
      id: `int_${Date.now()}`,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      parentId: targetParent?.id,
      parentName: targetParent ? `${targetParent.firstName} ${targetParent.lastName}` : undefined,
      targetType: isStudent ? 'student' : 'parent',
      targetName: isStudent ? `${student.firstName} ${student.lastName}` : (targetParent ? `${targetParent.firstName} ${targetParent.lastName}` : 'Родитель'),
      targetRole: isStudent ? 'Ученик' : (targetParent?.relationshipType ? `Родитель (${targetParent.relationshipType})` : 'Родитель'),
      occurredAt: 'Только что',
      channel: newChannel,
      type: 'follow_up',
      author: userName || 'Администратор школы',
      content: newNoteText.trim(),
      result: 'Зафиксировано в истории',
      nextAction: newFollowUpDate ? `Связаться ${newFollowUpDate}` : undefined,
      followUpDate: newFollowUpDate || undefined,
    };

    setStudent((prev) => ({
      ...prev,
      interactions: [newEntry, ...prev.interactions],
    }));

    // Sync in-memory INITIAL_STUDENTS
    const idx = INITIAL_STUDENTS.findIndex((s) => s.id === student.id);
    if (idx !== -1) {
      INITIAL_STUDENTS[idx] = {
        ...INITIAL_STUDENTS[idx],
        interactions: [newEntry, ...(INITIAL_STUDENTS[idx].interactions || [])],
      };
    }

    // Persist to shared timeline storage
    saveInteractionToStorage(newEntry);

    // Auto-create Follow-up task in Tasks tab if followUpDate is specified
    if (newFollowUpDate) {
      const trimmedNote = newNoteText.trim();
      const shortSummary = trimmedNote.length > 55 ? `${trimmedNote.slice(0, 52)}...` : trimmedNote;

      createUnifiedTask({
        title: `Follow-up: ${shortSummary}`,
        dueDate: newFollowUpDate,
        assignedTo: userName || 'Администратор',
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        parentId: targetParent?.id,
        parentName: targetParent ? `${targetParent.firstName} ${targetParent.lastName}` : undefined,
        description: `Автоматически создано из Timeline (${newChannel}). Заметка: «${trimmedNote}»`,
        taskType: 'Retention',
        priority: 'medium',
        createdByName: userName || 'Администратор',
      })
        .then((newTask) => {
          setStudent((prev) => ({
            ...prev,
            tasks: [newTask, ...(prev.tasks || []).filter((t) => t.id !== newTask.id)],
          }));
        })
        .catch((err) => console.error('Failed to auto-create follow-up task:', err));
    }

    toast.success(
      newFollowUpDate
        ? `Действие сохранено и создана задача Follow-up на ${newFollowUpDate}!`
        : isStudent
        ? `Действие с учеником «${student.firstName} ${student.lastName}» сохранено!`
        : `Действие с родителем «${targetParent?.firstName} ${targetParent?.lastName}» сохранено!`
    );
    setNewNoteText('');
    setNewFollowUpDate('');
  };

  const handleToggleTask = async (taskId: string) => {
    const currentTask = (student.tasks || []).find((t) => t.id === taskId);
    const newStatus = currentTask?.status === 'done' ? 'open' : 'done';

    setStudent((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      ),
    }));

    try {
      await updateUnifiedTaskStatus(taskId, newStatus, {
        performedBy: userName || 'Администратор',
      });
      toast.success(newStatus === 'done' ? 'Задача выполнена!' : 'Задача открыта заново');
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const handleCompleteTaskWithOutcome = async (taskId: string, outcome: string) => {
    const perfUser = userName || 'Администратор';

    try {
      const updated = await updateUnifiedTaskStatus(taskId, 'done', {
        comment: outcome.trim() || 'Результат зафиксирован',
        performedBy: perfUser,
      });

      setStudent((prev) => {
        const parentIds = (prev.parents || []).map((p) => p.id);
        const newTasks = prev.tasks.map((t) => (t.id === taskId ? ((updated as any) || { ...t, status: 'done', result: outcome.trim() }) : t));
        const newCombined = getCombinedStudentTimeline(prev.id, prev.interactions, parentIds);
        return {
          ...prev,
          tasks: newTasks,
          interactions: newCombined,
        };
      });

      toast.success('Результат задачи зафиксирован!');
      setSelectedTaskForModal(null);
    } catch (err) {
      console.error('Failed to complete task with outcome:', err);
      toast.error('Ошибка сохранения результата задачи');
    }
  };

  const handleRescheduleTask = async (taskId: string, newDueDate: string, reason: string) => {
    if (!newDueDate) {
      toast.error('Укажите новую дату выполнения');
      return;
    }
    if (!reason.trim()) {
      toast.error('Укажите причину переноса');
      return;
    }
    const perfUser = userName || 'Администратор';

    try {
      const updated = await updateUnifiedTaskStatus(taskId, 'open', {
        comment: reason.trim(),
        newDueDate,
        performedBy: perfUser,
      });

      setStudent((prev) => {
        const parentIds = (prev.parents || []).map((p) => p.id);
        const newTasks = prev.tasks.map((t) => (t.id === taskId ? ((updated as any) || { ...t, dueDate: newDueDate, rescheduledReason: reason.trim(), rescheduledBy: perfUser, rescheduledAt: new Date().toISOString() }) : t));
        const newCombined = getCombinedStudentTimeline(prev.id, prev.interactions, parentIds);
        return {
          ...prev,
          tasks: newTasks,
          interactions: newCombined,
        };
      });

      toast.success('Срок задачи перенесен!');
      setSelectedTaskForModal(null);
    } catch (err) {
      console.error('Failed to reschedule task:', err);
      toast.error('Ошибка переноса срока задачи');
    }
  };

  useEffect(() => {
    reconcileAllStudentDepositsAndDebts();

    // Sync tasks and timeline when changed anywhere
    const handleSync = async () => {
      try {
        const studentTasks = await getTasksForStudent(studentId);
        const parentIds = (student.parents || []).map((p) => p.id);
        const combined = getCombinedStudentTimeline(studentId, student.interactions, parentIds);
        setStudent((prev) => ({
          ...prev,
          tasks: studentTasks,
          interactions: combined,
        }));
      } catch {}
    };

    window.addEventListener('crm-tasks-changed', handleSync);
    window.addEventListener('crm-timeline-interactions-changed', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      window.removeEventListener('crm-tasks-changed', handleSync);
      window.removeEventListener('crm-timeline-interactions-changed', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [studentId]);

  const finSummary = getStudentFinancialSummary(student.id);
  const studentDeposit = finSummary.deposit;
  const studentOverdueDebt = finSummary.debt;
  const currencySymbol = '€';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Back link & breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/students" className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('action.back', 'Назад')} {t('students.title', 'к списку учеников')}
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">{student.firstName} {student.lastName}</span>
      </div>

      {/* Desktop Header Component */}
      <StudentProfileDesktop
        student={student}
        finSummary={finSummary}
        studentDeposit={studentDeposit}
        studentOverdueDebt={studentOverdueDebt}
        upcomingLesson={upcomingLesson}
        role={role}
        isSaving={isSaving}
        onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
        onOpenCreateTaskModal={() => setIsCreateTaskModalOpen(true)}
        onOpenEditStudentModal={handleOpenEditStudentModal}
        onConvertAdultModal={() => {
          setStudentDirectPhone(student.phone || student.parents[0]?.phone || '');
          setStudentDirectTelegram(student.telegram || '');
          setIsConvertAdultModalOpen(true);
        }}
        onDeleteStudent={() => {
          if (confirm(`Вы уверены, что хотите переместить ученика ${student.firstName} ${student.lastName} в удаленные? Его можно восстановить в любой момент.`)) {
            softDeleteStudent(student.id);
            toast.success(`Ученик ${student.firstName} ${student.lastName} перемещен в удаленные`);
            router.push('/students');
          }
        }}
        onSelectTab={(tabKey) => {
          setActiveTab(tabKey as any);
          window.history.replaceState(null, '', `/students/${studentId}?tab=${tabKey}`);
        }}
      />

      {/* Mobile Hero Header Card */}
      <div className="block md:hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 font-bold text-white text-2xl shadow-sm">
              {student.firstName[0]}{student.lastName[0]}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {student.firstName} {student.lastName}
                </h1>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 font-semibold text-xs border',
                    student.status === 'active' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    student.status === 'trial' && 'bg-purple-50 text-purple-700 border-purple-200',
                    student.status === 'paused' && 'bg-amber-50 text-amber-700 border-amber-200'
                  )}
                >
                  {student.status === 'active' && t('status.active', 'Активен')}
                  {student.status === 'trial' && t('status.trial', 'Пробный')}
                  {student.status === 'paused' && t('status.paused', 'На паузе')}
                </span>

                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 font-semibold text-xs border inline-flex items-center gap-1',
                    student.studentType === 'adult_student'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  )}
                >
                  {student.studentType === 'adult_student' ? (
                    <>
                      <GraduationCap className="h-3 w-3" />
                      {t('students.filterAdult', 'Студент')}
                    </>
                  ) : (
                    <>
                      <span>{t('students.filterSchool', 'Школьник')}</span>
                    </>
                  )}
                </span>

                {/* Hero Balance Badge */}
                {role === 'teacher' ? (
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-bold border inline-flex items-center gap-1 shadow-2xs',
                      getStudentLessonPaymentStatus(student.id, student.status === 'trial').badgeClass
                    )}
                  >
                    {getStudentLessonPaymentStatus(student.id, student.status === 'trial').label}
                  </span>
                ) : studentDeposit > 0 ? (
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1 shadow-2xs">
                    <Wallet className="h-3 w-3 text-emerald-600" />
                    {t('hero.deposit', 'Депозит')}: {finSummary.formattedDeposit}
                  </span>
                ) : studentOverdueDebt > 0 ? (
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1 shadow-2xs animate-pulse">
                    <AlertTriangle className="h-3 w-3 text-rose-600" />
                    {t('hero.debt', 'Долг')}: {finSummary.formattedDebt}
                  </span>
                ) : (
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1 shadow-2xs">
                    <Clock className="h-3 w-3 text-amber-600" />
                    {t('hero.balance', 'Баланс')}: 0 €
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                {(student.birthDate || student.grade) && (
                  <span className="flex items-center gap-1.5 font-medium text-slate-700 bg-slate-100/90 px-2.5 py-0.5 rounded-md border border-slate-200/60">
                    <Calendar className="h-3.5 w-3.5 text-blue-600" />
                    {student.birthDate && <span>Д/Р: {formatBirthDate(student.birthDate)}</span>}
                    {student.birthDate && formatAgeAndGrade(student.birthDate, student.grade) && <span className="text-slate-300">•</span>}
                    {formatAgeAndGrade(student.birthDate, student.grade) && (
                      <strong className="text-slate-900 font-bold">
                        {formatAgeAndGrade(student.birthDate, student.grade)}
                      </strong>
                    )}
                  </span>
                )}
                {student.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {student.phone}
                  </span>
                )}
                {student.telegram && (
                  <span className="flex items-center gap-1 text-blue-600">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {student.telegram}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {student.studentType !== 'adult_student' ? (
              <button
                type="button"
                onClick={() => {
                  setStudentDirectPhone(student.phone || student.parents[0]?.phone || '');
                  setStudentDirectTelegram(student.telegram || '');
                  setIsConvertAdultModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50/90 px-3.5 py-2 text-xs font-semibold text-purple-700 shadow-xs hover:bg-purple-100 transition-colors"
                title="Ученик достиг совершеннолетия: перевести на самостоятельное взаимодействие с сохранением данных родителей"
              >
                <GraduationCap className="h-3.5 w-3.5 text-purple-600" />
                {t('student.convertType', 'Конвертировать в студента')}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50/80 px-3 py-1.5 text-xs font-medium text-purple-700 border border-purple-200/80">
                <GraduationCap className="h-3.5 w-3.5 text-purple-600" />
                {t('students.filterAdult', 'Студент')}
              </span>
            )}
            <button
              onClick={handleOpenEditStudentModal}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <Edit className="h-3.5 w-3.5 text-blue-600" />
              {t('action.edit', 'Изменить')}
            </button>
            <button
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <CheckSquare className="h-3.5 w-3.5 text-purple-600" />
              {t('action.createTask', 'Создать задачу')}
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
              {t('action.addAction', 'Добавить действие')}
            </button>
            {role !== 'teacher' && (
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <CreditCard className="h-3.5 w-3.5" />
                {t('action.addPayment', 'Добавить платёж')}
              </button>
            )}
            {role !== 'teacher' && (
              <button
                onClick={() => {
                  if (confirm(`Вы уверены, что хотите переместить ученика ${student.firstName} ${student.lastName} в удаленные? Его можно восстановить в любой момент.`)) {
                    softDeleteStudent(student.id);
                    toast.success(`Ученик ${student.firstName} ${student.lastName} перемещен в удаленные`);
                    router.push('/students');
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 shadow-xs hover:bg-rose-50 transition-colors cursor-pointer"
                title="Удалить ученика"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                {t('action.delete', 'Удалить')}
              </button>
            )}
          </div>
        </div>

        {/* Quick summary strip */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3 border-t border-slate-100 pt-4 text-xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{t('nav.groups', 'Группы')} ({student.groups.length}):</span>
              <button
                type="button"
                onClick={() => setIsEnrollGroupModalOpen(true)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5"
                title="Зачислить в новую группу"
              >
                <Plus className="h-3 w-3" />
                {t('action.enrollNewGroup', 'Зачислить в новую группу')}
              </button>
            </div>
            {student.groups.length === 0 ? (
              <p className="font-semibold text-slate-400 mt-0.5">{t('group.noStudents', 'Не зачислен')}</p>
            ) : (
              <div className="flex flex-wrap gap-1 mt-1">
                {student.groups.map((grp) => (
                  <span
                    key={grp.id}
                    className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200/60"
                  >
                    {grp.name.split(' (')[0] || grp.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <span className="text-slate-400">{t('dashboard.attendance', 'Посещаемость')}:</span>
            <p className="font-semibold text-emerald-600 mt-0.5">{student.attendanceStats.attendanceRate}</p>
          </div>
          <div>
            <span className="text-slate-400">{t('finance.subscriptionEnd', 'Абонемент до')}:</span>
            <p className="font-semibold text-blue-600 mt-0.5">{student.finance.activeSubscription?.renewalDate || '—'}</p>
          </div>
          <div
            onClick={() => student.parents[0] && setSelectedParentForModal(student.parents[0])}
            className="cursor-pointer hover:bg-slate-50/80 p-1 rounded-lg transition-colors group"
            title="Нажмите, чтобы открыть карточку родителя"
          >
            <span className="text-slate-400">{t('students.colParent', 'Основной контакт')}:</span>
            <p className="font-semibold text-slate-900 group-hover:text-blue-600 mt-0.5 flex items-center gap-1">
              {student.parents[0]?.firstName} ({student.parents[0]?.relationshipType}) ↗
            </p>
          </div>

          {/* 5th Column: Payment Status Badge for teacher, Hero Balance Card for admin/owner */}
          {role === 'teacher' ? (
            <div className={cn(
              "rounded-xl p-2.5 border flex flex-col justify-between",
              getStudentLessonPaymentStatus(student.id, student.status === 'trial').status === 'unpaid' && "bg-rose-50/80 border-rose-200",
              getStudentLessonPaymentStatus(student.id, student.status === 'trial').status === 'trial_unpaid' && "bg-amber-50/70 border-amber-200",
              getStudentLessonPaymentStatus(student.id, student.status === 'trial').status === 'paid' && "bg-emerald-50/70 border-emerald-200",
              getStudentLessonPaymentStatus(student.id, student.status === 'trial').status === 'trial_paid' && "bg-purple-50/70 border-purple-200"
            )}>
              <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-blue-600" />
                {t('students.colBalance', 'Статус оплаты')}:
              </span>
              <p className="font-extrabold text-xs mt-1">
                <span className={cn('px-2 py-0.5 rounded-md text-[11px] border font-bold inline-block', getStudentLessonPaymentStatus(student.id, student.status === 'trial').badgeClass)}>
                  {getStudentLessonPaymentStatus(student.id, student.status === 'trial').label}
                </span>
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {student.status === 'trial' ? t('status.trial', 'Пробный урок') : t('status.active', 'Регулярные занятия')}
              </p>
            </div>
          ) : (
            <div className={cn(
              "rounded-xl p-2.5 border flex flex-col justify-between",
              studentDeposit > 0 && "bg-emerald-50/70 border-emerald-200",
              studentOverdueDebt > 0 && "bg-rose-50/80 border-rose-200",
              studentDeposit === 0 && studentOverdueDebt === 0 && "bg-amber-50/70 border-amber-200"
            )}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                  {studentDeposit > 0 ? (
                    <Wallet className="h-3 w-3 text-emerald-600" />
                  ) : studentOverdueDebt > 0 ? (
                    <AlertTriangle className="h-3 w-3 text-rose-600" />
                  ) : (
                    <Clock className="h-3 w-3 text-amber-600" />
                  )}
                  {t('hero.balance', 'Баланс')}:
                </span>
                {studentOverdueDebt > 0 ? (
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="text-[10px] font-bold text-rose-700 bg-white border border-rose-300 rounded px-1.5 py-0.5 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    {t('action.settleDebt', 'Погасить')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="text-[10px] font-bold text-blue-700 bg-white border border-blue-300 rounded px-1.5 py-0.5 hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    {t('action.pay', 'Пополнить')}
                  </button>
                )}
              </div>
              <p className={cn(
                "font-extrabold text-sm mt-0.5",
                studentDeposit > 0 && "text-emerald-700",
                studentOverdueDebt > 0 && "text-rose-700",
                studentDeposit === 0 && studentOverdueDebt === 0 && "text-slate-900"
              )}>
                {finSummary.formattedNet}
              </p>
              <p className={cn(
                "text-[10px] font-medium leading-tight line-clamp-1",
                studentDeposit > 0 && "text-emerald-600",
                studentOverdueDebt > 0 && "text-rose-600 font-semibold",
                studentDeposit === 0 && studentOverdueDebt === 0 && "text-amber-800 font-semibold"
              )} title={finSummary.breakdownSummary}>
                {finSummary.breakdownSummary}
              </p>
            </div>
          )}
        </div>

        {/* Hero Block: Следующее занятие */}
        <div className="mt-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50/60 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          {upcomingLesson ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
              <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-blue-900">
                      {t('hero.nextLesson', 'Следующее занятие')}:
                    </span>
                    <span className="rounded-md bg-blue-100/90 px-2 py-0.5 text-xs font-bold text-blue-800 border border-blue-200/60">
                      {upcomingLesson.date} • {upcomingLesson.startTime} – {upcomingLesson.endTime}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      «{upcomingLesson.groupName}»
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {upcomingLesson.topic && (
                      <span><strong>{t('hero.topic', 'Тема')}:</strong> {upcomingLesson.topic}</span>
                    )}
                    {upcomingLesson.teacherName && (
                      <span><strong>{t('hero.teacher', 'Преподаватель')}:</strong> {upcomingLesson.teacherName}</span>
                    )}
                    {upcomingLesson.room && (
                      <span><strong>{t('hero.room', 'Место')}:</strong> {upcomingLesson.room}</span>
                    )}
                    {upcomingLesson.homework && (
                      <span className="text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md font-medium border border-amber-200">
                        <strong>{t('hero.homework', 'Д/З')}:</strong> {upcomingLesson.homework}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {upcomingLesson.onlineMeetingUrl && (
                  <a
                    href={upcomingLesson.onlineMeetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-white border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors shadow-2xs"
                  >
                    <Video className="h-3.5 w-3.5 text-blue-600" />
                    Zoom
                  </a>
                )}
                <Link
                  href={`/calendar/lessons/${upcomingLesson.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors shadow-2xs"
                >
                  {t('action.viewCard', 'Карточка урока')} →
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5 text-xs text-slate-600">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>{t('hero.noLessons', 'Нет запланированных занятий в расписании')}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-white border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('action.scheduleLesson', 'Запланировать занятие')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* UPCOMING PAYMENT DEADLINE ALERT (Mobile only) */}
      {role !== 'teacher' && (
        <div className="block md:hidden">
          <UpcomingPaymentAlert
            item={getUpcomingPaymentForStudent(student.id)}
            onPaymentRecorded={() => {
              const fresh = getStudentById(student.id);
              if (fresh) setStudent(fresh);
            }}
          />
        </div>
      )}

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-xs font-semibold">
        {[
          { key: 'education', label: `Обучение (${student.attendanceStats.attendanceRate})` },
          ...(role !== 'teacher' ? [{ key: 'finance', label: `${t('students.tabFinance', 'Оплаты и баланс')}` }] : []),
          { key: 'profile', label: `${t('students.tabFamily', 'Семья и контакты')}` },
          { key: 'tasks', label: `${t('nav.tasks', 'Задачи')} (${student.tasks.filter((t) => t.status === 'open').length})` },
          { key: 'timeline', label: `Timeline (${student.interactions.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key as any);
              window.history.replaceState(null, '', `/students/${studentId}?tab=${tab.key}`);
            }}
            className={cn(
              'pb-3 px-3 border-b-2 whitespace-nowrap transition-all',
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: ПРОФИЛЬ И СЕМЬЯ (M:N СВЯЗЬ С РОДИТЕЛЯМИ) */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Parents List (One or Multiple Parents) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  Родители и контактные лица ({student.parents.length})
                </h3>
                <button className="text-xs font-semibold text-blue-600 hover:underline">
                  + Привязать родителя
                </button>
              </div>

              <div className="space-y-3">
                {student.parents.map((parent) => (
                  <div
                    key={parent.id}
                    onClick={() => setSelectedParentForModal(parent)}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 cursor-pointer hover:border-blue-400 hover:bg-white hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                          {parent.firstName} {parent.lastName}
                        </span>
                        <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {parent.relationshipType}
                        </span>
                        {parent.isPrimary && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                            Основной контакт
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/parents/${parent.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                          title="Открыть полный семейный профиль родителя"
                        >
                          Семейный профиль →
                        </Link>
                        <span className="text-xs text-blue-600 font-semibold group-hover:underline flex items-center gap-1">
                          Детали <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>

                    {role !== 'teacher' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <a href={`tel:${parent.phone}`} className="hover:text-blue-600 font-medium">{parent.phone}</a>
                        </div>
                        {parent.telegram && (
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                            <span className="font-medium text-blue-600">{parent.telegram}</span>
                          </div>
                        )}
                        {parent.whatsapp && (
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="font-medium text-emerald-600">{parent.whatsapp}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                        Контакты родителей скрыты в соответствии с политикой доступа преподавателя
                      </div>
                    )}

                    {parent.notes && (
                      <p className="text-[11px] text-slate-500 border-t border-slate-200/60 pt-2">
                        💡 {parent.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Summary Column */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Системные данные</h3>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">ID ученика:</span>
                  <span className="font-mono text-[11px] text-slate-500">{student.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Дата создания:</span>
                  <span>{new Date(student.createdAt).toLocaleDateString('ru-RU')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ответственный:</span>
                  <span className="font-semibold text-slate-800">Елена Менеджер</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: ЕДИНАЯ МОНОЛИТНАЯ ВКЛАДКА «ОБУЧЕНИЕ» */}
      {activeTab === 'education' && (
        <div className="space-y-6">
          {/* БЛОК 1: ВЕРХНЯЯ ПАНЕЛЬ КУРСОВ (ДВУХКОЛОНОЧНАЯ СЕТКА) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Текущие зачисления и группы</h3>
                <p className="text-xs text-slate-500">Ученик может параллельно обучаться на нескольких предметах</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEnrollGroupModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Зачислить в группу
              </button>
            </div>

            {student.groups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">Ученик пока не зачислен ни в одну группу</p>
                <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Выберите группу для начала посещения занятий</p>
                <button
                  type="button"
                  onClick={() => setIsEnrollGroupModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Зачислить в группу
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {student.groups.map((grp) => (
                  <div key={grp.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">{grp.courseName}</span>
                          <h4 className="text-base font-bold text-slate-900 mt-0.5">
                            <Link href={`/groups/${grp.id}`} className="hover:text-blue-600 hover:underline transition-colors">
                              {grp.name}
                            </Link>
                          </h4>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                          Активна
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Преподаватель:</span>
                          <Link
                            href={`/teachers/${(grp as any).teacherId || '1'}`}
                            className="font-semibold text-slate-800 hover:text-blue-600 hover:underline transition-colors"
                          >
                            {grp.teacherName}
                          </Link>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Расписание:</span>
                          <span className="font-medium text-slate-800">{grp.schedule}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Дата зачисления:</span>
                          <span>{grp.joinedAt}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleRemoveGroup(grp.id, grp.name)}
                        className="text-xs text-red-500 hover:text-red-700 hover:underline transition-colors"
                      >
                        Исключить из группы
                      </button>
                      <Link href={`/groups/${grp.id}?tab=journal`} className="text-xs font-semibold text-blue-600 hover:underline">
                        Журнал группы →
                      </Link>
                    </div>
                  </div>
                ))}

                {/* If student is enrolled in only 1 group, fill 2nd column with invitation to enroll in 2nd course */}
                {student.groups.length === 1 && (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-5 flex flex-col items-center justify-center text-center space-y-3 min-h-[190px] hover:border-blue-300 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Plus className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Второй курс не выбран</h4>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-[220px]">
                        Ученик посещает 1 курс. Можно зачислить во вторую группу для параллельного обучения.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEnrollGroupModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors shadow-xs"
                    >
                      + Зачислить на 2-й курс
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* БЛОК 2: СВОДНЫЕ KPI ПОСЕЩАЕМОСТИ */}
          {(() => {
            const rawRate = parseInt(student.attendanceStats.attendanceRate) || 0;
            const rateBadgeColor =
              rawRate >= 90
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                : rawRate >= 70
                ? 'text-amber-700 bg-amber-50 border-amber-200'
                : 'text-rose-700 bg-rose-50 border-rose-200';

            return (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className={cn('rounded-2xl border p-4 shadow-xs', rateBadgeColor)}>
                  <span className="text-xs font-semibold text-slate-600">Процент посещаемости:</span>
                  <p className="text-2xl font-extrabold mt-1">{student.attendanceStats.attendanceRate}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <span className="text-xs text-slate-400">Всего уроков:</span>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">{student.attendanceStats.totalLessons}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <span className="text-xs text-slate-400">Присутствовал:</span>
                  <p className="text-2xl font-extrabold text-blue-600 mt-1">{student.attendanceStats.presentCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <span className="text-xs text-slate-400">Пропущено:</span>
                  <p className="text-2xl font-extrabold text-rose-600 mt-1">{student.attendanceStats.absentCount}</p>
                </div>
              </div>
            );
          })()}

          {/* БЛОК 3: ФОРМА ДОБАВЛЕНИЯ КОММЕНТАРИЯ ПРЕПОДАВАТЕЛЯ */}
          <div className="rounded-2xl border border-purple-200/80 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MessageSquarePlus className="h-4 w-4 text-purple-600" />
                Оставить отзыв или комментарий преподавателя
              </h3>
            </div>

            <form onSubmit={handleAddTeacherComment} className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-slate-600 font-medium block mb-1">Группа / предмет:</label>
                  <select
                    value={newTeacherCommentGroup}
                    onChange={(e) => setNewTeacherCommentGroup(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-400"
                  >
                    {student.groups.map((g) => (
                      <option key={g.id} value={g.name}>{g.name} ({g.courseName})</option>
                    ))}
                    <option value="Индивидуальное занятие">Индивидуальное занятие</option>
                    <option value="Общий комментарий">Общий комментарий</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 font-medium block mb-1">Категория отзыва:</label>
                  <select
                    value={newTeacherCommentCategory}
                    onChange={(e) => setNewTeacherCommentCategory(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-400"
                  >
                    <option value="progress">🌟 Успеваемость и прогресс</option>
                    <option value="homework">📚 Домашнее задание</option>
                    <option value="behavior">⚡ Поведение и дисциплина</option>
                    <option value="general">💬 Общий комментарий</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 font-medium block mb-1">Тема урока (необязательно):</label>
                  <input
                    type="text"
                    value={newTeacherCommentTopic}
                    onChange={(e) => setNewTeacherCommentTopic(e.target.value)}
                    placeholder="Например: Past Simple vs Present Perfect"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-400"
                  />
                </div>
              </div>

              <textarea
                rows={2}
                value={newTeacherCommentText}
                onChange={(e) => setNewTeacherCommentText(e.target.value)}
                placeholder="Напишите комментарий об ученике (активность на уроке, пробелы, рекомендации)..."
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 leading-relaxed"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-slate-500">
                  Автор отзыва: <strong>{userName || 'Преподаватель'}</strong>
                </span>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                  Сохранить и отправить в Timeline
                </button>
              </div>
            </form>
          </div>

          {/* БЛОК 4: ЕДИНАЯ ЛЕНТА ЗАНЯТИЙ И ОТЗЫВОВ */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden space-y-0">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                История проведенных занятий и отзывов ({student.attendanceStats.history.length})
              </h4>
              <span className="text-[11px] text-slate-400">От новых к более старым</span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {student.attendanceStats.history.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  История проведенных занятий пока отсутствует
                </div>
              ) : (
                student.attendanceStats.history.map((item, idx) => {
                  // Find matching teacher feedback for this lesson/date/group
                  const matchingComments = (student.teacherComments || []).filter((tc) => {
                    const tcDate = tc.date ? tc.date.split(',')[0].trim() : '';
                    const itemDate = item.date ? item.date.trim() : '';
                    return (
                      (tc.groupName && item.groupName && tc.groupName.toLowerCase() === item.groupName.toLowerCase()) ||
                      (tcDate && itemDate && tcDate === itemDate) ||
                      (tc.lessonTopic && item.topic && tc.lessonTopic.toLowerCase() === item.topic.toLowerCase())
                    );
                  });

                  return (
                    <div key={idx} className="p-4 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{item.date}</span>
                            <span className="text-slate-400">•</span>
                            <span className="font-semibold text-blue-600">{item.groupName}</span>
                          </div>
                          <p className="text-slate-600">{item.topic || 'Занятие по расписанию'}</p>
                          {item.notes && <p className="text-[11px] text-amber-600">Причина: {item.notes}</p>}
                        </div>

                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 font-bold text-[11px]',
                            item.status === 'present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'rescheduled'
                              ? 'bg-purple-100 text-purple-800'
                              : item.status === 'cancelled'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-rose-100 text-rose-800'
                          )}
                        >
                          {item.status === 'present'
                            ? 'Был'
                            : item.status === 'rescheduled'
                            ? 'Перенос'
                            : item.status === 'cancelled'
                            ? 'Отменено'
                            : 'Пропуск'}
                        </span>
                      </div>

                      {/* NESTED TEACHER COMMENTS (if any) */}
                      {matchingComments.length > 0 && (
                        <div className="mt-2 rounded-xl border border-purple-100 bg-purple-50/50 p-3 text-xs space-y-2">
                          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                            💬 Отзыв преподавателя к этому уроку:
                          </span>
                          {matchingComments.map((comment) => (
                            <div key={comment.id} className="space-y-1 border-t border-purple-100/60 pt-1.5 first:border-0 first:pt-0">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-slate-900">{comment.author}</span>
                                <span className="text-slate-400">{comment.date}</span>
                              </div>
                              <p className="text-slate-700 italic">«{comment.content}»</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ОПЛАТЫ И БАЛАНС (СТРОГО ДЛЯ DEVELOPER / OWNER / ADMIN) */}
      {activeTab === 'finance' && ['developer', 'owner', 'admin'].includes(role) && (
        <div className="space-y-6">
          {/* БЛОК 1: ВЕРХНЯЯ ПАНЕЛЬ СТАТУСА (ДВУХКОЛОНОЧНАЯ СЕТКА) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Левая колонка — Абонементы по курсам */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Абонементы по курсам ({student.groups.length > 0 ? student.groups.length : 1})
              </span>
              {student.groups.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-700">Ученик не зачислен в группы</p>
                  <p className="text-[11px]">Абонементы формируются при зачислении в активную группу</p>
                </div>
              ) : (
                student.groups.map((grp) => (
                  <div key={grp.id} className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/80 to-indigo-50/40 p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                          {grp.courseName || 'Курс обучения'}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 mt-0.5">{grp.name}</h4>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                        Активен
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs border-t border-blue-200/60 pt-3">
                      <div>
                        <span className="text-slate-500 block">Период:</span>
                        <span className="font-semibold text-slate-800">Сентябрь 2026</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Пройдено / Всего:</span>
                        <span className="font-bold text-slate-900">6 / 8 уроков</span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-500 block">Продление:</span>
                        <span className="font-bold text-blue-700">28.09.2026</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Правая колонка — Лицевой счет (Депозит) */}
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 to-teal-50/40 p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                    Лицевой счет (Депозит)
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                    Базовый EUR (€)
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-slate-900">
                    {(student.finance?.deposit?.balance || 120).toLocaleString('ru-RU')} €
                  </h3>
                  <span className="text-sm font-semibold text-slate-500">
                    (~{((student.finance?.deposit?.balance || 120) * 100).toLocaleString('ru-RU')} ₽)
                  </span>
                </div>

                {/* Per-lesson rate with inline edit */}
                <div className="rounded-xl border border-emerald-200/80 bg-white/80 p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Ставка за занятие (Руководитель):</span>
                    {!isEditingPricePerLesson && (
                      <button
                        type="button"
                        onClick={() => {
                          setTempPricePerLesson(String(customPricePerLesson));
                          setIsEditingPricePerLesson(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-[11px] font-bold flex items-center gap-1 hover:underline"
                        title="Изменить персональную ставку за урок"
                      >
                        <Edit className="h-3 w-3" /> Изменить
                      </button>
                    )}
                  </div>

                  {isEditingPricePerLesson ? (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="number"
                        value={tempPricePerLesson}
                        onChange={(e) => setTempPricePerLesson(e.target.value)}
                        className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Ставка €"
                      />
                      <span className="text-slate-600 font-bold">€</span>
                      <button
                        type="button"
                        onClick={handleSavePricePerLesson}
                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                      >
                        Сохранить
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingPricePerLesson(false)}
                        className="rounded-lg bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-300 transition-colors"
                      >
                        Отмена
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="font-extrabold text-slate-900 text-sm">
                        {customPricePerLesson} € <span className="text-slate-400 text-xs font-normal">(~{customPricePerLesson * 100} ₽)</span>
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700">
                        Остаток: {Math.max(0, Math.floor((student.finance?.deposit?.balance || 120) / customPricePerLesson))} уроков
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Пополнить депозит
                </button>
              </div>
            </div>
          </div>

          {/* БЛОК 2: ПАНЕЛЬ ДЕЙСТВИЙ ВЫПИСКИ */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-200">
            {/* Быстрые фильтры */}
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <span className="text-slate-400 mr-1 text-[11px]">Фильтр:</span>
              <button
                type="button"
                onClick={() => setLedgerFilter('all')}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs transition-all font-semibold',
                  ledgerFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Все операции
              </button>
              <button
                type="button"
                onClick={() => setLedgerFilter('deposits')}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs transition-all font-semibold',
                  ledgerFilter === 'deposits'
                    ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Только пополнения
              </button>
              <button
                type="button"
                onClick={() => setLedgerFilter('deductions')}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs transition-all font-semibold',
                  ledgerFilter === 'deductions'
                    ? 'bg-white text-rose-700 shadow-xs border border-rose-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Только списания
              </button>
            </div>

            {/* Группа кнопок действий */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenEmailStatementModal}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                title="Отправить выписку представителю на email"
              >
                <Mail className="h-3.5 w-3.5 text-blue-600" />
                ✉ Отправить выписку на email
              </button>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                + Внести платёж
              </button>
            </div>
          </div>

          {/* БЛОК 3: ЕДИНАЯ ФИНАНСОВАЯ ВЫПИСКА (LEDGER) */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Единая финансовая выписка (Движение средств)
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">Валюта: EUR (€)</span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="py-3 pl-4 pr-3">Дата и время</th>
                  <th className="px-3 py-3">Назначение / Операция</th>
                  <th className="px-3 py-3">Способ / Источник</th>
                  <th className="px-3 py-3 text-right">Сумма</th>
                  <th className="py-3 pl-3 pr-4 text-right">Остаток</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {(() => {
                  const ledgerItems = buildChronologicalLedger(student, customPricePerLesson);

                  const filtered = ledgerItems.filter((ev) => {
                    if (ledgerFilter === 'deposits') return ev.type === 'deposit';
                    if (ledgerFilter === 'deductions') return ev.type === 'deduction';
                    return true;
                  });

                  return filtered.map((ev) => {
                    const isPlus = ev.type === 'deposit';
                    const displayAmtEUR = isPlus ? `+${ev.amountEUR} €` : `-${ev.amountEUR} €`;
                    const displayAmtRUB = `(~${(ev.amountEUR * 100).toLocaleString('ru-RU')} ₽)`;

                    return (
                      <tr key={ev.id} className="hover:bg-slate-50/70">
                        <td className="py-3 pl-4 pr-3 font-semibold text-slate-900 whitespace-nowrap">{ev.date}</td>
                        <td className="px-3 py-3 font-medium text-slate-800">{ev.description}</td>
                        <td className="px-3 py-3 text-slate-500 whitespace-nowrap">
                          {ev.type === 'deduction' ? (
                            <span className="rounded-md bg-purple-50 text-purple-700 px-2 py-0.5 text-[10px] font-semibold border border-purple-100">
                              ⚡ {ev.method}
                            </span>
                          ) : (
                            <span className="rounded-md bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold border border-emerald-100">
                              💳 {ev.method}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-bold whitespace-nowrap">
                          <span className={isPlus ? 'text-emerald-600' : 'text-slate-700'}>
                            {displayAmtEUR}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal block">{displayAmtRUB}</span>
                        </td>
                        <td className="py-3 pl-3 pr-4 text-right font-semibold text-slate-800 whitespace-nowrap">
                          {ev.runningBalanceEUR} €
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: TIMELINE ВЗАИМОДЕЙСТВИЙ (SECTION 13 UX) */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          {/* Add Interaction Form */}
          <form onSubmit={handleAddInteraction} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Добавить действие / контакт с учеником или семьей</h4>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>С кем действие:</span>
                <select
                  value={interactionTarget}
                  onChange={(e) => setInteractionTarget(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800"
                >
                  <option value="student">С учеником ({student.firstName} {student.lastName})</option>
                  {student.parents.map((p) => (
                    <option key={p.id} value={`parent_${p.id}`}>
                      С родителем: {p.firstName} {p.lastName} ({p.relationshipType || 'Родитель'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>Канал:</span>
                <select
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value as 'telegram' | 'whatsapp' | 'phone' | 'call')}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800"
                >
                  <option value="telegram">Telegram</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="phone">Телефонный звонок</option>
                  <option value="call">Онлайн-встреча (Zoom / Meet)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 min-w-[210px]">
                <DatePicker
                  label="Дата следующего действия (Follow-up)"
                  value={newFollowUpDate}
                  onChange={(iso) => setNewFollowUpDate(iso)}
                  placeholder="Выберите дату"
                />
              </div>
            </div>

            <textarea
              rows={2}
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="О чем общались? Какой результат или договоренность достигнута..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
                Сохранить действие в Timeline
              </button>
            </div>
          </form>

          {/* Timeline Feed Controls & Filters */}
          <div className="space-y-4">
            {/* Filter Chips Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'Все события' },
                { id: 'communication', label: '💬 Общение и звонки' },
                { id: 'tasks', label: '✓ Задачи' },
                { id: 'finance', label: '💳 Оплаты' },
                { id: 'lead', label: '⚡ История лида' },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setTimelineFilter(chip.id as any)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
                    timelineFilter === chip.id
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {(() => {
              const allTimelineItems = getCombinedStudentTimeline(
                student.id,
                student.interactions,
                (student.parents || []).map((p) => p.id)
              );

              const filteredItems = allTimelineItems.filter((int) => {
                if (timelineFilter === 'all') return true;
                const { category } = getTimelineCategoryAndIcon(int);
                return category === timelineFilter;
              });

              if (filteredItems.length === 0) {
                return (
                  <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                    <Filter className="h-8 w-8 mx-auto mb-2 text-slate-300 stroke-1" />
                    В выбранной категории событий пока нет
                  </div>
                );
              }

              return filteredItems.map((int) => {
                const target = getInteractionTargetInfo(int, student);
                const { icon: ItemIcon, iconBg, badgeBg, channelLabel } = getTimelineCategoryAndIcon(int);
                const isParentAction = target.role === 'parent';
                const isLeadAction = target.role === 'lead';

                return (
                  <div key={int.id} className="relative flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-colors">
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold shadow-xs', iconBg)}>
                      <ItemIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between flex-wrap gap-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{int.author}</span>
                          <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] inline-flex items-center gap-1', badgeBg)}>
                            {channelLabel}
                          </span>

                          {isLeadAction ? (
                            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-800 border border-indigo-200 flex items-center gap-1">
                              <span className="font-bold">Лид:</span>
                              <span>{target.name}</span>
                            </span>
                          ) : isParentAction ? (
                            <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-medium text-purple-800 border border-purple-200 flex items-center gap-1">
                              <span className="font-bold">{target.roleLabel}:</span>
                              <span>{target.name}</span>
                            </span>
                          ) : (
                            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-800 border border-blue-200 flex items-center gap-1">
                              <span className="font-bold">Ученик:</span>
                              <span>{target.name}</span>
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 font-medium">{int.occurredAt}</span>
                      </div>
                      <p className="text-xs text-slate-700 pt-1 leading-relaxed">{int.content}</p>

                      {int.result && (
                        <p className="text-[11px] text-emerald-700 font-medium pt-1">
                          Результат: {int.result}
                        </p>
                      )}

                      {int.nextAction && (
                        <div className="mt-2 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-900 border border-amber-200/60 font-medium">
                          → Следующее действие: {int.nextAction}
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* TAB 6: ЗАДАЧИ */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Задачи по ученику и семье</h3>
              <p className="text-xs text-slate-500">Управление оперативными задачами и фиксация результатов</p>
            </div>
          </div>

          {(() => {
            const allTasks = student.tasks || [];
            const activeTasks = allTasks.filter((t) => t.status !== 'done');
            const completedTasks = allTasks.filter((t) => t.status === 'done');

            return (
              <div className="space-y-3">
                {/* Active Tasks List */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-xs divide-y divide-slate-100 overflow-hidden">
                  {activeTasks.length === 0 ? (
                    <div className="p-8 text-center space-y-3">
                      <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 stroke-1" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">Нет активных задач по ученику</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Все текущие поручения и напоминания выполнены</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCreateTaskModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Создать задачу
                      </button>
                    </div>
                  ) : (
                    activeTasks.map((task) => {
                      const overdueDays = getOverdueDays(task.dueDate);
                      const isOverdue = overdueDays > 0;

                      return (
                        <div
                          key={task.id}
                          onClick={() => {
                            setSelectedTaskForModal(task);
                            setTaskModalTab('details');
                            setRescheduleNewDate(task.dueDate || '');
                            setTaskOutcomeComment('');
                            setRescheduleReason('');
                          }}
                          className={cn(
                            'p-4 flex items-center justify-between transition-colors cursor-pointer group',
                            isOverdue ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-slate-50'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleTask(task.id);
                              }}
                              className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors"
                              title="Отметить как выполненную"
                            >
                              <div className="h-4 w-4 rounded border-2 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50" />
                            </button>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                                  {task.title}
                                </h4>
                                {isOverdue && (
                                  <span className="rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold border border-rose-200 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Просрочено на {overdueDays} дн.
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                                <span>
                                  Срок:{' '}
                                  <strong className={cn(isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700')}>
                                    {task.dueDate}
                                  </strong>
                                </span>
                                <span>•</span>
                                <span>Ответственный: <strong>{task.assignedTo}</strong></span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <span className={cn(
                              'rounded-full px-2.5 py-0.5 text-[10px] font-semibold border',
                              task.priority === 'high'
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : task.priority === 'medium'
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            )}>
                              {task.priority === 'high' ? 'Срочно' : task.priority === 'medium' ? 'Средний' : 'Низкий'}
                            </span>
                            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Collapsible Completed Tasks Spoiler */}
                {completedTasks.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                      className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-600 hover:bg-slate-100/70 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>Показать выполненные задачи ({completedTasks.length})</span>
                      </div>
                      <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform duration-200', showCompletedTasks && 'rotate-180')} />
                    </button>

                    {showCompletedTasks && (
                      <div className="divide-y divide-slate-200/60 border-t border-slate-200/60 bg-white">
                        {completedTasks.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => {
                              setSelectedTaskForModal(task);
                              setTaskModalTab('details');
                              setRescheduleNewDate(task.dueDate || '');
                              setTaskOutcomeComment('');
                              setRescheduleReason('');
                            }}
                            className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group opacity-85 hover:opacity-100"
                          >
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleTask(task.id);
                                }}
                                className="mt-0.5 text-emerald-500 hover:text-slate-400 transition-colors cursor-pointer"
                                title="Вернуть в работу"
                              >
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              </button>
                              <div>
                                <h4 className="text-sm font-medium text-slate-500 line-through">
                                  {task.title}
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Выполнил: <strong>{task.completedBy || task.assignedTo}</strong> · {task.completedAt ? new Date(task.completedAt).toLocaleDateString('ru-RU') : 'Ранее'}
                                </p>
                                {task.result && (
                                  <p className="text-xs text-slate-600 font-normal italic mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    💬 Результат: "{task.result}"
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 text-[10px] font-semibold border border-emerald-200">
                              Выполнено
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* CREATE TASK MODAL DIALOG */}
      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        onCreated={handleTaskCreated}
        defaultStudentId={student.id}
        studentScope={{
          id: student.id,
          name: `${student.firstName} ${student.lastName}`.trim(),
          parents: student.parents,
        }}
      />

      {/* EDIT STUDENT MODAL DIALOG */}
      {isEditStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Edit className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Изменение данных ученика</h3>
                  <p className="text-xs text-slate-500">Редактирование профиля, контактов и статуса</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditStudentModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStudentEdit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Имя</label>
                  <input
                    type="text"
                    value={editStudentForm.firstName}
                    onChange={(e) => setEditStudentForm({ ...editStudentForm, firstName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Фамилия</label>
                  <input
                    type="text"
                    value={editStudentForm.lastName}
                    onChange={(e) => setEditStudentForm({ ...editStudentForm, lastName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Статус обучения</label>
                  <select
                    value={editStudentForm.status}
                    onChange={(e) => setEditStudentForm({ ...editStudentForm, status: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden bg-white"
                  >
                    <option value="active">Активен</option>
                    <option value="trial">Пробный</option>
                    <option value="paused">На паузе</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Дата рождения</label>
                  <input
                    type="text"
                    value={editStudentForm.birthDate}
                    onChange={(e) => setEditStudentForm({ ...editStudentForm, birthDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    placeholder="15.03.2012"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Класс (школьный)</label>
                  <input
                    type="text"
                    value={editStudentForm.grade}
                    onChange={(e) => setEditStudentForm({ ...editStudentForm, grade: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    placeholder="8 класс"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Телефон ученика</label>
                  <input
                    type="text"
                    value={editStudentForm.phone}
                    onChange={(e) => setEditStudentForm({ ...editStudentForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    placeholder="+7 (999) 000-00-00"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Telegram</label>
                  <input
                    type="text"
                    value={editStudentForm.telegram}
                    onChange={(e) => setEditStudentForm({ ...editStudentForm, telegram: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    placeholder="@username"
                  />
                </div>
              </div>

              {/* Multi-Group Enrollment in Edit Modal */}
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-slate-700 text-xs">
                    Учебные группы ({editStudentForm.groups.length})
                  </label>
                  <span className="text-[11px] text-slate-500">Мульти-группы (обучение в 2+ группах)</span>
                </div>

                {editStudentForm.groups.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Не состоит ни в одной группе (выберите ниже)</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {editStudentForm.groups.map((grp) => (
                      <div
                        key={grp.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200 shadow-xs"
                      >
                        <span className="truncate max-w-[220px]" title={grp.name}>
                          {grp.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditStudentForm({
                              ...editStudentForm,
                              groups: editStudentForm.groups.filter((g) => g.id !== grp.id),
                            });
                          }}
                          className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-red-500 transition-colors"
                          title="Удалить из этой группы"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-1">
                  <select
                    value=""
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId) return;
                      const grpToAdd = INITIAL_GROUPS.find((g) => g.id === selectedId);
                      if (grpToAdd && !editStudentForm.groups.some((g) => g.id === grpToAdd.id)) {
                        setEditStudentForm({
                          ...editStudentForm,
                          groups: [
                            ...editStudentForm.groups,
                            {
                              id: grpToAdd.id,
                              name: grpToAdd.name,
                              courseName: grpToAdd.courseName,
                              teacherName: grpToAdd.teacherName,
                              schedule: grpToAdd.schedule,
                              status: 'active',
                              joinedAt: new Date().toLocaleDateString('ru-RU'),
                            },
                          ],
                        });
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden bg-white text-slate-700"
                  >
                    <option value="">+ Добавить ученика в группу...</option>
                    {INITIAL_GROUPS.filter((g) => !editStudentForm.groups.some((eg) => eg.id === g.id)).map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} — {g.teacherName} ({g.schedule})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Заметки и особенности ученика</label>
                <textarea
                  rows={3}
                  value={editStudentForm.notes}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden resize-none"
                  placeholder="Особенности восприятия, интересы, цели обучения, рекомендации..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditStudentModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                  Сохранить изменения
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ENROLL IN GROUP MODAL */}
      {isEnrollGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  Зачисление в группу
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ученик: <span className="font-semibold text-slate-700">{student.firstName} {student.lastName}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEnrollGroupModalOpen(false);
                  setSelectedGroupIdToEnroll('');
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3.5 space-y-3">
              <div className="rounded-xl bg-blue-50/70 border border-blue-200/60 p-3 text-xs text-blue-800">
                <p className="font-semibold mb-0.5">Мульти-групповое обучение:</p>
                <p className="text-[11px] text-blue-700/90 leading-relaxed">
                  Ученик может одновременно обучаться в двух и более группах (например, грамматика и разговорный клуб).
                </p>
                {student.groups.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-blue-200/60">
                    <span className="text-[11px] font-semibold text-blue-900">Текущие группы:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {student.groups.map((g) => (
                        <span key={g.id} className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-blue-800 border border-blue-200">
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Выберите группу для зачисления:
                </label>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {INITIAL_GROUPS.map((grp) => {
                    const isAlreadyEnrolled = student.groups.some(
                      (g) => g.id === grp.id || g.name === grp.name
                    );
                    const isSelected = selectedGroupIdToEnroll === grp.id;

                    return (
                      <div
                        key={grp.id}
                        onClick={() => {
                          if (!isAlreadyEnrolled) {
                            setSelectedGroupIdToEnroll(grp.id);
                          }
                        }}
                        className={cn(
                          'rounded-xl border p-3 text-xs transition-all cursor-pointer flex items-start gap-3',
                          isAlreadyEnrolled
                            ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500 shadow-xs'
                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/50'
                        )}
                      >
                        <input
                          type="radio"
                          name="group_enroll"
                          checked={isSelected}
                          disabled={isAlreadyEnrolled}
                          onChange={() => setSelectedGroupIdToEnroll(grp.id)}
                          className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-slate-900 truncate">{grp.name}</p>
                            {isAlreadyEnrolled ? (
                              <span className="shrink-0 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                Уже зачислен
                              </span>
                            ) : (
                              <span className="shrink-0 text-[11px] font-medium text-slate-500">
                                {(grp.students || []).length} / {grp.capacity} мест
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Преподаватель: <span className="text-slate-700 font-medium">{grp.teacherName}</span>
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600">
                            <span className="inline-flex items-center gap-1 font-medium text-blue-700">
                              <Calendar className="h-3 w-3" />
                              {grp.schedule}
                            </span>
                            <span>•</span>
                            <span className="text-slate-500">{grp.room}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsEnrollGroupModalOpen(false);
                  setSelectedGroupIdToEnroll('');
                }}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={!selectedGroupIdToEnroll}
                onClick={() => handleEnrollGroup(selectedGroupIdToEnroll)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                Зачислить в группу
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PARENT DETAILS MODAL (Opens on clicking parent card) */}
      {selectedParentForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold text-base">
                  {selectedParentForModal.firstName[0]}{selectedParentForModal.lastName ? selectedParentForModal.lastName[0] : ''}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {selectedParentForModal.firstName} {selectedParentForModal.lastName}
                  </h3>
                  <p className="text-xs text-slate-500">{selectedParentForModal.relationshipType || 'Родитель'} ученика {student.firstName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedParentForModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Телефон:</span>
                  <a href={`tel:${selectedParentForModal.phone}`} className="font-bold text-blue-600 hover:underline">
                    {selectedParentForModal.phone || 'Не указан'}
                  </a>
                </div>
                {selectedParentForModal.telegram && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Telegram:</span>
                    <span className="font-medium text-blue-600">{selectedParentForModal.telegram}</span>
                  </div>
                )}
                {selectedParentForModal.whatsapp && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">WhatsApp:</span>
                    <span className="font-medium text-emerald-600">{selectedParentForModal.whatsapp}</span>
                  </div>
                )}
                {selectedParentForModal.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Email:</span>
                    <span className="font-medium text-slate-700">{selectedParentForModal.email}</span>
                  </div>
                )}
                {selectedParentForModal.isPrimary && (
                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                    <span className="text-slate-500">Статус контакта:</span>
                    <span className="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full text-[10px]">
                      Основной плательщик
                    </span>
                  </div>
                )}
              </div>

              {selectedParentForModal.notes && (
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/60 text-amber-900">
                  <span className="font-bold text-[11px] block mb-0.5">Заметки о семье:</span>
                  <p className="text-[11px]">{selectedParentForModal.notes}</p>
                </div>
              )}

              {/* Quick contact actions */}
              <div className="flex gap-2 pt-1">
                {selectedParentForModal.phone && (
                  <a
                    href={`tel:${selectedParentForModal.phone}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Позвонить
                  </a>
                )}
                {selectedParentForModal.whatsapp && (
                  <a
                    href={`https://wa.me/${selectedParentForModal.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <Link
                  href={`/parents/${selectedParentForModal.id}`}
                  onClick={() => setSelectedParentForModal(null)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Открыть полную карточку семьи →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TASK DETAILS MODAL */}
      {selectedTaskForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] font-bold border',
                  selectedTaskForModal.priority === 'high'
                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                    : selectedTaskForModal.priority === 'medium'
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                )}>
                  {selectedTaskForModal.priority === 'high' ? 'Срочно' : selectedTaskForModal.priority === 'medium' ? 'Средний' : 'Низкий'}
                </span>
                <span className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] font-bold border',
                  selectedTaskForModal.status === 'done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                )}>
                  {selectedTaskForModal.status === 'done' ? 'Выполнена' : 'В работе'}
                </span>
                {selectedTaskForModal.status !== 'done' && getOverdueDays(selectedTaskForModal.dueDate) > 0 && (
                  <span className="rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold border border-rose-200 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Просрочено на {getOverdueDays(selectedTaskForModal.dueDate)} дн.
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskForModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Task Content */}
            <div className="mt-4 space-y-3.5 text-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedTaskForModal.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Ученик: {student.firstName} {student.lastName}</p>
              </div>

              {/* Navigation Tabs in Modal */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setTaskModalTab('details')}
                  className={cn(
                    'px-3 py-2 text-xs font-semibold border-b-2 transition-colors',
                    taskModalTab === 'details'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  )}
                >
                  Информация / Результат
                </button>
                <button
                  type="button"
                  onClick={() => setTaskModalTab('reschedule')}
                  className={cn(
                    'px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1',
                    taskModalTab === 'reschedule'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  )}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Перенести срок
                </button>
              </div>

              {/* TAB CONTENT: DETAILS & OUTCOME */}
              {taskModalTab === 'details' && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Срок выполнения:</span>
                      <span className={cn('font-bold', getOverdueDays(selectedTaskForModal.dueDate) > 0 && selectedTaskForModal.status !== 'done' ? 'text-rose-600' : 'text-slate-800')}>
                        {selectedTaskForModal.dueDate}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ответственный:</span>
                      <span className="font-semibold text-slate-800">{selectedTaskForModal.assignedTo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Тип задачи:</span>
                      <span className="font-medium text-slate-700">{selectedTaskForModal.taskType || 'Звонок / Согласование'}</span>
                    </div>

                    {/* Task Description Display */}
                    {selectedTaskForModal.description && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-slate-700 block mb-0.5 font-semibold">Описание задачи:</span>
                        <p className="text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200 font-normal leading-relaxed text-xs">
                          {selectedTaskForModal.description}
                        </p>
                      </div>
                    )}

                    {/* Reschedule History Display */}
                    {selectedTaskForModal.rescheduledReason && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-amber-800 block mb-0.5 font-semibold text-xs flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-amber-600" />
                          История переноса срока:
                        </span>
                        <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-amber-900 text-xs">
                          Перенесено. Причина: «{selectedTaskForModal.rescheduledReason}»
                        </div>
                      </div>
                    )}

                    {selectedTaskForModal.result && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-slate-700 block mb-0.5 font-semibold">Зафиксированный результат:</span>
                        <p className="text-slate-800 bg-white p-2 rounded-lg border border-slate-200 font-normal">
                          {selectedTaskForModal.result}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Outcome Input Section */}
                  {selectedTaskForModal.status !== 'done' && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <label className="block font-semibold text-slate-700 text-xs">
                        Завершить с результатом (комментарий):
                      </label>
                      <textarea
                        rows={3}
                        value={taskOutcomeComment}
                        onChange={(e) => setTaskOutcomeComment(e.target.value)}
                        placeholder="Опишите результат выполнения (например: «Родитель подтвердил оплату», «Дозвонились, перенесли урок»)..."
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-blue-500 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleCompleteTaskWithOutcome(selectedTaskForModal.id, taskOutcomeComment)}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Завершить с результатом
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        handleToggleTask(selectedTaskForModal.id);
                        setSelectedTaskForModal(null);
                      }}
                      className={cn(
                        'w-full inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-colors',
                        selectedTaskForModal.status === 'done'
                          ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          : 'border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      )}
                    >
                      {selectedTaskForModal.status === 'done' ? 'Вернуть в работу' : 'Быстрое закрытие без результата'}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: RESCHEDULE */}
              {taskModalTab === 'reschedule' && (
                <div className="space-y-3">
                  <DatePicker
                    label="Новый срок выполнения"
                    value={rescheduleNewDate}
                    onChange={(iso) => setRescheduleNewDate(iso)}
                    required
                  />

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Причина переноса срока <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      placeholder="Укажите причину переноса (например: «Родитель просил перезвонить на следующей неделе»)..."
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-blue-500 focus:outline-hidden"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setTaskModalTab('details')}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRescheduleTask(selectedTaskForModal.id, rescheduleNewDate, rescheduleReason)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs"
                    >
                      Сохранить новый срок
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONVERT TO ADULT STUDENT MODAL */}
      {isConvertAdultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Конвертация в студента</h3>
                  <p className="text-xs text-slate-500">Переход на самостоятельное обучение с сохранением семьи</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConvertAdultModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConvertToAdult} className="mt-4 space-y-4 text-xs">
              {/* Inheritance Explanation Banner */}
              <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-3.5 text-purple-900 space-y-2">
                <div className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
                  <span>Наследование и сохранение данных семьи:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-purple-800">
                  <li>
                    Контакты родителей ({student.parents.length > 0 ? student.parents.map((p) => `${p.firstName} ${p.lastName}`).join(', ') : 'не указаны'}) <strong>сохраняются в карточке</strong> как доверенные лица семьи.
                  </li>
                  <li>
                    Студент становится <strong>основным контактным лицом</strong> и плательщиком по расписанию и счетам.
                  </li>
                  <li>
                    В таймлайн и историю будет внесено системное событие о переходе в статус студента.
                  </li>
                </ul>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">
                    Прямой телефон студента (для звонков и счетов) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={studentDirectPhone}
                    onChange={(e) => setStudentDirectPhone(e.target.value)}
                    placeholder="+7 (999) 000-00-00"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block">
                    Telegram / Мессенджер студента
                  </label>
                  <input
                    type="text"
                    value={studentDirectTelegram}
                    onChange={(e) => setStudentDirectTelegram(e.target.value)}
                    placeholder="@username"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block">
                    Вуз / Род занятий студента (опционально)
                  </label>
                  <input
                    type="text"
                    value={studentOccupation}
                    onChange={(e) => setStudentOccupation(e.target.value)}
                    placeholder="Например: ВШЭ, 2 курс или IT-специалист"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsConvertAdultModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition-colors"
                >
                  <GraduationCap className="h-4 w-4" />
                  Подтвердить перевод в студента
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        initialStudentId={student.id}
        lockStudent={true}
        onRecorded={() => {
          const fresh = getStudentById(student.id);
          if (fresh) {
            setStudent(fresh);
            latestStudentRef.current = fresh;
          }
        }}
      />

      {/* SCHEDULE LESSON MODAL */}
      <ScheduleLessonModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          computeNextLesson();
        }}
        defaultGroupId={student.groups?.[0]?.id}
        onScheduled={() => {
          computeNextLesson();
        }}
      />

      {/* EMAIL STATEMENT MODAL */}
      {isEmailStatementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                ✉ Отправка выписки на e-mail
              </h3>
              <button
                type="button"
                onClick={() => setIsEmailStatementModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">Получатель выписки</span>
                <p className="font-bold text-slate-900 text-sm">{representativeName}</p>
                <p className="text-blue-600 font-mono text-xs">{representativeEmail}</p>
              </div>

              <div className="space-y-2 pt-1">
                <label className="font-semibold text-slate-700 block">Период выписки:</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 border border-slate-200 rounded-xl p-3 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="radio"
                      name="statement_period"
                      checked={statementPeriod === 'current_month'}
                      onChange={() => setStatementPeriod('current_month')}
                      className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block">За текущий месяц</span>
                      <span className="text-[11px] text-slate-500">Сентябрь 2026</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 border border-slate-200 rounded-xl p-3 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="radio"
                      name="statement_period"
                      checked={statementPeriod === 'all_time'}
                      onChange={() => setStatementPeriod('all_time')}
                      className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block">За всё время обучения</span>
                      <span className="text-[11px] text-slate-500">Полная история оплат и списаний</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEmailStatementModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={isSendingEmailStatement}
                onClick={handleSendEmailStatement}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSendingEmailStatement ? 'Отправка...' : 'Отправить отчет'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
