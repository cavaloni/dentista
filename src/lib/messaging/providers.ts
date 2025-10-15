import { env } from "@/lib/env";

type ProviderResult = {
  externalId: string;
  response: unknown;
};

function toBasicAuthHeader(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

function normalizeE164(value: string) {
  if (value.startsWith("+")) return value;
  if (value.startsWith("00")) {
    return `+${value.slice(2)}`;
  }
  return value;
}

export function normalizeAddress(
  channel: "whatsapp" | "sms" | "email",
  address: string
) {
  if (channel === "email") {
    return address.trim().toLowerCase();
  }

  if (channel === "whatsapp") {
    if (address.startsWith("whatsapp:")) {
      return address;
    }
    const e164 = normalizeE164(address.replace("whatsapp:", "").trim());
    return `whatsapp:${e164}`;
  }

  return normalizeE164(address.trim());
}

async function sendTwilioMessage(params: Record<string, string>): Promise<ProviderResult> {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials missing");
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const body = new URLSearchParams(params);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: toBasicAuthHeader(
        env.TWILIO_ACCOUNT_SID,
        env.TWILIO_AUTH_TOKEN
      ),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.message ?? "Twilio message send failed");
  }

  return {
    externalId: json.sid,
    response: json,
  };
}

export async function sendTwilioWhatsApp(
  to: string,
  body: string
): Promise<ProviderResult> {
  if (!env.TWILIO_WHATSAPP_NUMBER) {
    throw new Error("Twilio WhatsApp sender missing");
  }

  const normalizedTo = normalizeAddress("whatsapp", to);

  return sendTwilioMessage({
    To: normalizedTo,
    From: normalizeAddress("whatsapp", env.TWILIO_WHATSAPP_NUMBER),
    Body: body,
  });
}

export async function sendTwilioSms(
  to: string,
  body: string
): Promise<ProviderResult> {
  if (!env.TWILIO_SMS_NUMBER) {
    throw new Error("Twilio SMS sender missing");
  }

  const normalizedTo = normalizeAddress("sms", to);

  return sendTwilioMessage({
    To: normalizedTo,
    From: normalizeAddress("sms", env.TWILIO_SMS_NUMBER),
    Body: body,
  });
}

export async function sendMetaWhatsApp(
  to: string,
  body: string
): Promise<ProviderResult> {
  if (!env.META_WHATSAPP_TOKEN || !env.META_WHATSAPP_PHONE_ID) {
    throw new Error("Meta WhatsApp credentials missing");
  }

  const normalizedTo = normalizeAddress("whatsapp", to).replace("whatsapp:", "");

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${env.META_WHATSAPP_PHONE_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.META_WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizedTo,
        type: "text",
        text: {
          preview_url: false,
          body,
        },
      }),
    }
  );

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.error?.message ?? "Meta WhatsApp send failed");
  }

  return {
    externalId: json.messages?.[0]?.id ?? "",
    response: json,
  };
}
