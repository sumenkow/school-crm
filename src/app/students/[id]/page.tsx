'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { INITIAL_STUDENTS, FullStudentData, TimelineInteraction, TeacherComment } from '@/lib/data/mockData';
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
  Plus,
  Edit,
  Send,
  CheckSquare,
  Sparkles,
  ChevronRight,
  UserCheck,
  FileText,
  Check,
  MessageSquarePlus,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import type { Task } from '@/types';
import type { FullTaskData } from '@/lib/data/mockData';

export default function StudentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { userName } = useRole();
  const studentId = params.id as string;

  const [student, setStudent] = useState<FullStudentData>(() => {
    return INITIAL_STUDENTS.find((s) => s.id === studentId) || INITIAL_STUDENTS[0];
  });

  const [activeTab, setActiveTab] = useState<'profile' | 'education' | 'attendance' | 'teacher_comments' | 'finance' | 'timeline' | 'tasks'>('profile');

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

    setStudent((prev) => ({
      ...prev,
      tasks: [taskItem, ...prev.tasks],
    }));

    const idx = INITIAL_STUDENTS.findIndex((s) => s.id === student.id);
    if (idx !== -1) {
      INITIAL_STUDENTS[idx] = {
        ...INITIAL_STUDENTS[idx],
        tasks: [taskItem, ...(INITIAL_STUDENTS[idx].tasks || [])],
      };
    }

    toast.success(`Задача «${newTask.title}» успешно создана для ученика!`);
    setIsCreateTaskModalOpen(false);
  };

  const handleSaveNotes = () => {
    const updatedNotes = editedNotes.trim();
    setStudent((prev) => ({ ...prev, notes: updatedNotes }));

    // Sync with in-memory INITIAL_STUDENTS
    const idx = INITIAL_STUDENTS.findIndex((s) => s.id === student.id);
    if (idx !== -1) {
      INITIAL_STUDENTS[idx] = { ...INITIAL_STUDENTS[idx], notes: updatedNotes };
    }

    setIsEditingNotes(false);
    toast.success('Заметки и особенности ученика сохранены!');
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

  const handleAddInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const newEntry: TimelineInteraction = {
      id: `int_${Date.now()}`,
      studentId: student.id,
      occurredAt: 'Только что',
      channel: newChannel,
      type: 'follow_up',
      author: 'Вы (Текущий пользователь)',
      content: newNoteText,
      result: 'Зафиксировано в истории',
      nextAction: newFollowUpDate ? `Связаться ${newFollowUpDate}` : undefined,
      followUpDate: newFollowUpDate || undefined,
    };

    setStudent((prev) => ({
      ...prev,
      interactions: [newEntry, ...prev.interactions],
    }));

    setNewNoteText('');
    setNewFollowUpDate('');
  };

  const handleToggleTask = (taskId: string) => {
    setStudent((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId ? { ...t, status: t.status === 'done' ? 'open' : 'done' } : t
      ),
    }));
  };

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
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                {student.birthDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    Д/Р: {student.birthDate} (14 лет)
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
              Записать контакт
            </button>
            <button
              onClick={() => setActiveTab('finance')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Принять оплату
            </button>
          </div>
        </div>

        {/* Quick summary strip */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-100 pt-4 text-xs">
          <div>
            <span className="text-slate-400">Группа:</span>
            <p className="font-semibold text-slate-900 mt-0.5">{student.groups[0]?.name || 'Не зачислен'}</p>
          </div>
          <div>
            <span className="text-slate-400">Посещаемость:</span>
            <p className="font-semibold text-emerald-600 mt-0.5">{student.attendanceStats.attendanceRate}</p>
          </div>
          <div>
            <span className="text-slate-400">Абонемент до:</span>
            <p className="font-semibold text-blue-600 mt-0.5">{student.finance.activeSubscription?.renewalDate || '—'}</p>
          </div>
          <div>
            <span className="text-slate-400">Основной контакт:</span>
            <p className="font-semibold text-slate-900 mt-0.5">{student.parents[0]?.firstName} ({student.parents[0]?.relationshipType})</p>
          </div>
        </div>
      </div>

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
                  {student.notes || 'Заметок об особенностях ученика пока нет. Нажмите «Редактировать», чтобы указать аллергии, особенности характера или рекомендации.'}
                </p>
              ) : (
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    placeholder="Индивидуальные особенности, характер, пожелания родителей, аллергии..."
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
                  <div key={parent.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{parent.firstName} {parent.lastName}</span>
                        <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {parent.relationshipType}
                        </span>
                        {parent.isPrimary && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                            Основной контакт
                          </span>
                        )}
                      </div>
                      <Link href={`/parents/${parent.id}`} className="text-xs text-blue-600 hover:underline font-medium">
                        Профиль семьи →
                      </Link>
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
            <h3 className="text-sm font-bold text-slate-900">Текущие зачисления (Enrollments)</h3>
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700">
              <Plus className="h-3.5 w-3.5" />
              Зачислить в группу
            </button>
          </div>

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
                    <span className="text-slate-400">Дата начала:</span>
                    <span>{grp.joinedAt}</span>
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <Link href={`/groups`} className="text-xs font-semibold text-blue-600 hover:underline">
                    Перейти к журналу группы →
                  </Link>
                </div>
              </div>
            ))}
          </div>
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
                      item.status === 'present' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    )}
                  >
                    {item.status === 'present' ? 'Был' : 'Пропуск'}
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

          {/* Payment History Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">История оплат ученика</h4>
              <button className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline">
                <Plus className="h-3.5 w-3.5" /> Добавить платеж
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
                {student.finance.payments.map((pay) => (
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
                ))}
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
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Записать новое взаимодействие с клиентом</h4>
            <div className="flex flex-wrap items-center gap-3">
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
                  <option value="call">Очная встреча</option>
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
                Сохранить в Timeline
              </button>
            </div>
          </form>

          {/* Timeline Feed */}
          <div className="space-y-4">
            {student.interactions.map((int) => (
              <div key={int.id} className="relative flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{int.author}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">
                        {int.channel}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">{int.occurredAt}</span>
                  </div>
                  <p className="text-xs text-slate-700 pt-1 leading-relaxed">{int.content}</p>

                  {int.result && (
                    <p className="text-[11px] text-emerald-700 font-medium pt-1">
                      ✓ Результат: {int.result}
                    </p>
                  )}

                  {int.nextAction && (
                    <div className="mt-2 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-900 border border-amber-200/60 font-medium">
                      → Следующее действие: {int.nextAction}
                    </div>
                  )}
                </div>
              </div>
            ))}
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
              <div key={task.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleTask(task.id)}
                    className="mt-0.5 text-slate-400 hover:text-blue-600"
                  >
                    {task.status === 'done' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <div className="h-4 w-4 rounded border-2 border-slate-300 hover:border-blue-500" />
                    )}
                  </button>
                  <div>
                    <h4 className={cn('text-sm font-semibold', task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-900')}>
                      {task.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Срок: <strong>{task.dueDate}</strong> • Ответственный: {task.assignedTo}
                    </p>
                  </div>
                </div>
                <span className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                  task.priority === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                )}>
                  {task.priority === 'high' ? 'Срочно' : 'Средний'}
                </span>
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
      />
    </div>
  );
}
