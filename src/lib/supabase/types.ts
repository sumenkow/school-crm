/**
 * Supabase Database Types
 * Auto-generated from schema: supabase/migrations/20260903000000_initial_schema.sql
 */

export type UserRole = 'owner' | 'admin' | 'teacher';
export type StudentStatus = 'lead' | 'trial' | 'active' | 'paused' | 'churned' | 'archived' | 'needs_review';
export type GroupStatus = 'recruiting' | 'active' | 'paused' | 'finished' | 'archived';
export type EnrollmentStatus = 'active' | 'trial' | 'paused' | 'completed' | 'dropped';
export type LessonStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
export type AttendanceStatus = 'not_marked' | 'present' | 'absent' | 'rescheduled' | 'cancelled';
export type LeadStatus = 'new' | 'contacted' | 'trial_scheduled' | 'trial_held' | 'thinking' | 'paid' | 'lost' | 'no_response';
export type InteractionChannel = 'telegram' | 'whatsapp' | 'phone' | 'email' | 'call' | 'meeting' | 'other';
export type InteractionType = 'initial_contact' | 'follow_up' | 'trial' | 'payment' | 'renewal' | 'complaint' | 'organizational' | 'other';
export type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high';
export type PaymentStatus = 'paid' | 'expected' | 'overdue' | 'refund' | 'undefined';
export type PaymentMethod = 'card' | 'bank_transfer' | 'cash' | 'other';
export type SubscriptionStatus = 'draft' | 'active' | 'frozen' | 'expired' | 'cancelled';
export type ParentChannel = 'telegram' | 'whatsapp' | 'phone' | 'email';
export type RelationshipType = 'mother' | 'father' | 'guardian' | 'other';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Teacher {
  id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  phone?: string;
  telegram?: string;
  email?: string;
  bio?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  birth_date?: string;
  phone?: string;
  telegram?: string;
  email?: string;
  status: StudentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Parent {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  telegram?: string;
  whatsapp?: string;
  email?: string;
  preferred_channel: ParentChannel;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentParent {
  student_id: string;
  parent_id: string;
  relationship_type: RelationshipType;
  is_primary_contact: boolean;
  created_at: string;
}

export interface Course {
  id: string;
  name: string;
  description?: string;
  subject: string;
  is_active: boolean;
  created_at: string;
}

export interface Group {
  id: string;
  course_id: string;
  teacher_id: string;
  name: string;
  capacity: number;
  status: GroupStatus;
  schedule_rule?: Record<string, unknown>;
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  course?: Course;
  teacher?: Teacher;
  enrollments?: Enrollment[];
}

export interface Enrollment {
  id: string;
  student_id: string;
  group_id: string;
  status: EnrollmentStatus;
  joined_at: string;
  left_at?: string;
  created_at: string;
  // Joined
  student?: Student;
  group?: Group;
}

export interface Lesson {
  id: string;
  group_id: string;
  teacher_id: string;
  lesson_date: string;
  start_time: string;
  end_time: string;
  topic?: string;
  online_meeting_url?: string;
  status: LessonStatus;
  notes?: string;
  created_at: string;
  // Joined
  group?: Group;
  teacher?: Teacher;
  attendance?: Attendance[];
}

export interface Attendance {
  id: string;
  lesson_id: string;
  student_id: string;
  status: AttendanceStatus;
  notes?: string;
  marked_by?: string;
  marked_at?: string;
  created_at: string;
  // Joined
  student?: Student;
}

export interface Subscription {
  id: string;
  student_id: string;
  course_id?: string;
  group_id?: string;
  start_date: string;
  end_date: string;
  price: number;
  status: SubscriptionStatus;
  lessons_total?: number;
  lessons_attended: number;
  created_at: string;
  updated_at: string;
  // Joined
  student?: Student;
  course?: Course;
  group?: Group;
}

export interface Payment {
  id: string;
  student_id: string;
  parent_id?: string;
  subscription_id?: string;
  group_id?: string;
  amount: number;
  payment_date: string;
  period_label: string;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  recorded_by?: string;
  comment?: string;
  created_at: string;
  // Joined
  student?: Student;
  parent?: Parent;
}

export interface Lead {
  id: string;
  name: string;
  contact: string;
  parent_name?: string;
  student_name?: string;
  converted_student_id?: string;
  converted_parent_id?: string;
  direction_or_course: string;
  level?: string;
  source: string;
  assigned_to?: string;
  status: LeadStatus;
  trial_date?: string;
  offer_amount?: number;
  loss_reason?: string;
  next_action?: string;
  next_action_date?: string;
  comment?: string;
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  occurred_at: string;
  channel: InteractionChannel;
  type: InteractionType;
  lead_id?: string;
  parent_id?: string;
  student_id?: string;
  created_by?: string;
  result?: string;
  next_action?: string;
  follow_up_date?: string;
  content: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  task_type?: string;
  student_id?: string;
  parent_id?: string;
  lead_id?: string;
  assigned_to?: string;
  due_date: string;
  status: TaskStatus;
  priority: TaskPriority;
  source_interaction_id?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  // Joined
  student?: Student;
  lead?: Lead;
}

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile };
      teachers: { Row: Teacher };
      students: { Row: Student };
      parents: { Row: Parent };
      student_parents: { Row: StudentParent };
      courses: { Row: Course };
      groups: { Row: Group };
      enrollments: { Row: Enrollment };
      lessons: { Row: Lesson };
      attendance: { Row: Attendance };
      subscriptions: { Row: Subscription };
      payments: { Row: Payment };
      leads: { Row: Lead };
      interactions: { Row: Interaction };
      tasks: { Row: Task };
    };
  };
};
