'use client';

import React, { useState, useEffect } from 'react';
import { X, UserCheck, Phone, Check, GraduationCap, School, Info, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { FullLeadData, INITIAL_LEADS, splitFullName, buildFullName } from '@/lib/data/mockData';
import { saveTaskToStorage } from '@/lib/data/taskStorage';
import { cn } from '@/lib/utils';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newLead: FullLeadData) => void;
}

export function CreateLeadModal({ isOpen, onClose, onCreated }: CreateLeadModalProps) {
  // Mobile Quick Mode vs Detailed
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Client type: 'school_student' (minor, through parents) vs 'adult_student' (18+, self-sufficient)
  const [clientType, setClientType] = useState<'school_student' | 'adult_student'>('school_student');

  // Unified Full Name inputs
  const [parentFullName, setParentFullName] = useState('');
  const [studentFullName, setStudentFullName] = useState('');

  // Shared contacts
  const [contact, setContact] = useState('+');
  const [telegram, setTelegram] = useState('');

  // Direction (quick buttons + custom)
  const [directionOrCourse, setDirectionOrCourse] = useState('Английский язык');

  // School student additional fields
  const [studentAge, setStudentAge] = useState<number>(10);
  const [studentGrade, setStudentGrade] = useState<number>(5);
  const [parentNotes, setParentNotes] = useState('');

  // Adult student additional fields
  const [adultOccupation, setAdultOccupation] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Lead processing fields (defaults as per TZ)
  const [source, setSource] = useState('Сайт школы');
  const [assignedTo, setAssignedTo] = useState('Елена Менеджер');
  const [studentNotes, setStudentNotes] = useState('');
  const [comment, setComment] = useState('');

  // Close all modals event listener from navigation
  useEffect(() => {
    const handleCloseAll = () => {
      onClose();
    };
    window.addEventListener('close-all-modals', handleCloseAll);
    return () => window.removeEventListener('close-all-modals', handleCloseAll);
  }, [onClose]);

  if (!isOpen) return null;

  const quickDirections = [
    { label: 'Английский', value: 'Английский язык' },
    { label: 'Робототехника', value: 'Робототехника' },
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
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
      status: 'new', // Default status per TZ
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

    // 1. Immediately register in INITIAL_LEADS in-memory store
    INITIAL_LEADS.unshift(createdLead);

    // 2. Persist to localStorage
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

    // 3. Create background task: Первичный контакт с лидом on +2h
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

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs">
      <div className="relative flex flex-col w-full max-w-xl max-h-[92vh] rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        {/* Sticky Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5 bg-slate-50/90 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Быстрое создание лида</h2>
              <p className="text-[11px] sm:text-xs text-slate-500">4 обязательных поля для мгновенной фиксации</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="create-lead-form" onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* FIELD 1: NAME */}
          <div>
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1 mb-1">
              <span>Имя клиента / родителя</span>
              <span className="text-rose-500">*</span>
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
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white placeholder:text-slate-400"
            />
          </div>

          {/* FIELD 2: PHONE & TELEGRAM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1 mb-1">
                <Phone className="h-3.5 w-3.5 text-slate-500" />
                <span>Телефон</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                value={contact}
                onChange={(e) => {
                  const val = e.target.value;
                  setContact(val.startsWith('+') ? val : '+' + val.replace(/^\+*/, ''));
                }}
                placeholder="+7 (999) 000-00-00"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1 mb-1">
                <span>Telegram никнейм</span>
              </label>
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="@username"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* FIELD 3: DIRECTION (BUTTONS) */}
          <div>
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1 mb-1.5">
              <span>Направление обучения</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {quickDirections.map((dir) => {
                const isSelected = directionOrCourse === dir.value;
                return (
                  <button
                    key={dir.value}
                    type="button"
                    onClick={() => setDirectionOrCourse(dir.value)}
                    className={cn(
                      'py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center flex flex-col items-center justify-center gap-1',
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    )}
                  >
                    <span>{dir.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* FIELD 4: NOTE / COMMENT */}
          <div>
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1 mb-1">
              <span>Заметка / Детали запроса</span>
            </label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Удобное время связи, уровень подготовки, пожелания..."
              className="w-full rounded-xl border border-slate-200 p-3 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white placeholder:text-slate-400"
            />
          </div>

          {/* BACKGROUND AUTO-TASK HINT */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-50/80 border border-purple-100 text-purple-900 text-xs">
            <Sparkles className="h-4 w-4 shrink-0 text-purple-600" />
            <span>Автоматически: статус <strong>«Новый»</strong>, источник <strong>«Сайт школы»</strong>, задача на контакт <strong>+2ч</strong></span>
          </div>

          {/* TOGGLE ADVANCED SETTINGS */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors"
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span>{showAdvanced ? 'Скрыть дополнительные параметры' : 'Дополнительные параметры (ученик, возраст, класс, источник)'}</span>
            </button>
          </div>

          {/* ADVANCED FIELDS (EXPANDABLE) */}
          {showAdvanced && (
            <div className="space-y-4 pt-3 border-t border-slate-200">
              {/* Client Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Тип учащегося:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setClientType('school_student')}
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold border transition-all',
                      clientType === 'school_student'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <School className="h-3.5 w-3.5 text-blue-600" />
                    <span>Школьник (до 18)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientType('adult_student')}
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold border transition-all',
                      clientType === 'adult_student'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <GraduationCap className="h-3.5 w-3.5 text-purple-600" />
                    <span>Взрослый (18+)</span>
                  </button>
                </div>
              </div>

              {/* Student Name if different from parent */}
              {clientType === 'school_student' && (
                <div>
                  <label className="text-xs font-medium text-slate-700">Имя и фамилия ребенка (ученика)</label>
                  <input
                    type="text"
                    value={studentFullName}
                    onChange={(e) => setStudentFullName(e.target.value)}
                    placeholder="Например: Иван Смирнов"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                  />
                </div>
              )}

              {/* Age & Grade */}
              {clientType === 'school_student' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700">Возраст ученика (лет)</label>
                    <div className="flex items-center gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => setStudentAge((prev) => Math.max(4, prev - 1))}
                        className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={4}
                        max={20}
                        value={studentAge}
                        onChange={(e) => setStudentAge(parseInt(e.target.value) || 0)}
                        className="w-16 text-center rounded-lg border border-slate-200 py-1.5 text-xs font-semibold bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setStudentAge((prev) => Math.min(20, prev + 1))}
                        className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">Класс в школе (1-11)</label>
                    <div className="flex items-center gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => setStudentGrade((prev) => Math.max(1, prev - 1))}
                        className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={11}
                        value={studentGrade}
                        onChange={(e) => setStudentGrade(parseInt(e.target.value) || 1)}
                        className="w-16 text-center rounded-lg border border-slate-200 py-1.5 text-xs font-semibold bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setStudentGrade((prev) => Math.min(11, prev + 1))}
                        className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-slate-700">Род занятий / Сфера работы</label>
                  <input
                    type="text"
                    value={adultOccupation}
                    onChange={(e) => setAdultOccupation(e.target.value)}
                    placeholder="Студент вуза, разработчик..."
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none bg-white"
                  />
                </div>
              )}

              {/* Source & Assigned */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">Источник заявки</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none bg-white"
                  >
                    <option value="Сайт школы">Сайт школы</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Рекомендация друзей">Рекомендация друзей</option>
                    <option value="Листовка у школы">Листовка у школы</option>
                    <option value="Яндекс.Карты">Яндекс.Карты</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Ответственный менеджер</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none bg-white"
                  >
                    <option value="Елена Менеджер">Елена Менеджер</option>
                    <option value="Алексей Администратор">Алексей Администратор</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Sticky Footer */}
        <div className="flex items-center justify-end gap-2.5 p-4 border-t border-slate-100 bg-white sticky bottom-0 z-10 shrink-0 pb-[calc(14px+env(safe-area-inset-bottom,0px))]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            form="create-lead-form"
            className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-purple-700 active:scale-[0.98] transition-all"
          >
            Создать лид
          </button>
        </div>
      </div>
    </div>
  );
}
