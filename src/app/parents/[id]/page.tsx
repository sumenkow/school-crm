'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { INITIAL_STUDENTS, FullStudentData, TimelineInteraction, FullTaskData, FullLessonData } from '@/lib/data/mockData';
import { getStoredStudents, saveStudentToStorage, reconcileAllStudentDepositsAndDebts } from '@/lib/data/studentStorage';
import { getStoredLessons } from '@/lib/data/lessonStorage';
import { getCombinedParentTimeline, saveInteractionToStorage, getInteractionTargetInfo, sortTimelineChronologicalDesc } from '@/lib/data/timelineStorage';
import { syncParentNameCascade } from '@/lib/data/nameCascadeSync';
import { getTasksForParent, updateUnifiedTaskStatus } from '@/lib/data/taskManager';
import { getParentFinancialSummary } from '@/lib/data/balanceHelper';
import { useRole } from '@/context/RoleContext';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Mail,
  Users,
  GraduationCap,
  CreditCard,
  Plus,
  Send,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Wallet,
  Clock,
  Edit,
  Check,
  X,
  CheckSquare,
  FileText,
  BookOpen,
  Calendar,
  ExternalLink,
  ChevronRight,
  Filter,
  Video
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { AddChildModal, AddedChildData } from '@/components/parents/AddChildModal';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { RecordPaymentModal } from '@/components/finance/RecordPaymentModal';
import { UpcomingPaymentAlert } from '@/components/common/UpcomingPaymentAlert';
import { getUpcomingPaymentForParent } from '@/lib/data/upcomingPaymentsHelper';
import { useLanguage } from '@/context/LanguageContext';

export default function ParentDetailsPage() {
  const params = useParams();
  const { success, error: toastError } = useToast();
  const { userName } = useRole();
  const { t } = useLanguage();
  const parentId = params.id as string;

  // Active tab state
  const [activeTab, setActiveTab] = useState<'profile' | 'children' | 'finance' | 'timeline' | 'tasks'>('profile');

  // Load parent and linked children from unified storage (supports converted leads)
  const [parent, setParent] = useState(() => {
    const allStudents = typeof window !== 'undefined' ? getStoredStudents() : INITIAL_STUDENTS;
    const matchedStudent = allStudents.find((s) => s.parents?.some((p) => p.id === parentId));
    const matchedParent = matchedStudent?.parents.find((p) => p.id === parentId);

    const matchedStudents = allStudents.filter((s) => s.parents?.some((p) => p.id === parentId));
    const uniqueStudents: typeof matchedStudents = [];
    const seenNames = new Set<string>();

    for (const st of matchedStudents) {
      const norm = `${st.firstName} ${st.lastName}`.toLowerCase().trim();
      if (!seenNames.has(norm)) {
        seenNames.add(norm);
        uniqueStudents.push({ ...st, groups: [...(st.groups || [])] });
      } else {
        const existing = uniqueStudents.find((s) => `${s.firstName} ${s.lastName}`.toLowerCase().trim() === norm);
        if (existing && st.groups) {
          const existingGroupIds = new Set((existing.groups || []).map((g) => g.id || g.name));
          for (const grp of st.groups) {
            if (!existingGroupIds.has(grp.id || grp.name)) {
              existing.groups.push(grp);
            }
          }
        }
      }
    }

    const linkedChildren = uniqueStudents.map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      age: s.birthDate ? `${new Date().getFullYear() - parseInt(s.birthDate.split('-')[0])} лет` : '14 лет',
      group: (s.groups || []).map((g: any) => g.name).filter(Boolean).join(', ') || 'Онлайн-группа',
      course: Array.from(new Set((s.groups || []).map((g: any) => g.courseName || g.name).filter(Boolean))).join(', ') || 'Общий курс',
      teacher: s.groups[0]?.teacherName || 'Мария Иванова',
      groups: s.groups || [],
      status: s.status,
      attendance: s.attendanceStats?.attendanceRate || '100%',
    }));

    return {
      id: parentId,
      firstName: matchedParent?.firstName || 'Ольга',
      lastName: matchedParent?.lastName || 'Смирнова',
      phone: matchedParent?.phone || '+7 (999) 123-45-67',
      telegram: matchedParent?.telegram || '@olga_smirnova',
      whatsapp: matchedParent?.whatsapp || '+79991234567',
      email: matchedParent?.email || 'olga.smirnova@example.com',
      preferredChannel: matchedParent?.preferredChannel || 'Telegram',
      notes: matchedParent?.notes || 'Предпочитает общение в Telegram после 18:00.',
      children: linkedChildren.length > 0 ? linkedChildren : [
        {
          id: '1',
          name: 'Иван Смирнов',
          age: '14 лет',
          group: 'English B1 Teens',
          course: 'Английский язык',
          teacher: 'Мария Иванова',
          groups: [
            { id: '1', name: 'English B1 Teens', courseName: 'Английский язык', teacherName: 'Мария Иванова', schedule: 'Пн, Чт • 18:45–20:15', status: 'active', joinedAt: '01.09.2026' },
          ],
          status: 'active',
          attendance: '94%',
        },
      ],
      payments: [
        { id: 'pay1', studentName: linkedChildren[0]?.name || 'Иван Смирнов', date: '01.09.2026', amount: '7 600 ₽', period: 'Сентябрь 2026', status: 'paid' },
      ],
    };
  });

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Next Upcoming Lesson for Children
  const [upcomingLesson, setUpcomingLesson] = useState<{ lesson: FullLessonData; childName: string } | null>(null);

  const computeNextLesson = () => {
    if (typeof window === 'undefined') return;
    const allLessons = getStoredLessons();
    const childrenIds = new Set((parent.children || []).map((c) => c.id));
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
    
    const matching: Array<{ lesson: FullLessonData; childName: string }> = [];

    for (const lesson of allLessons) {
      if (lesson.status === 'cancelled' || lesson.status === 'completed') continue;
      const lessonMs = parseLessonDateMs(lesson);
      if (lessonMs <= nowMs) continue;

      for (const st of lesson.students || []) {
        if (childrenIds.has(st.id)) {
          matching.push({ lesson, childName: st.name });
        }
      }

      for (const ch of parent.children || []) {
        const isGroupMatched = ch.groups?.some((g: any) => g.id === lesson.groupId);
        if (isGroupMatched && !matching.some((m) => m.lesson.id === lesson.id && m.childName === ch.name)) {
          matching.push({ lesson, childName: ch.name });
        }
      }
    }

    matching.sort((a, b) => {
      const timeA = parseLessonDateMs(a.lesson);
      const timeB = parseLessonDateMs(b.lesson);
      return timeA - timeB;
    });

    setUpcomingLesson(matching[0] || null);
  };

  useEffect(() => {
    computeNextLesson();
    const handleSync = () => computeNextLesson();
    window.addEventListener('crm-lessons-changed', handleSync);
    window.addEventListener('crm-groups-changed', handleSync);
    window.addEventListener('crm-students-changed', handleSync);
    return () => {
      window.removeEventListener('crm-lessons-changed', handleSync);
      window.removeEventListener('crm-groups-changed', handleSync);
      window.removeEventListener('crm-students-changed', handleSync);
    };
  }, [parent.children]);

  useEffect(() => {
    const refreshParent = () => {
      reconcileAllStudentDepositsAndDebts();
      const allStudents = getStoredStudents();
      const matchedStudent = allStudents.find((s) => s.parents?.some((p) => p.id === parentId));
      const matchedParent = matchedStudent?.parents.find((p) => p.id === parentId);

      const matchedStudents = allStudents.filter((s) => s.parents?.some((p) => p.id === parentId));
      const uniqueStudents: typeof matchedStudents = [];
      const seenNames = new Set<string>();

      for (const st of matchedStudents) {
        const norm = `${st.firstName} ${st.lastName}`.toLowerCase().trim();
        if (!seenNames.has(norm)) {
          seenNames.add(norm);
          uniqueStudents.push({ ...st, groups: [...(st.groups || [])] });
        } else {
          const existing = uniqueStudents.find((s) => `${s.firstName} ${s.lastName}`.toLowerCase().trim() === norm);
          if (existing && st.groups) {
            const existingGroupIds = new Set((existing.groups || []).map((g) => g.id || g.name));
            for (const grp of st.groups) {
              if (!existingGroupIds.has(grp.id || grp.name)) {
                existing.groups.push(grp);
              }
            }
          }
        }
      }

      const linkedChildren = uniqueStudents.map((s) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        age: s.birthDate ? `${new Date().getFullYear() - parseInt(s.birthDate.split('-')[0])} лет` : '14 лет',
        group: (s.groups || []).map((g: any) => g.name).filter(Boolean).join(', ') || 'Онлайн-группа',
        course: Array.from(new Set((s.groups || []).map((g: any) => g.courseName || g.name).filter(Boolean))).join(', ') || 'Общий курс',
        teacher: s.groups[0]?.teacherName || 'Мария Иванова',
        groups: s.groups || [],
        status: s.status,
        attendance: s.attendanceStats?.attendanceRate || '100%',
      }));

      if (matchedParent || linkedChildren.length > 0) {
        setParent((prev) => ({
          ...prev,
          firstName: matchedParent?.firstName || prev.firstName,
          lastName: matchedParent?.lastName || prev.lastName,
          phone: matchedParent?.phone || prev.phone,
          telegram: matchedParent?.telegram || prev.telegram,
          whatsapp: matchedParent?.whatsapp || prev.whatsapp,
          email: matchedParent?.email || prev.email,
          preferredChannel: matchedParent?.preferredChannel || prev.preferredChannel,
          notes: matchedParent?.notes !== undefined ? matchedParent.notes : prev.notes,
          children: linkedChildren.length > 0 ? linkedChildren : prev.children,
        }));
      }
      setRefreshTrigger((prev) => prev + 1);
    };

    refreshParent();
    window.addEventListener('crm-students-changed', refreshParent);
    window.addEventListener('crm-payments-changed', refreshParent);
    window.addEventListener('focus', refreshParent);
    return () => {
      window.removeEventListener('crm-students-changed', refreshParent);
      window.removeEventListener('crm-payments-changed', refreshParent);
      window.removeEventListener('focus', refreshParent);
    };
  }, [parentId]);

  // Notes inline editing
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState(parent.notes || '');

  useEffect(() => {
    setEditedNotes(parent.notes || '');
  }, [parent.notes]);

  const handleSaveNotes = () => {
    const allStudents = getStoredStudents();
    let updatedAny = false;

    allStudents.forEach((st) => {
      if (st.parents?.some((p) => p.id === parent.id)) {
        st.parents = st.parents.map((p) => (p.id === parent.id ? { ...p, notes: editedNotes } : p));
        saveStudentToStorage(st);
        updatedAny = true;
      }
    });

    setParent((prev) => ({ ...prev, notes: editedNotes }));
    setIsEditingNotes(false);
    success('Заметки о родителе сохранены');
  };

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddChildModalOpen, setIsAddChildModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentChildFilter, setPaymentChildFilter] = useState<'all' | string>('all');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'open' | 'done'>('all');

  // Multi-currency unified family finances
  const familyFinancialSummary = useMemo(() => {
    return getParentFinancialSummary(parent.id);
  }, [parent.id, refreshTrigger]);

  // Collect all payments for all children belonging to this parent
  const familyPayments = useMemo(() => {
    const allStudents = typeof window !== 'undefined' ? getStoredStudents() : INITIAL_STUDENTS;
    const childIds = new Set(parent.children.map((c) => c.id));
    const list: Array<{
      id: string;
      studentId: string;
      studentName: string;
      courseName: string;
      groupName: string;
      date: string;
      amount: string;
      period: string;
      method: string;
      status: 'paid' | 'expected' | 'overdue';
    }> = [];

    for (const st of allStudents) {
      const isFamilyChild = childIds.has(st.id) || st.parents?.some((p) => p.id === parentId);
      if (isFamilyChild && st.finance?.payments) {
        const studentName = `${st.firstName} ${st.lastName}`;
        const courseName = st.groups?.[0]?.courseName || 'Основной курс';
        const groupName = (st.groups || []).map((g: any) => g.name).filter(Boolean).join(', ') || 'Онлайн-группа';
        for (const pay of st.finance.payments) {
          list.push({
            id: pay.id,
            studentId: st.id,
            studentName,
            courseName,
            groupName,
            date: pay.date,
            amount: pay.amount,
            period: pay.period,
            method: pay.method,
            status: pay.status,
          });
        }
      }
    }

    return list;
  }, [parent.children, parentId, refreshTrigger]);

  const filteredPayments = useMemo(() => {
    if (paymentChildFilter === 'all') return familyPayments;
    return familyPayments.filter((p) => p.studentId === paymentChildFilter);
  }, [familyPayments, paymentChildFilter]);

  // Family-wide totals
  const familyTotalPaid = useMemo(() => {
    return familyPayments
      .filter((p) => p.status === 'paid' && !p.amount.startsWith('-'))
      .reduce((sum, p) => {
        const num = parseFloat(p.amount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        return sum + num;
      }, 0);
  }, [familyPayments]);

  const familyTotalDebt = useMemo(() => {
    return familyPayments
      .filter((p) => p.status === 'overdue')
      .reduce((sum, p) => {
        const num = parseFloat(p.amount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        return sum + num;
      }, 0);
  }, [familyPayments]);

  const totalFamilyDeposit = useMemo(() => {
    const allStudents = typeof window !== 'undefined' ? getStoredStudents() : INITIAL_STUDENTS;
    const childIds = new Set(parent.children.map((c) => c.id));
    return allStudents
      .filter((s) => childIds.has(s.id) || s.parents?.some((p) => p.id === parentId))
      .reduce((sum, s) => sum + (s.finance?.deposit?.balance || 0), 0);
  }, [parent.children, parentId, refreshTrigger]);

  // Per-child finances for individual children cards
  const childFinanceMap = useMemo(() => {
    const allStudents = typeof window !== 'undefined' ? getStoredStudents() : INITIAL_STUDENTS;
    const map = new Map<string, { deposit: number; debt: number; totalPaid: number; currency: string }>();

    for (const ch of parent.children) {
      const st = allStudents.find((s) => s.id === ch.id);
      const deposit = st?.finance?.deposit?.balance || 0;
      const debt = (st?.finance?.payments || [])
        .filter((p) => p.status === 'overdue')
        .reduce((sum, p) => sum + (parseFloat(p.amount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0), 0);
      const paid = (st?.finance?.payments || [])
        .filter((p) => p.status === 'paid' && !p.amount.startsWith('-'))
        .reduce((sum, p) => sum + (parseFloat(p.amount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0), 0);
      const currency = st?.finance?.deposit?.currency === 'EUR' ? '€' : '₽';
      map.set(ch.id, { deposit, debt, totalPaid: paid, currency });
    }
    return map;
  }, [parent.children, refreshTrigger]);

  const [paymentModalStudentId, setPaymentModalStudentId] = useState<string | undefined>(undefined);

  // Tasks for family & children
  const [familyTasks, setFamilyTasks] = useState<FullTaskData[]>([]);

  useEffect(() => {
    async function loadTasksAndTimeline() {
      try {
        const tasks = await getTasksForParent(parentId);
        setFamilyTasks(tasks);

        const childrenIds = (parent?.children || []).map((c) => c.id);
        const combined = getCombinedParentTimeline(parentId, childrenIds);
        setInteractions(combined);
      } catch (e) {
        console.error('Failed to load family tasks/timeline:', e);
      }
    }
    loadTasksAndTimeline();

    const handleSync = () => {
      loadTasksAndTimeline();
    };

    window.addEventListener('crm-tasks-changed', handleSync);
    window.addEventListener('crm-timeline-interactions-changed', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      window.removeEventListener('crm-tasks-changed', handleSync);
      window.removeEventListener('crm-timeline-interactions-changed', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [parentId, parent.children]);

  const handleToggleParentTask = async (taskId: string) => {
    const currentTask = familyTasks.find((t) => t.id === taskId);
    const newStatus = currentTask?.status === 'done' ? 'open' : 'done';

    setFamilyTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await updateUnifiedTaskStatus(taskId, newStatus, {
        performedBy: userName || 'Администратор',
      });
      success(newStatus === 'done' ? 'Задача выполнена!' : 'Задача открыта заново');
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  // Edit modal child management states
  const [editChildren, setEditChildren] = useState(parent.children);
  const [isAddingChildInEdit, setIsAddingChildInEdit] = useState(false);
  const [addChildMode, setAddChildMode] = useState<'existing' | 'new'>('existing');
  const [selectedExistingStudentId, setSelectedExistingStudentId] = useState('');
  const [newChildNameInEdit, setNewChildNameInEdit] = useState('');
  const [newChildGroupInEdit, setNewChildGroupInEdit] = useState('English B1 Teens');

  const availableStudentsForFamily = INITIAL_STUDENTS.filter(
    (st) => !editChildren.some((c) => c.id === st.id)
  );

  const handleAttachExistingChildInEdit = () => {
    const st = INITIAL_STUDENTS.find((s) => s.id === selectedExistingStudentId);
    if (!st) return;

    setEditChildren((prev) => [
      ...prev,
      {
        id: st.id,
        name: `${st.firstName} ${st.lastName}`,
        age: st.birthDate ? `${new Date().getFullYear() - parseInt(st.birthDate.split('-')[0])} лет` : '14 лет',
        group: st.groups[0]?.name || 'Основная группа',
        course: st.groups[0]?.courseName || 'Курс',
        teacher: st.groups[0]?.teacherName || 'Преподаватель',
        groups: st.groups || [],
        status: st.status,
        attendance: st.attendanceStats?.attendanceRate || '100%',
      },
    ]);

    setSelectedExistingStudentId('');
    setIsAddingChildInEdit(false);
  };

  const handleAddNewChildInEdit = () => {
    if (!newChildNameInEdit.trim()) return;

    const newChildId = `std_${Date.now()}`;
    const course = newChildGroupInEdit.includes('English')
      ? 'Английский язык'
      : newChildGroupInEdit.includes('Robotics')
      ? 'Робототехника'
      : 'Математика';

    setEditChildren((prev) => [
      ...prev,
      {
        id: newChildId,
        name: newChildNameInEdit.trim(),
        age: '12 лет',
        group: newChildGroupInEdit,
        course,
        teacher: 'Мария Иванова',
        groups: [
          {
            id: `g_${Date.now()}`,
            name: newChildGroupInEdit,
            courseName: course,
            teacherName: 'Мария Иванова',
            schedule: '—',
            status: 'active',
            joinedAt: new Date().toLocaleDateString('ru-RU'),
          },
        ],
        status: 'active',
        attendance: '100%',
      },
    ]);

    setNewChildNameInEdit('');
    setIsAddingChildInEdit(false);
  };

  const handleChildAdded = (newChild: AddedChildData) => {
    setParent((prev) => ({
      ...prev,
      children: [
        ...prev.children,
        {
          id: newChild.id,
          name: newChild.name,
          age: newChild.age,
          group: newChild.group,
          course: newChild.course,
          teacher: newChild.teacher,
          groups: [
            {
              id: `g_${Date.now()}`,
              name: newChild.group,
              courseName: newChild.course,
              teacherName: newChild.teacher,
              schedule: '—',
              status: 'active',
              joinedAt: new Date().toLocaleDateString('ru-RU'),
            },
          ],
          status: newChild.status,
          attendance: newChild.attendance,
        },
      ],
      payments: newChild.paymentStatus === 'paid'
        ? [
            {
              id: `pay_${Date.now()}`,
              studentName: newChild.name,
              date: new Date().toLocaleDateString('ru-RU'),
              amount: newChild.price,
              period: new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
              status: 'paid',
            },
            ...prev.payments,
          ]
        : prev.payments,
    }));

    // Add event to family timeline
    const childInteraction: TimelineInteraction = {
      id: `int_${Date.now()}`,
      studentId: newChild.id,
      studentName: newChild.name,
      parentId: parent.id,
      parentName: `${parent.firstName} ${parent.lastName}`,
      occurredAt: 'Только что',
      channel: 'telegram',
      type: 'status_change',
      author: userName || 'Администратор школы',
      content: `В семью зачислен ребенок: ${newChild.name} (${newChild.course}, группа «${newChild.group}», преподаватель ${newChild.teacher}).`,
      result: newChild.paymentStatus === 'paid' ? 'Оплачено и зачислено' : 'Ожидается оплата',
    };

    setInteractions((prev) => [childInteraction, ...prev]);
    saveInteractionToStorage(childInteraction);

    const newStudentEntity: FullStudentData = {
      id: newChild.id,
      firstName: newChild.firstName || newChild.name.split(' ')[0] || 'Ребенок',
      lastName: newChild.lastName || newChild.name.split(' ')[1] || parent.lastName,
      studentType: 'school_student',
      birthDate: newChild.birthDate || '2014-05-15',
      phone: newChild.phone || parent.phone,
      telegram: newChild.telegram || parent.telegram,
      status: (newChild.status as any) || 'active',
      notes: newChild.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      parents: [
        {
          id: parent.id,
          firstName: parent.firstName,
          lastName: parent.lastName,
          phone: parent.phone,
          telegram: parent.telegram,
          whatsapp: parent.whatsapp,
          email: parent.email,
          preferredChannel: (parent.preferredChannel as any) || 'telegram',
          relationshipType: newChild.relationshipType || 'Родитель',
          isPrimary: true,
        },
      ],
      groups: [
        {
          id: `g_${Date.now()}`,
          name: newChild.group,
          courseName: newChild.course,
          teacherName: newChild.teacher,
          schedule: '—',
          status: 'active',
          joinedAt: new Date().toLocaleDateString('ru-RU'),
        },
      ],
      finance: {
        deposit: {
          balance: newChild.paymentStatus === 'paid' ? 7600 : 0,
          balanceFormatted: newChild.paymentStatus === 'paid' ? '7 600 ₽' : '0 ₽',
          currency: 'RUB',
        },
        activeSubscription: {
          period: new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
          price: newChild.price,
          status: 'active',
          lessonsAttended: '0 из 8 занятий',
          renewalDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toLocaleDateString('ru-RU'),
        },
        payments: newChild.paymentStatus === 'paid'
          ? [
              {
                id: `pay_${Date.now()}`,
                date: new Date().toLocaleDateString('ru-RU'),
                amount: newChild.price,
                period: new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
                status: 'paid',
                method: 'Банковская карта',
              },
            ]
          : [
              {
                id: `pay_${Date.now()}`,
                date: new Date().toLocaleDateString('ru-RU'),
                amount: newChild.price,
                period: new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
                status: 'overdue',
                method: 'Счёт на оплату',
              },
            ],
      },
      attendanceStats: {
        totalLessons: 0,
        presentCount: 0,
        absentCount: 0,
        rescheduledCount: 0,
        attendanceRate: '100%',
        history: [],
      },
      interactions: [childInteraction],
      teacherComments: [],
      tasks: [],
    };

    saveStudentToStorage(newStudentEntity);
    window.dispatchEvent(new CustomEvent('crm-students-changed', { detail: newStudentEntity }));
    success(`Ребенок «${newChild.name}» успешно добавлен в карточку семьи!`);
  };

  const [editForm, setEditForm] = useState({
    firstName: parent.firstName,
    lastName: parent.lastName,
    phone: parent.phone,
    telegram: parent.telegram,
    whatsapp: parent.whatsapp,
    email: parent.email,
    preferredChannel: parent.preferredChannel,
    notes: parent.notes,
  });

  const [interactions, setInteractions] = useState<TimelineInteraction[]>(() => {
    const childrenIds = (parent?.children || []).map((c: { id: string }) => c.id);
    return getCombinedParentTimeline(parentId, childrenIds);
  });

  useEffect(() => {
    const childrenIds = parent.children.map((c) => c.id);
    const combined = getCombinedParentTimeline(parentId, childrenIds, interactions);
    if (combined.length !== interactions.length) {
      setInteractions(combined);
    }
  }, [parentId, parent.children]);

  const handleOpenEdit = () => {
    setEditForm({
      firstName: parent.firstName,
      lastName: parent.lastName,
      phone: parent.phone,
      telegram: parent.telegram,
      whatsapp: parent.whatsapp,
      email: parent.email,
      preferredChannel: parent.preferredChannel,
      notes: parent.notes,
    });
    setEditChildren([...parent.children]);
    setIsAddingChildInEdit(false);
    setIsEditModalOpen(true);
  };

  const handleSaveParent = (e: React.FormEvent) => {
    e.preventDefault();

    const previousChannel = parent.preferredChannel;
    const newChannel = editForm.preferredChannel;

    setParent((prev) => ({
      ...prev,
      firstName: editForm.firstName.trim() || prev.firstName,
      lastName: editForm.lastName.trim() || prev.lastName,
      phone: editForm.phone.trim() || prev.phone,
      telegram: editForm.telegram.trim() || prev.telegram,
      whatsapp: editForm.whatsapp.trim() || prev.whatsapp,
      email: editForm.email.trim() || prev.email,
      preferredChannel: editForm.preferredChannel,
      notes: editForm.notes,
      children: editChildren,
    }));

    const allStudents = getStoredStudents();
    const currentFamilyChildIds = new Set(editChildren.map((c) => c.id));

    allStudents.forEach((student) => {
      const isNowInFamily = currentFamilyChildIds.has(student.id);
      const hadParentBefore = student.parents?.some((p) => p.id === parent.id);

      if (isNowInFamily) {
        if (!student.parents || student.parents.length === 0) {
          student.parents = [
            {
              id: parent.id,
              firstName: editForm.firstName.trim() || parent.firstName,
              lastName: editForm.lastName.trim() || parent.lastName,
              phone: editForm.phone.trim() || parent.phone,
              telegram: editForm.telegram.trim() || parent.telegram,
              whatsapp: editForm.whatsapp.trim() || parent.whatsapp,
              email: editForm.email.trim() || parent.email,
              preferredChannel: (editForm.preferredChannel as any) || 'telegram',
              relationshipType: 'Родитель',
              isPrimary: true,
            },
          ];
        } else {
          student.parents = student.parents.map((p) =>
            p.id === parent.id
              ? {
                  ...p,
                  firstName: editForm.firstName.trim() || parent.firstName,
                  lastName: editForm.lastName.trim() || parent.lastName,
                  phone: editForm.phone.trim() || parent.phone,
                  telegram: editForm.telegram.trim() || parent.telegram,
                  whatsapp: editForm.whatsapp.trim() || parent.whatsapp,
                  email: editForm.email.trim() || parent.email,
                }
              : p
          );
        }
        saveStudentToStorage(student);
      }
    });

    // Cascade parent name to payments, tasks, timeline, leads
    syncParentNameCascade(parent.id, {
      firstName: editForm.firstName.trim() || parent.firstName,
      lastName: editForm.lastName.trim() || parent.lastName,
      phone: editForm.phone.trim() || parent.phone,
      email: editForm.email.trim() || parent.email,
      telegram: editForm.telegram.trim() || parent.telegram,
      whatsapp: editForm.whatsapp.trim() || parent.whatsapp,
    });

    // Log channel change interaction if modified
    if (newChannel && newChannel !== previousChannel) {
      const channelInteraction: TimelineInteraction = {
        id: `int_channel_${Date.now()}`,
        parentId: parent.id,
        parentName: `${editForm.firstName.trim() || parent.firstName} ${editForm.lastName.trim() || parent.lastName}`,
        occurredAt: 'Только что',
        createdAt: new Date().toISOString(),
        channel: (newChannel.toLowerCase().includes('email') ? 'email' : newChannel.toLowerCase().includes('tele') ? 'telegram' : 'other') as any,
        type: 'status_change',
        author: userName || 'Администратор школы',
        content: `Способ связи изменен на: «${newChannel}». Настройки сохранены в базу.`,
        result: 'Обновлен предпочтительный канал',
        targetType: 'parent',
        targetName: `${editForm.firstName.trim() || parent.firstName} ${editForm.lastName.trim() || parent.lastName}`,
        targetRole: 'Родитель',
      };
      saveInteractionToStorage(channelInteraction);
      setInteractions((prev) => sortTimelineChronologicalDesc([channelInteraction, ...prev]));
    }

    window.dispatchEvent(new CustomEvent('crm-students-changed'));
    success('Данные родителя и состав семьи успешно сохранены!');
    setIsEditModalOpen(false);
  };

  const handleUpdateNotificationChannel = async (newChannel: 'email' | 'telegram' | 'both') => {
    const channelLabel = newChannel === 'email' ? 'Email' : newChannel === 'telegram' ? 'Telegram' : 'both';
    
    setParent((prev) => ({
      ...prev,
      preferredChannel: channelLabel,
    }));

    // 1. Update in-memory students
    const allStudents = getStoredStudents();
    allStudents.forEach((student) => {
      if (student.parents && student.parents.some((p) => p.id === parent.id)) {
        student.parents = student.parents.map((p) =>
          p.id === parent.id ? { ...p, preferredChannel: channelLabel as any } : p
        );
        saveStudentToStorage(student);
      }
    });

    // 2. Cascade parent update
    syncParentNameCascade(parent.id, {
      firstName: parent.firstName,
      lastName: parent.lastName,
      phone: parent.phone,
      email: parent.email,
      telegram: parent.telegram,
      whatsapp: parent.whatsapp,
      preferredChannel: channelLabel,
    });

    // 3. Supabase Cloud DB direct update
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase.from('parents').upsert({
        id: parent.id,
        first_name: parent.firstName,
        last_name: parent.lastName,
        phone: parent.phone,
        email: parent.email || null,
        telegram: parent.telegram || null,
        whatsapp: parent.whatsapp || null,
        preferred_channel: (newChannel === 'both' ? 'email' : newChannel) as any,
        notes: parent.notes || null,
      });
    } catch (e) {
      console.warn('Supabase parent channel update warning:', e);
    }

    // 4. Log interaction in timeline and save to storage & DB
    const channelNameRu = newChannel === 'email' ? 'Email (почта)' : newChannel === 'telegram' ? 'Telegram' : 'Email и Telegram';
    const channelInteraction: TimelineInteraction = {
      id: `int_channel_${Date.now()}`,
      parentId: parent.id,
      parentName: `${parent.firstName} ${parent.lastName}`,
      occurredAt: 'Только что',
      createdAt: new Date().toISOString(),
      channel: (newChannel === 'email' ? 'email' : newChannel === 'telegram' ? 'telegram' : 'other') as any,
      type: 'status_change',
      author: userName || 'Администратор школы',
      content: `Предпочтительный канал связи изменен на: «${channelNameRu}». Все уведомления и отчеты теперь отправляются по этому каналу.`,
      result: 'Канал связи обновлен',
      targetType: 'parent',
      targetName: `${parent.firstName} ${parent.lastName}`,
      targetRole: 'Родитель',
    };
    saveInteractionToStorage(channelInteraction);
    setInteractions((prev) => sortTimelineChronologicalDesc([channelInteraction, ...prev]));

    success(`Канал отправки уведомлений и отчётов обновлён: ${
      newChannel === 'email' ? '📧 Электронная почта' : newChannel === 'telegram' ? '✈️ Telegram' : '🔄 Почта и Telegram'
    }`);
  };

  // Timeline interaction form state
  const [newNote, setNewNote] = useState('');
  const [newNoteChannel, setNewNoteChannel] = useState<'telegram' | 'whatsapp' | 'phone' | 'call' | 'email'>('telegram');
  const [newNoteTargetChildId, setNewNoteTargetChildId] = useState<string>('parent');

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const targetChild = parent.children.find((c) => c.id === newNoteTargetChildId) || parent.children[0];
    const isTargetingChild = newNoteTargetChildId !== 'parent';

    const newEntry: TimelineInteraction = {
      id: `int_${Date.now()}`,
      parentId: parent.id,
      parentName: `${parent.firstName} ${parent.lastName}`,
      studentId: isTargetingChild ? targetChild?.id : undefined,
      studentName: isTargetingChild ? targetChild?.name : undefined,
      targetType: isTargetingChild ? 'student' : 'parent',
      targetName: isTargetingChild ? targetChild?.name : `${parent.firstName} ${parent.lastName}`,
      targetRole: isTargetingChild ? 'Ученик' : 'Родитель',
      occurredAt: 'Только что',
      channel: newNoteChannel,
      type: 'follow_up',
      author: userName || 'Администратор школы',
      content: newNote.trim(),
      result: 'Зафиксировано в карточке семьи',
    };

    setInteractions((prev) => [newEntry, ...prev]);

    // Add to child in INITIAL_STUDENTS so it appears in the student's timeline!
    if (targetChild?.id) {
      const idx = INITIAL_STUDENTS.findIndex((s) => s.id === targetChild.id);
      if (idx !== -1) {
        INITIAL_STUDENTS[idx] = {
          ...INITIAL_STUDENTS[idx],
          interactions: [newEntry, ...(INITIAL_STUDENTS[idx].interactions || [])],
        };
      }
    }

    saveInteractionToStorage(newEntry);
    success('Действие сохранено в карточку семьи и синхронизировано с таймлайном ученика!');
    setNewNote('');
  };

  const filteredTasks = useMemo(() => {
    if (taskStatusFilter === 'all') return familyTasks;
    return familyTasks.filter((t) => t.status === taskStatusFilter);
  }, [familyTasks, taskStatusFilter]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Back link & Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/parents" className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('action.back', 'Назад')} {t('parents.title', 'к списку родителей')}
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">{parent.firstName} {parent.lastName}</span>
      </div>

      {/* Hero Parent Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 font-bold text-blue-700 text-2xl shadow-2xs">
              {parent.firstName[0]}{parent.lastName[0]}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {parent.firstName} {parent.lastName}
                </h1>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                  {t('hero.preferredChannel', 'Канал')}: {parent.preferredChannel}
                </span>

                {/* Hero Family Balance Badge */}
                {familyFinancialSummary.deposit > 0 ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200 inline-flex items-center gap-1 shadow-2xs">
                    <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                    {t('parents.familyDeposit', 'Депозит')}: {familyFinancialSummary.formattedDeposit}
                  </span>
                ) : familyFinancialSummary.debt > 0 ? (
                  <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200 inline-flex items-center gap-1 shadow-2xs animate-pulse">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                    {t('parents.familyDebt', 'Долг')}: {familyFinancialSummary.formattedDebt}
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200 inline-flex items-center gap-1 shadow-2xs">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    {t('hero.balance', 'Баланс')}: 0 € (0 ₽)
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <a href={`tel:${parent.phone}`} className="hover:text-blue-600 font-medium">{parent.phone}</a>
                </div>
                {parent.telegram && (
                  <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>{parent.telegram}</span>
                  </div>
                )}
                {parent.whatsapp && (
                  <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>{parent.whatsapp}</span>
                  </div>
                )}
                {parent.email && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{parent.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Hero Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPaymentModalStudentId(undefined);
                setIsPaymentModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <CreditCard className="h-3.5 w-3.5" />
              {t('action.addPayment', 'Добавить платёж')}
            </button>
            <button
              type="button"
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <CheckSquare className="h-3.5 w-3.5 text-purple-600" />
              {t('action.createTask', 'Создать задачу')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
              {t('action.addAction', 'Добавить действие')}
            </button>
            <button
              type="button"
              onClick={() => setIsAddChildModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-3.5 py-2 text-xs font-semibold text-blue-700 shadow-xs hover:bg-blue-100 transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-blue-600" />
              {t('parents.addChild', 'Добавить ребенка')}
            </button>
            <button
              type="button"
              onClick={handleOpenEdit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <Edit className="h-3.5 w-3.5 text-blue-600" />
              {t('action.edit', 'Изменить')}
            </button>
          </div>
        </div>

        {/* Quick summary strip */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3 border-t border-slate-100 pt-4 text-xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{t('parents.childrenCount', 'Дети')} ({parent.children.length}):</span>
              <button
                type="button"
                onClick={() => setIsAddChildModalOpen(true)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5"
                title="Добавить ребенка"
              >
                <Plus className="h-3 w-3" />
                {t('common.add', 'Добавить')}
              </button>
            </div>
            {parent.children.length === 0 ? (
              <p className="font-semibold text-slate-400 mt-0.5">{t('parents.emptyChildren', 'Нет привязанных')}</p>
            ) : (
              <div className="flex flex-wrap gap-1 mt-1">
                {parent.children.map((ch) => (
                  <Link
                    key={ch.id}
                    href={`/students/${ch.id}`}
                    className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200/60 hover:bg-blue-100 transition-colors"
                  >
                    {ch.name.split(' ')[0]}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div>
            <span className="text-slate-400">{t('students.colGroup', 'Курсы и группы')}:</span>
            <p className="font-semibold text-slate-800 mt-0.5 truncate">
              {parent.children.map((c) => c.group || c.course).filter(Boolean).join(', ') || 'Онлайн'}
            </p>
          </div>
          <div>
            <span className="text-slate-400">{t('tasks.filterOpen', 'Открытых задач')}:</span>
            <p className="font-semibold text-purple-600 mt-0.5">
              {familyTasks.filter((t) => t.status === 'open').length}
            </p>
          </div>
          <div>
            <span className="text-slate-400">{t('hero.preferredChannel', 'Предпочтительный канал')}:</span>
            <p className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1">
              {parent.preferredChannel}
            </p>
          </div>

          {/* 5th Column: Hero Family Balance Box */}
          <div className={cn(
            "rounded-xl p-2.5 border flex flex-col justify-between",
            familyFinancialSummary.deposit > 0 && "bg-emerald-50/70 border-emerald-200",
            familyFinancialSummary.debt > 0 && "bg-rose-50/80 border-rose-200",
            familyFinancialSummary.deposit === 0 && familyFinancialSummary.debt === 0 && "bg-amber-50/70 border-amber-200"
          )}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                {familyFinancialSummary.deposit > 0 ? (
                  <Wallet className="h-3 w-3 text-emerald-600" />
                ) : familyFinancialSummary.debt > 0 ? (
                  <AlertTriangle className="h-3 w-3 text-rose-600" />
                ) : (
                  <Clock className="h-3 w-3 text-amber-600" />
                )}
                {t('hero.balance', 'Баланс семьи')}:
              </span>
              {familyFinancialSummary.debt > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    const childWithDebt = parent.children.find((c) => {
                      const f = childFinanceMap.get(c.id);
                      return f && f.debt > 0;
                    });
                    setPaymentModalStudentId(childWithDebt?.id || parent.children[0]?.id);
                    setIsPaymentModalOpen(true);
                  }}
                  className="text-[10px] font-bold text-rose-700 bg-white border border-rose-300 rounded px-1.5 py-0.5 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  {t('action.settleDebt', 'Погасить')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setPaymentModalStudentId(parent.children[0]?.id);
                    setIsPaymentModalOpen(true);
                  }}
                  className="text-[10px] font-bold text-blue-700 bg-white border border-blue-300 rounded px-1.5 py-0.5 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  {t('action.pay', 'Пополнить')}
                </button>
              )}
            </div>
            <p className={cn(
              "font-extrabold text-sm mt-0.5",
              familyFinancialSummary.deposit > 0 && "text-emerald-700",
              familyFinancialSummary.debt > 0 && "text-rose-700",
              familyFinancialSummary.deposit === 0 && familyFinancialSummary.debt === 0 && "text-slate-900"
            )}>
              {familyFinancialSummary.formattedNet}
            </p>
            <p className={cn(
              "text-[10px] font-medium leading-tight line-clamp-1",
              familyFinancialSummary.deposit > 0 && "text-emerald-600",
              familyFinancialSummary.debt > 0 && "text-rose-600 font-semibold",
              familyFinancialSummary.deposit === 0 && familyFinancialSummary.debt === 0 && "text-amber-800 font-semibold"
            )} title={familyFinancialSummary.breakdownSummary}>
              {familyFinancialSummary.breakdownSummary}
            </p>
          </div>
        </div>

        {/* Hero Block: Следующее занятие ребенка */}
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
                      {t('hero.nextLessonChildren', 'Следующее занятие')} ({upcomingLesson.childName}):
                    </span>
                    <span className="rounded-md bg-blue-100/90 px-2 py-0.5 text-xs font-bold text-blue-800 border border-blue-200/60">
                      {upcomingLesson.lesson.date} • {upcomingLesson.lesson.startTime} – {upcomingLesson.lesson.endTime}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      «{upcomingLesson.lesson.groupName}»
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {upcomingLesson.lesson.topic && (
                      <span><strong>{t('hero.topic', 'Тема')}:</strong> {upcomingLesson.lesson.topic}</span>
                    )}
                    {upcomingLesson.lesson.teacherName && (
                      <span><strong>{t('hero.teacher', 'Преподаватель')}:</strong> {upcomingLesson.lesson.teacherName}</span>
                    )}
                    {upcomingLesson.lesson.room && (
                      <span><strong>{t('hero.room', 'Место')}:</strong> {upcomingLesson.lesson.room}</span>
                    )}
                    {upcomingLesson.lesson.homework && (
                      <span className="text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md font-medium border border-amber-200">
                        <strong>{t('hero.homework', 'Д/З')}:</strong> {upcomingLesson.lesson.homework}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {upcomingLesson.lesson.onlineMeetingUrl && (
                  <a
                    href={upcomingLesson.lesson.onlineMeetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-white border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors shadow-2xs"
                  >
                    <Video className="h-3.5 w-3.5 text-blue-600" />
                    Zoom
                  </a>
                )}
                <Link
                  href={`/calendar/lessons/${upcomingLesson.lesson.id}`}
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
                <span>{t('hero.noLessons', 'Нет запланированных занятий для детей в расписании')}</span>
              </div>
              <Link
                href="/calendar"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-white border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors shadow-2xs"
              >
                <Calendar className="h-3.5 w-3.5" />
                {t('nav.calendar', 'Календарь занятий')}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* UPCOMING PAYMENT DEADLINE ALERT */}
      {(() => {
        const upcomingList = getUpcomingPaymentForParent(parent.id, parent.children.map((c) => c.id));
        if (upcomingList.length === 0) return null;
        return (
          <div className="space-y-2">
            {upcomingList.map((item) => (
              <UpcomingPaymentAlert
                key={item.id}
                item={item}
                onPaymentRecorded={() => setRefreshTrigger((prev) => prev + 1)}
              />
            ))}
          </div>
        );
      })()}

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-xs font-semibold">
        {[
          { key: 'profile', label: `${t('students.tabFamily', 'Профиль и Семья')}` },
          { key: 'children', label: `${t('students.tabAcademic', 'Дети и Обучение')} (${parent.children.length})` },
          { key: 'finance', label: `${t('students.tabFinance', 'Финансы и Абонементы')} (${filteredPayments.length})` },
          { key: 'timeline', label: `Timeline (${interactions.length})` },
          { key: 'tasks', label: `${t('nav.tasks', 'Задачи')} (${familyTasks.filter((t) => t.status === 'open').length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={cn(
              'pb-3 px-3 border-b-2 whitespace-nowrap transition-all cursor-pointer',
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: ПРОФИЛЬ И СЕМЬЯ */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="md:col-span-2 space-y-6">
            {/* Notification Preference Switcher Card */}
            <div className="rounded-2xl border border-blue-200 bg-linear-to-br from-blue-50/50 via-white to-sky-50/30 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Канал отправки данных по ученикам и отчётов
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-blue-800 bg-blue-100/80 px-2.5 py-0.5 rounded-full border border-blue-200">
                  {parent.preferredChannel === 'Telegram' || parent.preferredChannel === 'telegram'
                    ? '✈️ Telegram'
                    : parent.preferredChannel === 'both'
                    ? '🔄 Почта и Telegram'
                    : '📧 Email'}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Выберите, куда автоматически отправлять родителю расписание занятий, отчёты о посещаемости, ссылки на онлайн-уроки и домашние задания. Все изменения сохраняются напрямую в базу данных.
              </p>

              {/* MD3 Segmented Toggle */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-200/60 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleUpdateNotificationChannel('email')}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    parent.preferredChannel === 'Email' || parent.preferredChannel === 'email'
                      ? "bg-white text-blue-700 shadow-xs border border-blue-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                  )}
                >
                  <Mail className="h-3.5 w-3.5 text-blue-600" />
                  <span>📧 Почта (Email)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateNotificationChannel('telegram')}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    parent.preferredChannel === 'Telegram' || parent.preferredChannel === 'telegram'
                      ? "bg-white text-sky-700 shadow-xs border border-sky-300"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                  )}
                >
                  <Send className="h-3.5 w-3.5 text-sky-500" />
                  <span>✈️ Telegram</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateNotificationChannel('both')}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    parent.preferredChannel === 'both'
                      ? "bg-white text-indigo-700 shadow-xs border border-indigo-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                  )}
                >
                  <span>🔄</span>
                  <span>Оба канала</span>
                </button>
              </div>

              {/* Contact preview & Edit trigger */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Email для рассылки</span>
                    <span className="font-semibold text-slate-800 truncate block">
                      {parent.email || 'Не указан'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="p-2 rounded-lg bg-sky-50 text-sky-600 shrink-0">
                    <Send className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Telegram для уведомлений</span>
                    <span className="font-semibold text-slate-800 truncate block">
                      {parent.telegram || 'Не указан'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes and Special Details */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Заметки и особенности взаимодействия с родителем
                </h3>
                {!isEditingNotes ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditedNotes(parent.notes || '');
                      setIsEditingNotes(true);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    <Edit size={13} />
                    Редактировать
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingNotes(false)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      <Check size={13} />
                      Сохранить
                    </button>
                  </div>
                )}
              </div>

              {!isEditingNotes ? (
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100 whitespace-pre-line">
                  {parent.notes || 'Заметок о родителе пока нет. Нажмите «Редактировать», чтобы указать удобное время для связи, особенности общения или пожелания по обучению детей.'}
                </p>
              ) : (
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    placeholder="Удобное время для звонков, предпочтения по мессенджерам, особенности семьи..."
                    className="w-full rounded-xl border border-blue-300 bg-white p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-400">
                    💡 Изменения сохраняются в профиль семьи и будут доступны администраторам и преподавателям.
                  </p>
                </div>
              )}
            </div>

            {/* Quick Children Teaser & Links */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Дети в семье ({parent.children.length})
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddChildModalOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Добавить ребенка
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('children')}
                    className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Все дети подробно →
                  </button>
                </div>
              </div>

              {parent.children.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                  <p className="font-semibold">К этому родителю пока не привязано детей</p>
                  <button
                    type="button"
                    onClick={() => setIsAddChildModalOpen(true)}
                    className="mt-1.5 inline-flex items-center gap-1 text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    Привязать ребенка
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {parent.children.map((child) => (
                    <div
                      key={child.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 transition-all shadow-2xs flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {child.name.charAt(0)}
                          </div>
                          <div>
                            <Link
                              href={`/students/${child.id}`}
                              className="font-bold text-slate-900 text-xs hover:text-blue-600 hover:underline flex items-center gap-1"
                            >
                              {child.name}
                              <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                            </Link>
                            <span className="text-[10px] text-slate-500">{child.age}</span>
                          </div>
                        </div>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[9px] font-bold border',
                            child.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          )}
                        >
                          {child.status === 'active' ? 'Активен' : 'Пробный'}
                        </span>
                      </div>

                      <div className="mt-2.5 text-[11px] text-slate-600 space-y-0.5 border-t border-slate-100 pt-2">
                        <p className="truncate">
                          Группа: <strong className="text-slate-800">{child.group || child.groups?.[0]?.name}</strong>
                        </p>
                        <p className="truncate">
                          Преподаватель: <span className="text-slate-700">{child.teacher || child.groups?.[0]?.teacherName}</span>
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                        <Link
                          href={`/students/${child.id}`}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Карточка ученика →
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentModalStudentId(child.id);
                            setIsPaymentModalOpen(true);
                          }}
                          className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                        >
                          + Платёж
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contact details list */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-600" />
                Контакты и каналы связи
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                  <span className="text-slate-400 block text-[11px]">Телефон:</span>
                  <a href={`tel:${parent.phone}`} className="font-bold text-slate-900 hover:text-blue-600 mt-0.5 block">
                    {parent.phone}
                  </a>
                </div>
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                  <span className="text-slate-400 block text-[11px]">Telegram:</span>
                  <span className="font-bold text-blue-600 mt-0.5 block">{parent.telegram || 'Не указан'}</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                  <span className="text-slate-400 block text-[11px]">WhatsApp:</span>
                  <span className="font-bold text-emerald-600 mt-0.5 block">{parent.whatsapp || 'Не указан'}</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                  <span className="text-slate-400 block text-[11px]">Email:</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{parent.email || 'Не указан'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar Column */}
          <div className="space-y-6">
            {/* Financial Summary Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                  Финансы семьи
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('finance')}
                  className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Детали →
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <span className="text-slate-500 text-[11px]">Баланс семьи (нетто):</span>
                  <p className={cn(
                    "text-lg font-extrabold mt-0.5",
                    familyFinancialSummary.deposit > 0 && "text-emerald-700",
                    familyFinancialSummary.debt > 0 && "text-rose-700",
                    familyFinancialSummary.deposit === 0 && familyFinancialSummary.debt === 0 && "text-slate-900"
                  )}>
                    {familyFinancialSummary.formattedNet}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{familyFinancialSummary.breakdownSummary}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/40">
                    <span className="text-[10px] text-emerald-800 font-semibold">Депозит:</span>
                    <p className="text-xs font-bold text-emerald-700 mt-0.5">{familyFinancialSummary.formattedDeposit}</p>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50">
                    <span className="text-[10px] text-slate-500 font-semibold">Всего оплат:</span>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">{familyTotalPaid.toLocaleString('ru-RU')} ₽</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentModalStudentId(undefined);
                    setIsPaymentModalOpen(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors text-center cursor-pointer"
                >
                  + Внести семейный платёж
                </button>
              </div>
            </div>

            {/* Tasks preview card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5 text-purple-600" />
                  Задачи ({familyTasks.filter((t) => t.status === 'open').length})
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('tasks')}
                  className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Все задачи →
                </button>
              </div>

              {familyTasks.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 text-center">Нет запланированных задач</p>
              ) : (
                <div className="space-y-2">
                  {familyTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "p-2.5 rounded-xl border text-xs flex items-start justify-between gap-2",
                        task.status === 'done' ? "bg-slate-50 border-slate-100 text-slate-400" : "bg-white border-slate-200 shadow-2xs"
                      )}
                    >
                      <div className="min-w-0">
                        <p className={cn("font-bold truncate", task.status === 'done' && "line-through text-slate-400")}>
                          {task.title}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Срок: {task.dueDateFormatted || task.dueDate}
                        </p>
                      </div>
                      <span className={cn(
                        "rounded px-1.5 py-0.5 text-[9px] font-bold shrink-0",
                        task.priority === 'high' ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"
                      )}>
                        {task.priority === 'high' ? 'Срочно' : 'Обычный'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsCreateTaskModalOpen(true)}
                className="w-full py-1.5 px-3 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100 text-purple-700 font-semibold text-xs transition-colors text-center cursor-pointer"
              >
                + Поставить задачу
              </button>
            </div>

            {/* Timeline teaser */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                  Последние контакты
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('timeline')}
                  className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  История ({interactions.length}) →
                </button>
              </div>

              {interactions.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 text-center">История контактов пуста</p>
              ) : (
                <div className="space-y-2">
                  {sortTimelineChronologicalDesc(interactions).slice(0, 2).map((int) => (
                    <div key={int.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-700">{int.author}</span>
                        <span>{int.occurredAt}</span>
                      </div>
                      <p className="text-slate-700 line-clamp-2">{int.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ДЕТИ И ОБУЧЕНИЕ */}
      {activeTab === 'children' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Дети семьи ({parent.children.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ученики, привязанные к данному родителю в рамках единого семейного аккаунта школы
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddChildModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-98 shrink-0 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Добавить ребенка
            </button>
          </div>

          {parent.children.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-2">
              <Users className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">К этому родителю пока не привязано ни одного ребенка</p>
              <p className="text-slate-400 max-w-md mx-auto">
                Вы можете добавить нового ребенка или прикрепить существующего ученика из базы школы.
              </p>
              <button
                type="button"
                onClick={() => setIsAddChildModalOpen(true)}
                className="mt-3 inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Добавить ребенка сейчас
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {parent.children.map((child) => {
                const cFinance = childFinanceMap.get(child.id) || { deposit: 0, debt: 0, totalPaid: 0, currency: '₽' };
                return (
                  <div
                    key={child.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div>
                      {/* Top bar with avatar & status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 font-bold text-blue-700 text-sm shadow-2xs">
                            {child.name.split(' ')[0]?.[0] || 'У'}
                            {child.name.split(' ')[1]?.[0] || ''}
                          </div>
                          <div>
                            <Link
                              href={`/students/${child.id}`}
                              className="font-bold text-slate-900 text-sm hover:text-blue-600 hover:underline block"
                            >
                              {child.name}
                            </Link>
                            <span className="text-[11px] text-slate-500">{child.age}</span>
                          </div>
                        </div>
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-[10px] font-bold border',
                            child.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          )}
                        >
                          {child.status === 'active' ? 'Активен' : 'Пробный'}
                        </span>
                      </div>

                      {/* Groups & Courses */}
                      {child.groups && child.groups.length > 1 ? (
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-800">
                              Группы обучения ({child.groups.length}):
                            </span>
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                              {child.groups.length} группы
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {child.groups.map((grp, gIdx) => (
                              <div
                                key={grp.id || gIdx}
                                className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                                    {grp.name}
                                  </span>
                                  {grp.courseName && (
                                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/50">
                                      {grp.courseName}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                                  {grp.teacherName && (
                                    <span>Преподаватель: <strong className="text-slate-700">{grp.teacherName}</strong></span>
                                  )}
                                  {grp.schedule && (
                                    <span>Расписание: <span className="text-slate-600">{grp.schedule}</span></span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-slate-600 pt-1">
                            Посещаемость: <strong className="text-emerald-600">{child.attendance}</strong>
                          </p>
                        </div>
                      ) : (
                        <div className="mt-4 space-y-2">
                          <span className="inline-block rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200/60">
                            {child.course || child.groups?.[0]?.courseName || 'Основной курс'}
                          </span>
                          <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p>
                              Группа: <strong>{child.group || child.groups?.[0]?.name}</strong>
                            </p>
                            <p>Преподаватель: {child.teacher || child.groups?.[0]?.teacherName}</p>
                            {child.groups?.[0]?.schedule && (
                              <p>Расписание: {child.groups[0].schedule}</p>
                            )}
                            <p>
                              Посещаемость: <strong className="text-emerald-600">{child.attendance}</strong>
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Child Balance Box */}
                      <div className="mt-3.5 rounded-xl border p-3 flex items-center justify-between gap-2 text-xs bg-white shadow-2xs">
                        <div className="flex items-center gap-1.5">
                          {cFinance.debt > 0 ? (
                            <span className="font-bold text-rose-700 flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                              Долг: -{cFinance.debt.toLocaleString('ru-RU')} {cFinance.currency}
                            </span>
                          ) : cFinance.deposit > 0 ? (
                            <span className="font-bold text-emerald-700 flex items-center gap-1">
                              <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                              Депозит: +{cFinance.deposit.toLocaleString('ru-RU')} {cFinance.currency}
                            </span>
                          ) : (
                            <span className="font-semibold text-slate-600 flex items-center gap-1">
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                              Счета оплачены (0 {cFinance.currency})
                            </span>
                          )}
                        </div>
                        {cFinance.debt > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentModalStudentId(child.id);
                              setIsPaymentModalOpen(true);
                            }}
                            className="rounded-lg bg-rose-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-rose-700 transition-colors cursor-pointer"
                          >
                            Погасить долг
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentModalStudentId(child.id);
                              setIsPaymentModalOpen(true);
                            }}
                            className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                          >
                            + Платёж
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">ID: {child.id}</span>
                      <Link
                        href={`/students/${child.id}`}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                      >
                        Перейти в карточку ученика <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ФИНАНСЫ И АБОНЕМЕНТЫ */}
      {activeTab === 'finance' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                Финансы и история оплат семьи ({filteredPayments.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Сквозной учёт платежей по каждому ребёнку семьи в EUR и RUB с детализацией по курсам и абонементам
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPaymentModalStudentId(undefined);
                setIsPaymentModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all active:scale-98 shrink-0 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Добавить платёж
            </button>
          </div>

          {/* Financial KPI stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5">
              <span className="text-[11px] font-semibold text-emerald-800">Всего оплачено за всё время</span>
              <p className="text-xl font-bold text-emerald-700 mt-0.5">
                {familyTotalPaid.toLocaleString('ru-RU')} ₽
              </p>
            </div>
            <div
              className={cn(
                'rounded-xl border p-3.5',
                familyFinancialSummary.debt > 0 ? 'border-rose-200 bg-rose-50/60' : 'border-slate-100 bg-slate-50/60'
              )}
            >
              <span
                className={cn(
                  'text-[11px] font-semibold',
                  familyFinancialSummary.debt > 0 ? 'text-rose-700' : 'text-slate-500'
                )}
              >
                Задолженность
              </span>
              <p
                className={cn(
                  'text-xl font-bold mt-0.5',
                  familyFinancialSummary.debt > 0 ? 'text-rose-700' : 'text-slate-700'
                )}
              >
                {familyFinancialSummary.formattedDebt}
              </p>
            </div>
            <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3.5">
              <span className="text-[11px] font-semibold text-teal-800">Депозит семьи (предоплата)</span>
              <p className="text-xl font-bold text-teal-700 mt-0.5">
                {familyFinancialSummary.formattedDeposit}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
              <span className="text-[11px] font-semibold text-slate-500">Количество платежей</span>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {filteredPayments.length}
              </p>
            </div>
          </div>

          {/* Multi-child filter tabs */}
          {parent.children.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Фильтр по детям:
              </span>
              <button
                type="button"
                onClick={() => setPaymentChildFilter('all')}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                  paymentChildFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                Все дети ({familyPayments.length})
              </button>
              {parent.children.map((ch) => {
                const count = familyPayments.filter((p) => p.studentId === ch.id).length;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setPaymentChildFilter(ch.id)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                      paymentChildFilter === ch.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {ch.name} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Payments Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="py-3 pl-4 pr-3">Ребёнок</th>
                  <th className="px-3 py-3">Дата</th>
                  <th className="px-3 py-3">Период</th>
                  <th className="px-3 py-3">Курс / Группа</th>
                  <th className="px-3 py-3">Сумма</th>
                  <th className="px-3 py-3">Способ</th>
                  <th className="py-3 pl-3 pr-4 text-right">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      История оплат по выбранным критериям пуста.{' '}
                      <button
                        type="button"
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="text-emerald-600 font-semibold hover:underline cursor-pointer"
                      >
                        Внести платёж
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 pl-4 pr-3">
                        <Link
                          href={`/students/${pay.studentId}`}
                          className="font-bold text-slate-900 hover:text-blue-600 hover:underline flex items-center gap-1.5"
                        >
                          <span className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {pay.studentName[0]}
                          </span>
                          <span>{pay.studentName}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-900">{pay.date}</td>
                      <td className="px-3 py-3 text-slate-600">{pay.period}</td>
                      <td className="px-3 py-3 text-slate-600">
                        <div className="font-medium text-slate-800">{pay.courseName}</div>
                        <div className="text-[11px] text-slate-400">{pay.groupName}</div>
                      </td>
                      <td className="px-3 py-3 font-bold text-slate-900">{pay.amount}</td>
                      <td className="px-3 py-3 text-slate-500">{pay.method}</td>
                      <td className="py-3 pl-3 pr-4 text-right">
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-0.5 font-bold text-[10px]',
                            pay.status === 'paid' && 'bg-emerald-100 text-emerald-800',
                            pay.status === 'overdue' && 'bg-rose-100 text-rose-800',
                            pay.status === 'expected' && 'bg-amber-100 text-amber-800'
                          )}
                        >
                          {pay.status === 'paid' ? 'Оплачено' : pay.status === 'overdue' ? 'Долг' : 'Ожидается'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: TIMELINE (ЕДИНЫЙ ТАЙМЛАЙН СЕМЬИ) */}
      {activeTab === 'timeline' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              История взаимодействий с семьей (Единый Timeline)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Сквозная история по всем детям и родителю с фиксацией звонков, переписок и изменений статусов
            </p>
          </div>

          {/* Quick note form with channel and target selection */}
          <form onSubmit={handleAddNote} className="space-y-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Кому:</span>
                <select
                  value={newNoteTargetChildId}
                  onChange={(e) => setNewNoteTargetChildId(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="parent">Родителю ({parent.firstName} {parent.lastName})</option>
                  {parent.children.map((ch) => (
                    <option key={ch.id} value={ch.id}>Ребёнку ({ch.name})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Канал:</span>
                <select
                  value={newNoteChannel}
                  onChange={(e) => setNewNoteChannel(e.target.value as any)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="telegram">Telegram</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="phone">Телефон (звонок)</option>
                  <option value="email">Email</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Записать результат общения с семьей / договоренности..."
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
                Записать
              </button>
            </div>
          </form>

          {/* Timeline Feed */}
          <div className="space-y-3 pt-2">
            {interactions.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                История взаимодействий пока пуста
              </div>
            ) : (
              sortTimelineChronologicalDesc(interactions).map((int) => {
                const target = getInteractionTargetInfo(int, undefined, parent);
                const isParentAction = target.role === 'parent';

                return (
                  <div key={int.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs space-y-1.5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{int.author}</span>
                        <span className="rounded bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200 uppercase">
                          {int.channel}
                        </span>

                        {isParentAction ? (
                          <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800 border border-purple-200">
                            Родитель: {target.name}
                          </span>
                        ) : (
                          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
                            Ученик: {target.name}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">{int.occurredAt}</span>
                    </div>
                    <p className="text-slate-700 pt-0.5 leading-relaxed">{int.content}</p>
                    {int.result && (
                      <p className="text-[11px] text-emerald-700 font-semibold">
                        Результат: {int.result}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 5: ЗАДАЧИ */}
      {activeTab === 'tasks' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-purple-600" />
                Задачи по семье и детям ({familyTasks.filter((t) => t.status === 'open').length} открытых)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Сквозной список задач по родителю и всем привязанным детям семьи
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition-all active:scale-98 shrink-0 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Поставить задачу
            </button>
          </div>

          {/* Task filter tabs */}
          <div className="flex items-center gap-2">
            {[
              { key: 'all', label: `Все задачи (${familyTasks.length})` },
              { key: 'open', label: `В работе (${familyTasks.filter((t) => t.status === 'open').length})` },
              { key: 'done', label: `Выполненные (${familyTasks.filter((t) => t.status === 'done').length})` },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setTaskStatusFilter(f.key as any)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                  taskStatusFilter === f.key
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredTasks.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-2">
              <CheckSquare className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">Нет задач по выбранным критериям</p>
              <button
                type="button"
                onClick={() => setIsCreateTaskModalOpen(true)}
                className="mt-2 inline-flex items-center gap-1 text-purple-600 font-bold hover:underline cursor-pointer"
              >
                + Создать новую задачу
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors text-xs",
                    task.status === 'done' ? "bg-slate-50/50" : "bg-white"
                  )}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleParentTask(task.id)}
                      className="mt-0.5 text-slate-400 hover:text-purple-600 transition-colors cursor-pointer shrink-0"
                      title={task.status === 'done' ? 'Открыть заново' : 'Отметить как выполненную'}
                    >
                      {task.status === 'done' ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <div className="h-4 w-4 rounded border-2 border-slate-300 hover:border-purple-500" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className={cn("font-bold text-slate-900 text-xs", task.status === 'done' && "line-through text-slate-400")}>
                        {task.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span>Срок: <strong className="text-slate-700">{task.dueDateFormatted || task.dueDate}</strong></span>
                        <span>Ответственный: <strong className="text-slate-700">{task.assignedTo}</strong></span>
                        {task.studentName && (
                          <span className="rounded bg-blue-50 px-1.5 py-0.2 text-blue-700 font-medium">
                            Ученик: {task.studentName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold border",
                      task.priority === 'high' ? "bg-rose-50 text-rose-700 border-rose-200" :
                      task.priority === 'medium' ? "bg-amber-50 text-amber-700 border-amber-200" :
                      "bg-slate-50 text-slate-600 border-slate-200"
                    )}>
                      {task.priority === 'high' ? 'Срочно' : task.priority === 'medium' ? 'Средний' : 'Обычный'}
                    </span>
                    <span className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                      task.status === 'done' ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                    )}>
                      {task.status === 'done' ? 'Выполнено' : 'В работе'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EDIT PARENT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Edit className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Изменение данных родителя</h3>
                  <p className="text-xs text-slate-500">Контакты, предпочтительные каналы и состав семьи</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveParent} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Имя</label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Фамилия</label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Телефон</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Канал отправки уведомлений и отчётов</label>
                  <select
                    value={editForm.preferredChannel}
                    onChange={(e) => setEditForm({ ...editForm, preferredChannel: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden bg-white"
                  >
                    <option value="Email">📧 Электронная почта (Email)</option>
                    <option value="Telegram">✈️ Telegram</option>
                    <option value="both">🔄 Почта и Telegram (Оба канала)</option>
                    <option value="WhatsApp">💬 WhatsApp</option>
                    <option value="Телефон">📞 Телефон</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Telegram</label>
                  <input
                    type="text"
                    value={editForm.telegram}
                    onChange={(e) => setEditForm({ ...editForm, telegram: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    placeholder="@username"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={editForm.whatsapp}
                    onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    placeholder="+79991234567"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Электронная почта (Email)</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  placeholder="name@example.com"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Заметки и особенности взаимодействия</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden resize-none"
                  placeholder="Удобное время для звонков, особенности..."
                />
              </div>

              {/* SECTION: ДЕТИ В СЕМЬЕ */}
              <div className="border-t border-slate-100 pt-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-900 text-xs">
                    Дети в семье ({editChildren.length})
                  </label>
                  {!isAddingChildInEdit && (
                    <button
                      type="button"
                      onClick={() => setIsAddingChildInEdit(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      + Добавить ребенка
                    </button>
                  )}
                </div>

                {/* List of current children */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {editChildren.length === 0 ? (
                    <p className="text-[11px] text-slate-400 py-1">К родителю пока не привязаны дети</p>
                  ) : (
                    editChildren.map((ch) => (
                      <div
                        key={ch.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/70 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">
                            {ch.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900">{ch.name}</span>
                            <span className="text-[10px] text-slate-500 ml-1.5">
                              {ch.groups && ch.groups.length > 1
                                ? ch.groups.map((g) => g.name).join(', ')
                                : (ch.group || ch.groups?.[0]?.name || 'Без группы')}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditChildren((prev) => prev.filter((c) => c.id !== ch.id))}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                          title="Открепить ребенка"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Inline Add Child Form */}
                {isAddingChildInEdit && (
                  <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2 animate-in fade-in duration-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-blue-900">Добавление ребенка в семью</span>
                      <div className="flex rounded-md bg-white p-0.5 border border-blue-200 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setAddChildMode('existing')}
                          className={cn('px-2 py-0.5 rounded font-medium cursor-pointer', addChildMode === 'existing' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600')}
                        >
                          Из базы школы
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddChildMode('new')}
                          className={cn('px-2 py-0.5 rounded font-medium cursor-pointer', addChildMode === 'new' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600')}
                        >
                          Новый ребенок
                        </button>
                      </div>
                    </div>

                    {addChildMode === 'existing' ? (
                      <div className="space-y-2">
                        <select
                          value={selectedExistingStudentId}
                          onChange={(e) => setSelectedExistingStudentId(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                        >
                          <option value="">-- Выберите ученика из базы школы --</option>
                          {availableStudentsForFamily.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.firstName} {st.lastName} ({st.groups[0]?.name || 'Без группы'})
                            </option>
                          ))}
                        </select>
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setIsAddingChildInEdit(false)}
                            className="px-2 py-1 rounded text-[11px] text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            Отмена
                          </button>
                          <button
                            type="button"
                            onClick={handleAttachExistingChildInEdit}
                            disabled={!selectedExistingStudentId}
                            className="px-2.5 py-1 rounded bg-blue-600 text-white font-semibold text-[11px] hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                          >
                            Прикрепить
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Имя и фамилия ребенка"
                            value={newChildNameInEdit}
                            onChange={(e) => setNewChildNameInEdit(e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                          />
                          <select
                            value={newChildGroupInEdit}
                            onChange={(e) => setNewChildGroupInEdit(e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                          >
                            <option value="English B1 Teens">English B1 Teens</option>
                            <option value="Robotics Junior">Robotics Junior</option>
                            <option value="Kids Math Safari">Kids Math Safari</option>
                          </select>
                        </div>
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setIsAddingChildInEdit(false)}
                            className="px-2 py-1 rounded text-[11px] text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            Отмена
                          </button>
                          <button
                            type="button"
                            onClick={handleAddNewChildInEdit}
                            disabled={!newChildNameInEdit.trim()}
                            className="px-2.5 py-1 rounded bg-blue-600 text-white font-semibold text-[11px] hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                          >
                            Добавить ребенка
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  Сохранить изменения
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CHILD MODAL */}
      <AddChildModal
        isOpen={isAddChildModalOpen}
        onClose={() => setIsAddChildModalOpen(false)}
        parentId={parent.id}
        parentName={`${parent.firstName} ${parent.lastName}`}
        parentPhone={parent.phone}
        onChildAdded={handleChildAdded}
        existingChildrenIds={parent.children.map((c) => c.id)}
      />

      {/* CREATE TASK MODAL */}
      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        defaultParentId={parentId}
        parentScope={{
          id: parent.id,
          name: `${parent.firstName} ${parent.lastName}`.trim() || 'Родитель',
          children: parent.children.map((c) => ({ id: c.id, name: c.name })),
        }}
        onCreated={(newTask) => {
          setIsCreateTaskModalOpen(false);
          setFamilyTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)]);
          success(`Задача «${newTask.title}» добавлена в очередь семьи!`);
        }}
      />

      {/* RECORD PAYMENT MODAL */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentModalStudentId(undefined);
        }}
        initialParentId={parentId}
        initialStudentId={paymentModalStudentId || (paymentChildFilter !== 'all' ? paymentChildFilter : parent.children[0]?.id)}
        allowedStudents={parent.children.map((c) => ({ id: c.id, name: c.name }))}
        onRecorded={() => {
          setRefreshTrigger((prev) => prev + 1);
          success('Платёж успешно зафиксирован в карточке семьи!');
        }}
      />
    </div>
  );
}
