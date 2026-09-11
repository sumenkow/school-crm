'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types';

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  userName: string;
  userEmail: string;
  isOwner: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('teacher');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserEmail(user.email ?? '');

      // Try to get profile from DB
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single();

      if (profile) {
        const dbRole = profile.role as UserRole;
        setRoleState(dbRole);
        setIsOwner(dbRole === 'owner');
        setUserName(profile.full_name || user.email || '');
      } else {
        // Fallback: use user_metadata (set during invite)
        const metaRole = (user.user_metadata?.role as UserRole) || 'teacher';
        const metaName = user.user_metadata?.full_name || user.email || '';
        setRoleState(metaRole);
        setIsOwner(metaRole === 'owner');
        setUserName(metaName);
      }
    }

    loadUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Owners can switch view role (to see CRM as admin/teacher)
  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
  };

  return (
    <RoleContext.Provider value={{ role, setRole, userName, userEmail, isOwner }}>
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
