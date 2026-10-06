-- Migration: 20261006020000_create_audit_events.sql
-- Description: Production-grade immutable audit trail (public.audit_events)
-- Implements append-only immutability triggers, 7 performant indexes, and role-based RLS.

CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_type TEXT NOT NULL, -- 'USER', 'SYSTEM', 'CRON', 'TELEGRAM_BOT'
    actor_id TEXT NOT NULL,
    actor_name_snapshot TEXT NOT NULL,
    actor_role_snapshot TEXT,
    action TEXT NOT NULL,
    result TEXT NOT NULL DEFAULT 'SUCCESS', -- 'SUCCESS', 'FAILURE'
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_name_snapshot TEXT,
    description TEXT NOT NULL,
    before_data JSONB,
    after_data JSONB,
    changed_fields JSONB,
    source TEXT NOT NULL DEFAULT 'WEB', -- 'WEB', 'API', 'TELEGRAM', 'TELEGRAM_MINI_APP', 'SYSTEM', 'CRON'
    request_id TEXT,
    session_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB
);

-- Performance Indexes for 100k+ audit events
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON public.audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor_id ON public.audit_events (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON public.audit_events (action);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON public.audit_events (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_source ON public.audit_events (source);
CREATE INDEX IF NOT EXISTS idx_audit_events_request_id ON public.audit_events (request_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_failures ON public.audit_events (created_at DESC) WHERE result = 'FAILURE';

-- Physical Immutability Engine: Prohibit UPDATE, DELETE, and TRUNCATE
CREATE OR REPLACE FUNCTION public.prevent_audit_events_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_events is an immutable append-only audit trail. UPDATE, DELETE, and TRUNCATE operations are strictly forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_update_delete ON public.audit_events;
CREATE TRIGGER trg_prevent_audit_update_delete
    BEFORE UPDATE OR DELETE ON public.audit_events
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_audit_events_mutation();

DROP TRIGGER IF EXISTS trg_prevent_audit_truncate ON public.audit_events;
CREATE TRIGGER trg_prevent_audit_truncate
    BEFORE TRUNCATE ON public.audit_events
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.prevent_audit_events_mutation();

-- Enable Row-Level Security
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy: Restricted strictly to owner, admin, and developer roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'audit_events' AND policyname = 'crm_roles_select_audit_events'
  ) THEN
    CREATE POLICY crm_roles_select_audit_events
      ON public.audit_events
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('owner', 'developer', 'admin')
        )
      );
  END IF;
END;
$$;

-- 2. INSERT Policy: Authenticated users and server operations can append audit records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'audit_events' AND policyname = 'crm_roles_insert_audit_events'
  ) THEN
    CREATE POLICY crm_roles_insert_audit_events
      ON public.audit_events
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END;
$$;

-- 3. Explicit Denial for UPDATE and DELETE at RLS level
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'audit_events' AND policyname = 'deny_update_audit_events'
  ) THEN
    CREATE POLICY deny_update_audit_events
      ON public.audit_events
      FOR UPDATE
      USING (false)
      WITH CHECK (false);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'audit_events' AND policyname = 'deny_delete_audit_events'
  ) THEN
    CREATE POLICY deny_delete_audit_events
      ON public.audit_events
      FOR DELETE
      USING (false);
  END IF;
END;
$$;

-- 4. Service Role Policy: Full access for server service_role client
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'audit_events' AND policyname = 'service_role_full_access_audit_events'
  ) THEN
    CREATE POLICY service_role_full_access_audit_events
      ON public.audit_events
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END;
$$;
