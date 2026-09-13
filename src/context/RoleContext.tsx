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
  userName: string;
  setUserName: (name: string) => void;
  userEmail: string;
  setUserEmail: (email: string) => void;
  userPhone: string;
  setUserPhone: (phone: string) => void;
  userTelegram: string;
  setUserTelegram: (tg: string) => void;
  isOwner: boolean;
  updateProfile: (updates: Partial<UserProfileData>) => Promise<void>;
}

const DEFAULT_PROFILE: UserProfileData = {
  role: 'owner',
  userName: 'Алексей Смирнов',
  userEmail: 'admin@smartacademy.ru',
  userPhone: '+7 (999) 123-45-67',
  userTelegram: '@alex_smart',
};

const STORAGE_KEY = 'crm_user_profile_v1';
const ROLE_KEY = 'crm_active_role';

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>(DEFAULT_PROFILE.role);
  const [accountRole, setAccountRole] = useState<UserRole>('owner');
  const [isOwnerAccount, setIsOwnerAccount] = useState(true);
  const [userName, setUserNameState] = useState(DEFAULT_PROFILE.userName);
  const [userEmail, setUserEmailState] = useState(DEFAULT_PROFILE.userEmail);
  const [userPhone, setUserPhoneState] = useState(DEFAULT_PROFILE.userPhone);
  const [userTelegram, setUserTelegramState] = useState(DEFAULT_PROFILE.userTelegram);
  const [isOwner, setIsOwner] = useState(true);

  // 1. Initial hydration from localStorage (guarantee persistent active role across the entire app)
  useEffect(() => {
    try {
      const explicitRole = localStorage.getItem(ROLE_KEY) as UserRole | null;
      const saved = localStorage.getItem(STORAGE_KEY);
      let initialRole: UserRole = DEFAULT_PROFILE.role;

      if (explicitRole && ['owner', 'admin', 'teacher'].includes(explicitRole)) {
        initialRole = explicitRole;
      } else if (saved) {
        const parsed = JSON.parse(saved) as Partial<UserProfileData>;
        if (parsed.role && ['owner', 'admin', 'teacher'].includes(parsed.role)) {
          initialRole = parsed.role;
        }
      }

      setRoleState(initialRole);
      setIsOwner(initialRole === 'owner');

      if (saved) {
        const parsed = JSON.parse(saved) as Partial<UserProfileData>;
        if (parsed.userName) setUserNameState(parsed.userName);
        if (parsed.userEmail) setUserEmailState(parsed.userEmail);
        if (parsed.userPhone) setUserPhoneState(parsed.userPhone);
        if (parsed.userTelegram) setUserTelegramState(parsed.userTelegram);
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
        if (['owner', 'admin', 'teacher'].includes(newRole)) {
          setRoleState(newRole);
          setIsOwner(newRole === 'owner');
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
      const dbRole = (profile.role as UserRole) || 'owner';
      setAccountRole(dbRole);
      setIsOwnerAccount(dbRole === 'owner');

      // Only overwrite active role if no manual role was chosen by the user
      if (!savedRole) {
        setRoleState(dbRole);
        setIsOwner(dbRole === 'owner');
      }
      if (profile.full_name) setUserNameState(profile.full_name);
      if (profile.phone) setUserPhoneState(profile.phone);
    } else {
      const metaRole = (user.user_metadata?.role as UserRole) || 'owner';
      const metaName = user.user_metadata?.full_name || user.email || '';
      setAccountRole(metaRole);
      setIsOwnerAccount(metaRole === 'owner');

      if (!savedRole) {
        setRoleState(metaRole);
        setIsOwner(metaRole === 'owner');
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
    setRoleState(newRole);
    setIsOwner(newRole === 'owner');
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
    if (updates.role !== undefined) {
      setRole(updates.role);
    }
    if (updates.userName !== undefined) setUserNameState(updates.userName);
    if (updates.userEmail !== undefined) setUserEmailState(updates.userEmail);
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

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        accountRole,
        isOwnerAccount,
        userName,
        setUserName,
        userEmail,
        setUserEmail,
        userPhone,
        setUserPhone,
        userTelegram,
        setUserTelegram,
        isOwner,
        updateProfile,
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
