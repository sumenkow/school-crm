import { createClient as createSupabaseClient } from './client';
import type {
  Student, Parent, Lead, Task, Group, Payment, Subscription,
  Lesson, Interaction, Teacher, Course, Enrollment,
  LeadStatus, StudentStatus, PaymentStatus, TaskStatus, TaskPriority
} from './types';

// ─── STUDENTS ───────────────────────────────────────────────────────────────

export async function getStudents() {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Student[];
}

export async function getStudentById(id: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      student_parents (
        relationship_type, is_primary_contact,
        parent:parents (*)
      ),
      enrollments (
        *, group:groups (*, course:courses(*), teacher:teachers(*))
      ),
      subscriptions (*),
      payments (*)
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createStudent(student: Omit<Student, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('students')
    .insert(student)
    .select()
    .single();
  if (error) throw error;
  return data as Student;
}

export async function updateStudentStatus(id: string, status: StudentStatus) {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from('students')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ─── PARENTS ────────────────────────────────────────────────────────────────

export async function getParents() {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('parents')
    .select(`*, student_parents(relationship_type, student:students(id, first_name, last_name, status))`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createParent(parent: Omit<Parent, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('parents')
    .insert(parent)
    .select()
    .single();
  if (error) throw error;
  return data as Parent;
}

// ─── LEADS (CRM) ─────────────────────────────────────────────────────────────

export async function getLeads() {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Lead[];
}

export async function getLeadById(id: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('leads')
    .select(`*, interactions(*)`)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createLead(lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('leads')
    .insert(lead)
    .select()
    .single();
  if (error) throw error;
  return data as Lead;
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from('leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function addLeadInteraction(interaction: Omit<Interaction, 'id' | 'created_at'>) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('interactions')
    .insert(interaction)
    .select()
    .single();
  if (error) throw error;
  return data as Interaction;
}

// ─── GROUPS ──────────────────────────────────────────────────────────────────

export async function getGroups() {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('groups')
    .select(`
      *,
      course:courses(*),
      teacher:teachers(*),
      enrollments(id, status, student:students(id, first_name, last_name, status))
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getGroupById(id: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('groups')
    .select(`
      *,
      course:courses(*),
      teacher:teachers(*),
      enrollments(*, student:students(*)),
      lessons(* )
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createGroup(group: {
  course_id: string;
  teacher_id: string;
  name: string;
  capacity: number;
  start_date: string;
  schedule_rule?: Record<string, unknown>;
}) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('groups')
    .insert(group)
    .select()
    .single();
  if (error) throw error;
  return data as Group;
}

// ─── TEACHERS ────────────────────────────────────────────────────────────────

export async function getTeachers() {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .eq('status', 'active')
    .order('last_name');
  if (error) throw error;
  return data as Teacher[];
}

export async function getTeacherById(id: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('teachers')
    .select(`*, groups(*, course:courses(*))`)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// ─── COURSES ─────────────────────────────────────────────────────────────────

export async function getCourses() {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data as Course[];
}

// ─── LESSONS ─────────────────────────────────────────────────────────────────

export async function getLessons(filters?: { date?: string; teacher_id?: string }) {
  const supabase = createSupabaseClient();
  let query = supabase
    .from('lessons')
    .select(`*, group:groups(*, course:courses(*)), teacher:teachers(*), attendance(*, student:students(*))`)
    .order('lesson_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (filters?.date) query = query.eq('lesson_date', filters.date);
  if (filters?.teacher_id) query = query.eq('teacher_id', filters.teacher_id);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createLesson(lesson: Omit<Lesson, 'id' | 'created_at'>) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('lessons')
    .insert(lesson)
    .select()
    .single();
  if (error) throw error;
  return data as Lesson;
}

export async function markAttendance(
  lessonId: string,
  studentId: string,
  status: 'present' | 'absent' | 'rescheduled'
) {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from('attendance')
    .upsert({
      lesson_id: lessonId,
      student_id: studentId,
      status,
      marked_at: new Date().toISOString(),
    }, { onConflict: 'lesson_id,student_id' });
  if (error) throw error;
}

// ─── PAYMENTS ────────────────────────────────────────────────────────────────

export async function getPayments(filters?: { status?: PaymentStatus }) {
  const supabase = createSupabaseClient();
  let query = supabase
    .from('payments')
    .select(`*, student:students(id, first_name, last_name)`)
    .order('payment_date', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createPayment(payment: Omit<Payment, 'id' | 'created_at'>) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('payments')
    .insert(payment)
    .select()
    .single();
  if (error) throw error;
  return data as Payment;
}

// ─── SUBSCRIPTIONS ───────────────────────────────────────────────────────────

export async function getSubscriptions(filters?: { student_id?: string }) {
  const supabase = createSupabaseClient();
  let query = supabase
    .from('subscriptions')
    .select(`*, student:students(id, first_name, last_name), course:courses(name)`)
    .order('end_date', { ascending: true });

  if (filters?.student_id) query = query.eq('student_id', filters.student_id);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createSubscription(sub: Omit<Subscription, 'id' | 'created_at' | 'updated_at' | 'lessons_attended'>) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .insert(sub)
    .select()
    .single();
  if (error) throw error;
  return data as Subscription;
}

export async function toggleSubscriptionFreeze(id: string, currentStatus: string) {
  const supabase = createSupabaseClient();
  const newStatus = currentStatus === 'frozen' ? 'active' : 'frozen';
  const { error } = await supabase
    .from('subscriptions')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  return newStatus;
}

// ─── TASKS ───────────────────────────────────────────────────────────────────

export async function getTasks(filters?: { status?: TaskStatus; priority?: TaskPriority }) {
  const supabase = createSupabaseClient();
  let query = supabase
    .from('tasks')
    .select(`*, student:students(id, first_name, last_name), lead:leads(id, name)`)
    .order('due_date', { ascending: true });

  if (filters?.status && filters.status !== 'open') query = query.eq('status', filters.status);
  if (filters?.priority) query = query.eq('priority', filters.priority);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function toggleTaskDone(id: string, currentStatus: TaskStatus) {
  const supabase = createSupabaseClient();
  const newStatus: TaskStatus = currentStatus === 'done' ? 'open' : 'done';
  const { error } = await supabase
    .from('tasks')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  return newStatus;
}

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const supabase = createSupabaseClient();

  const [studentsRes, paymentsRes, leadsRes, groupsRes, tasksRes, enrollmentsRes] = await Promise.all([
    supabase.from('students').select('id, status'),
    supabase.from('payments').select('amount, status, payment_date'),
    supabase.from('leads').select('id, status'),
    supabase.from('groups').select('id, capacity, status, enrollments(id, status)'),
    supabase.from('tasks').select('id, status, priority').neq('status', 'done'),
    supabase.from('enrollments').select('id, status').eq('status', 'active'),
  ]);

  const students = studentsRes.data || [];
  const payments = paymentsRes.data || [];
  const leads = leadsRes.data || [];
  const groups = groupsRes.data || [];
  const tasks = tasksRes.data || [];

  // Current month payments
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthPayments = payments.filter(p => p.payment_date >= monthStart && p.status === 'paid');
  const totalRevenue = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const overduePayments = payments.filter(p => p.status === 'overdue');
  const overdueAmount = overduePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return {
    students: {
      total: students.length,
      active: students.filter(s => s.status === 'active').length,
      paused: students.filter(s => s.status === 'paused').length,
      churned: students.filter(s => s.status === 'churned').length,
    },
    finance: {
      monthRevenue: totalRevenue,
      overdueCount: overduePayments.length,
      overdueAmount,
      avgCheck: students.length > 0 ? Math.round(totalRevenue / (students.filter(s => s.status === 'active').length || 1)) : 0,
    },
    crm: {
      total: leads.length,
      trialScheduled: leads.filter(l => l.status === 'trial_scheduled').length,
      trialHeld: leads.filter(l => l.status === 'trial_held').length,
      paid: leads.filter(l => l.status === 'paid').length,
    },
    groups: {
      total: groups.length,
      totalCapacity: groups.reduce((sum, g) => sum + (g.capacity || 0), 0),
      activeEnrollments: enrollmentsRes.data?.length || 0,
    },
    tasks: {
      open: tasks.filter(t => t.status !== 'done').length,
      highPriority: tasks.filter(t => t.priority === 'high').length,
    },
  };
}

// ─── SEED DATA ───────────────────────────────────────────────────────────────

export async function seedInitialData() {
  const supabase = createSupabaseClient();

  // Insert sample courses
  const { data: courses } = await supabase
    .from('courses')
    .insert([
      { name: 'Английский язык (Kids)', subject: 'Английский язык', description: 'Английский для детей 6-10 лет' },
      { name: 'Английский язык (Teens)', subject: 'Английский язык', description: 'Английский для подростков 11-17 лет' },
      { name: 'Робототехника', subject: 'Робототехника', description: 'LEGO Mindstorms и Arduino' },
      { name: 'Математика', subject: 'Математика', description: 'Подготовка к ЕГЭ/ОГЭ' },
      { name: 'Программирование', subject: 'Программирование', description: 'Scratch, Python для детей' },
    ])
    .select();

  return courses;
}
