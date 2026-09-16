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
