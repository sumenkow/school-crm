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
  { id: 'price', label: 'Дорого / не устроила стоимость', emoji: '💸' },
  { id: 'schedule', label: 'Не устраивает расписание', emoji: '🕐' },
  { id: 'interest', label: 'Низкая посещаемость / потерял интерес', emoji: '😔' },
  { id: 'quality', label: 'Не устроило качество обучения', emoji: '📚' },
  { id: 'relocation', label: 'Переезд', emoji: '🏠' },
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
 * Retrieves all stored churn events from localStorage.
 */
export function getChurnEvents(): ChurnEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CHURN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
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
