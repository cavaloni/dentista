# Cancel Broadcast Feature

## Overview

Added the ability to cancel active broadcasts using the existing `cancelled` status.

## Status Flow

```
draft → open → claimed/booked/expired/cancelled
         ↓
      cancelled (manual stop)
```

## What Happens When You Cancel

1. **Broadcast status** → Set to `cancelled`
2. **Pending claims** → All set to `cancelled` status
3. **Won/Lost claims** → Unchanged (already processed)
4. **History preserved** → All data remains for audit trail
5. **No new responses** → Patients can't claim after cancellation

## Implementation

### New Server Action

**File**: `src/app/(protected)/broadcasts/actions.ts`

```typescript
export async function cancelBroadcastAction(
  broadcastId: string
): Promise<{ success: boolean; message: string }>
```

**What it does**:
- Validates broadcast is in `open` or `claimed` status
- Cancels all pending claims
- Updates broadcast status to `cancelled`
- Revalidates paths

### UI Integration

**File**: `src/components/broadcasts/broadcast-detail-modal.tsx`

**Cancel button appears when**:
- Broadcast status is `open` or `claimed`
- Shows in modal footer (orange button with stop icon)

**Confirmation prompt**:
> "Cancel this broadcast? All pending claims will be cancelled."

## Use Cases

### When to Cancel

- **Slot no longer available** - Doctor called in sick, emergency, etc.
- **Enough responses** - Got a booking, don't need more responses
- **Mistake** - Started broadcast by accident
- **Change of plans** - Appointment time changed

### When NOT to Cancel

- **Draft broadcasts** - Use "Delete" instead (hard delete)
- **Already booked** - Status is already `booked`, nothing to cancel
- **Already expired** - Natural expiration already occurred

## Status Meanings

| Status | Meaning | Can Cancel? |
|--------|---------|-------------|
| `draft` | Not started yet | No (use Delete) |
| `open` | Active, accepting responses | ✅ Yes |
| `claimed` | Someone claimed, not confirmed | ✅ Yes |
| `booked` | Confirmed booking | No |
| `expired` | Time ran out | No |
| `cancelled` | Manually stopped | Already cancelled |

## UI States

### Draft Broadcast
```
[+ Add Patients] [▶ Start]    [Delete] [Close]
```

### Active Broadcast (open/claimed)
```
                               [🛑 Cancel Broadcast] [Close]
```

### Cancelled/Completed Broadcast
```
                                                     [Close]
```

## Technical Details

### Database Changes
- **None required** - Uses existing `cancelled` status
- **Claims table** - Pending claims updated to `cancelled`
- **Slots table** - Status updated to `cancelled`

### Atomic Operation
The cancel action is atomic:
1. Cancel claims first
2. Then update broadcast status
3. If either fails, returns error

### Revalidation
After cancellation:
- `/broadcasts` page refreshed
- `/dashboard` page refreshed
- Modal data reloaded

## Testing

### Test Scenarios

1. **Cancel open broadcast**
   - Start a broadcast
   - Click "Cancel Broadcast"
   - Confirm
   - ✅ Status → `cancelled`
   - ✅ Pending claims → `cancelled`

2. **Cancel claimed broadcast**
   - Start broadcast
   - Patient claims slot
   - Click "Cancel Broadcast"
   - ✅ Status → `cancelled`
   - ✅ Pending claims → `cancelled`
   - ✅ Won claim → unchanged

3. **Try to cancel draft**
   - Create draft
   - ✅ No cancel button shown
   - ✅ Only "Delete" available

4. **Try to cancel completed**
   - View booked/expired broadcast
   - ✅ No cancel button shown

## Future Enhancements

### Optional Improvements

1. **Notification to patients**
   - Send "slot no longer available" message
   - Only to those with pending claims

2. **Cancel reason**
   - Add optional reason field
   - Store in broadcast notes or metadata

3. **Undo cancel**
   - Reopen cancelled broadcast
   - Restore pending claims
   - (Complex - may not be worth it)

4. **Partial cancel**
   - Cancel specific patients
   - Keep broadcast active for others
   - (Already possible via "Remove Patient")

## Summary

The cancel feature provides a clean way to stop active broadcasts while:
- ✅ Using existing database schema
- ✅ Preserving audit trail
- ✅ Preventing new responses
- ✅ Clear user intent (cancelled vs expired)
- ✅ Simple, atomic operation

No migration needed - ready to use immediately!
