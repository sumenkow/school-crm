-- Phase 6: Enable RLS on public.lesson_attendance and ensure developer role access

ALTER TABLE public.lesson_attendance ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'lesson_attendance' AND policyname = 'crm_roles_access_lesson_attendance'
  ) THEN
    CREATE POLICY crm_roles_access_lesson_attendance
      ON public.lesson_attendance
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('owner', 'developer', 'admin', 'teacher')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('owner', 'developer', 'admin', 'teacher')
        )
      );
  END IF;
END;
$$;
