'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { INITIAL_STUDENTS, FullStudentData, TimelineInteraction } from '@/lib/data/mockData';
import { getStoredStudents, saveStudentToStorage, reconcileAllStudentDepositsAndDebts } from '@/lib/data/studentStorage';
import { getCombinedParentTimeline, saveInteractionToStorage, getInteractionTargetInfo } from '@/lib/data/timelineStorage';
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
  CheckSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { AddChildModal, AddedChildData } from '@/components/parents/AddChildModal';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { RecordPaymentModal } from '@/components/finance/RecordPaymentModal';

export default function ParentDetailsPage() {
  const params = useParams();
  const { success } = useToast();
  const { userName } = useRole();
  const parentId = params.id as string;

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

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddChildModalOpen, setIsAddChildModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentChildFilter, setPaymentChildFilter] = useState<'all' | string>('all');

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

  const totalPaidAmount = useMemo(() => {
    return filteredPayments
      .filter((p) => p.status === 'paid' && !p.amount.startsWith('-'))
      .reduce((sum, p) => {
        const num = parseFloat(p.amount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        return sum + num;
      }, 0);
  }, [filteredPayments]);

  const totalDebtAmount = useMemo(() => {
    return filteredPayments
      .filter((p) => p.status === 'overdue')
      .reduce((sum, p) => {
        const num = parseFloat(p.amount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        return sum + num;
      }, 0);
  }, [filteredPayments]);

  const totalFamilyDeposit = useMemo(() => {
    const allStudents = typeof window !== 'undefined' ? getStoredStudents() : INITIAL_STUDENTS;
    const childIds = new Set(parent.children.map((c) => c.id));
    return allStudents
      .filter((s) => childIds.has(s.id) || s.parents?.some((p) => p.id === parentId))
      .reduce((sum, s) => sum + (s.finance?.deposit?.balance || 0), 0);
  }, [parent.children, parentId, refreshTrigger]);

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
          schedule: 'Пн, Чт • 18:45–20:15',
          status: 'active',
          joinedAt: new Date().toLocaleDateString('ru-RU'),
        },
      ],
      attendanceStats: {
        totalLessons: 0,
        presentCount: 0,
        absentCount: 0,
        rescheduledCount: 0,
        attendanceRate: newChild.attendance || '100%',
        history: [],
      },
      finance: {
        payments: [
          {
            id: `pay_${Date.now()}`,
            date: new Date().toLocaleDateString('ru-RU'),
            amount: newChild.price || '7 600 ₽',
            period: new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
            method: 'Банковская карта',
            status: newChild.paymentStatus === 'paid' ? 'paid' : 'expected',
          },
        ],
      },
      interactions: [childInteraction],
      tasks: [],
    };

    saveStudentToStorage(newStudentEntity);
    window.dispatchEvent(new CustomEvent('crm-students-changed', { detail: newStudentEntity }));

    success(`Ребенок ${newChild.name} успешно добавлен в семью!`);
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
    setEditChildren(parent.children);
    setIsAddingChildInEdit(false);
    setIsEditModalOpen(true);
  };

  const handleSaveParent = (e: React.FormEvent) => {
    e.preventDefault();
    setParent((prev) => ({
      ...prev,
      firstName: editForm.firstName.trim() || prev.firstName,
      lastName: editForm.lastName.trim() || prev.lastName,
      phone: editForm.phone.trim() || prev.phone,
      telegram: editForm.telegram.trim() || prev.telegram,
      whatsapp: editForm.whatsapp.trim() || prev.whatsapp,
      email: editForm.email.trim() || prev.email,
      preferredChannel: editForm.preferredChannel,
      notes: editForm.notes.trim(),
      children: editChildren,
    }));

    // Update parent info in storage for all attached children
    const allStudents = getStoredStudents();
    editChildren.forEach((ch) => {
      const student = allStudents.find((s) => s.id === ch.id) || INITIAL_STUDENTS.find((s) => s.id === ch.id);
      if (student) {
        const hasParent = student.parents?.some((p) => p.id === parent.id);
        if (!hasParent) {
          student.parents = [
            ...(student.parents || []),
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

    window.dispatchEvent(new CustomEvent('crm-students-changed'));
    success('Данные родителя и состав семьи успешно сохранены!');
    setIsEditModalOpen(false);
  };

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

  const [newNote, setNewNote] = useState('');

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const targetChild = parent.children[0];
    const newEntry: TimelineInteraction = {
      id: `int_${Date.now()}`,
      parentId: parent.id,
      parentName: `${parent.firstName} ${parent.lastName}`,
      studentId: targetChild?.id,
      studentName: targetChild?.name,
      targetType: 'parent',
      targetName: `${parent.firstName} ${parent.lastName}`,
      targetRole: 'Родитель',
      occurredAt: 'Только что',
      channel: 'telegram',
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Back link */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/parents" className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Назад к списку родителей
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">{parent.firstName} {parent.lastName}</span>
      </div>

      {/* Hero Parent Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 font-bold text-blue-700 text-2xl">
              {parent.firstName[0]}{parent.lastName[0]}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {parent.firstName} {parent.lastName}
                </h1>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                  Канал: {parent.preferredChannel}
                </span>

                {/* Hero Family Balance Badge */}
                {totalFamilyDeposit > 0 ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200 inline-flex items-center gap-1 shadow-2xs">
                    <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                    Депозит семьи: +{totalFamilyDeposit.toLocaleString('ru-RU')} ₽
                  </span>
                ) : totalDebtAmount > 0 ? (
                  <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200 inline-flex items-center gap-1 shadow-2xs animate-pulse">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                    Долг семьи: -{totalDebtAmount.toLocaleString('ru-RU')} ₽
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200 inline-flex items-center gap-1 shadow-2xs">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    Баланс семьи: 0 ₽ (требуется пополнение)
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
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2 text-xs font-semibold text-emerald-700 shadow-xs hover:bg-emerald-100 transition-colors"
            >
              <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
              Добавить платёж
            </button>
            <button
              type="button"
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/60 px-3.5 py-2 text-xs font-semibold text-blue-700 shadow-xs hover:bg-blue-100 transition-colors"
            >
              <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
              Поставить задачу
            </button>
            <button
              type="button"
              onClick={handleOpenEdit}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <Edit className="h-3.5 w-3.5 text-blue-600" />
              Изменить
            </button>
          </div>
        </div>

        {/* Family Balance 3-Card Summary Strip */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Balance Card */}
            <div className={cn(
              "rounded-xl p-3.5 border flex flex-col justify-between",
              totalFamilyDeposit > 0 && "bg-emerald-50/70 border-emerald-200",
              totalDebtAmount > 0 && "bg-rose-50/80 border-rose-200",
              totalFamilyDeposit === 0 && totalDebtAmount === 0 && "bg-amber-50/70 border-amber-200"
            )}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                  {totalFamilyDeposit > 0 ? (
                    <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                  ) : totalDebtAmount > 0 ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                  )}
                  Баланс семьи:
                </span>
                {totalDebtAmount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="text-[10px] font-bold text-rose-700 bg-white border border-rose-300 rounded px-2 py-0.5 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    Погасить долг
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="text-[10px] font-bold text-blue-700 bg-white border border-blue-300 rounded px-2 py-0.5 hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    Пополнить депозит
                  </button>
                )}
              </div>
              <p className={cn(
                "text-xl font-black mt-1",
                totalFamilyDeposit > 0 && "text-emerald-700",
                totalDebtAmount > 0 && "text-rose-700",
                totalFamilyDeposit === 0 && totalDebtAmount === 0 && "text-slate-900"
              )}>
                {totalFamilyDeposit > 0
                  ? `+${totalFamilyDeposit.toLocaleString('ru-RU')} ₽`
                  : totalDebtAmount > 0
                  ? `-${totalDebtAmount.toLocaleString('ru-RU')} ₽`
                  : '0 ₽'}
              </p>
              <p className={cn(
                "text-[11px] mt-0.5 font-medium",
                totalFamilyDeposit > 0 && "text-emerald-600",
                totalDebtAmount > 0 && "text-rose-600 font-semibold",
                totalFamilyDeposit === 0 && totalDebtAmount === 0 && "text-amber-800 font-semibold"
              )}>
                {totalFamilyDeposit > 0
                  ? 'Активный семейный депозит • списание за уроки'
                  : totalDebtAmount > 0
                  ? 'Просроченная задолженность по счетам'
                  : 'Баланс нулевой • требуется пополнение'}
              </p>
            </div>

            {/* Total Paid Card */}
            <div className="rounded-xl p-3.5 border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-slate-500">Всего оплачено за всё время:</span>
              <p className="text-xl font-bold text-slate-900 mt-1">{totalPaidAmount.toLocaleString('ru-RU')} ₽</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Суммарный объем оплат семьи</p>
            </div>

            {/* Children Status Card */}
            <div className="rounded-xl p-3.5 border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-slate-500">Дети на обучении:</span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {parent.children.length} {parent.children.length === 1 ? 'ребенок' : 'детей'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {parent.children.map((c) => c.name.split(' ')[0]).join(', ') || 'Нет привязанных'}
              </p>
            </div>
          </div>
        </div>

        {parent.notes && (
          <p className="mt-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
            💡 <strong>Заметка о родителе:</strong> {parent.notes}
          </p>
        )}
      </div>

      {/* Children of this parent */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Дети семьи ({parent.children.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ученики, привязанные к данному родителю в рамках единого семейного аккаунта
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddChildModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-98 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Добавить ребенка
          </button>
        </div>

        {parent.children.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
            <p className="font-semibold">К этому родителю пока не привязано ни одного ребенка</p>
            <button
              type="button"
              onClick={() => setIsAddChildModalOpen(true)}
              className="mt-2 inline-flex items-center gap-1 text-blue-600 font-bold hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              Добавить ребенка сейчас
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {parent.children.map((child) => (
              <div
                key={child.id}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col justify-between hover:border-blue-300 hover:bg-white transition-all shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-700 text-xs shadow-2xs">
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

                  {child.groups && child.groups.length > 1 ? (
                    <div className="mt-3 space-y-2">
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
                            className="rounded-lg border border-blue-100 bg-white p-2.5 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                                {grp.name}
                              </span>
                              {grp.courseName && (
                                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
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
                    <>
                      <p className="text-xs font-semibold text-blue-600 mt-3">
                        {child.course || child.groups?.[0]?.courseName || 'Основной курс'}
                      </p>
                      <div className="mt-2 space-y-1 text-xs text-slate-600">
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
                    </>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">ID: {child.id}</span>
                  <Link
                    href={`/students/${child.id}`}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Карточка ученика →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Family Finances & Payments Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              Финансы и история оплат семьи ({filteredPayments.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Сквозной учёт платежей по каждому ребёнку семьи с детализацией по курсам, абонементам и предоплатам
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsPaymentModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all active:scale-98 shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Добавить платёж
          </button>
        </div>

        {/* Financial KPI stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
            <span className="text-[11px] font-semibold text-emerald-800">Всего оплачено</span>
            <p className="text-lg font-bold text-emerald-700 mt-0.5">
              {totalPaidAmount.toLocaleString('ru-RU')} ₽
            </p>
          </div>
          <div
            className={cn(
              'rounded-xl border p-3',
              totalDebtAmount > 0 ? 'border-rose-200 bg-rose-50/60' : 'border-slate-100 bg-slate-50/60'
            )}
          >
            <span
              className={cn(
                'text-[11px] font-semibold',
                totalDebtAmount > 0 ? 'text-rose-700' : 'text-slate-500'
              )}
            >
              Задолженность
            </span>
            <p
              className={cn(
                'text-lg font-bold mt-0.5',
                totalDebtAmount > 0 ? 'text-rose-700' : 'text-slate-700'
              )}
            >
              {totalDebtAmount > 0 ? `${totalDebtAmount.toLocaleString('ru-RU')} ₽` : 'Нет задолженности'}
            </p>
          </div>
          <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3">
            <span className="text-[11px] font-semibold text-teal-800">Депозит семьи (предоплата)</span>
            <p className="text-lg font-bold text-teal-700 mt-0.5">
              {totalFamilyDeposit > 0 ? `${totalFamilyDeposit.toLocaleString('ru-RU')} ₽` : '0 ₽'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <span className="text-[11px] font-semibold text-slate-500">Количество платежей</span>
            <p className="text-lg font-bold text-slate-900 mt-0.5">
              {filteredPayments.length}
            </p>
          </div>
        </div>

        {/* Multi-child filter tabs */}
        {parent.children.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-500 mr-1">Фильтр по детям:</span>
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

      {/* Unified Family Timeline */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-600" />
          История взаимодействий с семьей (Единый Timeline)
        </h3>
        <p className="text-xs text-slate-500">
          Сквозная история по всем детям и родителю без дублирования записей
        </p>

        {/* Quick note form */}
        <form onSubmit={handleAddNote} className="flex gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Записать результат общения с родителем..."
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
          >
            <Send className="h-3.5 w-3.5" />
            Записать
          </button>
        </form>

        <div className="space-y-3 pt-2">
          {interactions.map((int) => {
            const target = getInteractionTargetInfo(int, undefined, parent);
            const isParentAction = target.role === 'parent';

            return (
              <div key={int.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs space-y-1">
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
                <p className="text-slate-700 pt-1 leading-relaxed">{int.content}</p>
                {int.result && <p className="text-[11px] text-emerald-700 font-medium">Результат: {int.result}</p>}
              </div>
            );
          })}
        </div>
      </div>

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
                  <p className="text-xs text-slate-500">Контакты, предпочтительные каналы и заметки</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
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
                  <label className="block font-semibold text-slate-700 mb-1">Основной канал связи</label>
                  <select
                    value={editForm.preferredChannel}
                    onChange={(e) => setEditForm({ ...editForm, preferredChannel: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden bg-white"
                  >
                    <option value="Telegram">Telegram</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Телефон">Телефон</option>
                    <option value="Email">Email</option>
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
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline"
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
                          className="text-slate-400 hover:text-rose-600 p-1 rounded"
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
                          className={cn('px-2 py-0.5 rounded font-medium', addChildMode === 'existing' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600')}
                        >
                          Из базы школы
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddChildMode('new')}
                          className={cn('px-2 py-0.5 rounded font-medium', addChildMode === 'new' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600')}
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
                            className="px-2 py-1 rounded text-[11px] text-slate-600 hover:bg-slate-100"
                          >
                            Отмена
                          </button>
                          <button
                            type="button"
                            onClick={handleAttachExistingChildInEdit}
                            disabled={!selectedExistingStudentId}
                            className="px-2.5 py-1 rounded bg-blue-600 text-white font-semibold text-[11px] hover:bg-blue-700 disabled:opacity-50"
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
                            className="px-2 py-1 rounded text-[11px] text-slate-600 hover:bg-slate-100"
                          >
                            Отмена
                          </button>
                          <button
                            type="button"
                            onClick={handleAddNewChildInEdit}
                            disabled={!newChildNameInEdit.trim()}
                            className="px-2.5 py-1 rounded bg-blue-600 text-white font-semibold text-[11px] hover:bg-blue-700 disabled:opacity-50"
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
        defaultStudentId={parent.children[0]?.id}
        onCreated={(newTask) => {
          setIsCreateTaskModalOpen(false);
          success(`Задача «${newTask.title}» добавлена в очередь!`);
        }}
      />

      {/* RECORD PAYMENT MODAL */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        initialParentId={parentId}
        initialStudentId={paymentChildFilter !== 'all' ? paymentChildFilter : parent.children[0]?.id}
        allowedStudents={parent.children.map((c) => ({ id: c.id, name: c.name }))}
        onRecorded={() => {
          setRefreshTrigger((prev) => prev + 1);
          success('Платёж успешно зафиксирован в карточке семьи!');
        }}
      />
    </div>
  );
}
