'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  Search,
  BookOpen,
  Calendar,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  CheckCircle2,
  CalendarClock,
  UserCheck,
  PhoneCall,
  MessageSquare,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Layers,
  ArrowRight,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Database,
  Edit3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRole } from '@/context/RoleContext';

interface GuideSection {
  id: string;
  category: 'start' | 'crm' | 'students' | 'calendar' | 'attendance' | 'finance' | 'admin';
  categoryTitle: string;
  title: string;
  badge: string;
  description: string;
  steps: string[];
  visualType?: 'funnel' | 'reschedule' | 'attendance' | 'card';
  tips?: string[];
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'roles',
    category: 'start',
    categoryTitle: 'Быстрый старт',
    title: 'Роли пользователей и навигация',
    badge: 'Для всех ролей',
    description:
      'В верхней панели (TopBar) расположен быстрый переключатель ролей. CRM поддерживает 3 профиля доступа с разным набором прав и разделов.',
    steps: [
      'Владелец (Owner): видит все разделы, сквозную аналитику выручки, управление командой и базу данных.',
      'Администратор (Admin): управляет лидами, учениками, расписанием, оплатами и задачами.',
      'Преподаватель (Teacher): видит свое расписание, список групп и электронный журнал посещаемости.',
    ],
    tips: [
      'Для смены роли просто нажмите нужную кнопку в верхнем переключателе «Владелец / Администратор / Преподаватель».',
    ],
  },
  {
    id: 'leads-crm',
    category: 'crm',
    categoryTitle: 'CRM и Лиды',
    title: 'Воронка продаж и обработка заявок',
    badge: 'Продажи',
    description:
      'Раздел CRM (Лиды) позволяет вести потенциальных клиентов от первого обращения до оплаты абонемента.',
    steps: [
      'Перейдите в раздел «CRM (Лиды)» в левом меню.',
      'В канбан-доске перетаскивайте карточки лидов между колонками этапов: «Новый лид» → «Квалификация» → «Пробный урок» → «Сделка закрыта (Оплата)».',
      'При успешной оплате система автоматически создаст карточку активного ученика и привяжет родителя.',
      'В карточке лида доступна кнопка «Изменить» для корректировки контактов и заметок.',
    ],
    visualType: 'funnel',
    tips: [
      'Используйте быстрые кнопки звонка и чата в Telegram / WhatsApp прямо из карточки лида.',
    ],
  },
  {
    id: 'cards-edit',
    category: 'students',
    categoryTitle: 'Ученики и Родители',
    title: 'Карточки учеников, родителей и редактирование данных',
    badge: 'База учеников',
    description:
      'Каждая карточка в CRM содержит полную историю взаимодействия (таймлайн), договоры, абонементы и контактные лица.',
    steps: [
      'Откройте профиль ученика в разделе «Ученики».',
      'Кнопка «Изменить» в шапке карточки открывает модальное окно изменения ФИО, статуса, даты рождения, телефона и заметок.',
      'Интерактивные блоки: нажатие на карточку родителя открывает окно с полными контактами и кнопками вызова.',
      'Нажатие на задачу ученика открывает модальное окно задачи с возможностью быстрой отметки выполнения.',
    ],
    visualType: 'card',
    tips: [
      'В профиле родителя («Родители») можно привязать сразу нескольких детей к одной семье.',
    ],
  },
  {
    id: 'lesson-management',
    category: 'calendar',
    categoryTitle: 'Занятия и Переносы',
    title: 'Управление уроками и перенос занятий',
    badge: 'Расписание',
    description:
      'Удобный инструмент планирования, изменения статусов и переноса уроков с выбором даты, времени и уведомлением учеников.',
    steps: [
      'Откройте занятие в Календаре или карточке группы: откроется карточка урока (/calendar/lessons/[id]).',
      'Управление статусом: переключайте между «Запланировано», «Проведено», «Перенести» и «Отмена».',
      'Перенос занятия: нажмите «Перенести» — откроется диалоговое окно выбора новой даты, времени начала/конца, аудитории и причины переноса.',
      'Ролевой доступ: переносить занятия могут Преподаватель, Администратор и Владелец школы. Имя и роль автора фиксируются в таймлайне.',
      'Оповещение: при установленном флажке родителям и ученикам отправляется автоматическое уведомление о переносе.',
    ],
    visualType: 'reschedule',
    tips: [
      'После переноса в шапке карточки отображается заметный баннер с новой датой и причиной, а в таймлайн записывается история изменений.',
    ],
  },
  {
    id: 'attendance-journal',
    category: 'attendance',
    categoryTitle: 'Журнал посещаемости',
    title: 'Электронный журнал и быстрая отметка присутствия',
    badge: 'Учебный процесс',
    description:
      'Прозрачный и понятный учет посещаемости как внутри конкретного урока, так и в общей сводной ведомости преподавателя.',
    steps: [
      'Кнопка «Отметить всех присутствующими» позволяет выставить отметки всей группе в 1 клик.',
      '4 цветных статуса: «✓ Был» (зеленый), «Б Болел / Уважительная» (янтарный), «✗ Пропуск» (красный), «П Перенос / Отработка» (фиолетовый).',
      'Заметки к ученику: прямо в строке можно ввести комментарий («опоздал на 10 мин», «активно отвечал»).',
      'Быстрая связь: при отметке пропуска появляется кнопка для отправки готового сообщения родителю в WhatsApp.',
    ],
    visualType: 'attendance',
    tips: [
      'Преподаватели могут вести журнал как со стационарного компьютера, так и с мобильного телефона в разделе «Мои занятия» и «Журнал посещаемости».',
    ],
  },
  {
    id: 'analytics-modes',
    category: 'finance',
    categoryTitle: 'Финансы и Аналитика',
    title: 'Аналитика выручки: диаграмма, таблица и карточки',
    badge: 'Управление',
    description:
      'Сквозная финансовая аналитика школы с визуализацией распределения выручки по педагогам и курсам.',
    steps: [
      'Откройте раздел «Аналитика» в левом меню.',
      'Фильтр периода: выбирайте «Сентябрь» (месяц), «3-й квартал» или «2026 год».',
      'В блоке выручки преподавателей используйте переключатель режимов: «Диаграмма» (интерактивный круговой пирог), «Таблица» (полные финансовые метрики) или «Карточки».',
      'При наведении на сектор круговой диаграммы отображается сумма выручки педагога и его доля в процентах от школы.',
    ],
    tips: [
      'Кнопка «Экспорт отчета» позволяет выгрузить сводную аналитику школы в формате электронной таблицы.',
    ],
  },
  {
    id: 'admin-backup',
    category: 'admin',
    categoryTitle: 'Администрирование',
    title: 'Импорт из Excel, бэкапы и безопасность данных',
    badge: 'Безопасность',
    description:
      'Инструменты для системного администрирования, загрузки существующих списков и резервного копирования.',
    steps: [
      'Импорт Excel: перейдите в «Импорт Excel» для пакетной загрузки учеников, родителей и преподавателей.',
      'Бэкап базы: в разделе «Бэкап базы» доступна выгрузка снапшота всей CRM в JSON/SQL одним нажатием.',
      'Управление командой: добавление новых сотрудников с назначением прав доступа.',
    ],
    tips: [
      'Регулярно скачивайте резервную копию перед массовыми изменениями расписания или импортом новых групп.',
    ],
  },
];

export default function HelpCenterPage() {
  const { role } = useRole();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFaq, setExpandedFaq] = useState<string | null>('faq1');

  const filteredSections = GUIDE_SECTIONS.filter((sec) => {
    if (selectedCategory !== 'all' && sec.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        sec.title.toLowerCase().includes(q) ||
        sec.description.toLowerCase().includes(q) ||
        sec.steps.some((st) => st.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* Hero Banner */}
      <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 opacity-10 pointer-events-none">
          <BookOpen size={280} />
        </div>

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-semibold backdrop-blur-md border border-white/20">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            База знаний и руководство пользователя CRM
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Справочный центр и гид по школе
          </h1>
          <p className="text-sm text-blue-100 leading-relaxed">
            Пошаговые инструкции, наглядные схемы рабочих процессов и рекомендации по эффективному управлению
            учениками, расписанием, посещаемостью и финансами.
          </p>

          {/* Search Box */}
          <div className="pt-2">
            <div className="relative max-w-lg">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по инструкции (например: перенос занятия, посещаемость, лиды)..."
                className="w-full rounded-2xl bg-white pl-10 pr-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-md font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Очистить
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex flex-wrap gap-2 items-center">
        {[
          { key: 'all', label: 'Все разделы' },
          { key: 'start', label: 'Быстрый старт и роли' },
          { key: 'crm', label: 'CRM и Лиды' },
          { key: 'students', label: 'Ученики и Карточки' },
          { key: 'calendar', label: 'Занятия и Переносы' },
          { key: 'attendance', label: 'Журнал посещаемости' },
          { key: 'finance', label: 'Финансы и Аналитика' },
          { key: 'admin', label: 'Администрирование' },
        ].map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={cn(
              'rounded-xl px-3.5 py-2 text-xs font-semibold transition-all',
              selectedCategory === cat.key
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Guides Grid */}
      <div className="space-y-8">
        {filteredSections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <HelpCircle className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-900">По вашему запросу ничего не найдено</h3>
            <p className="text-xs text-slate-500 mt-1">Попробуйте изменить формулировку поискового запроса.</p>
          </div>
        ) : (
          filteredSections.map((sec) => (
            <div
              key={sec.id}
              id={sec.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6 hover:border-indigo-200 transition-colors"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      {sec.categoryTitle}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                      {sec.badge}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-1.5">{sec.title}</h2>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-3xl">{sec.description}</p>
                </div>
              </div>

              {/* VISUAL ILLUSTRATION MOCKUPS */}
              {sec.visualType === 'funnel' && (
                <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-950">
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-purple-600" />
                      Иллюстрация процесса: Жизненный цикл сделки в CRM
                    </span>
                    <span className="text-[10px] text-purple-700 bg-white px-2 py-0.5 rounded-full border border-purple-200">
                      Конверсия ~35.7%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs pt-1">
                    <div className="rounded-xl border border-purple-200 bg-white p-3 shadow-2xs">
                      <span className="text-[10px] font-bold text-purple-600">ЭТАП 1</span>
                      <h4 className="font-bold text-slate-900 mt-0.5">Новый лид</h4>
                      <p className="text-[11px] text-slate-500 mt-1">Заявка с сайта или звонок родителя</p>
                    </div>

                    <div className="rounded-xl border border-indigo-200 bg-white p-3 shadow-2xs">
                      <span className="text-[10px] font-bold text-indigo-600">ЭТАП 2</span>
                      <h4 className="font-bold text-slate-900 mt-0.5">Квалификация</h4>
                      <p className="text-[11px] text-slate-500 mt-1">Уточнение возраста и уровня знаний</p>
                    </div>

                    <div className="rounded-xl border border-blue-200 bg-white p-3 shadow-2xs">
                      <span className="text-[10px] font-bold text-blue-600">ЭТАП 3</span>
                      <h4 className="font-bold text-slate-900 mt-0.5">Пробный урок</h4>
                      <p className="text-[11px] text-slate-500 mt-1">Назначение даты и посещение школы</p>
                    </div>

                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 shadow-2xs">
                      <span className="text-[10px] font-bold text-emerald-700">ЭТАП 4</span>
                      <h4 className="font-bold text-emerald-950 mt-0.5">Оплата (Ученик)</h4>
                      <p className="text-[11px] text-emerald-800 mt-1">Покупка абонемента и зачисление</p>
                    </div>
                  </div>
                </div>
              )}

              {sec.visualType === 'reschedule' && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                    <span className="flex items-center gap-1.5">
                      <CalendarClock className="h-4 w-4 text-amber-600" />
                      Иллюстрация: Окно переноса занятия с фиксацией в таймлайне
                    </span>
                    <span className="text-[10px] text-amber-800 bg-white px-2 py-0.5 rounded-full border border-amber-200">
                      Учитель • Админ • Владелец
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">1. Выбор времени</span>
                      <p className="font-bold text-slate-900">Новая дата и часы</p>
                      <p className="text-[11px] text-slate-500">Автоматическая проверка пересечений аудиторий</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">2. Причина переноса</span>
                      <p className="font-bold text-slate-900">Пресеты причин</p>
                      <p className="text-[11px] text-slate-500">Болезнь педагога, просьба родителей, праздники</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">3. Оповещение</span>
                      <p className="font-bold text-slate-900">Telegram / WhatsApp</p>
                      <p className="text-[11px] text-slate-500">Авторассылка родителям группы в 1 клик</p>
                    </div>
                  </div>
                </div>
              )}

              {sec.visualType === 'attendance' && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4 text-emerald-600" />
                      Иллюстрация: Цветовая схема статусов журнала посещаемости
                    </span>
                    <span className="text-[10px] text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                      1 клик: Отметить всех присутствующими
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-1">
                    <div className="rounded-xl border border-emerald-300 bg-emerald-100/70 p-3 text-center">
                      <span className="text-base font-extrabold text-emerald-800">✓ Был</span>
                      <p className="text-[11px] text-emerald-900 mt-0.5 font-medium">Присутствовал на уроке</p>
                    </div>

                    <div className="rounded-xl border border-amber-300 bg-amber-100/70 p-3 text-center">
                      <span className="text-base font-extrabold text-amber-900">Б Болел</span>
                      <p className="text-[11px] text-amber-950 mt-0.5 font-medium">Уважительная причина</p>
                    </div>

                    <div className="rounded-xl border border-rose-300 bg-rose-100/70 p-3 text-center">
                      <span className="text-base font-extrabold text-rose-800">✗ Пропуск</span>
                      <p className="text-[11px] text-rose-950 mt-0.5 font-medium">Без предупреждения</p>
                    </div>

                    <div className="rounded-xl border border-purple-300 bg-purple-100/70 p-3 text-center">
                      <span className="text-base font-extrabold text-purple-800">П Отработка</span>
                      <p className="text-[11px] text-purple-950 mt-0.5 font-medium">Перенос / Замена</p>
                    </div>
                  </div>
                </div>
              )}

              {sec.visualType === 'card' && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-950">
                    <span className="flex items-center gap-1.5">
                      <Edit3 className="h-4 w-4 text-blue-600" />
                      Иллюстрация: Карточка сущности с интерактивными модальными окнами
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                      <span className="text-[10px] font-bold text-blue-600 uppercase">Кнопка «Изменить»</span>
                      <p className="font-bold text-slate-900">В каждой карточке</p>
                      <p className="text-[11px] text-slate-500">Ученики, родители, группы, педагоги, лиды, задачи</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                      <span className="text-[10px] font-bold text-blue-600 uppercase">Клик по родителю</span>
                      <p className="font-bold text-slate-900">Быстрые контакты</p>
                      <p className="text-[11px] text-slate-500">Модальное окно с прямым звонком и переходом в Telegram</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                      <span className="text-[10px] font-bold text-blue-600 uppercase">Клик по задаче</span>
                      <p className="font-bold text-slate-900">Окно задачи</p>
                      <p className="text-[11px] text-slate-500">Смена статуса задачи, приоритет и дедлайн</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Steps List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Пошаговый регламент:</h4>
                <ol className="space-y-2 text-xs text-slate-700">
                  {sec.steps.map((st, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">
                        {i + 1}
                      </span>
                      <span className="mt-0.5 leading-relaxed">{st}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Tips block */}
              {sec.tips && sec.tips.length > 0 && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs text-indigo-950 flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold">Полезный совет:</span>
                    <p className="text-indigo-900 leading-relaxed">{sec.tips[0]}</p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* FAQ Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Часто задаваемые вопросы (FAQ)</h2>
          <p className="text-xs text-slate-500 mt-1">Быстрые ответы на популярные вопросы команды школы</p>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {[
            {
              id: 'faq1',
              q: 'Кто может переносить занятия в расписании?',
              a: 'Переносить занятия могут Преподаватель (своего занятия), Администратор и Владелец школы. При переносе система запрашивает дату, интервал времени, причину и автоматически фиксирует автора переноса в истории урока.',
            },
            {
              id: 'faq2',
              q: 'Как быстро отметить посещаемость всей группы?',
              a: 'В карточке урока или в журнале преподавателя нажмите зеленую кнопку «Отметить всех присутствующими». Все ученики сразу получат статус «Был», после чего можно индивидуально переключить отсутствующих в 1 клик.',
            },
            {
              id: 'faq3',
              q: 'Где посмотреть выручку по преподавателям?',
              a: 'В разделе «Аналитика» блок «Выручка по отдельным преподавателям» поддерживает 3 режима: круговую диаграмму («пирог»), сводную таблицу со средним чеком и карточки преподавателей. Данные можно переключать за месяц, квартал или год.',
            },
            {
              id: 'faq4',
              q: 'Как изменить данные ученика или родителя?',
              a: 'В шапке каждой карточки (ученик, родитель, преподаватель, группа, лид) предусмотрена кнопка «Изменить», открывающая форму редактирования с сохранением обновлений.',
            },
          ].map((faq) => {
            const isOpen = expandedFaq === faq.id;
            return (
              <div key={faq.id} className="py-3.5">
                <button
                  type="button"
                  onClick={() => setExpandedFaq(isOpen ? null : faq.id)}
                  className="w-full flex items-center justify-between text-left font-bold text-slate-900 hover:text-blue-600 transition-colors"
                >
                  <span className="text-sm">{faq.q}</span>
                  <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', isOpen && 'rotate-180 text-blue-600')} />
                </button>
                {isOpen && (
                  <p className="mt-2 text-slate-600 leading-relaxed pl-1 animate-in fade-in duration-150">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
