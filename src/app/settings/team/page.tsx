'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  UserPlus,
  Trash2,
  Copy,
  Check,
  Shield,
  GraduationCap,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Users2,
  Edit3,
  Key,
  Phone,
  Mail,
  Calendar,
  ChevronRight,
  MessageSquare,
  Search,
  LayoutGrid,
  Table,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { INITIAL_TEACHERS, FullTeacherData } from '@/lib/data/mockData';

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'admin' | 'teacher';
  phone?: string;
  is_active: boolean;
  created_at: string;
}

const ROLES_INFO = {
  owner: {
    label: 'Владелец',
    bg: 'var(--md-tertiary-container, #EEDCFF)',
    color: 'var(--md-on-tertiary-container, #28123C)',
    desc: 'Полный доступ ко всем разделам, аналитике школы, настройкам и управлению сотрудниками.',
  },
  admin: {
    label: 'Администратор',
    bg: 'var(--md-secondary-container)',
    color: 'var(--md-on-secondary-container)',
    desc: 'Управление учениками, родителями, группами, лидами, расписанием и фиксация оплат.',
  },
  teacher: {
    label: 'Преподаватель',
    bg: 'var(--md-primary-container)',
    color: 'var(--md-on-primary-container)',
    desc: 'Доступ только к своим занятиям, журналу посещаемости и группам, которые он ведет.',
  },
};

function TeamContent() {
  const { isOwner, role: currentRole } = useRole();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab');
  const roleParam = searchParams.get('role');
  const initialTab = (tabParam === 'teachers' || roleParam === 'teacher') ? 'teachers' : 'all';

  const [activeTab, setActiveTab] = useState<'all' | 'teachers' | 'admins'>(initialTab);
  const [teamSearch, setTeamSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(initialTab === 'teachers' ? 'cards' : 'table');

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Creation Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'teacher'>('teacher');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Created credential modal
  const [createdUser, setCreatedUser] = useState<{
    email: string;
    password?: string;
    fullName: string;
    role: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit Employee Card state
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'teacher'>('teacher');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editNewPassword, setEditNewPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editCopiedEmail, setEditCopiedEmail] = useState(false);

  const DEFAULT_MOCK_MEMBERS: TeamMember[] = [
    {
      id: 'u-owner',
      email: 'owner@school.ru',
      full_name: 'Алексей Смирнов',
      role: 'owner',
      phone: '+7 (495) 777-11-22',
      is_active: true,
      created_at: '2026-01-10T10:00:00Z',
    },
    {
      id: 'u-admin',
      email: 'admin@school.ru',
      full_name: 'Анна Администратор',
      role: 'admin',
      phone: '+7 (916) 123-45-67',
      is_active: true,
      created_at: '2026-02-01T11:30:00Z',
    },
    {
      id: 't1',
      email: 'maria.ivanova@school.ru',
      full_name: 'Мария Иванова',
      role: 'teacher',
      phone: '+7 (999) 777-11-22',
      is_active: true,
      created_at: '2026-02-15T09:00:00Z',
    },
    {
      id: 't2',
      email: 'denis.smirnov@school.ru',
      full_name: 'Денис Смирнов',
      role: 'teacher',
      phone: '+7 (999) 777-33-44',
      is_active: true,
      created_at: '2026-03-01T14:00:00Z',
    },
    {
      id: 't3',
      email: 'olga.sokolova@school.ru',
      full_name: 'Ольга Соколова',
      role: 'teacher',
      phone: '+7 (999) 777-55-66',
      is_active: true,
      created_at: '2026-03-10T16:00:00Z',
    },
  ];

  // Generate strong random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
    return res;
  };

  const generateEditPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setEditNewPassword(res);
  };

  // Open modal with pre-selected role
  const openCreateModalForRole = useCallback((targetRole: 'admin' | 'teacher') => {
    setRole(targetRole);
    generatePassword();
    setCreateError('');
    setShowCreateModal(true);
  }, []);

  // Open Edit Card
  const openEditCard = (member: TeamMember) => {
    setEditingMember(member);
    setEditFullName(member.full_name || '');
    setEditPhone(member.phone || '');
    setEditRole(member.role === 'owner' ? 'admin' : member.role);
    setEditIsActive(member.is_active !== false);
    setEditNewPassword('');
    setEditError('');
    setShowEditPassword(false);
  };

  // Check URL query params for ?role=teacher or ?role=admin
  useEffect(() => {
    const rParam = searchParams.get('role');
    if (rParam === 'teacher' || rParam === 'admin') {
      openCreateModalForRole(rParam);
    }
  }, [searchParams, openCreateModalForRole]);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/users');
      const data = await res.json();
      if (!res.ok || !data.users || data.users.length === 0) {
        setMembers(DEFAULT_MOCK_MEMBERS);
      } else {
        const loadedUsers: TeamMember[] = data.users;
        const missingTeachers = DEFAULT_MOCK_MEMBERS.filter(
          (dm) => dm.role === 'teacher' && !loadedUsers.some((u) => u.email === dm.email || u.id === dm.id)
        );
        setMembers([...loadedUsers, ...missingTeachers]);
      }
    } catch {
      setMembers(DEFAULT_MOCK_MEMBERS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner || currentRole === 'admin') {
      loadTeam();
    }
  }, [isOwner, currentRole, loadTeam]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);

    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          full_name: fullName.trim(),
          role,
          phone: phone.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCreateError(data.error || 'Ошибка при создании учетной записи');
      } else {
        setCreatedUser({
          email: email.trim(),
          password: data.user?.generatedPassword || password,
          fullName: fullName.trim(),
          role: ROLES_INFO[role].label,
        });
        setShowCreateModal(false);
        setFullName('');
        setEmail('');
        setPhone('');
        setPassword('');
        loadTeam();
      }
    } catch {
      setCreateError('Сетевая ошибка при создании пользователя');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setEditError('');
    setEditLoading(true);

    try {
      const res = await fetch('/api/auth/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMember.id,
          full_name: editFullName.trim(),
          phone: editPhone.trim() || undefined,
          role: editingMember.role === 'owner' ? 'owner' : editRole,
          is_active: editIsActive,
          new_password: editNewPassword.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setEditError(data.error || 'Ошибка сохранения изменений');
      } else {
        setActionSuccess(`Карточка сотрудника «${editFullName}» успешно обновлена!`);
        setTimeout(() => setActionSuccess(''), 4000);
        setEditingMember(null);
        loadTeam();
      }
    } catch {
      setEditError('Сетевая ошибка при сохранении');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Вы действительно хотите удалить учетную запись «${name}»? Доступ в систему будет полностью закрыт.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/auth/users?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Ошибка удаления');
      } else {
        setActionSuccess(`Сотрудник «${name}» удален`);
        setTimeout(() => setActionSuccess(''), 4000);
        if (editingMember?.id === id) {
          setEditingMember(null);
        }
        loadTeam();
      }
    } catch {
      alert('Ошибка при удалении');
    }
  };

  const copyCredentials = () => {
    if (!createdUser) return;
    const text = `Данные для доступа в School CRM:\nАдрес: ${window.location.origin}/login\nЛогин: ${createdUser.email}\nПароль: ${createdUser.password}\nРоль: ${createdUser.role}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (currentRole === 'teacher') {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="md-headline-medium" style={{ color: 'var(--md-on-surface)' }}>Команда и преподаватели</h1>
        <div className="md-card-outlined" style={{ padding: '48px', textAlign: 'center' }}>
          <Shield size={48} style={{ color: 'var(--md-on-surface-variant)', margin: '0 auto 16px' }} />
          <p className="md-title-medium" style={{ color: 'var(--md-on-surface)' }}>Доступ ограничен</p>
          <p className="md-body-medium" style={{ color: 'var(--md-on-surface-variant)', marginTop: '8px' }}>
            Раздел управления командой и педагогическим составом доступен только администрации и владельцу школы.
          </p>
        </div>
      </div>
    );
  }

  const getTeacherData = (member: TeamMember) => {
    return INITIAL_TEACHERS.find(
      (t) =>
        t.id === member.id ||
        t.email?.toLowerCase() === member.email?.toLowerCase() ||
        t.name?.toLowerCase() === member.full_name?.toLowerCase()
    );
  };

  const teachersCount = members.filter((m) => m.role === 'teacher').length;
  const adminsCount = members.filter((m) => m.role === 'admin' || m.role === 'owner').length;

  const filteredMembers = members.filter((m) => {
    if (activeTab === 'teachers' && m.role !== 'teacher') return false;
    if (activeTab === 'admins' && m.role !== 'admin' && m.role !== 'owner') return false;
    if (!teamSearch.trim()) return true;
    const q = teamSearch.toLowerCase();
    const tData = getTeacherData(m);
    return (
      m.full_name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      (m.phone && m.phone.toLowerCase().includes(q)) ||
      (tData?.role && tData.role.toLowerCase().includes(q)) ||
      (tData?.telegram && tData.telegram.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header with Quick Role-Specific Create Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="md-headline-medium" style={{ color: 'var(--md-on-surface)' }}>
            Команда и преподаватели
          </h1>
          <p className="md-body-medium" style={{ color: 'var(--md-on-surface-variant)', marginTop: '4px' }}>
            Педагогический состав, администраторы, учебная нагрузка и учетные записи сотрудников
          </p>
        </div>

        {/* Single Create Account Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              generatePassword();
              setShowCreateModal(true);
            }}
            className="md-btn md-btn-filled"
            style={{ gap: '8px' }}
          >
            <UserPlus size={18} />
            Создать учетную запись
          </button>
        </div>
      </div>

      {/* Success banner */}
      {actionSuccess && (
        <div
          style={{
            backgroundColor: 'var(--md-success-container)',
            color: 'var(--md-on-success-container)',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={18} />
          <span className="md-body-medium">{actionSuccess}</span>
        </div>
      )}

      {/* Quick Summary Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          onClick={() => setActiveTab('teachers')}
          className="md-card-outlined cursor-pointer transition-all hover:border-blue-400"
          style={{
            padding: '14px 18px',
            backgroundColor: activeTab === 'teachers' ? 'var(--md-primary-container)' : 'var(--md-surface-container-low)',
            borderColor: activeTab === 'teachers' ? 'var(--md-primary)' : undefined,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap size={18} style={{ color: 'var(--md-primary)' }} />
              <span className="md-label-large" style={{ color: 'var(--md-on-surface)' }}>Преподаватели</span>
            </div>
            <span className="md-headline-small" style={{ fontWeight: 700, color: 'var(--md-primary)' }}>
              {teachersCount}
            </span>
          </div>
          <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)', marginTop: '4px' }}>
            Нагрузка, расписание занятий и группы
          </p>
        </div>

        <div
          onClick={() => setActiveTab('admins')}
          className="md-card-outlined cursor-pointer transition-all hover:border-blue-400"
          style={{
            padding: '14px 18px',
            backgroundColor: activeTab === 'admins' ? 'var(--md-secondary-container)' : 'var(--md-surface-container-low)',
            borderColor: activeTab === 'admins' ? 'var(--md-secondary)' : undefined,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={18} style={{ color: 'var(--md-secondary, #2563eb)' }} />
              <span className="md-label-large" style={{ color: 'var(--md-on-surface)' }}>Администрация</span>
            </div>
            <span className="md-headline-small" style={{ fontWeight: 700, color: 'var(--md-on-surface)' }}>
              {adminsCount}
            </span>
          </div>
          <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)', marginTop: '4px' }}>
            Операционный контроль, лиды и касса
          </p>
        </div>

        <div
          onClick={() => setActiveTab('all')}
          className="md-card-outlined cursor-pointer transition-all hover:border-blue-400"
          style={{
            padding: '14px 18px',
            backgroundColor: activeTab === 'all' ? 'var(--md-surface-container)' : 'var(--md-surface-container-low)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users2 size={18} style={{ color: 'var(--md-on-surface-variant)' }} />
              <span className="md-label-large" style={{ color: 'var(--md-on-surface)' }}>Все сотрудники</span>
            </div>
            <span className="md-headline-small" style={{ fontWeight: 700, color: 'var(--md-on-surface)' }}>
              {members.length}
            </span>
          </div>
          <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)', marginTop: '4px' }}>
            Полный штатный состав онлайн-школы
          </p>
        </div>
      </div>

      {/* Toolbar: Tabs, Search & View Switcher */}
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-3 md-card-outlined"
        style={{ padding: '12px 16px', backgroundColor: 'var(--md-surface-container-low)' }}
      >
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`md-btn md-btn-sm ${activeTab === 'all' ? 'md-btn-filled' : 'md-btn-tonal'}`}
            style={{ borderRadius: '9999px', padding: '6px 14px' }}
          >
            Все ({members.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('teachers')}
            className={`md-btn md-btn-sm ${activeTab === 'teachers' ? 'md-btn-filled' : 'md-btn-tonal'}`}
            style={{ borderRadius: '9999px', padding: '6px 14px', gap: '6px' }}
          >
            <GraduationCap size={15} />
            Преподаватели ({teachersCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('admins')}
            className={`md-btn md-btn-sm ${activeTab === 'admins' ? 'md-btn-filled' : 'md-btn-tonal'}`}
            style={{ borderRadius: '9999px', padding: '6px 14px', gap: '6px' }}
          >
            <Shield size={15} />
            Администраторы ({adminsCount})
          </button>
        </div>

        {/* Search & View Mode Switcher */}
        <div className="flex items-center gap-2.5">
          <div style={{ position: 'relative', width: '260px' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--md-on-surface-variant)',
              }}
            />
            <input
              type="text"
              placeholder="Поиск сотрудника или предмета..."
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              className="md-input"
              style={{
                width: '100%',
                paddingLeft: '34px',
                paddingTop: '6px',
                paddingBottom: '6px',
                fontSize: '13px',
                borderRadius: '9999px',
              }}
            />
          </div>

          <div
            style={{
              display: 'inline-flex',
              padding: '2px',
              borderRadius: '9999px',
              backgroundColor: 'var(--md-surface-container)',
              border: '1px solid var(--md-outline-variant)',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="Табличный вид"
              className="md-btn md-btn-sm"
              style={{
                borderRadius: '9999px',
                padding: '6px 10px',
                backgroundColor: viewMode === 'table' ? 'var(--md-surface-container-lowest)' : 'transparent',
                color: viewMode === 'table' ? 'var(--md-primary)' : 'var(--md-on-surface-variant)',
                boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Table size={15} />
              <span className="hidden sm:inline ml-1 text-xs">Таблица</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              title="Карточки"
              className="md-btn md-btn-sm"
              style={{
                borderRadius: '9999px',
                padding: '6px 10px',
                backgroundColor: viewMode === 'cards' ? 'var(--md-surface-container-lowest)' : 'transparent',
                color: viewMode === 'cards' ? 'var(--md-primary)' : 'var(--md-on-surface-variant)',
                boxShadow: viewMode === 'cards' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <LayoutGrid size={15} />
              <span className="hidden sm:inline ml-1 text-xs">Карточки</span>
            </button>
          </div>

          <button
            onClick={loadTeam}
            disabled={loading}
            className="md-btn md-btn-tonal md-btn-sm"
            style={{ width: '34px', height: '34px', padding: 0, justifyContent: 'center' }}
            title="Обновить список"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--md-error)' }}>
          <AlertCircle size={24} style={{ margin: '0 auto 8px' }} />
          <p className="md-body-medium">{error}</p>
        </div>
      ) : loading && members.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p className="md-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
            Загрузка списка команды и преподавателей...
          </p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="md-card-outlined" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <GraduationCap size={44} style={{ color: 'var(--md-on-surface-variant)', margin: '0 auto 12px' }} />
          <p className="md-title-medium" style={{ color: 'var(--md-on-surface)' }}>
            Сотрудники не найдены
          </p>
          <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)', marginTop: '4px', maxWidth: '380px', margin: '4px auto 16px' }}>
            Попробуйте изменить поисковый запрос или фильтр по ролям.
          </p>
          <button
            onClick={() => {
              setTeamSearch('');
              setActiveTab('all');
            }}
            className="md-btn md-btn-tonal md-btn-sm"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="md-card-elevated" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--md-surface-container-low)', borderBottom: '1px solid var(--md-outline-variant)' }}>
                  <th style={{ padding: '12px 20px' }} className="md-label-large">Сотрудник</th>
                  <th style={{ padding: '12px 20px' }} className="md-label-large">Роль</th>
                  <th style={{ padding: '12px 20px' }} className="md-label-large">Учебная нагрузка / Задачи</th>
                  <th style={{ padding: '12px 20px' }} className="md-label-large">Контакты</th>
                  <th style={{ padding: '12px 20px' }} className="md-label-large">Статус</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right' }} className="md-label-large">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m) => {
                  const rInfo = ROLES_INFO[m.role] || ROLES_INFO.teacher;
                  const isCurrent = m.role === 'owner';
                  const tData = getTeacherData(m);

                  return (
                    <tr
                      key={m.id}
                      onClick={() => openEditCard(m)}
                      title="Нажмите для открытия карточки сотрудника"
                      style={{
                        borderBottom: '1px solid var(--md-outline-variant)',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                      }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <div className="flex items-center gap-3">
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              backgroundColor: rInfo.bg,
                              color: rInfo.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '15px',
                              flexShrink: 0,
                            }}
                          >
                            {(m.full_name || m.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="md-label-large" style={{ color: 'var(--md-on-surface)' }}>
                              {m.full_name || 'Без имени'}
                            </p>
                            {m.role === 'teacher' && tData?.role ? (
                              <p className="md-body-small text-xs line-clamp-1" style={{ color: 'var(--md-on-surface-variant)', maxWidth: '240px' }}>
                                {tData.role.split('(')[0]}
                              </p>
                            ) : isCurrent ? (
                              <span className="md-label-small" style={{ color: 'var(--md-primary)' }}>
                                Вы (Владелец)
                              </span>
                            ) : (
                              <span className="md-body-small text-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
                                {m.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          className="md-label-small"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            backgroundColor: rInfo.bg,
                            color: rInfo.color,
                            fontWeight: 600,
                          }}
                        >
                          {m.role === 'teacher' && <GraduationCap size={12} />}
                          {m.role === 'admin' && <Shield size={12} />}
                          {rInfo.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        {m.role === 'teacher' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-slate-800">
                              {tData?.weeklyHours ? `${tData.weeklyHours} ч/нед • ${tData.studentsCount || 0} уч.` : 'Нагрузка уточняется'}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {tData?.activeGroups ? `${tData.activeGroups.length} активных онлайн-групп` : 'Индивидуальные занятия'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">
                            {m.role === 'owner' ? 'Полное управление школой' : 'Лиды, касса, расписание'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-xs text-slate-700">
                            <Phone size={12} className="text-slate-400" />
                            <span>{m.phone || '—'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Mail size={12} className="text-slate-400" />
                            <span className="truncate max-w-[160px]">{m.email}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          className="md-label-small"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: m.is_active !== false ? 'var(--md-success-container)' : 'var(--md-error-container)',
                            color: m.is_active !== false ? 'var(--md-on-success-container)' : 'var(--md-on-error-container)',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: m.is_active !== false ? 'var(--md-success)' : 'var(--md-error)',
                            }}
                          />
                          {m.is_active !== false ? 'Активен' : 'Заблокирован'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {m.role === 'teacher' && (
                            <Link
                              href={`/teachers/${tData?.id || m.id}`}
                              className="md-btn md-btn-tonal md-btn-sm"
                              style={{ gap: '4px', padding: '5px 10px', fontSize: '12px' }}
                              title="Расписание преподавателя"
                            >
                              <Calendar size={13} />
                              Расписание
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditCard(m)}
                            className="md-btn md-btn-outlined md-btn-sm"
                            style={{ gap: '4px', padding: '5px 10px', fontSize: '12px' }}
                          >
                            <Edit3 size={13} />
                            Карточка
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMembers.map((m) => {
            const rInfo = ROLES_INFO[m.role] || ROLES_INFO.teacher;
            const tData = getTeacherData(m);

            return (
              <div
                key={m.id}
                className="md-card-elevated flex flex-col justify-between"
                style={{
                  padding: '20px',
                  borderRadius: '20px',
                  backgroundColor: 'var(--md-surface-container-lowest)',
                  border: '1px solid var(--md-outline-variant)',
                  gap: '16px',
                }}
              >
                <div>
                  {/* Card Top: Avatar, Name, Role badge & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '14px',
                          backgroundColor: rInfo.bg,
                          color: rInfo.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '17px',
                          flexShrink: 0,
                        }}
                      >
                        {(m.full_name || m.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base line-clamp-1">
                          {m.full_name || 'Без имени'}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {m.role === 'teacher' ? (tData?.role ? tData.role.split('(')[0] : 'Преподаватель') : rInfo.label}
                        </p>
                      </div>
                    </div>

                    <span
                      className="md-label-small"
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: m.is_active !== false ? 'var(--md-success-container)' : 'var(--md-error-container)',
                        color: m.is_active !== false ? 'var(--md-on-success-container)' : 'var(--md-on-error-container)',
                        fontSize: '11px',
                        flexShrink: 0,
                      }}
                    >
                      {m.is_active !== false ? 'Активен' : 'Заблокирован'}
                    </span>
                  </div>

                  {/* Contacts Row */}
                  <div className="mt-4 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span>{m.phone || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{m.email}</span>
                    </div>
                    {tData?.telegram && (
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                        <span className="text-blue-600 font-medium">{tData.telegram}</span>
                      </div>
                    )}
                  </div>

                  {/* Workload for Teachers or Responsibility for Admins */}
                  {m.role === 'teacher' ? (
                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center border border-slate-100">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{tData?.activeGroups?.length || 0}</p>
                        <p className="text-[10px] text-slate-500">Групп</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{tData?.studentsCount || 0}</p>
                        <p className="text-[10px] text-slate-500">Учеников</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{tData?.weeklyHours ? `${tData.weeklyHours}ч` : '—'}</p>
                        <p className="text-[10px] text-slate-500">В неделю</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100">
                      <p className="font-semibold text-slate-800 mb-0.5">Зона ответственности:</p>
                      <p className="text-[11px] text-slate-500">
                        {m.role === 'owner'
                          ? 'Полное руководство, стратегическая и финансовая аналитика онлайн-школы'
                          : 'Обработка заявок, сопровождение учеников, расписание занятий и касса'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Card Actions */}
                <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                  {m.role === 'teacher' ? (
                    <>
                      <Link
                        href={`/teachers/${tData?.id || m.id}`}
                        className="md-btn md-btn-tonal md-btn-sm flex-1"
                        style={{ justifyContent: 'center', gap: '6px', fontSize: '12px' }}
                      >
                        <Calendar size={14} />
                        Расписание
                      </Link>
                      <button
                        type="button"
                        onClick={() => openEditCard(m)}
                        className="md-btn md-btn-outlined md-btn-sm"
                        style={{ padding: '6px 12px', fontSize: '12px', gap: '4px' }}
                      >
                        <Edit3 size={13} />
                        Карточка
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openEditCard(m)}
                      className="md-btn md-btn-tonal md-btn-sm w-full"
                      style={{ justifyContent: 'center', gap: '6px', fontSize: '12px' }}
                    >
                      <Edit3 size={14} />
                      Карточка сотрудника
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: КАРТОЧКА СОТРУДНИКА (ПРОСМОТР И РЕДАКТИРОВАНИЕ)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {editingMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div
            className="w-full max-w-lg md-card-elevated"
            style={{
              padding: '28px',
              backgroundColor: 'var(--md-surface-container-lowest)',
              borderRadius: '24px',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
          >
            {/* Card Header with Avatar & Details */}
            <div className="flex items-start justify-between" style={{ marginBottom: '20px' }}>
              <div className="flex items-center gap-3">
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: ROLES_INFO[editingMember.role]?.bg || 'var(--md-primary-container)',
                    color: ROLES_INFO[editingMember.role]?.color || 'var(--md-on-primary-container)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '20px',
                    flexShrink: 0,
                  }}
                >
                  {(editingMember.full_name || editingMember.email).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="md-title-medium" style={{ color: 'var(--md-on-surface)' }}>
                    Карточка сотрудника
                  </h2>
                  <div className="flex items-center gap-2" style={{ marginTop: '2px' }}>
                    <span
                      className="md-label-small"
                      style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        backgroundColor: ROLES_INFO[editingMember.role]?.bg,
                        color: ROLES_INFO[editingMember.role]?.color,
                        fontWeight: 600,
                      }}
                    >
                      {ROLES_INFO[editingMember.role]?.label}
                    </span>
                    <span className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
                      {editingMember.created_at ? `Зарегистрирован ${new Date(editingMember.created_at).toLocaleDateString('ru-RU')}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="md-btn md-btn-text md-btn-sm"
                style={{ padding: '6px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Email (Read-only Login with Copy button) */}
              <div
                style={{
                  backgroundColor: 'var(--md-surface-container-low)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span className="md-label-small" style={{ color: 'var(--md-on-surface-variant)' }}>
                    Email (Логин для входа)
                  </span>
                  <p className="md-label-large" style={{ color: 'var(--md-on-surface)', marginTop: '2px' }}>
                    {editingMember.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(editingMember.email);
                    setEditCopiedEmail(true);
                    setTimeout(() => setEditCopiedEmail(false), 2000);
                  }}
                  className="md-btn md-btn-outlined md-btn-sm"
                  style={{ gap: '4px' }}
                >
                  {editCopiedEmail ? <Check size={14} /> : <Copy size={14} />}
                  {editCopiedEmail ? 'Скопирован' : 'Копировать'}
                </button>
              </div>

              {/* If Teacher: Workload & Link to Schedule */}
              {editingMember.role === 'teacher' && (
                <div
                  style={{
                    backgroundColor: 'var(--md-primary-container)',
                    color: 'var(--md-on-primary-container)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div>
                    <span className="md-label-small" style={{ opacity: 0.85 }}>
                      Расписание и группы
                    </span>
                    <p className="md-label-medium" style={{ marginTop: '2px' }}>
                      {getTeacherData(editingMember)?.role || 'Преподаватель онлайн-школы'}
                    </p>
                  </div>
                  <Link
                    href={`/teachers/${getTeacherData(editingMember)?.id || editingMember.id}`}
                    className="md-btn md-btn-filled md-btn-sm"
                    style={{ gap: '6px', whiteSpace: 'nowrap', backgroundColor: 'var(--md-primary)', color: '#fff' }}
                  >
                    <Calendar size={14} />
                    Открыть расписание
                  </Link>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="md-label-large" style={{ color: 'var(--md-on-surface-variant)', display: 'block', marginBottom: '6px' }}>
                  ФИО сотрудника *
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  required
                  placeholder="Иванова Ольга Петровна"
                  className="md-input"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="md-label-large" style={{ color: 'var(--md-on-surface-variant)', display: 'block', marginBottom: '6px' }}>
                  Телефон для связи
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+7 (999) 000-00-00"
                  className="md-input"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Role selection (Owner role cannot be changed) */}
              {editingMember.role !== 'owner' ? (
                <div>
                  <label className="md-label-large" style={{ color: 'var(--md-on-surface-variant)', display: 'block', marginBottom: '8px' }}>
                    Роль и уровень доступа
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditRole('teacher')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: `2px solid ${editRole === 'teacher' ? 'var(--md-primary)' : 'var(--md-outline-variant)'}`,
                        backgroundColor: editRole === 'teacher' ? 'var(--md-primary-container)' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <GraduationCap size={18} style={{ color: editRole === 'teacher' ? 'var(--md-primary)' : 'var(--md-on-surface-variant)' }} />
                      <div>
                        <p className="md-label-large" style={{ color: 'var(--md-on-surface)' }}>Преподаватель</p>
                        <span className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>Занятия, группы, журнал</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditRole('admin')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: `2px solid ${editRole === 'admin' ? 'var(--md-primary)' : 'var(--md-outline-variant)'}`,
                        backgroundColor: editRole === 'admin' ? 'var(--md-primary-container)' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <Shield size={18} style={{ color: editRole === 'admin' ? 'var(--md-primary)' : 'var(--md-on-surface-variant)' }} />
                      <div>
                        <p className="md-label-large" style={{ color: 'var(--md-on-surface)' }}>Администратор</p>
                        <span className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>Ученики, лиды, оплаты</span>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--md-tertiary-container, #EEDCFF)',
                    color: 'var(--md-on-tertiary-container, #28123C)',
                  }}
                >
                  <p className="md-label-medium">Роль: Владелец школы</p>
                  <p className="md-body-small">Главный системный аккаунт. Роль владельца неизменна.</p>
                </div>
              )}

              {/* Active status toggle */}
              {editingMember.role !== 'owner' && (
                <div className="flex items-center justify-between" style={{ padding: '8px 0' }}>
                  <div>
                    <label className="md-label-large" style={{ color: 'var(--md-on-surface)' }}>
                      Статус учетной записи
                    </label>
                    <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
                      {editIsActive ? 'Сотрудник имеет активный доступ к CRM' : 'Доступ к CRM временно заблокирован'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditIsActive(!editIsActive)}
                    className={`md-btn md-btn-sm ${editIsActive ? 'md-btn-tonal' : 'md-btn-outlined'}`}
                    style={{
                      backgroundColor: editIsActive ? 'var(--md-success-container)' : undefined,
                      color: editIsActive ? 'var(--md-on-success-container)' : 'var(--md-error)',
                    }}
                  >
                    {editIsActive ? 'Активен' : 'Заблокирован'}
                  </button>
                </div>
              )}

              {/* Reset Password section */}
              <div
                style={{
                  borderTop: '1px solid var(--md-outline-variant)',
                  paddingTop: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="md-label-large" style={{ color: 'var(--md-on-surface)' }}>
                      Сменить пароль сотрудника
                    </span>
                    <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
                      Оставьте пустым, если не хотите менять пароль
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={generateEditPassword}
                    className="md-label-small"
                    style={{
                      color: 'var(--md-primary)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <RefreshCw size={12} />
                    Сгенерировать
                  </button>
                </div>

                <div style={{ position: 'relative' }}>
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editNewPassword}
                    onChange={(e) => setEditNewPassword(e.target.value)}
                    minLength={6}
                    placeholder="Новый пароль (минимум 6 символов)"
                    className="md-input"
                    style={{ width: '100%', paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--md-on-surface-variant)',
                    }}
                  >
                    {showEditPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {editError && (
                <div
                  style={{
                    backgroundColor: 'var(--md-error-container)',
                    color: 'var(--md-on-error-container)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={16} />
                  <span className="md-body-medium">{editError}</span>
                </div>
              )}

              {/* Action Buttons: Delete (left), Cancel & Save (right) */}
              <div
                className="flex items-center justify-between gap-3"
                style={{
                  borderTop: '1px solid var(--md-outline-variant)',
                  paddingTop: '16px',
                  marginTop: '4px',
                }}
              >
                {editingMember.role !== 'owner' ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingMember.id, editingMember.full_name || editingMember.email)}
                    className="md-btn md-btn-text md-btn-sm"
                    style={{ color: 'var(--md-error)', gap: '6px' }}
                  >
                    <Trash2 size={16} />
                    Удалить сотрудника
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingMember(null)}
                    className="md-btn md-btn-text"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="md-btn md-btn-filled"
                  >
                    {editLoading ? 'Сохранение...' : 'Сохранить изменения'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: СОЗДАНИЕ НОВОГО СОТРУДНИКА                             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div
            className="w-full max-w-lg md-card-elevated"
            style={{
              padding: '28px',
              backgroundColor: 'var(--md-surface-container-lowest)',
              borderRadius: '24px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
              <div className="flex items-center gap-3">
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    backgroundColor: role === 'teacher' ? 'var(--md-primary-container)' : 'var(--md-secondary-container)',
                    color: role === 'teacher' ? 'var(--md-on-primary-container)' : 'var(--md-on-secondary-container)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {role === 'teacher' ? <GraduationCap size={20} /> : <Shield size={20} />}
                </div>
                <div>
                  <h2 className="md-title-medium" style={{ color: 'var(--md-on-surface)' }}>
                    Новый {role === 'teacher' ? 'преподаватель' : 'администратор'}
                  </h2>
                  <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
                    {role === 'teacher'
                      ? 'Доступ к занятиям, группам и журналу посещаемости'
                      : 'Доступ к ученикам, лидам, финансам и задачам'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="md-btn md-btn-text md-btn-sm"
                style={{ padding: '4px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Role selection tabs in modal */}
              <div>
                <label className="md-label-large" style={{ color: 'var(--md-on-surface-variant)', display: 'block', marginBottom: '8px' }}>
                  Назначенная роль:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('teacher')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: `2px solid ${role === 'teacher' ? 'var(--md-primary)' : 'var(--md-outline-variant)'}`,
                      backgroundColor: role === 'teacher' ? 'var(--md-primary-container)' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <GraduationCap size={18} style={{ color: role === 'teacher' ? 'var(--md-primary)' : 'var(--md-on-surface-variant)' }} />
                    <span className="md-label-large" style={{ color: 'var(--md-on-surface)' }}>Преподаватель</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: `2px solid ${role === 'admin' ? 'var(--md-primary)' : 'var(--md-outline-variant)'}`,
                      backgroundColor: role === 'admin' ? 'var(--md-primary-container)' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Shield size={18} style={{ color: role === 'admin' ? 'var(--md-primary)' : 'var(--md-on-surface-variant)' }} />
                    <span className="md-label-large" style={{ color: 'var(--md-on-surface)' }}>Администратор</span>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="md-label-large" style={{ color: 'var(--md-on-surface-variant)', display: 'block', marginBottom: '6px' }}>
                  ФИО сотрудника *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Иванова Ольга Петровна"
                  className="md-input"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Email */}
              <div>
                <label className="md-label-large" style={{ color: 'var(--md-on-surface-variant)', display: 'block', marginBottom: '6px' }}>
                  Email (логин для входа) *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="olga.teacher@school.ru"
                  className="md-input"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="md-label-large" style={{ color: 'var(--md-on-surface-variant)', display: 'block', marginBottom: '6px' }}>
                  Телефон
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 (999) 000-00-00"
                  className="md-input"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Password with generator */}
              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: '6px' }}>
                  <label className="md-label-large" style={{ color: 'var(--md-on-surface-variant)' }}>
                    Пароль *
                  </label>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="md-label-small"
                    style={{
                      color: 'var(--md-primary)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <RefreshCw size={12} />
                    Сгенерировать
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Пароль для входа"
                    className="md-input"
                    style={{ width: '100%', paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--md-on-surface-variant)',
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {createError && (
                <div
                  style={{
                    backgroundColor: 'var(--md-error-container)',
                    color: 'var(--md-on-error-container)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={16} />
                  <span className="md-body-medium">{createError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2" style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="md-btn md-btn-text"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="md-btn md-btn-filled"
                >
                  {createLoading ? 'Создание...' : `Создать ${role === 'teacher' ? 'учителя' : 'администратора'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: СКОПИРОВАТЬ ДАННЫЕ СОЗДАННОГО СОТРУДНИКА               */}
      {/* ───────────────────────────────────────────────────────────── */}
      {createdUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div
            className="w-full max-w-md md-card-elevated"
            style={{
              padding: '28px',
              backgroundColor: 'var(--md-surface-container-lowest)',
              borderRadius: '24px',
            }}
          >
            <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--md-success-container)',
                  color: 'var(--md-on-success-container)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={20} />
              </div>
              <div>
                <h3 className="md-title-medium" style={{ color: 'var(--md-on-surface)' }}>
                  Учетная запись создана!
                </h3>
                <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
                  Передайте данные сотруднику для первого входа
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--md-surface-container)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                margin: '16px 0',
              }}
            >
              <div>
                <span className="md-label-small" style={{ color: 'var(--md-on-surface-variant)' }}>Сотрудник:</span>
                <p className="md-label-large" style={{ color: 'var(--md-on-surface)' }}>{createdUser.fullName}</p>
              </div>
              <div>
                <span className="md-label-small" style={{ color: 'var(--md-on-surface-variant)' }}>Роль:</span>
                <p className="md-label-large" style={{ color: 'var(--md-primary)' }}>{createdUser.role}</p>
              </div>
              <div>
                <span className="md-label-small" style={{ color: 'var(--md-on-surface-variant)' }}>Логин (Email):</span>
                <p className="md-label-large" style={{ color: 'var(--md-on-surface)', fontFamily: 'monospace' }}>{createdUser.email}</p>
              </div>
              <div>
                <span className="md-label-small" style={{ color: 'var(--md-on-surface-variant)' }}>Пароль:</span>
                <p className="md-label-large" style={{ color: 'var(--md-on-surface)', fontFamily: 'monospace' }}>{createdUser.password}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={copyCredentials}
                className="md-btn md-btn-filled"
                style={{ width: '100%', justifyContent: 'center', gap: '8px' }}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Данные скопированы!' : 'Скопировать данные для сотрудника'}
              </button>
              <button
                onClick={() => setCreatedUser(null)}
                className="md-btn md-btn-outlined"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeamManagementPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Загрузка...</div>}>
      <TeamContent />
    </Suspense>
  );
}
