'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, Plus, Phone, Mail, MoreHorizontal, CheckCircle2, Clock, AlertCircle, ChevronRight, Copy, AlertTriangle, GraduationCap, Wallet, RotateCcw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateStudentModal } from '@/components/students/CreateStudentModal';
import type { NewStudentData } from '@/components/students/CreateStudentModal';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';
import { INITIAL_STUDENTS, FullStudentData } from '@/lib/data/mockData';
import { getStoredStudents, restoreStudent, softDeleteStudent } from '@/lib/data/studentStorage';
import { getStudentFinancialSummary } from '@/lib/data/balanceHelper';

export interface StudentListItem {
  id: string;
  name: string;
  status: 'active' | 'trial' | 'paused' | 'archived';
  studentType?: 'school_student' | 'adult_student';
  parent: string;
  parentPhone: string;
  group: string;
  course: string;
  teacher: string;
  attendanceRate: string;
  absentLessons?: number;
  isChurnRisk?: boolean;
  churnRiskReason?: string;
  paymentStatus: 'paid' | 'overdue' | 'expected';
  subscriptionEnd: string;
  depositBalance?: number;
  depositFormatted?: string;
  debtFormatted?: string;
  netBalanceFormatted?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export function mapFullStudentToListItem(s: FullStudentData): StudentListItem {
  const primaryParent = s.parents?.[0];
  const isAdult = s.studentType === 'adult_student';

  let parentLabel = 'Родитель не указан';
  if (isAdult) {
    parentLabel = primaryParent && primaryParent.relationshipType !== 'Мама' && primaryParent.relationshipType !== 'Отец'
      ? `${primaryParent.firstName} ${primaryParent.lastName} (${primaryParent.relationshipType})`
      : 'Самостоятельно (18+)';
  } else if (primaryParent) {
    parentLabel = `${primaryParent.firstName} ${primaryParent.lastName} (${primaryParent.relationshipType || 'Родитель'})`;
  }

  const parentPhone = primaryParent?.phone || s.phone || '—';
  const group = (s.groups && s.groups.length > 0)
    ? s.groups.map((g) => g.name).filter(Boolean).join(', ')
    : 'Без группы';
  const course = (s.groups && s.groups.length > 0)
    ? Array.from(new Set(s.groups.map((g) => g.courseName || g.name).filter(Boolean))).join(', ')
    : '—';
  const teacher = s.groups?.[0]?.teacherName || 'Мария Иванова';
  const attendanceRate = s.attendanceStats?.attendanceRate || '100%';
  const absentLessons = s.attendanceStats?.absentCount ?? 0;
  const isChurnRisk = absentLessons >= 3;
  const churnRiskReason = isChurnRisk ? `${absentLessons} пропуска подряд, риск оттока` : undefined;

  const finSummary = getStudentFinancialSummary(s.id);
  const paymentStatus: 'paid' | 'overdue' | 'expected' = finSummary.isNegative
    ? 'overdue'
    : finSummary.deposit > 0
    ? 'paid'
    : (s.finance?.payments?.[0]?.status as any) === 'expected'
    ? 'expected'
    : 'paid';

  const subscriptionEnd = s.finance?.activeSubscription?.renewalDate || '30.09.2026';

  const validStatus: 'active' | 'trial' | 'paused' | 'archived' =
    s.status === 'trial' || s.status === 'paused' || s.status === 'archived'
      ? s.status
      : 'active';

  return {
    id: s.id,
    name: `${s.firstName} ${s.lastName}`,
    status: validStatus,
    studentType: s.studentType || 'school_student',
    parent: parentLabel,
    parentPhone,
    group,
    course,
    teacher,
    attendanceRate,
    absentLessons,
    isChurnRisk,
    churnRiskReason,
    paymentStatus,
    subscriptionEnd,
    depositBalance: finSummary.deposit,
    depositFormatted: finSummary.formattedDeposit,
    debtFormatted: finSummary.formattedDebt,
    netBalanceFormatted: finSummary.formattedNet,
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

  const activeStudents = students.filter((s) => !s.isDeleted);
  const deletedStudents = students.filter((s) => s.isDeleted);
  const deletedCount = deletedStudents.length;

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.group.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.parent && s.parent.toLowerCase().includes(searchTerm.toLowerCase()));

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
            {t('students.subtitle', 'Единая база учеников и совершеннолетних студентов')} • Всего: {activeStudents.length} (активных: {activeStudents.filter(s => s.status === 'active').length})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
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
            onClick={() => setStatusFilter('all')}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
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
            onClick={() => {
              setStatusFilter('all');
              router.replace('/students');
            }}
            className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-bold text-amber-900 hover:bg-amber-100 transition-colors shrink-0"
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
                        student.studentType === 'adult_student'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      )}
                    >
                      {student.studentType === 'adult_student' ? <GraduationCap size={16} /> : student.name[0]}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm truncate">{student.name}</h3>
                      <p className="text-[11px] text-slate-500 truncate">
                        {student.studentType === 'adult_student' ? 'Студент (18+)' : student.parent ? student.parent : 'Школьник'}
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
                      {student.group}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    {student.debtFormatted && student.debtFormatted !== '0 € (0 ₽)' ? (
                      <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                        Долг: {student.debtFormatted}
                      </span>
                    ) : student.depositBalance !== undefined && student.depositBalance > 0 ? (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        Депозит: {student.depositFormatted}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-700">
                        ✓ Оплачено {student.subscriptionEnd && student.subscriptionEnd !== '—' ? `(до ${student.subscriptionEnd})` : ''}
                      </span>
                    )}
                  </div>
                </div>

                {statusFilter === 'deleted' && (
                  <div className="pt-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
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

        {/* Desktop Table (>= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-700">
              <tr>
                <th className="py-3.5 pl-4 pr-3">{t('students.colStudent', 'Ученик / Тип')}</th>
                <th className="px-3 py-3.5">{t('status.active', 'Статус')}</th>
                <th className="px-3 py-3.5">{t('students.colParent', 'Родитель / Контакт')}</th>
                <th className="px-3 py-3.5">{t('students.colGroup', 'Группа / Курс')}</th>
                <th className="px-3 py-3.5">{t('hero.teacher', 'Преподаватель')}</th>
                <th className="px-3 py-3.5 text-right">{t('dashboard.attendance', 'Посещаемость')}</th>
                <th className="px-3 py-3.5 text-right">{t('students.colBalance', 'Баланс / Оплата')}</th>
                {statusFilter === 'deleted' && (
                  <th className="py-3.5 pl-3 pr-4 text-right">Действие</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={statusFilter === 'deleted' ? 8 : 7} className="py-8 text-center text-slate-500">
                    {statusFilter === 'deleted' ? 'В списке удаленных ничего нет' : 'Ученики не найдены'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    onClick={() => {
                      if (statusFilter !== 'deleted') {
                        router.push(`/students/${student.id}`);
                      }
                    }}
                    className={cn(
                      'transition-colors',
                      statusFilter !== 'deleted' && 'hover:bg-slate-50/80 cursor-pointer'
                    )}
                  >
                    <td className="py-3 pl-4 pr-3 font-semibold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs shrink-0',
                            student.studentType === 'adult_student'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          )}
                        >
                          {student.studentType === 'adult_student' ? <GraduationCap size={15} /> : student.name[0]}
                        </div>
                        <div className="min-w-0">
                          <span className="hover:text-blue-600 font-bold text-slate-900 transition-colors block truncate">
                            {student.name}
                          </span>
                          <span className="text-[10px] text-slate-600 font-medium">
                            {student.studentType === 'adult_student' ? 'Студент (18+)' : 'Школьник'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        {student.isDeleted ? (
                          <span className="rounded-full px-2 py-0.5 font-semibold text-[10px] bg-rose-100 text-rose-800">
                            Удален
                          </span>
                        ) : (
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 font-semibold text-[10px]',
                              student.status === 'active' && 'bg-emerald-100 text-emerald-800',
                              student.status === 'trial' && 'bg-purple-100 text-purple-800',
                              student.status === 'paused' && 'bg-amber-100 text-amber-800'
                            )}
                          >
                            {student.status === 'active' && t('status.active', 'Активен')}
                            {student.status === 'trial' && t('status.trial', 'Пробный')}
                            {student.status === 'paused' && t('status.paused', 'На паузе')}
                          </span>
                        )}
                        {(student.isChurnRisk || (student.absentLessons !== undefined && student.absentLessons >= 3)) && (
                          <span className="rounded-md bg-rose-100 text-rose-800 px-1.5 py-0.5 font-bold text-[10px] flex items-center gap-1">
                            <AlertTriangle size={10} /> {student.absentLessons} проп.
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-slate-800">{student.parent}</p>
                      <div className="flex items-center gap-1.5 mt-0.5" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[11px] text-slate-600">{student.parentPhone}</span>
                        {student.parentPhone !== '—' && (
                          <>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(student.parentPhone);
                                toast.success(`Номер скопирован: ${student.parentPhone}`);
                              }}
                              className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Скопировать телефон"
                            >
                              <Copy size={12} />
                            </button>
                            <a
                              href={`https://wa.me/${student.parentPhone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 transition-colors text-[10px]"
                              title="Написать в WhatsApp"
                            >
                              WA
                            </a>
                            <a
                              href={`tel:${student.parentPhone.replace(/[^\d+]/g, '')}`}
                              className="p-1 rounded-md text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Позвонить"
                            >
                              <Phone size={12} />
                            </a>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-slate-800">{student.group}</p>
                      <p className="text-[11px] text-slate-600">{student.course}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{student.teacher}</td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className={cn(
                          'font-bold',
                          student.isChurnRisk || (student.absentLessons !== undefined && student.absentLessons >= 3)
                            ? 'text-rose-600'
                            : 'text-slate-900'
                        )}
                      >
                        {student.attendanceRate}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex flex-col gap-1 items-end">
                        {student.debtFormatted && student.debtFormatted !== '0 € (0 ₽)' ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-200 px-2 py-0.5 text-xs font-bold text-rose-700">
                            <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                            <span>{t('hero.debt', 'Долг')}: {student.debtFormatted}</span>
                          </span>
                        ) : student.depositBalance !== undefined && student.depositBalance > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-700">
                            <Wallet className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span>{t('hero.deposit', 'Депозит')}: {student.depositFormatted}</span>
                          </span>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span>{t('status.paid', 'Оплачено')}</span>
                            </span>
                            {student.subscriptionEnd && student.subscriptionEnd !== '—' && (
                              <span className="text-[10px] text-slate-500 mt-0.5">до {student.subscriptionEnd}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    {statusFilter === 'deleted' && (
                      <td className="py-3 pl-3 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            restoreStudent(student.id);
                            refreshStudents();
                            toast.success(`Ученик ${student.name} восстановлен`);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
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

