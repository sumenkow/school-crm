'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Phone, Check, Zap, UserPlus, School, GraduationCap } from 'lucide-react';
import { FullLeadData, INITIAL_LEADS, splitFullName } from '@/lib/data/mockData';
import { saveTaskToStorage } from '@/lib/data/taskStorage';
import { cn } from '@/lib/utils';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newLead: FullLeadData) => void;
}

interface CourseChip {
  id: string;
  name: string;
}

const FALLBACK_COURSES: CourseChip[] = [
  { id: 'c1', name: 'Английский язык' },
  { id: 'c2', name: 'Робототехника и IT' },
  { id: 'c3', name: 'Олимпиадная математика' },
  { id: 'c4', name: 'Скорочтение и память' },
];

const GRADE_OPTIONS = [
  'Дошкольник',
  '1 класс',
  '2 класс',
  '3 класс',
  '4 класс',
  '5 класс',
  '6 класс',
  '7 класс',
  '8 класс',
  '9 класс',
  '10 класс',
  '11 класс',
];

const SOURCE_OPTIONS = [
  'Сайт школы',
  'Входящий звонок',
  'WhatsApp',
  'Telegram',
  'ВКонтакте',
  'Рекомендация',
  'Instagram',
];

export function CreateLeadModal({ isOpen, onClose, onCreated }: CreateLeadModalProps) {
  const [mounted, setMounted] = useState(false);
  const [courses, setCourses] = useState<CourseChip[]>(FALLBACK_COURSES);

  // Category
  const [clientType, setClientType] = useState<'school_student' | 'adult_student'>('school_student');

  // Form state
  const [parentFullName, setParentFullName] = useState('');
  const [contact, setContact] = useState('+');
  const [telegram, setTelegram] = useState('');

  // Child / Student data
  const [studentFullName, setStudentFullName] = useState('');
  const [studentAge, setStudentAge] = useState('');
  const [studentGrade, setStudentGrade] = useState('');
  const [adultOccupation, setAdultOccupation] = useState('');

  // Course & Details
  const [directionOrCourse, setDirectionOrCourse] = useState(FALLBACK_COURSES[0].name);
  const [comment, setComment] = useState('');
  const [source, setSource] = useState(SOURCE_OPTIONS[0]);
  const [assignedTo, setAssignedTo] = useState('Елена Менеджер');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load courses from API
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/courses')
      .then((r) => r.json())
      .then((data) => {
        if (data.courses && Array.isArray(data.courses) && data.courses.length > 0) {
          const active: CourseChip[] = data.courses
            .filter((c: any) => c.isActive !== false)
            .map((c: any) => ({ id: c.id, name: c.name }));
          if (active.length > 0) {
            setCourses(active);
            setDirectionOrCourse(active[0].name);
          }
        }
      })
      .catch(() => {
        /* keep fallback */
      });
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleCloseAll = () => onClose();
    window.addEventListener('close-all-modals', handleCloseAll);
    return () => window.removeEventListener('close-all-modals', handleCloseAll);
  }, [onClose]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const isAdult = clientType === 'adult_student';
    const effectiveName = isAdult ? studentFullName.trim() : (parentFullName.trim() || studentFullName.trim());
    const effectiveStudentName = studentFullName.trim() || parentFullName.trim();

    if (!effectiveName) {
      alert('Пожалуйста, укажите имя клиента или учащегося');
      return;
    }
    if ((!contact || contact.trim() === '+') && !telegram.trim()) {
      alert('Укажите контактный телефон или Telegram для связи');
      return;
    }

    const { lastName: parentLastName, firstName: parentFirstName, middleName: parentMiddleName } = splitFullName(parentFullName);
    const { lastName: studentLastName, firstName: studentFirstName, middleName: studentMiddleName } = splitFullName(studentFullName);

    const now = new Date();
    const nowStr = now.toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const leadId = `lead_${Date.now()}`;

    // Clean student age representation
    const cleanAge = studentAge.trim()
      ? (studentAge.toLowerCase().includes('лет') || studentAge.toLowerCase().includes('год') ? studentAge.trim() : `${studentAge.trim()} лет`)
      : undefined;

    const createdLead: FullLeadData = {
      id: leadId,
      clientType,
      name: effectiveName,
      contact: contact.trim(),
      telegram: telegram ? (telegram.startsWith('@') ? telegram : `@${telegram}`) : undefined,
      parentLastName: isAdult ? undefined : (parentLastName || undefined),
      parentFirstName: isAdult ? undefined : (parentFirstName || undefined),
      parentMiddleName: isAdult ? undefined : (parentMiddleName || undefined),
      studentLastName: studentLastName || undefined,
      studentFirstName: studentFirstName || effectiveStudentName,
      studentMiddleName: studentMiddleName || undefined,
      studentName: effectiveStudentName,
      studentAge: isAdult ? (cleanAge || adultOccupation.trim() || undefined) : cleanAge,
      studentGrade: isAdult ? undefined : (studentGrade.trim() || undefined),
      grade: isAdult ? undefined : (studentGrade.trim() || undefined),
      directionOrCourse,
      source,
      assignedTo,
      status: 'new',
      nextAction: 'Первичный контакт с лидом',
      nextActionDate: 'Через 2 часа',
      comment: isAdult && adultOccupation.trim() ? `Сфера: ${adultOccupation.trim()}. ${comment}`.trim() : comment,
      createdAt: new Date().toISOString(),
      interactions: [
        {
          id: `int_${Date.now()}`,
          occurredAt: nowStr,
          channel: telegram ? 'telegram' : 'phone',
          type: 'initial_contact',
          author: assignedTo || 'Администратор',
          content: comment || `Создана новая заявка: ${directionOrCourse}. Источник: ${source}.`,
        },
      ],
    };

    // 1. In-memory store
    INITIAL_LEADS.unshift(createdLead);

    // 2. localStorage
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('crm_leads_v2');
        const list = stored ? JSON.parse(stored) : [];
        list.unshift(createdLead);
        localStorage.setItem('crm_leads_v2', JSON.stringify(list));
      }
    } catch (err) {
      console.error('Failed to persist lead to localStorage', err);
    }

    // 3. Auto-task +2h
    try {
      const taskDue = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const timeFormatted = taskDue.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      saveTaskToStorage({
        id: `task_${Date.now()}`,
        title: `Первичный контакт с лидом: ${createdLead.name}`,
        taskType: 'CRM Сделка',
        leadId: createdLead.id,
        leadName: createdLead.name,
        dueDate: taskDue.toISOString().slice(0, 10),
        dueDateFormatted: `Сегодня в ${timeFormatted} (+2ч)`,
        status: 'open',
        priority: 'high',
        assignedTo: assignedTo || 'Елена Менеджер',
        description: `Связаться по новой заявке (${directionOrCourse}). Телефон: ${contact}${telegram ? ' / ' + telegram : ''}. Примечание: ${comment || '—'}`,
        isOverdue: false,
      });
    } catch (err) {
      console.error('Failed to schedule background task for lead', err);
    }

    onCreated(createdLead);
    onClose();
  };

  const isAdult = clientType === 'adult_student';

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Modal panel — strictly compact, no vertical scrollbar */}
      <div className="relative z-10 w-full max-w-[640px] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* ── HEADER ── */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <UserPlus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">Новый лид / Заявка</h2>
              <p className="text-[10px] text-slate-500">Быстрая фиксация обращения, подбор курса и авто-задача</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── BODY (Compact monolithic, no scroll) ── */}
        <form id="create-lead-form" onSubmit={handleSubmit} className="px-5 py-3.5 space-y-3">

          {/* ═══ CATEGORY SWITCHER (Школьник / Студент) ═══ */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setClientType('school_student')}
              className={cn(
                'flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all',
                clientType === 'school_student'
                  ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <School className="w-3.5 h-3.5 text-blue-600" />
              <span>Школьник (с родителем)</span>
            </button>
            <button
              type="button"
              onClick={() => setClientType('adult_student')}
              className={cn(
                'flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all',
                clientType === 'adult_student'
                  ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
              <span>Студент / Взрослый</span>
            </button>
          </div>

          {/* ═══ SECTION 1: CONTACT ═══ */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">1</span>
              {isAdult ? 'Контакт студента' : 'Контакт клиента (родителя)'}
            </p>

            {/* Name input */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
                {isAdult ? 'ФИО студента' : 'Имя клиента / родителя'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={isAdult ? studentFullName : parentFullName}
                onChange={(e) => {
                  if (isAdult) {
                    setStudentFullName(e.target.value);
                  } else {
                    setParentFullName(e.target.value);
                    if (!studentFullName) setStudentFullName(e.target.value);
                  }
                }}
                placeholder={isAdult ? 'Например: Алексей Смирнов' : 'Например: Анна Смирнова'}
                className="w-full h-[36px] rounded-xl border border-slate-200 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white placeholder:text-slate-400"
              />
            </div>

            {/* Phone + Telegram */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
                  <Phone className="h-3 w-3 text-slate-400" />
                  Телефон <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={contact}
                  onChange={(e) => {
                    const val = e.target.value;
                    setContact(val.startsWith('+') ? val : '+' + val.replace(/^\+*/, ''));
                  }}
                  placeholder="+7 (999) 000-00-00"
                  className="w-full h-[36px] rounded-xl border border-slate-200 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
                  <span className="text-slate-400 font-bold text-xs leading-none">@</span>
                  Telegram / Никнейм
                </label>
                <input
                  type="text"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="@username"
                  className="w-full h-[36px] rounded-xl border border-slate-200 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* ═══ SECTION 2: STUDENT + DIRECTION ═══ */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">2</span>
              {isAdult ? 'Параметры обучения' : 'Данные ребёнка и направление'}
            </p>

            {/* School student: Name (50%) + Age (25%) + Grade (25%) */}
            {!isAdult ? (
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6">
                  <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Имя ребёнка</label>
                  <input
                    type="text"
                    value={studentFullName}
                    onChange={(e) => setStudentFullName(e.target.value)}
                    placeholder="Например: Иван"
                    className="w-full h-[36px] rounded-xl border border-slate-200 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white placeholder:text-slate-400"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Возраст</label>
                  <input
                    type="text"
                    value={studentAge}
                    onChange={(e) => setStudentAge(e.target.value)}
                    placeholder="10 лет"
                    className="w-full h-[36px] rounded-xl border border-slate-200 px-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white placeholder:text-slate-400 text-center"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Класс</label>
                  <select
                    value={studentGrade}
                    onChange={(e) => setStudentGrade(e.target.value)}
                    className="w-full h-[36px] rounded-xl border border-slate-200 px-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Не указан</option>
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              /* Adult student: Age (50%) + Occupation (50%) */
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Возраст студента</label>
                  <input
                    type="text"
                    value={studentAge}
                    onChange={(e) => setStudentAge(e.target.value)}
                    placeholder="Например: 22 года"
                    className="w-full h-[36px] rounded-xl border border-slate-200 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Сфера / род занятий</label>
                  <input
                    type="text"
                    value={adultOccupation}
                    onChange={(e) => setAdultOccupation(e.target.value)}
                    placeholder="Студент вуза, IT..."
                    className="w-full h-[36px] rounded-xl border border-slate-200 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white placeholder:text-slate-400"
                  />
                </div>
              </div>
            )}

            {/* Direction chips */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
                Направление обучения <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {courses.map((course) => {
                  const isSelected = directionOrCourse === course.name;
                  return (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => setDirectionOrCourse(course.name)}
                      className={cn(
                        'text-xs py-1 px-2.5 rounded-lg border font-semibold transition-all flex items-center gap-1',
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-transparent'
                      )}
                    >
                      {course.name}
                      {isSelected && <Check className="h-3 w-3 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* ═══ SECTION 3: DETAILS & SOURCE ═══ */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">3</span>
              Источник обращения и детали
            </p>

            {/* Quick Source Chips (1-click selection) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                  <span>Источник заявки (откуда пришел лид)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-500">
                  Выбран: <strong className="text-blue-700 font-semibold">{source}</strong>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SOURCE_OPTIONS.map((src) => {
                  const isSelected = source === src;
                  return (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setSource(src)}
                      className={cn(
                        'text-xs py-1 px-2.5 rounded-lg border font-semibold transition-all flex items-center gap-1 cursor-pointer',
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-transparent'
                      )}
                    >
                      <span>{src}</span>
                      {isSelected && <Check className="h-3 w-3 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comment + Assigned row */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-8">
                <label className="text-[11px] font-semibold text-slate-600 mb-0.5 block">Комментарий / Запрос</label>
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Удобное время, уровень подготовки, пожелания..."
                  className="w-full h-[34px] rounded-xl border border-slate-200 px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white placeholder:text-slate-400"
                />
              </div>
              <div className="col-span-4">
                <label className="text-[11px] font-semibold text-slate-600 mb-0.5 block">Ответственный</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full h-[34px] rounded-xl border border-slate-200 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Елена Менеджер">Елена Менеджер</option>
                  <option value="Алексей Администратор">Алексей Администратор</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Auto-task compact hint ── */}
          <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50/60 border border-blue-100 px-3 py-1.5 rounded-lg">
            <Zap className="h-3.5 w-3.5 shrink-0 text-blue-500" />
            <span>Создастся задача: <strong>«Первый звонок (+2ч)»</strong> • Статус: <strong>«Новый»</strong> • Источник: <strong>«{source}»</strong></span>
          </div>

        </form>

        {/* ── FOOTER ── */}
        <div className="flex-shrink-0 border-t border-slate-200 px-5 py-2.5 flex items-center justify-end gap-2.5 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            form="create-lead-form"
            className="rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-2 text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            + Создать лид
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
