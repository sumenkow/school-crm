export type UserRole = 'developer' | 'owner' | 'admin' | 'teacher';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
}

export type StudentStatus =
  | 'lead'
  | 'trial'
  | 'active'
  | 'paused'
  | 'churned'
  | 'archived'
  | 'needs_review';

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  grade?: string;
  phone?: string;
  telegram?: string;
  email?: string;
  studentType?: 'school_student' | 'adult_student';
  status: StudentStatus;
  isDeleted?: boolean;
  deletedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Parent {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  telegram?: string;
  whatsapp?: string;
  email?: string;
  preferredChannel: 'telegram' | 'whatsapp' | 'phone' | 'email';
  notifyWhatsapp?: boolean;
  notifyTelegram?: boolean;
  notifyEmail?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  notes?: string;
}

export interface StudentParentRelation {
  studentId: string;
  parentId: string;
  relationshipType: 'mother' | 'father' | 'guardian' | 'other';
  isPrimaryContact: boolean;
}

export interface Course {
  id: string;
  name: string;
  description?: string;
  subject: string;
  isActive: boolean;
}

export interface Group {
  id: string;
  courseId: string;
  courseName?: string;
  teacherId: string;
  teacherName?: string;
  name: string;
  capacity: number;
  enrolledCount?: number;
  status: 'recruiting' | 'active' | 'paused' | 'finished' | 'archived';
  isDeleted?: boolean;
  deletedAt?: string;
  scheduleRule?: Array<{ day: number; start: string; end: string }>;
  startDate: string;
  endDate?: string;
}

export interface Teacher {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  phone: string;
  telegram?: string;
  email?: string;
  bio?: string;
  status: 'active' | 'archived';
}

export type LessonStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';

export interface Lesson {
  id: string;
  groupId: string;
  groupName?: string;
  teacherId: string;
  teacherName?: string;
  lessonDate: string;
  startTime: string;
  endTime: string;
  topic?: string;
  onlineMeetingUrl?: string;
  status: LessonStatus;
  notes?: string;
}

export type AttendanceStatus =
  | 'not_marked'
  | 'present'
  | 'absent'
  | 'rescheduled'
  | 'cancelled';

export interface Attendance {
  id: string;
  lessonId: string;
  studentId: string;
  studentName?: string;
  status: AttendanceStatus;
  notes?: string;
  markedBy?: string;
  markedAt?: string;
}

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'trial_scheduled'
  | 'trial_held'
  | 'thinking'
  | 'paid'
  | 'lost'
  | 'no_response';

export interface Lead {
  id: string;
  name: string;
  contact: string;
  parentName?: string;
  studentName?: string;
  grade?: string;
  directionOrCourse: string;
  level?: string;
  source: string;
  assignedTo?: string;
  status: LeadStatus;
  trialDate?: string;
  offerAmount?: number;
  lossReason?: string;
  nextAction?: string;
  nextActionDate?: string;
  comment?: string;
  createdAt: string;
}

export type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  taskType?: string;
  studentId?: string;
  parentId?: string;
  leadId?: string;
  assignedTo?: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  description?: string;
  completedAt?: string;
  completedBy?: string;
  result?: string;
  rescheduledReason?: string;
}

export type PaymentStatus = 'paid' | 'expected' | 'overdue' | 'refund' | 'undefined';

export interface Payment {
  id: string;
  studentId: string;
  parentId?: string;
  subscriptionId?: string;
  groupId?: string;
  amount: number;
  paymentDate: string;
  periodLabel: string;
  status: PaymentStatus;
  paymentMethod: 'card' | 'bank_transfer' | 'cash' | 'other';
  comment?: string;
}

export interface Subscription {
  id: string;
  studentId: string;
  courseId?: string;
  groupId?: string;
  startDate: string;
  endDate: string;
  price: number;
  status: 'draft' | 'active' | 'frozen' | 'expired' | 'cancelled';
  lessonsTotal?: number;
  lessonsAttended?: number;
}
