'use client';

import React, { createContext, useContext, useState } from 'react';
import { UserRole } from '@/types';

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  userName: string;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

function getUserName(r: UserRole): string {
  if (r === 'owner') return 'Александр Руководитель';
  if (r === 'admin') return 'Елена Менеджер';
  return 'Мария Преподаватель';
}

function getInitialRole(): UserRole {
  if (typeof window === 'undefined') return 'owner';
  const saved = localStorage.getItem('school_app_role') as UserRole;
  if (saved === 'owner' || saved === 'admin' || saved === 'teacher') return saved;
  return 'owner';
}

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>(getInitialRole);
  const [userName, setUserName] = useState<string>(() => getUserName(getInitialRole()));

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem('school_app_role', newRole);
    setUserName(getUserName(newRole));
  };

  return (
    <RoleContext.Provider value={{ role, setRole, userName }}>
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
