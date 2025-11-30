-- Add branding column to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{}'::jsonb;

-- Comment on column
COMMENT ON COLUMN companies.branding IS 'Stores branding configuration like logo_url, colors, etc.';

-- Function to get company branding by slug
CREATE OR REPLACE FUNCTION public.get_company_branding_by_slug(_slug text)
returns jsonb
security definer
set search_path = public
language sql stable
as $$
  select branding from public.companies where slug = _slug;
$$;

grant execute on function public.get_company_branding_by_slug(text) to service_role;
grant execute on function public.get_company_branding_by_slug(text) to authenticated;
grant execute on function public.get_company_branding_by_slug(text) to anon;
