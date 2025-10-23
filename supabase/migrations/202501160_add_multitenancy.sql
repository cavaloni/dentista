-- Migration: Add company_id columns and create companies table
-- This migration transforms the single-tenant architecture to multi-tenant

-- Create companies table (renamed from practices concept)
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'Europe/Amsterdam',
  claim_window_minutes integer not null default 10,
  recipients_per_wave integer not null default 5,
  default_duration_minutes integer not null default 30,
  resend_cooldown_minutes integer not null default 3,
  confirmation_template text not null default 'Hi {{name}}, your appointment at {{slot_start}} is confirmed.',
  taken_template text not null default 'Hi {{name}}, sorry — the slot at {{slot_start}} has been taken.',
  invite_template text not null default 'Hi {{name}}, we have a {{duration}} minute opening at {{slot_start}}. Reply YES within {{claim_window}} minutes to claim.',
  created_at timestamptz not null default timezone('Europe/Amsterdam', now()),
  updated_at timestamptz not null default timezone('Europe/Amsterdam', now()),
  enable_browser_notifications boolean not null default true,
  enable_sound_notifications boolean not null default true,
  auto_confirm_bookings boolean not null default false
);

-- Add company_id columns to all tables (replacing practice_id)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.waitlist_members ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.slots ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

-- Create indexes for company_id columns
CREATE INDEX IF NOT EXISTS profiles_company_idx ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS waitlist_members_company_active_priority_idx ON public.waitlist_members(company_id, active, priority desc, created_at asc);
CREATE INDEX IF NOT EXISTS slots_company_status_idx ON public.slots(company_id, status, expires_at);
CREATE INDEX IF NOT EXISTS claims_company_idx ON public.claims(company_id);
CREATE INDEX IF NOT EXISTS messages_company_created_idx ON public.messages(company_id, created_at desc);
CREATE INDEX IF NOT EXISTS webhooks_company_idx ON public.webhook_events(company_id);

-- Backfill: migrate existing practices to companies
INSERT INTO public.companies (name, timezone, claim_window_minutes, recipients_per_wave, default_duration_minutes, resend_cooldown_minutes, confirmation_template, taken_template, invite_template, enable_browser_notifications, enable_sound_notifications, auto_confirm_bookings)
SELECT
  name,
  timezone,
  claim_window_minutes,
  recipients_per_wave,
  default_duration_minutes,
  resend_cooldown_minutes,
  confirmation_template,
  taken_template,
  invite_template,
  enable_browser_notifications,
  enable_sound_notifications,
  auto_confirm_bookings
FROM public.practices
ON CONFLICT DO NOTHING;

-- Update foreign key references to use new company_id
UPDATE public.profiles SET company_id = practice_id WHERE company_id IS NULL AND practice_id IS NOT NULL;
UPDATE public.waitlist_members SET company_id = practice_id WHERE company_id IS NULL AND practice_id IS NOT NULL;
UPDATE public.slots SET company_id = practice_id WHERE company_id IS NULL AND practice_id IS NOT NULL;
UPDATE public.claims SET company_id = practice_id WHERE company_id IS NULL AND practice_id IS NOT NULL;
UPDATE public.messages SET company_id = practice_id WHERE company_id IS NULL AND practice_id IS NOT NULL;
UPDATE public.webhook_events SET company_id = practice_id WHERE company_id IS NULL AND practice_id IS NOT NULL;

-- Add NOT NULL constraints after backfill
ALTER TABLE public.profiles ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.waitlist_members ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.slots ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.claims ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.messages ALTER COLUMN company_id SET NOT NULL;

-- Create new function to get company_id from user context
CREATE OR REPLACE FUNCTION public.current_company_id()
returns uuid
security definer
set search_path = public
language sql stable
as $$
  select c.company_id
  from public.profiles c
  where c.user_id = auth.uid();
$$;

grant execute on function public.current_company_id() to authenticated;

-- Add company environment variable function for service role operations
CREATE OR REPLACE FUNCTION public.get_company_by_slug(_slug text)
returns uuid
security definer
set search_path = public
language sql stable
as $$
  select id from public.companies where slug = _slug;
$$;

grant execute on function public.get_company_by_slug(text) to service_role;