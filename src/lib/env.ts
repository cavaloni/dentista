import { z } from "zod";

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  BASE_URL: z.string().url(),
  TZ: z.string().default("Europe/Amsterdam"),
  MAGIC_LINK_REDIRECT_URL: z.string().url().optional(),
  COMPANY_SLUG: z.string().optional(),
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
  // Security settings
  ENCRYPTION_MASTER_KEY: z.string().min(32).optional(),
  SESSION_TIMEOUT_MINUTES: z.string().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  TZ: z.string().default("Europe/Amsterdam"),
});

const rawEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  BASE_URL: process.env.BASE_URL,
  TZ: process.env.TZ,
  MAGIC_LINK_REDIRECT_URL: process.env.MAGIC_LINK_REDIRECT_URL,
  COMPANY_SLUG: process.env.COMPANY_SLUG,
  WHATSAPP_PROVIDER: process.env.WHATSAPP_PROVIDER,
  WHATSAPP_WEBHOOK_SECRET: process.env.WHATSAPP_WEBHOOK_SECRET,
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER,
  TWILIO_SMS_NUMBER: process.env.TWILIO_SMS_NUMBER,
  META_WHATSAPP_TOKEN: process.env.META_WHATSAPP_TOKEN,
  META_WHATSAPP_PHONE_ID: process.env.META_WHATSAPP_PHONE_ID,
  CLAIM_EXPIRY_MINUTES: process.env.CLAIM_EXPIRY_MINUTES,
  LOG_LEVEL: process.env.LOG_LEVEL,
  CRON_SECRET: process.env.CRON_SECRET,
  ENCRYPTION_MASTER_KEY: process.env.ENCRYPTION_MASTER_KEY,
  SESSION_TIMEOUT_MINUTES: process.env.SESSION_TIMEOUT_MINUTES,
};

const clientParsed = clientSchema.parse(rawEnv);

export const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: clientParsed.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: clientParsed.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  TZ: clientParsed.TZ ?? "Europe/Amsterdam",
};

type ServerEnvSchema = z.infer<typeof serverSchema>;

type ServerEnv = Omit<ServerEnvSchema, "CLAIM_EXPIRY_MINUTES"> & {
  CLAIM_EXPIRY_MINUTES?: number;
};

let serverEnvCache: ServerEnv | null = null;

if (typeof window === "undefined") {
  const parsed = serverSchema.parse(rawEnv);
  serverEnvCache = {
    ...parsed,
    TZ: parsed.TZ ?? "Europe/Amsterdam",
    CLAIM_EXPIRY_MINUTES: parsed.CLAIM_EXPIRY_MINUTES
      ? Number.parseInt(parsed.CLAIM_EXPIRY_MINUTES, 10)
      : undefined,
  };
}

export const env = new Proxy({} as ServerEnv, {
  get(_target, prop) {
    if (!serverEnvCache) {
      throw new Error("env can only be accessed on the server");
    }

    return serverEnvCache[prop as keyof ServerEnv];
  },
  ownKeys() {
    if (!serverEnvCache) {
      throw new Error("env can only be accessed on the server");
    }

    return Reflect.ownKeys(serverEnvCache);
  },
  getOwnPropertyDescriptor(_target, prop) {
    if (!serverEnvCache) {
      throw new Error("env can only be accessed on the server");
    }

    return Object.getOwnPropertyDescriptor(serverEnvCache, prop);
  },
});
