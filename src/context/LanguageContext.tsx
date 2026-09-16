'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type SupportedLanguage = 'ru' | 'en' | 'de';

export interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, fallback?: string) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
}

export const LANGUAGE_LABELS: Record<SupportedLanguage, { label: string; flag: string; nativeName: string; short: string }> = {
  ru: { label: 'Русский', flag: '🇷🇺', nativeName: 'Русский', short: 'RU' },
  en: { label: 'English', flag: '🇬🇧', nativeName: 'English', short: 'EN' },
  de: { label: 'Deutsch', flag: '🇩🇪', nativeName: 'Deutsch', short: 'DE' },
};

const STORAGE_KEY = 'crm_app_language_v1';

export const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  ru: {
    // App & Brand
    'app.title': 'YouEurope School CRM',
    'app.subtitle': 'Управление школой',
    'app.tagline': 'Единая платформа управления образовательной школой',

    // Navigation
    'nav.main': 'Главная',
    'nav.myDay': 'Мой день',
    'nav.calendar': 'Календарь',
    'nav.students': 'Ученики',
    'nav.parents': 'Родители',
    'nav.groups': 'Группы',
    'nav.crm': 'CRM (Лиды)',
    'nav.tasks': 'Задачи',
    'nav.finance': 'Оплаты',
    'nav.analytics': 'Аналитика',
    'nav.myLessons': 'Мои занятия',
    'nav.attendanceJournal': 'Журнал посещаемости',
    'nav.team': 'Команда и преподаватели',
    'nav.import': 'Импорт Excel',
    'nav.backup': 'Бэкап базы',
    'nav.settings': 'Настройки',
    'nav.help': 'Справка и гид',
    'nav.collapse': 'Свернуть панель',
    'nav.expand': 'Развернуть панель',

    // Navigation Sections
    'nav.section.students': 'Ученики',
    'nav.section.sales': 'Продажи',
    'nav.section.finance': 'Финансы и аналитика',
    'nav.section.admin': 'Администрирование',
    'nav.section.kb': 'База знаний',

    // Roles
    'role.owner': 'Владелец',
    'role.admin': 'Администратор',
    'role.teacher': 'Преподаватель',
    'role.developer': 'Разработчик',
    'role.switchRole': 'Переключить роль',
    'role.teacherCabinet': 'Кабинет преподавателя',
    'role.adminCabinet': 'Кабинет администратора',
    'role.ownerCabinet': 'Панель руководителя',

    // TopBar
    'topbar.searchPlaceholder': 'Поиск по ученикам, родителям, группам и лидам... (Cmd+K)',
    'topbar.profile': 'Профиль пользователя',
    'topbar.logout': 'Выйти из системы',
    'topbar.notifications': 'Уведомления',
    'topbar.language': 'Язык интерфейса',

    // Common Actions & Buttons
    'action.scheduleLesson': 'Запланировать занятие',
    'action.editLesson': 'Изменить параметры урока',
    'action.addStudent': 'Добавить ученика',
    'action.newContact': 'Новый контакт',
    'action.addChild': 'Добавить ребенка',
    'action.addPayment': 'Добавить платёж',
    'action.createTask': 'Создать задачу',
    'action.addAction': 'Добавить действие',
    'action.save': 'Сохранить',
    'action.saveChanges': 'Сохранить изменения',
    'action.cancel': 'Отмена',
    'action.edit': 'Изменить',
    'action.delete': 'Удалить',
    'action.close': 'Закрыть',
    'action.filter': 'Фильтр',
    'action.search': 'Поиск',
    'action.send': 'Отправить',
    'action.sendHomework': 'Отправить домашнее задание',
    'action.back': 'Назад',
    'action.viewCard': 'Карточка урока',
    'action.familyProfile': 'Карточка семьи',
    'action.studentProfile': 'Профиль ученика',
    'action.pay': 'Пополнить',
    'action.settleDebt': 'Погасить долг',

    // Statuses
    'status.active': 'Активен',
    'status.trial': 'Пробный',
    'status.paused': 'На паузе',
    'status.finished': 'Завершен',
    'status.archived': 'В архиве',
    'status.paid': 'Оплачено',
    'status.unpaid': 'Не оплачено',
    'status.overdue': 'Просрочено',
    'status.trial_paid': 'Пробный оплачен',
    'status.trial_unpaid': 'Пробный не оплачен',
    'status.present': 'Присутствовал',
    'status.absent': 'Отсутствовал',
    'status.excused': 'Уважительная',
    'status.rescheduled': 'Перенесен',
    'status.completed': 'Проведено',
    'status.scheduled': 'Запланировано',
    'status.open': 'Открыта',
    'status.done': 'Выполнена',

    // Hero & Detail Blocks
    'hero.nextLesson': 'Следующее занятие',
    'hero.nextLessonChildren': 'Следующее занятие детей',
    'hero.noLessons': 'Нет запланированных занятий в расписании',
    'hero.topic': 'Тема',
    'hero.homework': 'Д/З',
    'hero.teacher': 'Преподаватель',
    'hero.room': 'Место',
    'hero.balance': 'Баланс',
    'hero.deposit': 'Депозит',
    'hero.debt': 'Долг',
    'hero.preferredChannel': 'Предпочтительный канал',
    'hero.channel.email': 'Электронная почта',
    'hero.channel.telegram': 'Telegram',
    'hero.channel.both': 'Почта и Telegram',
    'hero.channel.whatsapp': 'WhatsApp',

    // Dashboard
    'dashboard.lessonsToday': 'Уроков сегодня',
    'dashboard.myGroups': 'Мои группы',
    'dashboard.attendance': 'Посещаемость',
    'dashboard.todayLessonsTitle': 'Мои уроки на сегодня',
    'dashboard.allLessons': 'Все занятия',
    'dashboard.allGroups': 'Все группы',
    'dashboard.upcomingPayments': 'Ожидаемые платежи',
    'dashboard.urgentTasks': 'Срочные задачи',

    // Parents & Students
    'parents.title': 'Родители и контакты',
    'parents.subtitle': 'Реестр контактных лиц и законных представителей • Единый профиль семьи',
    'parents.search': 'Поиск родителя по имени, телефону или ребенку...',
    'parents.childrenCount': 'Дети',
    'parents.totalPaid': 'Всего оплат',
    'parents.familyDebt': 'Долг семьи',
    'parents.familyDeposit': 'Депозит семьи',
    'students.title': 'Ученики школы',
    'students.subtitle': 'Единый реестр учащихся, групп и успеваемости',
    'students.ageGrade': 'Класс / Возраст',

    // Toast Messages
    'toast.languageChanged': 'Язык интерфейса изменен',
  },

  en: {
    // App & Brand
    'app.title': 'YouEurope School CRM',
    'app.subtitle': 'School Management',
    'app.tagline': 'Unified Education School Management Platform',

    // Navigation
    'nav.main': 'Dashboard',
    'nav.myDay': 'My Day',
    'nav.calendar': 'Calendar',
    'nav.students': 'Students',
    'nav.parents': 'Parents',
    'nav.groups': 'Groups',
    'nav.crm': 'CRM (Leads)',
    'nav.tasks': 'Tasks',
    'nav.finance': 'Payments',
    'nav.analytics': 'Analytics',
    'nav.myLessons': 'My Lessons',
    'nav.attendanceJournal': 'Attendance Log',
    'nav.team': 'Team & Teachers',
    'nav.import': 'Excel Import',
    'nav.backup': 'Database Backup',
    'nav.settings': 'Settings',
    'nav.help': 'Help & Guide',
    'nav.collapse': 'Collapse sidebar',
    'nav.expand': 'Expand sidebar',

    // Navigation Sections
    'nav.section.students': 'Students',
    'nav.section.sales': 'Sales',
    'nav.section.finance': 'Finance & Analytics',
    'nav.section.admin': 'Administration',
    'nav.section.kb': 'Knowledge Base',

    // Roles
    'role.owner': 'Owner',
    'role.admin': 'Admin',
    'role.teacher': 'Teacher',
    'role.developer': 'Developer',
    'role.switchRole': 'Switch Role',
    'role.teacherCabinet': 'Teacher Cabinet',
    'role.adminCabinet': 'Admin Cabinet',
    'role.ownerCabinet': 'Executive Dashboard',

    // TopBar
    'topbar.searchPlaceholder': 'Search students, parents, groups and leads... (Cmd+K)',
    'topbar.profile': 'User Profile',
    'topbar.logout': 'Sign Out',
    'topbar.notifications': 'Notifications',
    'topbar.language': 'Language',

    // Common Actions & Buttons
    'action.scheduleLesson': 'Schedule Lesson',
    'action.editLesson': 'Edit Lesson Details',
    'action.addStudent': 'Add Student',
    'action.newContact': 'New Contact',
    'action.addChild': 'Add Child',
    'action.addPayment': 'Record Payment',
    'action.createTask': 'Create Task',
    'action.addAction': 'Add Interaction',
    'action.save': 'Save',
    'action.saveChanges': 'Save Changes',
    'action.cancel': 'Cancel',
    'action.edit': 'Edit',
    'action.delete': 'Delete',
    'action.close': 'Close',
    'action.filter': 'Filter',
    'action.search': 'Search',
    'action.send': 'Send',
    'action.sendHomework': 'Send Homework',
    'action.back': 'Back',
    'action.viewCard': 'Lesson Details',
    'action.familyProfile': 'Family Profile',
    'action.studentProfile': 'Student Profile',
    'action.pay': 'Deposit',
    'action.settleDebt': 'Settle Debt',

    // Statuses
    'status.active': 'Active',
    'status.trial': 'Trial',
    'status.paused': 'Paused',
    'status.finished': 'Finished',
    'status.archived': 'Archived',
    'status.paid': 'Paid',
    'status.unpaid': 'Unpaid',
    'status.overdue': 'Overdue',
    'status.trial_paid': 'Trial Paid',
    'status.trial_unpaid': 'Trial Unpaid',
    'status.present': 'Present',
    'status.absent': 'Absent',
    'status.excused': 'Excused',
    'status.rescheduled': 'Rescheduled',
    'status.completed': 'Completed',
    'status.scheduled': 'Scheduled',
    'status.open': 'Open',
    'status.done': 'Done',

    // Hero & Detail Blocks
    'hero.nextLesson': 'Next Lesson',
    'hero.nextLessonChildren': 'Next Lesson for Children',
    'hero.noLessons': 'No lessons scheduled in calendar',
    'hero.topic': 'Topic',
    'hero.homework': 'Homework',
    'hero.teacher': 'Teacher',
    'hero.room': 'Room / Meeting',
    'hero.balance': 'Balance',
    'hero.deposit': 'Deposit',
    'hero.debt': 'Debt',
    'hero.preferredChannel': 'Preferred Channel',
    'hero.channel.email': 'Email',
    'hero.channel.telegram': 'Telegram',
    'hero.channel.both': 'Email & Telegram',
    'hero.channel.whatsapp': 'WhatsApp',

    // Dashboard
    'dashboard.lessonsToday': 'Lessons Today',
    'dashboard.myGroups': 'My Groups',
    'dashboard.attendance': 'Attendance',
    'dashboard.todayLessonsTitle': "Today's Lessons",
    'dashboard.allLessons': 'All Lessons',
    'dashboard.allGroups': 'All Groups',
    'dashboard.upcomingPayments': 'Upcoming Payments',
    'dashboard.urgentTasks': 'Urgent Tasks',

    // Parents & Students
    'parents.title': 'Parents & Contacts',
    'parents.subtitle': 'Directory of contact persons and legal guardians • Unified family profile',
    'parents.search': 'Search parent by name, phone or child...',
    'parents.childrenCount': 'Children',
    'parents.totalPaid': 'Total Paid',
    'parents.familyDebt': 'Family Debt',
    'parents.familyDeposit': 'Family Deposit',
    'students.title': 'Students Directory',
    'students.subtitle': 'Unified registry of enrolled students, groups and performance',
    'students.ageGrade': 'Grade / Age',

    // Toast Messages
    'toast.languageChanged': 'Interface language updated',
  },

  de: {
    // App & Brand
    'app.title': 'YouEurope School CRM',
    'app.subtitle': 'Schulverwaltung',
    'app.tagline': 'Einheitliche Plattform für Schul- und Kursverwaltung',

    // Navigation
    'nav.main': 'Übersicht',
    'nav.myDay': 'Mein Tag',
    'nav.calendar': 'Kalender',
    'nav.students': 'Schüler',
    'nav.parents': 'Eltern',
    'nav.groups': 'Gruppen',
    'nav.crm': 'CRM (Leads)',
    'nav.tasks': 'Aufgaben',
    'nav.finance': 'Zahlungen',
    'nav.analytics': 'Analysen',
    'nav.myLessons': 'Meine Unterrichtsstunden',
    'nav.attendanceJournal': 'Anwesenheitsliste',
    'nav.team': 'Team & Lehrkräfte',
    'nav.import': 'Excel-Import',
    'nav.backup': 'Datenbank-Backup',
    'nav.settings': 'Einstellungen',
    'nav.help': 'Hilfe & Handbuch',
    'nav.collapse': 'Seitenleiste einklappen',
    'nav.expand': 'Seitenleiste ausklappen',

    // Navigation Sections
    'nav.section.students': 'Schüler & Kurse',
    'nav.section.sales': 'Vertrieb & Leads',
    'nav.section.finance': 'Finanzen & Statistik',
    'nav.section.admin': 'Verwaltung',
    'nav.section.kb': 'Wissensdatenbank',

    // Roles
    'role.owner': 'Inhaber',
    'role.admin': 'Administrator',
    'role.teacher': 'Lehrkraft',
    'role.developer': 'Entwickler',
    'role.switchRole': 'Rolle wechseln',
    'role.teacherCabinet': 'Lehrerbereich',
    'role.adminCabinet': 'Verwaltungsbereich',
    'role.ownerCabinet': 'Leitungsbereich',

    // TopBar
    'topbar.searchPlaceholder': 'Schüler, Eltern, Gruppen und Leads suchen... (Cmd+K)',
    'topbar.profile': 'Benutzerprofil',
    'topbar.logout': 'Abmelden',
    'topbar.notifications': 'Benachrichtigungen',
    'topbar.language': 'Sprache',

    // Common Actions & Buttons
    'action.scheduleLesson': 'Unterricht planen',
    'action.editLesson': 'Unterricht bearbeiten',
    'action.addStudent': 'Schüler hinzufügen',
    'action.newContact': 'Neuer Kontakt',
    'action.addChild': 'Kind hinzufügen',
    'action.addPayment': 'Zahlung erfassen',
    'action.createTask': 'Aufgabe erstellen',
    'action.addAction': 'Aktion hinzufügen',
    'action.save': 'Speichern',
    'action.saveChanges': 'Änderungen speichern',
    'action.cancel': 'Abbrechen',
    'action.edit': 'Bearbeiten',
    'action.delete': 'Löschen',
    'action.close': 'Schließen',
    'action.filter': 'Filtern',
    'action.search': 'Suchen',
    'action.send': 'Senden',
    'action.sendHomework': 'Hausaufgaben versenden',
    'action.back': 'Zurück',
    'action.viewCard': 'Unterrichtskarte',
    'action.familyProfile': 'Familienprofil',
    'action.studentProfile': 'Schülerprofil',
    'action.pay': 'Guthaben aufladen',
    'action.settleDebt': 'Schulden begleichen',

    // Statuses
    'status.active': 'Aktiv',
    'status.trial': 'Probestunde',
    'status.paused': 'Pausiert',
    'status.finished': 'Beendet',
    'status.archived': 'Archiviert',
    'status.paid': 'Bezahlt',
    'status.unpaid': 'Nicht bezahlt',
    'status.overdue': 'Überfällig',
    'status.trial_paid': 'Probestunde bezahlt',
    'status.trial_unpaid': 'Probestunde offen',
    'status.present': 'Anwesend',
    'status.absent': 'Abwesend',
    'status.excused': 'Entschuldigt',
    'status.rescheduled': 'Verschoben',
    'status.completed': 'Abgehalten',
    'status.scheduled': 'Geplant',
    'status.open': 'Offen',
    'status.done': 'Erledigt',

    // Hero & Detail Blocks
    'hero.nextLesson': 'Nächste Unterrichtsstunde',
    'hero.nextLessonChildren': 'Nächste Unterrichtsstunde der Kinder',
    'hero.noLessons': 'Keine anstehenden Unterrichtsstunden geplant',
    'hero.topic': 'Thema',
    'hero.homework': 'Hausaufgabe',
    'hero.teacher': 'Lehrkraft',
    'hero.room': 'Raum / Zoom',
    'hero.balance': 'Guthaben',
    'hero.deposit': 'Einzahlung',
    'hero.debt': 'Offener Betrag',
    'hero.preferredChannel': 'Bevorzugter Kanal',
    'hero.channel.email': 'E-Mail',
    'hero.channel.telegram': 'Telegram',
    'hero.channel.both': 'E-Mail & Telegram',
    'hero.channel.whatsapp': 'WhatsApp',

    // Dashboard
    'dashboard.lessonsToday': 'Stunden heute',
    'dashboard.myGroups': 'Meine Gruppen',
    'dashboard.attendance': 'Anwesenheit',
    'dashboard.todayLessonsTitle': 'Heutiger Unterricht',
    'dashboard.allLessons': 'Alle Stunden',
    'dashboard.allGroups': 'Alle Gruppen',
    'dashboard.upcomingPayments': 'Anstehende Zahlungen',
    'dashboard.urgentTasks': 'Dringende Aufgaben',

    // Parents & Students
    'parents.title': 'Eltern & Kontakte',
    'parents.subtitle': 'Verzeichnis der Erziehungsberechtigten • Einheitliches Familienprofil',
    'parents.search': 'Eltern nach Name, Telefon oder Kind suchen...',
    'parents.childrenCount': 'Kinder',
    'parents.totalPaid': 'Gesamt bezahlt',
    'parents.familyDebt': 'Familienschulden',
    'parents.familyDeposit': 'Familienguthaben',
    'students.title': 'Schülerverzeichnis',
    'students.subtitle': 'Zentrales Register aller Schüler, Gruppen und Leistungsdaten',
    'students.ageGrade': 'Klasse / Alter',

    // Toast Messages
    'toast.languageChanged': 'Sprache der Benutzeroberfläche geändert',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'ru',
  setLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
  formatDate: () => '',
  formatTime: () => '',
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>('ru');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
      if (saved && (saved === 'ru' || saved === 'en' || saved === 'de')) {
        setLanguageState(saved);
        if (typeof document !== 'undefined') {
          document.documentElement.lang = saved;
        }
      }
    } catch {}
  }, []);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
      }
    } catch {}
  }, []);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const langDict = TRANSLATIONS[language];
      if (langDict && langDict[key]) {
        return langDict[key];
      }
      if (TRANSLATIONS.ru[key]) {
        return TRANSLATIONS.ru[key];
      }
      return fallback !== undefined ? fallback : key;
    },
    [language]
  );

  const formatDate = useCallback(
    (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return String(date);

      const locale = language === 'ru' ? 'ru-RU' : language === 'de' ? 'de-DE' : 'en-US';
      const defaultOptions: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        ...options,
      };

      return d.toLocaleDateString(locale, defaultOptions);
    },
    [language]
  );

  const formatTime = useCallback(
    (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return String(date);

      const locale = language === 'ru' ? 'ru-RU' : language === 'de' ? 'de-DE' : 'en-US';
      const defaultOptions: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        ...options,
      };

      return d.toLocaleTimeString(locale, defaultOptions);
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, formatDate, formatTime }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
