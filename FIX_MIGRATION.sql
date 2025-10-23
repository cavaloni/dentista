-- ============================================================================
-- CRITICAL FIX: Make practice_id nullable for multitenancy
-- ============================================================================
-- 
-- PROBLEM: The multitenancy migration added company_id as the new primary
-- tenant identifier, but forgot to make practice_id nullable. This causes
-- INSERT errors when trying to add new records.
--
-- SOLUTION: Run this SQL in your Supabase SQL Editor to make practice_id
-- nullable in all tables.
--
-- HOW TO RUN:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Paste this entire file
-- 4. Click "Run"
-- ============================================================================

-- Remove NOT NULL constraint from practice_id columns
ALTER TABLE public.profiles ALTER COLUMN practice_id DROP NOT NULL;
ALTER TABLE public.waitlist_members ALTER COLUMN practice_id DROP NOT NULL;
ALTER TABLE public.slots ALTER COLUMN practice_id DROP NOT NULL;
ALTER TABLE public.claims ALTER COLUMN practice_id DROP NOT NULL;
ALTER TABLE public.messages ALTER COLUMN practice_id DROP NOT NULL;
ALTER TABLE public.webhook_events ALTER COLUMN practice_id DROP NOT NULL;

-- Verify the changes
SELECT 
  table_name,
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('practice_id', 'company_id')
  AND table_name IN ('profiles', 'waitlist_members', 'slots', 'claims', 'messages', 'webhook_events')
ORDER BY table_name, column_name;
