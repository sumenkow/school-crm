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
