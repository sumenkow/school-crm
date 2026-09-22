'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFocusSync } from '@/hooks/useFocusSync';
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
  CheckSquare,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';
import { INITIAL_STUDENTS, FullStudentData } from '@/lib/data/mockData';
import {
  getStoredStudents,
  saveStudentToStorage,
  reconcileAllStudentDepositsAndDebts,
  getDeletedParentIds,
  softDeleteParent,
  restoreParent,
} from '@/lib/data/studentStorage';
import { parsePaymentAmountEUR } from '@/lib/data/currencyHelper';
import { AddChildModal } from '@/components/parents/AddChildModal';
import { cn } from '@/lib/utils';

const WhatsAppIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={cn('fill-current', className)} viewBox="0 0 24 24">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

const TelegramIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={cn('fill-current', className)} viewBox="0 0 24 24">
    <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.536-.196 1.006.128.833.942z" />
  </svg>
);

export interface ChildDetails {
  id: string;
  name: string;
  group: string;
  studentType?: string;
  nextLesson?: string;
  teacherName?: string;
}

export interface ParentRecord {
  id: string;
  name: string;
  phone: string;
  telegram?: string;
  whatsapp?: string;
  email?: string;
  preferredChannel: string;
  notifyWhatsapp?: boolean;
  notifyTelegram?: boolean;
  notifyEmail?: boolean;
  relationshipType?: string;
  children: ChildDetails[];
  totalPaid: string;
  totalPaidEUR?: number;
  balanceStatus: string; // 'paid' | 'debt' | 'trial'
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
    children: [
      {
        id: '1',
        name: 'Иван Смирнов',
        group: 'English B1 Teens',
        studentType: 'Школьник',
        nextLesson: 'Пн, Чт • 18:45',
        teacherName: 'Мария Иванова',
      },
    ],
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
      {
        id: '2',
        name: 'Мария Кузнецова',
        group: 'Robotics Junior',
        studentType: 'Школьник',
        nextLesson: 'Ср 15:00, Сб 11:00',
        teacherName: 'Денис Смирнов',
      },
      {
        id: 's18',
        name: 'Артём Кузнецов',
        group: 'Robotics Junior, Kids Math Safari',
        studentType: 'Школьник',
        nextLesson: 'Ср 15:00, Сб 11:00',
        teacherName: 'Денис Смирнов',
      },
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
    children: [
      {
        id: 's6',
        name: 'Максим Захаров',
        group: 'English B1 Teens',
        studentType: 'Школьник',
        nextLesson: 'Пн, Чт • 18:45',
        teacherName: 'Мария Иванова',
      },
      {
        id: '4',
        name: 'Сергей Попов',
        group: 'Robotics Junior',
        studentType: 'Школьник',
        nextLesson: 'Ср 15:00, Сб 11:00',
        teacherName: 'Денис Смирнов',
      },
    ],
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
    children: [
      {
        id: '3',
        name: 'Анна Васильева',
        group: 'Kids English A1',
        studentType: 'Школьник',
        nextLesson: 'Вт, Пт • 17:00',
        teacherName: 'Ольга Соколова',
      },
    ],
    totalPaid: '0 €',
    balanceStatus: 'debt',
  },
];

export function normalizePhone(phone?: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (clean.length === 11 && (clean.startsWith('8') || clean.startsWith('7'))) {
    clean = '7' + clean.slice(1);
  }
  return clean;
}

export function formatPhone(phone?: string): string {
  if (!phone) return '—';
  const clean = normalizePhone(phone);
  if (!clean) return phone;

  if (clean.length === 11 && clean.startsWith('7')) {
    return `+7 (${clean.slice(1, 4)}) ${clean.slice(4, 7)}-${clean.slice(7, 9)}-${clean.slice(9, 11)}`;
  }
  if (clean.length > 6) {
    return `+${clean.slice(0, 1)} (${clean.slice(1, 4)}) ${clean.slice(4, 7)}-${clean.slice(7, 9)}-${clean.slice(9)}`;
  }
  return phone;
}

export function cleanGroupName(groupStr: string): string[] {
  if (!groupStr) return ['Основной курс'];
  return groupStr
    .split(',')
    .map((g) => g.replace(/\[.*?\]/g, '').replace(/•.*$/g, '').trim())
    .filter(Boolean);
}

function getMergedParents(): ParentRecord[] {
  const allStudents = typeof window !== 'undefined' ? getStoredStudents() : INITIAL_STUDENTS;
  const parentMap = new Map<string, ParentRecord>();

  const addOrMergeParent = (rawParent: Partial<ParentRecord> & { id: string; name: string; phone: string }) => {
    const cleanP = normalizePhone(rawParent.phone);
    const cleanN = (rawParent.name || '').toLowerCase().trim();

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
      const existingChildrenMap = new Map(existing.children.map((c) => [c.id, c]));

      (rawParent.children || []).forEach((c) => {
        if (!existingChildrenMap.has(c.id)) {
          existingChildrenMap.set(c.id, c);
        } else {
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
        email: existing.email || rawParent.email,
        notifyWhatsapp: rawParent.notifyWhatsapp !== undefined ? rawParent.notifyWhatsapp : existing.notifyWhatsapp,
        notifyTelegram: rawParent.notifyTelegram !== undefined ? rawParent.notifyTelegram : existing.notifyTelegram,
        notifyEmail: rawParent.notifyEmail !== undefined ? rawParent.notifyEmail : existing.notifyEmail,
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
        email: rawParent.email,
        preferredChannel: rawParent.preferredChannel || 'Telegram',
        notifyWhatsapp: rawParent.notifyWhatsapp !== undefined ? rawParent.notifyWhatsapp : true,
        notifyTelegram: rawParent.notifyTelegram !== undefined ? rawParent.notifyTelegram : true,
        notifyEmail: rawParent.notifyEmail !== undefined ? rawParent.notifyEmail : true,
        relationshipType: rawParent.relationshipType || 'Родитель',
        children: rawParent.children || [],
        totalPaid: '0 €',
        balanceStatus: 'paid',
      });
    }
  };

  // 1. Seed from INITIAL_PARENTS
  for (const init of INITIAL_PARENTS) {
    addOrMergeParent({ ...init });
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
        const stCategory = st.studentType === 'adult_student' ? 'Студент' : 'Школьник';
        const stNextLesson = st.groups?.[0]?.schedule || 'Ср 21 сен, 18:45';
        const stTeacher = st.groups?.[0]?.teacherName || 'Мария Иванова';

        const childInfo: ChildDetails = {
          id: st.id,
          name: childFullName,
          group: formattedGroups,
          studentType: stCategory,
          nextLesson: stNextLesson,
          teacherName: stTeacher,
        };

        addOrMergeParent({
          id: pr.id || `pr_${st.id}`,
          name: fullName,
          phone: pr.phone || '+7 (999) 000-00-00',
          telegram: pr.telegram,
          whatsapp: pr.whatsapp,
          email: pr.email,
          preferredChannel: pr.preferredChannel || 'Telegram',
          notifyWhatsapp: (pr as any).notifyWhatsapp !== false,
          notifyTelegram: (pr as any).notifyTelegram !== false,
          notifyEmail: (pr as any).notifyEmail !== false,
          relationshipType: (pr as any).relationshipType || 'Родитель',
          children: [childInfo],
        });
      }
    }
  }

  // 3. Financial calculations per family
  const result: ParentRecord[] = [];
  const deletedIds = typeof window !== 'undefined' ? getDeletedParentIds() : new Set<string>();

  parentMap.forEach((parent) => {
    let totalDepositEUR = 0;
    let totalDebtEUR = 0;
    let totalPaidEUR = 0;
    let hasTrialChild = false;

    // Deduplicate children by child ID strictly
    const uniqueChildrenMap = new Map<string, ChildDetails>();
    for (const c of parent.children) {
      const studentObj = allStudents.find((s) => s.id === c.id);
      uniqueChildrenMap.set(c.id, {
        ...c,
        studentType: studentObj?.studentType === 'adult_student' ? 'Студент' : 'Школьник',
        nextLesson: studentObj?.groups?.[0]?.schedule || c.nextLesson || 'Ср 21 сен, 18:45',
        teacherName: studentObj?.groups?.[0]?.teacherName || c.teacherName || 'Мария Иванова',
      });
    }
    const uniqueChildren = Array.from(uniqueChildrenMap.values());
    parent.children = uniqueChildren;

    for (const child of uniqueChildren) {
      const studentObj = allStudents.find((s) => s.id === child.id);
      if (studentObj) {
        if (studentObj.status === 'trial') {
          hasTrialChild = true;
        }

        let childDebt = 0;
        let childPaid = 0;

        (studentObj.finance?.payments || []).forEach((pay) => {
          const amtEUR = parsePaymentAmountEUR(pay.amount, 120);
          if (pay.status === 'paid') {
            childPaid += amtEUR;
          } else if (pay.status === 'overdue' || (pay.status as any) === 'expected' || (pay.status as any) === 'pending') {
            childDebt += amtEUR;
          }
        });

        if (studentObj.finance?.activeSubscription?.status === 'expired' && childDebt === 0) {
          const subPriceEUR = parsePaymentAmountEUR(studentObj.finance.activeSubscription.price, 120);
          childDebt += subPriceEUR > 0 ? subPriceEUR : 76;
        }

        if (studentObj.finance?.deposit?.balance && studentObj.finance.deposit.balance < 0) {
          childDebt += Math.abs(studentObj.finance.deposit.balance);
        }

        totalPaidEUR += childPaid;
        totalDebtEUR += childDebt;
      }
    }

    let balanceStatus = 'paid';
    if (totalDebtEUR > 0) {
      balanceStatus = 'debt';
    } else if (hasTrialChild && totalPaidEUR === 0) {
      balanceStatus = 'trial';
    } else {
      balanceStatus = 'paid';
    }

    const isDeleted = deletedIds.has(parent.id);

    result.push({
      ...parent,
      totalPaid: `${totalPaidEUR.toLocaleString('ru-RU')} € (~${(totalPaidEUR * 100).toLocaleString('ru-RU')} ₽)`,
      totalPaidEUR,
      balanceStatus,
      depositFormatted: totalDebtEUR === 0 ? `✓ Оплачено до 28.09` : undefined,
      depositBalance: totalDepositEUR,
      debtFormatted: totalDebtEUR > 0 ? `Долг: -${totalDebtEUR} €` : undefined,
      debtBalance: totalDebtEUR,
      isDeleted,
    });
  });

  // Unique Parents map deduplication before returning
  const uniqueParents = Array.from(new Map(result.map((p) => [p.id, p])).values());
  return uniqueParents;
}

type SortField = 'name' | 'child' | 'balance';
type SortOrder = 'asc' | 'desc';

export default function ParentsPage() {
  const router = useRouter();
  const { success } = useToast();
  const { t } = useLanguage();

  const [searchTerm, setSearchTerm] = useState('');
  const [parents, setParents] = useState<ParentRecord[]>(() => getMergedParents());
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeCoursePopoverId, setActiveCoursePopoverId] = useState<string | null>(null);

  // View Mode: Table vs Grid
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [quickFilter, setQuickFilter] = useState<'all' | 'debt' | 'deleted'>('all');

  // Toolbar Course Filter
  const [courseFilter, setCourseFilter] = useState<string>('all');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

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

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const syncParents = React.useCallback(() => {
    reconcileAllStudentDepositsAndDebts();
    setParents(getMergedParents());
  }, []);

  useFocusSync(syncParents);

  useEffect(() => {
    syncParents();
    window.addEventListener('crm-students-changed', syncParents);
    window.addEventListener('crm-parents-changed', syncParents);
    window.addEventListener('crm-payments-changed', syncParents);
    window.addEventListener('crm-lessons-changed', syncParents);
    window.addEventListener('crm-tasks-changed', syncParents);
    return () => {
      window.removeEventListener('crm-students-changed', syncParents);
      window.removeEventListener('crm-parents-changed', syncParents);
      window.removeEventListener('crm-payments-changed', syncParents);
      window.removeEventListener('crm-lessons-changed', syncParents);
      window.removeEventListener('crm-tasks-changed', syncParents);
    };
  }, [syncParents]);

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

  // Guaranteed Unique Parents Array
  const uniqueParents = Array.from(new Map(parents.map((p) => [p.id, p])).values());

  const activeParents = uniqueParents.filter((p) => !p.isDeleted);
  const deletedParents = uniqueParents.filter((p) => p.isDeleted);
  const debtParentsCount = activeParents.filter((p) => (p.debtBalance && p.debtBalance > 0) || p.balanceStatus === 'debt').length;

  // Extract unique course list for course selector
  const allCourses = Array.from(
    new Set(
      activeParents
        .flatMap((p) => p.children)
        .flatMap((c) => cleanGroupName(c.group))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, 'ru'));

  const currentList = quickFilter === 'deleted' ? deletedParents : activeParents;

  // Strict search & filter matching
  const filteredParents = currentList.filter((p) => {
    // Quick filter tab
    if (quickFilter === 'debt' && (!p.debtBalance || p.debtBalance <= 0) && p.balanceStatus !== 'debt') return false;

    // Course filter dropdown
    if (courseFilter !== 'all') {
      const matchesCourse = p.children.some((c) => c.group.toLowerCase().includes(courseFilter.toLowerCase()));
      if (!matchesCourse) return false;
    }

    // Strict Search Matching (checks ONLY parent name, parent phone, or child name)
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      const nameMatch = p.name.toLowerCase().includes(term);
      const phoneMatch = p.phone.includes(term) || normalizePhone(p.phone).includes(normalizePhone(term));
      const childMatch = p.children.some((c) => c.name.toLowerCase().includes(term));
      return nameMatch || phoneMatch || childMatch;
    }

    return true;
  });

  // Apply sorting
  const sortedParents = [...filteredParents].sort((a, b) => {
    if (sortField === 'name') {
      const cmp = a.name.localeCompare(b.name, 'ru');
      return sortOrder === 'asc' ? cmp : -cmp;
    }
    if (sortField === 'child') {
      const childA = a.children[0]?.name || '';
      const childB = b.children[0]?.name || '';
      const cmp = childA.localeCompare(childB, 'ru');
      return sortOrder === 'asc' ? cmp : -cmp;
    }
    if (sortField === 'balance') {
      const debtA = a.debtBalance || 0;
      const debtB = b.debtBalance || 0;
      if (sortOrder === 'asc') {
        return debtB - debtA;
      } else {
        return debtA - debtB;
      }
    }
    return 0;
  });

  const isFiltered = searchTerm.trim() !== '' || courseFilter !== 'all' || quickFilter !== 'all';
  const allFilteredSelected = sortedParents.length > 0 && sortedParents.every((p) => selectedIds.includes(p.id));

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(sortedParents.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

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

  const handleCreateParent = (created: ParentRecord) => {
    setParents((prev) => [created, ...prev]);
    success(`Контакт ${created.name} добавлен в базу`);
    setIsCreateModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* PAGE HEADER (Task 1: Concise title & counter "X из Y") */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('parents.title', 'Родители и контакты')}</h1>
          <span className="text-sm font-medium text-slate-500">
            {isFiltered
              ? `(Показано ${sortedParents.length} из ${activeParents.length})`
              : `(${activeParents.length})`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Filters Panel (No Multichild Tab) */}
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
            <button
              onClick={() => setQuickFilter('all')}
              className={cn(
                'rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer',
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
                'rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                quickFilter === 'debt'
                  ? 'bg-white text-rose-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              С задолженностью ({debtParentsCount})
            </button>
            <button
              onClick={() => setQuickFilter('deleted')}
              className={cn(
                'rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer',
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

      {/* TOOLBAR: SEARCH (with ✕ clear button) + COURSE SELECTOR + VIEW SWITCHER */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
        {/* Search input with ✕ clear button */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Поиск по имени представителя, ребенку или телефону..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Очистить поиск"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Course Selector */}
          <div className="relative shrink-0">
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Все курсы / группы</option>
              {allCourses.map((cName) => (
                <option key={cName} value={cName}>
                  {cName}
                </option>
              ))}
            </select>
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
      </div>

      {/* RENDER TABLE OR GRID VIEW */}
      {viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs table-fixed">
            <colgroup>
              <col className="w-[44px]" />
              <col className="w-[27%]" />
              <col className="w-[23%]" />
              <col className="w-[26%]" />
              <col className="w-[24%]" />
            </colgroup>
            <thead className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3.5 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    title="Выбрать всех"
                  />
                </th>

                {/* 2. ПРЕДСТАВИТЕЛЬ (Sortable) */}
                <th className="px-3.5 py-3 text-left">
                  <button
                    type="button"
                    onClick={() => handleSortToggle('name')}
                    className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-blue-600 cursor-pointer"
                  >
                    <span>ПРЕДСТАВИТЕЛЬ</span>
                    {sortField === 'name' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                </th>

                {/* 3. УЧЕНИК (Sortable) */}
                <th className="px-3.5 py-3 text-left">
                  <button
                    type="button"
                    onClick={() => handleSortToggle('child')}
                    className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-blue-600 cursor-pointer"
                  >
                    <span>УЧЕНИК</span>
                    {sortField === 'child' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                </th>

                {/* 4. КУРС (Static) */}
                <th className="px-3.5 py-3 text-left">КУРС</th>

                {/* 5. СТАТУС ОПЛАТЫ (Sortable) */}
                <th className="px-3.5 py-3 text-left">
                  <button
                    type="button"
                    onClick={() => handleSortToggle('balance')}
                    className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-blue-600 cursor-pointer"
                  >
                    <span>СТАТУС ОПЛАТЫ</span>
                    {sortField === 'balance' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {sortedParents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Контакты не найдены
                  </td>
                </tr>
              ) : (
                sortedParents.map((p) => {
                  const isSelected = selectedIds.includes(p.id);
                  const initials = p.name
                    .split(' ')
                    .map((n) => n[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || 'Р';

                  const phoneClean = normalizePhone(p.phone);
                  const formattedPhoneStr = formatPhone(p.phone);
                  const waLink = p.whatsapp
                    ? `https://wa.me/${normalizePhone(p.whatsapp)}`
                    : `https://wa.me/${phoneClean}`;
                  const tgHandle = (p.telegram || '').replace('@', '');
                  const tgLink = tgHandle ? `https://t.me/${tgHandle}` : `https://t.me/+${phoneClean}`;

                  return (
                    <tr
                      key={p.id}
                      className={cn(
                        'transition-colors border-b border-slate-100',
                        isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/80',
                        p.children.length > 1 ? 'py-2.5' : 'h-14'
                      )}
                    >
                      {/* Чекбокс */}
                      <td className="px-3.5 py-2.5 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(p.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* 2. ПРЕДСТАВИТЕЛЬ (Phone LEFT, Messengers RIGHT via flex justify-between) */}
                      <td className="px-3.5 py-2.5 align-middle">
                        <div className="flex items-center gap-2.5">
                          <Link href={`/parents/${p.id}`} className="relative shrink-0 block">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center border border-slate-200 hover:border-blue-400 transition-colors">
                              {initials}
                            </div>
                          </Link>

                          <div className="min-w-0 flex-1 space-y-0.5">
                            <Link
                              href={`/parents/${p.id}`}
                              className="font-semibold text-sm text-slate-900 hover:text-blue-600 transition-colors block truncate"
                              title={p.name}
                            >
                              {p.name}
                            </Link>

                            <div className="flex items-center justify-between w-full mt-1 min-w-0">
                              <a
                                href={`tel:${phoneClean}`}
                                onClick={(e) => e.stopPropagation()}
                                title="Позвонить по телефону"
                                className="font-mono text-[11px] text-slate-500 hover:text-blue-600 hover:underline whitespace-nowrap block shrink-0"
                              >
                                {formattedPhoneStr}
                              </a>

                              {phoneClean && (
                                <div className="flex items-center gap-1 shrink-0">
                                  {/* WhatsApp */}
                                  <a
                                    href={waLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Написать в WhatsApp"
                                    className="w-6 h-6 rounded bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white flex items-center justify-center transition-all border border-[#25D366]/20 cursor-pointer"
                                  >
                                    <WhatsAppIcon className="w-3.5 h-3.5" />
                                  </a>

                                  {/* Telegram */}
                                  <a
                                    href={tgLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Написать в Telegram"
                                    className="w-6 h-6 rounded bg-[#229ED9]/10 hover:bg-[#229ED9] text-[#229ED9] hover:text-white flex items-center justify-center transition-all border border-[#229ED9]/20 cursor-pointer"
                                  >
                                    <TelegramIcon className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. УЧЕНИК (Synchronized 1-to-1 parallel rows with КУРС) */}
                      <td className="px-3.5 py-2.5 align-middle">
                        {p.children.length === 0 ? (
                          <span className="text-xs text-slate-400 font-semibold">— Без учеников</span>
                        ) : (
                          <div className="space-y-2">
                            {p.children.map((c) => (
                              <div key={c.id} className="min-w-0 space-y-0.5 min-h-[32px] flex flex-col justify-center">
                                <Link
                                  href={`/students/${c.id}`}
                                  className="font-semibold text-sm text-slate-900 hover:text-blue-600 transition-colors block truncate"
                                  title={c.name}
                                >
                                  {c.name}
                                </Link>
                                <span className="text-[11px] text-slate-400 block truncate">
                                  {c.studentType || 'Школьник'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* 4. КУРС (Synchronized 1-to-1 parallel rows with УЧЕНИК + Interactive +1 Popover) */}
                      <td className="px-3.5 py-2.5 align-middle">
                        {p.children.length === 0 ? (
                          <span className="text-xs text-slate-400 select-none">— Без группы</span>
                        ) : (
                          <div className="space-y-2">
                            {p.children.map((c) => {
                              const groups = cleanGroupName(c.group);
                              const mainGroup = groups[0] || 'English B1 Teens';
                              const hasExtra = groups.length > 1;
                              const popoverKey = `${p.id}_${c.id}`;

                              return (
                                <div key={c.id} className="min-w-0 space-y-0.5 min-h-[32px] flex flex-col justify-center">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="bg-slate-100 text-slate-700 border border-slate-200/80 text-xs font-semibold px-2 py-0.5 rounded-md inline-block truncate">
                                      {mainGroup}
                                    </span>

                                    {/* Interactive +1 Popover Badge */}
                                    {hasExtra && (
                                      <div
                                        className="relative shrink-0 inline-flex items-center"
                                        onMouseEnter={() => setActiveCoursePopoverId(popoverKey)}
                                        onMouseLeave={() => setActiveCoursePopoverId(null)}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded cursor-pointer hover:bg-slate-200 transition-colors">
                                          +{groups.length - 1}
                                        </span>

                                        {/* Popover */}
                                        {activeCoursePopoverId === popoverKey && (
                                          <div className="absolute left-0 bottom-full mb-2 z-50 w-64 p-3 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 text-xs animate-in fade-in duration-150 font-normal">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
                                              Дополнительные группы ({groups.length - 1})
                                            </div>
                                            <div className="space-y-2">
                                              {groups.slice(1).map((gName, gIdx) => (
                                                <div key={gIdx} className="space-y-0.5">
                                                  <div className="font-bold text-white text-xs">{gName}</div>
                                                  <div className="text-slate-300 text-[11px]">
                                                    🗓 {c.nextLesson || 'Ср, Сб 15:00'}
                                                  </div>
                                                  <div className="text-slate-400 text-[10px]">
                                                    Преподаватель: {c.teacherName || 'Денис Смирнов'}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  <span className="text-[11px] text-slate-400 block truncate">
                                    → {c.nextLesson || 'Ср 21 сен, 18:45'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* 5. СТАТУС ОПЛАТЫ */}
                      <td className="px-3.5 py-2.5 align-middle">
                        <Link
                          href={`/parents/${p.id}`}
                          className="block group min-w-0"
                        >
                          {p.debtBalance && p.debtBalance > 0 ? (
                            <div className="space-y-0.5">
                              <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-2.5 py-0.5 rounded-lg whitespace-nowrap inline-block">
                                Долг: -{p.debtBalance} €
                              </span>
                              <div className="text-[11px] font-semibold text-rose-600 truncate">
                                Баланс: -{p.debtBalance} € <span className="text-rose-400 font-normal">(-{Math.round(p.debtBalance * 100).toLocaleString('ru-RU')} ₽)</span>
                              </div>
                            </div>
                          ) : p.balanceStatus === 'trial' ? (
                            <div className="space-y-0.5">
                              <span className="bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold px-2.5 py-0.5 rounded-lg inline-block">
                                Пробный
                              </span>
                              <div className="text-[11px] text-purple-600 font-medium truncate">
                                Оплата не требуется
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1 whitespace-nowrap">
                                ✓ Оплачено до 28.09
                              </span>
                              <div className="text-[11px] text-slate-500 font-medium truncate">
                                Баланс: 0 € <span className="text-slate-400 font-normal">• абонемент</span>
                              </div>
                            </div>
                          )}
                        </Link>
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
          {sortedParents.map((p) => {
            const initials = p.name
              .split(' ')
              .map((n) => n[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase() || 'Р';

            const formattedPhoneStr = formatPhone(p.phone);
            const cleanPhoneStr = normalizePhone(p.phone);
            const waLink = p.whatsapp
              ? `https://wa.me/${normalizePhone(p.whatsapp)}`
              : `https://wa.me/${cleanPhoneStr}`;
            const tgHandle = (p.telegram || '').replace('@', '');
            const tgLink = tgHandle ? `https://t.me/${tgHandle}` : `https://t.me/+${cleanPhoneStr}`;

            return (
              <div
                key={p.id}
                className="relative rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between gap-3"
              >
                <div>
                  {/* Header: Avatar, Name, Action menu */}
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
                            <User className="h-3.5 w-3.5 text-indigo-600" />
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
                            <UserPlus className="h-3.5 w-3.5 text-blue-600" />
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
                    <div className="flex items-center gap-1 font-mono">
                      <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                      <a href={`tel:${p.phone}`} className="hover:text-blue-600 font-medium truncate">
                        {formattedPhoneStr}
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
                        p.children.map((child) => {
                          const groupNames = cleanGroupName(child.group);
                          return (
                            <Link
                              key={child.id}
                              href={`/students/${child.id}`}
                              className="flex items-center justify-between gap-1.5 rounded-md bg-slate-50/90 px-2 py-1 text-xs hover:bg-blue-50 transition-colors"
                              title={`${child.name} — ${child.group}`}
                            >
                              <span className="font-semibold text-slate-800 text-[11px] truncate">{child.name}</span>
                              <span className="text-[10px] text-slate-500 font-medium truncate max-w-[130px]">
                                {groupNames.join(', ')} →
                              </span>
                            </Link>
                          );
                        })
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

      {/* 4. Modal: Create Parent (Full Version with Child Selector) */}
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
  const [email, setEmail] = useState(parent.email || '');
  const [telegram, setTelegram] = useState(parent.telegram || '');
  const [whatsapp, setWhatsapp] = useState(parent.whatsapp || '');
  const [preferredChannel, setPreferredChannel] = useState(parent.preferredChannel || 'Telegram');
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(parent.notifyWhatsapp !== false);
  const [notifyTelegram, setNotifyTelegram] = useState(parent.notifyTelegram !== false);
  const [notifyEmail, setNotifyEmail] = useState(parent.notifyEmail !== false);
  const [relationshipType, setRelationshipType] = useState(parent.relationshipType || 'Родитель');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...parent,
      name,
      phone,
      email: email || undefined,
      telegram: telegram || undefined,
      whatsapp: whatsapp || undefined,
      preferredChannel,
      notifyWhatsapp,
      notifyTelegram,
      notifyEmail,
      relationshipType,
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

          <div className="grid grid-cols-2 gap-2">
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
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Роль / Статус</label>
              <select
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none"
              >
                <option value="Мама">Мама</option>
                <option value="Отец">Отец</option>
                <option value="Опекун">Опекун</option>
                <option value="Бабушка / Дедушка">Бабушка / Дедушка</option>
                <option value="ЛПР">ЛПР (Законный представитель)</option>
              </select>
            </div>
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
                placeholder="+7 (999) 000-00-00"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Электронная почта (Email)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Channels & Notifications */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
            <label className="block font-bold text-slate-800 text-xs">
              Каналы связи и уведомлений
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={notifyWhatsapp}
                  onChange={(e) => setNotifyWhatsapp(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-800">WhatsApp</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={notifyTelegram}
                  onChange={(e) => setNotifyTelegram(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-800">Telegram</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-800">Email</span>
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Основной канал для счетов и отчетов
              </label>
              <select
                value={preferredChannel}
                onChange={(e) => setPreferredChannel(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Telegram">✈️ Telegram</option>
                <option value="WhatsApp">💬 WhatsApp</option>
                <option value="Email">📧 Email</option>
                <option value="Phone">📞 Телефон</option>
              </select>
            </div>
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
  onCreate: (created: ParentRecord) => void;
}) {
  const { error } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [telegram, setTelegram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [preferredChannel, setPreferredChannel] = useState('Telegram');
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [notifyTelegram, setNotifyTelegram] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [relationshipType, setRelationshipType] = useState('Мама');

  // Child linkage options
  const [childMode, setChildMode] = useState<'existing' | 'new' | 'none'>('existing');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [newChildFirstName, setNewChildFirstName] = useState('');
  const [newChildLastName, setNewChildLastName] = useState('');
  const [newChildGroup, setNewChildGroup] = useState('English B1 Teens');

  const [availableStudents, setAvailableStudents] = useState<FullStudentData[]>([]);

  useEffect(() => {
    const list = getStoredStudents();
    setAvailableStudents(list);
    if (list.length > 0) {
      setSelectedStudentId(list[0].id);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanP = normalizePhone(phone);
    if (cleanP) {
      const allParents = getMergedParents();
      const existing = allParents.find((p) => normalizePhone(p.phone) === cleanP);
      if (existing) {
        error(`Контакт с номером ${phone} уже есть в базе: ${existing.name}`);
        return;
      }
    }

    const newParentId = `p_${Date.now()}`;
    const attachedChildren: ChildDetails[] = [];

    // 1. Link to existing student
    if (childMode === 'existing' && selectedStudentId) {
      const st = availableStudents.find((s) => s.id === selectedStudentId);
      if (st) {
        const groupNames = (st.groups || []).map((g: any) => g.name || g.courseName).filter(Boolean);
        attachedChildren.push({
          id: st.id,
          name: `${st.firstName} ${st.lastName}`.trim(),
          group: groupNames.length > 0 ? groupNames.join(', ') : 'Основной курс',
          studentType: st.studentType === 'adult_student' ? 'Студент' : 'Школьник',
          nextLesson: st.groups?.[0]?.schedule || 'Ср 21 сен, 18:45',
          teacherName: st.groups?.[0]?.teacherName || 'Мария Иванова',
        });

        // Save parent to student in storage
        const nameParts = name.trim().split(' ');
        const prFirstName = nameParts[0] || 'Родитель';
        const prLastName = nameParts.slice(1).join(' ') || '';

        const updatedParents = [...(st.parents || [])];
        updatedParents.push({
          id: newParentId,
          firstName: prFirstName,
          lastName: prLastName,
          phone: phone || '+7 (999) 000-00-00',
          telegram: telegram || undefined,
          whatsapp: whatsapp || undefined,
          email: email || undefined,
          preferredChannel: preferredChannel as any,
          notifyWhatsapp,
          notifyTelegram,
          notifyEmail,
          relationshipType,
          isPrimary: updatedParents.length === 0,
        });

        saveStudentToStorage({
          ...st,
          parents: updatedParents,
        });
      }
    }

    // 2. Create new child
    if (childMode === 'new' && newChildFirstName.trim()) {
      const newStudentId = `st_${Date.now()}`;
      const nameParts = name.trim().split(' ');
      const prFirstName = nameParts[0] || 'Родитель';
      const prLastName = nameParts.slice(1).join(' ') || '';

      const newStudent: FullStudentData = {
        id: newStudentId,
        firstName: newChildFirstName.trim(),
        lastName: newChildLastName.trim() || prLastName,
        studentType: 'school_student',
        grade: '1 класс',
        phone: phone || undefined,
        status: 'active',
        parents: [
          {
            id: newParentId,
            firstName: prFirstName,
            lastName: prLastName,
            phone: phone || '+7 (999) 000-00-00',
            telegram: telegram || undefined,
            whatsapp: whatsapp || undefined,
            email: email || undefined,
            preferredChannel: preferredChannel as any,
            notifyWhatsapp,
            notifyTelegram,
            notifyEmail,
            relationshipType,
            isPrimary: true,
          },
        ],
        groups: [
          {
            id: `g_${Date.now()}`,
            name: newChildGroup,
            courseName: newChildGroup,
            teacherName: 'Мария Иванова',
            schedule: 'Пн, Чт 18:45',
            status: 'active',
            joinedAt: new Date().toLocaleDateString('ru-RU'),
          },
        ],
        attendanceStats: {
          totalLessons: 0,
          presentCount: 0,
          absentCount: 0,
          rescheduledCount: 0,
          attendanceRate: '100%',
          history: [],
        },
        finance: {
          activeSubscription: {
            period: 'Сентябрь 2026',
            price: '7 600 ₽',
            status: 'active',
            lessonsAttended: '0 из 8',
            renewalDate: '30.09.2026',
          },
          deposit: {
            balance: 0,
            balanceFormatted: '0 ₽',
            currency: 'RUB',
            pricePerLesson: 1050,
            pricePerLessonFormatted: '1 050 ₽',
          },
          payments: [],
        },
        interactions: [],
        tasks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveStudentToStorage(newStudent);

      attachedChildren.push({
        id: newStudentId,
        name: `${newChildFirstName.trim()} ${newChildLastName.trim() || prLastName}`.trim(),
        group: newChildGroup,
        studentType: 'Школьник',
        nextLesson: 'Пн, Чт 18:45',
        teacherName: 'Мария Иванова',
      });
    }

    const created: ParentRecord = {
      id: newParentId,
      name: name.trim(),
      phone: phone.trim(),
      email: email || undefined,
      telegram: telegram || undefined,
      whatsapp: whatsapp || undefined,
      preferredChannel,
      notifyWhatsapp,
      notifyTelegram,
      notifyEmail,
      relationshipType,
      children: attachedChildren,
      totalPaid: '0 €',
      balanceStatus: 'paid',
      isDeleted: false,
    };

    onCreate(created);
    window.dispatchEvent(new Event('crm-parents-changed'));
    window.dispatchEvent(new Event('crm-students-changed'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Новый контакт родителя</h3>
            <p className="text-xs text-slate-500 mt-0.5">Карточка законного представителя и привязка к ученику</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Parent Details */}
          <div className="space-y-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">ФИО представителя *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Захарова Наталья Владимировна"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
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
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Роль / Статус</label>
                <select
                  value={relationshipType}
                  onChange={(e) => setRelationshipType(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none"
                >
                  <option value="Мама">Мама</option>
                  <option value="Отец">Отец</option>
                  <option value="Опекун">Опекун</option>
                  <option value="ЛПР">ЛПР (Законный представитель)</option>
                </select>
              </div>
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
                  placeholder="+7 (999) 000-00-00"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Электронная почта (Email)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Channels & Notifications */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
              <label className="block font-bold text-slate-800 text-xs">
                Каналы связи и уведомлений
              </label>
              <div className="grid grid-cols-3 gap-2">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={notifyWhatsapp}
                    onChange={(e) => setNotifyWhatsapp(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-800">WhatsApp</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={notifyTelegram}
                    onChange={(e) => setNotifyTelegram(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-800">Telegram</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-800">Email</span>
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Основной канал для счетов и отчетов
                </label>
                <select
                  value={preferredChannel}
                  onChange={(e) => setPreferredChannel(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Telegram">✈️ Telegram</option>
                  <option value="WhatsApp">💬 WhatsApp</option>
                  <option value="Email">📧 Email</option>
                  <option value="Phone">📞 Телефон</option>
                </select>
              </div>
            </div>
          </div>

          {/* Child Linkage Block */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Users className="h-4 w-4 text-blue-600" />
                Привязка ученика
              </span>
              <div className="inline-flex rounded-md bg-white p-0.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setChildMode('existing')}
                  className={cn(
                    'px-2 py-1 text-[11px] font-bold rounded transition-all',
                    childMode === 'existing' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600'
                  )}
                >
                  Из списка
                </button>
                <button
                  type="button"
                  onClick={() => setChildMode('new')}
                  className={cn(
                    'px-2 py-1 text-[11px] font-bold rounded transition-all',
                    childMode === 'new' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600'
                  )}
                >
                  + Новый ребенок
                </button>
                <button
                  type="button"
                  onClick={() => setChildMode('none')}
                  className={cn(
                    'px-2 py-1 text-[11px] font-bold rounded transition-all',
                    childMode === 'none' ? 'bg-slate-700 text-white shadow-2xs' : 'text-slate-600'
                  )}
                >
                  Позже
                </button>
              </div>
            </div>

            {childMode === 'existing' && (
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Выберите ученика из реестра</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none"
                >
                  {availableStudents.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.firstName} {st.lastName} ({st.groups?.[0]?.name || 'Основной курс'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {childMode === 'new' && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Имя ребенка *</label>
                    <input
                      type="text"
                      required={childMode === 'new'}
                      value={newChildFirstName}
                      onChange={(e) => setNewChildFirstName(e.target.value)}
                      placeholder="Максим"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Фамилия ребенка</label>
                    <input
                      type="text"
                      value={newChildLastName}
                      onChange={(e) => setNewChildLastName(e.target.value)}
                      placeholder="Захаров"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Курс / Группа</label>
                  <select
                    value={newChildGroup}
                    onChange={(e) => setNewChildGroup(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:outline-none"
                  >
                    <option value="English B1 Teens">English B1 Teens</option>
                    <option value="Robotics Junior">Robotics Junior</option>
                    <option value="Kids Math Safari">Kids Math Safari</option>
                    <option value="Kids English A1">Kids English A1</option>
                  </select>
                </div>
              </div>
            )}
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
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Создать контакт
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
