'use client';

import React, { useState } from 'react';
import {
  X,
  UserCheck,
  GraduationCap,
  Users,
  CreditCard,
  Calendar,
  Check,
  ArrowRight,
  Sparkles,
  Phone,
  MessageSquare
} from 'lucide-react';
import { FullLeadData, INITIAL_GROUPS, INITIAL_STUDENTS, FullStudentData } from '@/lib/data/mockData';

interface EnrollStudentFromLeadModalProps {
  isOpen: boolean;
  lead: FullLeadData;
  onClose: () => void;
  onEnrolled: (result: { studentId: string; parentId: string; groupName: string }) => void;
}

export function EnrollStudentFromLeadModal({
  isOpen,
  lead,
  onClose,
  onEnrolled
}: EnrollStudentFromLeadModalProps) {
  // Infer student first & last name
  const rawStudentName = (lead.studentName || lead.name || '').trim();
  const nameParts = rawStudentName.split(' ');
  const defaultStudentFirstName = nameParts[0] || '';
  const defaultStudentLastName = nameParts.slice(1).join(' ') || '';

  // Infer parent name
  const parentParts = (lead.name || '').trim().split(' ');
  const defaultParentFirstName = parentParts[0] || '';
  const defaultParentLastName = parentParts.slice(1).join(' ') || defaultStudentLastName;

  const [parentFirstName, setParentFirstName] = useState(defaultParentFirstName);
  const [parentLastName, setParentLastName] = useState(defaultParentLastName);
  const [parentPhone, setParentPhone] = useState(lead.contact || '');
  const [parentTelegram, setParentTelegram] = useState(lead.telegram || '');
  const [relationshipType, setRelationshipType] = useState('Мама');

  const [studentFirstName, setStudentFirstName] = useState(defaultStudentFirstName);
  const [studentLastName, setStudentLastName] = useState(defaultStudentLastName);
  const [studentAge, setStudentAge] = useState(lead.studentAge || '12 лет');
  const [course, setCourse] = useState(lead.directionOrCourse || 'Английский язык');

  // Groups list for selection
  const availableGroups = INITIAL_GROUPS.filter(
    (g) => g.courseName.toLowerCase().includes(course.toLowerCase()) || course.toLowerCase().includes(g.courseName.toLowerCase())
  );
  const fallbackGroups = availableGroups.length > 0 ? availableGroups : INITIAL_GROUPS;

  const [selectedGroupId, setSelectedGroupId] = useState(fallbackGroups[0]?.id || '1');
  const [subscriptionPeriod, setSubscriptionPeriod] = useState('Сентябрь 2026');
  const [subscriptionPrice, setSubscriptionPrice] = useState(lead.offerAmount || '7 600 ₽');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newStudentId = `std_${Date.now()}`;
    const newParentId = `prnt_${Date.now()}`;
    const targetGroup = INITIAL_GROUPS.find((g) => g.id === selectedGroupId) || INITIAL_GROUPS[0];

    // 1. Create student in INITIAL_STUDENTS
    const newStudent: FullStudentData = {
      id: newStudentId,
      school_id: 'sch1',
      firstName: studentFirstName.trim() || 'Ученик',
      lastName: studentLastName.trim() || 'Новый',
      status: 'active',
      phone: lead.contact,
      telegram: lead.telegram,
      birthDate: '2014-05-15',
      grade: studentAge,
      avatar_url: undefined,
      is_active: true,
      created_at: new Date().toISOString(),
      parents: [
        {
          id: newParentId,
          school_id: 'sch1',
          firstName: parentFirstName.trim() || 'Родитель',
          lastName: parentLastName.trim() || studentLastName.trim(),
          phone: parentPhone,
          telegram: parentTelegram,
          relationshipType,
          isPrimary: true,
          is_active: true,
          created_at: new Date().toISOString()
        }
      ],
      groups: [
        {
          id: targetGroup.id,
          name: targetGroup.name,
          courseName: targetGroup.courseName,
          teacherName: targetGroup.teacherName,
          schedule: targetGroup.schedule,
          status: 'active',
          joinedAt: new Date().toLocaleDateString('ru-RU')
        }
      ],
      attendanceStats: {
        totalLessons: 0,
        presentCount: 0,
        absentCount: 0,
        rescheduledCount: 0,
        attendanceRate: '100%',
        history: []
      },
      finance: {
        activeSubscription: {
          period: subscriptionPeriod,
          price: subscriptionPrice,
          status: paymentStatus === 'paid' ? 'active' : 'pending',
          lessonsAttended: '0/8',
          renewalDate: '01.10.2026'
        },
        paymentHistory: [
          {
            id: `pay_${Date.now()}`,
            date: new Date().toLocaleDateString('ru-RU'),
            amount: subscriptionPrice,
            period: subscriptionPeriod,
            status: paymentStatus === 'paid' ? 'paid' : 'pending'
          }
        ]
      },
      teacherComments: [],
      interactions: [
        {
          id: `int_${Date.now()}`,
          studentId: newStudentId,
          occurredAt: 'Только что',
          channel: 'other',
          type: 'initial_contact',
          author: 'Система CRM',
          content: `Ученик успешно зачислен из Лида «${lead.name}» в группу «${targetGroup.name}».`,
          result: 'Зачисление завершено'
        }
      ]
    };

    INITIAL_STUDENTS.unshift(newStudent);

    // 2. Add student to target group
    targetGroup.students.push({
      id: newStudentId,
      name: `${studentFirstName.trim()} ${studentLastName.trim()}`,
      status: 'active',
      attendanceRate: '100%',
      parentPhone: parentPhone,
      joinedAt: new Date().toLocaleDateString('ru-RU')
    });

    onEnrolled({
      studentId: newStudentId,
      parentId: newParentId,
      groupName: targetGroup.name
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="w-full max-w-2xl md-card-elevated max-h-[92vh] flex flex-col"
        style={{
          borderRadius: '24px',
          backgroundColor: 'var(--md-surface-container-lowest)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--md-outline-variant)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)' }}
            >
              <UserCheck size={22} />
            </div>
            <div>
              <h2 className="md-title-medium font-bold" style={{ color: 'var(--md-on-surface)' }}>
                Оформление зачисления в школу
              </h2>
              <p className="text-xs text-slate-500">
                Создание ученика, родителя, запись в группу и фиксация оплаты в один шаг
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="md-btn md-btn-text md-btn-sm"
            style={{ padding: '6px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Section 1: Child / Student */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                <GraduationCap size={15} /> 1. Профиль ученика
              </span>
              <span className="text-[11px] text-blue-600 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                Создается карточка
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Имя ребенка *</label>
                <input
                  type="text"
                  required
                  value={studentFirstName}
                  onChange={(e) => setStudentFirstName(e.target.value)}
                  placeholder="Иван"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Фамилия ребенка *</label>
                <input
                  type="text"
                  required
                  value={studentLastName}
                  onChange={(e) => setStudentLastName(e.target.value)}
                  placeholder="Смирнов"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Возраст / Класс</label>
                <input
                  type="text"
                  value={studentAge}
                  onChange={(e) => setStudentAge(e.target.value)}
                  placeholder="12 лет (6 класс)"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Направление / Курс</label>
                <input
                  type="text"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="Английский язык"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Parent / Family */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Users size={15} /> 2. Законный представитель (Родитель)
              </span>
              <span className="text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                Семейный профиль
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Имя родителя *</label>
                <input
                  type="text"
                  required
                  value={parentFirstName}
                  onChange={(e) => setParentFirstName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Фамилия родителя</label>
                <input
                  type="text"
                  value={parentLastName}
                  onChange={(e) => setParentLastName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Кем приходится</label>
                <select
                  value={relationshipType}
                  onChange={(e) => setRelationshipType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Мама">Мама</option>
                  <option value="Папа">Папа</option>
                  <option value="Бабушка">Бабушка</option>
                  <option value="Дедушка">Дедушка</option>
                  <option value="Опекун">Опекун</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Телефон *</label>
                <input
                  type="tel"
                  required
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Telegram</label>
                <input
                  type="text"
                  value={parentTelegram}
                  onChange={(e) => setParentTelegram(e.target.value)}
                  placeholder="@username"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Group & Schedule */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <Calendar size={15} /> 3. Зачисление в онлайн-группу
            </span>

            <div>
              <label className="text-xs font-semibold text-slate-700">Учебная группа *</label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                {fallbackGroups.map((g) => {
                  const free = g.capacity - g.students.length;
                  return (
                    <option key={g.id} value={g.id}>
                      {g.name} — {g.teacherName} ({g.schedule}) • {free > 0 ? `Свободно мест: ${free}` : 'Группа заполнена'}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Дата старта занятий</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 4: Finance & First Payment */}
          <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <CreditCard size={15} /> 4. Абонемент и первичная оплата
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Сумма оплаты *</label>
                <input
                  type="text"
                  required
                  value={subscriptionPrice}
                  onChange={(e) => setSubscriptionPrice(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Расчетный период</label>
                <input
                  type="text"
                  value={subscriptionPeriod}
                  onChange={(e) => setSubscriptionPeriod(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Статус платежа</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as 'paid' | 'pending')}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="paid">✅ Оплачено</option>
                  <option value="pending">⏳ Ожидается оплата</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="md-btn md-btn-text"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="md-btn md-btn-filled"
              style={{ gap: '8px', padding: '10px 22px' }}
            >
              <Check size={16} />
              Зачислить ученика и создать профиль
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
