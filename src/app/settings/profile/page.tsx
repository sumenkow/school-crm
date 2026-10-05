'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronRight,
  Check,
  Building2,
  Phone,
  Mail,
  Globe,
  Clock,
  Landmark,
  Lock,
  Upload,
  Copy,
  Download,
  ExternalLink,
  Shield,
  Euro,
  Users,
  BookOpen,
  GraduationCap,
  Sparkles,
  MoreVertical,
  CheckCircle2,
  Video,
  FileText,
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useRole, usePermissions } from '@/context/RoleContext';
import {
  SchoolProfileData,
  DEFAULT_SCHOOL_PROFILE,
  getSchoolSettings,
  saveSchoolSettings,
  fetchSchoolSettingsFromCloud
} from '@/lib/data/schoolSettingsStorage';
import { getStoredCourses } from '@/lib/data/courseStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';

type ProfileTab = 'general' | 'contacts' | 'online' | 'hours' | 'banking';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function SchoolProfilePage() {
  const { canManageSchoolSettings } = usePermissions();
  const { success, info } = useToast();

  const [formData, setFormData] = useState<SchoolProfileData>(() => getSchoolSettings());
  const [activeTab, setActiveTab] = useState<ProfileTab>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Stats dynamically computed from storage
  const [stats, setStats] = useState({
    staffCount: 4,
    directionsCount: 6,
    activeStudentsCount: 18,
  });

  // Days of week state
  const [activeDays, setActiveDays] = useState<string[]>(() => {
    const raw = getSchoolSettings().workDays || 'Пн-Сб';
    if (raw === 'Пн-Вс') return ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    if (raw === 'Пн-Пт') return ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];
    if (raw === 'Сб-Вс') return ['Сб', 'Вс'];
    return ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  });

  useEffect(() => {
    const initial = getSchoolSettings();
    setFormData(initial);

    fetchSchoolSettingsFromCloud().then((cloud) => {
      if (cloud) {
        setFormData(cloud);
      }
    });

    // Compute dynamic stats
    try {
      const courses = getStoredCourses();
      const students = getStoredStudents();
      const activeCount = students.filter((s) => s.status === 'active').length;

      setStats({
        staffCount: 4, // 1 owner + 1 admin + 2 teachers
        directionsCount: courses.length > 0 ? courses.length : 6,
        activeStudentsCount: activeCount > 0 ? activeCount : 18,
      });
    } catch {
      // fallback
    }

    const handleSync = (e: any) => {
      if (e.detail) {
        setFormData(e.detail);
      } else {
        setFormData(getSchoolSettings());
      }
    };

    window.addEventListener('crm-school-settings-changed', handleSync);
    return () => window.removeEventListener('crm-school-settings-changed', handleSync);
  }, []);

  const handleChange = <K extends keyof SchoolProfileData>(field: K, value: SchoolProfileData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleDay = (day: string) => {
    let updated: string[];
    if (activeDays.includes(day)) {
      if (activeDays.length <= 1) return; // keep at least 1 day
      updated = activeDays.filter((d) => d !== day);
    } else {
      updated = [...activeDays, day].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
    }
    setActiveDays(updated);

    let daysString = updated.join(', ');
    if (updated.length === 7) daysString = 'Пн-Вс';
    else if (updated.length === 6 && !updated.includes('Вс')) daysString = 'Пн-Сб';
    else if (updated.length === 5 && !updated.includes('Сб') && !updated.includes('Вс')) daysString = 'Пн-Пт';

    const startH = formData.calendarStartHour ?? 9;
    const endH = formData.calendarEndHour ?? 21;
    const workHoursFormatted = `${daysString} ${String(startH).padStart(2, '0')}:00 - ${String(endH).padStart(2, '0')}:00`;

    setFormData((prev) => ({
      ...prev,
      workDays: daysString,
      workHours: workHoursFormatted,
    }));
  };

  const handleStartHourChange = (newStart: number) => {
    const endH = formData.calendarEndHour ?? 21;
    const safeEnd = Math.max(newStart + 1, endH);
    const days = formData.workDays || 'Пн-Сб';
    const formatted = `${days} ${String(newStart).padStart(2, '0')}:00 - ${String(safeEnd).padStart(2, '0')}:00`;

    setFormData((prev) => ({
      ...prev,
      calendarStartHour: newStart,
      calendarEndHour: safeEnd,
      workHours: formatted,
    }));
  };

  const handleEndHourChange = (newEnd: number) => {
    const startH = formData.calendarStartHour ?? 9;
    const safeStart = Math.min(newEnd - 1, startH);
    const days = formData.workDays || 'Пн-Сб';
    const formatted = `${days} ${String(safeStart).padStart(2, '0')}:00 - ${String(newEnd).padStart(2, '0')}:00`;

    setFormData((prev) => ({
      ...prev,
      calendarStartHour: safeStart,
      calendarEndHour: newEnd,
      workHours: formatted,
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    const cleaned: SchoolProfileData = {
      ...formData,
      schoolFormat: 'online',
      currency: 'EUR',
      branchName: 'Онлайн-школа',
      address: '',
      roomsDescription: 'Интерактивные онлайн-комнаты',
      calendarStartHour: formData.calendarStartHour ?? 9,
      calendarEndHour: formData.calendarEndHour ?? 21,
    };

    saveSchoolSettings(cleaned);
    setFormData(cleaned);

    setTimeout(() => {
      setIsSaving(false);
      success('Изменения профиля школы успешно сохранены');
    }, 250);
  };

  const handleResetDefaults = () => {
    setFormData(DEFAULT_SCHOOL_PROFILE);
    saveSchoolSettings(DEFAULT_SCHOOL_PROFILE);
    setActiveDays(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']);
    setShowMoreMenu(false);
    info('Восстановлены стандартные настройки профиля You Europe');
  };

  const handleCopyRequisites = () => {
    const payload = `Банк: ${formData.bankName}\nIBAN: ${formData.iban}\nSWIFT/BIC: ${formData.swiftBic}\nПолучатель: ${formData.accountHolder || formData.legalEntity}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(payload);
    }
    success('Реквизиты Tatra banka скопированы в буфер обмена');
    setShowMoreMenu(false);
  };

  const handleDownloadPDF = () => {
    const docTitle = `Реквизиты_${formData.name.replace(/\s+/g, '_')}_SEPA`;
    const printableText = [
      `=============================================================`,
      `                 ${formData.name.toUpperCase()} — ПРОФИЛЬ ШКОЛЫ`,
      `=============================================================`,
      `Слоган: ${formData.slogan}`,
      `Формат: Онлайн-школа (Zoom)`,
      `Телефон: ${formData.phone}`,
      `Email: ${formData.email}`,
      `Часовой пояс: ${formData.timezone}`,
      `Режим работы: ${formData.workHours}`,
      ``,
      `-------------------------------------------------------------`,
      `            ЕВРОПЕЙСКИЕ БАНКОВСКИЕ РЕКВИЗИТЫ (SEPA)`,
      `-------------------------------------------------------------`,
      `Владелец счёта (Kontoinhaber): ${formData.accountHolder || formData.legalEntity}`,
      `Наименование банка:            ${formData.bankName}`,
      `Код банка (BIK):               ${formData.bik || '1100'}`,
      `IBAN:                          ${formData.iban}`,
      `SWIFT / BIC:                   ${formData.swiftBic}`,
      `Следующий счёт Faktura:        #${formData.nextInvoiceNumber}`,
      `Статус НДС (VAT note):         ${formData.vatNote}`,
      `Основная валюта:               EUR (€)`,
      `=============================================================`,
      `Дата формирования: ${new Date().toLocaleDateString('ru-RU')}`,
    ].join('\n');

    const blob = new Blob([printableText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docTitle}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    success('Карточка реквизитов успешно сформирована и загружена');
    setShowMoreMenu(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        info('Размер файла превышает 2 МБ. Выберите меньший файл.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handleChange('logoUrl', event.target.result as string);
          success('Логотип школы успешно загружен');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!canManageSchoolSettings) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Профиль школы</h1>
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 mb-4">
            <Shield className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Доступ ограничен</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Управление параметрами организации и банковскими реквизитами доступно только в режиме Владельца школы.
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
    <div className="space-y-6 max-w-6xl mx-auto pb-20 px-4 sm:px-6">
      {/* 1. Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Link
          href="/settings"
          className="flex items-center gap-1 text-slate-600 hover:text-blue-600 transition-colors font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Настройки школы</span>
        </Link>
        <ChevronRight className="h-3 w-3 text-slate-400" />
        <span className="text-slate-900 font-semibold">Профиль школы</span>
      </nav>

      {/* 2. Top Header & Primary Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Building2 className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Профиль школы</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Основная информация об организации, контакты, формат обучения, рабочие часы и банковские реквизиты
          </p>
        </div>

        <div className="flex items-center gap-2 relative">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-98 transition-all disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            <span>{isSaving ? 'Сохранение...' : 'Сохранить изменения'}</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
              title="Дополнительные действия"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
                <button
                  onClick={handleCopyRequisites}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 font-medium text-left"
                >
                  <Copy className="h-3.5 w-3.5 text-slate-400" />
                  <span>Скопировать реквизиты</span>
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 font-medium text-left"
                >
                  <Download className="h-3.5 w-3.5 text-slate-400" />
                  <span>Скачать реквизиты (PDF)</span>
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  onClick={handleResetDefaults}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 font-medium text-left"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-rose-400" />
                  <span>Сбросить к исходным</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Tab Bar (5 Tabs) */}
      <div className="border-b border-slate-200 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 min-w-max pb-px">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'general'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Основная информация</span>
          </button>

          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'contacts'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Phone className="h-4 w-4" />
            <span>Контакты</span>
          </button>

          <button
            onClick={() => setActiveTab('online')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'online'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Globe className="h-4 w-4" />
            <span>Онлайн-формат</span>
            <span className="text-[10px] font-extrabold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded-full">
              Zoom
            </span>
          </button>

          <button
            onClick={() => setActiveTab('hours')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'hours'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Рабочие часы</span>
          </button>

          <button
            onClick={() => setActiveTab('banking')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'banking'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Landmark className="h-4 w-4" />
            <span>Банковские реквизиты</span>
            <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">
              EUR / SEPA
            </span>
          </button>
        </div>
      </div>

      {/* 4. Main Two-Column Layout (2/3 Left Form & 1/3 Right Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 2/3 Content Form Container */}
        <div className="lg:col-span-8 space-y-6">
          {/* TAB 1: ОСНОВНАЯ ИНФОРМАЦИЯ */}
          {activeTab === 'general' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 text-slate-500">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  Основная информация об организации
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Название школы, слоган, публичное описание и официальный логотип
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Название школы <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    placeholder="You Europe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Слоган / Краткое описание
                  </label>
                  <input
                    type="text"
                    value={formData.slogan}
                    onChange={(e) => handleChange('slogan', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    placeholder="Центр европейского образования и подготовки"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Полное описание школы
                </label>
                <textarea
                  rows={4}
                  value={
                    formData.description ??
                    'Онлайн-школа по подготовке к поступлению в вузы Германии и Австрии. Комплексные программы подготовки по немецкому языку, математике и профильным предметам.'
                  }
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3.5 text-xs text-slate-800 leading-relaxed focus:border-blue-500 focus:outline-hidden"
                  placeholder="Опишите направления подготовки, подход и преимущества школы..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Юридическое лицо / Ответственное лицо
                </label>
                <input
                  type="text"
                  value={formData.legalEntity}
                  onChange={(e) => {
                    handleChange('legalEntity', e.target.value);
                    if (!formData.accountHolder) {
                      handleChange('accountHolder', e.target.value);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-hidden"
                  placeholder="Ekaterina Nezhenkina"
                />
              </div>

              {/* Логотип в рамке */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Логотип школы
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-white text-blue-600 shadow-2xs overflow-hidden shrink-0">
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="School Logo" className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center">
                        <span className="font-extrabold text-blue-600 text-sm tracking-wider">YE</span>
                        <span className="text-[9px] font-bold text-slate-400">EUROPE</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <p className="text-xs font-bold text-slate-900">Официальный логотип You Europe</p>
                    <p className="text-[11px] text-slate-500">
                      Рекомендуемый формат: PNG, JPG или SVG до 2 МБ. Отображается в шапке, отчетах и счетах-фактурах.
                    </p>
                    <div className="pt-1">
                      <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs transition-colors">
                        <Upload className="h-3.5 w-3.5 text-blue-600" />
                        <span>Заменить логотип (PNG, JPG или SVG до 2 МБ)</span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/svg+xml"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: КОНТАКТЫ */}
          {activeTab === 'contacts' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 text-slate-500">
                  <Phone className="h-4 w-4 text-blue-600" />
                  Контакты школы и каналы связи
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Официальные контакты для связи с учениками, родителями и партнерами
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Телефон школы <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    placeholder="+7 981 715-53-37"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Электронная почта <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    placeholder="info@youeurope.eu"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Часовой пояс работы школы
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => handleChange('timezone', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 bg-white focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="UTC+1 (Братислава / Вена)">UTC+1 (Братислава / Вена, CET)</option>
                  <option value="UTC+2 (Берлин / Прага)">UTC+2 (Берлин / Прага, CEST)</option>
                  <option value="UTC+3 (Москва / Санкт-Петербург)">UTC+3 (Москва / Санкт-Петербург)</option>
                </select>
              </div>

              <div className="rounded-xl bg-blue-50/70 border border-blue-200/80 p-4 flex items-start gap-3 text-xs text-blue-900">
                <Mail className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Каналы официальных коммуникаций</p>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    Данный email используется при отправке счетов Faktura, подтверждений об оплате занятий и уведомлений об изменении расписания уроков.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ОНЛАЙН-ФОРМАТ */}
          {activeTab === 'online' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 text-slate-500">
                  <Globe className="h-4 w-4 text-blue-600" />
                  Онлайн-формат обучения (100% дистанционно)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Строгая архитектурная фиксация: отсутствие физических филиалов и аудиторий
                </p>
              </div>

              {/* Read-only плашка с замком */}
              <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-4 sm:p-5 flex items-start gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shrink-0 shadow-xs">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-extrabold text-blue-950">Онлайн-школа</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                      Системное ограничение (Zero Classrooms)
                    </span>
                  </div>
                  <p className="text-xs text-blue-900 font-medium">
                    Школа работает только в онлайн-формате.
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Все занятия, группы, пробные уроки и консультации проводятся строго дистанционно через видеоконференции. Отсутствуют расходы на аренду классов и офлайн-адреса.
                  </p>
                </div>
              </div>

              {/* Платформа Zoom */}
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                      <Video className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">Основная онлайн-платформа: Zoom</h3>
                      <p className="text-[11px] text-slate-500">
                        Используется для проведения групповых и индивидуальных занятий
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Подключено
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-[11px]">
                  <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Групповые комнаты
                    </span>
                    <p className="text-slate-500">До 100 участников в HD качестве</p>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Облачная запись
                    </span>
                    <p className="text-slate-500">Автосохранение архива уроков</p>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Интерактивные доски
                    </span>
                    <p className="text-slate-500">Совместная работа с материалами</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: РАБОЧИЕ ЧАСЫ */}
          {activeTab === 'hours' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 text-slate-500">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Рабочие часы и сетка расписания
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Эти часы используются в календаре при создании и переносе занятий
                </p>
              </div>

              {/* Пилюли дней недели */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Рабочие дни недели (кликните для переключения)
                </label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => {
                    const isSelected = activeDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleDay(day)}
                        className={`h-9 w-11 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-blue-200 scale-102'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Выбрано: <strong>{formData.workDays || 'Пн-Сб'}</strong>
                </p>
              </div>

              {/* Время работы */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Начало рабочего дня (сетка расписания)
                  </label>
                  <select
                    value={formData.calendarStartHour ?? 9}
                    onChange={(e) => handleStartHourChange(parseInt(e.target.value, 10))}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 bg-white focus:border-blue-500 focus:outline-hidden"
                  >
                    {[6, 7, 8, 9, 10, 11, 12].map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, '0')}:00 {h === 9 ? '(09:00 по умолчанию)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Окончание рабочего дня (сетка расписания)
                  </label>
                  <select
                    value={formData.calendarEndHour ?? 21}
                    onChange={(e) => handleEndHourChange(parseInt(e.target.value, 10))}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 bg-white focus:border-blue-500 focus:outline-hidden"
                  >
                    {[18, 19, 20, 21, 22, 23, 24].map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, '0')}:00 {h === 21 ? '(21:00 по умолчанию)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Информационная плашка часов */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500">Активный диапазон расписания:</span>
                  <p className="font-extrabold text-slate-900 text-sm">
                    {formData.workHours || 'Пн-Сб 09:00 - 21:00'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Эти часы используются в календаре при создании и переносе занятий
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[11px] text-slate-500">Продолжительность сетки:</span>
                  <p className="font-bold text-blue-600 text-sm">
                    {(formData.calendarEndHour ?? 21) - (formData.calendarStartHour ?? 9) + 1} ч./день
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: БАНКОВСКИЕ РЕКВИЗИТЫ */}
          {activeTab === 'banking' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 text-slate-500">
                    <Landmark className="h-4 w-4 text-emerald-600" />
                    Банковские реквизиты (SEPA / Tatra banka)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Официальные реквизиты для европейских счетов-фактур (Faktura) и платежей SEPA
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  EUR / SEPA
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Владелец счёта (Kontoinhaber)
                  </label>
                  <input
                    type="text"
                    value={formData.accountHolder || formData.legalEntity}
                    onChange={(e) => handleChange('accountHolder', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    placeholder="Ekaterina Nezhenkina"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Наименование банка
                  </label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => handleChange('bankName', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    placeholder="Tatra banka, a.s."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    IBAN (Международный номер счёта)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.iban}
                      onChange={(e) => {
                        handleChange('iban', e.target.value);
                        handleChange('bankAccount', e.target.value);
                      }}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden pr-9"
                      placeholder="SK34 1100 0000 0029 3766 3128"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.iban && typeof navigator !== 'undefined') {
                          navigator.clipboard.writeText(formData.iban);
                          success('IBAN скопирован');
                        }
                      }}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-blue-600 transition-colors"
                      title="Скопировать IBAN"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    SWIFT / BIC код
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.swiftBic}
                      onChange={(e) => handleChange('swiftBic', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden pr-9"
                      placeholder="TATRSKBX"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.swiftBic && typeof navigator !== 'undefined') {
                          navigator.clipboard.writeText(formData.swiftBic);
                          success('SWIFT код скопирован');
                        }
                      }}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-blue-600 transition-colors"
                      title="Скопировать SWIFT"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Следующий номер счёта Faktura
                  </label>
                  <input
                    type="number"
                    value={formData.nextInvoiceNumber || 20260342}
                    onChange={(e) => handleChange('nextInvoiceNumber', parseInt(e.target.value, 10) || 20260342)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    placeholder="20260342"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Автоматически инкрементируется при каждом выставлении счета
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Статус НДС (VAT status)
                  </label>
                  <input
                    type="text"
                    value={formData.vatNote || 'Nicht umsatzsteuerpflichtig / Neplátiteľ DPH'}
                    onChange={(e) => handleChange('vatNote', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    placeholder="Nicht umsatzsteuerpflichtig / Neplátiteľ DPH"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Освобождение от уплаты НДС согласно законодательству ЕС
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-4 flex items-start gap-3 text-xs text-emerald-950">
                <Euro className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Европейский стандарт Faktura & SEPA</p>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Данные реквизиты Tatra banka автоматически подставляются в счета-фактуры и квитанции об оплате в евро (€).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 1/3 Sidebar Widgets */}
        <div className="lg:col-span-4 space-y-5">
          {/* Widget 1: Статус школы */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Статус школы
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Активна
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Школа работает и доступна для учеников.
            </p>
            <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
              <div className="flex items-center justify-between">
                <span>Формат обучения:</span>
                <span className="font-bold text-slate-800">100% Онлайн</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Синхронизация с облаком:</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Активна
                </span>
              </div>
            </div>
          </div>

          {/* Widget 2: Основная валюта */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Основная валюта
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Euro className="h-4 w-4" />
              </div>
            </div>
            <div>
              <p className="text-lg font-black text-slate-900 tracking-tight">EUR (€)</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Используется для цен, платежей и счетов
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              Единый стандарт расчетов в зоне евро (SEPA).
            </div>
          </div>

          {/* Widget 3: Статистика */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Статистика школы
            </span>
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex justify-center text-slate-400 mb-1">
                  <Users className="h-3.5 w-3.5" />
                </div>
                <p className="text-base font-black text-slate-900">{stats.staffCount}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-0.5">сотрудника</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex justify-center text-slate-400 mb-1">
                  <BookOpen className="h-3.5 w-3.5" />
                </div>
                <p className="text-base font-black text-slate-900">{stats.directionsCount}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-0.5">направлений</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex justify-center text-slate-400 mb-1">
                  <GraduationCap className="h-3.5 w-3.5" />
                </div>
                <p className="text-base font-black text-slate-900">{stats.activeStudentsCount}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-0.5">учеников</p>
              </div>
            </div>
          </div>

          {/* Widget 4: Быстрые действия */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Быстрые действия
            </span>

            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-xs font-semibold text-slate-700 hover:text-blue-600 transition-all text-left"
            >
              <div className="flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
                <span>Открыть страницу школы &gt;</span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleCopyRequisites}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-xs font-semibold text-slate-700 hover:text-emerald-700 transition-all text-left"
            >
              <div className="flex items-center gap-2">
                <Copy className="h-3.5 w-3.5 text-emerald-500" />
                <span>Скопировать данные &gt;</span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/40 text-xs font-semibold text-slate-700 hover:text-purple-700 transition-all text-left"
            >
              <div className="flex items-center gap-2">
                <Download className="h-3.5 w-3.5 text-purple-500" />
                <span>Скачать реквизиты (PDF) &gt;</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Предпросмотр карточки школы */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">{formData.name}</h3>
                <p className="text-xs text-slate-500">{formData.slogan}</p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p className="leading-relaxed">{formData.description}</p>
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/80 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Формат:</span>
                  <span className="font-bold text-slate-900">Онлайн-школа (Zoom)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Часы работы:</span>
                  <span className="font-bold text-slate-900">{formData.workHours}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Телефон:</span>
                  <span className="font-bold text-slate-900">{formData.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-bold text-slate-900">{formData.email}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
