'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types';

export interface UserProfileData {
  role: UserRole;
  userName: string;
  userEmail: string;
  userPhone: string;
  userTelegram: string;
}

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  accountRole: UserRole;
  isOwnerAccount: boolean;
  isDevAccount: boolean;
  userName: string;
  setUserName: (name: string) => void;
  userEmail: string;
  setUserEmail: (email: string) => void;
  userPhone: string;
  setUserPhone: (phone: string) => void;
  userTelegram: string;
  setUserTelegram: (tg: string) => void;
  isOwner: boolean;
  ownerEmail: string;
  updateProfile: (updates: Partial<UserProfileData>) => Promise<void>;
  signOut: () => Promise<void>;
}

const DEFAULT_PROFILE: UserProfileData = {
  role: 'teacher',
  userName: 'Сотрудник школы',
  userEmail: '',
  userPhone: '',
  userTelegram: '',
};

const STORAGE_KEY = 'crm_user_profile_v1';
const ROLE_KEY = 'crm_active_role';
const OWNER_EMAIL_KEY = 'crm_owner_email';

export function getOwnerEmailFromStorage(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(OWNER_EMAIL_KEY);
    if (saved && saved.includes('@') && !saved.includes('smartacademy.ru')) return saved;
    if (saved && saved.includes('smartacademy.ru')) {
      localStorage.removeItem(OWNER_EMAIL_KEY);
    }
    try {
      const profileRaw = localStorage.getItem(STORAGE_KEY);
      if (profileRaw) {
        const p = JSON.parse(profileRaw);
        if (p.userEmail && p.userEmail.includes('@') && !p.userEmail.includes('smartacademy.ru')) return p.userEmail;
        if (p.userEmail && p.userEmail.includes('smartacademy.ru')) {
          p.userEmail = '';
          localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
        }
      }
    } catch {}
  }
  return DEFAULT_PROFILE.userEmail;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('teacher');
  const [accountRole, setAccountRole] = useState<UserRole>('teacher');
  const [isOwnerAccount, setIsOwnerAccount] = useState(false);
  const [isDevAccount, setIsDevAccount] = useState(false);
  const [userName, setUserNameState] = useState(DEFAULT_PROFILE.userName);
  const [userEmail, setUserEmailState] = useState(DEFAULT_PROFILE.userEmail);
  const [userPhone, setUserPhoneState] = useState(DEFAULT_PROFILE.userPhone);
  const [userTelegram, setUserTelegramState] = useState(DEFAULT_PROFILE.userTelegram);
  const [isOwner, setIsOwner] = useState(false);
  const [ownerEmail, setOwnerEmailState] = useState<string>(DEFAULT_PROFILE.userEmail);

  // 1. Initial hydration & sanitization from storage
  useEffect(() => {
    try {
      // Auto-purge any leftover legacy test emails
      const oldOwner = localStorage.getItem(OWNER_EMAIL_KEY);
      if (oldOwner && oldOwner.includes('smartacademy.ru')) {
        localStorage.removeItem(OWNER_EMAIL_KEY);
      }

      const explicitRole = localStorage.getItem(ROLE_KEY) as UserRole | null;
      const saved = localStorage.getItem(STORAGE_KEY);
      let initialRole: UserRole = DEFAULT_PROFILE.role;

      if (explicitRole && ['developer', 'owner', 'admin', 'teacher'].includes(explicitRole)) {
        initialRole = explicitRole;
      } else if (saved) {
        const parsed = JSON.parse(saved) as Partial<UserProfileData>;
        if (parsed.role && ['developer', 'owner', 'admin', 'teacher'].includes(parsed.role)) {
          initialRole = parsed.role;
        }
      }

      setRoleState(initialRole);
      setIsOwner(initialRole === 'owner');

      const resolvedOwner = getOwnerEmailFromStorage();
      setOwnerEmailState(resolvedOwner);

      if (saved) {
        const parsed = JSON.parse(saved) as Partial<UserProfileData>;
        if (parsed.userName && !parsed.userName.includes('Смирнов')) setUserNameState(parsed.userName);
        if (parsed.userEmail && !parsed.userEmail.includes('smartacademy.ru')) {
          setUserEmailState(parsed.userEmail);
          if (initialRole === 'owner') {
            setOwnerEmailState(parsed.userEmail);
            localStorage.setItem(OWNER_EMAIL_KEY, parsed.userEmail);
          }
        } else if (parsed.userEmail && parsed.userEmail.includes('smartacademy.ru')) {
          parsed.userEmail = '';
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          setUserEmailState('');
        }
        if (parsed.userPhone && !parsed.userPhone.includes('999) 123')) setUserPhoneState(parsed.userPhone);
        if (parsed.userTelegram && !parsed.userTelegram.includes('alex_smart')) setUserTelegramState(parsed.userTelegram);
      }
    } catch {
      // Fallback to default
    }
  }, []);

  // Sync across tabs / windows
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === ROLE_KEY && e.newValue) {
        const newRole = e.newValue as UserRole;
        if (['developer', 'owner', 'admin', 'teacher'].includes(newRole)) {
          setRoleState(newRole);
          setIsOwner(newRole === 'owner' || newRole === 'developer');
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // 2. Load from Supabase if session exists
  const loadUser = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (user.email) setUserEmailState(user.email);

    // Try to get profile from DB
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name, phone')
      .eq('id', user.id)
      .single();

    // Check if user has an explicit role selected in localStorage
    let savedRole: UserRole | null = null;
    try {
      const explicitRole = localStorage.getItem(ROLE_KEY) as UserRole | null;
      if (explicitRole && ['owner', 'admin', 'teacher'].includes(explicitRole)) {
        savedRole = explicitRole;
      } else {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<UserProfileData>;
          if (parsed.role && ['owner', 'admin', 'teacher'].includes(parsed.role)) {
            savedRole = parsed.role;
          }
        }
      }
    } catch {}

    if (profile) {
      const dbRole = (profile.role as UserRole) || 'teacher';
      const isOwnerOrDev = dbRole === 'owner' || dbRole === 'developer';
      setAccountRole(dbRole);
      setIsOwnerAccount(isOwnerOrDev);
      setIsDevAccount(dbRole === 'developer');

      // Non-owners MUST strictly use their DB role
      if (isOwnerOrDev && savedRole) {
        setRoleState(savedRole);
        setIsOwner(savedRole === 'owner' || savedRole === 'developer');
      } else {
        setRoleState(dbRole);
        setIsOwner(isOwnerOrDev);
      }
      if (profile.full_name) setUserNameState(profile.full_name);
      if (profile.phone) setUserPhoneState(profile.phone);
    } else {
      const metaRole = (user.user_metadata?.role as UserRole) || 'teacher';
      const metaName = user.user_metadata?.full_name || user.email || '';
      const isOwnerOrDev = metaRole === 'owner' || metaRole === 'developer';
      setAccountRole(metaRole);
      setIsOwnerAccount(isOwnerOrDev);
      setIsDevAccount(metaRole === 'developer');

      if (isOwnerOrDev && savedRole) {
        setRoleState(savedRole);
        setIsOwner(savedRole === 'owner' || savedRole === 'developer');
      } else {
        setRoleState(metaRole);
        setIsOwner(isOwnerOrDev);
      }
      if (metaName) setUserNameState(metaName);
    }
  }, []);

  useEffect(() => {
    loadUser();

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => subscription.unsubscribe();
  }, [loadUser]);

  const setRole = (newRole: UserRole) => {
    // Only owner or developer account can change or switch role
    if (!isOwnerAccount && !isDevAccount && accountRole !== 'owner' && accountRole !== 'developer') {
      console.warn('Только владелец или разработчик может изменять роль');
      return;
    }
    setRoleState(newRole);
    setIsOwner(newRole === 'owner' || newRole === 'developer');
    try {
      localStorage.setItem(ROLE_KEY, newRole);
      const current = localStorage.getItem(STORAGE_KEY);
      const data = current ? JSON.parse(current) : DEFAULT_PROFILE;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, role: newRole }));
      document.cookie = `crm_role=${newRole}; path=/; max-age=31536000; SameSite=Lax`;
      window.dispatchEvent(new CustomEvent('crm-role-changed', { detail: { role: newRole } }));
    } catch {}

    // Sync to Supabase in background
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
        }
      }).catch(() => {});
    } catch {}
  };

  const setUserName = (name: string) => {
    setUserNameState(name);
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      const data = current ? JSON.parse(current) : {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, userName: name }));
    } catch {}
  };

  const setUserEmail = (email: string) => {
    setUserEmailState(email);
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      const data = current ? JSON.parse(current) : {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, userEmail: email }));
    } catch {}
  };

  const setUserPhone = (phone: string) => {
    setUserPhoneState(phone);
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      const data = current ? JSON.parse(current) : {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, userPhone: phone }));
    } catch {}
  };

  const setUserTelegram = (tg: string) => {
    setUserTelegramState(tg);
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      const data = current ? JSON.parse(current) : {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, userTelegram: tg }));
    } catch {}
  };

  const updateProfile = async (updates: Partial<UserProfileData>) => {
    // Non-owner accounts cannot change their role
    if (updates.role !== undefined) {
      if (isOwnerAccount || isDevAccount || accountRole === 'owner' || accountRole === 'developer') {
        setRole(updates.role);
      } else {
        delete updates.role;
      }
    }
    if (updates.userName !== undefined) setUserNameState(updates.userName);
    if (updates.userEmail !== undefined) {
      setUserEmailState(updates.userEmail);
      if (isOwnerAccount || accountRole === 'owner' || updates.role === 'owner' || role === 'owner') {
        setOwnerEmailState(updates.userEmail);
        try {
          localStorage.setItem(OWNER_EMAIL_KEY, updates.userEmail);
        } catch {}
      }
    }
    if (updates.userPhone !== undefined) setUserPhoneState(updates.userPhone);
    if (updates.userTelegram !== undefined) setUserTelegramState(updates.userTelegram);

    // Save to localStorage
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      const data = current ? JSON.parse(current) : DEFAULT_PROFILE;
      const updated = { ...data, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    // Save to Supabase if session active
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (updates.userName) {
          await supabase.auth.updateUser({ data: { full_name: updates.userName } });
        }
        await supabase.from('profiles').update({
          full_name: updates.userName,
          phone: updates.userPhone,
          role: updates.role,
        }).eq('id', user.id);
      }
    } catch {
      // Offline/demo fallback
    }
  };

  const signOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}
    // Clear local state
    try {
      localStorage.removeItem(ROLE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    window.location.href = '/login';
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        accountRole,
        isOwnerAccount,
        isDevAccount,
        userName,
        setUserName,
        userEmail,
        setUserEmail,
        userPhone,
        setUserPhone,
        userTelegram,
        setUserTelegram,
        isOwner,
        ownerEmail,
        updateProfile,
        signOut,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
