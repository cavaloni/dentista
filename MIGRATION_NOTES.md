# Broadcasts V2 Migration Notes

## Current Status: Core Implementation Complete ✅

### What's Been Built

#### 1. Database Layer
- ✅ Migration file: `supabase/migrations/20241114_broadcasts_v2.sql`
  - New `broadcast_assignments` table for explicit patient-to-broadcast mapping
  - Added `draft` status to `slot_status` enum
  - RLS policies for multi-tenant security
  - Helper function `get_patient_active_assignment()`
  - Indexes for performance

#### 2. Backend (Server Actions)
- ✅ File: `src/app/(protected)/broadcasts/actions.ts`
  - `createBroadcastAction` - Create draft broadcasts
  - `getAllBroadcastsAction` - List all broadcasts with counts
  - `getBroadcastDetailAction` - Get broadcast with assigned patients
  - `assignPatientsToBroadcastAction` - Assign patients to broadcast
  - `removePatientFromBroadcastAction` - Remove patient (soft delete)
  - `startBroadcastAction` - Start broadcast and send invites
  - `deleteBroadcastAction` - Delete draft broadcasts

#### 3. Types & Schemas
- ✅ File: `src/app/(protected)/waitlist/shared.ts`
  - Updated `WaitlistMember` with `current_assignment` field
  - New `Broadcast`, `BroadcastAssignment`, `BroadcastPatient`, `BroadcastDetail` types
  - New `BroadcastActionState` for form handling

#### 4. UI Components
- ✅ Page: `src/app/(protected)/broadcasts/page.tsx`
- ✅ Components:
  - `create-broadcast-form.tsx` - Form to create draft broadcasts
  - `broadcast-list.tsx` - Lists draft/active/completed broadcasts
  - `broadcast-card.tsx` - Individual broadcast card
  - `broadcast-detail-modal.tsx` - Modal showing broadcast details & patients

### What's Still TODO

#### 5. Waitlist Page Updates (Not Started)
- Update `getAllMembersAction` to include assignment info
- Show assignment status in patient list
- Add "View Broadcast" link for assigned patients
- Update search/filter to handle assignments

#### 6. Patient Assignment UI (Not Started)
- "Add Patients" modal for broadcasts
- Patient search within assignment flow
- Bulk assignment actions
- Remove patient from broadcast UI

#### 7. Broadcast Actions UI (Not Started)
- "Start Broadcast" button with confirmation
- "Delete Draft" button
- "Send Next Wave" for active broadcasts
- "Cancel Broadcast" functionality

#### 8. Store Updates (Not Started)
- Remove active/inactive filtering from `waitlist.ts`
- Add broadcast-specific store if needed
- Update selectors to work without `active` field

---

## How to Continue

### Step 1: Apply Database Migration

**Option A: Supabase CLI (Recommended)**
```bash
cd /var/home/cavaloni/work/whatscal
supabase db push
```

**Option B: Manual (via Supabase Dashboard)**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy contents of `supabase/migrations/20241114_broadcasts_v2.sql`
4. Execute the SQL

### Step 2: Regenerate TypeScript Types

This will fix ALL the TypeScript errors you're seeing:

```bash
# For local development:
supabase gen types typescript --local > src/lib/supabase/types.ts

# For remote/production:
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/types.ts
```

### Step 3: Test Basic Functionality

After types are regenerated, the app should compile. Test:
1. Navigate to `/broadcasts` page
2. Create a draft broadcast
3. View the broadcast list

### Step 4: Complete Remaining Features

Work through the TODO items above. Suggested order:
1. Patient assignment modal (highest priority - core workflow)
2. Start/delete broadcast actions
3. Waitlist page updates to show assignments
4. Store cleanup

---

## Known Issues & Expected Behavior

### TypeScript Errors (Will Auto-Resolve)
All current TS errors in `broadcasts/actions.ts` are due to:
- Missing `broadcast_assignments` table in generated types
- Missing `draft` status in `slot_status` enum
- **These will disappear after regenerating types**

### Migration Safety
- The `active` column on `waitlist_members` is **NOT** being dropped
- This allows gradual migration and easy rollback
- Old code continues to work during transition
- Once V2 is stable, run a follow-up migration to remove it

### Backward Compatibility
- Existing `releaseSlotAction` in `dashboard/actions.ts` still works
- It uses the old flow (auto-assigns active patients)
- Can coexist with new broadcast flow
- Eventually deprecate once V2 is fully adopted

---

## Testing Checklist

### After Migration Applied
- [ ] App compiles without TypeScript errors
- [ ] Can navigate to `/broadcasts` page
- [ ] Can create a draft broadcast
- [ ] Draft appears in broadcast list
- [ ] Can click broadcast to view details

### After Patient Assignment UI Built
- [ ] Can open "Add Patients" modal
- [ ] Can search for patients
- [ ] Can assign patients to broadcast
- [ ] Assigned patients appear in broadcast detail
- [ ] Can remove patient from broadcast

### After Start Broadcast Built
- [ ] Can start a draft broadcast
- [ ] Invites are sent to assigned patients only
- [ ] Broadcast status changes to "open"
- [ ] Claims are created correctly
- [ ] Messages appear in dashboard activity

### After Waitlist Updates
- [ ] Waitlist page shows patient assignments
- [ ] Can see which broadcast a patient is assigned to
- [ ] Can navigate from patient to broadcast
- [ ] Search/filter works with assignments

---

## Architecture Notes

### Why This Design?

**Explicit Assignment Model:**
- More intuitive than active/inactive boolean
- Users see exactly who will be notified
- Prevents accidental broadcasts to wrong people
- Allows same patient in multiple future broadcasts

**Draft Status:**
- Prevents premature sending
- Allows building broadcast before starting
- Clear workflow: Create → Assign → Start

**Soft Deletes:**
- `removed_at` timestamp instead of hard delete
- Maintains audit trail
- Can analyze assignment history

### Database Schema

```
broadcast_assignments
├── id (uuid, PK)
├── company_id (uuid, FK → companies)
├── slot_id (uuid, FK → slots)
├── waitlist_member_id (uuid, FK → waitlist_members)
├── assigned_at (timestamptz)
├── assigned_by (uuid, FK → auth.users)
├── removed_at (timestamptz, nullable)
└── UNIQUE(slot_id, waitlist_member_id)
```

### Key Relationships
- One broadcast (slot) → Many assignments
- One patient → Many assignments (different broadcasts)
- Assignment removed_at = NULL means currently assigned

---

## Questions or Issues?

If you encounter problems:
1. Check that migration applied successfully
2. Verify types were regenerated
3. Check browser console for runtime errors
4. Review RLS policies if permission errors occur
