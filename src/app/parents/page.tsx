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
  Check,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';
import { INITIAL_STUDENTS } from '@/lib/data/mockData';
import { getStoredStudents, reconcileAllStudentDepositsAndDebts, getDeletedParentIds, softDeleteParent, restoreParent } from '@/lib/data/studentStorage';
import { buildChronologicalLedger } from '@/app/students/[id]/page';
import { parsePaymentAmountEUR } from '@/lib/data/currencyHelper';
import { AddChildModal, AddedChildData } from '@/components/parents/AddChildModal';
import { cn } from '@/lib/utils';

interface ParentRecord {
  id: string;
  name: string;
  phone: string;
  telegram?: string;
  whatsapp?: string;
  preferredChannel: string;
  relationshipType?: string;
  children: Array<{ id: string; name: string; group: string }>;
  totalPaid: string;
  totalPaidEUR?: number;
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
    relationshipType: 'Мама',
    children: [{ id: '1', name: 'Иван Смирнов', group: 'English B1 Teens' }],
    totalPaid: '120 €',
    balanceStatus: 'paid',
  },
  {
    id: 'p3',
    name: 'Дмитрий Кузнецов',
    phone: '+7 (999) 234-56-78',
    telegram: '@dkuznetsov',
    whatsapp: '+79992345678',
    preferredChannel: 'WhatsApp',
    relationshipType: 'Отец',
    children: [
      { id: '2', name: 'Мария Кузнецова', group: 'Robotics Junior' },
      { id: 's18', name: 'Артём Кузнецов', group: 'Robotics Junior, Kids Math Safari' },
    ],
    totalPaid: '540 €',
    balanceStatus: 'debt',
  },
  {
    id: 'p5',
    name: 'Наталья Захарова',
    phone: '+7 (916) 777-33-22',
    telegram: '@zakharova_n',
    whatsapp: '+79167773322',
    preferredChannel: 'Telegram',
    relationshipType: 'Мама',
    children: [{ id: 's6', name: 'Максим Захаров', group: 'English B1 Teens' }],
    totalPaid: '280 €',
    balanceStatus: 'debt',
  },
  {
    id: 'p4',
    name: 'Елена Васильева',
    phone: '+7 (999) 345-67-89',
    telegram: '@elena_v',
    whatsapp: '+79993456789',
    preferredChannel: 'Phone',
    relationshipType: 'Мама',
    children: [{ id: '3', name: 'Анна Васильева', group: 'Kids English A1' }],
    totalPaid: '0 €',
    balanceStatus: 'trial',
  },
];

function normalizePhone(phone?: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (clean.length === 11 && (clean.startsWith('8') || clean.startsWith('7'))) {
    clean = '7' + clean.slice(1);
  }
  return clean;
}

function getMergedParents(): ParentRecord[] {
  const allStudents = typeof window !== 'undefined' ? getStoredStudents() : INITIAL_STUDENTS;
  const parentMap = new Map<string, ParentRecord>();

  // Helper to add or merge parent entry
  const addOrMergeParent = (rawParent: Partial<ParentRecord> & { id: string; name: string; phone: string }) => {
    const cleanP = normalizePhone(rawParent.phone);
    const cleanN = (rawParent.name || '').toLowerCase().trim();

    // Find existing parent by normalized phone or normalized name + phone
    let existingKey: string | null = null;
    for (const [key, p] of parentMap.entries()) {
      const pClean = normalizePhone(p.phone);
      const pName = p.name.toLowerCase().trim();

      if (cleanP && pClean && cleanP === pClean) {
        existingKey = key;
        break;
      }
      if (cleanN && pName && cleanN === pName && cleanP && pClean && cleanP === pClean) {
        existingKey = key;
        break;
      }
    }

    if (existingKey) {
      const existing = parentMap.get(existingKey)!;
      // Merge children
      const existingChildrenMap = new Map(existing.children.map((c) => [c.id, c]));
      (rawParent.children || []).forEach((c) => {
        if (!existingChildrenMap.has(c.id)) {
          existingChildrenMap.set(c.id, c);
        } else {
          // Merge groups
          const prev = existingChildrenMap.get(c.id)!;
          const g1 = prev.group.split(',').map((s) => s.trim()).filter(Boolean);
          const g2 = c.group.split(',').map((s) => s.trim()).filter(Boolean);
          const combined = Array.from(new Set([...g1, ...g2])).join(', ');
          existingChildrenMap.set(c.id, { ...prev, group: combined });
        }
      });

      parentMap.set(existingKey, {
        ...existing,
        children: Array.from(existingChildrenMap.values()),
        telegram: existing.telegram || rawParent.telegram,
        whatsapp: existing.whatsapp || rawParent.whatsapp,
        relationshipType: existing.relationshipType || rawParent.relationshipType,
      });
    } else {
      const key = cleanP ? `phone_${cleanP}` : `id_${rawParent.id}`;
      parentMap.set(key, {
        id: rawParent.id,
        name: rawParent.name,
        phone: rawParent.phone || '+7 (999) 000-00-00',
        telegram: rawParent.telegram,
        whatsapp: rawParent.whatsapp,
        preferredChannel: rawParent.preferredChannel || 'Telegram',
        relationshipType: rawParent.relationshipType || 'Родитель',
        children: rawParent.children || [],
        totalPaid: '0 €',
        balanceStatus: 'paid',
      });
    }
  };

  // 1. Seed from INITIAL_PARENTS
  for (const init of INITIAL_PARENTS) {
    addOrMergeParent({ ...init, children: [] });
  }

  // 2. Aggregate from student storage
  for (const st of allStudents) {
    if (st.parents && st.parents.length > 0) {
      for (const pr of st.parents) {
        if (!pr.id && !pr.firstName) continue;
        const fullName = `${pr.firstName || ''} ${pr.lastName || ''}`.trim() || 'Родитель';
        const childFullName = `${st.firstName} ${st.lastName}`.trim();

        const groupNames = (st.groups || []).map((g: any) => g.name || g.courseName).filter(Boolean);
        const formattedGroups = groupNames.length > 0 ? Array.from(new Set(groupNames)).join(', ') : 'Основной курс';

        const childInfo = {
          id: st.id,
          name: childFullName,
          group: formattedGroups,
        };

        addOrMergeParent({
          id: pr.id || `pr_${st.id}`,
          name: fullName,
          phone: pr.phone || '+7 (999) 000-00-00',
          telegram: pr.telegram,
          whatsapp: pr.whatsapp,
          preferredChannel: pr.preferredChannel || 'Telegram',
          relationshipType: (pr as any).relationshipType || 'Родитель',
          children: [childInfo],
        });
      }
    }
  }

  // 3. Financial calculations per family (Derived from single source of truth for each child)
  const result: ParentRecord[] = [];
  const deletedIds = typeof window !== 'undefined' ? getDeletedParentIds() : new Set<string>();

  parentMap.forEach((parent) => {
    let totalDepositEUR = 0;
    let totalDebtEUR = 0;
    let totalPaidEUR = 0;
    let hasTrialChild = false;

    // Deduplicate linked children
    const uniqueChildrenMap = new Map<string, { id: string; name: string; group: string }>();
    for (const c of parent.children) {
      uniqueChildrenMap.set(c.id, c);
    }
    const uniqueChildren = Array.from(uniqueChildrenMap.values());
    parent.children = uniqueChildren;

    for (const child of uniqueChildren) {
      const studentObj = allStudents.find((s) => s.id === child.id);
      if (studentObj) {
        if (studentObj.status === 'trial') {
          hasTrialChild = true;
        }

        const pricePerLesson = studentObj.finance?.deposit?.pricePerLesson || 15;
        const ledger = buildChronologicalLedger(studentObj, pricePerLesson);
        const childBalanceEUR = ledger[0]?.runningBalanceEUR ?? (studentObj.finance?.deposit?.balance || 0);

        if (childBalanceEUR < 0) {
          totalDebtEUR += Math.abs(childBalanceEUR);
        } else {
          totalDepositEUR += childBalanceEUR;
        }

        (studentObj.finance?.payments || []).forEach((pay) => {
          if (pay.status === 'paid') {
            totalPaidEUR += parsePaymentAmountEUR(pay.amount, 120);
          }
        });
      }
    }

    const netBalanceEUR = totalDepositEUR - totalDebtEUR;
    let balanceStatus = 'paid';
    if (totalDebtEUR > 0) {
      balanceStatus = 'debt';
    } else if (totalDepositEUR > 0) {
      balanceStatus = 'paid';
    } else if (hasTrialChild) {
      balanceStatus = 'trial';
    }

    const isDeleted = deletedIds.has(parent.id);

    result.push({
      ...parent,
      totalPaid: `${totalPaidEUR.toLocaleString('ru-RU')} € (~${(totalPaidEUR * 100).toLocaleString('ru-RU')} ₽)`,
      totalPaidEUR,
      balanceStatus,
      depositFormatted: totalDepositEUR > 0 ? `${totalDepositEUR.toLocaleString('ru-RU')} €` : undefined,
      depositBalance: totalDepositEUR,
      debtFormatted: totalDebtEUR > 0 ? `-${totalDebtEUR.toLocaleString('ru-RU')} € (~${(totalDebtEUR * 100).toLocaleString('ru-RU')} ₽)` : undefined,
      debtBalance: totalDebtEUR,
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

  // View Mode: Table vs Grid
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [quickFilter, setQuickFilter] = useState<'all' | 'debt' | 'multi_child' | 'deleted'>('all');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('parents_view_mode');
      if (saved === 'grid' || saved === 'table') {
        setViewMode(saved);
      }
    }
  }, []);

  const handleViewModeChange = (mode: 'table' | 'grid') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('parents_view_mode', mode);
    }
  };

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
  const debtParentsCount = activeParents.filter((p) => p.debtBalance && p.debtBalance > 0).length;
  const multiChildParentsCount = activeParents.filter((p) => p.children.length >= 2).length;

  const currentList = quickFilter === 'deleted' ? deletedParents : activeParents;

  const filteredParents = currentList.filter((p) => {
    if (quickFilter === 'debt' && (!p.debtBalance || p.debtBalance <= 0)) return false;
    if (quickFilter === 'multi_child' && p.children.length < 2) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const nameMatch = p.name.toLowerCase().includes(term);
      const phoneMatch = p.phone.includes(term);
      const childMatch = p.children.some((c) => c.name.toLowerCase().includes(term));
      return nameMatch || phoneMatch || childMatch;
    }
    return true;
  });

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
    const cleanPhone = normalizePhone(newParent.phone);
    if (cleanPhone) {
      const existing = parents.find((p) => normalizePhone(p.phone) === cleanPhone);
      if (existing) {
        if (confirm(`Родитель с номером ${newParent.phone} уже существует в базе: ${existing.name}.\n\nПривязать ребенка к существующему профилю?`)) {
          setLinkingChildParent(existing);
          setIsCreateModalOpen(false);
          return;
        } else {
          return;
        }
      }
    }

    const created: ParentRecord = {
      ...newParent,
      id: `p_${Date.now()}`,
      children: [],
      totalPaid: '0 €',
      balanceStatus: 'paid',
      isDeleted: false,
    };
    setParents((prev) => [created, ...prev]);
    success(`Контакт ${created.name} добавлен в базу`);
    setIsCreateModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('parents.title', 'Родители и контакты')}</h1>
          <p className="text-sm text-slate-600">
            {t('parents.subtitle', 'Реестр контактных лиц и законных представителей • Единый профиль семьи')} • Всего: {activeParents.length}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Filters */}
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
            <button
              onClick={() => setQuickFilter('all')}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                quickFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Все контакты ({activeParents.length})
            </button>
            <button
              onClick={() => setQuickFilter('debt')}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                quickFilter === 'debt'
                  ? 'bg-white text-rose-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              С задолженностью ({debtParentsCount})
            </button>
            <button
              onClick={() => setQuickFilter('multi_child')}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                quickFilter === 'multi_child'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Многодетные ({multiChildParentsCount})
            </button>
            <button
              onClick={() => setQuickFilter('deleted')}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                quickFilter === 'deleted'
                  ? 'bg-white text-slate-800 shadow-2xs font-bold'
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

      {/* SEARCH TOOLBAR & VIEW MODE SWITCHER */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
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

        {/* View Mode Switcher */}
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => handleViewModeChange('table')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
              viewMode === 'table'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            )}
            title="Табличный вид"
          >
            <span>☰ Таблица</span>
          </button>
          <button
            type="button"
            onClick={() => handleViewModeChange('grid')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
              viewMode === 'grid'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            )}
            title="Вид сеткой"
          >
            <span>▦ Сетка</span>
          </button>
        </div>
      </div>

      {/* RENDER TABLE OR GRID VIEW */}
      {viewMode === 'table' ? (
        /* TABLE VIEW (DESKTOP FIXED TABLE) */
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs table-fixed">
            <thead className="border-b border-slate-100 bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="w-10 py-3 pl-4 pr-1 text-center">
                  <input type="checkbox" className="rounded border-slate-300 text-blue-600" />
                </th>
                <th className="w-64 px-3 py-3">РОДИТЕЛЬ / ЛПР</th>
                <th className="w-56 px-3 py-3">СВЯЗЬ</th>
                <th className="px-3 py-3">ДЕТИ (УЧЕНИКИ)</th>
                <th className="w-56 px-3 py-3">СТАТУС ОПЛАТЫ</th>
                <th className="w-28 py-3 pl-3 pr-4 text-right">ДЕЙСТВИЯ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredParents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    Контакты не найдены
                  </td>
                </tr>
              ) : (
                filteredParents.map((p) => {
                  const initials = p.name
                    .split(' ')
                    .map((n) => n[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || 'Р';

                  const cleanPhone = normalizePhone(p.phone);
                  const waLink = p.whatsapp
                    ? `https://wa.me/${normalizePhone(p.whatsapp)}`
                    : `https://wa.me/${cleanPhone}`;
                  const tgHandle = (p.telegram || '').replace('@', '');
                  const tgLink = tgHandle ? `https://t.me/${tgHandle}` : `https://t.me/+${cleanPhone}`;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 pl-4 pr-1 text-center">
                        <input type="checkbox" className="rounded border-slate-300 text-blue-600" />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 font-bold text-white text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/parents/${p.id}`}
                              className="font-bold text-slate-900 text-sm hover:text-blue-600 transition-colors block truncate"
                              title={p.name}
                            >
                              {p.name}
                            </Link>
                            <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[10px] font-semibold text-slate-600 border border-slate-200/60 inline-block mt-0.5">
                              {p.relationshipType || 'Родитель'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="space-y-1">
                          <a href={`tel:${p.phone}`} className="font-semibold text-slate-800 font-mono block text-[11px] hover:text-blue-600">
                            {p.phone}
                          </a>
                          <div className="flex items-center gap-1.5">
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-bold border border-emerald-200/80 hover:bg-emerald-100 transition-colors"
                            >
                              <MessageSquare className="h-3 w-3 text-emerald-600" />
                              WhatsApp
                            </a>
                            <a
                              href={tgLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-md bg-sky-50 text-sky-700 px-2 py-0.5 text-[10px] font-bold border border-sky-200/80 hover:bg-sky-100 transition-colors"
                            >
                              <Send className="h-3 w-3 text-sky-600" />
                              Telegram
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {p.children.map((c) => (
                            <Link
                              key={c.id}
                              href={`/students/${c.id}`}
                              className="rounded-lg bg-blue-50 text-blue-800 px-2.5 py-1 text-xs font-semibold border border-blue-100 hover:bg-blue-100 transition-colors"
                              title={`${c.name} — ${c.group}`}
                            >
                              {c.name} <span className="text-[10px] text-blue-500 font-normal">({c.group})</span>
                            </Link>
                          ))}
                          {p.children.length === 0 && (
                            <span className="text-slate-400 italic text-xs">Нет привязанных учеников</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {p.debtBalance && p.debtBalance > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 text-rose-800 px-2.5 py-1 text-xs font-bold border border-rose-200 whitespace-nowrap">
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                            ⚠ Долг: -{p.debtBalance} € (~{Math.round(p.debtBalance * 100).toLocaleString('ru-RU')} ₽)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-800 px-2.5 py-1 text-xs font-bold border border-emerald-200 whitespace-nowrap">
                            ✓ Оплачено
                          </span>
                        )}
                      </td>
                      <td className="py-3 pl-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/parents/${p.id}`}
                            className="rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors"
                          >
                            Профиль →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* GRID VIEW (CARD VIEW) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredParents.map((p) => {
            const initials = p.name
              .split(' ')
              .map((n) => n[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase() || 'Р';

            const cleanPhone = normalizePhone(p.phone);
            const waLink = p.whatsapp
              ? `https://wa.me/${normalizePhone(p.whatsapp)}`
              : `https://wa.me/${cleanPhone}`;
            const tgHandle = (p.telegram || '').replace('@', '');
            const tgLink = tgHandle ? `https://t.me/${tgHandle}` : `https://t.me/+${cleanPhone}`;

            return (
              <div
                key={p.id}
                className="relative rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between gap-3"
              >
                <div>
                  {/* Header: Avatar, Name, Channel, Action menu */}
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
                          {p.relationshipType || 'Родитель'}
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

                          <a
                            href={waLink}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => setActiveMenuId(null)}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Написать в WhatsApp</span>
                          </a>

                          <a
                            href={tgLink}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => setActiveMenuId(null)}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-blue-700 hover:bg-blue-50 transition-colors"
                          >
                            <Send className="h-3.5 w-3.5 text-blue-500" />
                            <span>Написать в Telegram</span>
                          </a>

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

                  {/* Contact details with active web links */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                      <a href={`tel:${p.phone}`} className="hover:text-blue-600 font-medium truncate">
                        {p.phone}
                      </a>
                    </div>
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 text-[10px] transition-colors"
                      title="Написать в WhatsApp"
                    >
                      WA
                    </a>
                    <a
                      href={tgLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 font-medium text-blue-600 hover:underline truncate text-[10px]"
                      title="Написать в Telegram"
                    >
                      <Send className="h-2.5 w-2.5 text-blue-500 shrink-0" />
                      TG
                    </a>
                  </div>

                  {/* Children Section */}
                  <div className="mt-2.5 border-t border-slate-100 pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Дети ({p.children.length}):
                      </span>
                      <button
                        onClick={() => setLinkingChildParent(p)}
                        className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
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

                {/* Financial Footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    {p.debtBalance && p.debtBalance > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5">
                        <AlertTriangle className="h-3 w-3 text-rose-600" /> Долг: -{p.debtBalance} € (~{Math.round(p.debtBalance * 100).toLocaleString('ru-RU')} ₽)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                        <Check className="h-3 w-3 text-emerald-600" /> ✓ Оплачено
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
      )}

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
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900">Редактирование контакта</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">ФИО представителя *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Телефон *</label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Telegram</label>
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="@username"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">WhatsApp</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+7 999 000-00-00"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Предпочитаемый канал связи</label>
            <select
              value={preferredChannel}
              onChange={(e) => setPreferredChannel(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none"
            >
              <option value="Telegram">Telegram</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Phone">Звонок</option>
              <option value="both">Почта и TG</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Сохранить
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
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <Trash2 className="h-6 w-6" />
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900">Удалить контакт?</h3>
          <p className="mt-1 text-xs text-slate-500">
            Контакт <strong className="text-slate-800">{parent.name}</strong> будет перемещен в раздел «Удаленные». Вы сможете восстановить его в любой момент.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors"
          >
            Да, удалить
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
  onCreate: (newParent: Omit<ParentRecord, 'id' | 'children' | 'totalPaid' | 'balanceStatus'>) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [telegram, setTelegram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [preferredChannel, setPreferredChannel] = useState('Telegram');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900">Новый контакт родителя</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">ФИО представителя *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Иванова Анна Сергеевна"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Телефон *</label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (999) 000-00-00"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Telegram</label>
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="@username"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">WhatsApp</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+7 999 000-00-00"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Предпочитаемый канал связи</label>
            <select
              value={preferredChannel}
              onChange={(e) => setPreferredChannel(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none"
            >
              <option value="Telegram">Telegram</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Phone">Звонок</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Создать контакт
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
