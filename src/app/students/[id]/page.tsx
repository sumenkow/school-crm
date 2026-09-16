'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { INITIAL_STUDENTS, INITIAL_GROUPS, FullStudentData, TimelineInteraction, TeacherComment } from '@/lib/data/mockData';
import { getCombinedStudentTimeline, saveInteractionToStorage, getInteractionTargetInfo } from '@/lib/data/timelineStorage';
import { getStudentById, saveStudentToStorage, deductLessonFromDeposit, reconcileAllStudentDepositsAndDebts } from '@/lib/data/studentStorage';
import { getStudentFinancialSummary } from '@/lib/data/balanceHelper';
import { excludeStudentFromGroup, enrollStudentToGroup } from '@/lib/data/groupStorage';
import { RecordPaymentModal } from '@/components/finance/RecordPaymentModal';
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
  UserCheck,
  FileText,
  Check,
  MessageSquarePlus,
  BookOpen,
  X,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { getTasksForStudent, updateUnifiedTaskStatus } from '@/lib/data/taskManager';
import { saveTaskToStorage } from '@/lib/data/taskStorage';
import { getUpcomingPaymentForStudent } from '@/lib/data/upcomingPaymentsHelper';
import { UpcomingPaymentAlert } from '@/components/common/UpcomingPaymentAlert';
import { formatAgeAndGrade, formatGradeRussian, formatBirthDate } from '@/lib/data/studentAgeHelper';
import type { Task } from '@/types';
import type { FullTaskData } from '@/lib/data/mockData';

export default function StudentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { userName } = useRole();
  const studentId = params.id as string;

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

  const [activeTab, setActiveTab] = useState<'profile' | 'education' | 'attendance' | 'teacher_comments' | 'finance' | 'timeline' | 'tasks'>('profile');

  // Selected parent and task for modal window
  const [selectedParentForModal, setSelectedParentForModal] = useState<any | null>(null);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<Task | null>(null);

  // Edit student modal state
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
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
      content: `Ученик достиг совершеннолетия и конвертирован в статус «Студент (18+)». Прямой контакт: ${directPhone}. Данные родителей (${parentsNames || 'нет'}) сохранены как семейные контакты.`,
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
        `Конвертирован в студента (18+) ${new Date().toLocaleDateString('ru-RU')}. Данные родителей унаследованы.`
      ].filter(Boolean).join('\n\n'),
      interactions: [conversionInteraction, ...student.interactions],
    };

    setStudent(updatedStudent);
    saveStudentToStorage(updatedStudent);
    saveInteractionToStorage(conversionInteraction);
    setIsConvertAdultModalOpen(false);
    toast.success(`Ученик успешно конвертирован в статус «Студент (18+)» с сохранением данных родителей!`);
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
      changes.push(`Тип: ${student.studentType === 'adult_student' ? 'Студент 18+' : 'Школьник'} → ${newStudentType === 'adult_student' ? 'Студент 18+' : 'Школьник'}`);
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

    const updatedComments = [newComment, ...(student.teacherComments || [])];

    setStudent((prev) => ({
      ...prev,
      teacherComments: updatedComments,
    }));

    // Sync with in-memory INITIAL_STUDENTS
    const idx = INITIAL_STUDENTS.findIndex((s) => s.id === student.id);
    if (idx !== -1) {
      INITIAL_STUDENTS[idx] = {
        ...INITIAL_STUDENTS[idx],
        teacherComments: updatedComments,
      };
    }

    setNewTeacherCommentText('');
    setNewTeacherCommentTopic('');
    toast.success('Комментарий преподавателя добавлен в карточку ученика!');
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

    toast.success(isStudent
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
          Назад к списку учеников
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">{student.firstName} {student.lastName}</span>
      </div>

      {/* Hero Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
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
                  {student.status === 'active' && 'Активен'}
                  {student.status === 'trial' && 'Пробный'}
                  {student.status === 'paused' && 'На паузе'}
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
                      Студент (18+)
                    </>
                  ) : (
                    <>
                      <span>Школьник</span>
                    </>
                  )}
                </span>

                {/* Hero Balance Badge */}
                {studentDeposit > 0 ? (
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1 shadow-2xs">
                    <Wallet className="h-3 w-3 text-emerald-600" />
                    Депозит: {finSummary.formattedDeposit}
                  </span>
                ) : studentOverdueDebt > 0 ? (
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1 shadow-2xs animate-pulse">
                    <AlertTriangle className="h-3 w-3 text-rose-600" />
                    Долг: {finSummary.formattedDebt}
                  </span>
                ) : (
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1 shadow-2xs">
                    <Clock className="h-3 w-3 text-amber-600" />
                    Баланс: 0 € (требуется пополнение)
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
                Конвертировать в студента (18+)
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50/80 px-3 py-1.5 text-xs font-medium text-purple-700 border border-purple-200/80">
                <GraduationCap className="h-3.5 w-3.5 text-purple-600" />
                Студент (18+)
              </span>
            )}
            <button
              onClick={handleOpenEditStudentModal}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <Edit className="h-3.5 w-3.5 text-blue-600" />
              Изменить
            </button>
            <button
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <CheckSquare className="h-3.5 w-3.5 text-purple-600" />
              Создать задачу
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
              Добавить действие
            </button>
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Добавить платёж
            </button>
          </div>
        </div>

        {/* Quick summary strip */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3 border-t border-slate-100 pt-4 text-xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Группы ({student.groups.length}):</span>
              <button
                type="button"
                onClick={() => setIsEnrollGroupModalOpen(true)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5"
                title="Зачислить в группу"
              >
                <Plus className="h-3 w-3" />
                Зачислить
              </button>
            </div>
            {student.groups.length === 0 ? (
              <p className="font-semibold text-slate-400 mt-0.5">Не зачислен</p>
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
            <span className="text-slate-400">Посещаемость:</span>
            <p className="font-semibold text-emerald-600 mt-0.5">{student.attendanceStats.attendanceRate}</p>
          </div>
          <div>
            <span className="text-slate-400">Абонемент до:</span>
            <p className="font-semibold text-blue-600 mt-0.5">{student.finance.activeSubscription?.renewalDate || '—'}</p>
          </div>
          <div
            onClick={() => student.parents[0] && setSelectedParentForModal(student.parents[0])}
            className="cursor-pointer hover:bg-slate-50/80 p-1 rounded-lg transition-colors group"
            title="Нажмите, чтобы открыть карточку родителя"
          >
            <span className="text-slate-400">Основной контакт:</span>
            <p className="font-semibold text-slate-900 group-hover:text-blue-600 mt-0.5 flex items-center gap-1">
              {student.parents[0]?.firstName} ({student.parents[0]?.relationshipType}) ↗
            </p>
          </div>

          {/* 5th Column: Hero Balance Card */}
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
                Баланс:
              </span>
              {studentOverdueDebt > 0 ? (
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="text-[10px] font-bold text-rose-700 bg-white border border-rose-300 rounded px-1.5 py-0.5 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  Погасить
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="text-[10px] font-bold text-blue-700 bg-white border border-blue-300 rounded px-1.5 py-0.5 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  Пополнить
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
        </div>
      </div>

      {/* UPCOMING PAYMENT DEADLINE ALERT (Раздел 2 ТЗ) */}
      <UpcomingPaymentAlert
        item={getUpcomingPaymentForStudent(student.id)}
        onPaymentRecorded={() => {
          const fresh = getStudentById(student.id);
          if (fresh) setStudent(fresh);
        }}
      />

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-xs font-semibold">
        {[
          { key: 'profile', label: 'Профиль и Семья' },
          { key: 'education', label: 'Обучение и Группы' },
          { key: 'attendance', label: `Посещаемость (${student.attendanceStats.attendanceRate})` },
          { key: 'teacher_comments', label: `Комментарии учителя (${(student.teacherComments || []).length})` },
          { key: 'finance', label: 'Финансы и Абонементы' },
          { key: 'timeline', label: `Timeline (${student.interactions.length})` },
          { key: 'tasks', label: `Задачи (${student.tasks.filter((t) => t.status === 'open').length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
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
            {/* Editable Notes & Characteristics */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Заметки и особенности ученика
                </h3>
                {!isEditingNotes ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditedNotes(student.notes || '');
                      setIsEditingNotes(true);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    <Edit size={13} />
                    Редактировать
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingNotes(false)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                    >
                      <Check size={13} />
                      Сохранить
                    </button>
                  </div>
                )}
              </div>

              {!isEditingNotes ? (
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100 whitespace-pre-line">
                  {student.notes || 'Заметок об особенностях ученика пока нет. Нажмите «Редактировать», чтобы указать особенности характера, цели обучения или рекомендации.'}
                </p>
              ) : (
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    placeholder="Индивидуальные особенности, характер, пожелания родителей, цели обучения..."
                    className="w-full rounded-xl border border-blue-300 bg-white p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-400">
                    💡 Изменения сразу сохранятся в профиле ученика и будут видны учителям и администраторам.
                  </p>
                </div>
              )}
            </div>

            {/* Teaser for Teacher Comments on Profile tab */}
            <div className="rounded-2xl border border-purple-200/80 bg-gradient-to-r from-purple-50/50 via-white to-purple-50/30 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquarePlus className="h-4 w-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Комментарии учителя ({(student.teacherComments || []).length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('teacher_comments')}
                  className="text-xs font-bold text-purple-700 hover:underline"
                >
                  Все комментарии учителя →
                </button>
              </div>

              {(student.teacherComments || []).length === 0 ? (
                <p className="text-xs text-slate-500 bg-white p-3 rounded-xl border border-purple-100">
                  Преподаватели пока не оставляли комментариев. Комментарии можно оставлять в журнале посещаемости или во вкладке «Комментарии учителя».
                </p>
              ) : (
                <div className="space-y-2">
                  {(student.teacherComments || []).slice(0, 2).map((tc) => (
                    <div key={tc.id} className="rounded-xl border border-purple-100 bg-white p-3 text-xs space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{tc.author}</span>
                        <span className="text-[11px] text-slate-400">{tc.date}</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed line-clamp-2">{tc.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

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

      {/* TAB 2: ОБУЧЕНИЕ И ГРУППЫ */}
      {activeTab === 'education' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Текущие зачисления (Enrollments)</h3>
              <p className="text-xs text-slate-500">Ученик может параллельно обучаться в нескольких группах (например, грамматика и разговорный клуб)</p>
            </div>
            <button
              type="button"
              onClick={() => setIsEnrollGroupModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
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
                <div key={grp.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold text-blue-600 uppercase">{grp.courseName}</span>
                      <h4 className="text-base font-bold text-slate-900 mt-0.5">{grp.name}</h4>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                      Активна
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Преподаватель:</span>
                      <span className="font-semibold text-slate-800">{grp.teacherName}</span>
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

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleRemoveGroup(grp.id, grp.name)}
                      className="text-xs text-red-500 hover:text-red-700 hover:underline transition-colors"
                    >
                      Исключить из группы
                    </button>
                    <Link href={`/groups`} className="text-xs font-semibold text-blue-600 hover:underline">
                      Журнал группы →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ПОСЕЩАЕМОСТЬ */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs text-slate-400">Процент посещения:</span>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">{student.attendanceStats.attendanceRate}</p>
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

          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">История последних занятий</h4>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {student.attendanceStats.history.map((item, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50/60">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{item.date}</span>
                      <span className="text-slate-500">• {item.groupName}</span>
                    </div>
                    <p className="text-slate-600 mt-0.5">{item.topic}</p>
                    {item.notes && <p className="text-[11px] text-amber-600 mt-0.5">Причина: {item.notes}</p>}
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
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: КОММЕНТАРИИ УЧИТЕЛЯ (ТАЙМЛАЙН) */}
      {activeTab === 'teacher_comments' && (
        <div className="space-y-6">
          {/* Header & Add Comment Form */}
          <div className="rounded-2xl border border-purple-200/80 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquarePlus className="h-4 w-4 text-purple-600" />
                  Комментарии и отзывы преподавателей
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Таймлайн заметок преподавателя: успеваемость, поведение, выполнение ДЗ и рекомендации к ученику
                </p>
              </div>
            </div>

            {/* Quick Add Teacher Comment Form */}
            <form onSubmit={handleAddTeacherComment} className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-slate-600 font-medium block mb-1">Группа / занятие:</label>
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
                rows={3}
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
                  Добавить в таймлайн ученика
                </button>
              </div>
            </form>
          </div>

          {/* Teacher Comments Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Хронология комментариев преподавателей ({student.teacherComments?.length || 0})
            </h4>

            {(!student.teacherComments || student.teacherComments.length === 0) ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
                Комментариев преподавателя пока нет. Вы можете оставить первый комментарий через форму выше или при заполнении журнала посещаемости.
              </div>
            ) : (
              <div className="space-y-3">
                {student.teacherComments.map((tc) => {
                  const categoryBadge = {
                    progress: { label: 'Успеваемость и прогресс', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                    homework: { label: 'Домашнее задание', color: 'bg-blue-100 text-blue-800 border-blue-200' },
                    behavior: { label: 'Поведение', color: 'bg-amber-100 text-amber-800 border-amber-200' },
                    general: { label: 'Общий отзыв', color: 'bg-slate-100 text-slate-700 border-slate-200' },
                  }[tc.category] || { label: 'Отзыв', color: 'bg-slate-100 text-slate-700 border-slate-200' };

                  return (
                    <div
                      key={tc.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-xs space-y-2.5 hover:shadow-sm transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{tc.author}</span>
                          <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-bold border', categoryBadge.color)}>
                            {categoryBadge.label}
                          </span>
                          {tc.groupName && (
                            <span className="rounded-md bg-purple-50 text-purple-700 px-2 py-0.5 text-[10px] font-semibold border border-purple-100">
                              {tc.groupName}
                            </span>
                          )}
                          {tc.lessonTopic && (
                            <span className="text-[11px] text-slate-500 font-medium">
                              Тема: {tc.lessonTopic}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                          {tc.date}
                        </span>
                      </div>

                      <p className="text-slate-800 leading-relaxed text-xs whitespace-pre-line">
                        {tc.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ФИНАНСЫ И АБОНЕМЕНТЫ */}
      {activeTab === 'finance' && (
        <div className="space-y-6">
          {/* Current Subscription Card */}
          {student.finance.activeSubscription && (
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Текущий абонемент</span>
                  <h4 className="text-lg font-bold text-slate-900 mt-0.5">Период: {student.finance.activeSubscription.period}</h4>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  Активен
                </span>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border-t border-blue-200/50 pt-3">
                <div>
                  <span className="text-slate-500">Стоимость периода:</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5">{student.finance.activeSubscription.price}</p>
                </div>
                <div>
                  <span className="text-slate-500">Посещено занятий:</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5">{student.finance.activeSubscription.lessonsAttended}</p>
                </div>
                <div>
                  <span className="text-slate-500">Дата следующего продления:</span>
                  <p className="text-base font-bold text-blue-700 mt-0.5">{student.finance.activeSubscription.renewalDate}</p>
                </div>
              </div>
            </div>
          )}

          {/* Deposit & Prepayment Card */}
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/70 to-teal-50/50 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Баланс предоплаты (депозит)
                  </span>
                  <h4 className="text-xl font-bold text-slate-900 mt-0.5">
                    {student.finance.deposit?.balanceFormatted || `${(student.finance.deposit?.balance || 0).toLocaleString('ru-RU')} ₽`}
                  </h4>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDeductDeposit}
                  disabled={(student.finance.deposit?.balance || 0) <= 0}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer',
                    (student.finance.deposit?.balance || 0) > 0
                      ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                      : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                  )}
                  title="Списать стоимость одного онлайн-занятия с баланса предоплаты"
                >
                  <MinusCircle className="h-3.5 w-3.5 text-amber-700" />
                  Списать занятие (-{student.finance.deposit?.pricePerLessonFormatted || '1 050 ₽'})
                </button>
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Пополнить депозит
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border-t border-emerald-200/50 pt-3">
              <div>
                <span className="text-slate-500">Стоимость 1 онлайн-занятия:</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">
                  {student.finance.deposit?.pricePerLessonFormatted || '1 050 ₽'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Остаток оплаченных уроков:</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">
                  {Math.max(
                    0,
                    Math.floor((student.finance.deposit?.balance || 0) / (student.finance.deposit?.pricePerLesson || 1050))
                  )}{' '}
                  занятий
                </p>
              </div>
              <div>
                <span className="text-slate-500">Статус депозита:</span>
                <p className="mt-0.5">
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-[10px] font-bold border',
                      (student.finance.deposit?.balance || 0) > 0
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                    )}
                  >
                    {(student.finance.deposit?.balance || 0) > 0 ? 'Баланс положительный' : 'Требуется пополнение'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Payment History Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">История оплат ученика</h4>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Внести платёж
              </button>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="py-3 pl-4 pr-3">Дата</th>
                  <th className="px-3 py-3">Период</th>
                  <th className="px-3 py-3">Сумма</th>
                  <th className="px-3 py-3">Способ</th>
                  <th className="py-3 pl-3 pr-4 text-right">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {(!student.finance?.payments || student.finance.payments.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      История оплат пуста. Нажмите «Внести платёж», чтобы добавить запись.
                    </td>
                  </tr>
                ) : (
                  student.finance.payments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-50/70">
                      <td className="py-3 pl-4 pr-3 font-semibold text-slate-900">{pay.date}</td>
                      <td className="px-3 py-3">{pay.period}</td>
                      <td className="px-3 py-3 font-bold text-slate-900">{pay.amount}</td>
                      <td className="px-3 py-3 text-slate-500">{pay.method}</td>
                      <td className="py-3 pl-3 pr-4 text-right">
                        <span className={cn(
                          'rounded-full px-2 py-0.5 font-semibold text-[10px]',
                          pay.status === 'paid' && 'bg-emerald-100 text-emerald-800',
                          pay.status === 'overdue' && 'bg-rose-100 text-rose-800'
                        )}>
                          {pay.status === 'paid' ? 'Оплачено' : 'Долг'}
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

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>Дата следующего действия (Follow-up):</span>
                <input
                  type="date"
                  value={newFollowUpDate}
                  onChange={(e) => setNewFollowUpDate(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-800"
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

          {/* Timeline Feed */}
          <div className="space-y-4">
            {getCombinedStudentTimeline(
              student.id,
              student.interactions,
              (student.parents || []).map((p) => p.id)
            ).map((int) => {
              const target = getInteractionTargetInfo(int, student);
              const isParentAction = target.role === 'parent';

              return (
                <div key={int.id} className="relative flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      isParentAction ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                    )}
                  >
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{int.author}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">
                          {int.channel}
                        </span>

                        {isParentAction ? (
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
                      <span className="text-xs text-slate-400">{int.occurredAt}</span>
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
            })}
          </div>
        </div>
      )}

      {/* TAB 6: ЗАДАЧИ */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Задачи по ученику и семье</h3>
            <button
              type="button"
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Новая задача
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs divide-y divide-slate-100">
            {student.tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => setSelectedTaskForModal(task)}
                className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTask(task.id);
                    }}
                    className="mt-0.5 text-slate-400 hover:text-blue-600"
                    title={task.status === 'done' ? 'Отметить как невыполненную' : 'Отметить как выполненную'}
                  >
                    {task.status === 'done' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <div className="h-4 w-4 rounded border-2 border-slate-300 hover:border-blue-500" />
                    )}
                  </button>
                  <div>
                    <h4 className={cn('text-sm font-semibold group-hover:text-blue-600 transition-colors', task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-900')}>
                      {task.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Срок: <strong>{task.dueDate}</strong> • Ответственный: {task.assignedTo}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                    task.priority === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  )}>
                    {task.priority === 'high' ? 'Срочно' : 'Средний'}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
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

      {/* TASK DETAILS MODAL (Opens on clicking task card) */}
      {selectedTaskForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                  selectedTaskForModal.priority === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                )}>
                  {selectedTaskForModal.priority === 'high' ? 'Срочная задача' : 'Обычная задача'}
                </span>
                <span className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] font-bold border',
                  selectedTaskForModal.status === 'done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                )}>
                  {selectedTaskForModal.status === 'done' ? 'Выполнена' : 'В работе'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskForModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedTaskForModal.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Ученик: {student.firstName} {student.lastName}</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Срок выполнения:</span>
                  <span className="font-bold text-slate-800">{selectedTaskForModal.dueDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ответственный:</span>
                  <span className="font-semibold text-slate-800">{selectedTaskForModal.assignedTo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Тип задачи:</span>
                  <span className="font-medium text-slate-700">{selectedTaskForModal.taskType || 'Звонок / Согласование'}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    handleToggleTask(selectedTaskForModal.id);
                    setSelectedTaskForModal((prev) => prev ? { ...prev, status: prev.status === 'done' ? 'open' : 'done' } : null);
                    toast.success('Статус задачи обновлен!');
                  }}
                  className={cn(
                    'flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-colors',
                    selectedTaskForModal.status === 'done'
                      ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                  )}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {selectedTaskForModal.status === 'done' ? 'Вернуть в работу' : 'Отметить как выполненную'}
                </button>
              </div>
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
                  <h3 className="text-base font-bold text-slate-900">Конвертация в студента (18+)</h3>
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
                  Подтвердить перевод в студента (18+)
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
    </div>
  );
}
