'use client';

import React from 'react';
import { Crown, Shield, GraduationCap, Eye, ChevronRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLE_DEFINITIONS, RoleId } from '@/lib/data/rolePermissions';

interface RoleSummaryCardsProps {
  roleCounts: Record<RoleId, number>;
  onSelectRole?: (roleId: RoleId) => void;
}

export function RoleSummaryCards({ roleCounts, onSelectRole }: RoleSummaryCardsProps) {
  const roles: Array<{
    id: RoleId;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'owner', icon: Crown },
    { id: 'admin', icon: Shield },
    { id: 'teacher', icon: GraduationCap },
    { id: 'viewer', icon: Eye },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {roles.map(({ id, icon: Icon }) => {
        const def = ROLE_DEFINITIONS[id];
        const count = roleCounts[id] ?? 0;

        return (
          <div
            key={id}
            className="flex flex-col justify-between p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: def.bgColor, color: def.color }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1.5">
                  {def.isSystem && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                      <Lock className="h-2.5 w-2.5" />
                      Системная
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                    {count} {count === 1 ? 'сотр.' : 'сотр.'}
                  </span>
                </div>
              </div>

              <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                {def.label}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-3">
                {def.description}
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onSelectRole?.(id)}
                className="w-full flex items-center justify-between text-xs font-semibold text-indigo-600 hover:text-indigo-700 group-hover:translate-x-0.5 transition-all"
              >
                <span>{id === 'owner' ? 'Подробнее о роли' : 'Настроить права'}</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
