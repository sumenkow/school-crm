'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import { TeacherWorkspaceView } from '@/features/teacher/components/TeacherWorkspaceView';

export default function TeacherWorkspacePage() {
  const router = useRouter();
  const { role, isOwnerAccount, isDevAccount } = useRole();

  const isAuthorized = role === 'teacher' || isOwnerAccount || isDevAccount;

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
          <ShieldAlert className="h-8 w-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Доступ ограничен</h2>
        <p className="text-sm text-slate-500 max-w-md">
          Данный раздел предназначен исключительно для учетных записей с ролью «Преподаватель».
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
        >
          Вернуться на главную
        </button>
      </div>
    );
  }

  return <TeacherWorkspaceView />;
}
