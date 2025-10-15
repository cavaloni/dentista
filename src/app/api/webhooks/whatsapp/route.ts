import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { processInboundMessage } from "@/lib/messaging/inbound";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const provider = env.WHATSAPP_PROVIDER ?? "twilio";

function verifyMetaSignature(body: string, signature: string | null) {
  if (!env.WHATSAPP_WEBHOOK_SECRET) return true;
  if (!signature) return false;
  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", env.WHATSAPP_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

function verifyTwilioSignature(request: Request, rawBody: string) {
  if (!env.TWILIO_AUTH_TOKEN) return true;
  const signature = request.headers.get("x-twilio-signature");
  if (!signature) return false;

  const params = new URLSearchParams(rawBody);
  const sorted = Array.from(params.keys()).sort();
  let data = `${env.BASE_URL}/api/webhooks/whatsapp`;

  for (const key of sorted) {
    const values = params.getAll(key);
    if (values.length === 0) {
      continue;
    }
    data += key + values.join("");
  }

  const expected = crypto
    .createHmac("sha1", env.TWILIO_AUTH_TOKEN)
    .update(data)
    .digest("base64");

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function GET(request: Request) {
  if (provider === "meta") {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const challenge = url.searchParams.get("hub.challenge");
    const verifyToken = url.searchParams.get("hub.verify_token");

    if (
      mode === "subscribe" &&
      challenge &&
      verifyToken === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
    ) {
      return new NextResponse(challenge, { status: 200 });
    }

    return new NextResponse("Forbidden", { status: 403 });
  }

  return new NextResponse("OK", { status: 200 });
}

export async function POST(request: Request) {
  const service = createSupabaseServiceClient();

  if (provider === "meta") {
    const bodyText = await request.text();
    const signature = request.headers.get("x-hub-signature-256");

    if (!verifyMetaSignature(bodyText, signature)) {
      return new NextResponse("Signature mismatch", { status: 401 });
    }

    const payload = JSON.parse(bodyText);
    const practiceIds = new Set<string>();

    const entries = payload?.entry ?? [];
    for (const entry of entries) {
      const changes = entry?.changes ?? [];
      for (const change of changes) {
        const messages = change?.value?.messages ?? [];
        for (const message of messages) {
          if (message.type !== "text") continue;
          const from = message.from ?? "";
          const textBody = message.text?.body ?? "";
          const practiceId = await processInboundMessage({
            body: textBody,
            from,
            channel: "whatsapp",
            externalId: message.id,
            metadata: { provider: "meta" },
          });
          if (practiceId) {
            practiceIds.add(practiceId);
          }
        }
      }
    }

    await service.from("webhook_events").insert({
      provider: "meta",
      practice_id: practiceIds.values().next().value ?? null,
      payload,
    });

    return NextResponse.json({ received: true });
  }

  const bodyText = await request.text();

  console.log("[Twilio Webhook] Received request");

  if (!verifyTwilioSignature(request, bodyText)) {
    console.error("[Twilio Webhook] Signature verification failed");
    return new NextResponse("Signature mismatch", { status: 401 });
  }

  const params = new URLSearchParams(bodyText);
  const from = params.get("From") ?? "";
  const body = params.get("Body") ?? "";
  const messageSid = params.get("MessageSid") ?? undefined;

  console.log("[Twilio Webhook] Processing message:", {
    from,
    body,
    messageSid,
  });

  try {
    const practiceId = await processInboundMessage({
      body,
      from,
      channel: from.startsWith("whatsapp") ? "whatsapp" : "sms",
      externalId: messageSid,
      metadata: Object.fromEntries(params.entries()),
    });

    console.log("[Twilio Webhook] Message processed, practiceId:", practiceId);

    await service.from("webhook_events").insert({
      provider: "twilio",
      practice_id: practiceId ?? null,
      payload: Object.fromEntries(params.entries()),
    });

    console.log("[Twilio Webhook] Webhook event logged successfully");

    return new NextResponse("", {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (error) {
    console.error("[Twilio Webhook] Error processing message:", error);
    
    // Still log the webhook even if processing failed
    await service.from("webhook_events").insert({
      provider: "twilio",
      practice_id: null,
      payload: {
        ...Object.fromEntries(params.entries()),
        error: error instanceof Error ? error.message : String(error),
      },
    });

    return new NextResponse("", {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}

export const dynamic = "force-dynamic";
