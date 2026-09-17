'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Phone,
  MessageSquare,
  Users,
  MoreHorizontal,
  ChevronRight,
  User,
  Edit3,
  UserPlus,
  Trash2,
  Send,
  AlertTriangle,
  X,
  Wallet,
  RotateCcw,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';
import { INITIAL_STUDENTS } from '@/lib/data/mockData';
import { getStoredStudents, reconcileAllStudentDepositsAndDebts, getDeletedParentIds, softDeleteParent, restoreParent } from '@/lib/data/studentStorage';
import { AddChildModal, AddedChildData } from '@/components/parents/AddChildModal';

interface ParentRecord {
  id: string;
  name: string;
  phone: string;
  telegram?: string;
  whatsapp?: string;
  preferredChannel: string;
  children: Array<{ id: string; name: string; group: string }>;
  totalPaid: string;
  balanceStatus: string;
  depositFormatted?: string;
  depositBalance?: number;
  debtFormatted?: string;
  debtBalance?: number;
  isDeleted?: boolean;
}

const INITIAL_PARENTS: ParentRecord[] = [
  {
    id: 'p1',
    name: 'Ольга Смирнова',
    phone: '+7 (999) 123-45-67',
    telegram: '@olga_smirnova',
    whatsapp: '+79991234567',
    preferredChannel: 'Telegram',
    children: [{ id: '1', name: 'Иван Смирнов', group: 'English B1 Teens' }],
    totalPaid: '38 400 ₽',
    balanceStatus: 'paid',
  },
  {
    id: 'p3',
    name: 'Дмитрий Кузнецов',
    phone: '+7 (999) 234-56-78',
    telegram: '@dkuznetsov',
    whatsapp: '+79992345678',
    preferredChannel: 'WhatsApp',
    children: [
      { id: '2', name: 'Мария Кузнецова', group: 'Robotics Junior' },
      { id: 's18', name: 'Артём Кузнецов', group: 'Robotics Junior, Kids Math Safari' },
    ],
    totalPaid: '54 000 ₽',
    balanceStatus: 'debt',
  },
  {
    id: 'p5',
    name: 'Наталья Захарова',
    phone: '+7 (916) 777-33-22',
    telegram: '@zakharova_n',
    whatsapp: '+79167773322',
    preferredChannel: 'Telegram',
    children: [{ id: 's6', name: 'Максим Захаров', group: 'English B1 Teens' }],
    totalPaid: '28 800 ₽',
    balanceStatus: 'debt',
  },
  {
    id: 'p4',
    name: 'Елена Васильева',
    phone: '+7 (999) 345-67-89',
    telegram: '@elena_v',
    whatsapp: '+79993456789',
    preferredChannel: 'Phone',
    children: [{ id: '3', name: 'Анна Васильева', group: 'Kids English A1' }],
    totalPaid: '0 ₽',
    balanceStatus: 'trial',
  },
];

function getMergedParents(): ParentRecord[] {
  const allStudents = typeof window !== 'undefined' ? getStoredStudents() : INITIAL_STUDENTS;
  const map = new Map<string, ParentRecord>();

  // 1. Initialize parents directory from INITIAL_PARENTS with empty children list (to be filled from allStudents)
  for (const init of INITIAL_PARENTS) {
    map.set(init.id, { ...init, children: [] });
  }

  // 2. Aggregate children from unified student storage
  for (const st of allStudents) {
    if (st.parents && st.parents.length > 0) {
      for (const pr of st.parents) {
        if (!pr.id) continue;
        const fullName = `${pr.firstName} ${pr.lastName}`.trim() || 'Родитель';
        const childFullName = `${st.firstName} ${st.lastName}`.trim();

        // Join all courses / groups comma-separated for students on multiple courses
        const groupNames = (st.groups || [])
          .map((g: any) => g.name || g.courseName)
          .filter(Boolean);
        const formattedGroups = groupNames.length > 0
          ? Array.from(new Set(groupNames)).join(', ')
          : 'Онлайн-группа';

        const childInfo = {
          id: st.id,
          name: childFullName,
          group: formattedGroups,
        };

        if (map.has(pr.id)) {
          const existing = map.get(pr.id)!;
          // Deduplicate by ID and by full name to prevent a child on multiple courses appearing as a separate third child
          const existingChildIndex = existing.children.findIndex(
            (c) => c.id === st.id || c.name.toLowerCase().trim() === childFullName.toLowerCase()
          );

          if (existingChildIndex === -1) {
            existing.children.push(childInfo);
          } else {
            // Merge courses comma-separated if child already recorded under another entry or id
            const existingGroups = existing.children[existingChildIndex].group
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            const newGroups = formattedGroups
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            const combinedGroups = Array.from(new Set([...existingGroups, ...newGroups])).join(', ');

            existing.children[existingChildIndex] = {
              id: st.id,
              name: childFullName,
              group: combinedGroups,
            };
          }
        } else {
          map.set(pr.id, {
            id: pr.id,
            name: fullName,
            phone: pr.phone || '+7 (999) 000-00-00',
            telegram: pr.telegram,
            whatsapp: pr.whatsapp,
            preferredChannel: pr.preferredChannel || 'Telegram',
            children: [childInfo],
            totalPaid: '0 ₽',
            balanceStatus: 'paid',
          });
        }
      }
    }
  }

  // 3. Reconcile financial balances
  const result: ParentRecord[] = [];
  map.forEach((parent) => {
    let deposit = 0;
    let debt = 0;
    let totalPaidSum = 0;

    for (const child of parent.children) {
      const studentObj = allStudents.find((s) => s.id === child.id);
      if (studentObj) {
        if (studentObj.finance?.deposit?.balance) {
          deposit += studentObj.finance.deposit.balance;
        }
        if (studentObj.finance?.payments) {
          studentObj.finance.payments.forEach((pay) => {
            if (pay.status === 'paid') {
              const num = parseInt(pay.amount.replace(/[^0-9]/g, ''), 10) || 0;
              totalPaidSum += num;
            } else if ((pay.status as string) === 'overdue' || (pay.status as string) === 'pending' || pay.status === 'expected') {
              const num = parseInt(pay.amount.replace(/[^0-9]/g, ''), 10) || 0;
              debt += num;
            }
          });
        }
      }
    }

    const net = deposit - debt;
    let balanceStatus = 'paid';
    if (net < 0) {
      balanceStatus = 'debt';
    } else if (deposit > 0) {
      balanceStatus = 'paid';
    } else if (parent.children.some((c) => {
      const s = allStudents.find((st) => st.id === c.id);
      return s?.status === 'trial';
    })) {
      balanceStatus = 'trial';
    }

    const deletedIds = typeof window !== 'undefined' ? getDeletedParentIds() : new Set<string>();
    const isDeleted = deletedIds.has(parent.id);

    result.push({
      ...parent,
      totalPaid: totalPaidSum > 0 ? `${totalPaidSum.toLocaleString('ru-RU')} ₽` : parent.totalPaid,
      balanceStatus,
      depositFormatted: deposit > 0 ? `${deposit.toLocaleString('ru-RU')} ₽` : undefined,
      depositBalance: deposit,
      debtFormatted: debt > 0 ? `${debt.toLocaleString('ru-RU')} ₽` : undefined,
      debtBalance: debt,
      isDeleted,
    });
  });

  return result;
}

export default function ParentsPage() {
  const router = useRouter();
  const { success } = useToast();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [parents, setParents] = useState<ParentRecord[]>(() => getMergedParents());
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'deleted'>('all');

  useEffect(() => {
    const sync = () => {
      reconcileAllStudentDepositsAndDebts();
      setParents(getMergedParents());
    };
    sync();
    window.addEventListener('crm-students-changed', sync);
    window.addEventListener('crm-parents-changed', sync);
    window.addEventListener('crm-payments-changed', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('crm-students-changed', sync);
      window.removeEventListener('crm-parents-changed', sync);
      window.removeEventListener('crm-payments-changed', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  // Modals state
  const [editingParent, setEditingParent] = useState<ParentRecord | null>(null);
  const [deletingParent, setDeletingParent] = useState<ParentRecord | null>(null);
  const [linkingChildParent, setLinkingChildParent] = useState<ParentRecord | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Close active dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.parent-actions-menu-wrapper')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeParents = parents.filter((p) => !p.isDeleted);
  const deletedParents = parents.filter((p) => p.isDeleted);
  const currentList = statusFilter === 'deleted' ? deletedParents : activeParents;

  const filteredParents = currentList.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone.includes(searchTerm) ||
    p.children.some((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDeleteParent = () => {
    if (!deletingParent) return;
    softDeleteParent(deletingParent.id);
    setParents(getMergedParents());
    success(`Родитель ${deletingParent.name} перемещен в раздел «Удаленные»`);
    setDeletingParent(null);
  };

  const handleSaveEditParent = (updated: ParentRecord) => {
    setParents((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    success(`Данные контакта ${updated.name} обновлены`);
    setEditingParent(null);
  };

  const handleCreateParent = (newParent: Omit<ParentRecord, 'id' | 'children' | 'totalPaid' | 'balanceStatus'>) => {
    const created: ParentRecord = {
      ...newParent,
      id: `p_${Date.now()}`,
      children: [],
      totalPaid: '0 ₽',
      balanceStatus: 'trial',
      isDeleted: false,
    };
    setParents((prev) => [created, ...prev]);
    success(`Контакт ${created.name} добавлен в базу`);
    setIsCreateModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('parents.title', 'Родители и контакты')}</h1>
          <p className="text-sm text-slate-600">
            {t('parents.subtitle', 'Реестр контактных лиц и законных представителей • Единый профиль семьи')} • Всего: {activeParents.length}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Все контакты ({activeParents.length})
            </button>
            <button
              onClick={() => setStatusFilter('deleted')}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                statusFilter === 'deleted'
                  ? 'bg-white text-rose-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Удаленные ({deletedParents.length})
            </button>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            {t('action.newContact', 'Новый контакт')}
          </button>
        </div>
      </div>

      <div className="flex rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('parents.search', 'Поиск родителя по имени, телефону или ребенку...')}
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Compact Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {filteredParents.map((p) => {
          const initials = p.name
            .split(' ')
            .map((n) => n[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase() || 'Р';

          return (
            <div
              key={p.id}
              className="relative rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between gap-3"
            >
              <div>
                {/* Header: Avatar, Name, Preferred Channel, 3-dots */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 font-bold text-white text-xs flex items-center justify-center shrink-0 shadow-2xs">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3
                        onClick={() => router.push(`/parents/${p.id}`)}
                        className="font-bold text-slate-900 text-sm cursor-pointer hover:text-blue-600 transition-colors truncate"
                        title={p.name}
                      >
                        {p.name}
                      </h3>
                      <span className="inline-block rounded-full bg-slate-100 px-2 py-0.2 text-[10px] font-semibold text-slate-600 border border-slate-200/60">
                        {p.preferredChannel === 'both' ? '🔄 Почта и TG' : p.preferredChannel === 'email' || p.preferredChannel === 'Email' ? '📧 Email' : p.preferredChannel === 'WhatsApp' ? '💬 WhatsApp' : '✈️ Telegram'}
                      </span>
                    </div>
                  </div>

                  {/* 3 Dots Overflow Action Menu */}
                  <div className="parent-actions-menu-wrapper relative shrink-0">
                    <button
                      onClick={() => setActiveMenuId(activeMenuId === p.id ? null : p.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                      title="Действия"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {activeMenuId === p.id && (
                      <div className="absolute right-0 top-8 z-30 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            router.push(`/parents/${p.id}`);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <User className="h-3.5 w-3.5 text-blue-600" />
                          <span>Открыть профиль семьи</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            setEditingParent(p);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-amber-600" />
                          <span>Редактировать контакт</span>
                        </button>

                        {p.whatsapp && (
                          <a
                            href={`https://wa.me/${p.whatsapp.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => setActiveMenuId(null)}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Написать в WhatsApp</span>
                          </a>
                        )}

                        {p.telegram && (
                          <a
                            href={`https://t.me/${p.telegram.replace('@', '')}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => setActiveMenuId(null)}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-blue-700 hover:bg-blue-50 transition-colors"
                          >
                            <Send className="h-3.5 w-3.5 text-blue-500" />
                            <span>Написать в Telegram</span>
                          </a>
                        )}

                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            setLinkingChildParent(p);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <UserPlus className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Добавить / привязать ребенка</span>
                        </button>

                        <div className="my-1 border-t border-slate-100" />

                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            setDeletingParent(p);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                          <span>Удалить контакт</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact details */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                    <a href={`tel:${p.phone}`} className="hover:text-blue-600 font-medium truncate">
                      {p.phone}
                    </a>
                  </div>
                  {p.telegram && (
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3 text-blue-500 shrink-0" />
                      <span className="font-medium text-slate-700 truncate">{p.telegram}</span>
                    </div>
                  )}
                </div>

                {/* Children Section */}
                <div className="mt-2.5 border-t border-slate-100 pt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Дети ({p.children.length}):
                    </span>
                    <button
                      onClick={() => setLinkingChildParent(p)}
                      className="text-[10px] font-bold text-blue-600 hover:underline"
                    >
                      + Ребенок
                    </button>
                  </div>
                  <div className="space-y-1">
                    {p.children.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic py-0.5">Нет привязанных учеников</p>
                    ) : (
                      p.children.map((child) => (
                        <Link
                          key={child.id}
                          href={`/students/${child.id}`}
                          className="flex items-center justify-between gap-1.5 rounded-md bg-slate-50/90 px-2 py-1 text-xs hover:bg-blue-50 transition-colors"
                          title={`${child.name} — ${child.group}`}
                        >
                          <span className="font-semibold text-slate-800 text-[11px] truncate">{child.name}</span>
                          <span className="text-[10px] text-slate-500 font-medium truncate max-w-[130px]">{child.group} →</span>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Financial & Profile Footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  {p.debtFormatted ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5">
                      <AlertTriangle className="h-3 w-3 text-rose-600" /> Долг: {p.debtFormatted}
                    </span>
                  ) : p.depositFormatted ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                      <Wallet className="h-3 w-3" /> Депозит: {p.depositFormatted}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500">
                      Оплат: <strong className="text-slate-800">{p.totalPaid}</strong>
                    </span>
                  )}
                </div>
                <Link
                  href={`/parents/${p.id}`}
                  className="inline-flex items-center gap-0.5 text-blue-600 text-[11px] font-bold hover:underline"
                >
                  Профиль <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              {p.isDeleted && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      restoreParent(p.id);
                      setParents(getMergedParents());
                      success(`Контакт ${p.name} восстановлен`);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Восстановить контакт
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 1. Modal: Edit Parent */}
      {editingParent && (
        <EditParentModal
          parent={editingParent}
          onClose={() => setEditingParent(null)}
          onSave={handleSaveEditParent}
        />
      )}

      {/* 2. Modal: Delete Parent Confirmation */}
      {deletingParent && (
        <DeleteConfirmModal
          parent={deletingParent}
          onClose={() => setDeletingParent(null)}
          onConfirm={handleDeleteParent}
        />
      )}

      {/* 3. Modal: Add / Link Child */}
      {linkingChildParent && (
        <AddChildModal
          isOpen={!!linkingChildParent}
          onClose={() => setLinkingChildParent(null)}
          parentId={linkingChildParent.id}
          parentName={linkingChildParent.name}
          parentPhone={linkingChildParent.phone}
          existingChildrenIds={linkingChildParent.children.map((c) => c.id)}
          onChildAdded={(newChild) => {
            setParents((prev) =>
              prev.map((p) => {
                if (p.id === linkingChildParent.id) {
                  const existingIdx = p.children.findIndex(
                    (c) => c.id === newChild.id || c.name.toLowerCase().trim() === newChild.name.toLowerCase().trim()
                  );
                  let updatedChildren = [...p.children];
                  if (existingIdx >= 0) {
                    const prevGroups = updatedChildren[existingIdx].group.split(',').map((s) => s.trim()).filter(Boolean);
                    const newGroups = newChild.group.split(',').map((s) => s.trim()).filter(Boolean);
                    const combined = Array.from(new Set([...prevGroups, ...newGroups])).join(', ');
                    updatedChildren[existingIdx] = {
                      ...updatedChildren[existingIdx],
                      group: combined,
                    };
                  } else {
                    updatedChildren.push({ id: newChild.id, name: newChild.name, group: newChild.group });
                  }
                  return {
                    ...p,
                    children: updatedChildren,
                  };
                }
                return p;
              })
            );
            success(`Ребенок ${newChild.name} успешно добавлен к родителю ${linkingChildParent.name}`);
            setLinkingChildParent(null);
          }}
        />
      )}

      {/* 4. Modal: Create Parent */}
      {isCreateModalOpen && (
        <CreateParentModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateParent}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components: Modals
// ─────────────────────────────────────────────────────────────────────────────

function EditParentModal({
  parent,
  onClose,
  onSave,
}: {
  parent: ParentRecord;
  onClose: () => void;
  onSave: (updated: ParentRecord) => void;
}) {
  const [name, setName] = useState(parent.name);
  const [phone, setPhone] = useState(parent.phone);
  const [telegram, setTelegram] = useState(parent.telegram || '');
  const [whatsapp, setWhatsapp] = useState(parent.whatsapp || '');
  const [preferredChannel, setPreferredChannel] = useState(parent.preferredChannel);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...parent,
      name,
      phone,
      telegram: telegram || undefined,
      whatsapp: whatsapp || undefined,
      preferredChannel,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Edit3 className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Редактирование контакта</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="mb-1 block font-semibold text-slate-700">ФИО представителя *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-700">Телефон *</label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Telegram</label>
              <input
                type="text"
                placeholder="@username"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">WhatsApp</label>
              <input
                type="text"
                placeholder="+79991234567"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-700">Канал отправки уведомлений и отчётов</label>
            <select
              value={preferredChannel}
              onChange={(e) => setPreferredChannel(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="Email">📧 Электронная почта (Email)</option>
              <option value="Telegram">✈️ Telegram</option>
              <option value="both">🔄 Почта и Telegram (Оба канала)</option>
              <option value="WhatsApp">💬 WhatsApp</option>
              <option value="Phone">📞 Телефонный звонок</option>
            </select>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Сохранить изменения
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  parent,
  onClose,
  onConfirm,
}: {
  parent: ParentRecord;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3 text-rose-600 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Удалить контакт родителя?</h3>
            <p className="text-xs text-slate-500">Действие нельзя будет отменить</p>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/80 my-3 text-xs space-y-1.5">
          <p className="font-bold text-slate-800">{parent.name}</p>
          <p className="text-slate-600">Телефон: {parent.phone}</p>
          {parent.children.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-200 text-rose-700 font-medium">
              ⚠️ К родителю привязано детей: <strong>{parent.children.length}</strong> (
              {parent.children.map((c) => c.name).join(', ')}). После удаления ученики останутся без привязанного законного представителя.
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-xs"
          >
            Да, удалить родителя
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateParentModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (parent: Omit<ParentRecord, 'id' | 'children' | 'totalPaid' | 'balanceStatus'>) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+7 ');
  const [telegram, setTelegram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [preferredChannel, setPreferredChannel] = useState('Telegram');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({
      name,
      phone,
      telegram: telegram || undefined,
      whatsapp: whatsapp || undefined,
      preferredChannel,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Plus className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Новый контакт родителя</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="mb-1 block font-semibold text-slate-700">ФИО представителя *</label>
            <input
              type="text"
              required
              placeholder="Например: Смирнов Алексей Павлович"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-700">Телефон *</label>
            <input
              type="text"
              required
              placeholder="+7 (999) 000-00-00"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Telegram</label>
              <input
                type="text"
                placeholder="@username"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">WhatsApp</label>
              <input
                type="text"
                placeholder="+79991234567"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-700">Канал отправки уведомлений и отчётов</label>
            <select
              value={preferredChannel}
              onChange={(e) => setPreferredChannel(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="Email">📧 Электронная почта (Email)</option>
              <option value="Telegram">✈️ Telegram</option>
              <option value="both">🔄 Почта и Telegram (Оба канала)</option>
              <option value="WhatsApp">💬 WhatsApp</option>
              <option value="Phone">📞 Телефонный звонок</option>
            </select>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Создать контакт
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
