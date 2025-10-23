-- Migration: Add cancel slot support

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'slot_status'
      AND e.enumlabel = 'cancelled'
  ) THEN
    ALTER TYPE public.slot_status ADD VALUE 'cancelled';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.cancel_slot(
  _company_id uuid,
  _slot_id uuid
)
RETURNS TABLE(claim_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slot_record public.slots;
BEGIN
  SELECT *
    INTO slot_record
  FROM public.slots
  WHERE id = _slot_id
    AND company_id = _company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'slot_not_found';
  END IF;

  IF slot_record.status <> 'open' THEN
    RAISE EXCEPTION 'slot_not_open';
  END IF;

  UPDATE public.slots
     SET status = 'cancelled',
         expires_at = timezone('Europe/Amsterdam', now()),
         updated_at = timezone('Europe/Amsterdam', now()),
         claimed_at = NULL,
         claimed_claim_id = NULL
   WHERE id = _slot_id;

  RETURN QUERY
    UPDATE public.claims
       SET status = 'cancelled',
           updated_at = timezone('Europe/Amsterdam', now())
     WHERE slot_id = _slot_id
       AND status IN ('pending', 'expired')
    RETURNING id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_slot(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_slot(uuid, uuid) TO service_role;
