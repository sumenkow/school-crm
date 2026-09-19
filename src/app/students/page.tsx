'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, Plus, AlertTriangle, GraduationCap, RotateCcw, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateStudentModal } from '@/components/students/CreateStudentModal';
import type { NewStudentData } from '@/components/students/CreateStudentModal';
import { TeacherQuickViewModal } from '@/components/dashboard/TeacherQuickViewModal';
import { StudentDrawer } from '@/components/students/StudentDrawer';
import { BulkActionsBar } from '@/components/students/BulkActionsBar';
import { StudentsDesktop } from '@/features/students/components/StudentsDesktop';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';
import { INITIAL_STUDENTS, FullStudentData } from '@/lib/data/mockData';
import { getStoredStudents, restoreStudent } from '@/lib/data/studentStorage';
import { getStudentFinancialSummary } from '@/lib/data/balanceHelper';

const WhatsAppIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={cn('fill-current', className)} viewBox="0 0 24 24">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

const TelegramIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={cn('fill-current', className)} viewBox="0 0 24 24">
    <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.536-.196 1.006.128.833.942z" />
  </svg>
);

export interface GroupEnrollment {
  id: string;
  name: string;
  schedule?: string;
  room?: string;
  teacherName?: string;
  nextLessonId?: string;
  nextLessonDate?: string;
}

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
  groups: GroupEnrollment[];
  groupId?: string;
  groupName?: string;
  nextLessonId?: string;
  nextLessonDate?: string;
  teacherId?: string;
  teacherName?: string;
  attendanceRate: number;
  financeStatus: 'active_sub' | 'deposit' | 'debt' | 'trial';
  paidUntil?: string;
  balanceEur: number;
  balanceRub: number;
  debtEur: number;
  debtRub: number;
  netBalanceEur: number;
  isChurnRisk?: boolean;
  absentLessons?: number;
  isDeleted?: boolean;
  deletedAt?: string;
  rawStudentObj: FullStudentData;
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

  const rawGroups = s.groups || [];
  const groupsList: GroupEnrollment[] = rawGroups.map((g, idx) => ({
    id: g.id || `g_${idx}`,
    name: g.name || 'Группа',
    schedule: g.schedule || 'Пн/Чт 18:45',
    room: (g as any).room || 'Ауд. 204',
    teacherName: g.teacherName || 'Мария Иванова',
    nextLessonId: `l_${s.id}_g_${g.id || idx}`,
    nextLessonDate: 'Ср 21 сен, 18:45',
  }));

  const firstGroup = groupsList[0];
  const groupId = firstGroup?.id;
  const groupName = firstGroup ? `${firstGroup.name}` : undefined;
  const teacherName = firstGroup?.teacherName || 'Мария Иванова';

  let teacherId = 't1';
  if (teacherName.toLowerCase().includes('денис')) teacherId = 't2';
  else if (teacherName.toLowerCase().includes('ольга')) teacherId = 't3';
  else if (teacherName.toLowerCase().includes('анна') || teacherName.toLowerCase().includes('алексей')) teacherId = 't4';

  const nextLessonId = `l_${s.id}_next`;
  const nextLessonDate = 'Ср 21 сен, 18:45';

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
    groups: groupsList,
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
    netBalanceEur: finSummary.netBalance,
    isChurnRisk,
    absentLessons,
    isDeleted: Boolean(s.isDeleted || (s as any).is_deleted),
    deletedAt: s.deletedAt || (s as any).deleted_at,
    rawStudentObj: s,
  };
}

type SortField = 'name' | 'attendanceRate' | 'finance';
type SortOrder = 'default' | 'asc' | 'desc';

const teachersList = [
  { id: 'all', name: 'Все преподаватели' },
  { id: 't1', name: 'Мария Иванова' },
  { id: 't2', name: 'Денис Смирнов' },
  { id: 't3', name: 'Ольга Соколова' },
  { id: 't4', name: 'Анна Кузнецова' },
];

function StudentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { t } = useLanguage();

  const activeStudentIdFromUrl = searchParams.get('id');
  const activeTabFromUrl = (searchParams.get('tab') as 'profile' | 'learning' | 'finance' | 'attendance') || 'profile';
  const activeTeacherIdFromUrl = searchParams.get('teacherId');
  const filterParam = searchParams.get('filter');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(filterParam === 'absences' ? 'absences' : 'all');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Cyclic Sort States
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('default');

  // Popover state for +N courses hover
  const [activeCoursePopoverId, setActiveCoursePopoverId] = useState<string | null>(null);

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

  // Deep Link Modal Triggers
  const activeDrawerStudentObj = useMemo(() => {
    if (!activeStudentIdFromUrl) return null;
    const found = students.find((s) => s.id === activeStudentIdFromUrl);
    return found ? found.rawStudentObj : null;
  }, [activeStudentIdFromUrl, students]);

  const activeTeacherObj = useMemo(() => {
    if (!activeTeacherIdFromUrl) return null;
    const found = students.find((s) => s.teacherId === activeTeacherIdFromUrl);
    const teacherMeta = teachersList.find((t) => t.id === activeTeacherIdFromUrl);
    return {
      teacherId: activeTeacherIdFromUrl,
      teacherName: teacherMeta?.name || found?.teacherName || 'Преподаватель',
    };
  }, [activeTeacherIdFromUrl, students]);

  const handleOpenStudentDrawer = (id: string, tab?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', id);
    if (tab) params.set('tab', tab);
    else params.delete('tab');
    router.push(`/students?${params.toString()}`, { scroll: false });
  };

  const handleCloseStudentDrawer = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('id');
    params.delete('tab');
    const newQuery = params.toString();
    router.push(newQuery ? `/students?${newQuery}` : '/students', { scroll: false });
  };

  const handleOpenTeacherModal = (teacherId: string, teacherName?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('teacherId', teacherId);
    router.push(`/students?${params.toString()}`, { scroll: false });
  };

  const handleCloseTeacherModal = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('teacherId');
    const newQuery = params.toString();
    router.push(newQuery ? `/students?${newQuery}` : '/students', { scroll: false });
  };

  // Cyclic Sort Handler
  const handleSortToggle = (field: SortField) => {
    if (sortField !== field) {
      setSortField(field);
      setSortOrder('asc');
    } else if (sortOrder === 'asc') {
      setSortOrder('desc');
    } else if (sortOrder === 'desc') {
      setSortField(null);
      setSortOrder('default');
    } else {
      setSortOrder('asc');
    }
  };

  const activeStudents = students.filter((s) => !s.isDeleted);
  const deletedStudents = students.filter((s) => s.isDeleted);
  const deletedCount = deletedStudents.length;

  const filteredStudents = useMemo(() => {
    let result = students.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.groupName && s.groupName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.parentName && s.parentName.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      // Teacher filter
      if (selectedTeacherId !== 'all') {
        const teacherMeta = teachersList.find((t) => t.id === selectedTeacherId);
        const targetTeacherName = teacherMeta?.name.toLowerCase() || '';
        const matchesTeacher =
          s.teacherId === selectedTeacherId ||
          (s.teacherName && s.teacherName.toLowerCase().includes(targetTeacherName)) ||
          s.groups.some((g) => g.teacherName && g.teacherName.toLowerCase().includes(targetTeacherName));

        if (!matchesTeacher) return false;
      }

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

    if (sortField && sortOrder !== 'default') {
      result = [...result].sort((a, b) => {
        if (sortField === 'name') {
          return sortOrder === 'asc' ? a.name.localeCompare(b.name, 'ru') : b.name.localeCompare(a.name, 'ru');
        }
        if (sortField === 'attendanceRate') {
          return sortOrder === 'asc' ? a.attendanceRate - b.attendanceRate : b.attendanceRate - a.attendanceRate;
        }
        if (sortField === 'finance') {
          return sortOrder === 'asc' ? a.netBalanceEur - b.netBalanceEur : b.netBalanceEur - a.netBalanceEur;
        }
        return 0;
      });
    }

    return result;
  }, [students, searchTerm, statusFilter, selectedTeacherId, sortField, sortOrder]);

  const churnRiskCount = activeStudents.filter((s) => s.isChurnRisk || (s.absentLessons !== undefined && s.absentLessons >= 3)).length;

  // Master Checkbox State
  const allFilteredSelected = filteredStudents.length > 0 && filteredStudents.every((s) => selectedIds.includes(s.id));
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredStudents.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Actions Handlers
  const handleBulkWhatsApp = () => {
    const selectedStudents = students.filter((s) => selectedIds.includes(s.id));
    const phones = selectedStudents.map((s) => s.parentPhone).filter(Boolean);
    toast.success(`Подготовлена рассылка в WhatsApp для ${phones.length} контактов!`);
  };

  const handleBulkChangeTeacher = () => {
    const newTeacher = prompt('Введите имя нового преподавателя (например: Денис Смирнов):');
    if (!newTeacher) return;
    toast.success(`Преподаватель успешно изменен на «${newTeacher}» для ${selectedIds.length} учеников!`);
    setSelectedIds([]);
  };

  const handleBulkExport = () => {
    const selectedStudents = students.filter((s) => selectedIds.includes(s.id));
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['ФИО,Тип,Родитель,Телефон,Группа,Посещаемость,Баланс EUR']
        .concat(
          selectedStudents.map(
            (s) => `"${s.name}","${s.studentType}","${s.parentName || '—'}","${s.parentPhone || ''}","${s.groupName || ''}","${s.attendanceRate}%","${s.netBalanceEur} €"`
          )
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `students_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Выгружен файл экспорта (${selectedStudents.length} записей)`);
  };

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
        <div className="relative flex-1 min-w-[240px]">
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

          {/* Teacher Select Filter */}
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            className="h-9 px-3 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
          >
            {teachersList.map((tItem) => (
              <option key={tItem.id} value={tItem.id}>
                {tItem.name}
              </option>
            ))}
          </select>

          {/* Status Select Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              if (e.target.value !== 'absences') {
                router.replace('/students');
              }
            }}
            className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
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

      {/* Students Table (Desktop 100% Fit) & Cards List (Mobile) */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
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
                    handleOpenStudentDrawer(student.id);
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

        {/* Desktop Table (>= 768px, strictly hidden md:block, 100% FIT) */}
        <StudentsDesktop
          students={filteredStudents}
          selectedIds={selectedIds}
          allFilteredSelected={allFilteredSelected}
          onSelectAll={handleSelectAll}
          onToggleSelectRow={handleToggleSelectRow}
          sortField={sortField}
          sortOrder={sortOrder}
          onSortToggle={handleSortToggle}
          statusFilter={statusFilter}
          onOpenTeacherModal={handleOpenTeacherModal}
          onOpenStudentDrawer={handleOpenStudentDrawer}
          onRefreshStudents={refreshStudents}
        />
      </div>

      {/* Floating Bulk Operations Bar */}
      <BulkActionsBar
        selectedCount={selectedIds.length}
        onWhatsAppBroadcast={handleBulkWhatsApp}
        onChangeTeacher={handleBulkChangeTeacher}
        onExport={handleBulkExport}
        onClearSelection={() => setSelectedIds([])}
      />

      {/* Create Student Modal */}
      <CreateStudentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleStudentCreated}
      />

      {/* Student Drawer with Deep Link & Initial Tab support */}
      <StudentDrawer
        isOpen={Boolean(activeStudentIdFromUrl)}
        studentData={activeDrawerStudentObj}
        initialTab={activeTabFromUrl}
        onClose={handleCloseStudentDrawer}
      />

      {/* Teacher Quick View Modal with Deep Link support */}
      <TeacherQuickViewModal
        teacherId={activeTeacherIdFromUrl}
        teacherName={activeTeacherObj?.teacherName}
        onClose={handleCloseTeacherModal}
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
