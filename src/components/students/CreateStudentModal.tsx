'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Users, AlertTriangle, Check, Phone, MessageSquare, Sparkles, BookOpen, GraduationCap, School } from 'lucide-react';
import { cn } from '@/lib/utils';
import { INITIAL_STUDENTS, FullStudentData, INITIAL_GROUPS, TimelineInteraction, splitFullName, buildFullName } from '@/lib/data/mockData';
import { saveInteractionToStorage } from '@/lib/data/timelineStorage';
import { saveStudentToStorage, settleDebtsFromDeposit, reconcileAllStudentDepositsAndDebts } from '@/lib/data/studentStorage';
import { qualifyAndConvertLead } from '@/lib/data/leadStorage';

export interface NewStudentData {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  studentType?: 'school_student' | 'adult_student';
  status: string;
  parent: string;
  parentId?: string;
  parentPhone: string;
  group: string;
  course: string;
  teacher: string;
  attendanceRate: string;
  paymentStatus: string;
  subscriptionEnd: string;
  notes?: string;
  convertedFromLeadId?: string;
}

export interface CreateStudentInitialData {
  firstName?: string;
  lastName?: string;
  studentType?: 'school_student' | 'adult_student';
  birthDate?: string;
  grade?: string;
  phone?: string;
  telegram?: string;
  status?: string;
  notes?: string;
  group?: string;
  course?: string;
  parentMode?: 'new' | 'existing';
  parentFirstName?: string;
  parentLastName?: string;
  parentPhone?: string;
  parentTelegram?: string;
  relationshipType?: string;
  preferredChannel?: string;
  sourceLeadId?: string;
  sourceLeadName?: string;
  leadInteractions?: TimelineInteraction[];
  leadFinance?: any;
}

interface CreateStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newStudent: NewStudentData) => void;
  initialData?: CreateStudentInitialData;
}

export function CreateStudentModal({
  isOpen,
  onClose,
  onCreated,
  initialData,
}: CreateStudentModalProps) {
  // Student fields
  const [studentType, setStudentType] = useState<'school_student' | 'adult_student'>('school_student');
  const [studentFullName, setStudentFullName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gradeNumber, setGradeNumber] = useState<number>(5);
  const [grade, setGrade] = useState('5 класс');
  const [phone, setPhone] = useState('');
  const [telegram, setTelegram] = useState('');
  const [status, setStatus] = useState('active');
  const [notes, setNotes] = useState('');
  const [group, setGroup] = useState('English B1 Teens');

  // Parent fields
  const [parentMode, setParentMode] = useState<'new' | 'existing'>('new');
  const [parentFullName, setParentFullName] = useState('');
  const [parentFirstName, setParentFirstName] = useState('');
  const [parentLastName, setParentLastName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentTelegram, setParentTelegram] = useState('');
  const [relationshipType, setRelationshipType] = useState('Мама');
  const [preferredChannel, setPreferredChannel] = useState('telegram');
  const [selectedParentId, setSelectedParentId] = useState('');

  useEffect(() => {
    if (isOpen && initialData) {
      setStudentType(initialData.studentType || 'school_student');
      const initialSName = [initialData.lastName, initialData.firstName].filter(Boolean).join(' ');
      setStudentFullName(initialSName || '');
      setFirstName(initialData.firstName || '');
      setLastName(initialData.lastName || '');
      setBirthDate(initialData.birthDate || '');
      if (initialData.grade) {
        const num = parseInt(initialData.grade.replace(/\D/g, '')) || 5;
        setGradeNumber(num);
        setGrade(`${num} класс`);
      } else {
        setGradeNumber(5);
        setGrade('5 класс');
      }
      setPhone(initialData.phone || '');
      setTelegram(initialData.telegram || '');
      setStatus(initialData.status || 'active');
      setNotes(initialData.notes || '');
      if (initialData.group) setGroup(initialData.group);
      if (initialData.parentMode) setParentMode(initialData.parentMode);
      const initialPName = [initialData.parentLastName, initialData.parentFirstName].filter(Boolean).join(' ');
      setParentFullName(initialPName || '');
      setParentFirstName(initialData.parentFirstName || '');
      setParentLastName(initialData.parentLastName || '');
      setParentPhone(initialData.parentPhone || '');
      setParentTelegram(initialData.parentTelegram || '');
      if (initialData.relationshipType) setRelationshipType(initialData.relationshipType);
      if (initialData.preferredChannel) setPreferredChannel(initialData.preferredChannel);
    } else if (isOpen && !initialData) {
      // Reset
      setStudentType('school_student');
      setStudentFullName('');
      setFirstName('');
      setLastName('');
      setBirthDate('');
      setGradeNumber(5);
      setGrade('5 класс');
      setPhone('');
      setTelegram('');
      setStatus('active');
      setNotes('');
      setGroup('English B1 Teens');
      setParentMode('new');
      setParentFullName('');
      setParentFirstName('');
      setParentLastName('');
      setParentPhone('');
      setParentTelegram('');
      setRelationshipType('Мама');
      setPreferredChannel('telegram');
      setSelectedParentId('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { lastName: sLast, firstName: sFirst } = splitFullName(studentFullName);
    const effStudentFirstName = sFirst || studentFullName.trim();
    const effStudentLastName = sLast || '';

    if (!studentFullName.trim() || !effStudentFirstName) {
      alert('Пожалуйста, укажите ФИО ученика');
      return;
    }

    const { lastName: pLast, firstName: pFirst } = splitFullName(parentFullName);
    const effParentFirstName = parentMode === 'existing' ? parentFirstName : (pFirst || parentFullName.trim());
    const effParentLastName = parentMode === 'existing' ? parentLastName : pLast;

    const newStudentId = `std_${Date.now()}`;
    const parentId =
      parentMode === 'existing' && selectedParentId
        ? selectedParentId
        : (initialData as any)?.parentId || `p_${Date.now()}`;
    const fullName = studentFullName.trim();
    const courseName = group.includes('English')
      ? 'Английский язык'
      : group.includes('Robotics')
      ? 'Робототехника'
      : 'Математика';

    const effParentFullName = parentMode === 'existing'
      ? `${parentFirstName.trim()} ${parentLastName.trim()}`.trim()
      : parentFullName.trim();

    const isAdult = studentType === 'adult_student';

    const now = new Date();
    const nowStr = now.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const creationInteraction: TimelineInteraction = {
      id: `int_${Date.now()}`,
      studentId: newStudentId,
      studentName: fullName,
      parentId: parentId,
      parentName: effParentFullName || undefined,
      occurredAt: nowStr,
      channel: (preferredChannel as any) || 'telegram',
      type: 'status_change',
      author: 'Администратор школы',
      content: initialData?.sourceLeadId
        ? `Ученик успешно зачислен из карточки лида (${isAdult ? 'Студент' : 'Школьник'}). Заполнена карточка и создал профиль.`
        : `Создана карточка (${isAdult ? 'Студент' : 'Школьник'}) в CRM и прикреплен к группе «${group}».`,
      result: 'Карточка ученика сохранена',
      targetType: isAdult ? 'student' : 'parent',
      targetName: isAdult ? fullName : (effParentFullName || 'Родитель'),
      targetRole: isAdult ? 'Студент' : 'Родитель',
    };

    const inheritedLeadInteractions: TimelineInteraction[] = (initialData?.leadInteractions || []).map((int, idx) => {
      const isStudentAction = int.targetType === 'student' || isAdult;
      return {
        ...int,
        id: int.id || `lead_int_${Date.now()}_${idx}`,
        studentId: newStudentId,
        studentName: fullName,
        parentId: parentId,
        parentName: effParentFullName || undefined,
        targetType: int.targetType || (isStudentAction ? 'student' : 'parent'),
        targetName: int.targetName || (isStudentAction ? fullName : (effParentFullName || 'Родитель')),
        targetRole: int.targetRole || (isStudentAction ? (isAdult ? 'Студент' : 'Ученик') : 'Родитель'),
      };
    });

    const combinedInteractions = [creationInteraction, ...inheritedLeadInteractions];

    const newFullStudent: FullStudentData = {
      id: newStudentId,
      firstName: effStudentFirstName,
      lastName: effStudentLastName,
      studentType,
      birthDate: birthDate || '2012-05-15',
      grade: `${gradeNumber} класс`,
      phone: isAdult ? (phone.trim() || '—') : (phone.trim() || parentPhone || '—'),
      telegram: telegram.trim() || (isAdult ? undefined : parentTelegram) || undefined,
      status: (status as any) || 'active',
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      parents: isAdult && !effParentFirstName
        ? []
        : [
            {
              id: parentId,
              firstName: effParentFirstName || (isAdult ? 'Контакт' : 'Родитель'),
              lastName: effParentLastName || '',
              phone: parentPhone || '—',
              telegram: parentTelegram || undefined,
              preferredChannel: (preferredChannel as any) || 'telegram',
              relationshipType: relationshipType || (isAdult ? 'Экстренный контакт' : 'Родитель'),
              isPrimary: true,
            },
          ],
      groups: [
        {
          id: `g_${Date.now()}`,
          name: group,
          courseName,
          teacherName: group.includes('English') ? 'Мария Иванова' : 'Денис Смирнов',
          schedule: 'Пн, Чт • 18:45–20:15',
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
        deposit: initialData?.leadFinance?.deposit
          ? {
              balance: initialData.leadFinance.deposit.balance || 0,
              balanceFormatted:
                initialData.leadFinance.deposit.balanceFormatted ||
                `${(initialData.leadFinance.deposit.balance || 0).toLocaleString('ru-RU')} ₽`,
              currency: (initialData.leadFinance.deposit.currency as 'RUB' | 'EUR') || 'RUB',
              pricePerLesson: initialData.leadFinance.deposit.pricePerLesson,
              pricePerLessonFormatted: initialData.leadFinance.deposit.pricePerLessonFormatted,
            }
          : undefined,
        activeSubscription: {
          period: '01.09.2026 – 30.09.2026',
          price: '7 600 ₽',
          status: 'active',
          lessonsAttended: '0 из 8 занятий',
          renewalDate: '28.09.2026',
        },
        payments: [
          {
            id: `pay_${Date.now()}`,
            date: new Date().toLocaleDateString('ru-RU'),
            amount: '7 600 ₽',
            period: 'Сентябрь 2026',
            method: 'Банковская карта',
            status: 'paid',
          },
          ...(initialData?.leadFinance?.payments || []).map((p: any) => ({
            id: p.id || `pay_${Date.now()}_lead`,
            date: p.date || new Date().toLocaleDateString('ru-RU'),
            amount: p.amountFormatted || (typeof p.amount === 'number' ? `${p.amount.toLocaleString('ru-RU')} ₽` : String(p.amount)),
            period: p.period || p.description || 'Аванс/Предоплата лида',
            method: p.method || 'Банковская карта',
            status: p.status || 'paid',
          })),
        ],
      },
      interactions: combinedInteractions,
      tasks: [],
    };

    INITIAL_STUDENTS.unshift(newFullStudent);
    saveStudentToStorage(newFullStudent);
    settleDebtsFromDeposit(newStudentId);
    reconcileAllStudentDepositsAndDebts();
    combinedInteractions.forEach((i) => saveInteractionToStorage(i));

    if (initialData?.sourceLeadId) {
      qualifyAndConvertLead(initialData.sourceLeadId, newStudentId, parentId);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crm-students-changed'));
      window.dispatchEvent(new CustomEvent('crm-leads-changed'));
      window.dispatchEvent(new CustomEvent('crm-payments-changed'));
    }

    // Update group enrollment count in INITIAL_GROUPS if found
    const targetGroup = INITIAL_GROUPS.find((g) => g.name === group || g.name.includes(group.split(' ')[0]));
    if (targetGroup && !targetGroup.students.some((s) => s.id === newStudentId)) {
      targetGroup.students.push({
        id: newStudentId,
        name: fullName,
        status: 'active',
        attendanceRate: '100%',
        parentPhone: parentPhone || '—',
        joinedAt: new Date().toLocaleDateString('ru-RU'),
      });
    }

    const createdStudent: NewStudentData = {
      id: newStudentId,
      name: fullName,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      studentType: studentType,
      status,
      parent: parentFirstName ? `${parentFirstName.trim()} ${parentLastName.trim()} (${relationshipType})` : (studentType === 'adult_student' ? 'Самостоятельный студент' : 'Контакт не указан'),
      parentId: parentId,
      parentPhone: parentPhone || '—',
      group,
      course: courseName,
      teacher: group.includes('English') ? 'Мария Иванова' : 'Денис Смирнов',
      attendanceRate: '100%',
      paymentStatus: 'paid',
      subscriptionEnd: '30.09.2026',
      notes: notes.trim() || undefined,
      convertedFromLeadId: initialData?.sourceLeadId,
    };

    onCreated(createdStudent);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl text-white',
              initialData?.sourceLeadId ? 'bg-emerald-600' : 'bg-blue-600'
            )}>
              {initialData?.sourceLeadId ? <Sparkles className="h-5 w-5" /> : <User className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {initialData?.sourceLeadId ? 'Карточка ученика: конвертация из лида' : 'Новый ученик'}
              </h2>
              <p className="text-xs text-slate-500">
                {initialData?.sourceLeadId
                  ? `Данные лида «${initialData.sourceLeadName || ''}» перенесены. Проверьте или измените любые поля перед сохранением.`
                  : 'Зачисление ученика и привязка родителя без дублирования'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Lead Conversion Info Banner if converting */}
        {initialData?.sourceLeadId && (
          <div className="mx-6 mt-5 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2.5">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              Поля предзаполнены данными из заявки лида. При необходимости скорректируйте данные ученика, группу или контакты семьи и нажмите кнопку <strong>«Сохранить карточку ученика»</strong>.
            </span>
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Ticker: School Student vs Adult Student */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">Категория учащегося:</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setStudentType('school_student')}
                className={cn(
                  'flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all',
                  studentType === 'school_student'
                    ? 'bg-white text-blue-700 shadow-xs border border-blue-100'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <School className="h-4 w-4 text-blue-600" />
                <span>🎒 Школьник (до 18 лет)</span>
              </button>
              <button
                type="button"
                onClick={() => setStudentType('adult_student')}
                className={cn(
                  'flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all',
                  studentType === 'adult_student'
                    ? 'bg-white text-purple-700 shadow-xs border border-purple-100'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <GraduationCap className="h-4 w-4 text-purple-600" />
                <span>🎓 Студент</span>
              </button>
            </div>
          </div>

          {/* SECTION 1: ДАННЫЕ УЧЕНИКА */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {studentType === 'adult_student' ? '1. Данные совершеннолетнего студента' : '1. Данные школьника'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-700">ФИО ученика (Фамилия Имя Отчество) *</label>
                <input
                  type="text"
                  required
                  value={studentFullName}
                  onChange={(e) => setStudentFullName(e.target.value)}
                  placeholder="Смирнов Иван Алексеевич"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Дата рождения</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Класс (1-11)</label>
                <div className="flex items-center gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => setGradeNumber((prev) => Math.max(1, prev - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={11}
                    value={gradeNumber}
                    onChange={(e) => setGradeNumber(parseInt(e.target.value) || 1)}
                    className="w-16 text-center rounded-lg border border-slate-200 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setGradeNumber((prev) => Math.min(11, prev + 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Статус</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                >
                  <option value="active">Активен (зачислен)</option>
                  <option value="trial">Пробный ученик</option>
                  <option value="paused">На паузе</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Телефон ученика (если есть)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 (999) 000-00-00"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Telegram ученика</label>
                <input
                  type="text"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="@username"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: ГРУППА */}
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Зачисление в группу
            </h3>
            <div>
              <label className="text-xs font-medium text-slate-700">Выберите учебную группу</label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none font-medium text-slate-800"
              >
                <option value="English B1 Teens">English B1 Teens (Пн/Чт 18:45) • Свободно 1 место</option>
                <option value="Robotics Junior">Robotics Junior (Ср/Сб 15:00) • Свободно 4 места</option>
                <option value="Kids Math Safari">Kids Math Safari (Чт 16:00) • Свободно 1 место</option>
              </select>
            </div>
          </div>

          {/* SECTION 3: РОДИТЕЛЬ / СЕМЬЯ */}
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                3. Родитель / Контактное лицо
              </h3>
              <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setParentMode('new')}
                  className={cn('rounded-md px-2.5 py-1 font-medium transition-all', parentMode === 'new' ? 'bg-white shadow-xs font-semibold text-slate-900' : 'text-slate-500')}
                >
                  Новый родитель
                </button>
                <button
                  type="button"
                  onClick={() => setParentMode('existing')}
                  className={cn('rounded-md px-2.5 py-1 font-medium transition-all', parentMode === 'existing' ? 'bg-white shadow-xs font-semibold text-slate-900' : 'text-slate-500')}
                >
                  Выбрать из существующих
                </button>
              </div>
            </div>

            {parentMode === 'new' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-slate-50/60 p-3.5 border border-slate-200">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-700">ФИО родителя (Фамилия Имя Отчество) *</label>
                  <input
                    type="text"
                    required
                    value={parentFullName}
                    onChange={(e) => setParentFullName(e.target.value)}
                    placeholder="Смирнова Ольга Дмитриевна"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Кем приходится</label>
                  <select
                    value={relationshipType}
                    onChange={(e) => setRelationshipType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="Мама">Мама</option>
                    <option value="Отец">Отец</option>
                    <option value="Бабушка/Дедушка">Бабушка / Дедушка</option>
                    <option value="Опекун">Опекун</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Телефон родителя *</label>
                  <input
                    type="tel"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="+7 (999) 123-45-67"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Telegram родителя</label>
                  <input
                    type="text"
                    value={parentTelegram}
                    onChange={(e) => setParentTelegram(e.target.value)}
                    placeholder="@parent_tg"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Основной канал связи</label>
                  <select
                    value={preferredChannel}
                    onChange={(e) => setPreferredChannel(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="telegram">Telegram</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="phone">Телефон</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50/60 p-3.5 border border-slate-200">
                <label className="text-xs font-medium text-slate-700">Выберите семью / родителя из базы</label>
                <select
                  value={selectedParentId}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none"
                  onChange={(e) => {
                    const selected = e.target.value;
                    setSelectedParentId(selected);
                    if (selected === 'p1') {
                      setParentFirstName('Ольга');
                      setParentLastName('Смирнова');
                      setParentPhone('+7 (999) 123-45-67');
                      setPreferredChannel('telegram');
                    } else if (selected === 'p3') {
                      setParentFirstName('Дмитрий');
                      setParentLastName('Кузнецов');
                      setParentPhone('+7 (999) 234-56-78');
                      setParentTelegram('@dkuznetsov');
                      setPreferredChannel('whatsapp');
                    } else if (selected === 'p4') {
                      setParentFirstName('Елена');
                      setParentLastName('Васильева');
                      setParentPhone('+7 (999) 345-67-89');
                      setPreferredChannel('phone');
                    } else if (selected === 'p5') {
                      setParentFirstName('Наталья');
                      setParentLastName('Захарова');
                      setParentPhone('+7 (916) 777-33-22');
                      setParentTelegram('@zakharova_n');
                      setPreferredChannel('telegram');
                    }
                  }}
                >
                  <option value="">-- Выберите родителя --</option>
                  <option value="p3">Дмитрий Кузнецов (+7 999 234-56-78) — Дети: Мария, Артём</option>
                  <option value="p1">Ольга Смирнова (+7 999 123-45-67) — Семья Смирновых (Иван)</option>
                  <option value="p5">Наталья Захарова (+7 916 777-33-22) — Максим</option>
                  <option value="p4">Елена Васильева (+7 999 345-67-89) — Дочь: Анна</option>
                </select>
                <p className="mt-2 text-[11px] text-slate-500">
                  💡 Привязка к существующему родителю автоматически объединит детей в единый семейный профиль.
                </p>
              </div>
            )}
          </div>

          {/* SECTION 4: ЗАМЕТКИ И ОСОБЕННОСТИ УЧЕНИКА */}
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                4. Заметки и особенности ученика
              </h3>
              <span className="text-[11px] text-slate-400">Необязательно</span>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">
                Индивидуальные особенности, характер, цели обучения
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Например: интерес к IT и программированию, занимается с ноутбука, цель — сдать B2..."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Заметка сразу отобразится в карточке ученика и будет доступна преподавателям и администраторам школы.
              </p>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-xs font-semibold text-white shadow-xs transition-colors',
                initialData?.sourceLeadId
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              <Check className="h-4 w-4" />
              {initialData?.sourceLeadId ? 'Сохранить карточку ученика' : 'Создать ученика'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
