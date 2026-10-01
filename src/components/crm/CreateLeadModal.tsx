'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Phone, Check, Zap, UserPlus } from 'lucide-react';
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

export function CreateLeadModal({ isOpen, onClose, onCreated }: CreateLeadModalProps) {
  const [mounted, setMounted] = useState(false);
  const [courses, setCourses] = useState<CourseChip[]>(FALLBACK_COURSES);

  // Form state
  const [parentFullName, setParentFullName] = useState('');
  const [contact, setContact] = useState('+');
  const [telegram, setTelegram] = useState('');
  const [studentFullName, setStudentFullName] = useState('');
  const [studentAgeText, setStudentAgeText] = useState('');
  const [directionOrCourse, setDirectionOrCourse] = useState(FALLBACK_COURSES[0].name);
  const [comment, setComment] = useState('');
  const [source, setSource] = useState('Прямое обращение');
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

    const effectiveName = parentFullName.trim() || studentFullName.trim();
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

    const createdLead: FullLeadData = {
      id: leadId,
      clientType: 'school_student',
      name: effectiveName,
      contact: contact.trim(),
      telegram: telegram ? (telegram.startsWith('@') ? telegram : `@${telegram}`) : undefined,
      parentLastName: parentLastName || undefined,
      parentFirstName: parentFirstName || undefined,
      parentMiddleName: parentMiddleName || undefined,
      studentLastName: studentLastName || undefined,
      studentFirstName: studentFirstName || effectiveStudentName,
      studentMiddleName: studentMiddleName || undefined,
      studentName: effectiveStudentName,
      studentAge: studentAgeText.trim() || undefined,
      directionOrCourse,
      source,
      assignedTo,
      status: 'new',
      nextAction: 'Первичный контакт с лидом',
      nextActionDate: 'Через 2 часа',
      comment,
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

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Modal panel — no vertical scroll */}
      <div className="relative z-10 w-full max-w-[640px] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* ── HEADER ── */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── BODY (no scroll) ── */}
        <form id="create-lead-form" onSubmit={handleSubmit} className="px-5 py-4 space-y-3.5">

          {/* ═══ SECTION 1: CONTACT ═══ */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">1</span>
              Контакт клиента
            </p>

            {/* Client name — full width */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
                Имя клиента / родителя <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={parentFullName}
                onChange={(e) => {
                  setParentFullName(e.target.value);
                  if (!studentFullName) setStudentFullName(e.target.value);
                }}
                placeholder="Например: Анна Смирнова"
                className="w-full h-[38px] rounded-xl border border-slate-200 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white placeholder:text-slate-400"
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
                  className="w-full h-[38px] rounded-xl border border-slate-200 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white placeholder:text-slate-400"
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
                  className="w-full h-[38px] rounded-xl border border-slate-200 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* ═══ SECTION 2: STUDENT + DIRECTION ═══ */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">2</span>
              Данные ребёнка и направление
            </p>

            {/* Student name + age */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Имя ребёнка</label>
                <input
                  type="text"
                  value={studentFullName}
                  onChange={(e) => setStudentFullName(e.target.value)}
                  placeholder="Например: Иван"
                  className="w-full h-[38px] rounded-xl border border-slate-200 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Возраст / класс</label>
                <input
                  type="text"
                  value={studentAgeText}
                  onChange={(e) => setStudentAgeText(e.target.value)}
                  placeholder="Например: 10 лет / 4 класс"
                  className="w-full h-[38px] rounded-xl border border-slate-200 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Direction chips */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mb-1.5">
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
                        'text-xs py-1.5 px-3 rounded-lg border font-semibold transition-all flex items-center gap-1',
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
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

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* ═══ SECTION 3: DETAILS ═══ */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">3</span>
              Детали и параметры заявки
            </p>

            {/* Comment — compact 2 rows */}
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Комментарий: удобное время, уровень подготовки, пожелания..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white placeholder:text-slate-400 resize-none"
              style={{ maxHeight: 60 }}
            />

            {/* Source + Assigned */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Источник заявки</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full h-[38px] rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Прямое обращение">Прямое обращение</option>
                  <option value="Сайт школы">Сайт</option>
                  <option value="VK">VK</option>
                  <option value="Рекомендация друзей">Рекомендация</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Листовка у школы">Листовка</option>
                  <option value="Яндекс.Карты">Яндекс.Карты</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Ответственный</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full h-[38px] rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
            <span>Создастся задача: <strong>«Первый звонок (+2ч)»</strong>, статус: <strong>«Новый»</strong></span>
          </div>

        </form>

        {/* ── FOOTER ── */}
        <div className="flex-shrink-0 border-t border-slate-200 px-5 py-3 flex items-center justify-end gap-2.5 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            form="create-lead-form"
            className="rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-2 text-sm font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
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
