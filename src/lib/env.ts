import { z } from "zod";

const baseSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  BASE_URL: z.string().url(),
  TZ: z.string().default("Europe/Amsterdam"),
  MAGIC_LINK_REDIRECT_URL: z.string().url().optional(),
  WHATSAPP_PROVIDER: z.enum(["twilio", "meta"]).optional(),
  WHATSAPP_WEBHOOK_SECRET: z.string().optional(),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),
  TWILIO_SMS_NUMBER: z.string().optional(),
  META_WHATSAPP_TOKEN: z.string().optional(),
  META_WHATSAPP_PHONE_ID: z.string().optional(),
  CLAIM_EXPIRY_MINUTES: z.string().optional(),
  LOG_LEVEL: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

const parsed = baseSchema.parse(process.env);

export const env = {
  ...parsed,
  TZ: parsed.TZ ?? "Europe/Amsterdam",
  CLAIM_EXPIRY_MINUTES: parsed.CLAIM_EXPIRY_MINUTES
    ? Number.parseInt(parsed.CLAIM_EXPIRY_MINUTES, 10)
    : undefined,
};

export const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: parsed.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  TZ: parsed.TZ ?? "Europe/Amsterdam",
};
