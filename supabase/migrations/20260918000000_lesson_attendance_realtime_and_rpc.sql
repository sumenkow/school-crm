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
