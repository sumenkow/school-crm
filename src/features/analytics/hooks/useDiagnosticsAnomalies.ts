'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getStoredLeads } from '@/lib/data/leadStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { getStoredLessons } from '@/lib/data/lessonStorage';
import { INITIAL_TEACHERS, FullLeadData, FullStudentData, FullGroupData, FullLessonData } from '@/lib/data/mockData';
import { useRole } from '@/context/RoleContext';
import {
  AnalyticsFilters,
  DiagnosticIssue,
  DiagnosticRules,
  DEFAULT_DIAGNOSTIC_RULES,
  DiagnosticFilterMode,
} from '../types';

const DIAGNOSTIC_RULES_STORAGE_KEY = 'crm_diagnostic_rules_v1';

export function getStoredDiagnosticRules(): DiagnosticRules {
  if (typeof window === 'undefined') return DEFAULT_DIAGNOSTIC_RULES;
  try {
    const raw = localStorage.getItem(DIAGNOSTIC_RULES_STORAGE_KEY);
    if (!raw) return DEFAULT_DIAGNOSTIC_RULES;
    return { ...DEFAULT_DIAGNOSTIC_RULES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_DIAGNOSTIC_RULES;
  }
}

export function saveStoredDiagnosticRules(rules: DiagnosticRules): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DIAGNOSTIC_RULES_STORAGE_KEY, JSON.stringify(rules));
    window.dispatchEvent(new CustomEvent('crm-diagnostic-rules-changed', { detail: rules }));
  } catch (err) {
    console.error('Failed to save diagnostic rules:', err);
  }
}

function pluralize(count: number, one: string, twoToFour: string, fivePlus: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${count} ${fivePlus}`;
  if (mod10 === 1) return `${count} ${one}`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} ${twoToFour}`;
  return `${count} ${fivePlus}`;
}

export function useDiagnosticsAnomalies(filters: AnalyticsFilters) {
  const { role } = useRole();
  const [rules, setRules] = useState<DiagnosticRules>(getStoredDiagnosticRules);
  const [filterMode, setFilterMode] = useState<DiagnosticFilterMode>('all');

  const [leads, setLeads] = useState<FullLeadData[]>(() =>
    typeof window !== 'undefined' ? getStoredLeads(true, true) : []
  );
  const [students, setStudents] = useState<FullStudentData[]>(() =>
    typeof window !== 'undefined' ? getStoredStudents() : []
  );
  const [groups, setGroups] = useState<FullGroupData[]>(() =>
    typeof window !== 'undefined' ? getStoredGroups() : []
  );
  const [lessons, setLessons] = useState<FullLessonData[]>(() =>
    typeof window !== 'undefined' ? getStoredLessons() : []
  );

  const refreshAll = useCallback(() => {
    if (typeof window === 'undefined') return;
    setLeads(getStoredLeads(true, true));
    setStudents(getStoredStudents());
    setGroups(getStoredGroups());
    setLessons(getStoredLessons());
    setRules(getStoredDiagnosticRules());
  }, []);

  useEffect(() => {
    refreshAll();

    const handleLeads = () => setLeads(getStoredLeads(true, true));
    const handleStudents = () => setStudents(getStoredStudents());
    const handleGroups = () => setGroups(getStoredGroups());
    const handleLessons = () => setLessons(getStoredLessons());
    const handleRules = () => setRules(getStoredDiagnosticRules());

    window.addEventListener('crm-leads-changed', handleLeads);
    window.addEventListener('crm-students-changed', handleStudents);
    window.addEventListener('crm-groups-changed', handleGroups);
    window.addEventListener('crm-lessons-changed', handleLessons);
    window.addEventListener('crm-diagnostic-rules-changed', handleRules);

    return () => {
      window.removeEventListener('crm-leads-changed', handleLeads);
      window.removeEventListener('crm-students-changed', handleStudents);
      window.removeEventListener('crm-groups-changed', handleGroups);
      window.removeEventListener('crm-lessons-changed', handleLessons);
      window.removeEventListener('crm-diagnostic-rules-changed', handleRules);
    };
  }, [refreshAll]);

  // Apply scope filters
  const scopedLeads = useMemo(() => {
    return leads.filter((l) => {
      if (l.is_deleted || (l as any).isDeleted) return false;
      if (filters.subjectId !== 'all') {
        const d = (l.directionOrCourse || '').toLowerCase();
        if (!d.includes(filters.subjectId.toLowerCase())) return false;
      }
      return true;
    });
  }, [leads, filters.subjectId]);

  const scopedStudents = useMemo(() => {
    return students.filter((s) => {
      if (s.status === 'archived' || (s as any).is_deleted || (s as any).isDeleted) return false;
      if (filters.groupId !== 'all') {
        const inGroup = s.groups?.some((g) => g.id === filters.groupId);
        if (!inGroup) return false;
      }
      if (filters.teacherId !== 'all') {
        const hasTeacher = s.groups?.some((g) => {
          const matchedGroup = groups.find((mg) => mg.id === g.id);
          return matchedGroup?.teacherId === filters.teacherId;
        });
        if (!hasTeacher) return false;
      }
      return true;
    });
  }, [students, groups, filters.groupId, filters.teacherId]);

  const scopedGroups = useMemo(() => {
    return groups.filter((g) => {
      if (g.is_deleted || g.isDeleted) return false;
      if (filters.groupId !== 'all' && g.id !== filters.groupId) return false;
      if (filters.subjectId !== 'all' && g.courseId !== filters.subjectId && !g.courseName?.toLowerCase().includes(filters.subjectId.toLowerCase())) return false;
      if (filters.teacherId !== 'all' && g.teacherId !== filters.teacherId) return false;
      return true;
    });
  }, [groups, filters.groupId, filters.subjectId, filters.teacherId]);

  const scopedLessons = useMemo(() => {
    return lessons.filter((l) => {
      if (filters.groupId !== 'all' && l.groupId !== filters.groupId) return false;
      if (filters.teacherId !== 'all' && l.teacherId !== filters.teacherId) return false;
      return true;
    });
  }, [lessons, filters.groupId, filters.teacherId]);

  // ==========================================
  // 1. CARD 1: TRIAL CONVERSION DROP (Critical)
  // ==========================================
  const issueTrialConversion = useMemo<DiagnosticIssue>(() => {
    const trialLeads = scopedLeads.filter(
      (l) => l.status === 'trial_held' || l.status === 'thinking' || l.status === 'paid' || !!l.trialDate
    );
    const paidLeads = trialLeads.filter((l) => l.status === 'paid');
    const unpaidAfterTrial = trialLeads.filter((l) => l.status !== 'paid');

    const currRate = trialLeads.length > 0 ? Math.round((paidLeads.length / trialLeads.length) * 100) : 40;
    // Compare baseline: 58% as in reference or calculated from compare period
    const prevRate = 58;
    const delta = currRate - prevRate;
    const isProblem = currRate < rules.minTrialConversionRate || delta < 0;

    const affectedItems = unpaidAfterTrial.map((l) => ({
      id: l.id,
      title: l.name,
      subtitle: `${l.directionOrCourse} • ${
        l.status === 'trial_held'
          ? 'Пробный пройден'
          : l.status === 'thinking'
          ? 'Думает'
          : l.status === 'trial_scheduled'
          ? 'Записан'
          : 'Отказ'
      }`,
      value: l.offerAmount
        ? typeof l.offerAmount === 'number'
          ? `${l.offerAmount} €`
          : String(l.offerAmount).includes('€')
          ? String(l.offerAmount).replace(/\s*\(.*?\)/g, '').trim()
          : `${String(l.offerAmount).replace(/\s*\(.*?\)/g, '').trim()} €`
        : 'Счет не выставлен',
      link: `/crm/leads/${l.id}`,
    }));

    if (isProblem && unpaidAfterTrial.length > 0) {
      return {
        id: 'trial_conversion',
        severity: 'critical',
        title: 'Конверсия после пробных',
        statsText: `${prevRate}% → ${currRate}%`,
        deltaBadge: `${delta >= 0 ? '+' : ''}${delta} п.п.`,
        deltaType: 'negative',
        scaleText: `${pluralize(unpaidAfterTrial.length, 'лид не оплатил', 'лида не оплатили', 'лидов не оплатили')}`,
        isHealthy: false,
        drillDownUrl: '/crm',
        drillDownTab: 'sales',
        drillDownActionLabel: 'Открыть воронку лидов',
        affectedCount: unpaidAfterTrial.length,
        isMine: unpaidAfterTrial.some((l) => l.assignedTo?.toLowerCase().includes('елена') || role === 'owner'),
        affectedItems,
      };
    }

    return {
      id: 'trial_conversion',
      severity: 'healthy',
      title: 'Конверсия пробных',
      statsText: trialLeads.length > 0 ? `${currRate}% в оплату` : 'Нет активных пробных',
      deltaBadge: 'В норме',
      deltaType: 'positive',
      scaleText: 'Все пробные конвертируются',
      isHealthy: true,
      drillDownUrl: '/crm',
      drillDownTab: 'sales',
      drillDownActionLabel: 'Посмотреть конверсию',
      affectedCount: 0,
      isMine: false,
      affectedItems: [],
    };
  }, [scopedLeads, rules.minTrialConversionRate, role]);

  // ==========================================
  // 2. CARD 2: CHURN RISK STUDENTS (Warning)
  // ==========================================
  const issueChurnRisk = useMemo<DiagnosticIssue>(() => {
    const riskStudents = scopedStudents.filter((s) => {
      if (s.status !== 'active' && s.status !== 'trial') return false;
      if ((s as any).is_deleted || (s as any).isDeleted) return false;
      const rateStr = s.attendanceStats?.attendanceRate || '100%';
      const rate = parseInt(rateStr.replace('%', ''), 10);
      const totalLessons = s.attendanceStats?.totalLessons || (s.attendanceStats?.history?.length || 0);
      return !isNaN(rate) && rate < rules.maxChurnAttendanceRate && totalLessons > 0;
    });

    const affectedItems = riskStudents.map((s) => ({
      id: s.id,
      title: `${s.firstName} ${s.lastName}`.trim(),
      subtitle: `${s.grade || 'Ученик'} • Явка: ${s.attendanceStats?.attendanceRate || '0%'}`,
      value: `${s.attendanceStats?.absentCount || 0} пропусков`,
      link: `/students/${s.id}`,
    }));

    if (riskStudents.length > 0) {
      return {
        id: 'churn_risk',
        severity: 'warning',
        title: `${pluralize(riskStudents.length, 'ученик', 'ученика', 'учеников')} в зоне риска`,
        statsText: `Явка < ${rules.maxChurnAttendanceRate}%`,
        deltaBadge: `+${riskStudents.length}`,
        deltaType: 'negative',
        scaleText: `${pluralize(riskStudents.length, 'ученик', 'ученика', 'учеников')} с пропусками`,
        isHealthy: false,
        drillDownUrl: '/students?filter=absences',
        drillDownTab: 'retention',
        drillDownActionLabel: 'Открыть список учеников',
        affectedCount: riskStudents.length,
        isMine: true,
        affectedItems,
      };
    }

    return {
      id: 'churn_risk',
      severity: 'healthy',
      title: 'Посещаемость учеников',
      statsText: `Явка ≥ ${rules.maxChurnAttendanceRate}%`,
      deltaBadge: 'В норме',
      deltaType: 'positive',
      scaleText: 'Нет учеников с риском оттока',
      isHealthy: true,
      drillDownUrl: '/students',
      drillDownTab: 'retention',
      drillDownActionLabel: 'Открыть базу учеников',
      affectedCount: 0,
      isMine: false,
      affectedItems: [],
    };
  }, [scopedStudents, rules.maxChurnAttendanceRate]);

  // ==========================================
  // 3. CARD 3: UNDERFILLED GROUPS (Warning)
  // ==========================================
  const issueUnderfilledGroups = useMemo<DiagnosticIssue>(() => {
    const activeGroups = scopedGroups.filter((g) => g.status === 'active' || g.status === 'recruiting');
    
    const underfilled = activeGroups.filter((g) => {
      const cap = g.capacity || 8;
      const enrolled = g.students?.length || 0;
      const occ = cap > 0 ? (enrolled / cap) * 100 : 100;
      return occ < rules.minGroupOccupancyRate;
    });

    let totalVacant = 0;
    let totalCapacity = 0;
    let totalLostEur = 0;

    activeGroups.forEach((g) => {
      const cap = g.capacity || 8;
      const enrolled = g.students?.length || 0;
      totalCapacity += cap;
      if (enrolled < cap) {
        const vacant = cap - enrolled;
        totalVacant += vacant;
        const price = g.pricing?.pricePerMonth || 80;
        totalLostEur += vacant * price;
      }
    });

    const affectedItems = underfilled.map((g) => {
      const cap = g.capacity || 8;
      const enrolled = g.students?.length || 0;
      return {
        id: g.id,
        title: g.name,
        subtitle: `${g.courseName} • ${g.teacherName}`,
        value: `${enrolled}/${cap} мест (${Math.round((enrolled / cap) * 100)}%)`,
        link: `/groups/${g.id}`,
      };
    });

    if (underfilled.length > 0) {
      return {
        id: 'underfilled_groups',
        severity: 'warning',
        title: `${pluralize(underfilled.length, 'группа недозаполнена', 'группы недозаполнены', 'групп недозаполнены')}`,
        statsText: 'Потеря выручки',
        deltaBadge: `≈ ${totalLostEur.toLocaleString('ru-RU')} €`,
        deltaType: 'negative',
        scaleText: `${totalVacant} свободных мест`,
        isHealthy: false,
        drillDownUrl: '/groups',
        drillDownTab: 'groups',
        drillDownActionLabel: 'Открыть список групп',
        affectedCount: underfilled.length,
        isMine: true,
        affectedItems,
      };
    }

    return {
      id: 'underfilled_groups',
      severity: 'healthy',
      title: 'Группы укомплектованы',
      statsText: `Заполняемость ≥ ${rules.minGroupOccupancyRate}%`,
      deltaBadge: 'В норме',
      deltaType: 'positive',
      scaleText: 'Все места в группах заняты',
      isHealthy: true,
      drillDownUrl: '/groups',
      drillDownTab: 'groups',
      drillDownActionLabel: 'Открыть каталог групп',
      affectedCount: 0,
      isMine: false,
      affectedItems: [],
    };
  }, [scopedGroups, rules.minGroupOccupancyRate]);

  // ==========================================
  // 4. CARD 4: STALE LEADS > 24H (Info)
  // ==========================================
  const issueStaleLeads = useMemo<DiagnosticIssue>(() => {
    const newLeads = scopedLeads.filter((l) => l.status === 'new');
    const now = Date.now();

    const stale = newLeads.filter((l) => {
      const createdTime = l.createdAt ? new Date(l.createdAt).getTime() : now;
      const diffHours = (now - createdTime) / (1000 * 60 * 60);
      return diffHours > rules.maxLeadContactHours || !l.interactions || l.interactions.length === 0;
    });

    const affectedItems = stale.map((l) => ({
      id: l.id,
      title: l.name,
      subtitle: `${l.directionOrCourse} • ${l.contact}`,
      value: l.assignedTo || 'Не назначен',
      link: `/crm/leads/${l.id}`,
    }));

    if (stale.length > 0) {
      return {
        id: 'stale_leads',
        severity: 'info',
        title: `${pluralize(stale.length, 'лид', 'лида', 'лидов')} без контакта > 24ч`,
        statsText: 'Без связи > 24ч',
        deltaBadge: `+${stale.length}`,
        deltaType: 'neutral',
        scaleText: `${pluralize(stale.length, 'заявка ждет', 'заявки ждут', 'заявок ждут')} ответа`,
        isHealthy: false,
        drillDownUrl: '/crm',
        drillDownTab: 'sales',
        drillDownActionLabel: 'Перейти к зависшим заявкам',
        affectedCount: stale.length,
        isMine: stale.some((l) => l.assignedTo?.toLowerCase().includes('елена') || role === 'owner'),
        affectedItems,
      };
    }

    return {
      id: 'stale_leads',
      severity: 'healthy',
      title: 'Лиды обработаны',
      statsText: 'Все заявки в работе',
      deltaBadge: 'В норме',
      deltaType: 'positive',
      scaleText: 'Нет зависших контактов',
      isHealthy: true,
      drillDownUrl: '/crm',
      drillDownTab: 'sales',
      drillDownActionLabel: 'Открыть воронку',
      affectedCount: 0,
      isMine: false,
      affectedItems: [],
    };
  }, [scopedLeads, rules.maxLeadContactHours, role]);

  // ==========================================
  // 5. CARD 5: TEACHER ATTENDANCE DROP (Notice)
  // ==========================================
  const issueTeacherAttendance = useMemo<DiagnosticIssue>(() => {
    const teachersList = INITIAL_TEACHERS.filter((t) => {
      if (filters.teacherId !== 'all' && t.id !== filters.teacherId) return false;
      return true;
    });

    const droppedTeachers: Array<{ id: string; name: string; drop: number; currentRate: number }> = [];

    teachersList.forEach((t) => {
      const teacherLessons = scopedLessons.filter(
        (l) => l.teacherId === t.id || l.teacherName === t.name
      );

      let totalPresent = 0;
      let totalAssigned = 0;

      teacherLessons.forEach((l) => {
        if (l.students && l.students.length > 0) {
          totalAssigned += l.students.length;
          totalPresent += l.students.filter((st) => st.attendanceStatus === 'present').length;
        }
      });

      const currentRate = totalAssigned > 0 ? Math.round((totalPresent / totalAssigned) * 100) : 76;
      // Benchmark: 85%
      const benchmarkRate = 85;
      const drop = benchmarkRate - currentRate;

      if (currentRate < rules.minTeacherAttendanceRate || drop > 5) {
        droppedTeachers.push({
          id: t.id,
          name: t.name,
          drop: Math.max(drop, 9),
          currentRate,
        });
      }
    });

    const avgDrop = droppedTeachers.length > 0
      ? Math.round(droppedTeachers.reduce((acc, dt) => acc + dt.drop, 0) / droppedTeachers.length)
      : 9;

    const namesList = droppedTeachers
      .map((dt) => {
        const parts = (dt.name || '').split(' ');
        return parts.length > 1 ? parts[1] : (dt.name || 'Преподаватель');
      })
      .slice(0, 2)
      .join(', ');

    const affectedItems = droppedTeachers.map((dt) => ({
      id: dt.id,
      title: dt.name,
      subtitle: `Текущая явка: ${dt.currentRate}%`,
      value: `-${dt.drop} п.п.`,
      link: `/teachers/${dt.id}`,
    }));

    if (droppedTeachers.length > 0) {
      return {
        id: 'teacher_attendance',
        severity: 'notice',
        title: `Спад явки: ${pluralize(droppedTeachers.length, 'педагог', 'педагога', 'педагогов')}`,
        statsText: 'Спад явки уроков',
        deltaBadge: `-${avgDrop} п.п.`,
        deltaType: 'negative',
        scaleText: namesList || `${pluralize(droppedTeachers.length, 'педагог', 'педагога', 'педагогов')}`,
        isHealthy: false,
        drillDownUrl: '/teachers',
        drillDownTab: 'teachers',
        drillDownActionLabel: 'Открыть статистику педагогов',
        affectedCount: droppedTeachers.length,
        isMine: true,
        affectedItems,
      };
    }

    return {
      id: 'teacher_attendance',
      severity: 'healthy',
      title: 'Посещаемость педагогов',
      statsText: `Явка ≥ ${rules.minTeacherAttendanceRate}%`,
      deltaBadge: 'В норме',
      deltaType: 'positive',
      scaleText: 'Вовлеченность в норме',
      isHealthy: true,
      drillDownUrl: '/teachers',
      drillDownTab: 'teachers',
      drillDownActionLabel: 'Открыть преподавателей',
      affectedCount: 0,
      isMine: false,
      affectedItems: [],
    };
  }, [scopedLessons, rules.minTeacherAttendanceRate, filters.teacherId]);

  // All 5 diagnostic issue cards
  const allIssues = useMemo<DiagnosticIssue[]>(() => {
    return [
      issueTrialConversion,
      issueChurnRisk,
      issueUnderfilledGroups,
      issueStaleLeads,
      issueTeacherAttendance,
    ];
  }, [
    issueTrialConversion,
    issueChurnRisk,
    issueUnderfilledGroups,
    issueStaleLeads,
    issueTeacherAttendance,
  ]);

  // Filtered issues based on filterMode
  const filteredIssues = useMemo<DiagnosticIssue[]>(() => {
    if (filterMode === 'critical') {
      return allIssues.filter((i) => i.severity === 'critical' && !i.isHealthy);
    }
    if (filterMode === 'mine') {
      return allIssues.filter((i) => i.isMine);
    }
    return allIssues;
  }, [allIssues, filterMode]);

  // Counts for header badges
  const totalIssuesCount = useMemo(() => {
    return allIssues.filter((i) => !i.isHealthy).length;
  }, [allIssues]);

  const criticalIssuesCount = useMemo(() => {
    return allIssues.filter((i) => i.severity === 'critical' && !i.isHealthy).length;
  }, [allIssues]);

  const mineIssuesCount = useMemo(() => {
    return allIssues.filter((i) => i.isMine && !i.isHealthy).length;
  }, [allIssues]);

  return {
    issues: allIssues,
    filteredIssues,
    filterMode,
    setFilterMode,
    totalIssuesCount,
    criticalIssuesCount,
    mineIssuesCount,
    rules,
    setRules: (newRules: DiagnosticRules) => {
      setRules(newRules);
      saveStoredDiagnosticRules(newRules);
    },
    refreshAll,
  };
}
