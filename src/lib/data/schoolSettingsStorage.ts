'use client';

import { createClient } from '@/lib/supabase/client';

export interface SchoolProfileData {
  name: string;
  slogan: string;
  description?: string;
  onlinePlatform?: string;
  logoUrl?: string;
  legalEntity: string;
  accountHolder?: string;
  inn: string;
  ogrn: string;
  bankAccount: string;
  iban?: string;
  swiftBic?: string;
  bankName: string;
  bik: string;
  phone: string;
  email: string;
  branchName?: string;
  address?: string;
  roomsDescription?: string;
  workHours: string;
  workDays?: string;
  calendarStartHour?: number;
  calendarEndHour?: number;
  timezone: string;
  currency?: string;
  vatNote?: string;
  nextInvoiceNumber?: number;
  schoolFormat?: 'online' | string;
}

export const DEFAULT_SCHOOL_PROFILE: SchoolProfileData = {
  name: 'You Europe',
  slogan: 'Центр европейского образования и подготовки',
  description: 'Онлайн-школа по подготовке к поступлению в вузы Германии и Австрии. Комплексные программы подготовки по немецкому языку, математике и профильным предметам.',
  onlinePlatform: 'Zoom',
  logoUrl: '',
  legalEntity: 'Ekaterina Nezhenkina',
  accountHolder: 'Ekaterina Nezhenkina',
  inn: '',
  ogrn: '',
  bankAccount: 'SK3411000000002937663128',
  iban: 'SK34 1100 0000 0029 3766 3128',
  swiftBic: 'TATRSKBX',
  bankName: 'Tatra banka, a.s.',
  bik: '1100',
  phone: '+7 981 715-53-37',
  email: 'info@youeurope.eu',
  branchName: 'Онлайн-школа',
  address: '',
  roomsDescription: 'Интерактивные онлайн-комнаты',
  workHours: 'Пн-Сб 09:00 - 21:00',
  workDays: 'Пн-Сб',
  calendarStartHour: 9,
  calendarEndHour: 21,
  timezone: 'UTC+1 (Братислава / Вена)',
  currency: 'EUR',
  vatNote: 'Nicht umsatzsteuerpflichtig / Neplátiteľ DPH',
  nextInvoiceNumber: 20260342,
  schoolFormat: 'online',
};

const SCHOOL_SETTINGS_STORAGE_KEY = 'crm_school_profile_v1';

/**
 * Returns school profile settings from cloud DB / storage, filtering out legacy placeholder emails.
 */
export function getSchoolSettings(): SchoolProfileData {
  if (typeof window === 'undefined') return DEFAULT_SCHOOL_PROFILE;
  try {
    const raw = localStorage.getItem(SCHOOL_SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.email && parsed.email.includes('smartacademy.ru')) {
        parsed.email = '';
        localStorage.setItem(SCHOOL_SETTINGS_STORAGE_KEY, JSON.stringify(parsed));
      }
      return {
        ...DEFAULT_SCHOOL_PROFILE,
        ...parsed,
        schoolFormat: 'online',
        currency: 'EUR',
        calendarStartHour: parsed.calendarStartHour != null && !isNaN(Number(parsed.calendarStartHour)) && Number(parsed.calendarStartHour) > 0
          ? Number(parsed.calendarStartHour)
          : DEFAULT_SCHOOL_PROFILE.calendarStartHour,
        calendarEndHour: parsed.calendarEndHour != null && !isNaN(Number(parsed.calendarEndHour)) && Number(parsed.calendarEndHour) > 0
          ? Number(parsed.calendarEndHour)
          : DEFAULT_SCHOOL_PROFILE.calendarEndHour,
      };
    }
  } catch (err) {
    console.error('Failed to parse school settings from storage:', err);
  }
  return DEFAULT_SCHOOL_PROFILE;
}

/**
 * Asynchronously loads the latest school profile from cloud database / API.
 */
export async function fetchSchoolSettingsFromCloud(): Promise<SchoolProfileData> {
  if (typeof window === 'undefined') return DEFAULT_SCHOOL_PROFILE;

  try {
    const res = await fetch('/api/school/settings');
    if (res.ok) {
      const json = await res.json();
      if (json.schoolSettings) {
        const merged = { ...DEFAULT_SCHOOL_PROFILE, ...json.schoolSettings };
        localStorage.setItem(SCHOOL_SETTINGS_STORAGE_KEY, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent('crm-school-settings-changed', { detail: merged }));
        return merged;
      }
    }
  } catch (err) {
    console.warn('Cloud school settings fetch warning:', err);
  }

  return getSchoolSettings();
}

/**
 * Saves school settings to localStorage and persists to Supabase cloud DB.
 * Dispatches crm-school-settings-changed event.
 */
export function saveSchoolSettings(data: SchoolProfileData): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SCHOOL_SETTINGS_STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('crm-school-settings-changed', { detail: data }));

    // 1. Send to cloud API route
    fetch('/api/school/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolSettings: data,
      }),
    }).catch((err) => console.warn('Cloud API save error:', err));

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
  const schoolSettings = getSchoolSettings();
  const schoolEmail = schoolSettings.email && !schoolSettings.email.includes('smartacademy.ru') ? schoolSettings.email : '';
  let ownerEmail = schoolEmail;

  if (typeof window !== 'undefined') {
    try {
      const explicit = localStorage.getItem('crm_owner_email');
      if (explicit && explicit.includes('@') && !explicit.includes('smartacademy.ru')) {
        ownerEmail = explicit;
      } else {
        const userProf = localStorage.getItem('crm_user_profile_v1') || localStorage.getItem('crm_user_profile');
        if (userProf) {
          const parsed = JSON.parse(userProf);
          if (parsed.userEmail && parsed.userEmail.includes('@') && !parsed.userEmail.includes('smartacademy.ru')) {
            ownerEmail = parsed.userEmail;
          }
        }
      }
    } catch {}
  }

  const recipientList = Array.from(
    new Set([ownerEmail, schoolEmail].filter((e) => Boolean(e && e.includes('@') && !e.includes('smartacademy.ru'))))
  );

  return {
    ownerEmail: ownerEmail || schoolEmail || '',
    schoolEmail: schoolEmail || ownerEmail || '',
    recipientList,
  };
}
