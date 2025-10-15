import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/types";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Debug: Log all search parameters
  console.log("Auth callback URL:", request.url);
  console.log("All search params:", Object.fromEntries(searchParams.entries()));

  if (code) {
    const cookieStore = await cookies();
    
    const supabase = createServerClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      console.log("Auth callback successful, redirecting to:", next);
      return NextResponse.redirect(`${origin}${next}`);
    } else {
      console.error("Auth callback error:", error);
    }
  }

  // Return the user to login with error
  console.log("Auth callback failed, redirecting to login");
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}