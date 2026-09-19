'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, Plus, Phone, AlertTriangle, GraduationCap, RotateCcw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateStudentModal } from '@/components/students/CreateStudentModal';
import type { NewStudentData } from '@/components/students/CreateStudentModal';
import { TeacherQuickViewModal } from '@/components/dashboard/TeacherQuickViewModal';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';
import { INITIAL_STUDENTS, FullStudentData } from '@/lib/data/mockData';
import { getStoredStudents, restoreStudent } from '@/lib/data/studentStorage';
import { getStudentFinancialSummary } from '@/lib/data/balanceHelper';

const WhatsAppIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
  </svg>
);

const TelegramIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.562 8.161c-.18.717-.962 4.084-1.362 5.771-.169.714-.433.954-.688.977-.557.051-.98-.368-1.52-.722-.845-.553-1.323-.897-2.143-1.437-.948-.624-.334-.967.207-1.529.142-.147 2.607-2.389 2.656-2.597.006-.026.012-.123-.046-.175s-.144-.034-.206-.02c-.088.02-1.488.946-4.2 2.778-.397.272-.757.406-1.079.399-.356-.008-1.041-.202-1.55-.368-.626-.204-1.123-.312-1.08-.66.023-.181.272-.367.747-.557 2.928-1.275 4.88-2.115 5.857-2.52 2.791-1.157 3.372-1.358 3.75-1.364.083-.001.27.02.39.118.101.082.13.193.143.271.013.078.028.256.015.395z" />
  </svg>
);

export interface StudentListItem {
  id: string;
  initials: string;
  name: string;
  status: 'active' | 'trial' | 'paused' | 'archived';
  isAdult: boolean;
  studentType?: 'school_student' | 'adult_student';
  parentId?: string;
  parentName?: string;
  parentRelation?: string;
  parentPhone?: string;
  telegram?: string;
  groupId?: string;
  groupName?: string;
  nextLessonId?: string;
  nextLessonDate?: string;
  teacherId?: string;
  teacherName?: string;
  attendanceRate: number;
  financeStatus: 'active_sub' | 'deposit' | 'debt' | 'trial';
  paidUntil?: string;
  balanceEur?: number;
  balanceRub?: number;
  debtEur?: number;
  debtRub?: number;
  isChurnRisk?: boolean;
  absentLessons?: number;
  isDeleted?: boolean;
  deletedAt?: string;
}

export function mapFullStudentToListItem(s: FullStudentData): StudentListItem {
  const primaryParent = s.parents?.[0];
  const isAdult = s.studentType === 'adult_student';

  const names = `${s.firstName || ''} ${s.lastName || ''}`.trim().split(/\s+/);
  const initials = names.map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'УЧ';

  const parentRelation = primaryParent?.relationshipType || (isAdult ? 'Самостоятельно' : 'Мама');
  const parentName = primaryParent ? `${primaryParent.firstName || ''} ${primaryParent.lastName || ''}`.trim() : undefined;
  const parentId = primaryParent?.id;
  const parentPhone = primaryParent?.phone || s.phone || '—';
  const telegram = primaryParent?.telegram || s.telegram;

  const firstGroup = s.groups?.[0];
  const groupId = firstGroup?.id;
  const groupName = firstGroup?.name || (s.groups && s.groups.length > 0 ? s.groups.map(g => g.name).join(', ') : undefined);
  const teacherName = firstGroup?.teacherName || 'Мария Иванова';

  let teacherId = 't1';
  if (teacherName.toLowerCase().includes('денис')) teacherId = 't2';
  else if (teacherName.toLowerCase().includes('ольга')) teacherId = 't3';
  else if (teacherName.toLowerCase().includes('анна') || teacherName.toLowerCase().includes('алексей')) teacherId = 't4';

  const nextLessonId = `l_${s.id}_next`;
  const nextLessonDate = '21 сен, 18:45';

  const attendanceRateStr = s.attendanceStats?.attendanceRate || '100%';
  const attendanceRateNum = parseInt(attendanceRateStr.replace(/\D/g, ''), 10) || 100;
  const absentLessons = s.attendanceStats?.absentCount ?? 0;
  const isChurnRisk = absentLessons >= 3;

  const finSummary = getStudentFinancialSummary(s.id);

  let financeStatus: 'active_sub' | 'deposit' | 'debt' | 'trial' = 'active_sub';
  if (s.status === 'trial') {
    financeStatus = 'trial';
  } else if (finSummary.debt > 0 || finSummary.isNegative) {
    financeStatus = 'debt';
  } else if (finSummary.deposit > 0) {
    financeStatus = 'deposit';
  } else {
    financeStatus = 'active_sub';
  }

  const paidUntil = s.finance?.activeSubscription?.renewalDate || '28.09.2026';

  const validStatus: 'active' | 'trial' | 'paused' | 'archived' =
    s.status === 'trial' || s.status === 'paused' || s.status === 'archived'
      ? s.status
      : 'active';

  return {
    id: s.id,
    initials,
    name: `${s.firstName} ${s.lastName}`,
    status: validStatus,
    isAdult,
    studentType: s.studentType || 'school_student',
    parentId,
    parentName,
    parentRelation,
    parentPhone,
    telegram,
    groupId,
    groupName,
    nextLessonId,
    nextLessonDate,
    teacherId,
    teacherName,
    attendanceRate: attendanceRateNum,
    financeStatus,
    paidUntil,
    balanceEur: finSummary.deposit,
    balanceRub: finSummary.depositRub,
    debtEur: finSummary.debt,
    debtRub: finSummary.debtRub,
    isChurnRisk,
    absentLessons,
    isDeleted: Boolean(s.isDeleted || (s as any).is_deleted),
    deletedAt: s.deletedAt || (s as any).deleted_at,
  };
}

function StudentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter');
  const toast = useToast();
  const { t } = useLanguage();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(filterParam === 'absences' ? 'absences' : 'all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedTeacherName, setSelectedTeacherName] = useState<string>('Преподаватель');

  useEffect(() => {
    if (filterParam === 'absences') {
      setStatusFilter('absences');
    }
  }, [filterParam]);

  const [students, setStudents] = useState<StudentListItem[]>(() => {
    const list = typeof window !== 'undefined' ? getStoredStudents() : INITIAL_STUDENTS;
    return list.map(mapFullStudentToListItem);
  });

  const refreshStudents = () => {
    const list = getStoredStudents();
    setStudents(list.map(mapFullStudentToListItem));
  };

  useEffect(() => {
    refreshStudents();

    const handleSync = () => {
      refreshStudents();
    };

    window.addEventListener('crm-students-changed', handleSync);
    window.addEventListener('crm-payments-changed', handleSync);
    window.addEventListener('focus', handleSync);

    return () => {
      window.removeEventListener('crm-students-changed', handleSync);
      window.removeEventListener('crm-payments-changed', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, []);

  const handleStudentCreated = (newStudent: NewStudentData) => {
    refreshStudents();
    toast.success(`Ученик ${newStudent.name} успешно добавлен в базу!`);
  };

  const handleOpenTeacherModal = (tId?: string, tName?: string) => {
    if (!tId) return;
    setSelectedTeacherId(tId);
    setSelectedTeacherName(tName || 'Преподаватель');
  };

  const activeStudents = students.filter((s) => !s.isDeleted);
  const deletedStudents = students.filter((s) => s.isDeleted);
  const deletedCount = deletedStudents.length;

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.groupName && s.groupName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.parentName && s.parentName.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'deleted') {
      return Boolean(s.isDeleted);
    }

    if (s.isDeleted) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'absences') {
      return s.isChurnRisk || (s.absentLessons !== undefined && s.absentLessons >= 3);
    }
    if (statusFilter === 'school_student' || statusFilter === 'adult_student') {
      return s.studentType === statusFilter;
    }
    return s.status === statusFilter;
  });

  const churnRiskCount = activeStudents.filter((s) => s.isChurnRisk || (s.absentLessons !== undefined && s.absentLessons >= 3)).length;

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('students.title', 'Ученики школы')}</h1>
          <p className="text-sm text-slate-600">
            {t('students.subtitle', 'Единая база учащихся и совершеннолетних студентов')} • Всего: {activeStudents.length} (активных: {activeStudents.filter(s => s.status === 'active').length})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            {t('action.addStudent', 'Новый ученик')}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('students.search', 'Поиск по имени ученика, родителю или группе...')}
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <Filter className="h-3.5 w-3.5" />
            <span>{t('action.filter', 'Фильтр')}:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              if (e.target.value !== 'absences') {
                router.replace('/students');
              }
            }}
            className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">{t('students.filterAll', 'Все ученики')} ({activeStudents.length})</option>
            <option value="absences">{t('students.filterAbsences', 'Риск оттока: 3+ пропуска')} ({churnRiskCount})</option>
            <option value="active">{t('status.active', 'Активные')}</option>
            <option value="trial">{t('status.trial', 'Пробные')}</option>
            <option value="paused">{t('status.paused', 'На паузе')}</option>
            <option value="school_student">{t('students.filterSchool', 'Школьники (с родителями)')}</option>
            <option value="adult_student">{t('students.filterAdult', 'Студенты 18+ (самостоятельные)')}</option>
            <option value="deleted">Удаленные ({deletedCount})</option>
          </select>
        </div>
      </div>

      {/* Deleted Banner */}
      {statusFilter === 'deleted' && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-slate-500" />
            <span>Раздел «Удаленные ученики». Записи не удаляются окончательно и могут быть возвращены в активную базу в один клик.</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Вернуться ко всем
          </button>
        </div>
      )}

      {/* Churn Risk Active Filter Banner */}
      {statusFilter === 'absences' && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5 text-amber-950">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-200 text-amber-900">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-sm">
                Применен фильтр: «Риск оттока (3+ пропуска)»
              </span>
              <p className="text-amber-800 mt-0.5">
                Отображаются только ученики с высоким риском оттока из-за 3 и более пропущенных занятий ({filteredStudents.length} уч.). Свяжитесь с родителями для согласования отработок.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              router.replace('/students');
            }}
            className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-bold text-amber-900 hover:bg-amber-100 transition-colors shrink-0 cursor-pointer"
          >
            Показать всех учеников
          </button>
        </div>
      )}

      {/* Students Table (Desktop) & Cards List (Mobile) */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {/* Mobile Cards List (< 768px) */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredStudents.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              {statusFilter === 'deleted' ? 'В списке удаленных ничего нет' : 'Ученики не найдены'}
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div
                key={student.id}
                onClick={() => {
                  if (statusFilter !== 'deleted') {
                    router.push(`/students/${student.id}`);
                  }
                }}
                className="p-3.5 space-y-2 active:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full font-bold text-xs shrink-0 shadow-2xs',
                        student.isAdult
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      )}
                    >
                      {student.isAdult ? <GraduationCap size={16} /> : student.initials}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm truncate">{student.name}</h3>
                      <p className="text-[11px] text-slate-500 truncate">
                        {student.isAdult ? 'Студент (18+)' : student.parentName ? student.parentName : 'Школьник'}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 font-bold text-[10px]',
                        student.status === 'active' && 'bg-emerald-100 text-emerald-800',
                        student.status === 'trial' && 'bg-purple-100 text-purple-800',
                        student.status === 'paused' && 'bg-amber-100 text-amber-800',
                        student.isDeleted && 'bg-rose-100 text-rose-800'
                      )}
                    >
                      {student.status === 'active' && 'Активен'}
                      {student.status === 'trial' && 'Пробный'}
                      {student.status === 'paused' && 'Пауза'}
                      {student.isDeleted && 'Удален'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100">
                  <div className="min-w-0 truncate">
                    <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md truncate inline-block max-w-[170px]">
                      {student.groupName || '— Без группы'}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    {student.financeStatus === 'debt' ? (
                      <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                        Долг: -{student.debtEur} €
                      </span>
                    ) : student.financeStatus === 'deposit' ? (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        Депозит: +{student.balanceEur} €
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-700">
                        ✓ Оплачено {student.paidUntil ? `(до ${student.paidUntil})` : ''}
                      </span>
                    )}
                  </div>
                </div>

                {statusFilter === 'deleted' && (
                  <div className="pt-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        restoreStudent(student.id);
                        refreshStudents();
                        toast.success(`Ученик ${student.name} восстановлен`);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Восстановить
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Desktop Table (>= 768px, strictly hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 pl-4 pr-3">УЧЕНИК</th>
                <th className="px-4 py-3.5">РОДИТЕЛЬ / СВЯЗЬ</th>
                <th className="px-4 py-3.5">ГРУППА / БЛИЖАЙШИЙ УРОК</th>
                <th className="px-4 py-3.5">ПРЕПОДАВАТЕЛЬ</th>
                <th className="px-4 py-3.5">ПОСЕЩАЕМОСТЬ</th>
                <th className="px-4 py-3.5">ОПЛАТА И БАЛАНС</th>
                {statusFilter === 'deleted' && (
                  <th className="py-3.5 pl-3 pr-4 text-right">ДЕЙСТВИЕ</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={statusFilter === 'deleted' ? 7 : 6} className="py-8 text-center text-slate-500">
                    {statusFilter === 'deleted' ? 'В списке удаленных ничего нет' : 'Ученики не найдены'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                    {/* 1. Ученик с аватаром-индикатором */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200">
                            {student.initials}
                          </div>
                          <span
                            className={cn(
                              'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white',
                              student.status === 'active'
                                ? 'bg-emerald-500'
                                : student.status === 'trial'
                                ? 'bg-purple-500'
                                : 'bg-amber-500'
                            )}
                          />
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/students/${student.id}`}
                            className="font-semibold text-sm text-slate-900 hover:text-blue-600 transition-colors block truncate"
                          >
                            {student.name}
                          </Link>
                          <span className="text-[11px] text-slate-400">
                            {student.isAdult ? 'Студент (18+)' : 'Школьник'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 2. Родитель и правые кнопки связи */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-between gap-2 max-w-[260px]">
                        <div className="min-w-0">
                          {student.parentId ? (
                            <Link
                              href={`/parents/${student.parentId}`}
                              className="text-xs font-medium text-slate-800 hover:text-blue-600 truncate block"
                            >
                              {student.parentName} <span className="text-slate-400 font-normal">({student.parentRelation})</span>
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">Самостоятельно (18+)</span>
                          )}
                          <a
                            href={`tel:${(student.parentPhone || '').replace(/\D/g, '')}`}
                            className="text-xs text-slate-500 hover:text-slate-800 block"
                          >
                            {student.parentPhone}
                          </a>
                        </div>

                        {student.parentPhone && student.parentPhone !== '—' && (
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={`https://wa.me/${(student.parentPhone || '').replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Написать в WhatsApp"
                              className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <WhatsAppIcon className="w-4 h-4" />
                            </a>
                            <a
                              href={student.telegram ? `https://t.me/${student.telegram.replace('@', '')}` : `https://wa.me/${(student.parentPhone || '').replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Написать в Telegram"
                              className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <TelegramIcon className="w-4 h-4" />
                            </a>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 3. Группа / Урок */}
                    <td className="py-3 px-4">
                      {student.groupId ? (
                        <div>
                          <Link
                            href={`/calendar/lessons/${student.nextLessonId || student.groupId}`}
                            className="text-xs font-semibold text-blue-600 hover:underline block truncate max-w-[200px]"
                          >
                            {student.groupName}
                          </Link>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            ↳ {student.nextLessonDate || '21 сен, 18:45'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">— Без группы</span>
                      )}
                    </td>

                    {/* 4. Преподаватель (с модалкой карточки) */}
                    <td className="py-3 px-4">
                      {student.teacherId ? (
                        <button
                          type="button"
                          onClick={() => handleOpenTeacherModal(student.teacherId, student.teacherName)}
                          className="text-xs font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors text-left cursor-pointer"
                        >
                          👨‍🏫 {student.teacherName}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    {/* 5. Посещаемость */}
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          'text-xs font-bold',
                          student.attendanceRate >= 90
                            ? 'text-emerald-600'
                            : student.attendanceRate >= 75
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        )}
                      >
                        {student.attendanceRate}%
                      </span>
                    </td>

                    {/* 6. Оплата и баланс */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {student.financeStatus === 'active_sub' && (
                        <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          ✓ Оплачено до {student.paidUntil || '28.09.2026'}
                        </span>
                      )}
                      {student.financeStatus === 'deposit' && (
                        <div>
                          <div className="text-xs font-bold text-emerald-600">+{student.balanceEur} €</div>
                          <div className="text-[10px] text-slate-400">Депозит (+{student.balanceRub?.toLocaleString('ru-RU')} ₽)</div>
                        </div>
                      )}
                      {student.financeStatus === 'debt' && (
                        <div>
                          <div className="text-xs font-bold text-rose-600">-{student.debtEur} €</div>
                          <div className="text-[10px] text-rose-500 font-medium">Долг (-{student.debtRub?.toLocaleString('ru-RU')} ₽)</div>
                        </div>
                      )}
                      {student.financeStatus === 'trial' && (
                        <span className="inline-flex items-center text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                          Пробный урок
                        </span>
                      )}
                    </td>

                    {statusFilter === 'deleted' && (
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            restoreStudent(student.id);
                            refreshStudents();
                            toast.success(`Ученик ${student.name} восстановлен`);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Восстановить
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Student Modal */}
      <CreateStudentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleStudentCreated}
      />

      {/* Teacher Quick View Modal */}
      <TeacherQuickViewModal
        teacherId={selectedTeacherId}
        teacherName={selectedTeacherName}
        onClose={() => setSelectedTeacherId(null)}
      />
    </div>
  );
}

export default function StudentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Загрузка базы учеников...</div>}>
      <StudentsContent />
    </Suspense>
  );
}
