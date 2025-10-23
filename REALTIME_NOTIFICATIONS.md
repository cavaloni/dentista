# Secure Real-time Booking Notifications

## Overview

This implementation provides real-time booking notifications for a multi-tenant Next.js/Supabase application using a **notification queue pattern** to work around Supabase Realtime limitations with RLS and service role operations.

## Problem Statement

Traditional Supabase Realtime subscriptions don't work when:
- The webhook handler uses service role credentials (no `auth.uid()`)
- Tables have RLS policies enabled
- Updates from service role don't broadcast to authenticated frontend clients

## Solution: Notification Queue Pattern

### Architecture

```
┌─────────────────┐
│  WhatsApp API   │
└────────┬────────┘
         │ Webhook
         ▼
┌─────────────────────┐
│  Webhook Handler    │
│  (Service Role)     │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐     ┌────────────────────┐
│  Process Booking    │────▶│  Update Claims &   │
│  Accept Message     │     │  Slots (RLS)       │
└────────┬────────────┘     └────────────────────┘
         │
         │ Insert Notification
         ▼
┌──────────────────────────────┐
│  booking_notifications       │
│  (NO RLS - enables Realtime) │
│  - company_id                │
│  - claim_id                  │
│  - created_at                │
└────────┬─────────────────────┘
         │ Realtime Broadcast ✓
         ▼
┌─────────────────────┐
│  Frontend Listener  │
│  (Authenticated)    │
└────────┬────────────┘
         │ Query with RLS
         ▼
┌─────────────────────┐
│  Fetch Booking Data │
│  (RLS Protected)    │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Show Notification  │
│  Modal              │
└─────────────────────┘
```

## Security Model

### Key Principle: Reference IDs Only

1. **`booking_notifications` table has NO RLS**
   - Enables Realtime broadcasts from service role operations
   - Contains ONLY reference IDs (`company_id`, `claim_id`)
   - Contains NO sensitive patient or booking data

2. **Actual data queries are RLS-protected**
   - Frontend queries `claims`, `slots`, `waitlist_members` tables
   - These tables have RLS policies based on `company_id`
   - Users can only query their own company's data

3. **Multi-tenant security guaranteed**
   - Even if malicious user receives another company's notification
   - They cannot query that company's data due to RLS
   - Notification broadcast is harmless without queryable data

## Implementation Files

### 1. Database Migration
**File:** `supabase/migrations/20251017_add_booking_notifications.sql`

Creates:
- `booking_notifications` table with NO RLS
- Index on `(company_id, created_at)`
- Enables Realtime replication
- Optional cleanup function for old notifications

### 2. Backend (Webhook Handler)
**File:** `src/lib/messaging/inbound.ts`

**Changes:**
- After successful booking claim (status = 'won')
- After queuing confirmation message
- Insert notification record:
  ```typescript
  await supabase
    .from("booking_notifications")
    .insert({
      company_id: companyId,
      claim_id: claim.id,
    });
  ```

### 3. Frontend (Notification Listener)
**File:** `src/components/notifications/use-booking-listener.ts`

**Complete rewrite:**
- Subscribe to `booking_notifications` table (filtered by `company_id`)
- On INSERT event, extract `claim_id`
- Query RLS-protected tables to fetch booking details
- Dispatch `booking-accepted` custom event
- Existing notification UI picks up the event

## Setup Instructions

### 1. Apply Database Migration

```bash
# Start local Supabase (if not running)
npx supabase start

# Migration will be applied automatically on next start
# Or apply manually:
npx supabase db reset

# For production:
npx supabase db push
```

### 2. Regenerate TypeScript Types

```bash
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

This will resolve TypeScript errors in:
- `src/lib/messaging/inbound.ts`
- `src/components/notifications/use-booking-listener.ts`

### 3. Verify Realtime Configuration

Ensure Realtime is enabled for the `booking_notifications` table in Supabase Dashboard:
1. Go to Database → Replication
2. Verify `booking_notifications` is in the publication
3. The migration already adds it via: `ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_notifications;`

### 4. Test the Implementation

1. **Send a test booking via WhatsApp:**
   - Patient replies "YES" to booking invite
   - Webhook processes the message

2. **Check backend logs:**
   ```
   [processInboundMessage] Booking notification inserted successfully
   ```

3. **Check frontend logs:**
   ```
   [useBookingListener] Booking notification received: { claimId: "...", ... }
   [useBookingListener] Dispatching booking-accepted event: { patientName: "...", ... }
   ```

4. **Verify modal appears** with booking details

## Benefits

✅ **Real-time notifications** - No polling required  
✅ **Multi-tenant security** - RLS protects actual data  
✅ **Serverless compatible** - Works with Vercel Edge Functions  
✅ **Service role compatible** - Webhook can use service role  
✅ **Simple architecture** - Clear separation of concerns  
✅ **Audit trail** - Notification records can be retained for debugging  

## Optional: Notification Cleanup

The migration includes a cleanup function to delete old notifications (>24 hours).

**Schedule it with pg_cron:**

```sql
-- Run cleanup daily at 2 AM
SELECT cron.schedule(
  'cleanup-booking-notifications',
  '0 2 * * *',
  'SELECT public.cleanup_old_booking_notifications();'
);
```

Or call it manually:
```sql
SELECT public.cleanup_old_booking_notifications();
```

## Troubleshooting

### Notifications not appearing?

1. **Check Realtime connection:**
   - Open browser DevTools → Network
   - Look for WebSocket connection to Supabase Realtime
   - Should show `SUBSCRIBED` status

2. **Check frontend logs:**
   ```javascript
   [useBookingListener] Setting up notification subscription for company: xxx
   [useBookingListener] Subscription status: SUBSCRIBED
   ```

3. **Verify notification was inserted:**
   ```sql
   SELECT * FROM booking_notifications 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

4. **Check RLS policies:**
   ```sql
   -- Should return data for your company
   SELECT * FROM claims WHERE id = 'your-claim-id';
   ```

### TypeScript errors?

Run type generation:
```bash
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

### Realtime not working?

1. Verify publication includes table:
   ```sql
   SELECT * FROM pg_publication_tables 
   WHERE pubname = 'supabase_realtime';
   ```

2. Check table permissions:
   ```sql
   SELECT grantee, privilege_type 
   FROM information_schema.role_table_grants 
   WHERE table_name = 'booking_notifications';
   ```

## Future Enhancements

- [ ] Add notification type field (booking_accepted, booking_cancelled, etc.)
- [ ] Store notification read status
- [ ] Add pagination for notification history
- [ ] Implement notification preferences per user
- [ ] Add push notifications (via Firebase/OneSignal)
