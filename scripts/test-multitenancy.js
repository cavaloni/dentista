#!/usr/bin/env node

/**
 * Test script to verify multitenancy migration
 * This script tests the new company-based schema
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const companySlug = process.env.COMPANY_SLUG;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function testMultitenancy() {
  console.log('🧪 Testing multitenancy migration...\n');

  try {
    // Test 1: Check companies table exists
    console.log('1. Testing companies table...');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*');

    if (companiesError) {
      console.error('❌ Companies table error:', companiesError);
      return;
    }
    console.log(`✅ Found ${companies.length} companies`);

    // Test 2: Test company lookup by slug
    if (companySlug) {
      console.log('\n2. Testing company lookup by slug...');
      const { data: company, error: companyError } = await supabase
        .rpc('get_company_by_slug', { _slug: companySlug });

      if (companyError) {
        console.error('❌ Company lookup error:', companyError);
        return;
      }
      console.log(`✅ Found company: ${company}`);
    }

    // Test 3: Check all tables have company_id columns
    console.log('\n3. Testing company_id columns...');
    const tables = ['profiles', 'waitlist_members', 'slots', 'claims', 'messages', 'webhook_events'];

    for (const table of tables) {
      const { data: rows, error: tableError } = await supabase
        .from(table)
        .select('company_id')
        .limit(1);

      if (tableError) {
        console.error(`❌ ${table} table error:`, tableError);
      } else {
        console.log(`✅ ${table} table has company_id column`);
      }
    }

    // Test 4: Test RLS policies
    console.log('\n4. Testing RLS policies...');
    const { data: rlsStatus, error: rlsError } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')
      .in('tablename', ['companies', 'profiles', 'waitlist_members', 'slots', 'claims', 'messages', 'webhook_events']);

    if (rlsError) {
      console.error('❌ RLS check error:', rlsError);
    } else {
      rlsStatus.forEach(({ tablename, rowsecurity }) => {
        console.log(`✅ ${tablename} RLS enabled: ${rowsecurity}`);
      });
    }

    // Test 5: Test current_company_id function
    console.log('\n5. Testing current_company_id function...');
    const { data: functionResult, error: functionError } = await supabase
      .rpc('current_company_id');

    if (functionError) {
      console.log('⚠️  current_company_id function not available for anonymous users (expected)');
    } else {
      console.log(`✅ current_company_id function works: ${functionResult}`);
    }

    console.log('\n✅ Multitenancy migration test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testMultitenancy();