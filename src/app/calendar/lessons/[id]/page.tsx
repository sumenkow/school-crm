'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { INITIAL_LESSONS, FullLessonData } from '@/lib/data/mockData';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Save,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LessonDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.id as string;

  const [lesson, setLesson] = useState<FullLessonData>(() => {
    return INITIAL_LESSONS.find((l) => l.id === lessonId) || INITIAL_LESSONS[0];
  });

  const [copied, setCopied] = useState(false);
  const [topic, setTopic] = useState(lesson.topic);
  const [homework, setHomework] = useState(lesson.homework || '');
  const [status, setStatus] = useState(lesson.status);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleCopyMeetingUrl = () => {
    if (lesson.onlineMeetingUrl) {
      navigator.clipboard.writeText(lesson.onlineMeetingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setLesson((prev) => ({
      ...prev,
      topic,
      homework,
      status,
    }));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const toggleStudentStatus = (studentId: string, newStatus: 'present' | 'absent') => {
    setLesson((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === studentId ? { ...s, attendanceStatus: s.attendanceStatus === newStatus ? 'not_marked' : newStatus } : s
      ),
    }));
  };

  const presentCount = lesson.students.filter((s) => s.attendanceStatus === 'present').length;
  const absentCount = lesson.students.filter((s) => s.attendanceStatus === 'absent').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/calendar" className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Назад к календарю
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">{lesson.groupName} • {lesson.dateFormatted}</span>
      </div>

      {/* Hero Lesson Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                {lesson.courseName}
              </span>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] font-bold border',
                  status === 'completed' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  status === 'scheduled' && 'bg-blue-50 text-blue-700 border-blue-200',
                  status === 'cancelled' && 'bg-rose-50 text-rose-700 border-rose-200',
                  status === 'rescheduled' && 'bg-amber-50 text-amber-700 border-amber-200'
                )}
              >
                {status === 'completed' && 'Завершено'}
                {status === 'scheduled' && 'Запланировано'}
                {status === 'cancelled' && 'Отменено'}
                {status === 'rescheduled' && 'Перенесено'}
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              {lesson.groupName}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5 font-bold text-slate-800">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                {lesson.dateFormatted} ({lesson.startTime} – {lesson.endTime})
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {lesson.room}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                Преподаватель: <Link href={`/teachers`} className="font-semibold text-blue-600 hover:underline">{lesson.teacherName}</Link>
              </span>
            </div>
          </div>

          {/* Quick status selector */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-medium">
              {(['scheduled', 'completed', 'rescheduled', 'cancelled'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={cn(
                    'rounded-md px-2.5 py-1 transition-all capitalize',
                    status === s ? 'bg-white shadow-xs font-bold text-slate-900' : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  {s === 'scheduled' && 'План'}
                  {s === 'completed' && 'Проведён'}
                  {s === 'rescheduled' && 'Перенос'}
                  {s === 'cancelled' && 'Отмена'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Online URL Box */}
        {lesson.onlineMeetingUrl && (
          <div className="mt-5 flex items-center justify-between rounded-xl bg-indigo-50/70 p-3.5 border border-indigo-100 text-xs">
            <div className="flex items-center gap-2 text-indigo-900 font-medium">
              <Video className="h-4 w-4 text-indigo-600" />
              <span>Ссылка на онлайн-занятие: <strong className="font-mono">{lesson.onlineMeetingUrl}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyMeetingUrl}
                className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 font-semibold text-indigo-700 border border-indigo-200 shadow-xs hover:bg-indigo-50"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Скопировано' : 'Копировать'}
              </button>
              <a
                href={lesson.onlineMeetingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 font-semibold text-white shadow-xs hover:bg-indigo-700"
              >
                Подключиться <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Lesson Details Form (Topic & Homework) */}
      <form onSubmit={handleSaveDetails} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-600" />
            Учебный план и домашнее задание
          </h2>
          {savedSuccess && (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 animate-fade-in">
              <CheckCircle2 className="h-3.5 w-3.5" /> Сохранено!
            </span>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700">Тема занятия</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Например: Unit 4. Past Simple vs Present Perfect..."
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700">Домашнее задание</label>
          <textarea
            rows={2}
            value={homework}
            onChange={(e) => setHomework(e.target.value)}
            placeholder="Что задано ученикам на следующий урок..."
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
          >
            <Save className="h-3.5 w-3.5" />
            Сохранить тему и статус
          </button>
        </div>
      </form>

      {/* Attendance Section of the Lesson (Section 11 Principle) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Посещаемость занятия</h2>
            <p className="text-xs text-slate-500">
              Присутствовало: <strong className="text-emerald-600">{presentCount}</strong> • Отсутствовало: <strong className="text-rose-600">{absentCount}</strong> из {lesson.students.length}
            </p>
          </div>
          <Link
            href="/teacher"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Мобильный вид для преподавателя →
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {lesson.students.map((student) => (
            <div key={student.id} className="py-3 flex items-center justify-between">
              <div>
                <Link href={`/students/${student.id}`} className="font-bold text-slate-900 text-xs hover:text-blue-600">
                  {student.name}
                </Link>
                {student.notes && (
                  <p className="text-[11px] text-slate-500 mt-0.5">{student.notes}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleStudentStatus(student.id, 'present')}
                  className={cn(
                    'flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                    student.attendanceStatus === 'present'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                  )}
                >
                  <Check className="h-3 w-3" />
                  Присутствовал
                </button>

                <button
                  type="button"
                  onClick={() => toggleStudentStatus(student.id, 'absent')}
                  className={cn(
                    'flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                    student.attendanceStatus === 'absent'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                  )}
                >
                  <XCircle className="h-3 w-3" />
                  Отсутствовал
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
