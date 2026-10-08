'use client';

import { FullSubscriptionData, INITIAL_SUBSCRIPTIONS } from './mockData';

const SUBSCRIPTIONS_STORAGE_KEY = 'crm_subscriptions_v1';

export function getStoredSubscriptions(): FullSubscriptionData[] {
  if (typeof window === 'undefined') {
    return INITIAL_SUBSCRIPTIONS;
  }

  try {
    const raw = localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
    if (!raw) {
      return INITIAL_SUBSCRIPTIONS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return INITIAL_SUBSCRIPTIONS;
    }

    const seenIds = new Set<string>();
    const result: FullSubscriptionData[] = [];

    for (const s of parsed) {
      if (s && s.id && !seenIds.has(s.id)) {
        seenIds.add(s.id);
        result.push(s);
      }
    }

    for (const initSub of INITIAL_SUBSCRIPTIONS) {
      if (!seenIds.has(initSub.id)) {
        seenIds.add(initSub.id);
        result.push(initSub);
      }
    }

    return result;
  } catch (err) {
    console.error('Failed to get stored subscriptions:', err);
    return INITIAL_SUBSCRIPTIONS;
  }
}

export function saveSubscriptionToStorage(sub: FullSubscriptionData): void {
  const current = getStoredSubscriptions();
  const idx = current.findIndex((s) => s.id === sub.id);

  if (idx !== -1) {
    current[idx] = sub;
  } else {
    current.unshift(sub);
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(current));
      window.dispatchEvent(new CustomEvent('crm-subscriptions-changed', { detail: sub }));
    } catch (err) {
      console.error('Failed to save subscription:', err);
    }
  }
}

export function freezeSubscriptionInStorage(id: string): FullSubscriptionData | undefined {
  const current = getStoredSubscriptions();
  const target = current.find((s) => s.id === id);
  if (!target) return undefined;

  target.status = target.status === 'frozen' ? 'active' : 'frozen';

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(current));
      window.dispatchEvent(new CustomEvent('crm-subscriptions-changed', { detail: target }));
    } catch (err) {
      console.error('Failed to freeze subscription:', err);
    }
  }

  return target;
}
