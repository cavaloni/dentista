import { cache } from "react";

import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const ensureCompanyForUser = cache(async (userId: string) => {
  const supabase = createSupabaseServiceClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("[ensureCompanyForUser] Failed to fetch profile:", profileError);
    throw profileError;
  }

  if (profile?.company_id) {
    return profile.company_id;
  }

  // Create a new company with generated slug
  const companySlug = `company-${Date.now()}`;
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({
      name: "Dental Practice",
      slug: companySlug
    })
    .select("id")
    .single();

  if (companyError) {
    console.error("[ensureCompanyForUser] Failed to create company:", companyError);
    throw companyError;
  }

  const { error: insertProfileError } = await supabase
    .from("profiles")
    .insert({ user_id: userId, company_id: company.id });

  if (insertProfileError) {
    console.error("[ensureCompanyForUser] Failed to insert profile:", insertProfileError);
    throw insertProfileError;
  }

  return company.id as string;
});

// Legacy function for backward compatibility
export const ensurePracticeForUser = ensureCompanyForUser;
