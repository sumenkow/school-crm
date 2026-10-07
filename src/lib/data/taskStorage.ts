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

        // Clean legacy HTML comments and read creator metadata directly
        let rawDescription = task.description || fallback?.description || '';
        let extractedCreatedByRole = task.created_by_role || fallback?.createdByRole;
        let extractedCreatedByName = task.created_by_name || fallback?.createdByName;

        // Strip any legacy HTML comments from description
        if (rawDescription && rawDescription.includes('<!--')) {
          if (!extractedCreatedByRole || !extractedCreatedByName) {
            const metaMatch = rawDescription.match(/<!--meta:createdByRole=([^;]+);createdByName=([^>]*)-->/);
            if (metaMatch) {
              if (!extractedCreatedByRole) extractedCreatedByRole = metaMatch[1];
              if (!extractedCreatedByName) extractedCreatedByName = metaMatch[2];
            }
          }
          rawDescription = rawDescription.replace(/<!--[\s\S]*?-->/g, '').trim();
        }

        // Direct lifecycle attributes from DB with fallback to local metadata
        const createdByUserId = task.created_by_user_id || fallback?.createdByUserId;
        const createdByRole = extractedCreatedByRole;
        const createdByName = extractedCreatedByName || fallback?.creator;
        const creator = createdByName;

        const completedAt = task.completed_at || fallback?.completedAt;
        const completedByUserId = task.completed_by_user_id || fallback?.completedByUserId;
        const completedByName = task.completed_by_name || fallback?.completedByName || fallback?.completedBy;
        const completedBy = completedByName;
        const completionResult = task.completion_result || task.result || fallback?.completionResult || fallback?.result;
        const result = completionResult;

        const rescheduledReason = task.rescheduled_reason || fallback?.rescheduledReason;
        const rescheduledBy = task.rescheduled_by_name || task.rescheduled_by || fallback?.rescheduledBy;
        const rescheduledByUserId = task.rescheduled_by_user_id || fallback?.rescheduledByUserId;
        const rescheduledAt = task.rescheduled_at || fallback?.rescheduledAt;
        const postponeCount = (typeof task.postpone_count === 'number' ? task.postpone_count : undefined) ?? fallback?.postponeCount ?? 0;

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
          assignedToUserId: task.assigned_to || fallback?.assignedToUserId,
          description: rawDescription || undefined,
          createdByUserId,
          createdByRole,
          createdByName,
          creator,
          completedAt,
          completedByUserId,
          completedByName,
          completedBy,
          completionResult,
          result,
          rescheduledReason,
          rescheduledBy,
          rescheduledByUserId,
          rescheduledAt,
          postponeCount,
          isOverdue: task.status === 'open' && new Date(task.due_date) < new Date(new Date().setHours(0,0,0,0)),
          tag: fallback?.tag,
          subTag: fallback?.subTag,
          comments: fallback?.comments,
        };
      });

      // Also include any local tasks not in db yet, sanitized
      const missingInDb = localTasks
        .filter(lt => !mappedDbTasks.some(mt => mt.id === lt.id))
        .map(sanitizeTask);
      return [...mappedDbTasks, ...missingInDb];
    }
  } catch (e) {
    console.error('Error fetching tasks from Supabase:', e);
  }

  if (localTasks.length > 0) {
    const combined = [...localTasks, ...INITIAL_TASKS.filter(it => !localTasks.some(p => p.id === it.id))];
    return combined.map(sanitizeTask);
  }

  return INITIAL_TASKS.map(sanitizeTask);
}

function sanitizeTask(task: FullTaskData): FullTaskData {
  let desc = task.description;
  let extractedRole = task.createdByRole;
  let extractedName = task.createdByName || task.creator;
  if (desc && desc.includes('<!--')) {
    if (!extractedRole || !extractedName) {
      const match = desc.match(/<!--meta:createdByRole=([^;]+);createdByName=([^>]*)-->/);
      if (match) {
        if (!extractedRole) extractedRole = match[1];
        if (!extractedName) extractedName = match[2];
      }
    }
    desc = desc.replace(/<!--[\s\S]*?-->/g, '').trim() || undefined;
  }
  return {
    ...task,
    description: desc,
    createdByRole: extractedRole,
    createdByName: extractedName,
    creator: extractedName,
    completedBy: task.completedBy || task.completedByName,
    completedByName: task.completedByName || task.completedBy,
    result: task.result || task.completionResult,
    completionResult: task.completionResult || task.result,
    postponeCount: task.postponeCount ?? 0,
  };
}

/**
 * Saves a task directly to Supabase cloud database and updates in-memory cache.
 * Dispatches crm-tasks-changed event.
 */
export function saveTaskToStorage(task: FullTaskData): void {
  const sanitizedTask = sanitizeTask(task);

  // 1. In-memory update
  const existingIndex = INITIAL_TASKS.findIndex(t => t.id === sanitizedTask.id);
  if (existingIndex >= 0) {
    INITIAL_TASKS[existingIndex] = sanitizedTask;
  } else {
    INITIAL_TASKS.unshift(sanitizedTask);
  }

  // 2. Direct write to localStorage & Supabase
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(TASKS_STORAGE_KEY);
      let localTasks: FullTaskData[] = saved ? JSON.parse(saved) : [];
      const idx = localTasks.findIndex((t) => t.id === sanitizedTask.id);
      if (idx >= 0) {
        localTasks[idx] = sanitizedTask;
      } else {
        localTasks.unshift(sanitizedTask);
      }
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(localTasks));
    } catch (e) {
      console.error('Error writing tasks to localStorage:', e);
    }

    persistEntityToCloud('task', sanitizedTask);

    // 3. Dispatch global event for immediate reactive updates in UI
    try {
      window.dispatchEvent(new CustomEvent('crm-tasks-changed', { detail: sanitizedTask }));
    } catch (e) {}
  }
}
