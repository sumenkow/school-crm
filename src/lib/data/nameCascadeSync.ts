'use client';

import {
  INITIAL_STUDENTS,
  INITIAL_LEADS,
  INITIAL_PAYMENTS,
  INITIAL_GROUPS,
  INITIAL_TASKS,
  FullStudentData,
  FullLeadData,
  FullPaymentData,
  FullGroupData,
  FullTaskData,
  TimelineInteraction,
  splitFullName,
} from './mockData';

const STUDENTS_STORAGE_KEY = 'crm_students_v2';
const LEADS_STORAGE_KEY = 'crm_leads_v2';
const PAYMENTS_STORAGE_KEY = 'crm_payments_v2';
const GROUPS_STORAGE_KEY = 'crm_groups_master_v2';
const TIMELINE_STORAGE_KEY = 'crm_timeline_interactions_v1';
const TASKS_STORAGE_KEY = 'crm_tasks_v1';

export interface StudentNameUpdate {
  firstName: string;
  lastName: string;
}

export interface ParentNameUpdate {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  telegram?: string;
  whatsapp?: string;
}

export interface LeadNameUpdate {
  contactName?: string;
  studentName?: string;
}

// Helper to safely parse localStorage
function getLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

// Helper to safely write localStorage
function setLocal<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to write ${key} to localStorage:`, err);
  }
}

/**
 * Cascades student name change across ALL entities:
 * - Students (in-memory + localStorage + Supabase)
 * - Payments (studentName)
 * - Groups (student roster)
 * - Timeline Interactions (studentName, targetName)
 * - Tasks (studentName)
 * - Leads (studentName if converted)
 * - Dispatches window events
 */
export function syncStudentNameCascade(studentId: string, name: StudentNameUpdate): void {
  if (!studentId) return;

  const firstName = (name.firstName || '').trim();
  const lastName = (name.lastName || '').trim();
  const newFullName = [firstName, lastName].filter(Boolean).join(' ');
  if (!newFullName) return;

  // 1. Update Students
  const sIdx = INITIAL_STUDENTS.findIndex((s) => s.id === studentId);
  if (sIdx !== -1) {
    INITIAL_STUDENTS[sIdx] = {
      ...INITIAL_STUDENTS[sIdx],
      firstName,
      lastName,
      updatedAt: new Date().toISOString(),
    };
    if (INITIAL_STUDENTS[sIdx].interactions) {
      INITIAL_STUDENTS[sIdx].interactions = INITIAL_STUDENTS[sIdx].interactions.map((i) => ({
        ...i,
        studentName: i.studentId === studentId ? newFullName : i.studentName,
        targetName: i.targetType === 'student' && i.studentId === studentId ? newFullName : i.targetName,
      }));
    }
  }

  const storedStudents = getLocal<FullStudentData[]>(STUDENTS_STORAGE_KEY, []);
  if (storedStudents.length > 0) {
    const updatedStored = storedStudents.map((s) => {
      if (s.id === studentId) {
        return {
          ...s,
          firstName,
          lastName,
          updatedAt: new Date().toISOString(),
          interactions: (s.interactions || []).map((i) => ({
            ...i,
            studentName: i.studentId === studentId ? newFullName : i.studentName,
            targetName: i.targetType === 'student' && i.studentId === studentId ? newFullName : i.targetName,
          })),
        };
      }
      return s;
    });
    setLocal(STUDENTS_STORAGE_KEY, updatedStored);
  }

  // 2. Update Payments
  INITIAL_PAYMENTS.forEach((p) => {
    if (p.studentId === studentId) {
      p.studentName = newFullName;
    }
  });

  const storedPayments = getLocal<FullPaymentData[]>(PAYMENTS_STORAGE_KEY, []);
  if (storedPayments.length > 0) {
    const updatedPayments = storedPayments.map((p) =>
      p.studentId === studentId ? { ...p, studentName: newFullName } : p
    );
    setLocal(PAYMENTS_STORAGE_KEY, updatedPayments);
  }

  // 3. Update Groups
  INITIAL_GROUPS.forEach((g) => {
    if (g.students) {
      g.students.forEach((st) => {
        if (st.id === studentId) {
          st.name = newFullName;
        }
      });
    }
  });

  const storedGroups = getLocal<FullGroupData[]>(GROUPS_STORAGE_KEY, []);
  if (storedGroups.length > 0) {
    const updatedGroups = storedGroups.map((g) => {
      if (g.students && g.students.some((st) => st.id === studentId)) {
        return {
          ...g,
          students: g.students.map((st) => (st.id === studentId ? { ...st, name: newFullName } : st)),
        };
      }
      return g;
    });
    setLocal(GROUPS_STORAGE_KEY, updatedGroups);
  }

  // 4. Update Global Timeline Interactions
  const storedInteractions = getLocal<TimelineInteraction[]>(TIMELINE_STORAGE_KEY, []);
  if (storedInteractions.length > 0) {
    const updatedInteractions = storedInteractions.map((i) => {
      if (i.studentId === studentId) {
        return {
          ...i,
          studentName: newFullName,
          targetName: i.targetType === 'student' ? newFullName : i.targetName,
        };
      }
      return i;
    });
    setLocal(TIMELINE_STORAGE_KEY, updatedInteractions);
  }

  // 5. Update Tasks
  INITIAL_TASKS.forEach((t) => {
    if (t.studentId === studentId) {
      t.studentName = newFullName;
    }
  });

  const storedTasks = getLocal<FullTaskData[]>(TASKS_STORAGE_KEY, []);
  if (storedTasks.length > 0) {
    const updatedTasks = storedTasks.map((t) =>
      t.studentId === studentId ? { ...t, studentName: newFullName } : t
    );
    setLocal(TASKS_STORAGE_KEY, updatedTasks);
  }

  // 6. Update Leads (if student originated from or is linked to a lead)
  INITIAL_LEADS.forEach((l) => {
    if (l.convertedStudentId === studentId || (l as any).studentId === studentId) {
      l.studentName = newFullName;
    }
  });

  const storedLeads = getLocal<FullLeadData[]>(LEADS_STORAGE_KEY, []);
  if (storedLeads.length > 0) {
    const updatedLeads = storedLeads.map((l) => {
      if (l.convertedStudentId === studentId || (l as any).studentId === studentId) {
        return { ...l, studentName: newFullName };
      }
      return l;
    });
    setLocal(LEADS_STORAGE_KEY, updatedLeads);
  }

  // 7. Supabase Cloud DB Dual-Write (fire-and-forget)
  if (typeof window !== 'undefined') {
    import('@/lib/supabase/client').then(({ createClient }) => {
      try {
        const supabase = createClient();
        supabase
          .from('students')
          .update({
            first_name: firstName,
            last_name: lastName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', studentId)
          .then(() => {}, (err) => console.warn('Supabase student name cascade error:', err));

        supabase
          .from('leads')
          .update({ student_name: newFullName })
          .eq('converted_student_id', studentId)
          .then(() => {}, () => {});
      } catch (err) {
        console.warn('Supabase error during student name cascade:', err);
      }
    }).catch(() => {});

    // 8. Reactive UI Window Events
    window.dispatchEvent(new CustomEvent('crm-students-changed', { detail: { id: studentId, firstName, lastName, fullName: newFullName } }));
    window.dispatchEvent(new CustomEvent('crm-payments-changed'));
    window.dispatchEvent(new CustomEvent('crm-groups-changed'));
    window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed'));
    window.dispatchEvent(new CustomEvent('crm-tasks-changed'));
    window.dispatchEvent(new CustomEvent('crm-leads-changed'));
    window.dispatchEvent(new CustomEvent('crm-names-synced'));
  }
}

/**
 * Cascades parent name change across ALL entities:
 * - Students (student.parents array in all sibling cards)
 * - Payments (parentName)
 * - Timeline Interactions (parentName, targetName)
 * - Tasks (parentName)
 * - Leads (lead.name / lead.parentName if converted)
 * - Dispatches window events
 */
export function syncParentNameCascade(parentId: string, parentData: ParentNameUpdate): void {
  if (!parentId) return;

  const firstName = (parentData.firstName || '').trim();
  const lastName = (parentData.lastName || '').trim();
  const newFullName = [firstName, lastName].filter(Boolean).join(' ');
  if (!newFullName) return;

  // 1. Update Parent in all Students (both in-memory and storage)
  INITIAL_STUDENTS.forEach((student) => {
    if (student.parents && student.parents.some((p) => p.id === parentId)) {
      student.parents = student.parents.map((p) => {
        if (p.id === parentId) {
          return {
            ...p,
            firstName: firstName || p.firstName,
            lastName: lastName || p.lastName,
            phone: parentData.phone !== undefined ? parentData.phone : p.phone,
            email: parentData.email !== undefined ? parentData.email : p.email,
            telegram: parentData.telegram !== undefined ? parentData.telegram : p.telegram,
            whatsapp: parentData.whatsapp !== undefined ? parentData.whatsapp : p.whatsapp,
          };
        }
        return p;
      });
      if (student.interactions) {
        student.interactions = student.interactions.map((i) => ({
          ...i,
          parentName: i.parentId === parentId ? newFullName : i.parentName,
          targetName: i.targetType === 'parent' && i.parentId === parentId ? newFullName : i.targetName,
        }));
      }
    }
  });

  const storedStudents = getLocal<FullStudentData[]>(STUDENTS_STORAGE_KEY, []);
  if (storedStudents.length > 0) {
    const updatedStored = storedStudents.map((student) => {
      if (student.parents && student.parents.some((p) => p.id === parentId)) {
        return {
          ...student,
          parents: student.parents.map((p) => {
            if (p.id === parentId) {
              return {
                ...p,
                firstName: firstName || p.firstName,
                lastName: lastName || p.lastName,
                phone: parentData.phone !== undefined ? parentData.phone : p.phone,
                email: parentData.email !== undefined ? parentData.email : p.email,
                telegram: parentData.telegram !== undefined ? parentData.telegram : p.telegram,
                whatsapp: parentData.whatsapp !== undefined ? parentData.whatsapp : p.whatsapp,
              };
            }
            return p;
          }),
          interactions: (student.interactions || []).map((i) => ({
            ...i,
            parentName: i.parentId === parentId ? newFullName : i.parentName,
            targetName: i.targetType === 'parent' && i.parentId === parentId ? newFullName : i.targetName,
          })),
        };
      }
      return student;
    });
    setLocal(STUDENTS_STORAGE_KEY, updatedStored);
  }

  // 2. Update Payments
  INITIAL_PAYMENTS.forEach((p) => {
    if (p.parentId === parentId) {
      p.parentName = newFullName;
    }
  });

  const storedPayments = getLocal<FullPaymentData[]>(PAYMENTS_STORAGE_KEY, []);
  if (storedPayments.length > 0) {
    const updatedPayments = storedPayments.map((p) =>
      p.parentId === parentId ? { ...p, parentName: newFullName } : p
    );
    setLocal(PAYMENTS_STORAGE_KEY, updatedPayments);
  }

  // 3. Update Global Timeline Interactions
  const storedInteractions = getLocal<TimelineInteraction[]>(TIMELINE_STORAGE_KEY, []);
  if (storedInteractions.length > 0) {
    const updatedInteractions = storedInteractions.map((i) => {
      if (i.parentId === parentId) {
        return {
          ...i,
          parentName: newFullName,
          targetName: i.targetType === 'parent' ? newFullName : i.targetName,
        };
      }
      return i;
    });
    setLocal(TIMELINE_STORAGE_KEY, updatedInteractions);
  }

  // 4. Update Tasks
  INITIAL_TASKS.forEach((t) => {
    if (t.parentId === parentId) {
      t.parentName = newFullName;
    }
  });

  const storedTasks = getLocal<FullTaskData[]>(TASKS_STORAGE_KEY, []);
  if (storedTasks.length > 0) {
    const updatedTasks = storedTasks.map((t) =>
      t.parentId === parentId ? { ...t, parentName: newFullName } : t
    );
    setLocal(TASKS_STORAGE_KEY, updatedTasks);
  }

  // 5. Update Leads (if lead was converted to this parent)
  INITIAL_LEADS.forEach((l) => {
    if (l.convertedParentId === parentId || (l as any).parentId === parentId) {
      l.name = newFullName;
      (l as any).parentName = newFullName;
    }
  });

  const storedLeads = getLocal<FullLeadData[]>(LEADS_STORAGE_KEY, []);
  if (storedLeads.length > 0) {
    const updatedLeads = storedLeads.map((l) => {
      if (l.convertedParentId === parentId || (l as any).parentId === parentId) {
        return { ...l, name: newFullName, parentName: newFullName };
      }
      return l;
    });
    setLocal(LEADS_STORAGE_KEY, updatedLeads);
  }

  // 6. Supabase Dual-Write
  if (typeof window !== 'undefined') {
    import('@/lib/supabase/client').then(({ createClient }) => {
      try {
        const supabase = createClient();
        supabase
          .from('parents')
          .update({
            first_name: firstName,
            last_name: lastName,
            phone: parentData.phone || null,
            email: parentData.email || null,
            telegram: parentData.telegram || null,
            whatsapp: parentData.whatsapp || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', parentId)
          .then(() => {}, () => {});

        supabase
          .from('leads')
          .update({
            name: newFullName,
            parent_name: newFullName,
          })
          .eq('converted_parent_id', parentId)
          .then(() => {}, () => {});
      } catch (err) {
        console.warn('Supabase error during parent name cascade:', err);
      }
    }).catch(() => {});

    // 7. Reactive UI Window Events
    window.dispatchEvent(new CustomEvent('crm-students-changed'));
    window.dispatchEvent(new CustomEvent('crm-payments-changed'));
    window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed'));
    window.dispatchEvent(new CustomEvent('crm-tasks-changed'));
    window.dispatchEvent(new CustomEvent('crm-leads-changed'));
    window.dispatchEvent(new CustomEvent('crm-names-synced'));
  }
}

/**
 * Cascades lead name change across ALL entities:
 * - Lead card itself
 * - Converted student / parent if linked
 * - Linked tasks and timeline interactions
 * - Dispatches window events
 */
export function syncLeadNameCascade(leadId: string, names: LeadNameUpdate): void {
  if (!leadId) return;

  const contactName = names.contactName !== undefined ? names.contactName.trim() : undefined;
  const studentName = names.studentName !== undefined ? names.studentName.trim() : undefined;

  let leadRef: FullLeadData | undefined;

  // 1. Update Leads in-memory
  const lIdx = INITIAL_LEADS.findIndex((l) => l.id === leadId);
  if (lIdx !== -1) {
    if (contactName !== undefined) INITIAL_LEADS[lIdx].name = contactName;
    if (studentName !== undefined) INITIAL_LEADS[lIdx].studentName = studentName || undefined;
    leadRef = INITIAL_LEADS[lIdx];
  }

  // 2. Update Leads in localStorage
  const storedLeads = getLocal<FullLeadData[]>(LEADS_STORAGE_KEY, []);
  if (storedLeads.length > 0) {
    const updatedLeads = storedLeads.map((l) => {
      if (l.id === leadId) {
        const updated = {
          ...l,
          name: contactName !== undefined ? contactName : l.name,
          studentName: studentName !== undefined ? (studentName || undefined) : l.studentName,
        };
        leadRef = leadRef || updated;
        return updated;
      }
      return l;
    });
    setLocal(LEADS_STORAGE_KEY, updatedLeads);
  }

  const effectiveLead = leadRef || INITIAL_LEADS.find((l) => l.id === leadId);

  // 3. If lead is linked to converted Student, propagate studentName
  if (effectiveLead?.convertedStudentId && studentName) {
    const sFio = splitFullName(studentName);
    syncStudentNameCascade(effectiveLead.convertedStudentId, {
      firstName: sFio.firstName || studentName,
      lastName: sFio.lastName || '',
    });
  }

  // 4. If lead is linked to converted Parent, propagate contactName
  if (effectiveLead?.convertedParentId && contactName) {
    const pFio = splitFullName(contactName);
    syncParentNameCascade(effectiveLead.convertedParentId, {
      firstName: pFio.firstName || contactName,
      lastName: pFio.lastName || '',
    });
  }

  // 5. Update Tasks linked to this lead
  if (contactName) {
    INITIAL_TASKS.forEach((t) => {
      if (t.leadId === leadId) {
        t.leadName = contactName;
      }
    });

    const storedTasks = getLocal<FullTaskData[]>(TASKS_STORAGE_KEY, []);
    if (storedTasks.length > 0) {
      const updatedTasks = storedTasks.map((t) =>
        t.leadId === leadId ? { ...t, leadName: contactName } : t
      );
      setLocal(TASKS_STORAGE_KEY, updatedTasks);
    }
  }

  // 6. Update Timeline Interactions linked to this lead
  const storedInteractions = getLocal<TimelineInteraction[]>(TIMELINE_STORAGE_KEY, []);
  if (storedInteractions.length > 0) {
    const updatedInteractions = storedInteractions.map((i) => {
      if ((i as any).leadId === leadId) {
        return {
          ...i,
          targetName: contactName || i.targetName,
          studentName: studentName || i.studentName,
        };
      }
      return i;
    });
    setLocal(TIMELINE_STORAGE_KEY, updatedInteractions);
  }

  // 7. Supabase Dual-Write
  if (typeof window !== 'undefined' && effectiveLead) {
    import('@/lib/supabase/client').then(({ createClient }) => {
      try {
        const supabase = createClient();
        supabase
          .from('leads')
          .update({
            name: effectiveLead.name,
            student_name: effectiveLead.studentName || null,
            parent_name: (effectiveLead as any).parentName || effectiveLead.name || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', leadId)
          .then(() => {}, (err) => console.warn('Supabase lead update error:', err));
      } catch (err) {
        console.warn('Supabase lead sync error:', err);
      }
    }).catch(() => {});

    // 8. Reactive UI Window Events
    window.dispatchEvent(new CustomEvent('crm-leads-changed', { detail: effectiveLead }));
    window.dispatchEvent(new CustomEvent('crm-tasks-changed'));
    window.dispatchEvent(new CustomEvent('crm-timeline-interactions-changed'));
    window.dispatchEvent(new CustomEvent('crm-names-synced'));
  }
}
