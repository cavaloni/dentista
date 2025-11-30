-- Migration: Add country_code column to companies table
-- This enables automatic country code prepending for phone numbers during import

-- Add country_code column (storing with plus sign for E.164 compliance)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT '+31';

-- Add comment explaining the column
COMMENT ON COLUMN public.companies.country_code IS 'Country code in E.164 format (e.g., +31 for Netherlands, +1 for US). Used to prepend missing country codes when importing contacts.';
