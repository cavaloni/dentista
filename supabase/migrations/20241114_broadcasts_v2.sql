-- Broadcasts V2: Remove active/inactive, add broadcast assignments
-- This migration enables explicit patient-to-broadcast assignment workflow

-- 1. Add 'draft' status to slot_status enum (before 'open')
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'draft' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'slot_status')
  ) THEN
    -- Add draft as first value
    ALTER TYPE public.slot_status ADD VALUE 'draft' BEFORE 'open';
  END IF;
END $$;

-- 2. Create broadcast_assignments junction table
CREATE TABLE IF NOT EXISTS public.broadcast_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  slot_id uuid NOT NULL REFERENCES public.slots(id) ON DELETE CASCADE,
  waitlist_member_id uuid NOT NULL REFERENCES public.waitlist_members(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users ON DELETE SET NULL,
  removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure unique active assignments (can't assign same patient twice to same broadcast)
  CONSTRAINT unique_active_assignment UNIQUE(slot_id, waitlist_member_id)
);

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_broadcast_assignments_slot_active 
  ON public.broadcast_assignments(slot_id) 
  WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_broadcast_assignments_patient_active 
  ON public.broadcast_assignments(waitlist_member_id) 
  WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_broadcast_assignments_company 
  ON public.broadcast_assignments(company_id);

-- 4. Add trigger for updated_at
CREATE TRIGGER set_broadcast_assignments_updated_at
  BEFORE UPDATE ON public.broadcast_assignments
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 5. Enable RLS
ALTER TABLE public.broadcast_assignments ENABLE ROW LEVEL SECURITY;

-- 6. Add RLS policies
CREATE POLICY "Users can view their company's broadcast assignments"
  ON public.broadcast_assignments FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their company's broadcast assignments"
  ON public.broadcast_assignments FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's broadcast assignments"
  ON public.broadcast_assignments FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their company's broadcast assignments"
  ON public.broadcast_assignments FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- 7. Add helper function to get active assignment for a patient
CREATE OR REPLACE FUNCTION public.get_patient_active_assignment(patient_id uuid)
RETURNS TABLE (
  broadcast_id uuid,
  broadcast_start timestamptz,
  broadcast_status public.slot_status,
  broadcast_duration integer,
  assigned_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    s.id as broadcast_id,
    s.start_at as broadcast_start,
    s.status as broadcast_status,
    s.duration_minutes as broadcast_duration,
    ba.assigned_at
  FROM public.broadcast_assignments ba
  JOIN public.slots s ON s.id = ba.slot_id
  WHERE ba.waitlist_member_id = patient_id
    AND ba.removed_at IS NULL
    AND s.status IN ('draft', 'open', 'claimed')
  ORDER BY s.start_at ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_patient_active_assignment(uuid) TO authenticated;

-- 8. Add comment explaining the migration
COMMENT ON TABLE public.broadcast_assignments IS 
  'V2: Explicit patient-to-broadcast assignments. Replaces the active/inactive boolean pattern.';

COMMENT ON COLUMN public.broadcast_assignments.removed_at IS 
  'Soft delete: when patient is removed from broadcast. NULL means still assigned.';

-- Note: We are NOT dropping the 'active' column from waitlist_members yet
-- This allows for gradual migration and rollback if needed
-- After V2 is stable and all data is migrated, run a follow-up migration to drop it
