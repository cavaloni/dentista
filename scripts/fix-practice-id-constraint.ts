/**
 * Script to make practice_id nullable in all tables
 * This fixes the multitenancy migration by allowing practice_id to be optional
 * while company_id becomes the primary tenant identifier
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('Starting migration to make practice_id nullable...');

  const sql = `
    -- Remove NOT NULL constraint from practice_id columns
    ALTER TABLE public.profiles ALTER COLUMN practice_id DROP NOT NULL;
    ALTER TABLE public.waitlist_members ALTER COLUMN practice_id DROP NOT NULL;
    ALTER TABLE public.slots ALTER COLUMN practice_id DROP NOT NULL;
    ALTER TABLE public.claims ALTER COLUMN practice_id DROP NOT NULL;
    ALTER TABLE public.messages ALTER COLUMN practice_id DROP NOT NULL;
    ALTER TABLE public.webhook_events ALTER COLUMN practice_id DROP NOT NULL;
  `;

  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Migration failed:', error);
    
    // Try running each statement individually
    console.log('\nTrying individual statements...');
    const statements = [
      'ALTER TABLE public.profiles ALTER COLUMN practice_id DROP NOT NULL',
      'ALTER TABLE public.waitlist_members ALTER COLUMN practice_id DROP NOT NULL',
      'ALTER TABLE public.slots ALTER COLUMN practice_id DROP NOT NULL',
      'ALTER TABLE public.claims ALTER COLUMN practice_id DROP NOT NULL',
      'ALTER TABLE public.messages ALTER COLUMN practice_id DROP NOT NULL',
      'ALTER TABLE public.webhook_events ALTER COLUMN practice_id DROP NOT NULL',
    ];

    for (const statement of statements) {
      console.log(`Running: ${statement}`);
      const { error: stmtError } = await supabase.rpc('exec_sql', { sql_query: statement });
      if (stmtError) {
        console.error(`  ❌ Failed:`, stmtError.message);
      } else {
        console.log(`  ✅ Success`);
      }
    }
  } else {
    console.log('✅ Migration completed successfully!');
  }
}

runMigration().catch(console.error);
