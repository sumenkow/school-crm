'use client';

import {
  FullStudentData,
  FullLeadData,
  FullTaskData,
  FullPaymentData,
  TimelineInteraction,
  FullGroupData,
  FullLessonData,
  INITIAL_STUDENTS,
  INITIAL_LEADS,
  INITIAL_TASKS,
  INITIAL_GROUPS,
  INITIAL_PAYMENTS,
  INITIAL_LESSONS,
} from './mockData';
import { normalizeStudent } from './studentStorage';
import { deduplicateTimelineInteractions } from './timelineStorage';

export async function persistEntityToCloud(
  entity: 'student' | 'parent' | 'lead' | 'task' | 'payment' | 'interaction' | 'group' | 'lesson',
  data: any,
  action: 'upsert' | 'delete' = 'upsert'
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity, action, data }),
    });

    const result = await res.json();
    return result.success;
  } catch (err) {
    console.warn(`[CloudSync] Background sync for ${entity} deferred:`, err);
    return false;
  }
}

let isHydrating = false;

export async function hydrateAllDataFromCloud(): Promise<boolean> {
  if (typeof window === 'undefined' || isHydrating) return false;

  try {
    isHydrating = true;
    const res = await fetch('/api/sync');
    if (!res.ok) return false;

    const json = await res.json();
    if (!json.success || !json.data) return false;

    const {
      students,
      parents,
      studentParents,
      groups,
      enrollments,
      leads,
      tasks,
      payments,
      interactions,
      lessons,
    } = json.data;

    // 1. Reconstruct Parents Map
    const parentMap = new Map<string, any>();
    for (const p of parents || []) {
      parentMap.set(p.id, {
        id: p.id,
        firstName: p.first_name,
        lastName: p.last_name,
        name: `${p.first_name || 'Родитель'} ${p.last_name || ''}`.trim(),
        phone: p.phone,
        telegram: p.telegram,
        whatsapp: p.whatsapp,
        email: p.email,
        preferredChannel: p.preferred_channel || 'telegram',
        notes: p.notes,
        relationshipType: 'Родитель',
        isPrimary: false,
      });
    }

    // 2. Reconstruct Students with Parents & Groups
    const hydratedStudents: FullStudentData[] = (students || []).map((s: any) => {
      // Find parent relations
      const studentRelations = (studentParents || []).filter((sp: any) => sp.student_id === s.id);
      const studentParentsList = studentRelations.map((sp: any) => {
        const parentObj = parentMap.get(sp.parent_id) || {};
        const relTypeRu =
          sp.relationship_type === 'mother'
            ? 'Мама'
            : sp.relationship_type === 'father'
            ? 'Папа'
            : sp.relationship_type === 'guardian'
            ? 'Опекун'
            : 'Родитель';
        return {
          ...parentObj,
          id: sp.parent_id,
          relationshipType: relTypeRu,
          isPrimary: Boolean(sp.is_primary_contact),
        };
      });

      // Find enrollments
      const studentEnrollments = (enrollments || []).filter((en: any) => en.student_id === s.id && en.status !== 'dropped');
      const studentGroupList = studentEnrollments.map((en: any) => {
        const grp = (groups || []).find((g: any) => g.id === en.group_id) || {};
        return {
          id: en.group_id,
          name: grp.name || 'Группа',
          courseName: grp.course_name || 'Курс',
          teacherName: grp.teacher_name || 'Преподаватель',
          schedule: grp.schedule_rule?.text || grp.schedule_rule || 'По расписанию',
          status: grp.status || 'active',
          joinedAt: en.joined_at || '01.09.2026',
        };
      });

      // Find student payments
      const studentPayments = (payments || [])
        .filter((p: any) => p.student_id === s.id)
        .map((p: any) => ({
          id: p.id,
          date: p.payment_date ? new Date(p.payment_date).toLocaleDateString('ru-RU') : '01.09.2026',
          amount: `${(Number(p.amount) || 0).toLocaleString('ru-RU')} €`,
          period: p.period_label || 'Оплата курса',
          method: p.payment_method === 'card' ? 'Банковская карта' : p.payment_method === 'cash' ? 'Наличные' : 'Банковский перевод',
          status: (p.status || 'paid') as 'paid' | 'expected' | 'overdue',
        }));

      return normalizeStudent({
        id: s.id,
        firstName: s.first_name,
        lastName: s.last_name,
        birthDate: s.birth_date,
        phone: s.phone,
        telegram: s.telegram,
        email: s.email,
        status: s.status,
        notes: s.notes,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        parents: studentParentsList,
        groups: studentGroupList,
        attendanceStats: {
          totalLessons: 16,
          presentCount: 15,
          absentCount: 1,
          rescheduledCount: 0,
          attendanceRate: '94%',
          history: [],
        },
        finance: {
          deposit: {
            balance: 120,
            balanceFormatted: '120 €',
            currency: 'EUR',
            pricePerLesson: 12,
            pricePerLessonFormatted: '12 €',
          },
          payments: studentPayments,
        },
        interactions: [],
        tasks: [],
      });
    });

    // Merge with existing local students to prevent data loss
    let localStudents: FullStudentData[] = [];
    try {
      const raw = localStorage.getItem('crm_students_v2');
      if (raw) localStudents = JSON.parse(raw);
    } catch {}

    const mergedStudents = [...hydratedStudents];
    for (const ls of localStudents) {
      const exists = mergedStudents.some((hs) => hs.id === ls.id || (`${hs.firstName} ${hs.lastName}`.trim().toLowerCase() === `${ls.firstName} ${ls.lastName}`.trim().toLowerCase()));
      if (!exists) {
        mergedStudents.push(ls);
        persistEntityToCloud('student', ls);
      }
    }

    if (mergedStudents.length > 0) {
      localStorage.setItem('crm_students_v2', JSON.stringify(mergedStudents));
      for (const hs of mergedStudents) {
        const hsName = `${hs.firstName || ''} ${hs.lastName || ''}`.trim().toLowerCase();
        // Match by ID first, then by full name to replace mock students with short IDs
        let idx = INITIAL_STUDENTS.findIndex((x) => x.id === hs.id);
        if (idx === -1 && hsName) {
          idx = INITIAL_STUDENTS.findIndex((x) =>
            `${x.firstName || ''} ${x.lastName || ''}`.trim().toLowerCase() === hsName
          );
        }
        if (idx !== -1) INITIAL_STUDENTS[idx] = hs;
        else INITIAL_STUDENTS.unshift(hs);
      }
      window.dispatchEvent(new CustomEvent('crm-students-changed'));
    }

    // 3. Hydrate Leads
    const hydratedLeads: FullLeadData[] = (leads || []).map((l: any) => ({
      id: l.id,
      name: l.name,
      contact: l.contact,
      parentName: l.parent_name,
      studentName: l.student_name,
      convertedStudentId: l.converted_student_id,
      convertedParentId: l.converted_parent_id,
      directionOrCourse: l.direction_or_course,
      level: l.level,
      source: l.source || 'Прямая заявка',
      assignedTo: 'Елена Менеджер',
      status: l.status || 'new',
      trialDate: l.trial_date,
      offerAmount: l.offer_amount,
      lossReason: l.loss_reason,
      nextAction: l.next_action,
      nextActionDate: l.next_action_date,
      comment: l.comment,
      createdAt: l.created_at,
      updatedAt: l.updated_at,
    }));

    let localLeads: FullLeadData[] = [];
    try {
      const raw = localStorage.getItem('crm_leads_v2');
      if (raw) localLeads = JSON.parse(raw);
    } catch {}

    const mergedLeads = [...hydratedLeads];
    for (const ll of localLeads) {
      const exists = mergedLeads.some((hl) => hl.id === ll.id || (hl.name && ll.name && hl.name.trim().toLowerCase() === ll.name.trim().toLowerCase()));
      if (!exists) {
        mergedLeads.push(ll);
        persistEntityToCloud('lead', ll);
      }
    }

    if (mergedLeads.length > 0) {
      localStorage.setItem('crm_leads_v2', JSON.stringify(mergedLeads));
      for (const hl of mergedLeads) {
        const hlName = (hl.name || '').trim().toLowerCase();
        let idx = INITIAL_LEADS.findIndex((x) => x.id === hl.id);
        if (idx === -1 && hlName) {
          idx = INITIAL_LEADS.findIndex((x) => (x.name || '').trim().toLowerCase() === hlName);
        }
        if (idx !== -1) INITIAL_LEADS[idx] = hl;
        else INITIAL_LEADS.unshift(hl);
      }
      window.dispatchEvent(new CustomEvent('crm-leads-changed'));
    }

    // 4. Hydrate Tasks
    const hydratedTasks: FullTaskData[] = (tasks || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      taskType: t.task_type || 'Retention',
      studentId: t.student_id,
      parentId: t.parent_id,
      leadId: t.lead_id,
      assignedTo: 'Елена Менеджер',
      dueDate: t.due_date,
      dueDateFormatted: t.due_date ? new Date(t.due_date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }) : 'Сегодня',
      status: t.status || 'open',
      priority: t.priority || 'medium',
      description: t.description,
    }));

    let localTasks: FullTaskData[] = [];
    try {
      const raw = localStorage.getItem('crm_tasks_v1');
      if (raw) localTasks = JSON.parse(raw);
    } catch {}

    const mergedTasks = [...hydratedTasks];
    for (const lt of localTasks) {
      const exists = mergedTasks.some((ht) => ht.id === lt.id);
      if (!exists) {
        mergedTasks.push(lt);
        persistEntityToCloud('task', lt);
      }
    }

    if (mergedTasks.length > 0) {
      localStorage.setItem('crm_tasks_v1', JSON.stringify(mergedTasks));
      for (const ht of mergedTasks) {
        const idx = INITIAL_TASKS.findIndex((x) => x.id === ht.id);
        if (idx !== -1) INITIAL_TASKS[idx] = ht;
        else INITIAL_TASKS.unshift(ht);
      }
      window.dispatchEvent(new CustomEvent('crm-tasks-changed'));
    }

    // 5. Hydrate Groups
    const hydratedGroups: FullGroupData[] = (groups || []).map((g: any) => {
      // Find students in group
      const grpEnrollments = (enrollments || []).filter((en: any) => en.group_id === g.id && en.status !== 'dropped');
      const grpStudents = grpEnrollments.map((en: any) => {
        const st = (students || []).find((s: any) => s.id === en.student_id);
        return {
          id: en.student_id,
          name: st ? `${st.first_name} ${st.last_name}` : 'Ученик',
          status: 'active' as const,
          attendanceRate: '100%',
          parentPhone: st?.phone || '+7 (999) 000-00-00',
          joinedAt: en.joined_at || '01.09.2026',
        };
      });

      return {
        id: g.id,
        name: g.name,
        courseId: g.course_id || 'c1',
        courseName: g.course_name || 'Основной курс',
        teacherId: g.teacher_id || 't1',
        teacherName: g.teacher_name || 'Мария Иванова',
        schedule: g.schedule_rule?.text || g.schedule_rule || 'Пн, Чт • 18:45–20:15',
        room: g.room || 'Онлайн (Zoom)',
        capacity: g.capacity || 8,
        status: (g.status as any) || 'active',
        startDate: g.start_date || '01.09.2026',
        students: grpStudents,
        recentLessons: [],
      };
    });

    let localGroups: FullGroupData[] = [];
    try {
      const raw = localStorage.getItem('crm_groups_master_v2');
      if (raw) localGroups = JSON.parse(raw);
    } catch {}

    const mergedGroups = [...hydratedGroups];
    for (const lg of localGroups) {
      const exists = mergedGroups.some((hg) => hg.id === lg.id || (hg.name && lg.name && hg.name.trim().toLowerCase() === lg.name.trim().toLowerCase()));
      if (!exists) {
        mergedGroups.push(lg);
        persistEntityToCloud('group', lg);
      }
    }

    if (mergedGroups.length > 0) {
      localStorage.setItem('crm_groups_master_v2', JSON.stringify(mergedGroups));
      for (const hg of mergedGroups) {
        const idx = INITIAL_GROUPS.findIndex((x) => x.id === hg.id);
        if (idx !== -1) INITIAL_GROUPS[idx] = hg;
        else INITIAL_GROUPS.unshift(hg);
      }
      window.dispatchEvent(new CustomEvent('crm-groups-changed'));
    }

    // 6. Hydrate Payments
    const hydratedPayments: FullPaymentData[] = (payments || []).map((p: any) => {
      const amt = Number(p.amount) || 0;
      const st = (students || []).find((s: any) => s.id === p.student_id);
      const pr = (parents || []).find((parent: any) => parent.id === p.parent_id);

      return {
        id: p.id,
        studentId: p.student_id,
        studentName: st ? `${st.first_name} ${st.last_name}` : undefined,
        parentId: p.parent_id,
        parentName: pr ? `${pr.first_name} ${pr.last_name}` : undefined,
        courseName: 'Курс школы',
        groupName: 'Основная группа',
        amount: amt,
        amountFormatted: `${amt.toLocaleString('ru-RU')} €`,
        paymentDate: p.payment_date ? new Date(p.payment_date).toLocaleDateString('ru-RU') : new Date().toLocaleDateString('ru-RU'),
        periodLabel: p.period_label || 'Оплата',
        status: (p.status as any) || 'paid',
        paymentMethod: (p.payment_method as any) || 'card',
        currency: 'EUR',
        paymentType: 'subscription',
        recordedBy: 'Администратор',
        comment: p.comment || undefined,
      };
    });

    let localPayments: FullPaymentData[] = [];
    try {
      const raw = localStorage.getItem('crm_payments_v2');
      if (raw) localPayments = JSON.parse(raw);
    } catch {}

    const mergedPayments = [...hydratedPayments];
    for (const lp of localPayments) {
      const exists = mergedPayments.some((hp) => hp.id === lp.id);
      if (!exists) {
        mergedPayments.push(lp);
        persistEntityToCloud('payment', lp);
      }
    }

    if (mergedPayments.length > 0) {
      localStorage.setItem('crm_payments_v2', JSON.stringify(mergedPayments));
      for (const hp of mergedPayments) {
        const idx = INITIAL_PAYMENTS.findIndex((x) => x.id === hp.id);
        if (idx !== -1) INITIAL_PAYMENTS[idx] = hp;
        else INITIAL_PAYMENTS.unshift(hp);
      }
      window.dispatchEvent(new CustomEvent('crm-payments-changed'));
    }

    // 7. Hydrate Interactions
    const hydratedInteractions: TimelineInteraction[] = (interactions || []).map((i: any) => {
      const st = (students || []).find((s: any) => s.id === i.student_id);
      const pr = (parents || []).find((parent: any) => parent.id === i.parent_id);
      const isoTime = i.occurred_at || i.created_at;

      return {
        id: i.id,
        studentId: i.student_id,
        studentName: st ? `${st.first_name} ${st.last_name}` : undefined,
        parentId: i.parent_id,
        parentName: pr ? `${pr.first_name} ${pr.last_name}` : undefined,
        leadId: i.lead_id,
        occurredAt: isoTime
          ? `${new Date(isoTime).toLocaleDateString('ru-RU')}, ${new Date(isoTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
          : '01.09.2026, 12:00',
        createdAt: isoTime || new Date().toISOString(),
        channel: (i.channel as any) || 'other',
        type: (i.type as any) || 'follow_up',
        author: 'Администратор',
        content: i.content || i.description || '',
        result: i.result || undefined,
        nextAction: i.next_action || undefined,
        followUpDate: i.follow_up_date || undefined,
      };
    });

    let localInteractions: TimelineInteraction[] = [];
    try {
      const raw = localStorage.getItem('crm_timeline_interactions_v1');
      if (raw) localInteractions = JSON.parse(raw);
    } catch {}

    const allCombined = deduplicateTimelineInteractions([...hydratedInteractions, ...localInteractions]);

    if (allCombined.length > 0) {
      localStorage.setItem('crm_timeline_interactions_v1', JSON.stringify(allCombined));
      window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed'));
    }

    // 8. Hydrate Lessons
    const hydratedLessons: FullLessonData[] = (lessons || []).map((ls: any) => ({
      id: ls.id,
      groupId: ls.group_id,
      teacherId: ls.teacher_id,
      date: ls.date,
      dateFormatted: ls.date ? new Date(ls.date).toLocaleDateString('ru-RU') : '',
      startTime: ls.start_time || '18:45',
      endTime: ls.end_time || '20:15',
      room: ls.room || 'Онлайн (Zoom)',
      status: (ls.status as any) || 'scheduled',
      topic: ls.topic || ls.title || 'Тема урока',
      homework: ls.homework,
      onlineMeetingUrl: ls.online_meeting_url,
      isTrial: Boolean(ls.is_trial),
      students: [],
    }));

    let localLessons: FullLessonData[] = [];
    try {
      const raw = localStorage.getItem('crm_lessons_master_v2');
      if (raw) localLessons = JSON.parse(raw);
    } catch {}

    const mergedLessons = [...hydratedLessons];
    for (const ll of localLessons) {
      const exists = mergedLessons.some((hl) => hl.id === ll.id);
      if (!exists) {
        mergedLessons.push(ll);
        persistEntityToCloud('lesson', ll);
      }
    }

    if (mergedLessons.length > 0) {
      localStorage.setItem('crm_lessons_master_v2', JSON.stringify(mergedLessons));
      for (const hl of mergedLessons) {
        const idx = INITIAL_LESSONS.findIndex((x) => x.id === hl.id);
        if (idx !== -1) INITIAL_LESSONS[idx] = hl;
        else INITIAL_LESSONS.unshift(hl);
      }
      window.dispatchEvent(new CustomEvent('crm-lessons-changed'));
    }

    return true;
  } catch (err) {
    console.warn('[CloudSync] Cloud hydration warning:', err);
    return false;
  } finally {
    isHydrating = false;
  }
}
