-- ==========================================================
-- SMART ACADEMY CRM DATABASE SCHEMA SNAPSHOT
-- Snapshot Date: 2026-10-05
-- Commit SHA: 643731e0590439aca713c0357cdc07e618834efe
-- ==========================================================

-- >>> START MIGRATION: 20260903000000_initial_schema.sql <<<
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

-- >>> END MIGRATION: 20260903000000_initial_schema.sql <<<

-- >>> START MIGRATION: 20260911000000_rls_and_profiles.sql <<<
-- ============================================================
-- RLS Policies + Profiles Trigger
-- Запустите этот SQL в Supabase SQL Editor:
-- https://supabase.com/dashboard/project/gkxfieavmobslyeqlptq/sql/new
-- ============================================================

-- 1. Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Profiles policies
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 3. Helper function: get current user role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 4. Owner/Admin full access policies
CREATE POLICY "owner_admin_students" ON students FOR ALL TO authenticated
  USING (get_my_role() IN ('owner', 'admin'));

CREATE POLICY "owner_admin_parents" ON parents FOR ALL TO authenticated
  USING (get_my_role() IN ('owner', 'admin'));

CREATE POLICY "owner_admin_leads" ON leads FOR ALL TO authenticated
  USING (get_my_role() IN ('owner', 'admin'));

CREATE POLICY "owner_admin_tasks" ON tasks FOR ALL TO authenticated
  USING (get_my_role() IN ('owner', 'admin'));

CREATE POLICY "owner_admin_payments" ON payments FOR ALL TO authenticated
  USING (get_my_role() IN ('owner', 'admin'));

CREATE POLICY "owner_admin_subscriptions" ON subscriptions FOR ALL TO authenticated
  USING (get_my_role() IN ('owner', 'admin'));

CREATE POLICY "owner_admin_groups" ON groups FOR ALL TO authenticated
  USING (get_my_role() IN ('owner', 'admin'));

CREATE POLICY "owner_admin_teachers" ON teachers FOR ALL TO authenticated
  USING (get_my_role() IN ('owner', 'admin'));

CREATE POLICY "owner_admin_courses" ON courses FOR ALL TO authenticated
  USING (get_my_role() IN ('owner', 'admin'));

CREATE POLICY "owner_admin_enrollments" ON enrollments FOR ALL TO authenticated
  USING (get_my_role() IN ('owner', 'admin'));

CREATE POLICY "owner_admin_interactions" ON interactions FOR ALL TO authenticated
  USING (get_my_role() IN ('owner', 'admin'));

-- 5. Teacher read-only policies
CREATE POLICY "teacher_select_groups" ON groups FOR SELECT TO authenticated
  USING (get_my_role() = 'teacher');

CREATE POLICY "teacher_select_lessons" ON lessons FOR ALL TO authenticated
  USING (get_my_role() IN ('owner', 'admin', 'teacher'));

CREATE POLICY "teacher_all_attendance" ON attendance FOR ALL TO authenticated
  USING (get_my_role() IN ('owner', 'admin', 'teacher'));

CREATE POLICY "teacher_select_enrollments" ON enrollments FOR SELECT TO authenticated
  USING (get_my_role() = 'teacher');

CREATE POLICY "teacher_select_students" ON students FOR SELECT TO authenticated
  USING (get_my_role() = 'teacher');

CREATE POLICY "teacher_select_courses" ON courses FOR SELECT TO authenticated
  USING (get_my_role() = 'teacher');

-- 6. Note: Profiles are created explicitly by application API via service_role client.
-- Triggers on auth.users are avoided to prevent deadlock with Supabase Auth GoTrue service.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- >>> END MIGRATION: 20260911000000_rls_and_profiles.sql <<<

-- >>> START MIGRATION: 20260916000000_developer_role_and_mock.sql <<<
-- ============================================================
-- Developer role + is_mock_data flag for all core tables
-- Run in Supabase SQL Editor AFTER the previous two migrations
-- ============================================================

-- 1. Add 'developer' value to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'developer';

-- 2. Add is_mock_data flag to all core tables
ALTER TABLE students     ADD COLUMN IF NOT EXISTS is_mock_data BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE parents      ADD COLUMN IF NOT EXISTS is_mock_data BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE leads        ADD COLUMN IF NOT EXISTS is_mock_data BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE payments     ADD COLUMN IF NOT EXISTS is_mock_data BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tasks        ADD COLUMN IF NOT EXISTS is_mock_data BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS is_mock_data BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Update RLS helper to include developer
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 4. Developer gets full access to all tables
-- Drop old policies that might conflict and recreate with developer included

-- Students
DROP POLICY IF EXISTS "owner_admin_students" ON students;
DROP POLICY IF EXISTS "teacher_select_students" ON students;
CREATE POLICY "privileged_students" ON students FOR ALL TO authenticated
  USING (get_my_role() IN ('developer', 'owner', 'admin'));
CREATE POLICY "teacher_select_students" ON students FOR SELECT TO authenticated
  USING (get_my_role() = 'teacher');

-- Parents
DROP POLICY IF EXISTS "owner_admin_parents" ON parents;
CREATE POLICY "privileged_parents" ON parents FOR ALL TO authenticated
  USING (get_my_role() IN ('developer', 'owner', 'admin'));

-- Leads
DROP POLICY IF EXISTS "owner_admin_leads" ON leads;
CREATE POLICY "privileged_leads" ON leads FOR ALL TO authenticated
  USING (get_my_role() IN ('developer', 'owner', 'admin'));

-- Tasks
DROP POLICY IF EXISTS "owner_admin_tasks" ON tasks;
CREATE POLICY "privileged_tasks" ON tasks FOR ALL TO authenticated
  USING (get_my_role() IN ('developer', 'owner', 'admin'));

-- Payments
DROP POLICY IF EXISTS "owner_admin_payments" ON payments;
CREATE POLICY "privileged_payments" ON payments FOR ALL TO authenticated
  USING (get_my_role() IN ('developer', 'owner', 'admin'));

-- Subscriptions
DROP POLICY IF EXISTS "owner_admin_subscriptions" ON subscriptions;
CREATE POLICY "privileged_subscriptions" ON subscriptions FOR ALL TO authenticated
  USING (get_my_role() IN ('developer', 'owner', 'admin'));

-- Groups
DROP POLICY IF EXISTS "owner_admin_groups" ON groups;
CREATE POLICY "privileged_groups" ON groups FOR ALL TO authenticated
  USING (get_my_role() IN ('developer', 'owner', 'admin'));

-- Teachers
DROP POLICY IF EXISTS "owner_admin_teachers" ON teachers;
CREATE POLICY "privileged_teachers" ON teachers FOR ALL TO authenticated
  USING (get_my_role() IN ('developer', 'owner', 'admin'));

-- Courses
DROP POLICY IF EXISTS "owner_admin_courses" ON courses;
CREATE POLICY "privileged_courses" ON courses FOR ALL TO authenticated
  USING (get_my_role() IN ('developer', 'owner', 'admin'));

-- Enrollments
DROP POLICY IF EXISTS "owner_admin_enrollments" ON enrollments;
CREATE POLICY "privileged_enrollments" ON enrollments FOR ALL TO authenticated
  USING (get_my_role() IN ('developer', 'owner', 'admin'));

-- Interactions
DROP POLICY IF EXISTS "owner_admin_interactions" ON interactions;
CREATE POLICY "privileged_interactions" ON interactions FOR ALL TO authenticated
  USING (get_my_role() IN ('developer', 'owner', 'admin'));

-- Profiles: developer can see and update all profiles
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "profiles_update_developer" ON profiles FOR UPDATE TO authenticated
  USING (get_my_role() IN ('developer', 'owner'));

-- 5. Function to delete all mock data (callable by developer/owner only)
CREATE OR REPLACE FUNCTION delete_mock_data()
RETURNS VOID AS $$
BEGIN
  -- Only allow developer or owner
  IF get_my_role() NOT IN ('developer', 'owner') THEN
    RAISE EXCEPTION 'Insufficient privileges to delete mock data';
  END IF;

  DELETE FROM interactions WHERE is_mock_data = TRUE;
  DELETE FROM tasks        WHERE is_mock_data = TRUE;
  DELETE FROM payments     WHERE is_mock_data = TRUE;
  DELETE FROM leads        WHERE is_mock_data = TRUE;
  DELETE FROM students     WHERE is_mock_data = TRUE;
  DELETE FROM parents      WHERE is_mock_data = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- >>> END MIGRATION: 20260916000000_developer_role_and_mock.sql <<<

-- >>> START MIGRATION: 20260916000001_fix_student_parents_rls.sql <<<
-- ============================================================
-- Fix RLS for student_parents table
-- ============================================================

-- 1. Enable RLS
ALTER TABLE student_parents ENABLE ROW LEVEL SECURITY;

-- 2. Owner/Admin/Developer full access
CREATE POLICY "owner_admin_dev_student_parents" ON student_parents FOR ALL TO authenticated
  USING (get_my_role() IN ('owner', 'admin', 'developer'));

-- 3. Teacher read-only access (if applicable in your app)
CREATE POLICY "teacher_read_student_parents" ON student_parents FOR SELECT TO authenticated
  USING (get_my_role() = 'teacher');

-- >>> END MIGRATION: 20260916000001_fix_student_parents_rls.sql <<<

-- >>> START MIGRATION: 20260918000000_lesson_attendance_realtime_and_rpc.sql <<<
-- Migration: Lesson Attendance Realtime and Auto-Balance Deduction RPC/Trigger

-- 1. Create lesson_attendance table if not exists
CREATE TABLE IF NOT EXISTS public.lesson_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL,
    student_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'present',
    charge_balance BOOLEAN DEFAULT true,
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lesson_id, student_id)
);

-- 2. Add realtime publications (safely ignored if already published)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'lessons'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.lessons;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'lesson_attendance'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.supabase_realtime ADD TABLE public.lesson_attendance;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.lessons REPLICA IDENTITY FULL;
ALTER TABLE public.lesson_attendance REPLICA IDENTITY FULL;

-- 3. RPC Function & Trigger for auto balance deduction
CREATE OR REPLACE FUNCTION public.process_lesson_attendance_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- If status is 'present' or 'absent' with charge_balance = true, deduct lesson from active subscription
    IF (NEW.status = 'present' OR (NEW.status = 'absent' AND COALESCE(NEW.charge_balance, true) = true)) THEN
        UPDATE public.subscriptions
        SET spent_lessons = COALESCE(spent_lessons, 0) + 1,
            updated_at = NOW()
        WHERE student_id = NEW.student_id
          AND status = 'active'
          AND (total_lessons IS NULL OR spent_lessons < total_lessons);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_on_lesson_attendance_charge ON public.lesson_attendance;
CREATE TRIGGER trigger_on_lesson_attendance_charge
AFTER INSERT OR UPDATE ON public.lesson_attendance
FOR EACH ROW
EXECUTE FUNCTION public.process_lesson_attendance_balance();

-- >>> END MIGRATION: 20260918000000_lesson_attendance_realtime_and_rpc.sql <<<

