import { cache } from "react";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { env } from "@/lib/env";

/**
 * Get the company ID from environment variable or user context
 * This enables multitenancy by allowing a specific company to be targeted
 */
export async function getCompanyId(): Promise<string> {
  // If COMPANY_SLUG env var is set, use it for service operations
  if (env.COMPANY_SLUG) {
    const supabase = createSupabaseServiceClient();
    // @ts-expect-error - RPC function types need regeneration
    const { data, error } = await supabase.rpc("get_company_by_slug", {
      _slug: env.COMPANY_SLUG,
    });

    if (error || !data) {
      throw new Error(`Company not found for slug: ${env.COMPANY_SLUG}`);
    }

    return data as string;
  }

  // For user-facing operations, get company from user context
  throw new Error(
    "Company context not available. Set COMPANY_SLUG environment variable for service operations."
  );
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getCompanyId instead
 */
export async function getPracticeId(): Promise<string> {
  return getCompanyId();
}

/**
 * Check if a specific company context is available
 */
export function hasCompanyContext(): boolean {
  return !!env.COMPANY_SLUG;
}