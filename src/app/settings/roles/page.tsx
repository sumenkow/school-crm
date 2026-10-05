'use client';

import React, { useState, useEffect } from 'react';
import { RolesCockpitView } from '@/components/team/RolesCockpitView';
import type { TeamMemberData } from '@/components/team/EmployeeDrawer';

export default function SettingsRolesPage() {
  const [members, setMembers] = useState<TeamMemberData[]>([]);

  useEffect(() => {
    async function loadMembers() {
      try {
        const res = await fetch('/api/auth/users');
        const data = await res.json();
        if (data?.users && Array.isArray(data.users)) {
          setMembers(data.users);
        } else {
          setMembers(DEFAULT_MEMBERS);
        }
      } catch {
        setMembers(DEFAULT_MEMBERS);
      }
    }
    loadMembers();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <RolesCockpitView showBreadcrumbs={true} members={members} />
    </div>
  );
}

const DEFAULT_MEMBERS: TeamMemberData[] = [
  {
    id: 'dc85bc52-d093-47b8-87aa-2b7bcce8eb74',
    email: 'sumenkow@gmail.com',
    full_name: 'Андрей Суменков',
    role: 'owner',
    phone: '+7 9817155337',
    is_active: true,
    created_at: '2026-09-11T15:26:22.938Z',
  },
  {
    id: '99fad934-1f35-4dd8-a1a5-3fadbca78588',
    email: 'nettkatrina@gmail.com',
    full_name: 'Екатерина Неженкина',
    role: 'admin',
    phone: '',
    is_active: true,
    created_at: '2026-10-01T11:13:50.960Z',
  },
  {
    id: '3ae66145-af9c-4e33-abae-5fb0226d29a7',
    email: 'zhanna@ya.ru',
    full_name: 'Жанна Аркадьевна',
    role: 'teacher',
    phone: '',
    is_active: true,
    created_at: '2026-09-19T20:42:05.805Z',
  },
  {
    id: '7885428d-cc63-4cbd-841e-a2fa7e601df8',
    email: 'petrova@avdotia.ru',
    full_name: 'Петрова Авдотья Петровна',
    role: 'teacher',
    phone: '',
    is_active: true,
    created_at: '2026-09-17T05:47:10.465Z',
  },
];
