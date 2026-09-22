'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Settings,
  Shield,
  School,
  BookOpen,
  Users,
  Database,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Edit3,
  Bot,
  Send
} from 'lucide-react';
import {
  SchoolProfileModal,
  SchoolProfileData
} from '@/components/settings/SchoolProfileModal';
import {
  getSchoolSettings,
  saveSchoolSettings,
  fetchSchoolSettingsFromCloud
} from '@/lib/data/schoolSettingsStorage';
import {
  CoursesSettingsModal,
  CourseSettingItem
} from '@/components/settings/CoursesSettingsModal';
import {
  RolesSecurityModal,
  RolePermissions
} from '@/components/settings/RolesSecurityModal';
import { TelegramSettingsModal } from '@/components/settings/TelegramSettingsModal';
import { useRole } from '@/context/RoleContext';

export default function SettingsPage() {
  const { role } = useRole();
  const [activeModal, setActiveModal] = useState<'school' | 'courses' | 'roles' | 'telegram' | null>(null);
  const [cloudSynced, setCloudSynced] = useState(true);

  // 1. School Profile State (from storage/DB)
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfileData>(() => getSchoolSettings());

  React.useEffect(() => {
    setSchoolProfile(getSchoolSettings());

    fetchSchoolSettingsFromCloud().then((cloudData) => {
      if (cloudData) {
        setSchoolProfile(cloudData);
        setCloudSynced(true);
      }
    });

    // Check query params for ?tab=courses
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'courses') {
        setActiveModal('courses');
      }
    }

    // Load courses from Supabase/API
    fetch('/api/courses')
      .then((res) => res.json())
      .then((data) => {
        if (data.courses && Array.isArray(data.courses) && data.courses.length > 0) {
          setCourses(
            data.courses.map((c: any) => ({
              id: c.id,
              name: c.name,
              ageGroup: c.ageGroup || '7-15 лет',
              monthlyPrice: `${c.rubMonth || 7600} ₽`,
              lessonDuration: c.lessonDuration || '60 мин',
              maxStudents: c.maxStudents || 8,
              status: c.isActive !== false ? 'active' : 'paused',
              color: 'bg-indigo-600',
            }))
          );
        }
      })
      .catch((err) => console.warn('Could not load /api/courses in settings:', err));

    const handleSync = () => {
      setSchoolProfile(getSchoolSettings());
      setCloudSynced(true);
    };

    window.addEventListener('crm-school-settings-changed', handleSync);
    return () => {
      window.removeEventListener('crm-school-settings-changed', handleSync);
    };
  }, []);

  // 2. Courses State
  const [courses, setCourses] = useState<CourseSettingItem[]>([
    {
      id: 'c1',
      name: 'Английский язык',
      ageGroup: '6-16 лет',
      monthlyPrice: '7 600 ₽',
      lessonDuration: '60 мин',
      maxStudents: 8,
      status: 'active',
      color: 'bg-blue-600',
    },
    {
      id: 'c2',
      name: 'Робототехника и IT',
      ageGroup: '7-14 лет',
      monthlyPrice: '8 400 ₽',
      lessonDuration: '90 мин',
      maxStudents: 6,
      status: 'active',
      color: 'bg-indigo-600',
    },
    {
      id: 'c3',
      name: 'Олимпиадная математика',
      ageGroup: '8-15 лет',
      monthlyPrice: '6 800 ₽',
      lessonDuration: '60 мин',
      maxStudents: 8,
      status: 'active',
      color: 'bg-teal-600',
    },
    {
      id: 'c4',
      name: 'Скорочтение и память',
      ageGroup: '5-12 лет',
      monthlyPrice: '5 900 ₽',
      lessonDuration: '45 мин',
      maxStudents: 6,
      status: 'active',
      color: 'bg-amber-600',
    },
  ]);

  // 3. Roles & Security State
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>({
    admin: {
      viewFinancialReports: true,
      acceptPayments: true,
      exportDatabase: false,
      deleteRecords: false,
    },
    teacher: {
      viewParentContacts: true,
      addStudentNotes: true,
      viewStudentBalances: false,
      viewOtherTeachersSchedule: false,
    },
    security: {
      require2FAForAdmin: true,
      auditLogEnabled: true,
      sessionTimeoutDays: 30,
      rlsEnforced: true,
    },
  });

  if (role !== 'owner' && role !== 'developer') {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto py-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Настройки школы</h1>
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 mb-4">
            <Shield className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Доступ ограничен</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Управление параметрами организации, курсами, миграцией базы и безопасностью доступно только в режиме Владельца школы.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
            >
              Вернуться на дашборд
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Настройки школы</h1>
        <p className="text-sm text-slate-500">
          Параметры организации, миграция данных, курсы и права доступа сотрудников
        </p>
      </div>

      {/* SPECIAL FEATURE BANNER: EXCEL MIGRATION TOOL (Section 17) */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 via-teal-50/60 to-emerald-50/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shrink-0 shadow-xs">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Раздел 17 ТЗ
              </span>
              <span className="text-xs text-emerald-800 font-semibold">3NF Дедупликация</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              Импорт и миграция базы из Excel
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-xl">
              Интеллектуальный перенос плоской таблицы Excel в нормализованную PostgreSQL базу. Автоматическое объединение детей одной семьи по телефону родителя без дублирования.
            </p>
          </div>
        </div>

        <Link
          href="/settings/import"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all shrink-0 active:scale-98"
        >
          Запустить мастер импорта
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* BACKUP & DISASTER RECOVERY BANNER */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-blue-50/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shrink-0 shadow-xs">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                Безопасность данных
              </span>
              <span className="text-xs text-blue-800 font-semibold">Excel & Google Sheets</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              Резервное копирование базы данных
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-xl">
              Регулярный экспорт в человекочитаемом формате (Excel многостраничный файл и Google Таблицы раз в сутки). Гарантия сохранности данных при любых сбоях.
            </p>
          </div>
        </div>

        <Link
          href="/settings/backup"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all shrink-0 active:scale-98"
        >
          Управление копиями
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* 4 EDITABLE SETTING CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Профиль школы */}
        <div
          onClick={() => setActiveModal('school')}
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 group-hover:bg-blue-100 transition-colors">
                  <School className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                    Профиль школы
                  </h3>
                  <p className="text-xs text-slate-500">Название, реквизиты, филиалы</p>
                </div>
              </div>
              <span className="rounded-lg bg-slate-50 p-1.5 text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
                <Edit3 className="h-3.5 w-3.5" />
              </span>
            </div>

            <div className="mt-4 space-y-1 text-xs text-slate-600">
              <p className="font-bold text-slate-900">{schoolProfile.name}</p>
              <p className="text-[11px] text-slate-500 line-clamp-1">{schoolProfile.slogan}</p>
              <p className="pt-2 text-slate-600 border-t border-slate-100">
                Филиал: <strong>{schoolProfile.branchName}</strong> ({schoolProfile.roomsDescription})
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-semibold">
            <span>Изменить данные</span>
            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 2: Курсы и направления */}
        <div
          onClick={() => setActiveModal('courses')}
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-indigo-400 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                    Курсы и направления
                  </h3>
                  <p className="text-xs text-slate-500">Предметы, программы и цены</p>
                </div>
              </div>
              <span className="rounded-lg bg-slate-50 p-1.5 text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                <Edit3 className="h-3.5 w-3.5" />
              </span>
            </div>

            <div className="mt-4 space-y-1 text-xs text-slate-600">
              <p>
                Активных направлений: <strong>{courses.filter(c => c.status === 'active').length} курса</strong>
              </p>
              <div className="flex flex-wrap gap-1.5 pt-2">
                {courses.slice(0, 3).map((c) => (
                  <span key={c.id} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                    {c.name}
                  </span>
                ))}
                {courses.length > 3 && (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    +{courses.length - 3}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-semibold">
            <span>Настроить программы</span>
            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 3: Роли и безопасность */}
        <div
          onClick={() => setActiveModal('roles')}
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-purple-400 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600 group-hover:bg-purple-100 transition-colors">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-purple-600 transition-colors">
                    Роли и безопасность
                  </h3>
                  <p className="text-xs text-slate-500">Row Level Security и доступы</p>
                </div>
              </div>
              <span className="rounded-lg bg-slate-50 p-1.5 text-slate-400 group-hover:text-purple-600 group-hover:bg-purple-50 transition-colors">
                <Edit3 className="h-3.5 w-3.5" />
              </span>
            </div>

            <div className="mt-4 space-y-1.5 text-xs text-slate-600">
              <p>
                Конфигурация: <strong>Owner, Admin, Teacher</strong>
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> RLS активен
                </span>
                {rolePermissions.security.require2FAForAdmin && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                    2FA
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-purple-600 font-semibold">
            <span>Управление правами</span>
            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 4: Telegram-бот и уведомления */}
        <div
          onClick={() => setActiveModal('telegram')}
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-sky-400 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-sky-50 p-2.5 text-sky-600 group-hover:bg-sky-100 transition-colors">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-sky-600 transition-colors">
                    Telegram-бот
                  </h3>
                  <p className="text-xs text-slate-500">Уведомления и аудит</p>
                </div>
              </div>
              <span className="rounded-lg bg-slate-50 p-1.5 text-slate-400 group-hover:text-sky-600 group-hover:bg-sky-50 transition-colors">
                <Edit3 className="h-3.5 w-3.5" />
              </span>
            </div>

            <div className="mt-4 space-y-1.5 text-xs text-slate-600">
              <p>
                Каналы: <strong>Администратор, Руководитель</strong>
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                  <Send className="h-3 w-3" /> Push-оповещения
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-sky-600 font-semibold">
            <span>Настроить бота</span>
            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* MODALS */}
      <SchoolProfileModal
        isOpen={activeModal === 'school'}
        onClose={() => setActiveModal(null)}
        data={schoolProfile}
        onSave={(updated) => {
          setSchoolProfile(updated);
          saveSchoolSettings(updated);
        }}
      />

      <CoursesSettingsModal
        isOpen={activeModal === 'courses'}
        onClose={() => setActiveModal(null)}
        courses={courses.filter(Boolean).filter((c) => Boolean(c && c.name && c.name.trim()))}
        onSave={setCourses}
      />

      <RolesSecurityModal
        isOpen={activeModal === 'roles'}
        onClose={() => setActiveModal(null)}
        permissions={rolePermissions}
        onSave={setRolePermissions}
      />

      <TelegramSettingsModal
        isOpen={activeModal === 'telegram'}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}
