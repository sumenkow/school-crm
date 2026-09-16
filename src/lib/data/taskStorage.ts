'use client';

import { FullTaskData, INITIAL_TASKS } from './mockData';
import { createClient } from '@/lib/supabase/client';

const TASKS_STORAGE_KEY = 'crm_tasks_v1';

/**
 * Gets tasks from Supabase first. If error or empty, falls back to localStorage + INITIAL_TASKS.
 */
export async function getStoredTasks(): Promise<FullTaskData[]> {
  if (typeof window === 'undefined') return INITIAL_TASKS;

  try {
    const supabase = createClient();
    const { data: dbTasks, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && dbTasks && dbTasks.length > 0) {
      // Map Supabase Tasks to FullTaskData
      return dbTasks.map(task => ({
        id: task.id,
        title: task.title,
        taskType: task.task_type || 'other',
        studentId: task.student_id,
        leadId: task.lead_id,
        // Mock data mapping for UI fields since we don't have joins here yet
        studentName: task.student_id ? 'Студент' : undefined, 
        leadName: task.lead_id ? 'Лид' : undefined,
        dueDate: task.due_date,
        dueDateFormatted: task.due_date ? new Date(task.due_date).toLocaleDateString('ru-RU') : '',
        status: task.status as 'open' | 'in_progress' | 'done' | 'cancelled',
        priority: task.priority as 'low' | 'medium' | 'high',
        assignedTo: task.assigned_to || 'Елена Менеджер',
        description: task.description || undefined,
        isOverdue: task.status === 'open' && new Date(task.due_date) < new Date(new Date().setHours(0,0,0,0))
      }));
    }
  } catch (e) {
    console.error('Error fetching tasks from Supabase:', e);
  }

  // Fallback to localStorage
  try {
    const saved = localStorage.getItem(TASKS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return [...parsed, ...INITIAL_TASKS.filter(it => !parsed.some((p: any) => p.id === it.id))];
      }
    }
  } catch (e) {
    console.error('Error reading tasks from localStorage', e);
  }

  return INITIAL_TASKS;
}

/**
 * Saves a task to localStorage (sync) and Supabase (fire-and-forget async)
 */
export function saveTaskToStorage(task: FullTaskData): void {
  if (typeof window === 'undefined') return;

  // 1. Save to LocalStorage
  try {
    const saved = localStorage.getItem(TASKS_STORAGE_KEY);
    let tasks: FullTaskData[] = saved ? JSON.parse(saved) : [];
    
    const existingIndex = tasks.findIndex(t => t.id === task.id);
    if (existingIndex >= 0) {
      tasks[existingIndex] = task;
    } else {
      tasks = [task, ...tasks];
    }
    
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Error saving task to localStorage:', e);
  }

  // 2. Dual-write to Supabase (fire and forget)
  try {
    const supabase = createClient();
    supabase.from('tasks').upsert({
      id: task.id,
      title: task.title,
      task_type: task.taskType || 'other',
      student_id: task.studentId || null,
      lead_id: task.leadId || null,
      due_date: task.dueDate || new Date().toISOString().slice(0, 10),
      status: task.status,
      priority: task.priority,
      description: task.description || null,
      is_mock_data: false,
    }).then(({ error }) => {
      if (error) console.error('Error upserting task to Supabase:', error);
    });
  } catch (e) {
    console.error('Error initializing Supabase client for task dual-write:', e);
  }
}
