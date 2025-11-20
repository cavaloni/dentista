# Duplicate Broadcast Feature ✅

## Overview

The duplicate feature allows you to create a new draft broadcast based on any existing broadcast, copying all patient assignments and settings.

## Use Cases

### 1. Restart Cancelled Broadcast
- Cancelled a broadcast by mistake
- Slot became available again
- Want to notify the same patients

### 2. Repeat Successful Pattern
- Had a successful broadcast
- Want to send to same group at different time
- Reuse proven patient list

### 3. Template Functionality
- Create "template" broadcasts
- Duplicate and modify for different times
- Consistent patient groups

### 4. Time-Shifted Broadcasts
- Weekly recurring broadcasts
- Same patients, different times
- Maintain patient groups over time

## How It Works

### User Flow

```
1. Open any broadcast (draft/active/cancelled/completed)
2. Click "Duplicate" button in modal footer
3. Confirm: "Duplicate this broadcast with X patient(s)?"
4. New draft created with:
   ✅ Same patient assignments
   ✅ Same duration
   ✅ Same notes
   ✅ Same claim window
   ✅ Start time set to tomorrow (placeholder)
5. Modal closes, new draft appears in list
6. User can:
   - Modify start time
   - Add/remove patients
   - Edit settings
   - Start when ready
```

### What Gets Copied

| Field | Copied? | Notes |
|-------|---------|-------|
| **Patients** | ✅ Yes | All active assignments |
| **Duration** | ✅ Yes | Same duration_minutes |
| **Notes** | ✅ Yes | Same notes text |
| **Claim Window** | ✅ Yes | Same claim_window_minutes |
| **Start Time** | ⚠️ Placeholder | Set to tomorrow, user updates |
| **Status** | ❌ No | Always creates as `draft` |
| **Claims** | ❌ No | Fresh start, no claims |
| **History** | ❌ No | New independent broadcast |

## Implementation

### Server Action

**File**: `src/app/(protected)/broadcasts/actions.ts`

```typescript
export async function duplicateBroadcastAction(
  sourceBroadcastId: string
): Promise<BroadcastActionState>
```

**Process:**
1. Fetch source broadcast details
2. Fetch assigned patients (active assignments only)
3. Create new draft broadcast
4. Copy patient assignments
5. Return success with new broadcast

### UI Integration

**File**: `src/components/broadcasts/broadcast-detail-modal.tsx`

**Button Location:**
- Modal footer, left side (before Delete/Cancel/Close)
- Always visible (works for any broadcast)

**Button Style:**
- Border style (not filled)
- Copy icon
- "Duplicate" label

**Confirmation:**
> "Duplicate this broadcast with X patient(s)?"

**Success Message:**
> "Broadcast duplicated with X patient(s). Update the start time and click Start when ready."

## UI States

### Button Placement

```
[Duplicate] [Delete/Cancel] [Close]
```

The Duplicate button appears for ALL broadcast statuses:
- ✅ Draft
- ✅ Open
- ✅ Claimed
- ✅ Booked
- ✅ Expired
- ✅ Cancelled

## Technical Details

### Patient Assignment Logic

```typescript
// Only copies ACTIVE assignments (removed_at IS NULL)
const { data: sourceAssignments } = await service
  .from("broadcast_assignments")
  .select("waitlist_member_id")
  .eq("slot_id", sourceBroadcastId)
  .is("removed_at", null);
```

**Why this matters:**
- Removed patients are NOT copied
- Only current patient list is duplicated
- Clean slate for new broadcast

### Start Time Handling

```typescript
// Set to tomorrow as placeholder
const draftStartTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
```

**Rationale:**
- Can't use past time (validation would fail)
- Can't guess user's intended time
- Tomorrow is safe default
- User MUST update before starting

## Edge Cases

### 1. Duplicate Empty Broadcast
- ✅ Allowed
- Creates draft with 0 patients
- User can add patients later

### 2. Duplicate Cancelled Broadcast
- ✅ Allowed
- Perfect for "restart" use case
- Gets fresh start with same patients

### 3. Duplicate Active Broadcast
- ✅ Allowed
- Useful for recurring broadcasts
- Original continues running

### 4. Patients No Longer Exist
- ⚠️ Handled gracefully
- Foreign key constraint prevents invalid assignments
- Only valid patients are copied

### 5. Duplicate Multiple Times
- ✅ Allowed
- Each duplicate is independent
- No limit on duplications

## Testing Checklist

- [ ] Duplicate draft broadcast
- [ ] Duplicate active broadcast
- [ ] Duplicate cancelled broadcast
- [ ] Duplicate completed broadcast
- [ ] Duplicate with 0 patients
- [ ] Duplicate with many patients
- [ ] Verify patient assignments copied
- [ ] Verify settings copied
- [ ] Verify new broadcast is draft
- [ ] Verify start time is tomorrow
- [ ] Verify original unchanged
- [ ] Test error handling

## Summary

The duplicate feature provides:
- ✅ **Flexibility** - Works for any broadcast
- ✅ **Simplicity** - One click to copy
- ✅ **Safety** - Creates draft, not active
- ✅ **Control** - User can modify before starting
- ✅ **Clean** - Independent broadcasts
- ✅ **Fast** - Instant duplication

Perfect for:
- Restarting cancelled broadcasts
- Recurring patient groups
- Template-based workflows
- Time-shifted broadcasts

No migration required - ready to use immediately!
