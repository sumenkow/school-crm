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
  telegramChatId?: string;
  telegramUsername?: string;
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
  telegramChatId?: string;
  telegramUsername?: string;
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

export type GroupStatus = 'recruiting' | 'active' | 'paused' | 'finished' | 'archived';

export interface Group {
  id: string;
  courseId: string;
  courseName?: string;
  teacherId: string;
  teacherName?: string;
  name: string;
  capacity: number;
  enrolledCount?: number;
  status: GroupStatus;
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

export type LessonStatus =
  | 'pending'
  | 'planned'
  | 'conducted'
  | 'cancelled'
  | 'scheduled'
  | 'completed'
  | 'rescheduled'
  | 'rejected';

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
  rejectionReason?: string;
  isIndividual?: boolean;
  studentId?: string;
  isTrial?: boolean;
}

export interface FullLessonData {
  id: string;
  groupId: string;
  groupName: string;
  courseName: string;
  teacherId: string;
  teacherName: string;
  date: string; // YYYY-MM-DD
  dateFormatted: string; // e.g. 03 сен 2026
  dayOfWeek: number; // 0 = Mon, 6 = Sun
  startTime: string;
  endTime: string;
  room: string;
  topic: string;
  homework?: string;
  notes?: string;
  generalLessonNote?: string;
  generalLessonNoteVisibility?: 'parents' | 'internal';
  nextLessonRecommendation?: string;
  nextLessonRecommendationVisibility?: 'parents' | 'internal';
  onlineMeetingUrl?: string;
  status: LessonStatus;
  rescheduleInfo?: {
    previousDate: string;
    previousTime: string;
    newDate: string;
    newTime: string;
    rawNewDate?: string;
    newStartTime?: string;
    newEndTime?: string;
    room: string;
    reason: string;
    changedBy: string;
    changedRole: string;
    changedAt: string;
    notifyParents?: boolean;
  };
  timelineEvents?: Array<{
    id: string;
    timestamp: string;
    author: string;
    role: string;
    type: 'created' | 'status_change' | 'rescheduled' | 'completed' | 'attendance_marked' | 'cancelled' | 'approved' | 'rejected';
    comment: string;
  }>;
  scheduleOverride?: boolean;
  isTrial?: boolean;
  trialStudentsCount?: number;
  isBilled?: boolean;
  billedAt?: string;
  billedStudentIds?: string[];
  billingDetails?: Record<string, { type: 'subscription' | 'deposit'; amount?: number; at?: string }>;
  students: Array<{
    id: string;
    name: string;
    attendanceStatus: 'present' | 'absent' | 'excused' | 'rescheduled' | 'cancelled' | 'not_marked';
    notes?: string;
    isTrial?: boolean;
    billed?: boolean;
  }>;
  rejectionReason?: string;
  isIndividual?: boolean;
  studentId?: string;
  studentName?: string;
  createdByRole?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  createdAt?: string;
  created_at?: string;
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
  | 'no_response'
  | 'enrolled';

export interface Lead {
  id: string;
  name: string;
  contact: string;
  telegram?: string;
  telegramChatId?: string;
  telegramUsername?: string;
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
  assignedToUserId?: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  description?: string;
  createdByUserId?: string;
  createdByRole?: string;
  createdByName?: string;
  creator?: string;
  completedAt?: string;
  completedByUserId?: string;
  completedByName?: string;
  completedBy?: string;
  completionResult?: string;
  result?: string;
  rescheduledReason?: string;
  rescheduledBy?: string;
  rescheduledByUserId?: string;
  rescheduledAt?: string;
  postponeCount?: number;
}

export type PaymentStatus = 'paid' | 'expected' | 'overdue' | 'refund' | 'undefined' | 'pending' | 'failed' | 'cancelled';

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
