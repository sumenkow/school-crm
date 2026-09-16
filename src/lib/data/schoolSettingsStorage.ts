'use client';

import { createClient } from '@/lib/supabase/client';

export interface SchoolProfileData {
  name: string;
  slogan: string;
  legalEntity: string;
  inn: string;
  ogrn: string;
  bankAccount: string;
  bankName: string;
  bik: string;
  phone: string;
  email: string;
  branchName: string;
  address: string;
  roomsDescription: string;
  workHours: string;
  timezone: string;
}

export const DEFAULT_SCHOOL_PROFILE: SchoolProfileData = {
  name: 'Smart Academy',
  slogan: 'Центр детского развития, робототехники и языков',
  legalEntity: 'ИП Смирнов Алексей Владимирович',
  inn: '770123456789',
  ogrn: '321774600123456',
  bankAccount: '40802810100000012345',
  bankName: 'АО «ТБанк», БИК 044525974',
  bik: '044525974',
  phone: '+7 (495) 777-11-22',
  email: 'hello@smartacademy.ru',
  branchName: 'Онлайн-школа (Основной аккаунт)',
  address: 'Онлайн (Zoom, Google Meet, интерактивная доска)',
  roomsDescription: 'Интерактивные онлайн-комнаты',
  workHours: 'Пн-Сб 09:00 - 21:00',
  timezone: 'UTC+3 (Москва)',
};

const SCHOOL_SETTINGS_STORAGE_KEY = 'crm_school_profile_v1';

/**
 * Returns school profile settings from localStorage or fallback.
 */
export function getSchoolSettings(): SchoolProfileData {
  if (typeof window === 'undefined') return DEFAULT_SCHOOL_PROFILE;
  try {
    const raw = localStorage.getItem(SCHOOL_SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SCHOOL_PROFILE, ...parsed };
    }
  } catch (err) {
    console.error('Failed to parse school settings from storage:', err);
  }
  return DEFAULT_SCHOOL_PROFILE;
}

/**
 * Saves school settings to localStorage and dual-writes to Supabase.
 * Dispatches crm-school-settings-changed event.
 */
export function saveSchoolSettings(data: SchoolProfileData): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SCHOOL_SETTINGS_STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('crm-school-settings-changed', { detail: data }));

    // Supabase dual-write (fire and forget)
    import('@/lib/supabase/client').then(({ createClient }) => {
      try {
        const supabase = createClient();
        // Upsert into a generic settings key-value or metadata if available
        supabase.from('profiles').upsert({
          id: '00000000-0000-0000-0000-000000000001',
          full_name: data.legalEntity || data.name,
          role: 'owner',
          updated_at: new Date().toISOString(),
        }).then(() => {}, () => {});
      } catch {}
    }).catch(() => {});

  } catch (err) {
    console.error('Failed to save school settings:', err);
  }
}

/**
 * Retrieves all recipient emails for reports:
 * 1. Owner's user account email (from localStorage / user profile)
 * 2. School settings email (from school settings)
 */
export function getReportRecipientEmails(): {
  ownerEmail: string;
  schoolEmail: string;
  recipientList: string[];
} {
  let ownerEmail = 'admin@smartacademy.ru';
  if (typeof window !== 'undefined') {
    try {
      const explicit = localStorage.getItem('crm_owner_email');
      if (explicit && explicit.includes('@')) {
        ownerEmail = explicit;
      } else {
        const userProf = localStorage.getItem('crm_user_profile');
        if (userProf) {
          const parsed = JSON.parse(userProf);
          if (parsed.userEmail && parsed.userEmail.includes('@')) {
            ownerEmail = parsed.userEmail;
          }
        }
      }
    } catch {}
  }

  const schoolSettings = getSchoolSettings();
  const schoolEmail = schoolSettings.email || 'hello@smartacademy.ru';

  const recipientList = Array.from(new Set([ownerEmail, schoolEmail].filter((e) => e && e.includes('@'))));

  return {
    ownerEmail,
    schoolEmail,
    recipientList,
  };
}
