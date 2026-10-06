-- ==============================================================================
-- Migration: 20261006010000_align_lessons_and_attendance.sql
-- Goal: Resolve P0 Schema Drift, Column Aliasing, Fix Crashing Trigger,
--       Prevent Profile Role Escalation, and Eliminate Duplicate Attendance Table.
-- ==============================================================================

-- 1. Extend lesson_status enum with missing domain statuses
ALTER TYPE lesson_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE lesson_status ADD VALUE IF NOT EXISTS 'planned';
ALTER TYPE lesson_status ADD VALUE IF NOT EXISTS 'conducted';
ALTER TYPE lesson_status ADD VALUE IF NOT EXISTS 'rejected';

-- 2. Add missing columns to public.lessons
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS zoom_url TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS homework TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS day_of_week INT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Backfill existing date and zoom_url values
UPDATE public.lessons SET date = lesson_date WHERE date IS NULL AND lesson_date IS NOT NULL;
UPDATE public.lessons SET zoom_url = online_meeting_url WHERE zoom_url IS NULL AND online_meeting_url IS NOT NULL;

-- 4. Bidirectional trigger to keep date <-> lesson_date and zoom_url <-> online_meeting_url in sync
CREATE OR REPLACE FUNCTION public.sync_lesson_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync date and lesson_date
    IF NEW.date IS NOT NULL AND NEW.lesson_date IS NULL THEN
        NEW.lesson_date := NEW.date;
    ELSIF NEW.lesson_date IS NOT NULL AND NEW.date IS NULL THEN
        NEW.date := NEW.lesson_date;
    ELSIF NEW.date IS NOT NULL AND NEW.date <> NEW.lesson_date THEN
        NEW.lesson_date := NEW.date;
    END IF;

    -- Sync zoom_url and online_meeting_url
    IF NEW.zoom_url IS NOT NULL AND NEW.online_meeting_url IS NULL THEN
        NEW.online_meeting_url := NEW.zoom_url;
    ELSIF NEW.online_meeting_url IS NOT NULL AND NEW.zoom_url IS NULL THEN
        NEW.zoom_url := NEW.online_meeting_url;
    ELSIF NEW.zoom_url IS NOT NULL AND NEW.zoom_url <> NEW.online_meeting_url THEN
        NEW.online_meeting_url := NEW.zoom_url;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_lesson_columns ON public.lessons;
CREATE TRIGGER trg_sync_lesson_columns
BEFORE INSERT OR UPDATE ON public.lessons
FOR EACH ROW EXECUTE FUNCTION public.sync_lesson_columns();

-- 5. Fix crashing balance deduction trigger to reference actual column names and handle attendance reversals
CREATE OR REPLACE FUNCTION public.process_lesson_attendance_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF (NEW.status = 'present' OR (NEW.status = 'absent' AND COALESCE(NEW.charge_balance, true) = true)) THEN
            UPDATE public.subscriptions
            SET lessons_attended = COALESCE(lessons_attended, 0) + 1,
                updated_at = NOW()
            WHERE student_id = NEW.student_id
              AND status = 'active'
              AND (lessons_total IS NULL OR lessons_attended < lessons_total);
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Revert deduction if status changed away from present/charged
        IF (OLD.status = 'present' OR (OLD.status = 'absent' AND COALESCE(OLD.charge_balance, true) = true))
           AND NOT (NEW.status = 'present' OR (NEW.status = 'absent' AND COALESCE(NEW.charge_balance, true) = true)) THEN
            UPDATE public.subscriptions
            SET lessons_attended = GREATEST(0, COALESCE(lessons_attended, 0) - 1),
                updated_at = NOW()
            WHERE student_id = NEW.student_id
              AND status = 'active';
        -- Deduct if status changed to present/charged from uncharged
        ELSIF NOT (OLD.status = 'present' OR (OLD.status = 'absent' AND COALESCE(OLD.charge_balance, true) = true))
           AND (NEW.status = 'present' OR (NEW.status = 'absent' AND COALESCE(NEW.charge_balance, true) = true)) THEN
            UPDATE public.subscriptions
            SET lessons_attended = COALESCE(lessons_attended, 0) + 1,
                updated_at = NOW()
            WHERE student_id = NEW.student_id
              AND status = 'active'
              AND (lessons_total IS NULL OR lessons_attended < lessons_total);
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF (OLD.status = 'present' OR (OLD.status = 'absent' AND COALESCE(OLD.charge_balance, true) = true)) THEN
            UPDATE public.subscriptions
            SET lessons_attended = GREATEST(0, COALESCE(lessons_attended, 0) - 1),
                updated_at = NOW()
            WHERE student_id = OLD.student_id
              AND status = 'active';
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_attendance_balance ON public.attendance;
CREATE TRIGGER trg_attendance_balance
AFTER INSERT OR UPDATE OR DELETE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.process_lesson_attendance_balance();

-- 6. Tighten RLS on profiles to prevent unauthorized role escalation
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        AND (
            role IS NOT DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
            OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('owner', 'developer'))
        )
    );

-- 7. Migrate records from duplicate lesson_attendance to attendance, then drop duplicate
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lesson_attendance') THEN
        INSERT INTO public.attendance (lesson_id, student_id, status, notes, marked_at)
        SELECT lesson_id, student_id, status::attendance_status, notes, updated_at
        FROM public.lesson_attendance
        ON CONFLICT (lesson_id, student_id) DO NOTHING;

        DROP TABLE public.lesson_attendance CASCADE;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
