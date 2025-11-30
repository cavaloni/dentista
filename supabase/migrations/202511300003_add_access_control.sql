-- Add allowed_emails column to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS allowed_emails JSONB DEFAULT '[]'::jsonb;

-- Comment on column
COMMENT ON COLUMN companies.allowed_emails IS 'List of email addresses allowed to sign up for this company';

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_company_id uuid;
BEGIN
  -- Check if the user's email is in any company's allowed_emails list
  SELECT id INTO matched_company_id
  FROM public.companies
  WHERE allowed_emails @> to_jsonb(new.email::text)
  LIMIT 1;

  -- If found, create a profile for the user
  IF matched_company_id IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, company_id, role)
    VALUES (new.id, matched_company_id, 'admin'); -- Defaulting to admin for now, can be refined
    RETURN new;
  ELSE
    -- If not found, raise an exception to block the signup
    RAISE EXCEPTION 'Access denied: Email not authorized for any company.';
  END IF;
END;
$$;

-- Trigger to run every time a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
