# Waitlist Infinite Loop Fix

## Problem
The waitlist page was experiencing an infinite loop causing:
- React error: "Maximum update depth exceeded"
- Console warning: "The result of getServerSnapshot should be cached to avoid an infinite loop"
- Constant re-renders
- Poor performance and browser crashes

## Root Cause

### Initial Issue (Fixed Previously)
The first issue was caused by `revalidatePath("/waitlist")` being called in the `toggleMemberAction` and `deleteMemberAction` server actions. This caused Next.js to:
1. Revalidate the page data
2. Re-render the page component
3. Trigger another form submission somehow
4. Loop infinitely

### Current Issue (Fixed Now)
After fixing the revalidatePath issue, a **second infinite loop** was discovered caused by **uncached Zustand selectors** in `WaitlistClient`:

The problem occurred because:
1. Selector functions were created inline: `useWaitlistStore((state) => state.members)`
2. Each render created a **new function reference**
3. Zustand's internal `useSyncExternalStore` detected the reference change
4. This triggered a re-render
5. Loop repeated infinitely

React's `useSyncExternalStore` requires that selector functions return **stable references** or the selector itself must be a stable reference to prevent infinite loops.

## Solution

### Part 1: Event-Driven Refresh Pattern (Previous Fix)

#### 1. Removed `revalidatePath` from Actions
- Removed `revalidatePath("/waitlist")` from `toggleMemberAction`
- Removed `revalidatePath("/waitlist")` from `deleteMemberAction`
- Kept `revalidatePath` in `createMemberAction` and `updateMemberAction` (these don't cause loops)

#### 2. Added Custom Event System
Created a `waitlist-updated` custom event that components dispatch when data changes:

```typescript
window.dispatchEvent(new Event('waitlist-updated'));
```

#### 3. Updated Components
- `WaitlistClient`: Added event listener for `waitlist-updated` events
- `MemberRow`: Wrapped form actions to dispatch events after completion
- `AddMemberForm`: Dispatches events on successful form submission

### Part 2: Stable Selector Functions (Current Fix)

#### Problem with Inline Selectors
```typescript
// ❌ BAD: Creates new function reference on every render
const storeMembers = useWaitlistStore((state) => state.members);
const needsSync = useWaitlistStore((state) => state.needsSync);
```

#### Solution: Define Selectors Outside Component
```typescript
// ✅ GOOD: Stable function references
const selectStoreMembers = (state) => state.members;
const selectNeedsSync = (state) => state.needsSync;
const selectSetMembers = (state) => state.setMembers;
const selectClearNeedsSync = (state) => state.clearNeedsSync;

export function WaitlistClient({ members }) {
  const storeMembers = useWaitlistStore(selectStoreMembers);
  const needsSync = useWaitlistStore(selectNeedsSync);
  const setMembers = useWaitlistStore(selectSetMembers);
  const clearNeedsSync = useWaitlistStore(selectClearNeedsSync);
  // ...
}
```

**Why this works:**
- Selector functions are defined **once** outside the component
- Same function reference is used on every render
- `useSyncExternalStore` doesn't detect false changes
- No infinite re-render loop

## How It Works

1. **User clicks Activate/Deactivate or Remove**
2. **Server action executes** (updates database)
3. **Custom event is dispatched** (`waitlist-updated`)
4. **WaitlistClient hears the event**
5. **Router refresh is triggered** (fetches fresh data once)
6. **UI updates** with new data
7. **No infinite loop** because refresh is controlled and selectors are stable

## Benefits

✅ **No Infinite Loops**: Controlled refresh mechanism + stable selectors  
✅ **Better Performance**: Only refreshes when needed  
✅ **Proper UI Updates**: Active/deactivated lists update correctly  
✅ **Debounced**: Refresh timeout prevents duplicate refreshes  
✅ **Type Safe**: All TypeScript types maintained  

## Testing

- ✅ Activate/Deactivate buttons work correctly
- ✅ Patients move between Active/Deactivated sections
- ✅ No infinite POST requests
- ✅ No infinite re-renders
- ✅ Search still works properly
- ✅ Add new patient works
- ✅ Delete patient works
- ✅ Edit patient works

## Technical Details

### Event Flow
```
User Action → Server Action → Database Update → 
Custom Event → Event Listener → router.refresh() → 
Fresh Data Fetch → UI Re-render (with stable selectors)
```

### Key Files Modified
- `src/components/waitlist/waitlist-client.tsx` - Added stable selectors
- `src/components/waitlist/member-row.tsx` - Event dispatching
- `src/components/waitlist/add-member-form.tsx` - Event dispatching
- `src/app/(protected)/waitlist/actions.ts` - Removed revalidatePath

## Alternative Approaches Considered

1. **Optimistic Updates**: Would require complex state management
2. **React Query/SWR**: Adds unnecessary dependency
3. **WebSockets**: Overkill for this use case
4. **Polling**: Wasteful and inefficient
5. **Zustand shallow comparison**: More complex than stable selectors

The custom event approach combined with stable selectors is simple, performant, and doesn't require additional dependencies.
