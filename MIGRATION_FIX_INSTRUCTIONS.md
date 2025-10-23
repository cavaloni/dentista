# Migration Fix Instructions

## Problem

You're getting this error when trying to add waitlist members:

```
Unable to add member: null value in column "practice_id" of relation "waitlist_members" violates not-null constraint
```

## Root Cause

The multitenancy migration added `company_id` as the new primary tenant identifier and set it to NOT NULL. However, it **forgot to make `practice_id` nullable**. 

Your code is now correctly using `company_id`, but the database still requires `practice_id` to be non-null, causing the insert to fail.

## Solution

You need to run a SQL migration to make `practice_id` nullable in all tables.

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://stupuershvlizyxullha.supabase.co
2. Navigate to **SQL Editor** (in the left sidebar)
3. Click **New Query**
4. Copy and paste the contents of `FIX_MIGRATION.sql` (in this directory)
5. Click **Run** or press `Ctrl+Enter`
6. You should see a success message and a table showing all columns are now nullable

### Option 2: Using Supabase CLI

If you have the Supabase CLI linked to your project:

```bash
npx supabase db push
```

This will apply the migration file: `supabase/migrations/202501171_make_practice_id_nullable.sql`

## Verification

After running the migration, try adding a waitlist member again. The error should be gone.

You can also verify the schema by running this query in the SQL Editor:

```sql
SELECT 
  table_name,
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('practice_id', 'company_id')
  AND table_name = 'waitlist_members';
```

Expected result:
- `practice_id`: `is_nullable = YES`
- `company_id`: `is_nullable = NO`

## What This Changes

- ✅ `practice_id` becomes nullable (optional) in all tables
- ✅ `company_id` remains NOT NULL (required) in all tables
- ✅ New records can be inserted with only `company_id`
- ✅ Old records with `practice_id` continue to work
- ✅ Full backward compatibility maintained

## Files Created

1. **FIX_MIGRATION.sql** - SQL to run in Supabase Dashboard
2. **supabase/migrations/202501171_make_practice_id_nullable.sql** - Migration file for CLI
3. **This file** - Instructions

## Next Steps

After running the migration:
1. Try adding a waitlist member - it should work now
2. Check the browser console - you should see no errors
3. The error message will no longer appear
