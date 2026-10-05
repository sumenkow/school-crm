'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Users,
  Database,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Layers,
  HelpCircle,
  Clock,
  ExternalLink,
  ShieldAlert,
  Check,
  FileCheck,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PreviewRow {
  row: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  type: 'Ученик' | 'Родитель';
  status: 'Новый' | 'Обновление' | 'Дубликат';
  course?: string;
  notes?: string;
}

interface ImportHistoryItem {
  id: string;
  fileName: string;
  date: string;
  recordsCount: number;
  status: 'Успешно' | 'С предупреждениями';
}

const DEFAULT_IMPORT_HISTORY: ImportHistoryItem[] = [
  {
    id: 'h1',
    fileName: 'Школа_База_Учеников_2026.xlsx',
    date: '05.10.2026, 11:20',
    recordsCount: 6,
    status: 'Успешно',
  },
  {
    id: 'h2',
    fileName: 'Сентябрь_Лиды_Kids.xlsx',
    date: '28.09.2026, 16:45',
    recordsCount: 14,
    status: 'Успешно',
  },
  {
    id: 'h3',
    fileName: 'Архив_Лето_2026.csv',
    date: '15.08.2026, 09:15',
    recordsCount: 8,
    status: 'Успешно',
  },
];

const INITIAL_PREVIEW_ROWS: PreviewRow[] = [
  { row: 1, firstName: 'Иван', lastName: 'Смирнов', email: 'ivan.smirnov@mail.com', phone: '+7 (999) 123-45-67', type: 'Ученик', status: 'Новый', course: 'Английский B1 Teens', notes: 'Цель — сдать B2' },
  { row: 2, firstName: 'Анна', lastName: 'Смирнова', email: 'anna.smirnova@mail.com', phone: '+7 (999) 123-45-67', type: 'Ученик', status: 'Новый', course: 'Kids English A1', notes: 'Младшая сестра Ивана' },
  { row: 3, firstName: 'Ольга', lastName: 'Смирнова', email: 'olga.smirnova@mail.com', phone: '+7 (999) 123-45-67', type: 'Родитель', status: 'Обновление', notes: 'Мама Ивана и Анны' },
  { row: 4, firstName: 'Мария', lastName: 'Кузнецова', email: 'maria.kuz@mail.com', phone: '+7 (999) 234-56-78', type: 'Ученик', status: 'Новый', course: 'Робототехника Junior', notes: 'Олимпиадная группа' },
  { row: 5, firstName: 'Артем', lastName: 'Кузнецов', email: 'artem.kuz@mail.com', phone: '+7 (999) 234-56-78', type: 'Ученик', status: 'Новый', course: 'Kids Math Safari', notes: 'Сын Дмитрия' },
  { row: 6, firstName: 'Дмитрий', lastName: 'Кузнецов', email: 'dmitry.kuz@mail.com', phone: '+7 (999) 234-56-78', type: 'Родитель', status: 'Дубликат', notes: 'Контакт уже зарегистрирован в базе' },
];

export default function ExcelImportPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [fileLoaded, setFileLoaded] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [previewRows, setPreviewRows] = useState<PreviewRow[]>(INITIAL_PREVIEW_ROWS);
  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>(DEFAULT_IMPORT_HISTORY);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedHistory = localStorage.getItem('crm_import_history');
      if (savedHistory) {
        try {
          const parsed = JSON.parse(savedHistory);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setImportHistory(parsed);
          }
        } catch {}
      }
    }
  }, []);

  const handleDownloadTemplate = () => {
    const headers = [
      'ФИО ребенка',
      'Дата рождения',
      'ФИО родителя',
      'Телефон родителя',
      'Курс / Направление',
      'Группа',
      'Оплата за месяц',
      'Статус оплаты',
      'Примечания',
    ];

    const sampleRows = [
      ['Смирнов Иван', '15.05.2010', 'Смирнова Ольга', '+7 (999) 123-45-67', 'Английский B1 Teens', 'Пн/Чт 18:45', '120 €', 'Оплачено', 'Цель — сдать B2'],
      ['Смирнова Анна', '02.11.2014', 'Смирнова Ольга', '+7 (999) 123-45-67', 'Kids English A1', 'Вт/Пт 15:00', '110 €', 'Оплачено', 'Младшая сестра Ивана'],
      ['Кузнецова Мария', '22.08.2011', 'Кузнецов Дмитрий', '+7 (999) 234-56-78', 'Робототехника Junior', 'Ср/Сб 15:00', '140 €', 'Долг', 'Обещал перевести в пятницу'],
    ];

    const csvContent = '\uFEFF' + [
      headers.join(';'),
      ...sampleRows.map((r) => r.join(';')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'shablon_uchebnoi_bazy_shkoly.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setFileLoaded(true);
      setCurrentStep(2);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFileName(file.name);
      setFileLoaded(true);
      setCurrentStep(2);
    }
  };

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

      // Record in import history
      const nowStr = new Date().toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const newEntry: ImportHistoryItem = {
        id: `h_${Date.now()}`,
        fileName: fileName || 'Импорт_Данных.xlsx',
        date: nowStr,
        recordsCount: previewRows.length,
        status: 'Успешно',
      };
      const updatedHistory = [newEntry, ...importHistory];
      setImportHistory(updatedHistory);
      localStorage.setItem('crm_import_history', JSON.stringify(updatedHistory));

      // Record backup time
      localStorage.setItem('school_crm_last_backup_time', nowStr);
    }, 1500);
  };

  const countNew = previewRows.filter((r) => r.status === 'Новый').length;
  const countUpdate = previewRows.filter((r) => r.status === 'Обновление').length;
  const countDuplicate = previewRows.filter((r) => r.status === 'Дубликат').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/settings" className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Настройки школы
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Импорт Excel</span>
      </div>

      {/* 2. Hero Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Импорт базы данных из Excel
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Мастер миграции плоской таблицы в реляционную структуру CRM с автоматической дедупликацией учеников и родителей
        </p>
      </div>

      {/* 3. 4-Step Wizard Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between">
          {[
            { num: 1, title: 'Загрузка файла' },
            { num: 2, title: 'Соответствие полей' },
            { num: 3, title: 'Проверка данных' },
            { num: 4, title: 'Импорт' },
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
                {s.num}. {s.title}
              </span>
              {s.num < 4 && <div className="h-px w-8 sm:w-16 bg-slate-200 mx-2" />}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Desktop 2-Column Grid: Left Main (8 cols) + Right Sidebars (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Main Panel */}
        <div className="lg:col-span-8 space-y-6">
          {/* STEP 1: UPLOAD FILE */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs text-center space-y-6">
                <div className="max-w-md mx-auto space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <FileSpreadsheet className="h-7 w-7" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Загрузите таблицу школы
                  </h2>
                  <p className="text-xs text-slate-500">
                    Поддерживаются файлы Excel и CSV. Система автоматически распознает столбцы и сопоставит контакты.
                  </p>
                </div>

                {/* Dropzone with real file picker & drag/drop */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`max-w-xl mx-auto border-2 border-dashed rounded-2xl p-8 transition-colors cursor-pointer relative ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-slate-300 hover:border-blue-400 bg-slate-50/50'
                  }`}
                >
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Выберите Excel-файл для импорта"
                  />
                  <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                  <p className="text-xs font-semibold text-slate-800">
                    Выберите Excel-файл для импорта (.xlsx, .xls до 10 МБ)
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    или перетащите файл в эту область
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-98 cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    Скачать шаблон Excel
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadDemoData}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-blue-600 transition-all active:scale-98 cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    Загрузить демонстрационную таблицу школы →
                  </button>
                </div>
              </div>

              {/* Requirements & What can be imported Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2.5">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-emerald-600" />
                    Требования к файлу
                  </h3>
                  <ul className="text-[11px] text-slate-600 space-y-1.5 list-disc list-inside">
                    <li>Форматы файлов: <strong>.xlsx</strong>, <strong>.xls</strong> или <strong>.csv</strong></li>
                    <li>Максимальный размер: <strong>до 10 МБ</strong></li>
                    <li>Первая строка файла должна содержать заголовки колонок</li>
                    <li>Кодировка текстовых данных: <strong>UTF-8</strong></li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2.5">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    Что можно импортировать
                  </h3>
                  <ul className="text-[11px] text-slate-600 space-y-1.5 list-disc list-inside">
                    <li>Ученики: ФИО, дата рождения, заметки</li>
                    <li>Родители: ФИО, телефон (ключ объединения семьи)</li>
                    <li>Курсы и группы: выбор направления и графика</li>
                    <li>Платежи: суммы в EUR, статус (оплачено / долг)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING */}
          {currentStep === 2 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Шаг 2: Соответствие полей
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Файл: <strong>{fileName || 'Школа_База_Учеников_2026_Legacy.xlsx'}</strong> (распознано 6 строк данных)
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
                      <th className="px-3 py-3">Целевое поле CRM</th>
                      <th className="py-3 pl-3 pr-4">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {[
                      { col: 'ФИО ребенка', example: 'Смирнов Иван', field: 'students.first_name, last_name' },
                      { col: 'Дата рождения', example: '15.05.2010', field: 'students.birth_date' },
                      { col: 'ФИО родителя', example: 'Смирнова Ольга', field: 'parents.first_name, last_name' },
                      { col: 'Телефон родителя', example: '+7 (999) 123-45-67', field: 'parents.phone (Ключ семьи)' },
                      { col: 'Курс / Направление', example: 'Английский B1 Teens', field: 'courses.course_id' },
                      { col: 'Группа', example: 'Пн/Чт 18:45', field: 'groups.group_id' },
                      { col: 'Оплата за месяц', example: '120 €', field: 'payments.amount (EUR)' },
                      { col: 'Статус оплаты', example: 'Оплачено', field: 'payments.status (paid)' },
                      { col: 'Примечания', example: 'Цель — сдать B2', field: 'interactions.notes' },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2.5 pl-4 pr-3 font-bold text-slate-900">{row.col}</td>
                        <td className="px-3 py-2.5 text-slate-500 font-mono text-[11px]">{row.example}</td>
                        <td className="px-3 py-2.5 text-blue-700 font-medium">
                          <span className="rounded bg-blue-50 px-2 py-0.5 border border-blue-200 text-[10px]">
                            {row.field}
                          </span>
                        </td>
                        <td className="py-2.5 pl-3 pr-4 text-emerald-700 font-bold text-[11px]">
                          ✓ Сопоставлено
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  ← Назад к загрузке
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Перейти к проверке данных <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DATA VALIDATION & LIVE PREVIEW TABLE */}
          {currentStep === 3 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Шаг 3: Проверка данных
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Предпросмотр нормализованных записей и распределение статусов дубликатов
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700 self-start sm:self-auto">
                  Готово к импорту: 6 строк
                </span>
              </div>

              {/* Summary Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <span className="text-[11px] text-slate-500 font-medium">Строк в файле:</span>
                  <p className="text-xl font-extrabold text-slate-900 mt-0.5">{previewRows.length} строк</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                  <span className="text-[11px] text-emerald-700 font-medium">Новые записи:</span>
                  <p className="text-xl font-extrabold text-emerald-700 mt-0.5">{countNew}</p>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5">
                  <span className="text-[11px] text-blue-700 font-medium">Обновления:</span>
                  <p className="text-xl font-extrabold text-blue-700 mt-0.5">{countUpdate}</p>
                </div>
                <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3.5">
                  <span className="text-[11px] text-purple-700 font-medium">Дубликаты:</span>
                  <p className="text-xl font-extrabold text-purple-700 mt-0.5">{countDuplicate}</p>
                </div>
              </div>

              {/* Live Preview Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-800">
                  Таблица предпросмотра данных (Live Preview)
                </h3>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                      <tr>
                        <th className="py-2.5 pl-3 pr-2">Строка</th>
                        <th className="px-2.5 py-2.5">Имя</th>
                        <th className="px-2.5 py-2.5">Фамилия</th>
                        <th className="px-2.5 py-2.5">Email</th>
                        <th className="px-2.5 py-2.5">Телефон</th>
                        <th className="px-2.5 py-2.5">Тип</th>
                        <th className="py-2.5 pl-2 pr-3">Статус</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {previewRows.map((row) => {
                        let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                        if (row.status === 'Обновление') {
                          badgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
                        } else if (row.status === 'Дубликат') {
                          badgeClass = 'bg-purple-100 text-purple-800 border-purple-200';
                        }

                        return (
                          <tr key={row.row} className="hover:bg-slate-50/70">
                            <td className="py-2 pl-3 pr-2 font-mono text-slate-400 font-semibold">
                              #{row.row}
                            </td>
                            <td className="px-2.5 py-2 font-bold text-slate-900">{row.firstName}</td>
                            <td className="px-2.5 py-2 text-slate-800">{row.lastName}</td>
                            <td className="px-2.5 py-2 text-slate-500 font-mono text-[11px]">{row.email}</td>
                            <td className="px-2.5 py-2 text-slate-600 font-mono text-[11px]">{row.phone}</td>
                            <td className="px-2.5 py-2">
                              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                {row.type}
                              </span>
                            </td>
                            <td className="py-2 pl-2 pr-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Deduplication Details Card */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Автоматическое связывание семей (Ключ объединения по телефону):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700">
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                    <p className="font-semibold text-slate-900">Семья Смирновых (+7 999 123-45-67)</p>
                    <p className="text-slate-500 mt-0.5">• Дети: Иван (B1), Анна (Kids)</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                    <p className="font-semibold text-slate-900">Семья Кузнецовых (+7 999 234-56-78)</p>
                    <p className="text-slate-500 mt-0.5">• Дети: Мария (Robotics), Артем (Math)</p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  ← Назад к сопоставлению
                </button>
                <button
                  type="button"
                  onClick={handleApplyMigration}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Применение импорта в CRM...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Подтвердить и применить импорт в CRM
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
                  Импорт данных успешно завершен!
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Все записи успешно загружены и сопоставлены в CRM. Сформированы профили учеников, карточки родителей, группы и финансовые записи.
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

              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(1);
                    setFileLoaded(false);
                    setFileName('');
                  }}
                  className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                >
                  Импортировать ещё один файл
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebars Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Sidebar 1: История импортов */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                История импортов
              </span>
              <span className="text-[10px] text-slate-400">
                {importHistory.length} операций
              </span>
            </div>

            <div className="space-y-2.5">
              {importHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 text-xs truncate max-w-[170px]" title={item.fileName}>
                      {item.fileName}
                    </span>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                      {item.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{item.date}</span>
                    <span>{item.recordsCount} записей</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar 2: Инструкция (1–4) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
              Инструкция по импорту (1–4)
            </span>

            <ol className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  <strong>Скачайте шаблон Excel:</strong> используйте официальный шаблон с 9 стандартными колонками.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  <strong>Заполните строки:</strong> внесите имена детей, телефоны родителей и выбранные курсы.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  <strong>Проверьте соответствие полей:</strong> система сопоставит столбцы с реляционной схемой CRM.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold shrink-0 mt-0.5">
                  4
                </span>
                <span>
                  <strong>Изучите Live Preview:</strong> проверьте статусы записей и подтвердите миграцию в базу.
                </span>
              </li>
            </ol>
          </div>

          {/* Sidebar 3: Важно (Резервная копия) */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Важно: Создайте резервную копию</span>
            </div>

            <p className="text-[11px] text-amber-800 leading-relaxed">
              Перед импортом новых данных рекомендуется создать резервную копию. Это позволит восстановить базу в случае непредвиденных ошибок в загружаемом файле.
            </p>

            <div className="pt-1">
              <Link
                href="/settings/backup"
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 hover:text-amber-950 underline cursor-pointer"
              >
                Перейти в Резервное копирование →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
