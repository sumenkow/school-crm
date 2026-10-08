/**
 * Course and Directions Domain Storage (SSOT)
 *
 * Implements Milestone M3 of Phase 8:
 * - Central storage key: 'crm_courses_v1'
 * - Event broadcasting: 'crm-courses-changed'
 * - 26 canonical European online school directions across 4 subjects in EUR (€)
 * - Strict formats: 'group' (numeric capacity) vs 'individual' (capacity: 1 / '—')
 * - Calculated pricing: dynamically derived lesson price (Math.round((packagePrice / lessonsCount) * 100) / 100)
 * - Reuses existing trial mechanics via isTrialAvailable: boolean (Zero New Entities)
 */

import { recordClientAuditEvent } from '@/lib/audit/clientAudit';

export type CourseFormat = 'group' | 'individual';
export type CourseStatus = 'active' | 'archived';
export type CourseSubject =
  | 'Иностранные языки'
  | 'Информатика и IT'
  | 'Точные науки'
  | 'Развитие интеллекта';

export interface CourseTariff {
  id: string;
  lessonsCount: number; // 4, 8, 16, 24
  packagePrice: number; // EUR (€)
  status: 'active' | 'archived';
  name?: string;
}

export interface CourseDirection {
  id: string;
  name: string;
  subject: CourseSubject;
  description?: string;
  format: CourseFormat;
  ageGroup: string;
  lessonDuration: string;
  lessonDurationMinutes: number;
  capacity: number; // e.g. 6-8 for group; 1 for individual
  tariffs: CourseTariff[];
  isTrialAvailable: boolean;
  status: CourseStatus;
  color?: string;

  // Backward compatibility fields for legacy consumers
  monthlyPrice?: string;
  maxStudents?: number;
  is_active?: boolean;
  isActive?: boolean;
  target_age?: string;
  price_monthly?: number;
  lesson_duration_minutes?: number;
}

export const COURSES_STORAGE_KEY = 'crm_courses_v1';
export const COURSE_STORAGE_KEY = COURSES_STORAGE_KEY;

/**
 * Canonical helper: Calculate price per lesson dynamically from tariff package price and lessons count.
 * Conforms to PROJECT.md § Interface Contracts: calcPricePerLesson(tariff)
 */
export function calcPricePerLesson(
  tariffOrPrice: { packagePrice?: number; lessonsCount?: number } | number | null | undefined,
  maybeCount?: number
): number {
  let pkg = 0;
  let count = 0;
  if (typeof tariffOrPrice === 'number') {
    pkg = Number(tariffOrPrice) || 0;
    count = Number(maybeCount) || 0;
  } else if (tariffOrPrice && typeof tariffOrPrice === 'object') {
    pkg = Number(tariffOrPrice.packagePrice) || 0;
    count = Number(tariffOrPrice.lessonsCount) || 0;
  }
  if (!Number.isFinite(pkg) || !Number.isFinite(count) || count <= 0 || pkg <= 0) return 0;
  const res = Math.round((pkg / count) * 100) / 100;
  return Number.isFinite(res) ? res : 0;
}

/**
 * Helper: Calculate price per lesson dynamically from package price and lessons count.
 * Never stores or allows manual override of lesson price if package is defined.
 */
export function calculateLessonPrice(packagePrice: number, lessonsCount: number): number {
  return calcPricePerLesson(packagePrice, lessonsCount);
}

/**
 * 26 canonical educational directions portfolio (European Online School, EUR €)
 */
export const INITIAL_COURSE_DIRECTIONS: CourseDirection[] = [
  // 1. Иностранные языки (8 directions: 6 active groups, 2 individual 1-on-1, 1 archived)
  {
    id: 'c-lang-01',
    name: 'Английский язык для детей (Kids A1-A2)',
    subject: 'Иностранные языки',
    description: 'Интерактивный онлайн-курс для детей: постановка произношения, базовый словарь и разговорные диалоги.',
    format: 'group',
    ageGroup: '6–9 лет',
    lessonDuration: '45 мин',
    lessonDurationMinutes: 45,
    capacity: 6,
    tariffs: [
      { id: 't-l1-4', lessonsCount: 4, packagePrice: 60, status: 'active', name: '4 занятия' },
      { id: 't-l1-8', lessonsCount: 8, packagePrice: 110, status: 'active', name: '8 занятий' },
      { id: 't-l1-16', lessonsCount: 16, packagePrice: 200, status: 'active', name: '16 занятий' },
    ],
    isTrialAvailable: true,
    status: 'active',
    color: '#3b82f6',
    maxStudents: 6,
    monthlyPrice: '110 €',
    is_active: true,
    isActive: true,
  },
  {
    id: 'c-lang-02',
    name: 'Английский язык для подростков (Teens B1-B2)',
    subject: 'Иностранные языки',
    description: 'Углубленная языковая практика, грамматика и обсуждение актуальных тем для школьников средней и старшей школы.',
    format: 'group',
    ageGroup: '10–15 лет',
    lessonDuration: '60 мин',
    lessonDurationMinutes: 60,
    capacity: 8,
    tariffs: [
      { id: 't-l2-4', lessonsCount: 4, packagePrice: 70, status: 'active', name: '4 занятия' },
      { id: 't-l2-8', lessonsCount: 8, packagePrice: 130, status: 'active', name: '8 занятий' },
      { id: 't-l2-16', lessonsCount: 16, packagePrice: 240, status: 'active', name: '16 занятий' },
    ],
    isTrialAvailable: true,
    status: 'active',
    color: '#2563eb',
    maxStudents: 8,
    monthlyPrice: '130 €',
    is_active: true,
    isActive: true,
  },
  {
    id: 'c-lang-03',
    name: 'Подготовка к IELTS / Cambridge Exams',
    subject: 'Иностранные языки',
    description: 'Интенсивная подготовка к международным экзаменам по английскому языку: Writing, Speaking, Reading, Listening.',
    format: 'group',
    ageGroup: '14+ лет',
    lessonDuration: '90 мин',
    lessonDurationMinutes: 90,
    capacity: 6,
    tariffs: [
      { id: 't-l3-4', lessonsCount: 4, packagePrice: 80, status: 'active', name: '4 занятия' },
      { id: 't-l3-8', lessonsCount: 8, packagePrice: 150, status: 'active', name: '8 занятий' },
      { id: 't-l3-16', lessonsCount: 16, packagePrice: 280, status: 'active', name: '16 занятий' },
    ],
    isTrialAvailable: true,
    status: 'active',
    color: '#1d4ed8',
    maxStudents: 6,
    monthlyPrice: '150 €',
    is_active: true,
    isActive: true,
  },
  {
    id: 'c-lang-04',
    name: 'Немецкий язык (A1–B1)',
    subject: 'Иностранные языки',
    description: 'Системное освоение немецкого языка по современным учебникам Goethe-Institut для детей и подростков.',
    format: 'group',
    ageGroup: '9–16 лет',
    lessonDuration: '60 мин',
    lessonDurationMinutes: 60,
    capacity: 6,
    tariffs: [
      { id: 't-l4-4', lessonsCount: 4, packagePrice: 70, status: 'active', name: '4 занятия' },
      { id: 't-l4-8', lessonsCount: 8, packagePrice: 130, status: 'active', name: '8 занятий' },
      { id: 't-l4-16', lessonsCount: 16, packagePrice: 240, status: 'active', name: '16 занятий' },
    ],
    isTrialAvailable: true,
    status: 'active',
    color: '#0284c7',
    maxStudents: 6,
    monthlyPrice: '130 €',
    is_active: true,
    isActive: true,
  },
  {
    id: 'c-lang-05',
    name: 'Словацкий язык для поступления в гимназии и вузы',
    subject: 'Иностранные языки',
    description: 'Специализированный курс словацкого языка для адаптации и успешного поступления в словацкие учебные заведения.',
    format: 'group',
    ageGroup: '12+ лет',
    lessonDuration: '60 мин',
    lessonDurationMinutes: 60,
    capacity: 6,
    tariffs: [
      { id: 't-l5-4', lessonsCount: 4, packagePrice: 75, status: 'active', name: '4 занятия' },
      { id: 't-l5-8', lessonsCount: 8, packagePrice: 140, status: 'active', name: '8 занятий' },
      { id: 't-l5-16', lessonsCount: 16, packagePrice: 260, status: 'active', name: '16 занятий' },
    ],
    isTrialAvailable: true,
    status: 'active',
    color: '#0369a1',
    maxStudents: 6,
    monthlyPrice: '140 €',
    is_active: true,
    isActive: true,
  },
  {
    id: 'c-lang-06',
    name: 'Французский язык (Débutant)',
    subject: 'Иностранные языки',
    description: 'Начальный курс французского языка: фонетика, основы грамматики и простая коммуникация.',
    format: 'group',
    ageGroup: '8–15 лет',
    lessonDuration: '60 мин',
    lessonDurationMinutes: 60,
    capacity: 6,
    tariffs: [
      { id: 't-l6-4', lessonsCount: 4, packagePrice: 70, status: 'active', name: '4 занятия' },
      { id: 't-l6-8', lessonsCount: 8, packagePrice: 130, status: 'active', name: '8 занятий' },
    ],
    isTrialAvailable: true,
    status: 'archived',
    color: '#64748b',
    maxStudents: 6,
    monthlyPrice: '130 €',
    is_active: false,
    isActive: false,
  },
  {
    id: 'c-lang-07',
    name: 'Индивидуальный английский (1-on-1)',
    subject: 'Иностранные языки',
    description: 'Персональная программа занятий с репетитором, подстраиваемая под цели и темп ученика.',
    format: 'individual',
    ageGroup: 'Любой возраст',
    lessonDuration: '60 мин',
    lessonDurationMinutes: 60,
    capacity: 1,
    tariffs: [
      { id: 't-l7-4', lessonsCount: 4, packagePrice: 140, status: 'active', name: '4 занятия' },
      { id: 't-l7-8', lessonsCount: 8, packagePrice: 260, status: 'active', name: '8 занятий' },
      { id: 't-l7-16', lessonsCount: 16, packagePrice: 480, status: 'active', name: '16 занятий' },
    ],
    isTrialAvailable: true,
    status: 'active',
    color: '#4f46e5',
    maxStudents: 1,
    monthlyPrice: '260 €',
    is_active: true,
    isActive: true,
  },
  {
    id: 'c-lang-08',
    name: 'Индивидуальный немецкий (1-on-1)',
    subject: 'Иностранные языки',
    description: 'Индивидуальные уроки немецкого языка для срочной языковой подготовки или углубленного изучения.',
    format: 'individual',
    ageGroup: 'Любой возраст',
    lessonDuration: '60 мин',
    lessonDurationMinutes: 60,
    capacity: 1,
    tariffs: [
      { id: 't-l8-4', lessonsCount: 4, packagePrice: 140, status: 'active', name: '4 занятия' },
      { id: 't-l8-8', lessonsCount: 8, packagePrice: 260, status: 'active', name: '8 занятий' },
      { id: 't-l8-16', lessonsCount: 16, packagePrice: 480, status: 'active', name: '16 занятий' },
    ],
    isTrialAvailable: true,
    status: 'active',
    color: '#6366f1',
    maxStudents: 1,
    monthlyPrice: '260 €',
    is_active: true,
    isActive: true,
  },

  // 2. Информатика и IT (7 directions)
  {
    id: 'c-it-01',
    name: 'Робототехника и схемотехника (Arduino & Tinkercad)',
    subject: 'Информатика и IT',
    description: 'Виртуальное онлайн-моделирование схем, датчиков и микроконтроллеров в среде Autodesk Tinkercad.',
    format: 'group',
    ageGroup: '7–11 лет',
    lessonDuration: '60 мин',
    lessonDurationMinutes: 60,
    capacity: 6,
    tariffs: [
      { id: 't-it1-4', lessonsCount: 4, packagePrice: 65, status: 'active', name: '4 занятия' },
      { id: 't-it1-8', lessonsCount: 8, packagePrice: 120, status: 'active', name: '8 занятий' },
      { id: 't-it1-16', lessonsCount: 16, packagePrice: 220, status: 'active', name: '16 занятий' },
    ],
    isTrialAvailable: true,
    status: 'active',
    color: '#10b981',
    maxStudents: 6,
    monthlyPrice: '120 €',
    is_active: true,
    isActive: true,
  },
  {
    id: 'c-it-02',
    name: 'Программирование на Scratch & Kodu',
    subject: 'Информатика и IT',
    description: 'Основы алгоритмов, циклов и условий через создание анимаций и интерактивных мини-игр.',
    format: 'group',
    ageGroup: '7–10 лет',
    lessonDuration: '60 мин',
    lessonDurationMinutes: 60,
    capacity: 6,
    tariffs: [
      { id: 't-it2-4', lessonsCount: 4, packagePrice: 65, status: 'active', name: '4 занятия' },
      { id: 't-it2-8', lessonsCount: 8, packagePrice: 120, status: 'active', name: '8 занятий' },
      { id: 't-it2-16', lessonsCount: 16, packagePrice: 220, status: 'active', name: '16 занятий' },
    ],
    isTrialAvailable: true,
    status: 'active',
    color: '#059669',
    maxStudents: 6,
    monthlyPrice: '120 €',
    is_active: true,
    isActive: true,
  },
  {
    id: 'c-it-03',
    name: 'Программирование на Python (Junior)',
    subject: 'Информатика и IT',
    description: 'Синтаксис Python, типы данных, списки, словари, функции и разработка первых консольных и графических приложений.',
    format: 'group',
    ageGroup: '11–15 лет',
    lessonDuration: '90 мин',
    lessonDurationMinutes: 90,
    capacity: 8,
    tariffs: [
      { id: 't-it3-4', lessonsCount: 4, packagePrice: 75, status: 'active', name: '4 занятия' },
      { id: 't-it3-8', lessonsCount: 8, packagePrice: 140, status: 'active', name: '8 занятий' },
      { id: 't-it3-16', lessonsCount: 16, packagePrice: 260, status: 'active', name: '16 занятий' },
    ],
    isTrialAvailable: true,
    status: 'active',
    color: '#0d9488',
    maxStudents: 8,
    monthlyPrice: '140 €',
    is_active: true,
    isActive: true,
  },
  {
    id: 'c-it-04',
    name: 'Веб-разработка (HTML / CSS / JavaScript)',
    subject: 'Информатика и IT',
    description: 'Создание реальных веб-страниц, верстка сайтов, анимации и основы интерактивного JavaScript.',
    format: 'group',
    ageGroup: '12+ лет',
    lessonDuration: '90 мин',
    lessonDurationMinutes: 90,
    capacity: 6,
    tariffs: [
      { id: 't-it4-4', lessonsCount: 4, packagePrice: 80, status: 'active', name: '4 занятия' },
      { id: 't-it4-8', lessonsCount: 8, packagePrice: 150, status: 'active', name: '8 занятий' },
      { id: 't-it4-16', lessonsCount: 16, packagePrice: 280, status: 'active', name: '16 занятий' },
    ],
    isTrialAvailable: true,
    status: 'active',
    color: '#14b8a6',
    maxStudents: 6,
    monthlyPrice: '150 €',
    is_active: true,
    isActive: true,
  },
  {
    id: 'c-it-05',
    name: 'Создание игр в Roblox Studio & Lua',
    subject: 'Информатика и IT',
    description: '3D-моделирование и программирование скриптов на языке Lua в популярной среде Roblox.',
    format: 'group',
    ageGroup: '9–13 лет',
    lessonDuration: '60 мин',
    lessonDurationMinutes: 60,
    capacity: 6,
    tariffs: [
      { id: 't-it5-4', lessonsCount: 4, packagePrice: 70, status: 'active', name: '4 занятия' },
      { id: 't-it5-8', lessonsCount: 8, packagePrice: 130, status: 'active', name: '8 занятий' },
      { id: 't-it5-16', lessonsCount: 16, packagePrice: 240, status: 'active', name: '16 занятий' },
    ],
    isTrialAvailable: true,
    status: 'active',
    color: '#06b6d4',
    maxStudents: 6,
    monthlyPrice: '130 €',
    is_active: true,
    isActive: true,
  },
  {
    id: 'c-it-06',
    name: 'Разработка 3D-игр в Unity & C#',
    subject: 'Информатика и IT',
    description: 'Профессиональный геймдев на игровом движке Unity с изучением объектно-ориентированного C#.',
    format: 'group',
    ageGroup: '13+ лет',
    lessonDuration: '90 мин',
    lessonDurationMinutes: 90,
    capacity: 6,
    tariffs: [
      { id: 't-it6-4', lessonsCount: 4, packagePrice: 85, status: 'active', name: '4 занятия' },
      { id: 't-it6-8', lessonsCount: 8, packagePrice: 160, status: 'active', name: '8 занятий' },
      { id: 't-it6-16', lessonsCount: 16, packagePrice: 300, status: 'active', name: '16 занятий' },
    ],
    isTrialAvailable: true,
    status: 'archived',
    color: '#64748b',
    maxStudents: 6,
    monthlyPrice: '160 €',
    is_active: false,
    isActive: false,
  },
  {
    id: 'c-it-07',
    name: 'Индивидуальное IT & Python (1-on-1)',
    subject: 'Информатика и IT',
    description: 'Индивидуальный трек обучения программированию, помощь со школьными проектами и подготовка к олимпиадам.',
    format: 'individual',
    ageGroup: 'Любой возраст',
    lessonDuration: '60 мин',
    lessonDurationMinutes: 60,
    capacity: 1,
    tariffs: [
      { id: 't-it7-4', lessonsCount: 4, packagePrice: 150, status: 'active', name: '4 занятия' },
      { id: 't-it7-8', lessonsCount: 8, packagePrice: 280, status: 'active', name: '8 занятий' },
      { id: 't-it7-16', lessonsCount: 16, packagePrice: 520, status: 'active', name: '16 занятий' },
    ],
    isTrialAvailable: true,
    status: 'active',
    color: '#0f766e',
    maxStudents: 1,
    monthlyPrice: '280 €',
    is_active: true,
    isActive: true,
  },

  // 3. Точные науки (6 directions)
  {
    id: 'c-sci-01',
    name: 'Олимпиадная математика (Начальный уровень)',
    subject: 'Точные науки',
    description: 'Развитие нестандартного мышления, логические задачи, раскраски, инварианты и подготовка к Кенгуру.',
    format: 'group',
    ageGroup: '7–10 лет',
    lessonDuration: '60 мин',
    lessonDurationMinutes: 60,
    capacity: 8,
    tariffs: [
      { id: 't-sc1-4', lessonsCount: 4, packagePrice: 60, status: 'active', name: '4 занятия' },
      { id: 't-sc1-8', lessonsCount: 8, packagePrice: 110, status: 'active', name: '8 занятий' },
      { id: 't-sc1-16', lessonsCount: 16, packagePrice: 200, status: 'active', name: '16 занятий' },
    ],
    isTrialAvailable: true,
    status: 'active',
    color: '#f59e0b',
    maxStudents: 8,
    monthlyPrice: '110 €',
    is_active: true,
    isActive: true,
  },
  {
    id: 'c-sci-02',
    name: 'Олимпиадная математика (Продвинутый уровень)',
    subject: 'Точные науки',
    description: 'Теория чисел, комбинаторика, сложная планиметрия и алгоритмические методы решения олимпиадных задач.',
    format: 'group',
    ageGroup: '11–15 лет',
    lessonDuration: '90 мин',
    lessonDurationMinutes: 90,
    capacity: 8,
    tariffs: [
      { id: 't-sc2-4', lessonsCount: 4, packagePrice: 75, status: 'active', name: '4 занятия' },
      { id: 't-sc2-8', lessonsCount: 8, packagePrice: 140, status: 'active', name: '8 занятий' },
      { id: 't-sc2-16', lessonsCount: 16, packagePrice: 260, status: 'active', name: '16 занятий' },
    ],
    isTrialAvailable: true,
    status: 'active',
    color: '#d97706',
    maxStudents: 8,
    monthlyPrice: '140 €',
    is_active: true,
    isActive: true,
  },
  {
    id: 'c-sci-03',
    name: 'Школьная математика: устранение пробелов',
    subject: 'Точные науки',
    description: 'Понятное объяснение трудных тем, уверенное освоение школьной программы и повышение оценок.',
    format: 'group',
    ageGroup: '8–14 лет',
    lessonDuration: '60 мин',
    lessonDurationMinutes: 60,
    capacity: 6,
    tariffs: [
      { id: 't-sc3-4', lessonsCount: 4, packagePrice: 60, status: 'active', name: '4 занятия' },
      { id: 't-sc3-8', lessonsCount: 8, packagePrice: 110, status: 'active', name: '8 занятий' },
      { id: 't-sc3-16', lessonsCount: 16, packagePrice: 200, status: 'active', name: '16 занятий' },
    ],
    isTrialAvailable: true,
    status: 'active',
    color: '#b45309',
    maxStudents: 6,
    monthlyPrice: '110 €',
    is_active: true,
    isActive: true,
  },
  {
    id: 'c-sci-04',
    name: 'Подготовка к экзаменам по математике (ОГЭ / Matura)',
    subject: 'Точные науки',
    description: 'Разбор вариантов выпускных и вступительных экзаменов, решение сложных задач второй части.',
    format: 'group',
    ageGroup: '14+ лет',
    lessonDuration: '90 мин',
    lessonDurationMinutes: 90,
    capacity: 6,
    tariffs: [
      { id: 't-sc4-4', lessonsCount: 4, packagePrice: 80, status: 'active', name: '4 занятия' },
      { id: 't-sc4-8', lessonsCount: 8, packagePrice: 150, status: 'active', name: '8 занятий' },
      { id: 't-sc4-16', lessonsCount: 16, packagePrice: 280, status: 'active', name: '16 занятий' },
    ],
    isTrialAvailable: true,
    status: 'active',
    color: '#ea580c',
    maxStudents: 6,
    monthlyPrice: '150 €',
    is_active: true,
    isActive: true,
  },
  {
    id: 'c-sci-05',
    name: 'Экспериментальная физика и астрономия',
    subject: 'Точные науки',
    description: 'Интерактивные физические явления, симуляции законов механики и изучение устройства вселенной.',
    format: 'group',
    ageGroup: '10–14 лет',
    lessonDuration: '60 мин',
    lessonDurationMinutes: 60,
    capacity: 6,
    tariffs: [
      { id: 't-sc5-4', lessonsCount: 4, packagePrice: 65, status: 'active', name: '4 занятия' },
      { id: 't-sc5-8', lessonsCount: 8, packagePrice: 120, status: 'active', name: '8 занятий' },
    ],
    isTrialAvailable: true,
    status: 'archived',
    color: '#64748b',
    maxStudents: 6,
    monthlyPrice: '120 €',
    is_active: false,
    isActive: false,
  },
  {
    id: 'c-sci-06',
    name: 'Индивидуальная математика (1-on-1)',
    subject: 'Точные науки',
    description: 'Персональные уроки математики любой сложности: от начальной школы до высшей математики.',
    format: 'individual',
    ageGroup: 'Любой возраст',
    lessonDuration: '60 мин',
    lessonDurationMinutes: 60,
    capacity: 1,
    tariffs: [
      { id: 't-sc6-4', lessonsCount: 4, packagePrice: 140, status: 'active', name: '4 занятия' },
      { id: 't-sc6-8', lessonsCount: 8, packagePrice: 260, status: 'active', name: '8 занятий' },
      { id: 't-sc6-16', lessonsCount: 16, packagePrice: 480, status: 'active', name: '16 занятий' },
    ],
    isTrialAvailable: true,
    status: 'active',
    color: '#c2410c',
    maxStudents: 1,
    monthlyPrice: '260 €',
    is_active: true,
    isActive: true,
  },

  // 4. Развитие интеллекта (5 directions)
  {
    id: 'c-int-01',
    name: 'Скорочтение и развитие памяти',
    subject: 'Развитие интеллекта',
    description: 'Техники быстрого восприятия текста, мнемотехника, расширение поля зрения и концентрация внимания.',
    format: 'group',
    ageGroup: '7–12 лет',
    lessonDuration: '45 мин',
    lessonDurationMinutes: 45,
    capacity: 6,
    tariffs: [
      { id: 't-in1-4', lessonsCount: 4, packagePrice: 55, status: 'active', name: '4 занятия' },
      { id: 't-in1-8', lessonsCount: 8, packagePrice: 100, status: 'active', name: '8 занятий' },
      { id: 't-in1-16', lessonsCount: 16, packagePrice: 180, status: 'active', name: '16 занятий' },
    ],
    isTrialAvailable: true,
    status: 'active',
    color: '#8b5cf6',
    maxStudents: 6,
    monthlyPrice: '100 €',
    is_active: true,
    isActive: true,
  },
  {
    id: 'c-int-02',
    name: 'Ментальная арифметика',
    subject: 'Развитие интеллекта',
    description: 'Счет на абакусе и воображаемых счетах, развитие межполушарного взаимодействия и скорости мышления.',
    format: 'group',
    ageGroup: '5–9 лет',
    lessonDuration: '45 мин',
    lessonDurationMinutes: 45,
    capacity: 6,
    tariffs: [
      { id: 't-in2-4', lessonsCount: 4, packagePrice: 55, status: 'active', name: '4 занятия' },
      { id: 't-in2-8', lessonsCount: 8, packagePrice: 100, status: 'active', name: '8 занятий' },
      { id: 't-in2-16', lessonsCount: 16, packagePrice: 180, status: 'active', name: '16 занятий' },
    ],
    isTrialAvailable: true,
    status: 'active',
    color: '#7c3aed',
    maxStudents: 6,
    monthlyPrice: '100 €',
    is_active: true,
    isActive: true,
  },
  {
    id: 'c-int-03',
    name: 'Шахматы и логическое мышление',
    subject: 'Развитие интеллекта',
    description: 'Шахматная стратегия и тактика, анализ позиций, развитие терпения и навыка просчета ходов наперед.',
    format: 'group',
    ageGroup: '6–12 лет',
    lessonDuration: '60 мин',
    lessonDurationMinutes: 60,
    capacity: 6,
    tariffs: [
      { id: 't-in3-4', lessonsCount: 4, packagePrice: 60, status: 'active', name: '4 занятия' },
      { id: 't-in3-8', lessonsCount: 8, packagePrice: 110, status: 'active', name: '8 занятий' },
      { id: 't-in3-16', lessonsCount: 16, packagePrice: 200, status: 'active', name: '16 занятий' },
    ],
    isTrialAvailable: true,
    status: 'active',
    color: '#6d28d9',
    maxStudents: 6,
    monthlyPrice: '110 €',
    is_active: true,
    isActive: true,
  },
  {
    id: 'c-int-04',
    name: 'Подготовка к школе (Комплексный курс)',
    subject: 'Развитие интеллекта',
    description: 'Обучение чтению, письмо, математические основы, окружающий мир и психологическая готовность к школе.',
    format: 'group',
    ageGroup: '5–7 лет',
    lessonDuration: '45 мин',
    lessonDurationMinutes: 45,
    capacity: 6,
    tariffs: [
      { id: 't-in4-4', lessonsCount: 4, packagePrice: 55, status: 'active', name: '4 занятия' },
      { id: 't-in4-8', lessonsCount: 8, packagePrice: 100, status: 'active', name: '8 занятий' },
      { id: 't-in4-16', lessonsCount: 16, packagePrice: 180, status: 'active', name: '16 занятий' },
    ],
    isTrialAvailable: true,
    status: 'active',
    color: '#9333ea',
    maxStudents: 6,
    monthlyPrice: '100 €',
    is_active: true,
    isActive: true,
  },
  {
    id: 'c-int-05',
    name: 'Критическое мышление и дебаты для подростков',
    subject: 'Развитие интеллекта',
    description: 'Аргументация, распознавание манипуляций, фактчекинг и публичные онлайн-дискуссии.',
    format: 'group',
    ageGroup: '12+ лет',
    lessonDuration: '60 мин',
    lessonDurationMinutes: 60,
    capacity: 8,
    tariffs: [
      { id: 't-in5-4', lessonsCount: 4, packagePrice: 60, status: 'active', name: '4 занятия' },
      { id: 't-in5-8', lessonsCount: 8, packagePrice: 110, status: 'active', name: '8 занятий' },
    ],
    isTrialAvailable: true,
    status: 'archived',
    color: '#64748b',
    maxStudents: 8,
    monthlyPrice: '110 €',
    is_active: false,
    isActive: false,
  },
];

/**
 * Normalizes course direction object ensuring format, capacity, and compatibility invariants.
 */
function normalizeCourseDirection(raw: any): CourseDirection {
  const format: CourseFormat = raw.format === 'individual' ? 'individual' : 'group';
  const rawCap = Number(raw.capacity ?? raw.maxStudents ?? raw.max_students);
  const capacity: number =
    format === 'individual'
      ? 1
      : Math.max(2, Math.min(30, Number.isFinite(rawCap) && rawCap > 0 ? rawCap : 8));
  const status: CourseStatus =
    raw.status === 'archived' || raw.status === 'paused' || raw.is_active === false || raw.isActive === false
      ? 'archived'
      : 'active';

  const rawTariffs: CourseTariff[] = Array.isArray(raw.tariffs) && raw.tariffs.length > 0
    ? raw.tariffs.map((t: any, idx: number) => ({
        id: t.id || `tariff_${idx + 1}`,
        lessonsCount: Number(t.lessonsCount) || 8,
        packagePrice: Number(t.packagePrice) || 120,
        status: t.status === 'archived' ? ('archived' as const) : ('active' as const),
        name: t.name || `${t.lessonsCount || 8} занятий`,
      }))
    : [
        { id: 't1', lessonsCount: 4, packagePrice: 65, status: 'active', name: '4 занятия' },
        { id: 't2', lessonsCount: 8, packagePrice: 120, status: 'active', name: '8 занятий' },
        { id: 't3', lessonsCount: 16, packagePrice: 220, status: 'active', name: '16 занятий' },
      ];

  const monthlyPriceStr = rawTariffs[1]?.packagePrice
    ? `${rawTariffs[1].packagePrice} €`
    : `${rawTariffs[0]?.packagePrice || 70} €`;

  const durationMin = Number(raw.lessonDurationMinutes ?? raw.lesson_duration_minutes) ||
    (raw.lessonDuration ? Number(String(raw.lessonDuration).replace(/\D/g, '')) || 60 : 60);

  return {
    id: raw.id || `course_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: (raw.name || 'Новое направление').trim(),
    subject: raw.subject || 'Иностранные языки',
    description: raw.description || '',
    format,
    ageGroup: raw.ageGroup || raw.target_age || '7-14 лет',
    lessonDuration: raw.lessonDuration || `${durationMin} мин`,
    lessonDurationMinutes: durationMin,
    capacity,
    tariffs: rawTariffs,
    isTrialAvailable: raw.isTrialAvailable !== false,
    status,
    color: raw.color || (format === 'individual' ? '#4f46e5' : '#3b82f6'),
    // Compatibility fields
    maxStudents: capacity,
    monthlyPrice: monthlyPriceStr,
    is_active: status === 'active',
    isActive: status === 'active',
    target_age: raw.ageGroup || raw.target_age || '7-14 лет',
    price_monthly: rawTariffs[1]?.packagePrice || rawTariffs[0]?.packagePrice || 120,
    lesson_duration_minutes: durationMin,
  };
}

/**
 * Loads all course directions from localStorage SSOT key 'crm_courses_v1'.
 * Automatically seeds with INITIAL_COURSE_DIRECTIONS if missing or holding outdated legacy ruble mocks.
 */
export function getCourses(): CourseDirection[] {
  if (typeof window === 'undefined') {
    return INITIAL_COURSE_DIRECTIONS;
  }

  try {
    const raw = localStorage.getItem(COURSES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Detect obsolete 3-element Russian ruble mock from previous versions
        const hasLegacyRubleMocks =
          parsed.length <= 4 &&
          parsed.some((p: any) => p.id === 'c1' || p.id === 'c2' || (p.monthlyPrice && p.monthlyPrice.includes('₽')));

        if (!hasLegacyRubleMocks) {
          return parsed.map(normalizeCourseDirection);
        }
      }
    }
  } catch (err) {
    console.error('Failed to parse courses from localStorage:', err);
  }

  // Seed storage with INITIAL_COURSE_DIRECTIONS
  try {
    localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(INITIAL_COURSE_DIRECTIONS));
  } catch {}

  return INITIAL_COURSE_DIRECTIONS;
}

/**
 * Alias to getCourses() for test runner and legacy compatibility.
 */
export function getStoredCourses(): CourseDirection[] {
  return getCourses();
}

/**
 * Retrieves a single course direction by ID.
 */
export function getCourseById(id: string): CourseDirection | undefined {
  const all = getCourses();
  return all.find((c) => c.id === id);
}

/**
 * Saves a course direction to localStorage SSOT, updates groups cache,
 * broadcasts crm-courses-changed CustomEvent, and syncs to /api/courses in background.
 */
export function saveCourse(course: Partial<CourseDirection> & { name: string }): CourseDirection {
  const current = getCourses();
  const normalized = normalizeCourseDirection({
    ...course,
    id: course.id || `c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  });

  const existingIndex = current.findIndex((c) => c.id === normalized.id);
  let updatedList: CourseDirection[];

  if (existingIndex >= 0) {
    updatedList = [...current];
    updatedList[existingIndex] = normalized;
  } else {
    updatedList = [...current, normalized];
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(updatedList));
      window.dispatchEvent(new CustomEvent('crm-courses-changed', { detail: updatedList }));
      window.dispatchEvent(new CustomEvent('crm-groups-changed'));
    } catch (e) {
      console.warn('Failed to save courses to localStorage:', e);
    }

    // Audit Trail
    recordClientAuditEvent({
      action: existingIndex >= 0 ? 'COURSE_UPDATE' : 'COURSE_CREATE',
      entityType: 'courses',
      entityId: normalized.id,
      entityNameSnapshot: normalized.name,
      description: existingIndex >= 0
        ? `Обновлен курс: «${normalized.name}» (${normalized.subject})`
        : `Создан новый курс: «${normalized.name}» (${normalized.subject})`,
      beforeData: existingIndex >= 0 ? current[existingIndex] : null,
      afterData: normalized,
    });

    // Background cloud sync to Supabase via /api/courses
    syncCourseToCloud(normalized).catch((err) => {
      console.warn('Background sync to /api/courses note:', err);
    });
  }

  return normalized;
}

/**
 * Alias to saveCourse for test runner compatibility.
 */
export function saveCourseToStorage(course: CourseDirection): CourseDirection {
  return saveCourse(course);
}

/**
 * Deletes a course direction from storage by ID.
 */
export function deleteCourse(id: string): boolean {
  const current = getCourses();
  const targetCourse = current.find((c) => c.id === id);
  const filtered = current.filter((c) => c.id !== id);

  if (filtered.length === current.length) {
    return false;
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('crm-courses-changed', { detail: filtered }));
      window.dispatchEvent(new CustomEvent('crm-groups-changed'));
    } catch (e) {
      console.warn('Failed to delete course in localStorage:', e);
    }

    // Audit Trail
    recordClientAuditEvent({
      action: 'COURSE_DELETE',
      entityType: 'courses',
      entityId: id,
      entityNameSnapshot: targetCourse?.name || id,
      description: `Удален курс: «${targetCourse?.name || id}»`,
      beforeData: targetCourse,
    });

    syncDeletionToCloud(id).catch((err) => {
      console.warn('Background sync delete note:', err);
    });
  }

  return true;
}

/**
 * Alias to deleteCourse for test runner compatibility.
 */
export function deleteCourseFromStorage(id: string): boolean {
  return deleteCourse(id);
}

/**
 * Archives (or unarchives) a course direction by ID.
 */
export function archiveCourse(id: string): CourseDirection | null {
  const course = getCourseById(id);
  if (!course) return null;

  const newStatus: CourseStatus = course.status === 'active' ? 'archived' : 'active';
  const updated = saveCourse({
    ...course,
    status: newStatus,
    is_active: newStatus === 'active',
    isActive: newStatus === 'active',
  });

  recordClientAuditEvent({
    action: newStatus === 'archived' ? 'COURSE_ARCHIVE' : 'COURSE_UNARCHIVE',
    entityType: 'courses',
    entityId: id,
    entityNameSnapshot: course.name,
    description: newStatus === 'archived'
      ? `Курс «${course.name}» перемещен в архив`
      : `Курс «${course.name}» восстановлен из архива`,
    beforeData: course,
    afterData: updated,
  });

  return updated;
}

/**
 * Helper to search and filter course directions.
 */
export function searchCourses(
  query: string,
  options?: {
    subject?: string;
    format?: CourseFormat | 'all';
    status?: CourseStatus | 'all';
  }
): CourseDirection[] {
  const courses = getCourses();
  const q = (query || '').trim().toLowerCase();

  return courses.filter((c) => {
    if (q) {
      const matchName = c.name.toLowerCase().includes(q);
      const matchSubject = c.subject.toLowerCase().includes(q);
      const matchDesc = (c.description || '').toLowerCase().includes(q);
      if (!matchName && !matchSubject && !matchDesc) return false;
    }

    if (options?.subject && options.subject !== 'all' && options.subject !== 'Все') {
      if (c.subject !== options.subject) return false;
    }

    if (options?.format && options.format !== 'all' && options.format !== ('Все' as any)) {
      if (c.format !== options.format) return false;
    }

    if (options?.status && options.status !== 'all' && options.status !== ('Все' as any)) {
      if (c.status !== options.status) return false;
    }

    return true;
  });
}

/**
 * Resets course catalog to default 26 directions.
 */
export function resetCoursesToDefault(): CourseDirection[] {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(INITIAL_COURSE_DIRECTIONS));
      window.dispatchEvent(new CustomEvent('crm-courses-changed', { detail: INITIAL_COURSE_DIRECTIONS }));
    } catch {}
  }
  return INITIAL_COURSE_DIRECTIONS;
}

/**
 * Background synchronization with server /api/courses
 */
async function syncCourseToCloud(course: CourseDirection): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        course: {
          id: course.id,
          name: course.name,
          subject: course.subject,
          description: course.description,
          target_age: course.ageGroup,
          price_monthly: course.tariffs[1]?.packagePrice || course.tariffs[0]?.packagePrice || 120,
          lesson_duration_minutes: course.lessonDurationMinutes,
          max_students: course.capacity,
          is_active: course.status === 'active',
        },
      }),
    });
  } catch (err) {
    console.warn('Cloud sync error for course', course.name, err);
  }
}

/**
 * Background cloud deletion sync with /api/courses
 */
async function syncDeletionToCloud(id: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch(`/api/courses?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Cloud sync error deleting course', id, err);
  }
}

/**
 * Loads courses from Supabase via /api/courses if online,
 * falls back to localStorage SSOT.
 */
export async function loadCoursesFromCloud(): Promise<CourseDirection[]> {
  if (typeof window === 'undefined') return INITIAL_COURSE_DIRECTIONS;
  try {
    const res = await fetch('/api/courses');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.courses) && data.courses.length > 0) {
        const normalized = data.courses.map(normalizeCourseDirection);
        localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(normalized));
        window.dispatchEvent(new CustomEvent('crm-courses-changed', { detail: normalized }));
        return normalized;
      }
    }
  } catch (err) {
    console.warn('Failed to load courses from cloud, falling back to localStorage:', err);
  }
  return getCourses();
}
