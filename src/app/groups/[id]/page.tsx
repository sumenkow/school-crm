'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { INITIAL_GROUPS, FullGroupData, INITIAL_STUDENTS, INITIAL_LESSONS, FullLessonData } from '@/lib/data/mockData';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  GraduationCap,
  MapPin,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  UserCheck,
  MoreHorizontal,
  Edit,
  Check,
  X,
  MessageSquare,
  Video,
  BookOpen,
  CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  getStoredGroups,
  saveGroupToStorage,
  getGroupById,
  excludeStudentFromGroup,
  enrollStudentToGroup,
} from '@/lib/data/groupStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { getStoredLessons, generateLessonsForGroupSchedule } from '@/lib/data/lessonStorage';
import { getStudentLessonPaymentStatus } from '@/lib/data/lessonPaymentStatusHelper';
import { ScheduleLessonModal } from '@/components/calendar/ScheduleLessonModal';
import { GroupScheduleBuilder, ScheduleBuilderState } from '@/components/groups/GroupScheduleBuilder';

export default function GroupDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { success } = useToast();
  const { role, userName } = useRole();
  const { t } = useLanguage();
  const groupId = params.id as string;

  const [group, setGroup] = useState<FullGroupData>(() => {
    return getGroupById(groupId) || INITIAL_GROUPS.find((g) => g.id === groupId) || INITIAL_GROUPS[0];
  });

  const [allLessons, setAllLessons] = useState<FullLessonData[]>(() => {
    return typeof window !== 'undefined' ? getStoredLessons() : INITIAL_LESSONS;
  });

  // Keep synced with unified storage
  React.useEffect(() => {
    const sync = () => {
      const fresh = getGroupById(groupId);
      if (fresh) setGroup(fresh);
      setAllLessons(getStoredLessons());
    };
    sync();
    window.addEventListener('crm-groups-changed', sync);
    window.addEventListener('crm-students-changed', sync);
    window.addEventListener('crm-lessons-changed', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('crm-groups-changed', sync);
      window.removeEventListener('crm-students-changed', sync);
      window.removeEventListener('crm-lessons-changed', sync);
      window.removeEventListener('focus', sync);
    };
  }, [groupId]);

  const parseLessonDateMs = (l: FullLessonData) => {
    if (!l.date) return 0;
    let iso = l.date;
    if (l.date.includes('.')) {
      const parts = l.date.split('.');
      if (parts.length === 3) iso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    const time = l.startTime && l.startTime.length >= 4 ? l.startTime : '00:00';
    const parsed = new Date(`${iso}T${time.length === 5 ? time + ':00' : time}`).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

  const groupLessons = React.useMemo(() => {
    return allLessons.filter(
      (l) =>
        l.groupId === group.id ||
        l.groupName === group.name ||
        (l.courseName === group.courseName && l.teacherName === group.teacherName)
    );
  }, [allLessons, group.id, group.name, group.courseName, group.teacherName]);

  const nowMs = Date.now();

  const scheduledLessons = React.useMemo(() => {
    return groupLessons
      .filter((l) => l.status === 'scheduled' || (l.status !== 'completed' && l.status !== 'cancelled' && parseLessonDateMs(l) >= nowMs))
      .sort((a, b) => parseLessonDateMs(a) - parseLessonDateMs(b));
  }, [groupLessons, nowMs]);

  const pastLessons = React.useMemo(() => {
    return groupLessons
      .filter((l) => l.status === 'completed' || l.status === 'cancelled' || (l.status !== 'scheduled' && parseLessonDateMs(l) < nowMs))
      .sort((a, b) => parseLessonDateMs(b) - parseLessonDateMs(a));
  }, [groupLessons, nowMs]);

  const [lessonsSubTab, setLessonsSubTab] = useState<'scheduled' | 'past'>(() => {
    return 'scheduled';
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isScheduleLessonOpen, setIsScheduleLessonOpen] = useState(false);
  const [scheduleBuilderState, setScheduleBuilderState] = useState<ScheduleBuilderState | null>(null);
  const [editForm, setEditForm] = useState({
    name: group.name,
    courseName: group.courseName,
    teacherName: group.teacherName,
    schedule: group.schedule,
    room: group.room,
    capacity: group.capacity,
    status: group.status,
    notes: group.notes || '',
    pricePerLesson: group.pricing?.pricePerLesson || 1050,
    pricePerMonth: group.pricing?.pricePerMonth || 7600,
    currency: group.pricing?.currency || 'RUB',
  });

  const handleOpenEdit = () => {
    setEditForm({
      name: group.name,
      courseName: group.courseName,
      teacherName: group.teacherName,
      schedule: group.schedule,
      room: group.room,
      capacity: group.capacity,
      status: group.status,
      notes: group.notes || '',
      pricePerLesson: group.pricing?.pricePerLesson || 1050,
      pricePerMonth: group.pricing?.pricePerMonth || 7600,
      currency: group.pricing?.currency || 'RUB',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const currencySign = editForm.currency === 'EUR' ? '€' : '₽';
    const numLesson = Number(editForm.pricePerLesson) || 1050;
    const numMonth = Number(editForm.pricePerMonth) || 7600;

    const updated: FullGroupData = {
      ...group,
      name: editForm.name.trim() || group.name,
      courseName: editForm.courseName.trim() || group.courseName,
      teacherName: editForm.teacherName.trim() || group.teacherName,
      schedule: editForm.schedule.trim() || group.schedule,
      room: editForm.room.trim() || group.room,
      capacity: Number(editForm.capacity) || group.capacity,
      status: editForm.status as any,
      notes: editForm.notes.trim() || undefined,
      pricing: {
        pricePerLesson: numLesson,
        pricePerLessonFormatted: `${numLesson.toLocaleString('ru-RU')} ${currencySign}`,
        pricePerMonth: numMonth,
        pricePerMonthFormatted: `${numMonth.toLocaleString('ru-RU')} ${currencySign} / месяц`,
        currency: editForm.currency as 'RUB' | 'EUR',
      },
    };
    setGroup(updated);
    saveGroupToStorage(updated);

    // Auto-generate scheduled lessons in calendar if enabled in builder
    let generatedNotice = '';
    if (scheduleBuilderState && scheduleBuilderState.generateLessons && scheduleBuilderState.daysOfWeek.length > 0) {
      const { createdCount } = generateLessonsForGroupSchedule({
        groupId: updated.id,
        groupName: updated.name,
        courseName: updated.courseName,
        teacherId: updated.teacherId,
        teacherName: updated.teacherName,
        room: updated.room,
        daysOfWeek: scheduleBuilderState.daysOfWeek,
        startTime: scheduleBuilderState.startTime,
        endTime: scheduleBuilderState.endTime,
        startDate: scheduleBuilderState.startDate,
        horizon: scheduleBuilderState.horizon,
        customEndDate: scheduleBuilderState.customEndDate,
        students: updated.students,
        topicPrefix: updated.courseName,
      });

      if (createdCount > 0) {
        setAllLessons(getStoredLessons());
        generatedNotice = ` В расписание сгенерировано ${createdCount} уроков.`;
      }
    }

    success(`Данные группы и расписание сохранены!${generatedNotice}`);
    setIsEditModalOpen(false);
  };

  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'students' | 'lessons' | 'settings'>(() => {
    if (initialTabParam === 'journal' || initialTabParam === 'lessons') {
      return 'lessons';
    }
    return 'students';
  });

  React.useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'journal' || tabParam === 'lessons') {
      setActiveTab('lessons');
    } else if (tabParam === 'students') {
      setActiveTab('students');
    } else if (tabParam === 'settings') {
      setActiveTab('settings');
    }
  }, [searchParams]);

  // Dynamic automatic calculation of free spots (Principle 9: One Source of Truth)
  const enrolledCount = group.students.length;
  const freeSpots = group.capacity - enrolledCount;
  const occupancyPercent = Math.min(100, Math.round((enrolledCount / group.capacity) * 100));

  // Quick enroll student state
  const [enrollMode, setEnrollMode] = useState<'db' | 'new'>('db');
  const [selectedDbStudentId, setSelectedDbStudentId] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');

  // Candidates from school database who are not in this group yet
  const allCurrentStudents = typeof window !== 'undefined' ? getStoredStudents() : INITIAL_STUDENTS;
  const existingEnrolledIds = new Set(group.students.map((s) => s.id));
  const availableStudentsFromDb = allCurrentStudents.filter((s) => !existingEnrolledIds.has(s.id));

  const handleQuickEnroll = (e: React.FormEvent) => {
    e.preventDefault();
    if (freeSpots <= 0) return;

    if (enrollMode === 'db') {
      const targetId = selectedDbStudentId || availableStudentsFromDb[0]?.id;
      if (!targetId) return;

      const { updatedGroup } = enrollStudentToGroup({
        groupId: group.id,
        studentId: targetId,
        authorName: userName,
      });

      if (updatedGroup) {
        setGroup(updatedGroup);
      }
      setSelectedDbStudentId('');
      success(`Ученик успешно зачислен в группу «${group.name}»!`);
    } else {
      if (!newStudentName.trim()) return;

      const newStudent = {
        id: `std_${Date.now()}`,
        name: newStudentName.trim(),
        status: 'active',
        attendanceRate: '100%',
        parentPhone: newStudentPhone.trim() || '+7 (999) 000-00-00',
        joinedAt: new Date().toLocaleDateString('ru-RU'),
      };

      const updatedWithNew = {
        ...group,
        students: [newStudent, ...group.students],
      };
      setGroup(updatedWithNew);
      saveGroupToStorage(updatedWithNew);

      setNewStudentName('');
      setNewStudentPhone('');
      success(`Новый ученик «${newStudent.name}» зачислен в группу!`);
    }
  };

  const handleRemoveStudent = (id: string, studentName?: string) => {
    if (confirm('Исключить ученика из состава этой группы?')) {
      const { updatedGroup } = excludeStudentFromGroup({
        groupId: group.id,
        groupName: group.name,
        studentId: id,
        studentName,
        authorName: userName,
      });

      if (updatedGroup) {
        setGroup(updatedGroup);
      } else {
        const updated = {
          ...group,
          students: group.students.filter((s) => s.id !== id),
        };
        setGroup(updated);
        saveGroupToStorage(updated);
      }

      success('Ученик исключен из группы. Наполняемость и карточка ученика обновлены!');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/groups" className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('groups.backToList', 'Назад к списку групп')}
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">{group.name}</span>
      </div>

      {/* Hero Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 font-bold text-white text-2xl shadow-sm">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  {t('groups.course', 'Курс:')} {group.courseName}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[10px] font-bold border',
                    group.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                  )}
                >
                  {group.status === 'active' ? t('groups.statusActive', 'Идут занятия') : t('groups.statusEnrolling', 'Идет набор')}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                {group.name}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <span className="flex items-center gap-1 font-medium text-slate-800">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {group.schedule}
                </span>
                <span className="flex items-center gap-1 font-medium text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200/60">
                  <Video className="h-3.5 w-3.5 text-blue-600" />
                  {t('groups.onlineClass', 'Онлайн-класс (Zoom / платформа)')}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  {t('groups.teacher', 'Преподаватель')}: <Link href={`/teachers`} className="font-semibold text-blue-600 hover:underline">{group.teacherName}</Link>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Уважаемые родители группы ${group.name}! Напоминаем о расписании онлайн-занятий: ${group.schedule}.`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
              title="WhatsApp"
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
              {t('groups.groupWhatsapp', 'WhatsApp группы')}
            </a>
            <Link
              href={`/calendar?group=${encodeURIComponent(group.name)}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              <Calendar className="h-3.5 w-3.5" />
              {t('groups.nearestLesson', 'Ближайший урок в календаре →')}
            </Link>
            <button
              type="button"
              onClick={() => setIsScheduleLessonOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Запланировать новое занятие
            </button>
            <button
              type="button"
              onClick={handleOpenEdit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Edit className="h-3.5 w-3.5 text-slate-500" />
              {t('action.edit', 'Изменить')}
            </button>
          </div>
        </div>

        {/* Dynamic Capacity Calculation Bar (Section 9 requirement) */}
        <div className="mt-6 rounded-xl bg-slate-50 p-4 border border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
            <div>
              <span className="text-slate-600 font-medium">
                {t('groups.capacity', 'Наполняемость')}:{' '}
                <strong className="text-slate-900 text-sm">{enrolledCount} {t('action.all', 'из')} {group.capacity} {t('groups.spots', 'мест')}</strong>
              </span>
            </div>
            <div>
              <span
                className={cn(
                  'rounded-full px-3 py-1 font-bold text-xs border',
                  freeSpots === 0
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : freeSpots <= 2
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                )}
              >
                {freeSpots === 0 ? t('groups.full', 'Группа заполнена') : `${t('groups.spotsLeft', 'Осталось мест:')} ${freeSpots}`}
              </span>
            </div>
          </div>
          <div className="mt-3 h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                freeSpots === 0 ? 'bg-rose-500' : occupancyPercent >= 75 ? 'bg-emerald-500' : 'bg-blue-500'
              )}
              style={{ width: `${occupancyPercent}%` }}
            />
          </div>
        </div>

        {/* Group Payment Status Strip (Clean status instead of raw tariffs) */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50/70 p-3.5 border border-emerald-200/80 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-semibold text-emerald-900">
              {t('groups.paymentSummary', 'Оплата занятий: Все оплачено / Без долгов')}
            </span>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200 shadow-2xs">
            {t('status.paid', 'Оплачено')}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('students')}
          className={cn(
            'pb-3 px-3 border-b-2 transition-all',
            activeTab === 'students' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-900'
          )}
        >
          {t('groups.tabRoster', 'Состав группы')} ({enrolledCount})
        </button>
        <button
          onClick={() => setActiveTab('lessons')}
          className={cn(
            'pb-3 px-3 border-b-2 transition-all',
            activeTab === 'lessons' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-900'
          )}
        >
          {t('groups.tabLessons', 'Занятия и Журнал')} ({groupLessons.length})
        </button>
      </div>

      {/* TAB 1: СОСТАВ ГРУППЫ */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          {/* Quick Add Student (if spots available) */}
          {freeSpots > 0 ? (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">{t('groups.enrollStudent', 'Зачислить ученика:')}</span>
                  <div className="flex rounded-lg bg-white p-0.5 border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setEnrollMode('db')}
                      className={cn(
                        'px-2.5 py-1 rounded-md transition-all font-semibold',
                        enrollMode === 'db' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      {t('groups.fromSchoolDb', 'Из базы школы')} ({availableStudentsFromDb.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnrollMode('new')}
                      className={cn(
                        'px-2.5 py-1 rounded-md transition-all font-semibold',
                        enrollMode === 'new' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      {t('groups.newStudent', 'Новый ученик')}
                    </button>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-blue-700">
                  {t('groups.spotsLeft', 'Осталось мест:')} <strong>{freeSpots}</strong>
                </span>
              </div>

              <form onSubmit={handleQuickEnroll} className="flex flex-col sm:flex-row items-center gap-2.5">
                {enrollMode === 'db' ? (
                  <div className="flex-1 w-full">
                    {availableStudentsFromDb.length > 0 ? (
                      <select
                        value={selectedDbStudentId || availableStudentsFromDb[0]?.id}
                        onChange={(e) => setSelectedDbStudentId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {availableStudentsFromDb.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.firstName} {s.lastName} ({s.studentType === 'adult_student' ? t('students.filterAdult', 'Студент') : t('students.filterSchool', 'Школьник')} • {s.phone || s.parents?.[0]?.phone || 'тел. не указан'})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-xs text-slate-500 italic p-2 bg-white rounded-xl border border-slate-200">
                        {t('parents.emptyChildren', 'Все действующие ученики школы уже состоят в этой группе.')}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex-1 w-full">
                      <input
                        type="text"
                        required
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        placeholder="Имя и фамилия нового ученика..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="w-full sm:w-56">
                      <input
                        type="tel"
                        value={newStudentPhone}
                        onChange={(e) => setNewStudentPhone(e.target.value)}
                        placeholder={t('groups.parentPhone', 'Телефон родителя')}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={enrollMode === 'db' && availableStudentsFromDb.length === 0}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {t('groups.enrollAction', 'Зачислить в группу')}
                </button>
              </form>
            </div>
          ) : (
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{t('groups.limitReached', 'Лимит мест исчерпан. Чтобы добавить ученика, увеличьте лимит мест группы.')}</span>
            </div>
          )}

          {/* Students Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="py-3.5 pl-4 pr-3">{t('students.colStudent', 'Ученик')}</th>
                  <th className="px-3 py-3.5">{t('groups.studentStatus', 'Статус в группе')}</th>
                  <th className="px-3 py-3.5">{t('groups.paymentStatus', 'Оплата занятий')}</th>
                  <th className="px-3 py-3.5">{t('groups.parentPhone', 'Телефон родителя')}</th>
                  <th className="px-3 py-3.5">{t('groups.enrolledDate', 'Дата зачисления')}</th>
                  <th className="px-3 py-3.5 text-center">{t('students.colAttendance', 'Посещаемость')}</th>
                  <th className="py-3.5 pl-3 pr-4 text-right">{t('students.colActions', 'Действия')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {group.students.map((student) => {
                  const payStatus = getStudentLessonPaymentStatus(student.id, student.status === 'trial');
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70">
                      <td className="py-3 pl-4 pr-3 font-semibold text-slate-900">
                        <Link href={`/students/${student.id}`} className="hover:text-blue-600">
                          {student.name}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn(
                          'rounded-full px-2 py-0.5 font-semibold text-[10px]',
                          student.status === 'active' && 'bg-emerald-100 text-emerald-800',
                          student.status === 'trial' && 'bg-purple-100 text-purple-800',
                          student.status === 'paused' && 'bg-amber-100 text-amber-800'
                        )}>
                          {student.status === 'active' && t('status.active', 'Активен')}
                          {student.status === 'trial' && t('status.trial', 'Пробный')}
                          {student.status === 'paused' && t('status.paused', 'На паузе')}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn('rounded-full px-2 py-0.5 font-bold text-[10px] border', payStatus.badgeClass)}>
                          {payStatus.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{student.parentPhone}</td>
                      <td className="px-3 py-3 text-slate-500">{student.joinedAt}</td>
                      <td className="px-3 py-3 text-center font-bold text-slate-800">{student.attendanceRate}</td>
                      <td className="py-3 pl-3 pr-4 text-right">
                        <button
                          onClick={() => handleRemoveStudent(student.id)}
                          className="text-xs text-rose-500 hover:text-rose-700 hover:underline"
                        >
                          {t('groups.exclude', 'Исключить')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ЗАНЯТИЯ И ЖУРНАЛ */}
      {activeTab === 'lessons' && (
        <div className="space-y-4">
          {/* Subtabs + Actions bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLessonsSubTab('scheduled')}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border',
                  lessonsSubTab === 'scheduled'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                )}
              >
                📅 Запланированные уроки ({scheduledLessons.length})
              </button>
              <button
                type="button"
                onClick={() => setLessonsSubTab('past')}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border',
                  lessonsSubTab === 'past'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                )}
              >
                📖 Прошедшие занятия ({pastLessons.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsScheduleLessonOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('groups.addLesson', 'Добавить урок')}
            </button>
          </div>

          {/* Lessons Table */}
          {(() => {
            const displayedLessons = lessonsSubTab === 'scheduled' ? scheduledLessons : pastLessons;

            if (displayedLessons.length === 0) {
              return (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {lessonsSubTab === 'scheduled' ? 'Нет запланированных уроков' : 'Нет прошедших уроков'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {lessonsSubTab === 'scheduled'
                      ? 'В расписании группы пока нет будущих занятий. Вы можете добавить новый урок.'
                      : 'История занятий пуста. Проведенные уроки будут отображаться здесь.'}
                  </p>
                  {lessonsSubTab === 'scheduled' && (
                    <button
                      type="button"
                      onClick={() => setIsScheduleLessonOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer mt-2"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Запланировать урок
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50/80 font-semibold text-slate-600">
                    <tr>
                      <th className="py-3.5 pl-4 pr-3">Дата и время</th>
                      <th className="px-3 py-3.5">Тема урока</th>
                      <th className="px-3 py-3.5">Локация / Ссылка</th>
                      <th className="px-3 py-3.5 text-center">Посещаемость</th>
                      <th className="px-3 py-3.5 text-center">Статус</th>
                      <th className="py-3.5 pl-3 pr-4 text-right">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {displayedLessons.map((l) => {
                      const totalStudents = l.students?.length || 0;
                      const presentCount = (l.students || []).filter((s) => s.attendanceStatus === 'present').length;
                      const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
                      const isCompleted = l.status === 'completed';

                      return (
                        <tr
                          key={l.id}
                          onClick={() => router.push(`/calendar/lessons/${l.id}`)}
                          className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                        >
                          {/* 1. Дата и время */}
                          <td className="py-3.5 pl-4 pr-3">
                            <div className="font-bold text-slate-900">
                              {l.dateFormatted || l.date}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {l.startTime}–{l.endTime}
                            </div>
                          </td>

                          {/* 2. Тема урока */}
                          <td className="px-3 py-3.5 max-w-xs">
                            <div className="font-semibold text-slate-900 line-clamp-1">
                              {l.topic || 'Занятие по расписанию'}
                            </div>
                            {l.homework && (
                              <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5" title={l.homework}>
                                <span className="font-medium text-slate-600">ДЗ:</span> {l.homework}
                              </div>
                            )}
                          </td>

                          {/* 3. Локация / Ссылка */}
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            {l.onlineMeetingUrl || l.room.toLowerCase().includes('онлайн') ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 border border-indigo-100">
                                <Video className="h-3 w-3 text-indigo-600 shrink-0" />
                                Онлайн (Zoom)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-700 text-[11px] font-medium">
                                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                {l.room}
                              </span>
                            )}
                          </td>

                          {/* 4. Посещаемость */}
                          <td className="px-3 py-3.5 text-center whitespace-nowrap">
                            {isCompleted ? (
                              <span className="font-semibold text-slate-800 text-xs">
                                {presentCount} из {totalStudents} <span className="text-slate-500 font-normal">({attendanceRate}%)</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* 5. Статус */}
                          <td className="px-3 py-3.5 text-center whitespace-nowrap">
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className={cn(
                                  'rounded-full px-2.5 py-0.5 text-[10px] font-bold border',
                                  l.status === 'completed' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                  l.status === 'scheduled' && 'bg-blue-50 text-blue-700 border-blue-200',
                                  l.status === 'rescheduled' && 'bg-amber-50 text-amber-800 border-amber-300',
                                  l.status === 'cancelled' && 'bg-rose-50 text-rose-700 border-rose-200'
                                )}
                              >
                                {l.status === 'completed' && '✓ Проведено'}
                                {l.status === 'scheduled' && '📅 Запланировано'}
                                {l.status === 'rescheduled' && '🔄 Перенесено'}
                                {l.status === 'cancelled' && '✕ Отменено'}
                              </span>
                              {l.isBilled && (
                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                  💳 Списано
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 6. Действие */}
                          <td className="py-3.5 pl-3 pr-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <Link
                              href={`/calendar/lessons/${l.id}`}
                              className={cn(
                                'inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-2xs',
                                isCompleted
                                  ? 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:text-blue-600'
                                  : 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100'
                              )}
                            >
                              {isCompleted ? 'Журнал урока →' : 'Открыть урок →'}
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* EDIT GROUP MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Edit className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{t('groups.editParams', 'Изменение параметров группы')}</h3>
                  <p className="text-xs text-slate-500">{t('groups.subtitle', 'Название, курс, преподаватель, расписание и места')}</p>
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

            <form onSubmit={handleSaveGroup} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t('groups.groupName', 'Название группы')}</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  placeholder="English B1 Teens (Пн/Чт 18:45)"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('crm.tableCourse', 'Курс / Направление')}</label>
                  <input
                    type="text"
                    value={editForm.courseName}
                    onChange={(e) => setEditForm({ ...editForm, courseName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    placeholder="Английский язык"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('groups.teacher', 'Преподаватель')}</label>
                  <input
                    type="text"
                    value={editForm.teacherName}
                    onChange={(e) => setEditForm({ ...editForm, teacherName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    placeholder="Мария Иванова"
                    required
                  />
                </div>
              </div>

              {/* INTERACTIVE 3-STEP SCHEDULE BUILDER */}
              <GroupScheduleBuilder
                initialSchedule={editForm.schedule}
                onScheduleChange={(formatted, state) => {
                  setEditForm((prev) => ({ ...prev, schedule: formatted }));
                  setScheduleBuilderState(state);
                }}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('hero.room', 'Формат / Кабинет (онлайн)')}</label>
                  <input
                    type="text"
                    value={editForm.room}
                    onChange={(e) => setEditForm({ ...editForm, room: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    placeholder="Онлайн (Zoom / Конференция)"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('groups.capacity', 'Вместимость (макс. мест)')}</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={editForm.capacity}
                    onChange={(e) => setEditForm({ ...editForm, capacity: parseInt(e.target.value) || 8 })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('crm.leadStage', 'Статус группы')}</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden bg-white"
                  >
                    <option value="active">{t('groups.statusActive', 'Идут занятия (Активна)')}</option>
                    <option value="recruiting">{t('groups.statusEnrolling', 'Идет набор')}</option>
                    <option value="completed">{t('status.finished', 'Завершена')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t('students.tabNotes', 'Заметки и особенности группы')}</label>
                <textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden resize-none"
                  placeholder="Возраст, программа, учебные материалы..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {t('action.cancel', 'Отмена')}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                  {t('action.saveChanges', 'Сохранить изменения')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* SCHEDULE LESSON MODAL */}
      <ScheduleLessonModal
        isOpen={isScheduleLessonOpen}
        onClose={() => setIsScheduleLessonOpen(false)}
        defaultGroupId={group.id}
        onScheduled={() => {
          success('Занятие успешно запланировано, уведомления разосланы родителям!');
          const fresh = getGroupById(groupId);
          if (fresh) setGroup(fresh);
        }}
      />
    </div>
  );
}
