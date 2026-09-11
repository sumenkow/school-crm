'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  Calendar,
  Users,
  GraduationCap,
  BookOpen,
  UserCheck,
  CheckSquare,
  CreditCard,
  BarChart3,
  Settings,
  Database,
  Plus,
  ArrowRight,
  Sparkles,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface PaletteItem {
  id: string;
  category: 'Навигация' | 'Быстрые действия' | 'Люди';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const items: PaletteItem[] = useMemo(() => [
    // Navigation
    {
      id: 'nav-dashboard',
      category: 'Навигация',
      title: 'Главный дашборд',
      subtitle: 'Общая статистика, выручка, задачи',
      icon: <LayoutDashboard size={18} />,
      action: () => router.push('/dashboard'),
      keywords: 'главная аналитика метрики старт',
    },
    {
      id: 'nav-calendar',
      category: 'Навигация',
      title: 'Календарь и расписание',
      subtitle: 'Сетка уроков, аудитории, занятость',
      icon: <Calendar size={18} />,
      action: () => router.push('/calendar'),
      keywords: 'расписание уроки занятия сетка',
    },
    {
      id: 'nav-students',
      category: 'Навигация',
      title: 'Список учеников',
      subtitle: 'База учащихся, абонементы, посещаемость',
      icon: <Users size={18} />,
      action: () => router.push('/students'),
      keywords: 'ученики дети студенты база',
    },
    {
      id: 'nav-crm',
      category: 'Навигация',
      title: 'CRM Лиды и воронка',
      subtitle: 'Входящие заявки, этапы воронки, пробные уроки',
      icon: <UserCheck size={18} />,
      action: () => router.push('/crm'),
      keywords: 'лиды канбан воронка заявки клиенты',
    },
    {
      id: 'nav-groups',
      category: 'Навигация',
      title: 'Учебные группы',
      subtitle: 'Курсы, расписания, списки зачисленных',
      icon: <BookOpen size={18} />,
      action: () => router.push('/groups'),
      keywords: 'группы классы курсы направления',
    },
    {
      id: 'nav-teachers',
      category: 'Навигация',
      title: 'Преподаватели',
      subtitle: 'Педагогический состав, нагрузка, контакты',
      icon: <GraduationCap size={18} />,
      action: () => router.push('/teachers'),
      keywords: 'преподаватели учителя педагоги сотрудники',
    },
    {
      id: 'nav-finance',
      category: 'Навигация',
      title: 'Оплаты и финансы',
      subtitle: 'Платежи, задолженности, абонементы',
      icon: <CreditCard size={18} />,
      action: () => router.push('/finance'),
      keywords: 'оплаты деньги касса долги счета',
    },
    {
      id: 'nav-team',
      category: 'Навигация',
      title: 'Команда и доступы',
      subtitle: 'Сотрудники, роли, пароли, добавление коллег',
      icon: <Users size={18} />,
      action: () => router.push('/settings/team'),
      keywords: 'команда сотрудники администраторы учителя пароли',
    },
    {
      id: 'nav-backup',
      category: 'Навигация',
      title: 'Резервное копирование базы',
      subtitle: 'Экспорт в Excel, синхронизация с Google Таблицами',
      icon: <Database size={18} />,
      action: () => router.push('/settings/backup'),
      keywords: 'бэкап excel google sheets выгрузка база копия',
    },

    // Quick Actions
    {
      id: 'action-new-lead',
      category: 'Быстрые действия',
      title: '+ Создать нового лида',
      subtitle: 'Быстро зафиксировать обращение в CRM',
      icon: <Plus size={18} className="text-purple-600" />,
      action: () => router.push('/crm'),
      keywords: 'создать лид заявка новый клиент',
    },
    {
      id: 'action-new-student',
      category: 'Быстрые действия',
      title: '+ Добавить ученика',
      subtitle: 'Зачисление в школу и привязка родителя',
      icon: <Plus size={18} className="text-blue-600" />,
      action: () => router.push('/students'),
      keywords: 'добавить ученик новый ребенок',
    },
    {
      id: 'action-new-teacher',
      category: 'Быстрые действия',
      title: '+ Добавить сотрудника / учителя',
      subtitle: 'Создание логина и пароля для входа в систему',
      icon: <Plus size={18} className="text-emerald-600" />,
      action: () => router.push('/settings/team'),
      keywords: 'добавить учитель преподаватель админ учетная запись',
    },
    {
      id: 'action-download-backup',
      category: 'Быстрые действия',
      title: 'Скачать бэкап базы данных (Excel)',
      subtitle: 'Мгновенная выгрузка базы в многостраничный .xlsx',
      icon: <FileSpreadsheet size={18} className="text-emerald-600" />,
      action: () => {
        window.open('/api/backup/export?format=excel', '_blank');
        toast.success('Резервная копия Excel формируется и скачивается');
      },
      keywords: 'скачать бэкап экспорт excel таблица',
    },

    // Sample Students / Quick Search
    {
      id: 'person-ivan',
      category: 'Люди',
      title: 'Иван Смирнов (Ученик)',
      subtitle: 'English B1 Teens • Мама: Ольга Смирнова',
      icon: <Users size={18} className="text-indigo-600" />,
      action: () => router.push('/students'),
      keywords: 'иван смирнов английский +7 (999) 123-45-67',
    },
    {
      id: 'person-maria',
      category: 'Люди',
      title: 'Мария Кузнецова (Ученица)',
      subtitle: 'Robotics Junior • Папа: Дмитрий Кузнецов',
      icon: <Users size={18} className="text-indigo-600" />,
      action: () => router.push('/students'),
      keywords: 'мария кузнецова робототехника +7 (999) 234-56-78',
    },
    {
      id: 'person-olga-teacher',
      category: 'Люди',
      title: 'Ольга Ивановна (Преподаватель)',
      subtitle: 'Преподаватель • olga@ya.ru',
      icon: <GraduationCap size={18} className="text-emerald-600" />,
      action: () => router.push('/teachers'),
      keywords: 'ольга ивановна преподаватель учитель',
    },
  ], [router, toast]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const lower = query.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(lower) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(lower)) ||
        (item.keywords && item.keywords.toLowerCase().includes(lower))
    );
  }, [items, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation inside modal
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
          onClose();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-20 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <Search size={20} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск разделов, учеников, действий..."
            className="flex-1 text-sm bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X size={16} />
            </button>
          )}
          <span className="hidden sm:inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-500 border border-slate-200">
            Esc
          </span>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Sparkles size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-medium text-slate-600">Ничего не найдено</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Попробуйте ввести другое слово или имя</p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${
                        isSelected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate leading-tight">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight size={14} className="text-blue-600" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span><strong>↑↓</strong> Навигация</span>
            <span><strong>↵</strong> Выбрать</span>
            <span><strong>Esc</strong> Закрыть</span>
          </div>
          <span className="text-[10px] text-slate-400">School App Command Palette</span>
        </div>
      </div>
    </div>
  );
}
