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
    'topbar.profile': 'Карточка профиля',
    'topbar.logout': 'Выйти из системы',
    'topbar.notifications': 'Уведомления',
    'topbar.language': 'Язык интерфейса',

    // Common Actions & Buttons
    'action.scheduleLesson': 'Запланировать занятие',
    'action.editLesson': 'Изменить параметры урока',
    'action.addStudent': 'Новый ученик',
    'action.newContact': 'Новый контакт',
    'action.addChild': 'Добавить ребенка',
    'action.addPayment': 'Внести оплату',
    'action.createTask': 'Создать задачу',
    'action.addAction': 'Добавить действие',
    'action.createGroup': 'Создать группу',
    'action.createLead': 'Новый лид',
    'action.save': 'Сохранить',
    'action.saveChanges': 'Сохранить изменения',
    'action.cancel': 'Отмена',
    'action.edit': 'Редактировать',
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
    'action.export': 'Экспорт',
    'action.import': 'Импорт',
    'action.refresh': 'Обновить',
    'action.all': 'Все',
    'action.confirm': 'Подтвердить',
    'action.openProfile': 'Открыть профиль',

    // Statuses
    'status.active': 'Активен',
    'status.trial': 'Пробный',
    'status.paused': 'На паузе',
    'status.finished': 'Завершен',
    'status.archived': 'В архиве',
    'status.paid': 'Оплачено',
    'status.unpaid': 'Не оплачено',
    'status.overdue': 'Просрочено',
    'status.expected': 'Ожидается',
    'status.trial_paid': 'Пробный оплачен',
    'status.trial_unpaid': 'Пробный не оплачен',
    'status.present': 'Присутствовал',
    'status.absent': 'Отсутствовал',
    'status.excused': 'Уважительная',
    'status.rescheduled': 'Перенесен',
    'status.completed': 'Проведено',
    'status.scheduled': 'Запланировано',
    'status.open': 'Открыта',
    'status.in_progress': 'В работе',
    'status.done': 'Выполнена',

    // Hero & Detail Blocks
    'hero.nextLesson': 'Следующее занятие',
    'hero.nextLessonChildren': 'Следующее занятие детей',
    'hero.noLessons': 'Нет запланированных занятий в расписании',
    'hero.topic': 'Тема',
    'hero.homework': 'Д/З',
    'hero.teacher': 'Преподаватель',
    'hero.room': 'Место / Ссылка',
    'hero.balance': 'Баланс',
    'hero.deposit': 'Депозит',
    'hero.debt': 'Долг',
    'hero.preferredChannel': 'Предпочтительный канал',
    'hero.channel.email': 'Электронная почта',
    'hero.channel.telegram': 'Telegram',
    'hero.channel.both': 'Почта и Telegram',
    'hero.channel.whatsapp': 'WhatsApp',
    'hero.channel.phone': 'Телефон',

    // Dashboard
    'dashboard.title': 'Панель управления',
    'dashboard.welcome': 'Добро пожаловать в YouEurope CRM',
    'dashboard.lessonsToday': 'Уроков сегодня',
    'dashboard.myGroups': 'Мои группы',
    'dashboard.attendance': 'Посещаемость',
    'dashboard.todayLessonsTitle': 'Мои уроки на сегодня',
    'dashboard.allLessons': 'Все занятия',
    'dashboard.allGroups': 'Все группы',
    'dashboard.upcomingPayments': 'Ожидаемые платежи',
    'dashboard.urgentTasks': 'Срочные задачи',
    'dashboard.revenueThisMonth': 'Выручка за месяц',
    'dashboard.activeStudents': 'Активных учеников',
    'dashboard.trialConversions': 'Конверсия пробных',
    'dashboard.quickActions': 'Быстрые действия',
    'dashboard.executiveReport': 'Отчет руководителя',
    'dashboard.noLessonsToday': 'На сегодня уроков не запланировано',

    // Teacher & Attendance
    'teacher.myLessonsTitle': 'Мои учебные занятия',
    'teacher.myLessonsSubtitle': 'Расписание, проведение уроков и отправка домашних заданий',
    'teacher.journalTitle': 'Журнал посещаемости',
    'teacher.journalSubtitle': 'Фиксация явки, пропусков и комментариев преподавателя',
    'teacher.selectGroup': 'Выберите учебную группу',
    'teacher.markAttendance': 'Отметить посещаемость',
    'teacher.teacherComments': 'Комментарии преподавателя',
    'teacher.attendanceSaved': 'Посещаемость успешно сохранена',
    'teacher.lessonDetails': 'Детали занятия',
    'teacher.topicPlaceholder': 'Тема занятия...',
    'teacher.homeworkPlaceholder': 'Домашнее задание для учеников...',

    // Calendar & Schedule
    'calendar.title': 'Календарь занятий',
    'calendar.subtitle': 'Расписание уроков, аудитории и онлайн-комнаты Zoom',
    'calendar.viewMonth': 'Месяц',
    'calendar.viewWeek': 'Неделя',
    'calendar.viewDay': 'День',
    'calendar.today': 'Сегодня',
    'calendar.newLesson': 'Новый урок',
    'calendar.filterTeacher': 'Преподаватель',
    'calendar.filterCourse': 'Курс / Группа',
    'calendar.filterRoom': 'Аудитория',

    // Students
    'students.title': 'Ученики школы',
    'students.subtitle': 'Единая база учеников и совершеннолетних студентов',
    'students.search': 'Поиск по имени ученика, родителю или группе...',
    'students.filterAll': 'Все ученики',
    'students.filterActive': 'Активные',
    'students.filterTrial': 'Пробные',
    'students.filterPaused': 'На паузе',
    'students.filterAbsences': '3+ пропуска (Риск оттока)',
    'students.filterSchool': 'Школьники',
    'students.filterAdult': 'Взрослые студенты (18+)',
    'students.colStudent': 'Ученик',
    'students.colParent': 'Родитель / Контакт',
    'students.colGroup': 'Группа / Курс',
    'students.colAttendance': 'Посещаемость',
    'students.colBalance': 'Финансы',
    'students.colNextLesson': 'След. урок',
    'students.colActions': 'Действия',
    'students.tabOverview': 'Обзор',
    'students.tabAcademic': 'Обучение и группы',
    'students.tabAttendance': 'Посещаемость',
    'students.tabFinance': 'Оплаты и баланс',
    'students.tabFamily': 'Семья и контакты',
    'students.tabNotes': 'Заметки',
    'students.riskAlert': 'Внимание: высокий риск оттока из-за пропусков',

    // Parents
    'parents.title': 'Родители и контакты',
    'parents.subtitle': 'Реестр контактных лиц и законных представителей • Единый профиль семьи',
    'parents.search': 'Поиск родителя по имени, телефону или ребенку...',
    'parents.childrenCount': 'Дети',
    'parents.totalPaid': 'Всего оплат',
    'parents.familyDebt': 'Долг семьи',
    'parents.familyDeposit': 'Депозит семьи',
    'parents.emptyChildren': 'Нет привязанных учеников',
    'parents.addChild': 'Привязать ребенка',
    'parents.editContact': 'Редактировать контакт',
    'parents.deleteContact': 'Удалить контакт',

    // CRM & Leads
    'crm.title': 'CRM и Лиды',
    'crm.subtitle': 'Воронка продаж, обработка заявок и конверсия в учеников',
    'crm.search': 'Поиск лида по имени, телефону или ученику...',
    'crm.filterCourse': 'Курс:',
    'crm.allDirections': 'Все направления',
    'crm.viewGrid': 'Сетка (На одном листе)',
    'crm.viewBoard': 'Доска (Горизонтально)',
    'crm.viewTable': 'Таблица',
    'crm.stageNew': 'Новые',
    'crm.stageContacted': 'В работе',
    'crm.stageTrialScheduled': 'Пробное назначено',
    'crm.stageTrialCompleted': 'Пробное проведено',
    'crm.stageThinking': 'Думают / Счёт',
    'crm.stagePaid': 'Оплачено (Успех)',
    'crm.stageLost': 'Потерян',
    'crm.stageNoResponse': 'Не отвечает',
    'crm.enrollStudent': 'Зачислить в школу',
    'crm.leadStudent': 'Ученик',
    'crm.leadDue': 'Срок',
    'crm.leadTrial': 'Пробное',
    'crm.leadStage': 'Этап',
    'crm.leadSource': 'Источник',
    'crm.copyPhone': 'Скопировать телефон',
    'crm.call': 'Позвонить',
    'crm.writeWhatsapp': 'Написать в WhatsApp',
    'crm.tableLeadContact': 'Лид / Контакт',
    'crm.tableStudent': 'Ученик',
    'crm.tableCourse': 'Курс',
    'crm.tableBalance': 'Баланс',
    'crm.tableStage': 'Статус воронки',
    'crm.tableNextAction': 'Следующее действие',
    'crm.tableAssignee': 'Ответственный',
    'crm.tableCard': 'Карточка',

    // Tasks
    'tasks.title': 'Задачи и поручения',
    'tasks.subtitle': 'Контроль поручений, звонков и операционной работы команды',
    'tasks.search': 'Поиск задач...',
    'tasks.filterAll': 'Все задачи',
    'tasks.filterOpen': 'Открытые',
    'tasks.filterInProgress': 'В работе',
    'tasks.filterOverdue': 'Просроченные',
    'tasks.filterCompleted': 'Выполненные',
    'tasks.priority': 'Приоритет',
    'tasks.priorityHigh': 'Высокий',
    'tasks.priorityMedium': 'Средний',
    'tasks.priorityLow': 'Низкий',
    'tasks.dueDate': 'Срок исполнения',
    'tasks.assignee': 'Ответственный',
    'tasks.allAssignees': 'Все сотрудники',
    'tasks.myTasks': 'Мои задачи',
    'tasks.newTask': 'Новая задача',
    'tasks.complete': 'Выполнить',
    'tasks.reopen': 'Открыть заново',

    // Finance
    'finance.title': 'Оплаты и финансы',
    'finance.subtitle': 'Учет оплат, депозитов, абонементов и контроль задолженностей',
    'finance.totalRevenue': 'Общая выручка',
    'finance.expectedRevenue': 'Ожидаемые поступления',
    'finance.overdueDebt': 'Общий долг',
    'finance.allPayments': 'Все платежи',
    'finance.tabPayments': 'История платежей',
    'finance.tabSubscriptions': 'Абонементы',
    'finance.tabDebts': 'Долги и задолженности',
    'finance.recordPayment': 'Внести платеж',
    'finance.newSubscription': 'Новый абонемент',
    'finance.paymentMethodCash': 'Наличные',
    'finance.paymentMethodCard': 'Банковская карта',
    'finance.paymentMethodTransfer': 'Банковский перевод',
    'finance.freeze': 'Заморозить',
    'finance.unfreeze': 'Разморозить',

    // Groups
    'groups.title': 'Группы школы',
    'groups.subtitle': 'Управление группами, расписанием и расчет свободных мест',
    'groups.search': 'Поиск по названию группы или преподавателю...',
    'groups.createGroup': 'Создать группу',
    'groups.filterCourse': 'Фильтр по курсу:',
    'groups.allCourses': 'Все курсы',
    'groups.activeGroups': 'Активных групп',
    'groups.capacity': 'Наполняемость',
    'groups.schedule': 'Расписание',
    'groups.teacher': 'Преподаватель',
    'groups.studentsList': 'Список учащихся',
    'groups.spots': 'мест',
    'groups.freeSpots': 'свободно',
    'groups.full': 'Заполнена',

    // Analytics
    'analytics.title': 'Аналитика и отчеты',
    'analytics.subtitle': 'Ключевые показатели эффективности школы, финансы и LTV',
    'analytics.retention': 'Удержание учеников (Retention)',
    'analytics.monthlyGrowth': 'Ежемесячный прирост',

    // Settings
    'settings.title': 'Настройки системы',
    'settings.subtitle': 'Профиль школы, права доступа, команда и системные интеграции',
    'settings.schoolProfile': 'Профиль школы',
    'settings.teamManagement': 'Сотрудники и преподаватели',
    'settings.telegramBot': 'Интеграция с Telegram',
    'settings.databaseBackup': 'Бэкап базы данных',
    'settings.excelImport': 'Импорт из Excel',

    // Help
    'help.title': 'Справка и база знаний',
    'help.subtitle': 'Руководство пользователя, видеоинструкции и регламенты работы',

    // Modals
    'modal.scheduleLesson.title': 'Запланировать новое занятие',
    'modal.editLesson.title': 'Редактировать параметры занятия',
    'modal.selectGroup': 'Учебная группа',
    'modal.selectTeacher': 'Преподаватель',
    'modal.lessonDate': 'Дата занятия',
    'modal.lessonTime': 'Время проведения',
    'modal.duration': 'Длительность (мин)',
    'modal.room': 'Аудитория / Ссылка',
    'modal.topic': 'Тема урока',
    'modal.homework': 'Домашнее задание',
    'modal.notifyParents': 'Отправить уведомление родителям (Email / TG)',

    // Toast Messages
    'toast.languageChanged': 'Язык интерфейса изменен',
    'toast.saved': 'Успешно сохранено',
    'toast.created': 'Успешно создано',
    'toast.updated': 'Данные обновлены',
    'toast.deleted': 'Успешно удалено',
  },

  en: {
    // App & Brand
    'app.title': 'YouEurope School CRM',
    'app.subtitle': 'School Management',
    'app.tagline': 'Unified Educational School Management Platform',

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
    'topbar.language': 'Interface Language',

    // Common Actions & Buttons
    'action.scheduleLesson': 'Schedule Lesson',
    'action.editLesson': 'Edit Lesson Details',
    'action.addStudent': 'New Student',
    'action.newContact': 'New Contact',
    'action.addChild': 'Add Child',
    'action.addPayment': 'Record Payment',
    'action.createTask': 'Create Task',
    'action.addAction': 'Add Interaction',
    'action.createGroup': 'Create Group',
    'action.createLead': 'New Lead',
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
    'action.export': 'Export',
    'action.import': 'Import',
    'action.refresh': 'Refresh',
    'action.all': 'All',
    'action.confirm': 'Confirm',
    'action.openProfile': 'Open Profile',

    // Statuses
    'status.active': 'Active',
    'status.trial': 'Trial',
    'status.paused': 'Paused',
    'status.finished': 'Finished',
    'status.archived': 'Archived',
    'status.paid': 'Paid',
    'status.unpaid': 'Unpaid',
    'status.overdue': 'Overdue',
    'status.expected': 'Expected',
    'status.trial_paid': 'Trial Paid',
    'status.trial_unpaid': 'Trial Unpaid',
    'status.present': 'Present',
    'status.absent': 'Absent',
    'status.excused': 'Excused',
    'status.rescheduled': 'Rescheduled',
    'status.completed': 'Completed',
    'status.scheduled': 'Scheduled',
    'status.open': 'Open',
    'status.in_progress': 'In Progress',
    'status.done': 'Done',

    // Hero & Detail Blocks
    'hero.nextLesson': 'Next Lesson',
    'hero.nextLessonChildren': 'Next Lesson for Children',
    'hero.noLessons': 'No lessons scheduled in calendar',
    'hero.topic': 'Topic',
    'hero.homework': 'Homework',
    'hero.teacher': 'Teacher',
    'hero.room': 'Room / Zoom Link',
    'hero.balance': 'Balance',
    'hero.deposit': 'Deposit',
    'hero.debt': 'Debt',
    'hero.preferredChannel': 'Preferred Channel',
    'hero.channel.email': 'Email',
    'hero.channel.telegram': 'Telegram',
    'hero.channel.both': 'Email & Telegram',
    'hero.channel.whatsapp': 'WhatsApp',
    'hero.channel.phone': 'Phone',

    // Dashboard
    'dashboard.title': 'Control Panel',
    'dashboard.welcome': 'Welcome to YouEurope CRM',
    'dashboard.lessonsToday': 'Lessons Today',
    'dashboard.myGroups': 'My Groups',
    'dashboard.attendance': 'Attendance',
    'dashboard.todayLessonsTitle': "Today's Lessons",
    'dashboard.allLessons': 'All Lessons',
    'dashboard.allGroups': 'All Groups',
    'dashboard.upcomingPayments': 'Upcoming Payments',
    'dashboard.urgentTasks': 'Urgent Tasks',
    'dashboard.revenueThisMonth': 'Monthly Revenue',
    'dashboard.activeStudents': 'Active Students',
    'dashboard.trialConversions': 'Trial Conversion',
    'dashboard.quickActions': 'Quick Actions',
    'dashboard.executiveReport': 'Executive Report',
    'dashboard.noLessonsToday': 'No lessons scheduled for today',

    // Teacher & Attendance
    'teacher.myLessonsTitle': 'My Scheduled Lessons',
    'teacher.myLessonsSubtitle': 'Schedule, lesson delivery, and homework dispatch',
    'teacher.journalTitle': 'Attendance Journal',
    'teacher.journalSubtitle': 'Record attendance, absence reasons, and teacher comments',
    'teacher.selectGroup': 'Select study group',
    'teacher.markAttendance': 'Record Attendance',
    'teacher.teacherComments': 'Teacher Comments',
    'teacher.attendanceSaved': 'Attendance successfully saved',
    'teacher.lessonDetails': 'Lesson Details',
    'teacher.topicPlaceholder': 'Lesson topic...',
    'teacher.homeworkPlaceholder': 'Homework for students...',

    // Calendar & Schedule
    'calendar.title': 'Lesson Calendar',
    'calendar.subtitle': 'Class schedule, classrooms, and online Zoom rooms',
    'calendar.viewMonth': 'Month',
    'calendar.viewWeek': 'Week',
    'calendar.viewDay': 'Day',
    'calendar.today': 'Today',
    'calendar.newLesson': 'New Lesson',
    'calendar.filterTeacher': 'Teacher',
    'calendar.filterCourse': 'Course / Group',
    'calendar.filterRoom': 'Classroom',

    // Students
    'students.title': 'Students Directory',
    'students.subtitle': 'Unified registry of enrolled students and adult learners',
    'students.search': 'Search by student name, parent, or group...',
    'students.filterAll': 'All Students',
    'students.filterActive': 'Active',
    'students.filterTrial': 'Trial',
    'students.filterPaused': 'Paused',
    'students.filterAbsences': '3+ Absences (Churn Risk)',
    'students.filterSchool': 'School Students',
    'students.filterAdult': 'Adult Learners (18+)',
    'students.colStudent': 'Student',
    'students.colParent': 'Parent / Contact',
    'students.colGroup': 'Group / Course',
    'students.colAttendance': 'Attendance',
    'students.colBalance': 'Finance',
    'students.colNextLesson': 'Next Lesson',
    'students.colActions': 'Actions',
    'students.tabOverview': 'Overview',
    'students.tabAcademic': 'Academics & Groups',
    'students.tabAttendance': 'Attendance',
    'students.tabFinance': 'Payments & Balance',
    'students.tabFamily': 'Family & Contacts',
    'students.tabNotes': 'Notes',
    'students.riskAlert': 'Warning: High churn risk due to consecutive absences',

    // Parents
    'parents.title': 'Parents & Contacts',
    'parents.subtitle': 'Directory of contact persons and legal guardians • Unified family profile',
    'parents.search': 'Search parent by name, phone, or child...',
    'parents.childrenCount': 'Children',
    'parents.totalPaid': 'Total Paid',
    'parents.familyDebt': 'Family Debt',
    'parents.familyDeposit': 'Family Deposit',
    'parents.emptyChildren': 'No linked students',
    'parents.addChild': 'Link Child',
    'parents.editContact': 'Edit Contact',
    'parents.deleteContact': 'Delete Contact',

    // CRM & Leads
    'crm.title': 'CRM & Sales Leads',
    'crm.subtitle': 'Sales pipeline, lead inquiries, and student enrollment conversion',
    'crm.search': 'Search leads by name, phone or student...',
    'crm.filterCourse': 'Course:',
    'crm.allDirections': 'All subjects',
    'crm.viewGrid': 'Grid (One screen)',
    'crm.viewBoard': 'Board (Horizontal)',
    'crm.viewTable': 'Table',
    'crm.stageNew': 'New',
    'crm.stageContacted': 'In Progress',
    'crm.stageTrialScheduled': 'Trial Scheduled',
    'crm.stageTrialCompleted': 'Trial Held',
    'crm.stageThinking': 'Thinking / Invoiced',
    'crm.stagePaid': 'Paid (Success)',
    'crm.stageLost': 'Lost',
    'crm.stageNoResponse': 'No Response',
    'crm.enrollStudent': 'Enroll Student',
    'crm.leadStudent': 'Student',
    'crm.leadDue': 'Due',
    'crm.leadTrial': 'Trial',
    'crm.leadStage': 'Stage',
    'crm.leadSource': 'Source',
    'crm.copyPhone': 'Copy phone',
    'crm.call': 'Call',
    'crm.writeWhatsapp': 'Message on WhatsApp',
    'crm.tableLeadContact': 'Lead / Contact',
    'crm.tableStudent': 'Student',
    'crm.tableCourse': 'Course',
    'crm.tableBalance': 'Balance',
    'crm.tableStage': 'Pipeline Stage',
    'crm.tableNextAction': 'Next Action',
    'crm.tableAssignee': 'Assignee',
    'crm.tableCard': 'Card',

    // Tasks
    'tasks.title': 'Tasks & Operations',
    'tasks.subtitle': 'Track team assignments, callbacks, and daily operational items',
    'tasks.search': 'Search tasks...',
    'tasks.filterAll': 'All Tasks',
    'tasks.filterOpen': 'Open',
    'tasks.filterInProgress': 'In Progress',
    'tasks.filterOverdue': 'Overdue',
    'tasks.filterCompleted': 'Completed',
    'tasks.priority': 'Priority',
    'tasks.priorityHigh': 'High',
    'tasks.priorityMedium': 'Medium',
    'tasks.priorityLow': 'Low',
    'tasks.dueDate': 'Due Date',
    'tasks.assignee': 'Assignee',
    'tasks.allAssignees': 'All Assignees',
    'tasks.myTasks': 'My Tasks',
    'tasks.newTask': 'New Task',
    'tasks.complete': 'Complete',
    'tasks.reopen': 'Reopen',

    // Finance
    'finance.title': 'Payments & Finance',
    'finance.subtitle': 'Payment ledger, deposits, subscription plans, and debt management',
    'finance.totalRevenue': 'Total Revenue',
    'finance.expectedRevenue': 'Expected Income',
    'finance.overdueDebt': 'Total Overdue',
    'finance.allPayments': 'All Payments',
    'finance.tabPayments': 'Payment History',
    'finance.tabSubscriptions': 'Subscriptions',
    'finance.tabDebts': 'Debts & Overdue',
    'finance.recordPayment': 'Record Payment',
    'finance.newSubscription': 'New Subscription',
    'finance.paymentMethodCash': 'Cash',
    'finance.paymentMethodCard': 'Credit Card',
    'finance.paymentMethodTransfer': 'Bank Transfer',
    'finance.freeze': 'Freeze',
    'finance.unfreeze': 'Unfreeze',

    // Groups
    'groups.title': 'School Groups',
    'groups.subtitle': 'Group management, schedules and available spot calculation',
    'groups.search': 'Search by group name or teacher...',
    'groups.createGroup': 'Create Group',
    'groups.filterCourse': 'Filter by course:',
    'groups.allCourses': 'All courses',
    'groups.activeGroups': 'Active Groups',
    'groups.capacity': 'Capacity',
    'groups.schedule': 'Schedule',
    'groups.teacher': 'Teacher',
    'groups.studentsList': 'Student Roster',
    'groups.spots': 'spots',
    'groups.freeSpots': 'available',
    'groups.full': 'Full',

    // Analytics
    'analytics.title': 'Analytics & Reports',
    'analytics.subtitle': 'Key performance indicators, school financials, and student LTV',
    'analytics.retention': 'Student Retention',
    'analytics.monthlyGrowth': 'Monthly Growth',

    // Settings
    'settings.title': 'System Settings',
    'settings.subtitle': 'School profile, access permissions, team roster, and integrations',
    'settings.schoolProfile': 'School Profile',
    'settings.teamManagement': 'Team & Faculty',
    'settings.telegramBot': 'Telegram Integration',
    'settings.databaseBackup': 'Database Backup',
    'settings.excelImport': 'Excel Data Import',

    // Help
    'help.title': 'Help & Knowledge Base',
    'help.subtitle': 'User manual, workflow documentation, and video walkthroughs',

    // Modals
    'modal.scheduleLesson.title': 'Schedule New Lesson',
    'modal.editLesson.title': 'Edit Lesson Parameters',
    'modal.selectGroup': 'Study Group',
    'modal.selectTeacher': 'Teacher',
    'modal.lessonDate': 'Lesson Date',
    'modal.lessonTime': 'Start Time',
    'modal.duration': 'Duration (min)',
    'modal.room': 'Room / Zoom Link',
    'modal.topic': 'Lesson Topic',
    'modal.homework': 'Homework',
    'modal.notifyParents': 'Notify parents (Email / Telegram)',

    // Toast Messages
    'toast.languageChanged': 'Interface language updated',
    'toast.saved': 'Successfully saved',
    'toast.created': 'Successfully created',
    'toast.updated': 'Data updated',
    'toast.deleted': 'Successfully deleted',
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
    'action.addStudent': 'Neuer Schüler',
    'action.newContact': 'Neuer Kontakt',
    'action.addChild': 'Kind hinzufügen',
    'action.addPayment': 'Zahlung erfassen',
    'action.createTask': 'Aufgabe erstellen',
    'action.addAction': 'Aktion hinzufügen',
    'action.createGroup': 'Gruppe erstellen',
    'action.createLead': 'Neuer Lead',
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
    'action.export': 'Exportieren',
    'action.import': 'Importieren',
    'action.refresh': 'Aktualisieren',
    'action.all': 'Alle',
    'action.confirm': 'Bestätigen',
    'action.openProfile': 'Profil öffnen',

    // Statuses
    'status.active': 'Aktiv',
    'status.trial': 'Probestunde',
    'status.paused': 'Pausiert',
    'status.finished': 'Beendet',
    'status.archived': 'Archiviert',
    'status.paid': 'Bezahlt',
    'status.unpaid': 'Nicht bezahlt',
    'status.overdue': 'Überfällig',
    'status.expected': 'Erwartet',
    'status.trial_paid': 'Probestunde bezahlt',
    'status.trial_unpaid': 'Probestunde offen',
    'status.present': 'Anwesend',
    'status.absent': 'Abwesend',
    'status.excused': 'Entschuldigt',
    'status.rescheduled': 'Verschoben',
    'status.completed': 'Abgehalten',
    'status.scheduled': 'Geplant',
    'status.open': 'Offen',
    'status.in_progress': 'In Bearbeitung',
    'status.done': 'Erledigt',

    // Hero & Detail Blocks
    'hero.nextLesson': 'Nächste Unterrichtsstunde',
    'hero.nextLessonChildren': 'Nächste Unterrichtsstunde der Kinder',
    'hero.noLessons': 'Keine anstehenden Unterrichtsstunden geplant',
    'hero.topic': 'Thema',
    'hero.homework': 'Hausaufgabe',
    'hero.teacher': 'Lehrkraft',
    'hero.room': 'Raum / Zoom-Link',
    'hero.balance': 'Guthaben',
    'hero.deposit': 'Einzahlung',
    'hero.debt': 'Offener Betrag',
    'hero.preferredChannel': 'Bevorzugter Kanal',
    'hero.channel.email': 'E-Mail',
    'hero.channel.telegram': 'Telegram',
    'hero.channel.both': 'E-Mail & Telegram',
    'hero.channel.whatsapp': 'WhatsApp',
    'hero.channel.phone': 'Telefon',

    // Dashboard
    'dashboard.title': 'Steuerungszentrale',
    'dashboard.welcome': 'Willkommen im YouEurope CRM',
    'dashboard.lessonsToday': 'Stunden heute',
    'dashboard.myGroups': 'Meine Gruppen',
    'dashboard.attendance': 'Anwesenheit',
    'dashboard.todayLessonsTitle': 'Heutiger Unterricht',
    'dashboard.allLessons': 'Alle Stunden',
    'dashboard.allGroups': 'Alle Gruppen',
    'dashboard.upcomingPayments': 'Anstehende Zahlungen',
    'dashboard.urgentTasks': 'Dringende Aufgaben',
    'dashboard.revenueThisMonth': 'Monatsumsatz',
    'dashboard.activeStudents': 'Aktive Schüler',
    'dashboard.trialConversions': 'Probestunden-Quote',
    'dashboard.quickActions': 'Schnellaktionen',
    'dashboard.executiveReport': 'Leitungsbericht',
    'dashboard.noLessonsToday': 'Heute finden keine Unterrichtsstunden statt',

    // Teacher & Attendance
    'teacher.myLessonsTitle': 'Meine Unterrichtsstunden',
    'teacher.myLessonsSubtitle': 'Stundenplan, Unterrichtsführung und Hausaufgabenversand',
    'teacher.journalTitle': 'Anwesenheitsliste',
    'teacher.journalSubtitle': 'Erfassung von Anwesenheit, Fehlzeiten und Lehrer-Feedback',
    'teacher.selectGroup': 'Gruppe auswählen',
    'teacher.markAttendance': 'Anwesenheit eintragen',
    'teacher.teacherComments': 'Kommentare der Lehrkraft',
    'teacher.attendanceSaved': 'Anwesenheit erfolgreich gespeichert',
    'teacher.lessonDetails': 'Unterrichtsdetails',
    'teacher.topicPlaceholder': 'Thema der Stunde...',
    'teacher.homeworkPlaceholder': 'Hausaufgabe für die Schüler...',

    // Calendar & Schedule
    'calendar.title': 'Unterrichtskalender',
    'calendar.subtitle': 'Stundenpläne, Unterrichtsräume und Online-Zoom-Räume',
    'calendar.viewMonth': 'Monat',
    'calendar.viewWeek': 'Woche',
    'calendar.viewDay': 'Tag',
    'calendar.today': 'Heute',
    'calendar.newLesson': 'Neue Stunde',
    'calendar.filterTeacher': 'Lehrkraft',
    'calendar.filterCourse': 'Kurs / Gruppe',
    'calendar.filterRoom': 'Raum',

    // Students
    'students.title': 'Schülerverzeichnis',
    'students.subtitle': 'Zentrales Register aller Schüler, Gruppen und Leistungsdaten',
    'students.search': 'Schüler nach Name, Elternteil oder Gruppe suchen...',
    'students.filterAll': 'Alle Schüler',
    'students.filterActive': 'Aktiv',
    'students.filterTrial': 'Probestunden',
    'students.filterPaused': 'Pausiert',
    'students.filterAbsences': '3+ Fehlzeiten (Abwanderungsrisiko)',
    'students.filterSchool': 'Schulkinder',
    'students.filterAdult': 'Erwachsene Kursteilnehmer (18+)',
    'students.colStudent': 'Schüler',
    'students.colParent': 'Eltern / Kontakt',
    'students.colGroup': 'Gruppe / Kurs',
    'students.colAttendance': 'Anwesenheit',
    'students.colBalance': 'Finanzen',
    'students.colNextLesson': 'Nächste Stunde',
    'students.colActions': 'Aktionen',
    'students.tabOverview': 'Übersicht',
    'students.tabAcademic': 'Unterricht & Kurse',
    'students.tabAttendance': 'Anwesenheit',
    'students.tabFinance': 'Zahlungen & Guthaben',
    'students.tabFamily': 'Familie & Kontakte',
    'students.tabNotes': 'Notizen',
    'students.riskAlert': 'Achtung: Hohes Abwanderungsrisiko wegen wiederholter Fehlzeiten',

    // Parents
    'parents.title': 'Eltern & Kontakte',
    'parents.subtitle': 'Verzeichnis der Erziehungsberechtigten • Einheitliches Familienprofil',
    'parents.search': 'Eltern nach Name, Telefon oder Kind suchen...',
    'parents.childrenCount': 'Kinder',
    'parents.totalPaid': 'Gesamt bezahlt',
    'parents.familyDebt': 'Familienschulden',
    'parents.familyDeposit': 'Familienguthaben',
    'parents.emptyChildren': 'Keine Schüler verknüpft',
    'parents.addChild': 'Kind verknüpfen',
    'parents.editContact': 'Kontakt bearbeiten',
    'parents.deleteContact': 'Kontakt löschen',

    // CRM & Leads
    'crm.title': 'CRM & Interessenten',
    'crm.subtitle': 'Vertriebstrichter, Anfragenbearbeitung und Schüleraufnahme',
    'crm.search': 'Leads nach Name, Telefon oder Schüler suchen...',
    'crm.filterCourse': 'Kurs:',
    'crm.allDirections': 'Alle Fachbereiche',
    'crm.viewGrid': 'Raster (Auf einem Bildschirm)',
    'crm.viewBoard': 'Board (Horizontal)',
    'crm.viewTable': 'Tabelle',
    'crm.stageNew': 'Neu',
    'crm.stageContacted': 'In Bearbeitung',
    'crm.stageTrialScheduled': 'Probestunde vereinbart',
    'crm.stageTrialCompleted': 'Probestunde absolviert',
    'crm.stageThinking': 'Überlegen / Rechnung',
    'crm.stagePaid': 'Bezahlt (Erfolg)',
    'crm.stageLost': 'Verloren',
    'crm.stageNoResponse': 'Keine Antwort',
    'crm.enrollStudent': 'Schüler aufnehmen',
    'crm.leadStudent': 'Schüler',
    'crm.leadDue': 'Frist',
    'crm.leadTrial': 'Probestunde',
    'crm.leadStage': 'Phase',
    'crm.leadSource': 'Quelle',
    'crm.copyPhone': 'Telefon kopieren',
    'crm.call': 'Anrufen',
    'crm.writeWhatsapp': 'Auf WhatsApp schreiben',
    'crm.tableLeadContact': 'Lead / Kontakt',
    'crm.tableStudent': 'Schüler',
    'crm.tableCourse': 'Kurs',
    'crm.tableBalance': 'Guthaben',
    'crm.tableStage': 'Pipeline-Status',
    'crm.tableNextAction': 'Nächste Aktion',
    'crm.tableAssignee': 'Zuständig',
    'crm.tableCard': 'Karte',

    // Tasks
    'tasks.title': 'Aufgaben & To-Dos',
    'tasks.subtitle': 'Teamaufgaben, Rückrufe und operative Tagesabläufe',
    'tasks.search': 'Aufgaben suchen...',
    'tasks.filterAll': 'Alle Aufgaben',
    'tasks.filterOpen': 'Offen',
    'tasks.filterInProgress': 'In Bearbeitung',
    'tasks.filterOverdue': 'Überfällig',
    'tasks.filterCompleted': 'Erledigt',
    'tasks.priority': 'Priorität',
    'tasks.priorityHigh': 'Hoch',
    'tasks.priorityMedium': 'Mittel',
    'tasks.priorityLow': 'Niedrig',
    'tasks.dueDate': 'Fälligkeitsdatum',
    'tasks.assignee': 'Zuständig',
    'tasks.allAssignees': 'Alle Mitarbeiter',
    'tasks.myTasks': 'Meine Aufgaben',
    'tasks.newTask': 'Neue Aufgabe',
    'tasks.complete': 'Erledigen',
    'tasks.reopen': 'Wiedereröffnen',

    // Finance
    'finance.title': 'Zahlungen & Finanzen',
    'finance.subtitle': 'Zahlungseingänge, Guthaben, Abonnements und Außenstände',
    'finance.totalRevenue': 'Gesamtumsatz',
    'finance.expectedRevenue': 'Erwartete Einnahmen',
    'finance.overdueDebt': 'Offene Außenstände',
    'finance.allPayments': 'Alle Zahlungen',
    'finance.tabPayments': 'Zahlungshistorie',
    'finance.tabSubscriptions': 'Abonnements',
    'finance.tabDebts': 'Offene Beträge',
    'finance.recordPayment': 'Zahlung erfassen',
    'finance.newSubscription': 'Neues Abonnement',
    'finance.paymentMethodCash': 'Barzahlung',
    'finance.paymentMethodCard': 'Kartenzahlung',
    'finance.paymentMethodTransfer': 'Banküberweisung',
    'finance.freeze': 'Einfrieren',
    'finance.unfreeze': 'Entfrieren',

    // Groups
    'groups.title': 'Schulgruppen',
    'groups.subtitle': 'Gruppenverwaltung, Stundenplan und freie Plätze',
    'groups.search': 'Nach Gruppe oder Lehrkraft suchen...',
    'groups.createGroup': 'Gruppe erstellen',
    'groups.filterCourse': 'Nach Kurs filtern:',
    'groups.allCourses': 'Alle Kurse',
    'groups.activeGroups': 'Aktive Gruppen',
    'groups.capacity': 'Belegung',
    'groups.schedule': 'Stundenplan',
    'groups.teacher': 'Lehrkraft',
    'groups.studentsList': 'Schülerliste',
    'groups.spots': 'Plätze',
    'groups.freeSpots': 'frei',
    'groups.full': 'Voll',

    // Analytics
    'analytics.title': 'Analysen & Berichte',
    'analytics.subtitle': 'Leistungskennzahlen der Schule, Finanzübersichten und LTV',
    'analytics.retention': 'Schülerbindung (Retention)',
    'analytics.monthlyGrowth': 'Monatliches Wachstum',

    // Settings
    'settings.title': 'Systemeinstellungen',
    'settings.subtitle': 'Schulprofil, Benutzerrechte, Teamverwaltung und Integrationen',
    'settings.schoolProfile': 'Schulprofil',
    'settings.teamManagement': 'Team & Lehrkräfte',
    'settings.telegramBot': 'Telegram-Integration',
    'settings.databaseBackup': 'Datenbank-Backup',
    'settings.excelImport': 'Excel-Datenimport',

    // Help
    'help.title': 'Hilfe & Wissensdatenbank',
    'help.subtitle': 'Benutzerhandbuch, Videoanleitungen und Standardprozesse',

    // Modals
    'modal.scheduleLesson.title': 'Neue Unterrichtsstunde planen',
    'modal.editLesson.title': 'Unterrichtsdaten bearbeiten',
    'modal.selectGroup': 'Lerngruppe',
    'modal.selectTeacher': 'Lehrkraft',
    'modal.lessonDate': 'Datum',
    'modal.lessonTime': 'Uhrzeit',
    'modal.duration': 'Dauer (Min.)',
    'modal.room': 'Raum / Zoom-Link',
    'modal.topic': 'Unterrichtsthema',
    'modal.homework': 'Hausaufgabe',
    'modal.notifyParents': 'Eltern benachrichtigen (E-Mail / Telegram)',

    // Toast Messages
    'toast.languageChanged': 'Sprache der Benutzeroberfläche geändert',
    'toast.saved': 'Erfolgreich gespeichert',
    'toast.created': 'Erfolgreich erstellt',
    'toast.updated': 'Daten aktualisiert',
    'toast.deleted': 'Erfolgreich gelöscht',
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
