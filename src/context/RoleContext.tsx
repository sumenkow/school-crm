'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '@/types';

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  userName: string;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('owner');
  const [userName, setUserName] = useState<string>('Александр Руководитель');

  useEffect(() => {
    const saved = localStorage.getItem('school_app_role') as UserRole;
    if (saved && (saved === 'owner' || saved === 'admin' || saved === 'teacher')) {
      setRoleState(saved);
      updateUserName(saved);
    }
  }, []);

  const updateUserName = (r: UserRole) => {
    if (r === 'owner') setUserName('Александр Руководитель');
    else if (r === 'admin') setUserName('Елена Менеджер');
    else setUserName('Мария Преподаватель');
  };

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem('school_app_role', newRole);
    updateUserName(newRole);
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
