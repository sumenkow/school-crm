'use client';

import { FullTaskData, INITIAL_TASKS } from './mockData';
import { createClient } from '@/lib/supabase/client';

const TASKS_STORAGE_KEY = 'crm_tasks_v1';

/**
 * Gets tasks from Supabase and merges with localStorage + INITIAL_TASKS.
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
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && dbTasks && dbTasks.length > 0) {
      // Map Supabase Tasks to FullTaskData and merge with local metadata
      const mappedDbTasks: FullTaskData[] = dbTasks.map(task => {
        const localMatch = localTasks.find(lt => lt.id === task.id);
        const initialMatch = INITIAL_TASKS.find(it => it.id === task.id);
        const fallback = localMatch || initialMatch;

        return {
          id: task.id,
          title: task.title,
          taskType: task.task_type || fallback?.taskType || 'other',
          studentId: task.student_id || fallback?.studentId,
          studentName: fallback?.studentName || (task.student_id ? 'Студент' : undefined),
          parentId: task.parent_id || fallback?.parentId,
          parentName: fallback?.parentName || (task.parent_id ? 'Родитель' : undefined),
          leadId: task.lead_id || fallback?.leadId,
          leadName: fallback?.leadName || (task.lead_id ? 'Лид' : undefined),
          dueDate: task.due_date || fallback?.dueDate || new Date().toISOString().slice(0, 10),
          dueDateFormatted: task.due_date ? new Date(task.due_date).toLocaleDateString('ru-RU') : (fallback?.dueDateFormatted || ''),
          status: task.status as 'open' | 'in_progress' | 'done' | 'cancelled',
          priority: task.priority as 'low' | 'medium' | 'high',
          assignedTo: task.assigned_to || fallback?.assignedTo || 'Елена Менеджер',
          description: task.description || fallback?.description || undefined,
          completedAt: fallback?.completedAt,
          completedBy: fallback?.completedBy,
          result: fallback?.result,
          rescheduledReason: fallback?.rescheduledReason,
          isOverdue: task.status === 'open' && new Date(task.due_date) < new Date(new Date().setHours(0,0,0,0))
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

    try {
      const supabase = createClient();
      supabase.from('tasks').upsert({
        id: task.id,
        title: task.title,
        task_type: task.taskType || 'other',
        student_id: task.studentId || null,
        parent_id: task.parentId || null,
        lead_id: task.leadId || null,
        due_date: task.dueDate || new Date().toISOString().slice(0, 10),
        status: task.status,
        priority: task.priority,
        description: task.description || null,
        assigned_to: task.assignedTo || null,
        is_mock_data: false,
      }).then(({ error }) => {
        if (error) console.error('Error upserting task to Supabase:', error);
      });
    } catch (e) {
      console.error('Error initializing Supabase client for task write:', e);
    }

    // 3. Dispatch global event for immediate reactive updates in UI
    try {
      window.dispatchEvent(new CustomEvent('crm-tasks-changed', { detail: task }));
    } catch (e) {}
  }
}
