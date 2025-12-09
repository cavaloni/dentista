'use server';

import { headers } from "next/headers";
import { z } from "zod";

import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().email(),
});

export type MagicLinkState =
  | {
      status: "idle";
    }
  | {
      status: "success";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

export async function requestMagicLink(
  _prevState: MagicLinkState,
  formData: FormData
): Promise<MagicLinkState> {
  try {
    const parsed = schema.safeParse({
      email: formData.get("email"),
    });

    if (!parsed.success) {
      return {
        status: "error",
        message: "Enter a valid email address.",
      };
    }

    const supabase = await createSupabaseServerClient();
    
    // Get the origin from request headers to support dynamic Vercel deployment URLs
    const headersList = await headers();
    const host = headersList.get("host");
    const protocol = headersList.get("x-forwarded-proto") ?? "https";
    const origin = host ? `${protocol}://${host}` : env.BASE_URL;
    const redirectUrl = env.MAGIC_LINK_REDIRECT_URL ?? `${origin}/auth/callback`;
    
    console.log('Magic link debug:', { host, protocol, origin, redirectUrl, envBaseUrl: env.BASE_URL });
    
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        emailRedirectTo: redirectUrl,
        shouldCreateUser: true,
      },
    });

    console.log('Magic link request result:', { error, redirectUrl });

    if (error) {
      return {
        status: "error",
        message: error.message,
      };
    }

    return {
      status: "success",
      message: "Check your inbox for the magic link.",
    };
  } catch (error) {
    console.error("requestMagicLink", error);
    return {
      status: "error",
      message: "We couldn't send the link. Try again shortly.",
    };
  }
}
