'use client';

import React from 'react';
import Link from 'next/link';
import { Settings, Shield, School, BookOpen, Users, Database, FileSpreadsheet, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Настройки школы</h1>
        <p className="text-sm text-slate-500">
          Параметры организации, миграция данных, курсы и права доступа сотрудников
        </p>
      </div>

      {/* SPECIAL FEATURE BANNER: EXCEL MIGRATION TOOL (Section 17) */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 via-teal-50/60 to-emerald-50/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shrink-0 shadow-sm">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Раздел 17 ТЗ
              </span>
              <span className="text-xs text-emerald-800 font-semibold">3NF Дедупликация</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              Импорт и миграция базы из Excel
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-xl">
              Интеллектуальный перенос плоской таблицы Excel в нормализованную PostgreSQL базу. Автоматическое объединение детей одной семьи по телефону родителя без дублирования.
            </p>
          </div>
        </div>

        <Link
          href="/settings/import"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all shrink-0 active:scale-98"
        >
          Запустить мастер импорта
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
              <School className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Профиль школы</h3>
              <p className="text-xs text-slate-500">Название, реквизиты, филиалы</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-600">
            Филиал: <strong>Центральный</strong> (3 аудитории, 1 IT-лаборатория)
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Курсы и направления</h3>
              <p className="text-xs text-slate-500">Предметы, программы и цены</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-600">
            Активных направлений: <strong>4 курса</strong> (English, Robotics, Math)
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-50 p-2.5 text-purple-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Роли и безопасность</h3>
              <p className="text-xs text-slate-500">Row Level Security и доступы</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-600">
            Конфигурация: <strong>Owner, Admin, Teacher</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
