'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, Plus, Phone, Mail, MoreHorizontal, CheckCircle2, Clock, AlertCircle, ChevronRight, Copy, AlertTriangle, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateStudentModal } from '@/components/students/CreateStudentModal';
import type { NewStudentData } from '@/components/students/CreateStudentModal';
import { useToast } from '@/context/ToastContext';
import { INITIAL_STUDENTS, FullStudentData } from '@/lib/data/mockData';

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
}

function StudentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter');
  const toast = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(filterParam === 'absences' ? 'absences' : 'all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    if (filterParam === 'absences') {
      setStatusFilter('absences');
    }
  }, [filterParam]);

  const [students, setStudents] = useState<StudentListItem[]>([
    {
      id: '1',
      name: 'Иван Смирнов',
      status: 'active',
      studentType: 'school_student',
      parent: 'Ольга Смирнова (Мама)',
      parentPhone: '+7 (999) 123-45-67',
      group: 'English B1 Teens',
      course: 'Английский язык',
      teacher: 'Мария Иванова',
      attendanceRate: '94%',
      absentLessons: 1,
      paymentStatus: 'paid',
      subscriptionEnd: '30.09.2026',
    },
    {
      id: '2',
      name: 'Мария Кузнецова',
      status: 'active',
      studentType: 'school_student',
      parent: 'Дмитрий Кузнецов (Отец)',
      parentPhone: '+7 (999) 234-56-78',
      group: 'Robotics Junior',
      course: 'Робототехника',
      teacher: 'Денис Смирнов',
      attendanceRate: '100%',
      absentLessons: 0,
      paymentStatus: 'overdue',
      subscriptionEnd: '25.08.2026',
    },
    {
      id: '3',
      name: 'Анна Васильева',
      status: 'trial',
      studentType: 'school_student',
      parent: 'Елена Васильева (Мама)',
      parentPhone: '+7 (999) 345-67-89',
      group: 'Kids English A1',
      course: 'Английский язык',
      teacher: 'Мария Иванова',
      attendanceRate: '0%',
      absentLessons: 1,
      paymentStatus: 'expected',
      subscriptionEnd: '—',
    },
    {
      id: '4',
      name: 'Сергей Попов',
      status: 'paused',
      studentType: 'school_student',
      parent: 'Татьяна Попова (Мама)',
      parentPhone: '+7 (999) 456-78-90',
      group: 'English B1 Teens',
      course: 'Английский язык',
      teacher: 'Мария Иванова',
      attendanceRate: '62%',
      absentLessons: 4,
      isChurnRisk: true,
      churnRiskReason: '4 пропуска подряд, статус «На паузе», риск оттока',
      paymentStatus: 'paid',
      subscriptionEnd: '15.10.2026',
    },
    {
      id: 's6',
      name: 'Максим Захаров',
      status: 'active',
      studentType: 'school_student',
      parent: 'Наталья Захарова (Мама)',
      parentPhone: '+7 (916) 777-33-22',
      group: 'English B1 Teens',
      course: 'Английский язык',
      teacher: 'Мария Иванова',
      attendanceRate: '65%',
      absentLessons: 3,
      isChurnRisk: true,
      churnRiskReason: '3 пропуска подряд, нет реакции на домашние задания, задолженность',
      paymentStatus: 'overdue',
      subscriptionEnd: '20.09.2026',
    },
    {
      id: '5',
      name: 'Екатерина Морозова',
      status: 'active',
      studentType: 'school_student',
      parent: 'Игорь Морозов (Отец)',
      parentPhone: '+7 (999) 567-89-01',
      group: 'Kids Math Safari',
      course: 'Математика',
      teacher: 'Ольга Соколова',
      attendanceRate: '88%',
      absentLessons: 1,
      paymentStatus: 'paid',
      subscriptionEnd: '05.10.2026',
    },
    {
      id: 's7',
      name: 'Дарья Соловьева',
      status: 'active',
      studentType: 'adult_student',
      parent: '— (самостоятельно, 20 лет)',
      parentPhone: '+7 (926) 555-12-34',
      group: 'English C1 Advanced',
      course: 'Английский язык',
      teacher: 'Мария Иванова',
      attendanceRate: '98%',
      absentLessons: 0,
      paymentStatus: 'paid',
      subscriptionEnd: '10.10.2026',
    },
  ]);

  const handleStudentCreated = (newStudent: NewStudentData) => {
    const studentItem: StudentListItem = {
      ...newStudent,
      status: (newStudent.status as 'active' | 'trial' | 'paused' | 'archived') || 'active',
      paymentStatus: (newStudent.paymentStatus as 'paid' | 'expected' | 'overdue') || 'paid',
      studentType: newStudent.studentType || 'school_student',
      absentLessons: 0,
      isChurnRisk: false,
    };
    setStudents((prev) => [studentItem, ...prev]);

    // Also push to in-memory INITIAL_STUDENTS so opening /students/[id] will load full data with notes
    const fullStudent: FullStudentData = {
      id: newStudent.id,
      firstName: newStudent.firstName,
      lastName: newStudent.lastName,
      status: newStudent.status as any,
      notes: newStudent.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      parents: [
        {
          id: `p_${Date.now()}`,
          firstName: newStudent.parent.split(' ')[0] || 'Родитель',
          lastName: newStudent.parent.split(' ')[1] || '',
          phone: newStudent.parentPhone || '',
          preferredChannel: 'telegram',
          relationshipType: 'Родитель',
          isPrimary: true,
        },
      ],
      groups: [
        {
          id: `g_${Date.now()}`,
          name: newStudent.group,
          courseName: newStudent.course,
          teacherName: newStudent.teacher,
          schedule: 'Пн, Чт 18:45',
          status: 'active',
          joinedAt: new Date().toLocaleDateString('ru-RU'),
        },
      ],
      attendanceStats: {
        totalLessons: 0,
        presentCount: 0,
        absentCount: 0,
        rescheduledCount: 0,
        attendanceRate: '100%',
        history: [],
      },
      finance: {
        activeSubscription: {
          period: '01.09.2026 – 30.09.2026',
          price: '7 600 ₽',
          status: 'active',
          lessonsAttended: '0 из 8 занятий',
          renewalDate: '30.09.2026',
        },
        payments: [],
      },
      interactions: [],
      tasks: [],
      teacherComments: [],
    };

    INITIAL_STUDENTS.unshift(fullStudent);
    toast.success(`Ученик ${newStudent.name} успешно добавлен в базу!`);
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.group.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.parent && s.parent.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'absences') {
      return s.isChurnRisk || (s.absentLessons !== undefined && s.absentLessons >= 3);
    }
    if (statusFilter === 'school_student' || statusFilter === 'adult_student') {
      return s.studentType === statusFilter;
    }
    return s.status === statusFilter;
  });

  const churnRiskCount = students.filter((s) => s.isChurnRisk || (s.absentLessons !== undefined && s.absentLessons >= 3)).length;

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ученики школы</h1>
          <p className="text-sm text-slate-500">
            Единая база учеников и совершеннолетних студентов • Всего: {students.length} (активных: {students.filter(s => s.status === 'active').length})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            + Новый ученик
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Поиск по имени ученика, родителю или группе..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            <span>Фильтр:</span>
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
            <option value="all">Все ученики ({students.length})</option>
            <option value="absences">⚠️ Риск оттока: 3+ пропуска ({churnRiskCount})</option>
            <option value="active">Активные</option>
            <option value="trial">Пробные</option>
            <option value="paused">На паузе</option>
            <option value="school_student">🎒 Школьники (с родителями)</option>
            <option value="adult_student">🎓 Студенты 18+ (самостоятельные)</option>
          </select>
        </div>
      </div>

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
            Показать всех учеников ✕
          </button>
        </div>
      )}

      {/* Students Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600">
              <tr>
                <th className="py-3.5 pl-4 pr-3">Ученик / Тип</th>
                <th className="px-3 py-3.5">Статус</th>
                <th className="px-3 py-3.5">Родитель / Контакт</th>
                <th className="px-3 py-3.5">Группа / Курс</th>
                <th className="px-3 py-3.5">Преподаватель</th>
                <th className="px-3 py-3.5 text-center">Посещаемость</th>
                <th className="px-3 py-3.5">Оплата / Абонемент</th>
                <th className="py-3.5 pl-3 pr-4 text-right">Карточка</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredStudents.map((student) => (
                <tr
                  key={student.id}
                  onClick={() => router.push(`/students/${student.id}`)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  <td className="py-3 pl-4 pr-3 font-semibold text-slate-900">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs',
                          student.studentType === 'adult_student'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-blue-100 text-blue-700'
                        )}
                      >
                        {student.studentType === 'adult_student' ? <GraduationCap size={15} /> : student.name[0]}
                      </div>
                      <div>
                        <span className="hover:text-blue-600 font-bold text-slate-900 transition-colors block">
                          {student.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {student.studentType === 'adult_student' ? '🎓 Студент (18+)' : '🎒 Школьник'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1 items-start">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 font-semibold text-[10px]',
                          student.status === 'active' && 'bg-emerald-100 text-emerald-800',
                          student.status === 'trial' && 'bg-purple-100 text-purple-800',
                          student.status === 'paused' && 'bg-amber-100 text-amber-800'
                        )}
                      >
                        {student.status === 'active' && 'Активен'}
                        {student.status === 'trial' && 'Пробный'}
                        {student.status === 'paused' && 'На паузе'}
                      </span>
                      {(student.isChurnRisk || (student.absentLessons !== undefined && student.absentLessons >= 3)) && (
                        <span className="rounded-md bg-rose-100 text-rose-800 px-1.5 py-0.5 font-bold text-[10px] flex items-center gap-1">
                          <AlertTriangle size={10} /> Риск оттока ({student.absentLessons} проп.)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-slate-800">{student.parent}</p>
                    <div className="flex items-center gap-1.5 mt-0.5" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[11px] text-slate-500">{student.parentPhone}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(student.parentPhone);
                          toast.success(`Номер скопирован: ${student.parentPhone}`);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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
                        className="p-1 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Позвонить"
                      >
                        <Phone size={12} />
                      </a>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-slate-800">{student.group}</p>
                    <p className="text-[11px] text-slate-500">{student.course}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{student.teacher}</td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={cn(
                        'font-bold',
                        student.isChurnRisk || (student.absentLessons !== undefined && student.absentLessons >= 3)
                          ? 'text-rose-600'
                          : 'text-slate-800'
                      )}
                    >
                      {student.attendanceRate}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      {student.paymentStatus === 'paid' && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Оплачен
                        </span>
                      )}
                      {student.paymentStatus === 'overdue' && (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                          <AlertCircle className="h-3.5 w-3.5" /> Долг
                        </span>
                      )}
                      {student.paymentStatus === 'expected' && (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                          <Clock className="h-3.5 w-3.5" /> Ожидается
                        </span>
                      )}
                    </div>
                    {student.subscriptionEnd !== '—' && (
                      <p className="text-[10px] text-slate-400">до {student.subscriptionEnd}</p>
                    )}
                  </td>
                  <td className="py-3 pl-3 pr-4 text-right">
                    <span className="inline-flex items-center text-xs font-semibold text-blue-600 group-hover:underline">
                      Открыть <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                    </span>
                  </td>
                </tr>
              ))}
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

