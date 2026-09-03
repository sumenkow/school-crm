'use client';

import React, { useState } from 'react';
import { Calendar, Clock, Check, X, AlertCircle, CheckCircle2, ChevronRight, MessageSquare, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudentAttendanceItem {
  id: string;
  name: string;
  status: 'present' | 'absent' | 'not_marked';
  note?: string;
}

export default function TeacherMobileDashboard() {
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>('1');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Teacher's lessons today & upcoming
  const myLessons = [
    {
      id: '1',
      groupName: 'English B1 Teens',
      course: 'Английский язык',
      time: '18:45 – 20:15',
      room: 'Аудитория 204',
      dateLabel: 'Сегодня',
      isToday: true,
      studentsCount: 4,
      attendanceMarked: false,
    },
    {
      id: '2',
      groupName: 'Kids English A1',
      course: 'Английский язык',
      time: '15:00 – 16:30',
      room: 'Аудитория 102',
      dateLabel: 'Пятница, 5 сентября',
      isToday: false,
      studentsCount: 6,
      attendanceMarked: false,
    },
  ];

  // Students for the active lesson (zero IDs exposed to the teacher)
  const [studentsList, setStudentsList] = useState<StudentAttendanceItem[]>([
    { id: 's1', name: 'Иван Смирнов', status: 'present' },
    { id: 's2', name: 'Мария Кузнецова', status: 'present' },
    { id: 's3', name: 'Анна Васильева', status: 'absent', note: 'Предупредила, что заболела' },
    { id: 's4', name: 'Сергей Попов', status: 'present' },
  ]);

  const [lessonTopic, setLessonTopic] = useState('Present Perfect vs Past Simple (Unit 4)');

  const toggleStatus = (studentId: string, newStatus: 'present' | 'absent') => {
    setStudentsList((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: s.status === newStatus ? 'not_marked' : newStatus } : s))
    );
    setSaveSuccess(false);
  };

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const currentLesson = myLessons.find((l) => l.id === selectedLessonId);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Teacher Welcome Header */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">
          Кабинет преподавателя
        </span>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight">Здравствуйте, Мария!</h1>
        <p className="mt-1 text-xs text-blue-100">
          Сегодня у вас 1 занятие • Ближайшее в 18:45
        </p>
      </div>

      {/* Lesson Selector Pills */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Мои ближайшие занятия:
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {myLessons.map((lesson) => {
            const isSelected = lesson.id === selectedLessonId;

            return (
              <button
                key={lesson.id}
                onClick={() => setSelectedLessonId(lesson.id)}
                className={cn(
                  'rounded-xl border p-3.5 text-left transition-all shadow-xs',
                  isSelected
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                )}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className={cn('font-bold', lesson.isToday ? 'text-blue-600' : 'text-slate-500')}>
                    {lesson.dateLabel}
                  </span>
                  <span className="text-[11px] text-slate-500">{lesson.room}</span>
                </div>
                <h3 className="mt-1 font-bold text-slate-900 text-sm">{lesson.groupName}</h3>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2">
                  <span className="font-semibold flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-400" />
                    {lesson.time}
                  </span>
                  <span className="text-[11px] text-slate-500">{lesson.studentsCount} уч.</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ATTENDANCE INTERFACE (CORE UX SECTION 11) */}
      {currentLesson && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {/* Card Header with context */}
          <div className="border-b border-slate-100 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-blue-600">Журнал занятия</span>
                <h2 className="text-base font-extrabold text-slate-900">{currentLesson.groupName}</h2>
              </div>
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                {currentLesson.time}
              </span>
            </div>

            {/* Topic of the lesson */}
            <div className="mt-3">
              <label className="text-[11px] font-semibold text-slate-600">Тема урока:</label>
              <input
                type="text"
                value={lessonTopic}
                onChange={(e) => setLessonTopic(e.target.value)}
                placeholder="Введите тему занятия..."
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Student list with 1-click toggles */}
          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pb-1">
              <span>Список учеников:</span>
              <span>Отметка</span>
            </div>

            {studentsList.map((student) => (
              <div
                key={student.id}
                className={cn(
                  'flex items-center justify-between rounded-xl border p-3 transition-all',
                  student.status === 'present' && 'border-emerald-200 bg-emerald-50/40',
                  student.status === 'absent' && 'border-rose-200 bg-rose-50/40',
                  student.status === 'not_marked' && 'border-slate-200 bg-white'
                )}
              >
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{student.name}</h4>
                  {student.note && (
                    <p className="text-[11px] text-rose-600 mt-0.5">{student.note}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleStatus(student.id, 'present')}
                    className={cn(
                      'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
                      student.status === 'present'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700'
                    )}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Был
                  </button>

                  <button
                    onClick={() => toggleStatus(student.id, 'absent')}
                    className={cn(
                      'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
                      student.status === 'absent'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-700'
                    )}
                  >
                    <X className="h-3.5 w-3.5" />
                    Н/Б
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Save Button */}
          <div className="border-t border-slate-100 bg-slate-50/50 p-4 flex items-center justify-between">
            <div>
              {saveSuccess && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 animate-fade-in">
                  <CheckCircle2 className="h-4 w-4" /> Посещаемость сохранена!
                </span>
              )}
            </div>
            <button
              onClick={handleSave}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 active:scale-98 transition-all"
            >
              <Check className="h-4 w-4" />
              Сохранить посещаемость
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
