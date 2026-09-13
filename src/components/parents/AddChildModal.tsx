'use client';

import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Users,
  User,
  BookOpen,
  Calendar,
  CreditCard,
  Phone,
  Send,
  Check,
  GraduationCap,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { INITIAL_STUDENTS, FullStudentData } from '@/lib/data/mockData';

export interface AddedChildData {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  age: string;
  birthDate?: string;
  gender?: 'male' | 'female';
  group: string;
  course: string;
  teacher: string;
  status: 'active' | 'trial' | 'lead';
  attendance: string;
  phone?: string;
  telegram?: string;
  relationshipType: string;
  subscriptionType: string;
  price: string;
  paymentStatus: 'paid' | 'expected' | 'trial_free';
  startDate: string;
  notes?: string;
}

interface AddChildModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentId: string;
  parentName: string;
  parentPhone?: string;
  onChildAdded: (child: AddedChildData) => void;
  existingChildrenIds?: string[];
}

const COURSES_CONFIG = [
  {
    name: 'Английский язык',
    defaultPrice: '7 600 ₽',
    groups: [
      { name: 'English B1 Teens', teacher: 'Мария Иванова' },
      { name: 'Kids English A1', teacher: 'Мария Иванова' },
      { name: 'English Starter 7-9 лет', teacher: 'Мария Иванова' },
    ],
  },
  {
    name: 'Робототехника и IT',
    defaultPrice: '8 400 ₽',
    groups: [
      { name: 'Robotics Junior', teacher: 'Денис Смирнов' },
      { name: 'Arduino Pro 10-14 лет', teacher: 'Денис Смирнов' },
      { name: 'Scratch Coding 8-11 лет', teacher: 'Денис Смирнов' },
    ],
  },
  {
    name: 'Олимпиадная математика',
    defaultPrice: '6 800 ₽',
    groups: [
      { name: 'Kids Math Safari', teacher: 'Ольга Соколова' },
      { name: 'Math Olympiad 5-7 класс', teacher: 'Ольга Соколова' },
      { name: 'Логика и комбинаторика', teacher: 'Ольга Соколова' },
    ],
  },
  {
    name: 'Скорочтение и память',
    defaultPrice: '5 900 ₽',
    groups: [
      { name: 'Скорочтение Junior 6-8 лет', teacher: 'Ольга Соколова' },
      { name: 'Развитие памяти и внимания', teacher: 'Ольга Соколова' },
    ],
  },
];

export function AddChildModal({
  isOpen,
  onClose,
  parentId,
  parentName,
  parentPhone,
  onChildAdded,
  existingChildrenIds = [],
}: AddChildModalProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'link'>('create');

  // Derive initial last name from parent name
  const parentLastName = parentName.split(' ')[1] || '';

  // Form state for creating a new child
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState(parentLastName);
  const [birthDate, setBirthDate] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [course, setCourse] = useState('Английский язык');
  const [level, setLevel] = useState('Начинающий (с нуля)');
  const [group, setGroup] = useState('English B1 Teens');
  const [teacher, setTeacher] = useState('Мария Иванова');
  const [status, setStatus] = useState<'active' | 'trial' | 'lead'>('active');

  // Subscription & Finance
  const [subscriptionType, setSubscriptionType] = useState('Стандартный (8 уроков/мес)');
  const [price, setPrice] = useState('7 600 ₽');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'expected' | 'trial_free'>('paid');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Contacts & specifics
  const [childPhone, setChildPhone] = useState('');
  const [childTelegram, setChildTelegram] = useState('');
  const [relationshipType, setRelationshipType] = useState('Мама');
  const [notes, setNotes] = useState('');

  // Link existing student state
  const availableExistingStudents = INITIAL_STUDENTS.filter(
    (s) => !existingChildrenIds.includes(s.id)
  );
  const [selectedExistingStudentId, setSelectedExistingStudentId] = useState(
    availableExistingStudents[0]?.id || ''
  );
  const [linkRelationshipType, setLinkRelationshipType] = useState('Мама');

  if (!isOpen) return null;

  // Handle course change to auto-update groups and default price
  const handleCourseChange = (newCourse: string) => {
    setCourse(newCourse);
    const foundCourse = COURSES_CONFIG.find((c) => c.name === newCourse);
    if (foundCourse) {
      setPrice(foundCourse.defaultPrice);
      if (foundCourse.groups.length > 0) {
        setGroup(foundCourse.groups[0].name);
        setTeacher(foundCourse.groups[0].teacher);
      }
    }
  };

  // Handle group change to auto-update teacher
  const handleGroupChange = (newGroup: string) => {
    setGroup(newGroup);
    const currentCourseConfig = COURSES_CONFIG.find((c) => c.name === course);
    const foundGroup = currentCourseConfig?.groups.find((g) => g.name === newGroup);
    if (foundGroup) {
      setTeacher(foundGroup.teacher);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      alert('Пожалуйста, укажите имя и фамилию ребенка');
      return;
    }

    const calculatedAge = age.trim() || (birthDate ? `${new Date().getFullYear() - new Date(birthDate).getFullYear()} лет` : 'Возраст не указан');

    const newChild: AddedChildData = {
      id: `child_${Date.now()}`,
      name: `${firstName.trim()} ${lastName.trim()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      age: calculatedAge,
      birthDate: birthDate || undefined,
      gender,
      group: group || 'Без группы',
      course,
      teacher,
      status,
      attendance: '100%',
      phone: childPhone.trim() || undefined,
      telegram: childTelegram.trim() || undefined,
      relationshipType,
      subscriptionType,
      price,
      paymentStatus,
      startDate,
      notes: notes.trim() || undefined,
    };

    onChildAdded(newChild);
    onClose();
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const existing = availableExistingStudents.find((s) => s.id === selectedExistingStudentId);
    if (!existing) return;

    const linkedChild: AddedChildData = {
      id: existing.id,
      name: `${existing.firstName} ${existing.lastName}`,
      firstName: existing.firstName,
      lastName: existing.lastName,
      age: existing.birthDate ? `${new Date().getFullYear() - new Date(existing.birthDate).getFullYear()} лет` : '12 лет',
      birthDate: existing.birthDate,
      group: existing.groups?.[0]?.name || 'English B1 Teens',
      course: existing.groups?.[0]?.courseName || 'Английский язык',
      teacher: existing.groups?.[0]?.teacherName || 'Мария Иванова',
      status: existing.status === 'active' ? 'active' : 'trial',
      attendance: existing.attendanceStats?.attendanceRate || '95%',
      relationshipType: linkRelationshipType,
      subscriptionType: 'Стандартный (8 уроков/мес)',
      price: existing.finance?.activeSubscription?.price || '7 600 ₽',
      paymentStatus: 'paid',
      startDate: new Date().toISOString().split('T')[0],
      notes: existing.notes,
    };

    onChildAdded(linkedChild);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-6 overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Добавить ребенка в семью</h2>
              <p className="text-xs text-slate-500">
                Привязка к представителю: <strong className="text-slate-800">{parentName}</strong>
                {parentPhone ? ` (${parentPhone})` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher: Create vs Link */}
        <div className="flex border-b border-slate-200 bg-slate-50/40 px-6 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={cn(
              'flex items-center gap-2 border-b-2 pb-3 px-3 text-xs font-bold transition-all',
              activeTab === 'create'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            <UserPlus className="h-4 w-4" />
            Новый ребенок (заведение с нуля)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={cn(
              'flex items-center gap-2 border-b-2 pb-3 px-3 text-xs font-bold transition-all',
              activeTab === 'link'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            <Users className="h-4 w-4" />
            Выбрать существующего из базы
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {activeTab === 'create' ? (
            /* TAB 1: CREATE NEW CHILD */
            <form id="createChildForm" onSubmit={handleCreateSubmit} className="space-y-6 text-xs">
              {/* SECTION 1: Основные данные ребенка */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold border-b border-slate-100 pb-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span>1. Основные данные ребенка</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Имя ребенка *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Например: Михаил"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Фамилия ребенка *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Например: Смирнов"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Дата рождения
                    </label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => {
                        setBirthDate(e.target.value);
                        if (e.target.value) {
                          const years = new Date().getFullYear() - new Date(e.target.value).getFullYear();
                          setAge(`${years} лет`);
                        }
                      }}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Возраст / Класс
                    </label>
                    <input
                      type="text"
                      placeholder="Например: 10 лет (4 класс)"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Пол
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setGender('male')}
                        className={cn(
                          'flex-1 py-1.5 rounded-xl border text-center font-semibold transition-all',
                          gender === 'male'
                            ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-2xs'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        )}
                      >
                        Мужской
                      </button>
                      <button
                        type="button"
                        onClick={() => setGender('female')}
                        className={cn(
                          'flex-1 py-1.5 rounded-xl border text-center font-semibold transition-all',
                          gender === 'female'
                            ? 'bg-pink-50 border-pink-500 text-pink-700 shadow-2xs'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        )}
                      >
                        Женский
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Родственная связь родителя
                    </label>
                    <select
                      value={relationshipType}
                      onChange={(e) => setRelationshipType(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    >
                      <option value="Мама">Мама</option>
                      <option value="Папа">Папа</option>
                      <option value="Бабушка">Бабушка</option>
                      <option value="Дедушка">Дедушка</option>
                      <option value="Опекун">Опекун</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Учебная программа и группа */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold border-b border-slate-100 pb-2">
                  <BookOpen className="h-4 w-4 text-indigo-600" />
                  <span>2. Учебная программа и распределение в группу</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Курс / Предмет *
                    </label>
                    <select
                      value={course}
                      onChange={(e) => handleCourseChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    >
                      {COURSES_CONFIG.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Уровень подготовки
                    </label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    >
                      <option value="Начинающий (с нуля)">Начинающий (с нуля)</option>
                      <option value="Базовый">Базовый</option>
                      <option value="A1 Starter">A1 Starter</option>
                      <option value="B1 Intermediate">B1 Intermediate</option>
                      <option value="Продвинутый / Олимпиадный">Продвинутый / Олимпиадный</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Учебная группа *
                    </label>
                    <select
                      value={group}
                      onChange={(e) => handleGroupChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    >
                      {COURSES_CONFIG.find((c) => c.name === course)?.groups.map((g) => (
                        <option key={g.name} value={g.name}>
                          {g.name} ({g.teacher})
                        </option>
                      ))}
                      <option value="Без группы / Индивидуально">Без группы / Индивидуально</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Преподаватель
                    </label>
                    <input
                      type="text"
                      value={teacher}
                      onChange={(e) => setTeacher(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Статус зачисления
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'active', label: 'Активный ученик', desc: 'Посещает регулярные занятия' },
                        { key: 'trial', label: 'Пробный урок', desc: 'Назначен пробный / адаптация' },
                        { key: 'lead', label: 'Потенциальный', desc: 'Ожидает подбора группы' },
                      ].map((st) => (
                        <button
                          key={st.key}
                          type="button"
                          onClick={() => setStatus(st.key as any)}
                          className={cn(
                            'p-2 rounded-xl border text-left transition-all',
                            status === st.key
                              ? 'border-blue-500 bg-blue-50/70 text-blue-900 ring-1 ring-blue-500'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          )}
                        >
                          <p className="font-bold text-xs">{st.label}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{st.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Абонемент и тариф */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold border-b border-slate-100 pb-2">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  <span>3. Абонемент и финансовые параметры</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Тарифный план
                    </label>
                    <select
                      value={subscriptionType}
                      onChange={(e) => setSubscriptionType(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    >
                      <option value="Стандартный (8 уроков/мес)">Стандартный (8 уроков/мес)</option>
                      <option value="Интенсив (12 уроков/мес)">Интенсив (12 уроков/мес)</option>
                      <option value="Индивидуальный (4 урока/мес)">Индивидуальный (4 урока/мес)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Стоимость в месяц
                    </label>
                    <input
                      type="text"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Статус первой оплаты
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    >
                      <option value="paid">Оплачено (чек сформирован)</option>
                      <option value="expected">Ожидается оплата</option>
                      <option value="trial_free">Пробный бесплатно</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Личные контакты и особенности ребенка */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold border-b border-slate-100 pb-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span>4. Личные контакты и педагогические заметки</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Личный телефон ребенка (необязательно)
                    </label>
                    <input
                      type="tel"
                      placeholder="+7 (999) 000-00-00"
                      value={childPhone}
                      onChange={(e) => setChildPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Telegram ребенка (необязательно)
                    </label>
                    <input
                      type="text"
                      placeholder="@child_username"
                      value={childTelegram}
                      onChange={(e) => setChildTelegram(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Особенности, увлечения и рекомендации преподавателю
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Например: Любит робототехнику, занимался Lego, аллергия на пыльцу, сильная сторона — логика..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </form>
          ) : (
            /* TAB 2: LINK EXISTING STUDENT */
            <form id="linkChildForm" onSubmit={handleLinkSubmit} className="space-y-4 text-xs">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 text-xs text-blue-800 flex items-start gap-2">
                <Users className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p>
                  Выберите уже зарегистрированного в школе ученика, чтобы объединить его профиль в семейный аккаунт с родителем <strong>{parentName}</strong> без потери истории посещаемости и оплат.
                </p>
              </div>

              {availableExistingStudents.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="font-semibold">Все ученики базы уже привязаны к семьям.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('create')}
                    className="mt-2 text-blue-600 font-bold hover:underline"
                  >
                    Завести нового ребенка →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Выберите ученика из базы данных:
                    </label>
                    <select
                      value={selectedExistingStudentId}
                      onChange={(e) => setSelectedExistingStudentId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    >
                      {availableExistingStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.firstName} {s.lastName} — {s.groups?.[0]?.name || 'Без группы'} ({s.status === 'active' ? 'Активен' : 'Пробный'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Степень родства представителя:
                    </label>
                    <select
                      value={linkRelationshipType}
                      onChange={(e) => setLinkRelationshipType(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                    >
                      <option value="Мама">Мама</option>
                      <option value="Папа">Папа</option>
                      <option value="Бабушка">Бабушка</option>
                      <option value="Дедушка">Дедушка</option>
                      <option value="Опекун">Опекун</option>
                    </select>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors shadow-2xs"
          >
            Отмена
          </button>
          <button
            type="submit"
            form={activeTab === 'create' ? 'createChildForm' : 'linkChildForm'}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-98"
          >
            <Check className="h-3.5 w-3.5" />
            {activeTab === 'create' ? 'Зачислить ребенка в семью' : 'Привязать ученика'}
          </button>
        </div>
      </div>
    </div>
  );
}
