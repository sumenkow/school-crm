'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Users,
  Database,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Layers,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ExcelMigrationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [fileLoaded, setFileLoaded] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Sample raw Excel data representing erratic legacy spreadsheet
  const sampleExcelRows = [
    { row: 1, rawStudent: 'Смирнов Иван', birth: '15.05.2010', rawParent: 'Смирнова Ольга', phone: '+7 (999) 123-45-67', rawCourse: 'Англ B1', group: 'Пн/Чт 18:45', pay: '7600 руб', status: 'Оплачено', note: 'Аллергия на орехи' },
    { row: 2, rawStudent: 'Смирнова Анна', birth: '02.11.2014', rawParent: 'Смирнова Ольга', phone: '+7 (999) 123-45-67', rawCourse: 'Kids English', group: 'Вт/Пт 15:00', pay: '7200', status: 'Оплачено', note: 'Младшая сестра Ивана' },
    { row: 3, rawStudent: 'Кузнецова Мария', birth: '22.08.2011', rawParent: 'Кузнецов Дмитрий', phone: '+7 (999) 234-56-78', rawCourse: 'Роботы', group: 'Ср/Сб 15:00', pay: '8400', status: 'Долг', note: 'Обещал перевести в пятницу' },
    { row: 4, rawStudent: 'Кузнецов Артем', birth: '10.03.2016', rawParent: 'Кузнецов Дмитрий', phone: '+7 (999) 234-56-78', rawCourse: 'Математика Kids', group: 'Чт 16:00', pay: '6800', status: 'Оплачено', note: 'Сын Дмитрия' },
    { row: 5, rawStudent: 'Попов Сергей', birth: '18.01.2010', rawParent: 'Попова Татьяна', phone: '+7 (999) 456-78-90', rawCourse: 'English Teens', group: 'Пн/Чт 18:45', pay: '7600', status: 'Оплачено', note: 'Хочет сдать ОГЭ' },
    { row: 6, rawStudent: 'Морозова Екатерина', birth: '04.09.2015', rawParent: 'Морозов Игорь', phone: '+7 (999) 567-89-01', rawCourse: 'Олимп. Математика', group: 'Чт 16:00', pay: '6800', status: 'Оплачено', note: 'Победитель олимпиады' },
  ];

  const handleLoadDemoData = () => {
    setFileName('Школа_База_Учеников_2026_Legacy.xlsx');
    setFileLoaded(true);
    setCurrentStep(2);
  };

  const handleApplyMigration = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setCurrentStep(4);
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/settings" className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Назад к настройкам
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Мастер миграции из Excel</span>
      </div>

      {/* Hero Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Импорт и дедупликация базы из Excel
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Интеллектуальный перенос плоской таблицы в нормализованную реляционную структуру (3NF) с автоматическим связыванием семей по номерам телефонов
        </p>
      </div>

      {/* Stepper Progress Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between">
          {[
            { num: 1, title: 'Загрузка файла' },
            { num: 2, title: 'Маппинг колонок (3NF)' },
            { num: 3, title: 'Дедупликация и предпросмотр' },
            { num: 4, title: 'Завершение' },
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all',
                  currentStep === s.num && 'bg-blue-600 text-white shadow-xs',
                  currentStep > s.num && 'bg-emerald-100 text-emerald-800',
                  currentStep < s.num && 'bg-slate-100 text-slate-400'
                )}
              >
                {currentStep > s.num ? '✓' : s.num}
              </div>
              <span className={cn('text-xs font-semibold hidden sm:inline', currentStep === s.num ? 'text-slate-900' : 'text-slate-400')}>
                {s.title}
              </span>
              {s.num < 4 && <div className="h-px w-8 sm:w-16 bg-slate-200 mx-2" />}
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: UPLOAD EXCEL */}
      {currentStep === 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs text-center space-y-6">
          <div className="max-w-md mx-auto space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <FileSpreadsheet className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Загрузите историческую таблицу школы</h2>
            <p className="text-xs text-slate-500">
              Поддерживаются форматы <strong>.xlsx</strong>, <strong>.xls</strong> и <strong>.csv</strong>. Система автоматически распознает названия колонок и подготовит схему нормализации.
            </p>
          </div>

          <div className="max-w-md mx-auto border-2 border-dashed border-slate-200 rounded-2xl p-8 hover:border-blue-400 transition-colors cursor-pointer bg-slate-50/50">
            <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
            <p className="text-xs font-semibold text-slate-700">Перетащите Excel файл сюда или нажмите для выбора</p>
            <p className="text-[11px] text-slate-400 mt-1">До 50 МБ</p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleLoadDemoData}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-98"
            >
              <Sparkles className="h-4 w-4" />
              Загрузить демонстрационную таблицу Excel школы →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: COLUMN MAPPING */}
      {currentStep === 2 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Шаг 2: Маппинг колонок в реляционную модель 3NF
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Файл: <strong>{fileName}</strong> (распознано 6 строк данных)
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              100% колонок сопоставлено
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="py-3 pl-4 pr-3">Колонка в Excel</th>
                  <th className="px-3 py-3">Пример из файла</th>
                  <th className="px-3 py-3">Целевая сущность 3NF</th>
                  <th className="py-3 pl-3 pr-4">Поле в базе данных</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {[
                  { col: 'ФИО ребенка', example: 'Смирнов Иван', entity: 'Students', field: 'first_name, last_name' },
                  { col: 'Дата рождения', example: '15.05.2010', entity: 'Students', field: 'birth_date (ISO date)' },
                  { col: 'ФИО родителя', example: 'Смирнова Ольга', entity: 'Parents', field: 'first_name, last_name' },
                  { col: 'Телефон родителя', example: '+7 (999) 123-45-67', entity: 'Parents (Ключ семьи)', field: 'phone (Unique index)' },
                  { col: 'Курс / Направление', example: 'Англ B1', entity: 'Courses', field: 'course_id (Стандартизация)' },
                  { col: 'Группа', example: 'Пн/Чт 18:45', entity: 'Groups + Enrollments', field: 'group_id, enrolled_at' },
                  { col: 'Оплата за месяц', example: '7600 руб', entity: 'Payments', field: 'amount (integer), currency' },
                  { col: 'Статус оплаты', example: 'Оплачено', entity: 'Payments', field: 'status (paid / overdue)' },
                  { col: 'Примечания', example: 'Аллергия на орехи', entity: 'Timeline & Notes', field: 'student_notes, interactions' },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    <td className="py-2.5 pl-4 pr-3 font-bold text-slate-900">{row.col}</td>
                    <td className="px-3 py-2.5 text-slate-500 font-mono text-[11px]">{row.example}</td>
                    <td className="px-3 py-2.5">
                      <span className="rounded bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 border border-blue-200 text-[10px]">
                        {row.entity}
                      </span>
                    </td>
                    <td className="py-2.5 pl-3 pr-4 text-emerald-700 font-medium">{row.field}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              onClick={() => setCurrentStep(1)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              ← Назад к загрузке
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              Перейти к анализу дубликатов <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DEDUPLICATION & PRE-IMPORT REVIEW */}
      {currentStep === 3 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              Шаг 3: Дедупликация и отчет готовности к импорту
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Система проанализировала все строки и выявила повторяющиеся контакты для объединения в семейные карточки без дубликатов
            </p>
          </div>

          {/* Deduplication highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <span className="text-xs text-slate-500 font-medium">Строк в Excel:</span>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">6 строк</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
              <span className="text-xs text-blue-700 font-medium">Новых учеников:</span>
              <p className="text-2xl font-extrabold text-blue-700 mt-1">6 человек</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <span className="text-xs text-emerald-700 font-medium">Родителей (Дедуплицировано):</span>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">4 родителя</p>
              <p className="text-[10px] text-emerald-600 font-bold mt-0.5">2 дубликата устранены</p>
            </div>
            <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4">
              <span className="text-xs text-purple-700 font-medium">Связей в семьях (M:N):</span>
              <p className="text-2xl font-extrabold text-purple-700 mt-1">2 семьи с 2 детьми</p>
            </div>
          </div>

          {/* Detected Families breakdown */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Автоматически объединенные семьи (Предотвращение дублирования контактов):</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="rounded-lg bg-white p-3 border border-emerald-100 shadow-xs">
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span>Семья Смирновых (Родитель: Ольга Смирнова, тел: +7 999 123-45-67)</span>
                  <span className="text-emerald-700 font-bold text-[11px]">1 родитель → 2 детей</span>
                </div>
                <div className="mt-1 text-slate-600 pl-3 border-l-2 border-emerald-300">
                  <p>• Ребенок 1: Иван (Английский B1 Teens)</p>
                  <p>• Ребенок 2: Анна (Kids English A1)</p>
                </div>
              </div>

              <div className="rounded-lg bg-white p-3 border border-emerald-100 shadow-xs">
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span>Семья Кузнецовых (Родитель: Дмитрий Кузнецов, тел: +7 999 234-56-78)</span>
                  <span className="text-emerald-700 font-bold text-[11px]">1 родитель → 2 детей</span>
                </div>
                <div className="mt-1 text-slate-600 pl-3 border-l-2 border-emerald-300">
                  <p>• Ребенок 1: Мария (Робототехника Junior)</p>
                  <p>• Ребенок 2: Артем (Kids Math Safari)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              ← Назад к маппингу
            </button>
            <button
              onClick={handleApplyMigration}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all active:scale-98 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Применение миграции в базу...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Подтвердить и применить импорт в 3NF-базу
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS */}
      {currentStep === 4 && (
        <div className="rounded-2xl border border-emerald-200 bg-white p-10 shadow-xs text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900">
              Миграция данных успешно завершена!
            </h2>
            <p className="text-xs text-slate-600">
              Все 6 учеников и 4 дедуплицированных родителя записаны в PostgreSQL 3NF. Сформированы семейные связи, учебные группы и финансовые транзакции.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/students"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              <Users className="h-4 w-4" />
              Перейти к списку учеников
            </Link>
            <Link
              href="/parents"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              Открыть карточки родителей
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              Главный дашборд школы →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
