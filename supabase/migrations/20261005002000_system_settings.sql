-- System Settings table for cross-device persistence of CRM configuration (Telegram bot, integrations, school settings)

CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users with admin/owner/developer roles to read and write settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'system_settings' AND policyname = 'crm_roles_access_system_settings'
  ) THEN
    CREATE POLICY crm_roles_access_system_settings
      ON public.system_settings
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('owner', 'developer', 'admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('owner', 'developer', 'admin')
        )
      );
  END IF;
END;
$$;

-- Allow service_role full access (inherent in Supabase, but explicit for clarity)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'system_settings' AND policyname = 'service_role_full_access_system_settings'
  ) THEN
    CREATE POLICY service_role_full_access_system_settings
      ON public.system_settings
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END;
$$;

-- Seed default Telegram bot settings with @youeuropeservicebot
INSERT INTO public.system_settings (key, value, updated_at)
VALUES (
  'telegram_bot_settings',
  jsonb_build_object(
    'botUsername', 'youeuropeservicebot',
    'adminChatId', '184920491',
    'ownerChatId', '928374921',
    'webhookUrl', 'https://youeuropecrmtest.vercel.app/api/telegram/webhook',
    'notificationsEnabled', true,
    'status', 'connected',
    'updatedAt', NOW()
  ),
  NOW()
)
ON CONFLICT (key) DO UPDATE SET
  value = jsonb_set(
    public.system_settings.value,
    '{botUsername}',
    '"youeuropeservicebot"'::jsonb
  );
