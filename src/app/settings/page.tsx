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
  Send,
  Globe,
  Euro
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
  CourseSettingItem,
  deduplicateCourseItems
} from '@/components/settings/CoursesSettingsModal';
import {
  RolesSecurityModal,
  RolePermissions
} from '@/components/settings/RolesSecurityModal';
import { TelegramSettingsModal } from '@/components/settings/TelegramSettingsModal';
import { useRole, usePermissions } from '@/context/RoleContext';

export default function SettingsPage() {
  const { role } = useRole();
  const { canManageSchoolSettings } = usePermissions();
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
          const mapped = data.courses.map((c: any) => ({
            id: c.id,
            name: c.name,
            ageGroup: c.ageGroup || '7-15 лет',
            monthlyPrice: `${c.rubMonth || 7600} ₽`,
            lessonDuration: c.lessonDuration || '60 мин',
            maxStudents: c.maxStudents || 8,
            status: c.isActive !== false ? 'active' : 'paused',
            color: 'bg-indigo-600',
          }));
          setCourses(deduplicateCourseItems(mapped));
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

  if (!canManageSchoolSettings) {
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Настройки школы</h1>
          <p className="text-sm text-slate-500">
            Параметры организации, учебные программы, доступы и интеграции
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Globe className="h-3.5 w-3.5" />
            Онлайн-платформа
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Euro className="h-3.5 w-3.5" />
            EUR
          </span>
        </div>
      </div>

      {/* 4 CATEGORY CARDS AT TOP */}
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
                  <p className="text-xs text-slate-500">Реквизиты и Faktura</p>
                </div>
              </div>
              <span className="rounded-lg bg-slate-50 p-1.5 text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
                <Edit3 className="h-3.5 w-3.5" />
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                Онлайн-школа
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                EUR (€)
              </span>
            </div>

            <div className="mt-3 space-y-1.5 text-xs text-slate-600">
              <p className="font-bold text-slate-900">{schoolProfile.name}</p>
              <div className="space-y-0.5 text-[11px] text-slate-500">
                <p className="truncate">Тел: {schoolProfile.phone || '—'}</p>
                <p className="truncate">Email: {schoolProfile.email || '—'}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Часы сетки:</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">
                    {String(schoolProfile.calendarStartHour ?? 9).padStart(2, '0')}:00 – {String(schoolProfile.calendarEndHour ?? 21).padStart(2, '0')}:00
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Банк:</span>
                  <span className="font-medium text-slate-800 truncate max-w-[120px]" title={schoolProfile.bankName}>
                    {schoolProfile.bankName || 'Tatra banka'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Счёт Faktura:</span>
                  <span className="font-mono text-[10px] text-slate-700">
                    #{schoolProfile.nextInvoiceNumber || '20260342'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-semibold">
            <span>Изменить данные</span>
            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 2: Курсы и направления */}
        <Link
          href="/admin/courses"
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-indigo-400 transition-all flex flex-col justify-between"
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
                  <p className="text-xs text-slate-500">Программы и тарифы</p>
                </div>
              </div>
              <span className="rounded-lg bg-slate-50 p-1.5 text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                Группы и инд.
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Тарифы EUR
              </span>
            </div>

            <div className="mt-3 space-y-1.5 text-xs text-slate-600">
              <p>
                Активных направлений: <strong>{courses.length > 0 ? courses.length : 26} программ</strong>
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {courses.slice(0, 3).map((c) => (
                  <span key={c.id} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                    {c.name}
                  </span>
                ))}
                {courses.length > 3 && (
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                    +{courses.length - 3}
                  </span>
                )}
              </div>
              <p className="pt-2 text-[11px] text-slate-500 border-t border-slate-100">
                Форматы: <strong>Групповые (до 8) и инд.</strong>
              </p>
              <p className="text-[11px] text-slate-500">
                Длительность: <strong>45–120 мин</strong> • Пробные уроки
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-semibold">
            <span>Настроить программы</span>
            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        {/* Card 3: Команда и доступ */}
        <Link
          href="/settings/team"
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-purple-400 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600 group-hover:bg-purple-100 transition-colors">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-purple-600 transition-colors">
                    Команда и доступ
                  </h3>
                  <p className="text-xs text-slate-500">Роли и безопасность</p>
                </div>
              </div>
              <span className="rounded-lg bg-slate-50 p-1.5 text-slate-400 group-hover:text-purple-600 group-hover:bg-purple-50 transition-colors">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> RLS активен
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                Owner защищен
              </span>
            </div>

            <div className="mt-3 space-y-1.5 text-xs text-slate-600">
              <p>
                Роли: <strong>Owner, Admin, Teacher</strong>
              </p>
              <p className="text-[11px] text-slate-500">
                Разграничение доступа на уровне интерфейса и Postgres RLS.
              </p>
              <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px]">
                <p className="text-slate-600">
                  Суперпользователь: <span className="font-bold text-purple-700">Не удаляемый</span>
                </p>
                <p className="text-slate-500">
                  Аудит действий и сессий активен
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-purple-600 font-semibold">
            <span>Управление доступом</span>
            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        {/* Card 4: Интеграции */}
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
                    Интеграции
                  </h3>
                  <p className="text-xs text-slate-500">Telegram & Webhooks</p>
                </div>
              </div>
              <span className="rounded-lg bg-slate-50 p-1.5 text-slate-400 group-hover:text-sky-600 group-hover:bg-sky-50 transition-colors">
                <Edit3 className="h-3.5 w-3.5" />
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                <Send className="h-3 w-3" /> Telegram Bot
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                Sheets Sync
              </span>
            </div>

            <div className="mt-3 space-y-1.5 text-xs text-slate-600">
              <p>
                Каналы: <strong>Администратор, Руководитель</strong>
              </p>
              <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-500">
                <p>
                  Бот: <span className="font-mono text-slate-700">••••••••</span> (токен скрыт)
                </p>
                <p>
                  Webhooks: <span className="font-semibold text-emerald-600">Проверка связи</span>
                </p>
                <p>
                  Резервный экспорт в Google Sheets
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-sky-600 font-semibold">
            <span>Настроить интеграции</span>
            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* LOWER ADMINISTRATION SECTION (Администрирование данных) */}
      <div className="pt-4 border-t border-slate-200/80">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">Администрирование данных</h2>
          <p className="text-xs text-slate-500">
            Инструменты импорта, 3NF дедупликации, резервного копирования и синхронизации базы
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 📥 Импорт Excel */}
          <Link
            href="/settings/import"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-emerald-400 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                        Импорт и миграция из Excel
                      </h3>
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        3NF Дедупликация
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Мастер переноса базы данных учеников и родителей
                    </p>
                  </div>
                </div>
                <span className="rounded-lg bg-slate-50 p-1.5 text-slate-400 group-hover:text-emerald-600 group-hover:bg-emerald-50 transition-colors">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                <p className="line-clamp-2">
                  Интеллектуальный перенос плоской таблицы Excel в нормализованную PostgreSQL базу. Автоматическое объединение детей одной семьи по телефону родителя без дублирования.
                </p>
                <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                  <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium">Шаблон Excel</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium">Мэппинг колонок</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium">Предпросмотр перед записью</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-600 font-bold">
              <span>Запустить мастер импорта</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 💾 Резервное копирование */}
          <Link
            href="/settings/backup"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-blue-400 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-50 p-3 text-blue-600 group-hover:bg-blue-100 transition-colors">
                    <Database className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
                        Резервное копирование базы данных
                      </h3>
                      <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                        Excel & Sheets
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Снимки схемы, экспорт таблиц и аварийное восстановление
                    </p>
                  </div>
                </div>
                <span className="rounded-lg bg-slate-50 p-1.5 text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                <p className="line-clamp-2">
                  Регулярный экспорт в человекочитаемом формате (многостраничный Excel и Google Таблицы). Гарантия сохранности данных при любых сбоях.
                </p>
                <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                  <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium">Снимки PostgreSQL</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium">Экспорт Excel</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium">Google Drive / Sheets</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-bold">
              <span>Управление копиями</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
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
