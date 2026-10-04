import { FullTaskData, INITIAL_TASKS, INITIAL_STUDENTS, INITIAL_LEADS } from './mockData';
import { createClient } from '@/lib/supabase/client';
import { persistEntityToCloud } from './cloudSync';

const TASKS_STORAGE_KEY = 'crm_tasks_v1';

/**
 * Gets tasks from Supabase and merges with localStorage + INITIAL_TASKS.
 * Resolves all entity relations (Student, Parent, Lead, Profile) so UUIDs never leak to UI.
 */
export async function getStoredTasks(): Promise<FullTaskData[]> {
  let localTasks: FullTaskData[] = [];
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(TASKS_STORAGE_KEY);
      if (saved) {
        localTasks = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error reading tasks from localStorage', e);
    }
  }

  try {
    const supabase = createClient();
    const { data: dbTasks, error } = await supabase
      .from('tasks')
      .select('*, profile:assigned_to(id, full_name, role), student:student_id(id, first_name, last_name), parent:parent_id(id, first_name, last_name, phone), lead:lead_id(id, name, contact)')
      .order('created_at', { ascending: false });

    if (!error && dbTasks && dbTasks.length > 0) {
      // Map Supabase Tasks to FullTaskData and merge with local metadata
      const mappedDbTasks: FullTaskData[] = dbTasks.map((task: any) => {
        const localMatch = localTasks.find(lt => lt.id === task.id);
        const initialMatch = INITIAL_TASKS.find(it => it.id === task.id);
        const fallback = localMatch || initialMatch;

        // Parse creator metadata from direct column or description meta
        let rawDescription = task.description || fallback?.description || '';
        let extractedCreatedByRole = task.created_by_role || fallback?.createdByRole;
        let extractedCreatedByName = task.created_by_name || fallback?.createdByName;

        if (rawDescription && rawDescription.includes('<!--meta:')) {
          const metaMatch = rawDescription.match(/<!--meta:createdByRole=([^;]+);createdByName=([^>]*)-->/);
          if (metaMatch) {
            extractedCreatedByRole = metaMatch[1];
            extractedCreatedByName = metaMatch[2];
            rawDescription = rawDescription.replace(/\n?<!--meta:.*-->/, '').trim();
          }
        }

        // Resolve Assigned To Name — never display UUID
        let resolvedAssignee = task.profile?.full_name || fallback?.assignedTo;
        if (!resolvedAssignee || (resolvedAssignee.includes('-') && resolvedAssignee.length > 25)) {
          resolvedAssignee = 'Андрей Волков';
        }

        // Resolve Student Name
        let resolvedStudentName = fallback?.studentName;
        if (!resolvedStudentName && task.student) {
          resolvedStudentName = `${task.student.first_name || ''} ${task.student.last_name || ''}`.trim();
        }
        if (!resolvedStudentName && task.student_id) {
          const stMatch = INITIAL_STUDENTS.find(s => s.id === task.student_id || String(s.id) === String(task.student_id));
          if (stMatch) resolvedStudentName = `${stMatch.firstName} ${stMatch.lastName}`.trim();
        }

        // Resolve Parent Name & Phone
        let resolvedParentName = fallback?.parentName;
        let resolvedParentPhone = fallback?.parentPhone;
        if (!resolvedParentName && task.parent) {
          resolvedParentName = `${task.parent.first_name || ''} ${task.parent.last_name || ''}`.trim();
          resolvedParentPhone = task.parent.phone;
        }

        // Resolve Lead Name
        let resolvedLeadName = fallback?.leadName;
        if (!resolvedLeadName && task.lead) {
          resolvedLeadName = task.lead.name;
        }
        if (!resolvedLeadName && task.lead_id) {
          const ldMatch = INITIAL_LEADS.find(l => l.id === task.lead_id || String(l.id) === String(task.lead_id));
          if (ldMatch) resolvedLeadName = ldMatch.name;
        }

        return {
          id: task.id,
          title: task.title,
          taskType: task.task_type || fallback?.taskType || 'Продажи',
          studentId: task.student_id || fallback?.studentId,
          studentName: resolvedStudentName || undefined,
          parentId: task.parent_id || fallback?.parentId,
          parentName: resolvedParentName || undefined,
          parentPhone: resolvedParentPhone || undefined,
          leadId: task.lead_id || fallback?.leadId,
          leadName: resolvedLeadName || undefined,
          dueDate: task.due_date || fallback?.dueDate || new Date().toISOString().slice(0, 10),
          dueDateFormatted: fallback?.dueDateFormatted || (task.due_date ? new Date(task.due_date).toLocaleDateString('ru-RU') : ''),
          status: task.status as 'open' | 'in_progress' | 'done' | 'cancelled',
          priority: task.priority as 'low' | 'medium' | 'high',
          assignedTo: resolvedAssignee,
          description: rawDescription || undefined,
          completedAt: fallback?.completedAt,
          completedBy: fallback?.completedBy,
          result: fallback?.result,
          rescheduledReason: fallback?.rescheduledReason,
          rescheduledBy: fallback?.rescheduledBy,
          rescheduledAt: fallback?.rescheduledAt,
          isOverdue: task.status === 'open' && new Date(task.due_date) < new Date(new Date().setHours(0,0,0,0)),
          createdByRole: extractedCreatedByRole,
          createdByName: extractedCreatedByName,
          creator: extractedCreatedByName,
          tag: fallback?.tag,
          subTag: fallback?.subTag,
          comments: fallback?.comments,
        };
      });

      // Also include any local tasks not in db yet
      const missingInDb = localTasks.filter(lt => !mappedDbTasks.some(mt => mt.id === lt.id));
      return [...mappedDbTasks, ...missingInDb];
    }
  } catch (e) {
    console.error('Error fetching tasks from Supabase:', e);
  }

  if (localTasks.length > 0) {
    return [...localTasks, ...INITIAL_TASKS.filter(it => !localTasks.some(p => p.id === it.id))];
  }

  return INITIAL_TASKS;
}

/**
 * Saves a task directly to Supabase cloud database and updates in-memory cache.
 * Dispatches crm-tasks-changed event.
 */
export function saveTaskToStorage(task: FullTaskData): void {
  // 1. In-memory update
  const existingIndex = INITIAL_TASKS.findIndex(t => t.id === task.id);
  if (existingIndex >= 0) {
    INITIAL_TASKS[existingIndex] = task;
  } else {
    INITIAL_TASKS.unshift(task);
  }

  // 2. Direct write to localStorage & Supabase
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(TASKS_STORAGE_KEY);
      let localTasks: FullTaskData[] = saved ? JSON.parse(saved) : [];
      const idx = localTasks.findIndex((t) => t.id === task.id);
      if (idx >= 0) {
        localTasks[idx] = task;
      } else {
        localTasks.unshift(task);
      }
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(localTasks));
    } catch (e) {
      console.error('Error writing tasks to localStorage:', e);
    }

    persistEntityToCloud('task', task);

    // 3. Dispatch global event for immediate reactive updates in UI
    try {
      window.dispatchEvent(new CustomEvent('crm-tasks-changed', { detail: task }));
    } catch (e) {}
  }
}
