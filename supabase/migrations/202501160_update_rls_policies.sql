-- Migration: Update RLS policies for multitenancy with company_id

-- Drop existing policies
DROP POLICY IF EXISTS "practice_select" ON public.practices;
DROP POLICY IF EXISTS "practice_update" ON public.practices;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "waitlist_select" ON public.waitlist_members;
DROP POLICY IF EXISTS "waitlist_change" ON public.waitlist_members;
DROP POLICY IF EXISTS "slots_select" ON public.slots;
DROP POLICY IF EXISTS "slots_change" ON public.slots;
DROP POLICY IF EXISTS "claims_select" ON public.claims;
DROP POLICY IF EXISTS "claims_change" ON public.claims;
DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_update" ON public.messages;
DROP POLICY IF EXISTS "webhooks_select" ON public.webhook_events;
DROP POLICY IF EXISTS "webhooks_insert" ON public.webhook_events;

-- New policies for companies table
CREATE POLICY "companies_select_own" ON public.companies
  FOR select USING (id = current_company_id());

CREATE POLICY "companies_update_own" ON public.companies
  FOR update USING (id = current_company_id());

-- Profiles policies (users can see their own profile)
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR select USING (user_id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR update USING (user_id = auth.uid());

-- Waitlist members policies
CREATE POLICY "waitlist_select" ON public.waitlist_members
  FOR select USING (company_id = current_company_id());

CREATE POLICY "waitlist_change" ON public.waitlist_members
  FOR all using (company_id = current_company_id())
  with check (company_id = current_company_id());

-- Slots policies
CREATE POLICY "slots_select" ON public.slots
  FOR select USING (company_id = current_company_id());

CREATE POLICY "slots_change" ON public.slots
  FOR all using (company_id = current_company_id())
  with check (company_id = current_company_id());

-- Claims policies
CREATE POLICY "claims_select" ON public.claims
  FOR select USING (company_id = current_company_id());

CREATE POLICY "claims_change" ON public.claims
  FOR all using (company_id = current_company_id())
  with check (company_id = current_company_id());

-- Messages policies
CREATE POLICY "messages_select" ON public.messages
  FOR select USING (company_id = current_company_id());

CREATE POLICY "messages_insert" ON public.messages
  FOR insert with check (company_id = current_company_id());

CREATE POLICY "messages_update" ON public.messages
  FOR update using (company_id = current_company_id());

-- Webhook events policies (allow null company_id for system webhooks)
CREATE POLICY "webhooks_select" ON public.webhook_events
  FOR select using (company_id is null or company_id = current_company_id());

CREATE POLICY "webhooks_insert" ON public.webhook_events
  FOR insert with check (company_id is null or company_id = current_company_id());

-- Ensure RLS is enabled and enforced on all tables
ALTER TABLE public.companies enable row level security;
ALTER TABLE public.companies force row level security;
ALTER TABLE public.practices enable row level security;
ALTER TABLE public.practices force row level security;
ALTER TABLE public.profiles enable row level security;
ALTER TABLE public.profiles force row level security;
ALTER TABLE public.waitlist_members enable row level security;
ALTER TABLE public.waitlist_members force row level security;
ALTER TABLE public.slots enable row level security;
ALTER TABLE public.slots force row level security;
ALTER TABLE public.claims enable row level security;
ALTER TABLE public.claims force row level security;
ALTER TABLE public.messages enable row level security;
ALTER TABLE public.messages force row level security;
ALTER TABLE public.webhook_events enable row level security;
ALTER TABLE public.webhook_events force row level security;