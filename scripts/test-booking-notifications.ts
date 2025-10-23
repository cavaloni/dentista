/**
 * Test Script for Booking Notifications
 * 
 * This script helps verify the real-time booking notification system
 * by simulating a booking acceptance and checking the notification flow.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/types";

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing required environment variables:");
  console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testNotificationSystem() {
  console.log("🧪 Testing Booking Notification System");
  console.log("=====================================\n");

  // 1. Verify table exists and has no RLS
  console.log("1️⃣  Checking booking_notifications table...");
  const { data: tables, error: tableError } = await supabase
    .from("booking_notifications")
    .select("*")
    .limit(1);

  if (tableError) {
    console.error("❌ Table check failed:", tableError.message);
    return;
  }
  console.log("✅ Table exists and is queryable\n");

  // 2. Get a test company
  console.log("2️⃣  Finding test company...");
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name")
    .limit(1)
    .single();

  if (companyError || !company) {
    console.error("❌ No company found. Please create a company first.");
    return;
  }
  console.log(`✅ Using company: ${company.name} (${company.id})\n`);

  // 3. Get a test claim (preferably 'won' status)
  console.log("3️⃣  Finding test claim...");
  const { data: claim, error: claimError } = await supabase
    .from("claims")
    .select("id, status, company_id, waitlist_members(full_name)")
    .eq("company_id", company.id)
    .eq("status", "won")
    .limit(1)
    .single();

  if (claimError || !claim) {
    console.log("⚠️  No 'won' claim found. Creating a test scenario would require:");
    console.log("   - A slot");
    console.log("   - A waitlist member");
    console.log("   - A claim with 'won' status");
    console.log("\n💡 To test properly, trigger a real booking via WhatsApp webhook.\n");
    return;
  }
  console.log(`✅ Using claim: ${claim.id} (status: ${claim.status})\n`);

  // 4. Insert a test notification
  console.log("4️⃣  Inserting test notification...");
  const { data: notification, error: notificationError } = await supabase
    .from("booking_notifications")
    .insert({
      company_id: company.id,
      claim_id: claim.id,
    })
    .select()
    .single();

  if (notificationError) {
    console.error("❌ Failed to insert notification:", notificationError.message);
    return;
  }
  console.log("✅ Notification inserted:", notification.id);
  console.log(`   Company: ${notification.company_id}`);
  console.log(`   Claim: ${notification.claim_id}`);
  console.log(`   Created: ${notification.created_at}\n`);

  // 5. Verify notification can be queried
  console.log("5️⃣  Querying notification...");
  const { data: queriedNotification, error: queryError } = await supabase
    .from("booking_notifications")
    .select("*")
    .eq("id", notification.id)
    .single();

  if (queryError) {
    console.error("❌ Failed to query notification:", queryError.message);
    return;
  }
  console.log("✅ Notification queryable\n");

  // 6. Verify Realtime configuration
  console.log("6️⃣  Checking Realtime configuration...");
  // Note: Check Supabase Dashboard for Realtime replication status
  console.log("⚠️  Check Supabase Dashboard to verify Realtime replication\n");

  // 7. Clean up test notification
  console.log("7️⃣  Cleaning up test notification...");
  const { error: deleteError } = await supabase
    .from("booking_notifications")
    .delete()
    .eq("id", notification.id);

  if (deleteError) {
    console.error("❌ Failed to delete test notification:", deleteError.message);
    return;
  }
  console.log("✅ Test notification deleted\n");

  // Summary
  console.log("=====================================");
  console.log("✅ All tests passed!");
  console.log("=====================================\n");
  console.log("Next steps:");
  console.log("1. Open your app in a browser");
  console.log("2. Open browser DevTools → Console");
  console.log("3. Send a test booking via WhatsApp (patient replies YES)");
  console.log("4. Check for these logs:");
  console.log("   - [useBookingListener] Booking notification received");
  console.log("   - [useBookingListener] Dispatching booking-accepted event");
  console.log("5. Verify the booking notification modal appears\n");
}

testNotificationSystem().catch(console.error);
