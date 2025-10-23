-- Migration: Make practice_id nullable for backward compatibility
-- This allows the multitenancy migration to work properly by making practice_id optional
-- while company_id becomes the primary tenant identifier

-- Remove NOT NULL constraint from practice_id columns
ALTER TABLE public.profiles ALTER COLUMN practice_id DROP NOT NULL;
ALTER TABLE public.waitlist_members ALTER COLUMN practice_id DROP NOT NULL;
ALTER TABLE public.slots ALTER COLUMN practice_id DROP NOT NULL;
ALTER TABLE public.claims ALTER COLUMN practice_id DROP NOT NULL;
ALTER TABLE public.messages ALTER COLUMN practice_id DROP NOT NULL;
ALTER TABLE public.webhook_events ALTER COLUMN practice_id DROP NOT NULL;

-- Note: company_id is now the required field (set to NOT NULL in previous migration)
-- practice_id is kept for backward compatibility but is now optional
