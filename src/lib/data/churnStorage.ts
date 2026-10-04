/**
 * Churn Event Storage
 *
 * Причина ухода — структурированный атрибут события прекращения обучения.
 * НЕ является свободным текстом Timeline. Timeline визуализирует это событие,
 * но аналитика читает напрямую из этого реестра.
 */

export type ChurnReasonId =
  | 'price'
  | 'schedule'
  | 'interest'
  | 'quality'
  | 'relocation'
  | 'completed'
  | 'another_school'
  | 'financial'
  | 'family'
  | 'other';

export interface ChurnReason {
  id: ChurnReasonId;
  label: string;
  emoji: string;
}

export const CHURN_REASONS: ChurnReason[] = [
  { id: 'schedule', label: 'Не устроило расписание', emoji: '🕐' },
  { id: 'price', label: 'Высокая стоимость', emoji: '💸' },
  { id: 'interest', label: 'Потерял интерес', emoji: '😔' },
  { id: 'relocation', label: 'Переезд', emoji: '🏠' },
  { id: 'quality', label: 'Не устроило качество обучения', emoji: '📚' },
  { id: 'completed', label: 'Закончил обучение / достиг цели', emoji: '🎓' },
  { id: 'another_school', label: 'Перешёл в другую школу', emoji: '🏫' },
  { id: 'financial', label: 'Финансовые причины', emoji: '💰' },
  { id: 'family', label: 'По семейным обстоятельствам', emoji: '👨‍👩‍👧' },
  { id: 'other', label: 'Другое', emoji: '📝' },
];

export interface ChurnEvent {
  id: string;
  studentId: string;
  studentName: string;
  occurredAt: string; // ISO 8601
  previousStatus: string;
  newStatus: string;
  churnReasonId: ChurnReasonId;
  churnComment?: string;
  author: string;
}

export const CHURN_STORAGE_KEY = 'crm_churn_events_v1';

/**
 * 22 structured initial churn events for September 2026.
 * 14 active students, 5 trial, 3 paused.
 * Distribution: 7 schedule, 5 price, 4 interest, 3 relocation, 2 quality, 1 other.
 */
export const INITIAL_CHURN_EVENTS: ChurnEvent[] = [
  // 1-7: Не устроило расписание (7 событий, 32%)
  {
    id: 'churn_2026_09_01',
    studentId: 'st_seed_01',
    studentName: 'Артём Григорьев',
    occurredAt: '2026-09-03T11:20:00.000Z',
    previousStatus: 'active',
    newStatus: 'archived',
    churnReasonId: 'schedule',
    churnComment: 'Не подходит время занятий после перехода на вторую смену в школе',
    author: 'Ольга Смирнова (Куратор)',
  },
  {
    id: 'churn_2026_09_02',
    studentId: 'st_seed_02',
    studentName: 'Дарья Новикова',
    occurredAt: '2026-09-06T15:45:00.000Z',
    previousStatus: 'active',
    newStatus: 'archived',
    churnReasonId: 'schedule',
    churnComment: 'Начались тренировки по плаванию в те же дни',
    author: 'Анна Иванова (Администратор)',
  },
  {
    id: 'churn_2026_09_03',
    studentId: 'st_seed_03',
    studentName: 'Максим Лебедев',
    occurredAt: '2026-09-09T09:30:00.000Z',
    previousStatus: 'active',
    newStatus: 'archived',
    churnReasonId: 'schedule',
    churnComment: 'Просили перенести группу на субботу, мест нет',
    author: 'Ольга Смирнова (Куратор)',
  },
  {
    id: 'churn_2026_09_04',
    studentId: 'st_seed_04',
    studentName: 'Полина Козлова',
    occurredAt: '2026-09-12T14:10:00.000Z',
    previousStatus: 'active',
    newStatus: 'archived',
    churnReasonId: 'schedule',
    churnComment: 'Слишком позднее время окончания уроков в 19:30',
    author: 'Алексей Павлов (Администратор)',
  },
  {
    id: 'churn_2026_09_05',
    studentId: 'st_seed_05',
    studentName: 'Никита Макаров',
    occurredAt: '2026-09-16T17:00:00.000Z',
    previousStatus: 'active',
    newStatus: 'archived',
    churnReasonId: 'schedule',
    churnComment: 'Накладка с музыкальной школой по вторникам',
    author: 'Анна Иванова (Администратор)',
  },
  {
    id: 'churn_2026_09_06',
    studentId: 'st_seed_06',
    studentName: 'София Зайцева',
    occurredAt: '2026-09-20T12:15:00.000Z',
    previousStatus: 'active',
    newStatus: 'archived',
    churnReasonId: 'schedule',
    churnComment: 'Хотели заниматься утром, группа только вечерняя',
    author: 'Ольга Смирнова (Куратор)',
  },
  {
    id: 'churn_2026_09_07',
    studentId: 'st_seed_07',
    studentName: 'Даниил Соловьёв',
    occurredAt: '2026-09-24T18:40:00.000Z',
    previousStatus: 'trial',
    newStatus: 'archived',
    churnReasonId: 'schedule',
    churnComment: 'После пробного урока не смогли подобрать время для группы',
    author: 'Алексей Павлов (Администратор)',
  },

  // 8-12: Высокая стоимость (5 событий, 23%)
  {
    id: 'churn_2026_09_08',
    studentId: 'st_seed_08',
    studentName: 'Виктория Павлова',
    occurredAt: '2026-09-04T16:20:00.000Z',
    previousStatus: 'active',
    newStatus: 'archived',
    churnReasonId: 'price',
    churnComment: 'Повышение стоимости абонемента с сентября оказалось накладным',
    author: 'Ольга Смирнова (Куратор)',
  },
  {
    id: 'churn_2026_09_09',
    studentId: 'st_seed_09',
    studentName: 'Матвей Семёнов',
    occurredAt: '2026-09-08T10:50:00.000Z',
    previousStatus: 'active',
    newStatus: 'archived',
    churnReasonId: 'price',
    churnComment: 'В семье двое детей, искали скидку на второго ребенка',
    author: 'Анна Иванова (Администратор)',
  },
  {
    id: 'churn_2026_09_10',
    studentId: 'st_seed_10',
    studentName: 'Ксения Голубева',
    occurredAt: '2026-09-14T13:30:00.000Z',
    previousStatus: 'active',
    newStatus: 'archived',
    churnReasonId: 'price',
    churnComment: 'Выбрали более дешевые онлайн-курсы',
    author: 'Ольга Смирнова (Куратор)',
  },
  {
    id: 'churn_2026_09_11',
    studentId: 'st_seed_11',
    studentName: 'Тимофей Виноградов',
    occurredAt: '2026-09-19T11:00:00.000Z',
    previousStatus: 'trial',
    newStatus: 'archived',
    churnReasonId: 'price',
    churnComment: 'После пробного озвучили бюджет ниже стоимости курса',
    author: 'Алексей Павлов (Администратор)',
  },
  {
    id: 'churn_2026_09_12',
    studentId: 'st_seed_12',
    studentName: 'Алиса Богданова',
    occurredAt: '2026-09-25T15:10:00.000Z',
    previousStatus: 'trial',
    newStatus: 'archived',
    churnReasonId: 'price',
    churnComment: 'Не готовы оплачивать абонемент на 8 занятий сразу',
    author: 'Анна Иванова (Администратор)',
  },

  // 13-16: Потерял интерес (4 события, 18%)
  {
    id: 'churn_2026_09_13',
    studentId: 'st_seed_13',
    studentName: 'Егор Воробьёв',
    occurredAt: '2026-09-05T14:40:00.000Z',
    previousStatus: 'active',
    newStatus: 'archived',
    churnReasonId: 'interest',
    churnComment: 'Ребенок перестал хотеть ходить на занятия по робототехнике',
    author: 'Ольга Смирнова (Куратор)',
  },
  {
    id: 'churn_2026_09_14',
    studentId: 'st_seed_14',
    studentName: 'Варвара Фёдорова',
    occurredAt: '2026-09-11T12:00:00.000Z',
    previousStatus: 'active',
    newStatus: 'archived',
    churnReasonId: 'interest',
    churnComment: 'Было сложно на математике, пропала мотивация',
    author: 'Анна Иванова (Администратор)',
  },
  {
    id: 'churn_2026_09_15',
    studentId: 'st_seed_15',
    studentName: 'Роман Михайлов',
    occurredAt: '2026-09-17T16:30:00.000Z',
    previousStatus: 'paused',
    newStatus: 'archived',
    churnReasonId: 'interest',
    churnComment: 'Были на заморозке 3 недели, решили не продолжать',
    author: 'Ольга Смирнова (Куратор)',
  },
  {
    id: 'churn_2026_09_16',
    studentId: 'st_seed_16',
    studentName: 'Милана Беляева',
    occurredAt: '2026-09-23T10:20:00.000Z',
    previousStatus: 'trial',
    newStatus: 'archived',
    churnReasonId: 'interest',
    churnComment: 'Не увлек формат группового урока',
    author: 'Алексей Павлов (Администратор)',
  },

  // 17-19: Переезд (3 события, 14%)
  {
    id: 'churn_2026_09_17',
    studentId: 'st_seed_17',
    studentName: 'Кирилл Тарасов',
    occurredAt: '2026-09-07T11:00:00.000Z',
    previousStatus: 'active',
    newStatus: 'archived',
    churnReasonId: 'relocation',
    churnComment: 'Переехали в другой район города, далеко возить',
    author: 'Анна Иванова (Администратор)',
  },
  {
    id: 'churn_2026_09_18',
    studentId: 'st_seed_18',
    studentName: 'Ульяна Мельникова',
    occurredAt: '2026-09-15T15:50:00.000Z',
    previousStatus: 'active',
    newStatus: 'archived',
    churnReasonId: 'relocation',
    churnComment: 'Переезд семьи в другой город',
    author: 'Ольга Смирнова (Куратор)',
  },
  {
    id: 'churn_2026_09_19',
    studentId: 'st_seed_19',
    studentName: 'Глеб Белов',
    occurredAt: '2026-09-27T13:10:00.000Z',
    previousStatus: 'paused',
    newStatus: 'archived',
    churnReasonId: 'relocation',
    churnComment: 'Сменили школу и место жительства',
    author: 'Алексей Павлов (Администратор)',
  },

  // 20-21: Не устроило качество обучения (2 события, 9%)
  {
    id: 'churn_2026_09_20',
    studentId: 'st_seed_20',
    studentName: 'Ярослав Комаров',
    occurredAt: '2026-09-10T17:15:00.000Z',
    previousStatus: 'active',
    newStatus: 'archived',
    churnReasonId: 'quality',
    churnComment: 'Родители хотели больше индивидуального внимания от педагога',
    author: 'Ольга Смирнова (Куратор)',
  },
  {
    id: 'churn_2026_09_21',
    studentId: 'st_seed_21',
    studentName: 'Арина Давыдова',
    occurredAt: '2026-09-22T14:45:00.000Z',
    previousStatus: 'trial',
    newStatus: 'archived',
    churnReasonId: 'quality',
    churnComment: 'Показалось, что программа слишком медленно идет для ее уровня',
    author: 'Анна Иванова (Администратор)',
  },

  // 22: Другое (1 событие, 4%)
  {
    id: 'churn_2026_09_22',
    studentId: 'st_seed_22',
    studentName: 'Фёдор Орлов',
    occurredAt: '2026-09-28T16:00:00.000Z',
    previousStatus: 'paused',
    newStatus: 'archived',
    churnReasonId: 'other',
    churnComment: 'Медицинские показания, временный запрет на экраны и нагрузки',
    author: 'Ольга Смирнова (Куратор)',
  },
];

/**
 * Retrieves all stored churn events from localStorage.
 * Initializes with INITIAL_CHURN_EVENTS if not set or empty.
 */
export function getChurnEvents(): ChurnEvent[] {
  if (typeof window === 'undefined') return INITIAL_CHURN_EVENTS;
  try {
    const raw = localStorage.getItem(CHURN_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CHURN_STORAGE_KEY, JSON.stringify(INITIAL_CHURN_EVENTS));
      return INITIAL_CHURN_EVENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_CHURN_EVENTS;
  } catch {
    return INITIAL_CHURN_EVENTS;
  }
}

/**
 * Adds a new churn event. On repeated churn of a returned student,
 * a NEW independent record is created (history is never overwritten).
 */
export function addChurnEvent(event: Omit<ChurnEvent, 'id'>): ChurnEvent {
  const newEvent: ChurnEvent = {
    ...event,
    id: `churn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  };

  if (typeof window === 'undefined') return newEvent;

  try {
    const existing = getChurnEvents();
    localStorage.setItem(CHURN_STORAGE_KEY, JSON.stringify([newEvent, ...existing]));
    window.dispatchEvent(new CustomEvent('crm-churn-events-changed', { detail: newEvent }));
  } catch {
    // Storage write failed silently
  }

  return newEvent;
}

/**
 * Retrieves churn events filtered by a period range (ISO date strings).
 */
export function getChurnEventsByPeriod(fromISO?: string, toISO?: string): ChurnEvent[] {
  const all = getChurnEvents();
  if (!fromISO && !toISO) return all;

  const from = fromISO ? new Date(fromISO).getTime() : 0;
  const to = toISO ? new Date(toISO).getTime() : Infinity;

  return all.filter((e) => {
    const t = new Date(e.occurredAt).getTime();
    return t >= from && t <= to;
  });
}

/**
 * Returns the human-readable label for a churn reason ID.
 */
export function getChurnReasonLabel(id: ChurnReasonId): string {
  return CHURN_REASONS.find((r) => r.id === id)?.label ?? 'Другое';
}

/**
 * Returns aggregated churn reason statistics sorted by count descending.
 */
export function aggregateChurnReasons(
  events: ChurnEvent[]
): Array<{ reason: ChurnReason; count: number; percent: number }> {
  if (events.length === 0) return [];

  const counts: Record<string, number> = {};
  events.forEach((e) => {
    counts[e.churnReasonId] = (counts[e.churnReasonId] || 0) + 1;
  });

  return CHURN_REASONS.map((reason) => ({
    reason,
    count: counts[reason.id] || 0,
    percent: Math.round(((counts[reason.id] || 0) / events.length) * 100),
  }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
}
