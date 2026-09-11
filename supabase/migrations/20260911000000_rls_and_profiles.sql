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

-- 6. Auto-create profile on first login (invite flow)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'teacher')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
