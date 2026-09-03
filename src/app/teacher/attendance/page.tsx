'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertTriangle,
  Users,
  Download,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { INITIAL_GROUPS } from '@/lib/data/mockData';

export default function TeacherAttendanceJournalPage() {
  const [selectedGroupId, setSelectedGroupId] = useState('1');

  const group = INITIAL_GROUPS.find((g) => g.id === selectedGroupId) || INITIAL_GROUPS[0];

  // Dates of lessons for this group in September
  const lessonDates = [
    { date: '01.09', day: 'Пн', isCompleted: true },
    { date: '04.09', day: 'Чт', isCompleted: true },
    { date: '08.09', day: 'Пн', isCompleted: false },
    { date: '11.09', day: 'Чт', isCompleted: false },
    { date: '15.09', day: 'Пн', isCompleted: false },
    { date: '18.09', day: 'Чт', isCompleted: false },
    { date: '22.09', day: 'Пн', isCompleted: false },
    { date: '25.09', day: 'Чт', isCompleted: false },
  ];

  // Attendance matrix data
  const matrixData = [
    {
      studentId: '1',
      studentName: 'Иван Смирнов',
      records: ['present', 'present', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending'],
      rate: '100%',
      consecutiveAbsences: 0,
    },
    {
      studentId: '4',
      studentName: 'Сергей Попов',
      records: ['present', 'rescheduled', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending'],
      rate: '100%',
      consecutiveAbsences: 0,
    },
    {
      studentId: 's5',
      studentName: 'Алина Белова',
      records: ['present', 'present', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending'],
      rate: '100%',
      consecutiveAbsences: 0,
    },
    {
      studentId: 's6',
      studentName: 'Максим Захаров',
      records: ['absent', 'absent', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending'],
      rate: '0%',
      consecutiveAbsences: 2,
    },
    {
      studentId: 's7',
      studentName: 'Полина Григорьева',
      records: ['present', 'present', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending'],
      rate: '100%',
      consecutiveAbsences: 0,
    },
    {
      studentId: 's8',
      studentName: 'Егор Романов',
      records: ['present', 'absent', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending'],
      rate: '50%',
      consecutiveAbsences: 1,
    },
    {
      studentId: 's9',
      studentName: 'София Федорова',
      records: ['present', 'present', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending'],
      rate: '100%',
      consecutiveAbsences: 0,
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/teacher" className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Назад в кабинет преподавателя
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Сводный табель посещаемости</span>
      </div>

      {/* Header & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Журнал посещаемости группы
          </h1>
          <p className="text-sm text-slate-500">
            Электронная ведомость посещений занятий на Сентябрь 2026
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-xs text-xs">
            <span className="text-slate-500 font-medium">Группа:</span>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="font-bold text-slate-900 focus:outline-none bg-transparent"
            >
              {INITIAL_GROUPS.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Alert if student has consecutive absences */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900">
          <p className="font-bold">Анализ посещаемости: выявлен риск оттока</p>
          <p className="mt-0.5 text-amber-800">
            Ученик <strong>Максим Захаров</strong> пропустил 2 занятия подряд (01.09 и 04.09). При следующем пропуске система автоматически сформирует срочную задачу для менеджера на проверку причины отсутствия.
          </p>
        </div>
      </div>

      {/* Attendance Matrix Table (Табель) */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/90 font-semibold text-slate-600">
              <tr>
                <th className="py-3.5 pl-4 pr-3 sticky left-0 bg-slate-50/95 z-10 min-w-[200px]">Ученик</th>
                {lessonDates.map((ld, i) => (
                  <th key={i} className="px-2.5 py-3 text-center min-w-[55px]">
                    <div className="font-bold text-slate-800">{ld.date}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{ld.day}</div>
                  </th>
                ))}
                <th className="px-4 py-3.5 text-center font-bold text-slate-900 min-w-[90px]">
                  Посещаемость
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {matrixData.map((row) => (
                <tr key={row.studentId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 pl-4 pr-3 font-semibold text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-100">
                    <div className="flex items-center justify-between pr-2">
                      <Link href={`/students/${row.studentId}`} className="hover:text-blue-600">
                        {row.studentName}
                      </Link>
                      {row.consecutiveAbsences >= 2 && (
                        <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">
                          {row.consecutiveAbsences} проп.
                        </span>
                      )}
                    </div>
                  </td>

                  {row.records.map((rec, idx) => (
                    <td key={idx} className="px-2.5 py-3 text-center">
                      {rec === 'present' && (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 font-bold text-emerald-800 text-xs">
                          ✓
                        </span>
                      )}
                      {rec === 'absent' && (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-rose-100 font-bold text-rose-800 text-xs">
                          ✗
                        </span>
                      )}
                      {rec === 'rescheduled' && (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 font-bold text-amber-800 text-[11px]">
                          П
                        </span>
                      )}
                      {rec === 'pending' && (
                        <span className="text-slate-300 font-medium">—</span>
                      )}
                    </td>
                  ))}

                  <td className="px-4 py-3 text-center font-bold">
                    <span className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs',
                      parseInt(row.rate) >= 80 ? 'text-emerald-700 bg-emerald-50' : parseInt(row.rate) >= 50 ? 'text-amber-700 bg-amber-50' : 'text-rose-700 bg-rose-50'
                    )}>
                      {row.rate}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="border-t border-slate-100 bg-slate-50 p-4 flex flex-wrap items-center gap-6 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Обозначения:</span>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-100 font-bold text-emerald-800 text-[11px]">✓</span>
            <span>Присутствовал</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-rose-100 font-bold text-rose-800 text-[11px]">✗</span>
            <span>Отсутствовал</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-amber-100 font-bold text-amber-800 text-[11px]">П</span>
            <span>Перенос / Заморозка</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-300 font-bold">—</span>
            <span>Занятие ещё не состоялось</span>
          </div>
        </div>
      </div>
    </div>
  );
}
