'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Calendar,
  Users,
  User,
  Star,
  Clock,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  X,
  Plus,
  Send,
  CreditCard,
  BookOpen,
  HelpCircle,
  Video,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';

// Types
interface ChildInfo {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  age: number;
  grade?: string;
}

interface ParentProfile {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  telegram?: string;
}

interface DirectionItem {
  id: string;
  name: string;
  subject: string;
  description: string;
  format: 'group' | 'individual';
  ageGroup: string;
  lessonDuration: string;
  capacity: number;
  isTrialAvailable: boolean;
  icon: string;
}

interface GroupLessonItem {
  id: string;
  date: string;
  dateFormatted: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timeLabel: string;
  teacherName: string;
  topic: string;
  room: string;
  onlineMeetingUrl?: string;
  availableSeats: number;
  maxCapacity: number;
  seatStatusLabel: string;
  seatBadgeType: 'available' | 'few' | 'full';
}

interface GroupItem {
  id: string;
  name: string;
  courseName: string;
  teacherName: string;
  schedule: string;
  ageBracket: string;
  capacity: number;
  enrolledCount: number;
  availableSeats: number;
  occupancyRate: number;
  lessons: GroupLessonItem[];
}

interface TeacherItem {
  id: string;
  name: string;
  role: string;
  subject: string;
  rating: number;
  reviewCount: number;
  avatarUrl: string;
}

interface TeacherSlotItem {
  startTime: string;
  endTime: string;
  label: string;
  isAvailable: boolean;
  reason?: string;
}

export default function TelegramMiniAppPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-500">Загрузка мини-приложения...</div>}>
      <MiniAppMainContent />
    </Suspense>
  );
}

function MiniAppMainContent() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const rawChatId = searchParams.get('chatId') || searchParams.get('telegram') || '';
  const initialLessonId = searchParams.get('lessonId') || '';
  const initialStudentId = searchParams.get('studentId') || '';
  const initialParentId = searchParams.get('parentId') || '';
  const initialLeadId = searchParams.get('leadId') || '';

  // Core state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeBottomTab, setActiveBottomTab] = useState<'home' | 'lessons' | 'payments' | 'profile'>('home');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [parent, setParent] = useState<ParentProfile | null>(null);
  const [childrenList, setChildrenList] = useState<ChildInfo[]>([]);

  // Booking selections
  const [bookingFormat, setBookingFormat] = useState<'group' | 'individual'>('group');
  const [isTrial, setIsTrial] = useState<boolean>(false);
  const [directions, setDirections] = useState<DirectionItem[]>([]);
  const [selectedDirection, setSelectedDirection] = useState<DirectionItem | null>(null);

  // Group flow
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupItem | null>(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  const [selectedLesson, setSelectedLesson] = useState<GroupLessonItem | null>(null);

  // Individual flow
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherItem | null>(null);
  const [indivDateFilter, setIndivDateFilter] = useState<string>('');
  const [teacherSlots, setTeacherSlots] = useState<TeacherSlotItem[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TeacherSlotItem | null>(null);

  // Student selection & confirmation
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [sendTelegramReminder, setSendTelegramReminder] = useState<boolean>(true);

  // Final booked lesson result
  const [bookedLesson, setBookedLesson] = useState<any>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modals for secondary actions
  const [showAddChildModal, setShowAddChildModal] = useState<boolean>(false);
  const [myLessonsList, setMyLessonsList] = useState<any[]>([]);

  // Initial Data Fetch
  useEffect(() => {
    async function initMiniAppData() {
      setIsLoading(true);
      try {
        // Read Telegram WebApp context if available
        let tgChatId = '';
        let tgUsername = '';
        let tgFirstName = '';
        let tgLastName = '';

        if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
          const tg = (window as any).Telegram.WebApp;
          try {
            tg.ready();
            tg.expand();
          } catch {}
          const tgUser = tg.initDataUnsafe?.user;
          if (tgUser) {
            tgChatId = tgUser.id ? String(tgUser.id) : '';
            tgUsername = tgUser.username || '';
            tgFirstName = tgUser.first_name || '';
            tgLastName = tgUser.last_name || '';
          }
        }

        const effectiveChatId = rawChatId || tgChatId;

        // 1. Fetch parent & verified children
        const pParams = new URLSearchParams();
        if (effectiveChatId) pParams.set('chatId', effectiveChatId);
        if (tgUsername) pParams.set('username', tgUsername);
        if (initialParentId) pParams.set('parentId', initialParentId);
        if (initialStudentId) pParams.set('studentId', initialStudentId);
        if (initialLeadId) pParams.set('leadId', initialLeadId);
        if (tgFirstName) pParams.set('tgFirstName', tgFirstName);
        if (tgLastName) pParams.set('tgLastName', tgLastName);

        const pRes = await fetch(`/api/telegram/mini-app/parent?${pParams.toString()}`);
        const pData = await pRes.json();
        if (pData.success && pData.parent) {
          setParent(pData.parent);
          setChildrenList(pData.children || []);
          if (initialStudentId) {
            setSelectedChildId(initialStudentId);
          } else if (pData.children && pData.children.length > 0) {
            setSelectedChildId(pData.children[0].id);
          }
        } else if (pData.children && pData.children.length > 0) {
          setChildrenList(pData.children);
          setSelectedChildId(initialStudentId || pData.children[0].id);
        }

        // 2. Fetch directions
        const dRes = await fetch('/api/telegram/mini-app/directions');
        const dData = await dRes.json();
        if (dData.success && Array.isArray(dData.directions)) {
          setDirections(dData.directions);
        }

        // 3. Fetch teachers
        const tRes = await fetch('/api/telegram/mini-app/teachers');
        const tData = await tRes.json();
        if (tData.success && Array.isArray(tData.teachers)) {
          setTeachers(tData.teachers);
        }
      } catch (err) {
        console.error('Mini App initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initMiniAppData();
  }, [rawChatId, initialParentId, initialStudentId, initialLeadId]);

  // Deep Link handling: if ?lessonId=... was passed, immediately load it and jump to confirmation screen
  useEffect(() => {
    if (!initialLessonId) return;

    let isMounted = true;
    async function loadDeepLinkedLesson() {
      try {
        const res = await fetch(`/api/telegram/mini-app/groups?lessonId=${encodeURIComponent(initialLessonId)}`);
        const data = await res.json();
        if (isMounted && data.success && data.lesson && data.group) {
          setSelectedGroup(data.group);
          setSelectedLesson(data.lesson);
          setBookingFormat('group');
          setCurrentStep(6); // jump directly to student confirmation step
        }
      } catch (err) {
        console.error('Failed to load deep-linked lesson:', err);
      }
    }

    loadDeepLinkedLesson();
    return () => {
      isMounted = false;
    };
  }, [initialLessonId]);

  // Load groups when direction is chosen
  const loadGroupsForDirection = async (direction: DirectionItem) => {
    try {
      const res = await fetch(`/api/telegram/mini-app/groups?directionName=${encodeURIComponent(direction.name)}&courseId=${encodeURIComponent(direction.id)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.groups)) {
        setGroups(data.groups);
      }
    } catch (e) {
      console.error('Failed to load groups:', e);
    }
  };

  // Load slots when teacher and date are chosen
  const loadSlotsForTeacher = async (teacherId: string, date: string) => {
    try {
      const res = await fetch(`/api/telegram/mini-app/teachers?teacherId=${encodeURIComponent(teacherId)}&date=${encodeURIComponent(date)}&duration=60`);
      const data = await res.json();
      if (data.success && Array.isArray(data.slots)) {
        setTeacherSlots(data.slots);
      }
    } catch (e) {
      console.error('Failed to load slots:', e);
    }
  };

  // Dates generator for date picker pills
  const availableDates = useMemo(() => {
    const list: Array<{ iso: string; label: string; dayOfWeek: string }> = [];
    const base = new Date();
    const daysMap = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const monthsMap = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const dayOfWeek = daysMap[d.getDay()];
      const dayNum = d.getDate();
      const monthStr = monthsMap[d.getMonth()];
      list.push({
        iso,
        label: `${dayOfWeek} ${dayNum} ${monthStr}`,
        dayOfWeek,
      });
    }
    return list;
  }, []);

  // Filter lessons of selected group by selected date
  const filteredGroupLessons = useMemo(() => {
    if (!selectedGroup) return [];
    if (!selectedDateFilter) return selectedGroup.lessons;
    return selectedGroup.lessons.filter((l) => l.date === selectedDateFilter);
  }, [selectedGroup, selectedDateFilter]);

  // Selected child object
  const selectedChild = useMemo(() => {
    return childrenList.find((c) => c.id === selectedChildId) || childrenList[0];
  }, [childrenList, selectedChildId]);

  // Handle final booking submission (atomic server request)
  const handleConfirmBooking = async () => {
    if (!selectedChildId || !parent?.id) {
      setBookingError('Не выбран ученик или отсутствует профиль родителя');
      return;
    }

    setIsSubmitting(true);
    setBookingError(null);

    try {
      let payload: any = {
        bookingType: bookingFormat,
        studentId: selectedChildId,
        parentId: parent.id,
        isTrial,
        sendTelegramReminder,
        chatId: rawChatId || parent.telegram,
      };

      if (bookingFormat === 'group') {
        if (!selectedLesson) {
          setBookingError('Пожалуйста, выберите занятие');
          setIsSubmitting(false);
          return;
        }
        payload.lessonId = selectedLesson.id;
      } else {
        if (!selectedTeacher || !selectedSlot || !indivDateFilter || !selectedDirection) {
          setBookingError('Пожалуйста, выберите преподавателя, дату и слот');
          setIsSubmitting(false);
          return;
        }
        payload.teacherId = selectedTeacher.id;
        payload.date = indivDateFilter;
        payload.startTime = selectedSlot.startTime;
        payload.endTime = selectedSlot.endTime;
        payload.courseName = selectedDirection.name;
        payload.topic = isTrial ? `Пробное занятие: ${selectedDirection.name}` : `Индивидуальное: ${selectedDirection.name}`;
      }

      const res = await fetch('/api/telegram/mini-app/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setBookingError(data.error || 'Не удалось записаться. Возможно, место уже занято.');
        setIsSubmitting(false);
        return;
      }

      setBookedLesson(data.lesson);
      setCurrentStep(8); // Go to Success Screen
    } catch (err: any) {
      setBookingError(err?.message || 'Сетевая ошибка при записи');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Back button handler
  const handleGoBack = () => {
    setBookingError(null);
    if (currentStep === 8) {
      setCurrentStep(1);
    } else if (currentStep === 7) {
      setCurrentStep(6);
    } else if (currentStep === 6) {
      setCurrentStep(bookingFormat === 'group' ? 5 : 10);
    } else if (currentStep === 10) {
      setCurrentStep(9);
    } else if (currentStep === 9) {
      setCurrentStep(3);
    } else if (currentStep === 5) {
      setCurrentStep(4);
    } else if (currentStep === 4) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(1);
    } else {
      setCurrentStep(1);
    }
  };

  // Add to calendar (.ics download helper)
  const handleAddToCalendar = () => {
    if (!bookedLesson) return;
    const l = bookedLesson;
    const [startH, startM] = (l.startTime || '18:00').split(':');
    const [endH, endM] = (l.endTime || '19:15').split(':');
    const dateFormattedClean = (l.date || '2026-10-15').replace(/-/g, '');
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//YouEurope School//CRM//RU',
      'BEGIN:VEVENT',
      `SUMMARY:${l.groupName || l.courseName} (${selectedChild?.fullName || 'Ученик'})`,
      `DESCRIPTION:Преподаватель: ${l.teacherName}\\nСсылка на Zoom: ${l.onlineMeetingUrl || 'Онлайн'}\\nШкола YouEurope`,
      `DTSTART:${dateFormattedClean}T${startH || '18'}${startM || '00'}00`,
      `DTEND:${dateFormattedClean}T${endH || '19'}${endM || '15'}00`,
      `LOCATION:Онлайн (Zoom)`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `lesson_${l.date}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center selection:bg-blue-100">
      {/* Mobile Shell Target: 375px - 430px */}
      <div className="w-full max-w-[430px] min-h-screen bg-white shadow-xl flex flex-col relative pb-16">
        
        {/* Top Telegram Header Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleGoBack}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-700 transition-colors"
                title="Назад"
              >
                <ArrowLeft size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
                    (window as any).Telegram.WebApp.close();
                  }
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors"
                title="Закрыть"
              >
                <X size={18} />
              </button>
            )}
            <div className="text-left">
              <h1 className="text-xs font-bold text-slate-900 tracking-tight leading-none">You Europe</h1>
              <p className="text-[10px] text-slate-400 font-medium leading-tight">мини-приложение</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600">
            <span className="text-sm font-bold tracking-widest leading-none">•••</span>
          </div>
        </header>

        {/* Main Step Content */}
        <main className="flex-1 px-4 py-4 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Загрузка данных...</p>
            </div>
          ) : (
            <>
              {/* ============================================================== */}
              {/* SCREEN 1: Главное меню мини апп (Home)                         */}
              {/* ============================================================== */}
              {currentStep === 1 && activeBottomTab === 'home' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Greeting Block */}
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 rounded-2xl border border-blue-100/60">
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-base shadow-sm shrink-0">
                      {parent?.firstName ? parent.firstName.charAt(0).toUpperCase() : '👋'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-bold text-slate-900 truncate">
                        Здравствуйте{parent?.firstName ? `, ${parent.firstName}` : ''}!
                      </h2>
                      <p className="text-[11px] text-slate-500">Выберите, что хотите сделать</p>
                    </div>
                  </div>

                  {/* 5 Main Feature Cards */}
                  <div className="space-y-2.5">
                    {/* Card 1: Записаться на занятие */}
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="w-full text-left p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Calendar size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            Записаться на занятие
                          </p>
                          <p className="text-[10px] text-slate-400">Групповое, индивидуальное или пробное</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </button>

                    {/* Card 2: Мои занятия */}
                    <button
                      type="button"
                      onClick={() => setActiveBottomTab('lessons')}
                      className="w-full text-left p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <BookOpen size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            Мои занятия
                          </p>
                          <p className="text-[10px] text-slate-400">Расписание и история</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </button>

                    {/* Card 3: Мои дети */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddChildModal(true);
                      }}
                      className="w-full text-left p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <Users size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                            Мои дети
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {childrenList.length > 0 ? childrenList.map((c) => c.firstName).join(', ') : 'Ученики не привязаны'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </button>

                    {/* Card 4: Оплаты */}
                    <button
                      type="button"
                      onClick={() => setActiveBottomTab('payments')}
                      className="w-full text-left p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                          <CreditCard size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                            Оплаты
                          </p>
                          <p className="text-[10px] text-slate-400">Баланс, счета, история</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                    </button>

                    {/* Card 5: Написать администратору */}
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
                          (window as any).Telegram.WebApp.close();
                        } else {
                          toast.info('Вы можете отправить текстовое сообщение прямо в чате с ботом — администратор ответит вам в рабочее время!');
                        }
                      }}
                      className="w-full text-left p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                          <MessageCircle size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                            Написать администратору
                          </p>
                          <p className="text-[10px] text-slate-400">Задать вопрос или получить помощь</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-purple-500 transition-colors" />
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* SCREEN 2: Выбор типа занятия                                   */}
              {/* ============================================================== */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Какое занятие хотите выбрать?</h2>
                    <p className="text-[11px] text-slate-400">Выберите формат занятия</p>
                  </div>

                  <div className="space-y-2.5">
                    {/* Option 1: Групповое */}
                    <button
                      type="button"
                      onClick={() => {
                        setBookingFormat('group');
                        setIsTrial(false);
                        setCurrentStep(3);
                      }}
                      className="w-full text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Users size={22} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600">Групповое занятие</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Занятия в мини-группах по расписанию</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500" />
                    </button>

                    {/* Option 2: Индивидуальное */}
                    <button
                      type="button"
                      onClick={() => {
                        setBookingFormat('individual');
                        setIsTrial(false);
                        setCurrentStep(3);
                      }}
                      className="w-full text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <User size={22} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">Индивидуальное занятие</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Занятия один на один с преподавателем</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500" />
                    </button>

                    {/* Option 3: Пробное */}
                    <button
                      type="button"
                      onClick={() => {
                        setBookingFormat('group');
                        setIsTrial(true);
                        setCurrentStep(3);
                      }}
                      className="w-full text-left p-4 rounded-2xl border border-amber-200 bg-amber-50/30 hover:border-amber-400 hover:shadow-xs transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                          <Star size={22} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-slate-900 group-hover:text-amber-700">Пробное занятие</p>
                            <span className="text-[9px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-md">FREE</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">Бесплатное или по специальной цене</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-amber-400 group-hover:text-amber-600" />
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* SCREEN 3: Выбор направления                                    */}
              {/* ============================================================== */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Выберите направление</h2>
                    <p className="text-[11px] text-slate-400">Популярные направления</p>
                  </div>

                  <div className="space-y-2">
                    {directions.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={async () => {
                          setSelectedDirection(d);
                          if (bookingFormat === 'individual') {
                            setCurrentStep(9); // Choose teacher for individual
                          } else {
                            await loadGroupsForDirection(d);
                            setCurrentStep(4); // Choose group
                          }
                        }}
                        className="w-full text-left p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl shrink-0">{d.icon}</span>
                          <div>
                            <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {d.name}
                            </p>
                            <p className="text-[10px] text-slate-400">{d.description}</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* SCREEN 4: Выбор группы (групповое)                             */}
              {/* ============================================================== */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">{selectedDirection?.name || 'Немецкий язык'}</h2>
                    <div className="flex gap-2 border-b border-slate-100 pb-2 mt-2">
                      <span className="text-xs font-bold text-blue-600 border-b-2 border-blue-600 pb-1 cursor-pointer">
                        Группы
                      </span>
                      <span className="text-xs text-slate-400 pb-1 cursor-pointer">Открытые занятия</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {groups.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400">
                        В этом направлении пока нет активных групп
                      </div>
                    ) : (
                      groups.map((g) => (
                        <div key={g.id} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-xs">
                          <div>
                            <h3 className="text-xs font-bold text-slate-900">{g.name}</h3>
                            <p className="text-[10px] text-slate-400">{g.ageBracket}</p>
                          </div>

                          <div className="space-y-1.5 text-[11px] text-slate-600">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                                {g.teacherName ? g.teacherName.charAt(0) : 'М'}
                              </div>
                              <span className="font-medium text-slate-800">{g.teacherName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 text-[10px]">
                              <Clock size={12} className="text-slate-400" />
                              <span>{g.schedule}</span>
                            </div>
                          </div>

                          {/* Capacity Progress Bar */}
                          <div className="space-y-1 pt-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-500">{g.enrolledCount} из {g.capacity} мест занято</span>
                              <span className="font-semibold text-slate-700">{g.occupancyRate}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all duration-300',
                                  g.availableSeats === 0
                                    ? 'bg-rose-500'
                                    : g.availableSeats <= 2
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                )}
                                style={{ width: `${Math.min(100, g.occupancyRate)}%` }}
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedGroup(g);
                              // Auto set first date if available
                              if (g.lessons && g.lessons.length > 0) {
                                setSelectedDateFilter(g.lessons[0].date);
                              }
                              setCurrentStep(5);
                            }}
                            className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                          >
                            Выбрать группу
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* SCREEN 5: Выбор даты и занятия                                 */}
              {/* ============================================================== */}
              {currentStep === 5 && selectedGroup && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">{selectedGroup.name}</h2>
                    <p className="text-[10px] text-slate-400">Выберите дату и подходящее время</p>
                  </div>

                  {/* Horizontal Date Picker Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {availableDates.slice(0, 5).map((d) => {
                      const isSelected = selectedDateFilter === d.iso;
                      return (
                        <button
                          key={d.iso}
                          type="button"
                          onClick={() => setSelectedDateFilter(d.iso)}
                          className={cn(
                            'px-3 py-2 rounded-xl text-center shrink-0 border transition-all cursor-pointer',
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                          )}
                        >
                          <p className="text-[10px] uppercase font-bold tracking-wider opacity-80">{d.dayOfWeek}</p>
                          <p className="text-xs font-bold mt-0.5">{d.iso.split('-')[2]} {d.label.split(' ')[2]}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Available Lessons List */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700">Доступные занятия</p>
                    
                    {filteredGroupLessons.length === 0 ? (
                      <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                        На выбранную дату нет плановых занятий этой группы. Попробуйте выбрать другой день в календаре.
                      </div>
                    ) : (
                      filteredGroupLessons.map((l) => {
                        const isChosen = selectedLesson?.id === l.id;
                        const isFull = l.availableSeats <= 0;

                        return (
                          <div
                            key={l.id}
                            onClick={() => {
                              if (!isFull) setSelectedLesson(l);
                            }}
                            className={cn(
                              'p-3.5 rounded-2xl border transition-all flex items-center justify-between',
                              isChosen
                                ? 'bg-blue-50/70 border-blue-500 shadow-xs'
                                : isFull
                                ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                                : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                            )}
                          >
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-900">{l.timeLabel}</p>
                              <p className="text-[10px] text-slate-500">{l.teacherName}</p>
                            </div>

                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  'text-[10px] font-bold px-2 py-0.5 rounded-md',
                                  l.seatBadgeType === 'available'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : l.seatBadgeType === 'few'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                                )}
                              >
                                {l.seatStatusLabel}
                              </span>

                              <div
                                className={cn(
                                  'w-4 h-4 rounded-full border flex items-center justify-center',
                                  isChosen
                                    ? 'border-blue-600 bg-blue-600 text-white'
                                    : 'border-slate-300 bg-white'
                                )}
                              >
                                {isChosen && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!selectedLesson}
                    onClick={() => setCurrentStep(6)}
                    className={cn(
                      'w-full py-3 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer',
                      selectedLesson
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    )}
                  >
                    Продолжить
                  </button>
                </div>
              )}

              {/* ============================================================== */}
              {/* SCREEN 6: Выбор ребенка                                        */}
              {/* ============================================================== */}
              {currentStep === 6 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Кого записать на занятие?</h2>
                    <p className="text-[11px] text-slate-400">Выберите ребёнка из вашего аккаунта</p>
                  </div>

                  <div className="space-y-2.5">
                    {childrenList.map((ch) => {
                      const isSelected = selectedChildId === ch.id;
                      return (
                        <div
                          key={ch.id}
                          onClick={() => setSelectedChildId(ch.id)}
                          className={cn(
                            'p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer',
                            isSelected
                              ? 'bg-blue-50/70 border-blue-500 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 font-bold text-slate-700 flex items-center justify-center text-xs">
                              {ch.firstName.charAt(0)}{ch.lastName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{ch.fullName}</p>
                              <p className="text-[10px] text-slate-400">{ch.age} лет {ch.grade ? `· ${ch.grade}` : ''}</p>
                            </div>
                          </div>

                          <div
                            className={cn(
                              'w-5 h-5 rounded-full border flex items-center justify-center transition-colors',
                              isSelected
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-300 bg-white'
                            )}
                          >
                            {isSelected && <CheckCircle2 size={14} className="text-white" />}
                          </div>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setShowAddChildModal(true)}
                      className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 bg-white text-slate-600 text-xs font-semibold hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={14} /> Добавить ребёнка
                    </button>
                    <p className="text-[10px] text-slate-400 text-center px-4">
                      Если ребенка нет в списке, обратитесь к администратору для привязки.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={!selectedChildId}
                    onClick={() => setCurrentStep(7)}
                    className={cn(
                      'w-full py-3 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer mt-4',
                      selectedChildId
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    )}
                  >
                    Продолжить
                  </button>
                </div>
              )}

              {/* ============================================================== */}
              {/* SCREEN 7: Подтверждение записи                                 */}
              {/* ============================================================== */}
              {currentStep === 7 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Проверьте данные</h2>
                    <p className="text-[11px] text-slate-400">Убедитесь в правильности деталей записи</p>
                  </div>

                  {bookingError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                      {bookingError}
                    </div>
                  )}

                  {/* Summary Card */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Calendar size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {bookingFormat === 'group'
                            ? selectedGroup?.name
                            : `Индивидуально: ${selectedDirection?.name}`}
                          {isTrial ? ' (🎯 Пробное)' : ''}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {bookingFormat === 'group'
                            ? selectedLesson?.dateFormatted || selectedLesson?.date
                            : indivDateFilter}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-2 space-y-1.5 text-[11px] text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Время:</span>
                        <span className="font-semibold text-slate-800">
                          {bookingFormat === 'group'
                            ? `${selectedLesson?.timeLabel} (75 мин)`
                            : `${selectedSlot?.label} (60 мин)`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Преподаватель:</span>
                        <span className="font-medium text-slate-800">
                          {bookingFormat === 'group' ? selectedLesson?.teacherName : selectedTeacher?.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Формат:</span>
                        <span className="font-medium text-slate-800 flex items-center gap-1">
                          <Video size={12} className="text-blue-500" /> Онлайн (Zoom)
                        </span>
                      </div>
                      {bookingFormat === 'group' && selectedLesson && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Свободно мест:</span>
                          <span className="font-bold text-emerald-600">
                            {selectedLesson.availableSeats} из {selectedLesson.maxCapacity}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Child Card */}
                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-white flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                      {selectedChild?.firstName?.charAt(0)}{selectedChild?.lastName?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{selectedChild?.fullName}</p>
                      <p className="text-[10px] text-slate-400">{selectedChild?.age} лет</p>
                    </div>
                  </div>

                  {/* Reminder Toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Отправить напоминание в Telegram</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        После записи вы получите подтверждение и ссылку на Zoom
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={sendTelegramReminder}
                      onChange={(e) => setSendTelegramReminder(e.target.checked)}
                      className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleConfirmBooking}
                    className="w-full py-3 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Бронирование...</span>
                      </>
                    ) : (
                      <span>Записаться на занятие</span>
                    )}
                  </button>
                </div>
              )}

              {/* ============================================================== */}
              {/* SCREEN 8: Успешная запись                                      */}
              {/* ============================================================== */}
              {currentStep === 8 && (
                <div className="space-y-5 py-4 text-center animate-in fade-in duration-300">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 size={36} />
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-slate-900">Вы записаны!</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedChild?.firstName || 'Ученик'} успешно добавлен на занятие
                    </p>
                  </div>

                  {/* Confirmed Lesson Details */}
                  {bookedLesson && (
                    <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/30 text-left space-y-2 text-xs">
                      <p className="font-bold text-slate-900">{bookedLesson.groupName || bookedLesson.courseName}</p>
                      <p className="text-[11px] text-slate-600">
                        📅 {bookedLesson.dateFormatted || bookedLesson.date} • {bookedLesson.startTime} – {bookedLesson.endTime}
                      </p>
                      <p className="text-[11px] text-slate-600">👤 {bookedLesson.teacherName}</p>
                      <p className="text-[11px] text-blue-600 flex items-center gap-1 font-medium">
                        <Video size={12} /> {bookedLesson.room || 'Онлайн (Zoom)'}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2.5 pt-2">
                    <button
                      type="button"
                      onClick={handleAddToCalendar}
                      className="w-full py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Calendar size={14} /> Добавить в календарь
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveBottomTab('lessons');
                          setCurrentStep(1);
                        }}
                        className="py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
                      >
                        Мои занятия
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        На главную
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-[11px] text-blue-800 text-center">
                    ℹ️ За час до начала занятия мы отправим вам напоминание в Telegram.
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* SCREEN 9: Индивидуальное занятие — Выбор преподавателя         */}
              {/* ============================================================== */}
              {currentStep === 9 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Выберите преподавателя</h2>
                    <div className="flex gap-2 border-b border-slate-100 pb-2 mt-2">
                      <span className="text-xs font-bold text-blue-600 border-b-2 border-blue-600 pb-1 cursor-pointer">
                        Доступные слоты
                      </span>
                      <span className="text-xs text-slate-400 pb-1 cursor-pointer">Все преподаватели</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {teachers.map((t) => (
                      <div
                        key={t.id}
                        onClick={async () => {
                          setSelectedTeacher(t);
                          const firstDate = availableDates[0]?.iso || '2026-10-15';
                          setIndivDateFilter(firstDate);
                          await loadSlotsForTeacher(t.id, firstDate);
                          setCurrentStep(10); // Go to Step 10: slots
                        }}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-sm shrink-0">
                            {t.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {t.name}
                            </p>
                            <p className="text-[10px] text-slate-400">{t.subject}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-amber-500 text-xs">★</span>
                              <span className="text-[10px] font-bold text-slate-700">{t.rating}</span>
                              <span className="text-[10px] text-slate-400">({t.reviewCount} отзывов)</span>
                            </div>
                          </div>
                        </div>

                        <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* SCREEN 10: Индивидуальное занятие — Доступные слоты            */}
              {/* ============================================================== */}
              {currentStep === 10 && selectedTeacher && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Selected Teacher Header */}
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                      {selectedTeacher.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{selectedTeacher.name}</p>
                      <p className="text-[10px] text-slate-400">{selectedTeacher.subject}</p>
                    </div>
                  </div>

                  {/* Horizontal Date Picker Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {availableDates.slice(0, 5).map((d) => {
                      const isSelected = indivDateFilter === d.iso;
                      return (
                        <button
                          key={d.iso}
                          type="button"
                          onClick={async () => {
                            setIndivDateFilter(d.iso);
                            await loadSlotsForTeacher(selectedTeacher.id, d.iso);
                          }}
                          className={cn(
                            'px-3 py-2 rounded-xl text-center shrink-0 border transition-all cursor-pointer',
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                          )}
                        >
                          <p className="text-[10px] uppercase font-bold tracking-wider opacity-80">{d.dayOfWeek}</p>
                          <p className="text-xs font-bold mt-0.5">{d.iso.split('-')[2]} {d.label.split(' ')[2]}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Slots List (60 min) */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700">Доступные слоты (60 мин)</p>

                    {teacherSlots.length === 0 ? (
                      <div className="p-6 text-center bg-slate-50 rounded-2xl text-xs text-slate-400">
                        Слоты загружаются...
                      </div>
                    ) : (
                      teacherSlots.map((s, idx) => {
                        const isSelected = selectedSlot?.startTime === s.startTime;
                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              if (s.isAvailable) setSelectedSlot(s);
                            }}
                            className={cn(
                              'p-3 rounded-xl border flex items-center justify-between transition-all',
                              isSelected
                                ? 'bg-blue-50/70 border-blue-500 shadow-xs'
                                : !s.isAvailable
                                ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                                : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                            )}
                          >
                            <span className="text-xs font-bold text-slate-800">{s.label}</span>
                            <span
                              className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded-md',
                                s.isAvailable
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              )}
                            >
                              {s.reason || (s.isAvailable ? 'Свободно' : 'Занято')}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!selectedSlot}
                    onClick={() => setCurrentStep(6)} // Go to choose child
                    className={cn(
                      'w-full py-3 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer',
                      selectedSlot
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    )}
                  >
                    Продолжить
                  </button>
                </div>
              )}

              {/* ============================================================== */}
              {/* SECONDARY TAB: МОИ ЗАНЯТИЯ                                     */}
              {/* ============================================================== */}
              {activeBottomTab === 'lessons' && currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Мои занятия</h2>
                      <p className="text-[10px] text-slate-400">Предстоящие уроки ваших детей</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveBottomTab('home')}
                      className="text-xs text-blue-600 font-semibold"
                    >
                      Назад
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {/* Sample of upcoming classes */}
                    <div className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                          Запланировано
                        </span>
                        <span className="text-[10px] text-slate-400">Пн, 5 окт • 18:00</span>
                      </div>
                      <p className="text-xs font-bold text-slate-900">German B1 · Основная группа</p>
                      <p className="text-[10px] text-slate-500">Ученик: {childrenList[0]?.fullName || 'Ученик'}</p>
                      <div className="pt-1">
                        <a
                          href="https://zoom.us/j/youeurope_school"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
                        >
                          <Video size={14} /> Подключиться к Zoom
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* SECONDARY TAB: ОПЛАТЫ                                          */}
              {/* ============================================================== */}
              {activeBottomTab === 'payments' && currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Оплаты и счета</h2>
                      <p className="text-[10px] text-slate-400">Баланс обучения и реквизиты школы</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveBottomTab('home')}
                      className="text-xs text-blue-600 font-semibold"
                    >
                      Назад
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white space-y-2 shadow-sm">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-blue-200">Остаток на депозите</p>
                    <p className="text-2xl font-bold tracking-tight">160.00 €</p>
                    <p className="text-[10px] text-blue-200">Достаточно на 8 занятий</p>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2 text-xs">
                    <p className="font-bold text-slate-900">Реквизиты для оплаты (SEPA / EUR):</p>
                    <div className="text-[11px] text-slate-600 space-y-1">
                      <p>Банк: Tatra banka, a.s.</p>
                      <p className="font-mono text-[10px] bg-slate-50 p-1.5 rounded border border-slate-100 select-all">
                        IBAN: SK89 1100 0000 0029 4829 4821
                      </p>
                      <p>Назначение: Оплата обучения {childrenList[0]?.fullName ? `(${childrenList[0].fullName})` : ''}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* Modal: Добавить ребёнка */}
        {showAddChildModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-900">Добавить ребёнка</h3>
                <button
                  type="button"
                  onClick={() => setShowAddChildModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <p>
                  Для привязки нового ребёнка к вашему профилю отправьте имя и дату рождения администратору в чате Telegram.
                </p>
                <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500">
                  Администратор свяжет карточку ученика с вашим Telegram Chat ID в течение 10 минут.
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAddChildModal(false);
                  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
                    (window as any).Telegram.WebApp.close();
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
              >
                Написать администратору
              </button>
            </div>
          </div>
        )}

        {/* Bottom Navigation Tabs */}
        <nav className="fixed bottom-0 max-w-[430px] w-full bg-white/95 backdrop-blur-xs border-t border-slate-200 px-6 py-2 flex items-center justify-between z-20">
          <button
            type="button"
            onClick={() => {
              setActiveBottomTab('home');
              setCurrentStep(1);
            }}
            className={cn(
              'flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors cursor-pointer',
              activeBottomTab === 'home' && currentStep === 1 ? 'text-blue-600 font-bold' : 'text-slate-400'
            )}
          >
            <Calendar size={18} />
            <span>Главная</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveBottomTab('lessons');
              setCurrentStep(1);
            }}
            className={cn(
              'flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors cursor-pointer',
              activeBottomTab === 'lessons' ? 'text-blue-600 font-bold' : 'text-slate-400'
            )}
          >
            <BookOpen size={18} />
            <span>Занятия</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveBottomTab('payments');
              setCurrentStep(1);
            }}
            className={cn(
              'flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors cursor-pointer',
              activeBottomTab === 'payments' ? 'text-blue-600 font-bold' : 'text-slate-400'
            )}
          >
            <CreditCard size={18} />
            <span>Оплаты</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveBottomTab('home');
              setCurrentStep(1);
            }}
            className="flex flex-col items-center gap-0.5 text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <User size={18} />
            <span>Профиль</span>
          </button>
        </nav>

      </div>
    </div>
  );
}
