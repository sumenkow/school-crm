'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Phone,
  Check,
  GraduationCap,
  School,
  Zap,
  UserPlus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { FullLeadData, INITIAL_LEADS, splitFullName } from '@/lib/data/mockData';
import { saveTaskToStorage } from '@/lib/data/taskStorage';
import { cn } from '@/lib/utils';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newLead: FullLeadData) => void;
}

export function CreateLeadModal({ isOpen, onClose, onCreated }: CreateLeadModalProps) {
  const [mounted, setMounted] = useState(false);

  // Client type
  const [clientType, setClientType] = useState<'school_student' | 'adult_student'>('school_student');

  // Names
  const [parentFullName, setParentFullName] = useState('');
  const [studentFullName, setStudentFullName] = useState('');

  // Contacts
  const [contact, setContact] = useState('+');
  const [telegram, setTelegram] = useState('');

  // Direction
  const [directionOrCourse, setDirectionOrCourse] = useState('Английский язык');

  // Student fields
  const [studentAge, setStudentAge] = useState<number>(10);
  const [studentGrade, setStudentGrade] = useState<number>(5);

  // Adult fields
  const [adultOccupation, setAdultOccupation] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Lead processing
  const [source, setSource] = useState('Прямое обращение');
  const [assignedTo, setAssignedTo] = useState('Елена Менеджер');
  const [comment, setComment] = useState('');
  const [studentNotes] = useState('');
  const [parentNotes] = useState('');

  // Advanced toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleCloseAll = () => onClose();
    window.addEventListener('close-all-modals', handleCloseAll);
    return () => window.removeEventListener('close-all-modals', handleCloseAll);
  }, [onClose]);

  if (!isOpen || !mounted) return null;

  const quickDirections = [
    { label: 'Английский язык', value: 'Английский язык' },
    { label: 'Робототехника и IT', value: 'Робототехника' },
    { label: 'Математика', value: 'Олимпиадная математика' },
  ];

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
      studentAge: isAdult ? adultOccupation.trim() || undefined : String(studentAge),
      studentGrade: isAdult ? undefined : `${studentGrade} класс`,
      grade: isAdult ? undefined : `${studentGrade} класс`,
      directionOrCourse,
      source,
      assignedTo,
      status: 'new',
      nextAction: 'Первичный контакт с лидом',
      nextActionDate: 'Через 2 часа',
      comment,
      parentNotes: isAdult
        ? (emergencyContact ? `Экстренный контакт: ${emergencyContact}` : undefined)
        : (parentNotes || undefined),
      studentNotes: studentNotes || undefined,
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

    INITIAL_LEADS.unshift(createdLead);

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

      {/* Modal panel */}
      <div className="relative z-10 w-full max-w-[660px] max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* ── HEADER ── */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Новый лид / Заявка</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Быстрая фиксация обращения, подбор курса и авто-задача</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <form id="create-lead-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

            {/* ═══ BLOCK 1: CLIENT DATA ═══ */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Данные клиента (родителя)</span>
              </div>

              {/* Full name */}
              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1.5">
                  Имя клиента / родителя <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={clientType === 'school_student' ? parentFullName : studentFullName}
                  onChange={(e) => {
                    if (clientType === 'school_student') {
                      setParentFullName(e.target.value);
                      if (!studentFullName) setStudentFullName(e.target.value);
                    } else {
                      setStudentFullName(e.target.value);
                    }
                  }}
                  placeholder="Например: Анна Смирнова"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white placeholder:text-slate-400 transition-shadow"
                />
              </div>

              {/* Phone + Telegram */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
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
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white placeholder:text-slate-400 transition-shadow"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                    <span className="text-slate-400 font-bold text-sm leading-none">@</span>
                    Telegram / Никнейм
                  </label>
                  <input
                    type="text"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    placeholder="@username"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white placeholder:text-slate-400 transition-shadow"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* ═══ BLOCK 2: STUDENT DATA ═══ */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Данные ученика (ребёнка)</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Имя ребёнка</label>
                  <input
                    type="text"
                    value={studentFullName}
                    onChange={(e) => setStudentFullName(e.target.value)}
                    placeholder="Например: Иван"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white placeholder:text-slate-400 transition-shadow"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Возраст / Класс</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStudentAge((prev) => Math.max(5, prev - 1))}
                      className="w-7 h-[42px] rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-bold text-base hover:bg-slate-100 transition-colors flex items-center justify-center"
                    >−</button>
                    <input
                      type="number"
                      min={5}
                      max={17}
                      value={studentAge}
                      onChange={(e) => setStudentAge(parseInt(e.target.value) || 5)}
                      className="w-14 text-center rounded-lg border border-slate-200 py-2.5 text-sm font-semibold bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setStudentAge((prev) => Math.min(17, prev + 1))}
                      className="w-7 h-[42px] rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-bold text-base hover:bg-slate-100 transition-colors flex items-center justify-center"
                    >+</button>
                    <span className="text-xs text-slate-500 shrink-0">лет</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* ═══ BLOCK 3: DIRECTION & REQUEST ═══ */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Направление и запрос</span>
              </div>

              {/* Direction pill toggle */}
              <div>
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-2">
                  Направление обучения <span className="text-rose-500">*</span>
                </label>
                <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-1 gap-1">
                  {quickDirections.map((dir) => {
                    const isSelected = directionOrCourse === dir.value;
                    return (
                      <button
                        key={dir.value}
                        type="button"
                        onClick={() => setDirectionOrCourse(dir.value)}
                        className={cn(
                          'flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all text-center leading-snug',
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        )}
                      >
                        {dir.label}
                        {isSelected && <Check className="h-3 w-3 inline-block ml-1 -mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Комментарий / Запрос
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Удобное время связи, уровень подготовки, пожелания по расписанию..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white placeholder:text-slate-400 resize-none transition-shadow"
                />
              </div>
            </div>

            {/* ── Auto-task info hint ── */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 border border-blue-100">
              <Zap className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                Автоматически: статус <strong>«Новый»</strong>, источник <strong>«Прямое обращение»</strong>, задача на первый звонок <strong>+2 часа</strong>
              </p>
            </div>

            {/* ── Advanced toggle ── */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors"
              >
                {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {showAdvanced ? 'Скрыть дополнительные параметры' : 'Дополнительные параметры (источник, класс, ответственный)'}
              </button>
            </div>

            {/* ── Advanced fields ── */}
            {showAdvanced && (
              <div className="space-y-4 pt-2 border-t border-slate-100">

                {/* Client type */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">Тип учащегося:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setClientType('school_student')}
                      className={cn(
                        'flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold border transition-all',
                        clientType === 'school_student'
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      <School className="h-3.5 w-3.5" />
                      Школьник (до 18)
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientType('adult_student')}
                      className={cn(
                        'flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold border transition-all',
                        clientType === 'adult_student'
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      <GraduationCap className="h-3.5 w-3.5" />
                      Студент / Взрослый
                    </button>
                  </div>
                </div>

                {/* Grade for school students */}
                {clientType === 'school_student' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Класс в школе (1–11)</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setStudentGrade((prev) => Math.max(1, prev - 1))}
                        className="w-7 h-9 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-bold hover:bg-slate-100 transition-colors"
                      >−</button>
                      <input
                        type="number"
                        min={1}
                        max={11}
                        value={studentGrade}
                        onChange={(e) => setStudentGrade(parseInt(e.target.value) || 1)}
                        className="w-14 text-center rounded-lg border border-slate-200 py-2 text-sm font-semibold bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setStudentGrade((prev) => Math.min(11, prev + 1))}
                        className="w-7 h-9 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-bold hover:bg-slate-100 transition-colors"
                      >+</button>
                      <span className="text-xs text-slate-500">класс</span>
                    </div>
                  </div>
                )}

                {/* Adult occupation */}
                {clientType === 'adult_student' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Род занятий / Сфера</label>
                    <input
                      type="text"
                      value={adultOccupation}
                      onChange={(e) => setAdultOccupation(e.target.value)}
                      placeholder="Студент вуза, разработчик..."
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder:text-slate-400"
                    />
                  </div>
                )}

                {/* Source & Assigned */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Источник заявки</label>
                    <select
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="Прямое обращение">Прямое обращение</option>
                      <option value="Сайт школы">Сайт школы</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Рекомендация друзей">Рекомендация</option>
                      <option value="Листовка у школы">Листовка</option>
                      <option value="Яндекс.Карты">Яндекс.Карты</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Ответственный</label>
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="Елена Менеджер">Елена Менеджер</option>
                      <option value="Алексей Администратор">Алексей Администратор</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

          </form>
        </div>

        {/* ── FOOTER ── */}
        <div className="flex-shrink-0 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            form="create-lead-form"
            className="rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-2.5 text-sm font-bold shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Создать лид
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
