-- Migration: Add booking_notifications table for secure real-time notifications
-- This table has NO RLS to enable Realtime broadcasts from service role operations
-- Security: Contains only reference IDs (company_id, claim_id) - no sensitive data

-- Create booking_notifications table
CREATE TABLE IF NOT EXISTS public.booking_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for efficient company-based queries
CREATE INDEX booking_notifications_company_created_idx 
  ON public.booking_notifications(company_id, created_at DESC);

-- Enable Realtime replication for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_notifications;

-- Grant necessary permissions
GRANT SELECT, INSERT ON public.booking_notifications TO service_role;
GRANT SELECT ON public.booking_notifications TO authenticated;

-- Optional: Auto-cleanup function to delete old notifications (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_booking_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.booking_notifications
  WHERE created_at < now() - interval '24 hours';
END;
$$;

-- Comment explaining security model
COMMENT ON TABLE public.booking_notifications IS 
  'Notification queue for real-time booking updates. NO RLS by design - contains only reference IDs for security. Actual data queries are RLS-protected.';
