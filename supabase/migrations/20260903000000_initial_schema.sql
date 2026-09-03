-- School App Initial Database Schema
-- One Source of Truth, 3NF Normalized

-- 1. Create Enums
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'teacher');
CREATE TYPE student_status AS ENUM ('lead', 'trial', 'active', 'paused', 'churned', 'archived', 'needs_review');
CREATE TYPE parent_channel AS ENUM ('telegram', 'whatsapp', 'phone', 'email');
CREATE TYPE relationship_type AS ENUM ('mother', 'father', 'guardian', 'other');
CREATE TYPE group_status AS ENUM ('recruiting', 'active', 'paused', 'finished', 'archived');
CREATE TYPE enrollment_status AS ENUM ('active', 'trial', 'paused', 'completed', 'dropped');
CREATE TYPE lesson_status AS ENUM ('scheduled', 'completed', 'cancelled', 'rescheduled');
CREATE TYPE attendance_status AS ENUM ('not_marked', 'present', 'absent', 'rescheduled', 'cancelled');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'trial_scheduled', 'trial_held', 'thinking', 'paid', 'lost', 'no_response');
CREATE TYPE interaction_channel AS ENUM ('telegram', 'whatsapp', 'phone', 'email', 'call', 'meeting', 'other');
CREATE TYPE interaction_type AS ENUM ('initial_contact', 'follow_up', 'trial', 'payment', 'renewal', 'complaint', 'organizational', 'other');
CREATE TYPE task_status AS ENUM ('open', 'in_progress', 'done', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE payment_status AS ENUM ('paid', 'expected', 'overdue', 'refund', 'undefined');
CREATE TYPE payment_method AS ENUM ('card', 'bank_transfer', 'cash', 'other');
CREATE TYPE subscription_status AS ENUM ('draft', 'active', 'frozen', 'expired', 'cancelled');

-- 2. Profiles (Extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'teacher',
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Teachers
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES profiles(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    telegram TEXT,
    email TEXT,
    bio TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Students
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birth_date DATE,
    phone TEXT,
    telegram TEXT,
    email TEXT,
    status student_status NOT NULL DEFAULT 'lead',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Parents
CREATE TABLE parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    telegram TEXT,
    whatsapp TEXT,
    email TEXT,
    preferred_channel parent_channel NOT NULL DEFAULT 'telegram',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Student - Parent M:N Relationship
CREATE TABLE student_parents (
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    relationship_type relationship_type NOT NULL DEFAULT 'mother',
    is_primary_contact BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (student_id, parent_id)
);

-- 7. Courses
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    subject TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Groups
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    capacity INT NOT NULL DEFAULT 8,
    status group_status NOT NULL DEFAULT 'recruiting',
    schedule_rule JSONB, -- e.g. [{"day": 1, "start": "18:00", "end": "19:30"}]
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Enrollments
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    status enrollment_status NOT NULL DEFAULT 'active',
    joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
    left_at DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, group_id)
);

-- 10. Lessons
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
    lesson_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    topic TEXT,
    online_meeting_url TEXT,
    status lesson_status NOT NULL DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Attendance
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status attendance_status NOT NULL DEFAULT 'not_marked',
    notes TEXT,
    marked_by UUID REFERENCES profiles(id),
    marked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (lesson_id, student_id)
);

-- 12. Subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    status subscription_status NOT NULL DEFAULT 'active',
    lessons_total INT,
    lessons_attended INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    period_label TEXT NOT NULL,
    status payment_status NOT NULL DEFAULT 'paid',
    payment_method payment_method NOT NULL DEFAULT 'card',
    recorded_by UUID REFERENCES profiles(id),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Leads (CRM)
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    parent_name TEXT,
    student_name TEXT,
    converted_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    converted_parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
    direction_or_course TEXT NOT NULL,
    level TEXT,
    source TEXT NOT NULL DEFAULT 'organic',
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status lead_status NOT NULL DEFAULT 'new',
    trial_date TIMESTAMPTZ,
    offer_amount NUMERIC(10, 2),
    loss_reason TEXT,
    next_action TEXT,
    next_action_date DATE,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Interactions (Timeline)
CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    channel interaction_channel NOT NULL DEFAULT 'telegram',
    type interaction_type NOT NULL DEFAULT 'follow_up',
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES parents(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    created_by UUID REFERENCES profiles(id),
    result TEXT,
    next_action TEXT,
    follow_up_date DATE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    task_type TEXT,
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    due_date DATE NOT NULL,
    status task_status NOT NULL DEFAULT 'open',
    priority task_priority NOT NULL DEFAULT 'medium',
    source_interaction_id UUID REFERENCES interactions(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_groups_course_teacher ON groups(course_id, teacher_id);
CREATE INDEX idx_lessons_date_teacher ON lessons(lesson_date, teacher_id);
CREATE INDEX idx_attendance_lesson ON attendance(lesson_id);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_tasks_assigned_due ON tasks(assigned_to, due_date);
CREATE INDEX idx_interactions_lead ON interactions(lead_id);
CREATE INDEX idx_interactions_student ON interactions(student_id);
