'use client';

import React from 'react';
import { Settings, Shield, School, BookOpen, Users, Database } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Настройки школы</h1>
        <p className="text-sm text-slate-500">
          Параметры организации, учебные курсы, аудитории и права доступа сотрудников
        </p>
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
