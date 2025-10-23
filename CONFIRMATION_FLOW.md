# Manual Booking Confirmation Flow

## Problem Solved

Previously, when a patient replied "YES" to a booking invitation via WhatsApp, the confirmation message was sent **immediately and automatically**. This meant:
- ❌ No opportunity for staff to review the booking
- ❌ Confirmation sent even if user clicked "Cancel" in modal
- ❌ No manual approval step

## New Flow

### 1. Patient Replies "YES"
**Backend:** `src/lib/messaging/inbound.ts`
- ✅ Claim status updated to `'won'`
- ✅ Slot status updated to `'claimed'` (not `'booked'` yet!)
- ✅ Notification inserted into `booking_notifications` table
- ⏸️ **NO confirmation message sent yet**

### 2. Modal Appears
**Frontend:** `src/components/notifications/`
- ✅ Real-time notification triggers modal
- ✅ Shows patient name, appointment time, duration
- ✅ Two buttons: "Go to Next Person" | "Confirm Booking"

### 3. User Clicks "Confirm Booking"
**API:** `POST /api/bookings/confirm`
- ✅ Sends confirmation message to patient
- ✅ Updates slot status to `'booked'`
- ✅ Sends "taken" messages to other claimants
- ✅ Logs: `confirmed_by_user: true`
- ✅ Revalidates dashboard cache
- ✅ Triggers router refresh on frontend

**Result:**
- Slot removed from "Active broadcasts" (status changed to 'booked')
- Confirmation message appears in "Recent activity"
- No page refresh required!

### 4. User Clicks "Go to Next Person"
**API:** `POST /api/bookings/reject`
- ✅ Updates claim status to `'cancelled'`
- ✅ Sends "taken" message to rejected patient
- ✅ Revalidates dashboard cache
- ✅ Triggers router refresh on frontend
- ✅ TODO: Move to next person in waitlist

**Result:**
- Slot status updated in "Active broadcasts"
- Rejection message appears in "Recent activity"
- No page refresh required!

## Architecture

```
WhatsApp: Patient replies "YES"
         ↓
Webhook Handler (inbound.ts)
         ↓
   Claim status = 'won'
   Slot status = 'claimed'  ← NOT 'booked' yet!
         ↓
Insert booking_notification
         ↓
Realtime Broadcast
         ↓
Frontend Modal Appears
         ↓
    User Decision
    /           \
Confirm       Reject
   ↓             ↓
POST /api/    POST /api/
bookings/     bookings/
confirm       reject
   ↓             ↓
Send          Send
confirmation  "taken"
message       message
   ↓             ↓
Slot =        Claim =
'booked'      'cancelled'
```

## Files Modified

### Backend
1. **`src/lib/messaging/inbound.ts`** (lines 158-185)
   - Removed immediate confirmation message sending
   - Changed slot status to `'claimed'` instead of `'booked'`
   - Added comment explaining new flow

2. **`src/app/api/bookings/confirm/route.ts`** ✨ NEW
   - Handles booking confirmation after user approval
   - Sends confirmation message to patient
   - Sends "taken" messages to others
   - Updates slot to `'booked'`

3. **`src/app/api/bookings/reject/route.ts`** ✨ NEW
   - Handles booking rejection
   - Sends "taken" message to rejected patient
   - Updates claim to `'cancelled'`

### Frontend
4. **`src/components/notifications/notification-context.tsx`** (lines 114-184)
   - `confirmBooking()` now calls `/api/bookings/confirm`
   - `rejectBooking()` now calls `/api/bookings/reject`
   - Both are async with error handling
   - Calls `router.refresh()` to update dashboard without full page reload

## Status Transitions

### Slot Status
```
'open' → 'claimed' → 'booked'
          ↑            ↑
    Patient says   User confirms
        YES        in modal
```

### Claim Status
```
'pending' → 'won' → (stays 'won' if confirmed)
             ↓
        'cancelled' (if rejected)
```

## Testing Instructions

### 1. Send Test Booking
```
1. Patient replies "YES" to booking invitation
2. Check backend logs:
   [processInboundMessage] Claim won! Waiting for user confirmation in modal...
   [processInboundMessage] Booking notification inserted successfully
```

### 2. Verify Modal Appears
```
1. Modal should appear in browser
2. Shows patient details
3. Two buttons visible
```

### 3. Test Confirmation
```
1. Click "Confirm Booking"
2. Check browser console:
   [NotificationContext] Confirming booking: xxx
   [NotificationContext] Booking confirmed successfully
3. Check backend logs:
   [Confirm Booking] Sending confirmation message to: [Patient Name]
   [Confirm Booking] Booking confirmed successfully
4. Verify patient receives confirmation message
5. Verify other claimants receive "taken" message
```

### 4. Test Rejection
```
1. Click "Go to Next Person"
2. Check browser console:
   [NotificationContext] Rejecting booking: xxx
   [NotificationContext] Booking rejected successfully
3. Check backend logs:
   [Reject Booking] Sending rejection message to: [Patient Name]
   [Reject Booking] Booking rejected successfully
4. Verify patient receives "taken" message
```

## Database Queries for Testing

### Check Slot Status
```sql
SELECT id, status, start_at, claimed_at
FROM slots
WHERE id = 'your-slot-id';
```

### Check Claim Status
```sql
SELECT id, status, slot_id, waitlist_member_id
FROM claims
WHERE id = 'your-claim-id';
```

### Check Messages Sent
```sql
SELECT 
  template_key,
  status,
  metadata,
  created_at,
  waitlist_members.full_name
FROM messages
LEFT JOIN waitlist_members ON messages.waitlist_member_id = waitlist_members.id
WHERE slot_id = 'your-slot-id'
ORDER BY created_at DESC;
```

## Security

✅ **Authentication Required**
- Both endpoints verify user is authenticated
- User must belong to the company that owns the claim

✅ **Authorization Checks**
- Endpoints verify `company_id` matches user's company
- RLS policies protect data access

✅ **Idempotency**
- Messages use idempotency keys
- Prevents duplicate sends

## Future Enhancements

- [ ] Add "Move to Next Person" functionality in reject endpoint
- [ ] Show success/error toasts to user
- [ ] Add loading states to buttons
- [ ] Add confirmation dialog for rejection
- [ ] Track who confirmed/rejected in database
- [ ] Add undo functionality (within time window)
- [ ] Send notification to staff when booking confirmed

## Benefits

✅ **Manual Control** - Staff reviews before confirming  
✅ **No False Confirmations** - Cancel doesn't send messages  
✅ **Audit Trail** - Logs show user confirmation  
✅ **Flexible** - Can reject and move to next person  
✅ **Secure** - Authenticated and authorized  

---

**Implementation Date:** October 17, 2025  
**Status:** ✅ Complete - Ready for Testing  
**Breaking Change:** Yes - Changes booking confirmation flow
