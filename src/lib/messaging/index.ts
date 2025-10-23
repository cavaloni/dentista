import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Database, Json } from "@/lib/supabase/types";

import { env } from "../env";
import { renderTemplate } from "./template";
import {
  normalizeAddress,
  sendMetaWhatsApp,
  sendTwilioSms,
  sendTwilioWhatsApp,
} from "./providers";

type Channel = Database["public"]["Enums"]["contact_channel"];

type QueueMessageParams = {
  practiceId: string;
  slotId?: string | null;
  claimId?: string | null;
  waitlistMemberId?: string | null;
  channel: Channel;
  templateKey: string;
  body: string;
  direction?: Database["public"]["Enums"]["message_direction"];
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

type UpsertResult =
  | {
      success: true;
      messageId: string;
      externalId: string | null;
      skipped: true;
    }
  | {
      success: false;
      messageId: string;
      externalId: string | null;
      skipped: false;
      attempt: number;
    };

async function upsertMessage(params: QueueMessageParams): Promise<UpsertResult> {
  const supabase = createSupabaseServiceClient();

  const { data: existing } = await supabase
    .from("messages")
    .select("id, status, external_message_id")
    .eq("company_id", params.practiceId)
    .eq("metadata->>idempotency_key", params.idempotencyKey)
    .maybeSingle();

  if (existing && existing.status === "sent") {
    return {
      success: true as const,
      messageId: existing.id,
      externalId: existing.external_message_id,
      skipped: true,
    };
  }

  const { data: inserted, error } = await supabase
    .from("messages")
    .insert({
      company_id: params.practiceId,
      slot_id: params.slotId ?? null,
      claim_id: params.claimId ?? null,
      waitlist_member_id: params.waitlistMemberId ?? null,
      channel: params.channel,
      direction: params.direction ?? "outbound",
      status: "queued",
      template_key: params.templateKey,
      body: params.body,
      metadata: {
        ...(params.metadata ?? {}),
        idempotency_key: params.idempotencyKey,
      },
    })
    .select("id, channel, waitlist_member_id, status, metadata, attempt")
    .single();

  if (error || !inserted) {
    console.error("[queueOutboundMessage] Failed to insert message:", error);
    throw error ?? new Error("Failed to queue message");
  }

  return {
    success: false,
    messageId: inserted.id,
    externalId: (inserted.metadata as Record<string, unknown>)?.external_id as string ?? null,
    skipped: false,
    attempt: inserted.attempt ?? 0,
  };
}

export async function deliverMessage(
  channel: Channel,
  to: string,
  body: string
) {
  if (channel === "whatsapp") {
    if (env.WHATSAPP_PROVIDER === "meta") {
      return sendMetaWhatsApp(to, body);
    }
    return sendTwilioWhatsApp(to, body);
  }

  if (channel === "sms") {
    return sendTwilioSms(to, body);
  }

  // Email placeholder — mark as sent without external provider.
  return {
    externalId: `email-${Date.now()}`,
    response: { simulated: true },
  };
}

export async function queueOutboundMessage(
  params: QueueMessageParams & { to: string }
) {
  const supabase = createSupabaseServiceClient();
  const result = await upsertMessage(params);

  if (result.skipped) {
    return { success: true, messageId: result.messageId };
  }

  try {
    const providerResult = await deliverMessage(
      params.channel,
      params.to,
      params.body
    );

    await supabase
      .from("messages")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        external_message_id: providerResult.externalId,
        metadata: {
          ...(params.metadata ?? {}),
          idempotency_key: params.idempotencyKey,
          provider_response: providerResult.response,
        } as Json,
        attempt: (result.attempt ?? 0) + 1,
      })
      .eq("id", result.messageId);

    return { success: true, messageId: result.messageId };
  } catch (error) {
    await supabase
      .from("messages")
      .update({
        status: "failed",
        error: error instanceof Error ? error.message : "unknown_error",
        attempt: (result.attempt ?? 0) + 1,
        metadata: {
          ...(params.metadata ?? {}),
          idempotency_key: params.idempotencyKey,
          failure_at: new Date().toISOString(),
        },
      })
      .eq("id", result.messageId);

    return {
      success: false,
      messageId: result.messageId,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export type InviteContext = {
  practiceName: string;
  patientName: string;
  slotStart: string;
  duration: string;
  claimWindow: string;
};

export function buildInviteMessage(
  template: string,
  context: InviteContext
) {
  return renderTemplate(template, {
    name: context.patientName,
    slot_start: context.slotStart,
    duration: context.duration,
    claim_window: context.claimWindow,
    practice: context.practiceName,
  });
}

export function buildTakenMessage(template: string, context: InviteContext) {
  return renderTemplate(template, {
    name: context.patientName,
    slot_start: context.slotStart,
    duration: context.duration,
    practice: context.practiceName,
  });
}

export function buildConfirmationMessage(
  template: string,
  context: InviteContext
) {
  return renderTemplate(template, {
    name: context.patientName,
    slot_start: context.slotStart,
    duration: context.duration,
    practice: context.practiceName,
  });
}

export async function recordInboundMessage(params: {
  practiceId: string;
  slotId?: string | null;
  claimId?: string | null;
  waitlistMemberId?: string | null;
  channel: Channel;
  body: string;
  externalId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseServiceClient();

  const { error } = await supabase.from("messages").insert({
    company_id: params.practiceId,
    slot_id: params.slotId ?? null,
    claim_id: params.claimId ?? null,
    waitlist_member_id: params.waitlistMemberId ?? null,
    channel: params.channel,
    direction: "inbound",
    status: "received",
    body: params.body,
    external_message_id: params.externalId ?? null,
    metadata: params.metadata as Json ?? null,
  });

  if (error) {
    console.error("[logInboundMessage] Failed to log inbound message:", error);
    throw error;
  }
}

export { normalizeAddress };

export async function retryFailedMessages(limit = 20) {
  const supabase = createSupabaseServiceClient();

  const { data: failedMessages, error } = await supabase
    .from("messages")
    .select(
      "id, practice_id, channel, body, attempt, metadata, waitlist_member_id, slot_id, claim_id, waitlist_members(address)"
    )
    .eq("status", "failed")
    .lt("attempt", 3)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !failedMessages) {
    console.error("[retryFailedMessages] Failed to fetch failed messages:", error);
    return [] as { id: string; success: boolean; error?: string }[];
  }

  const results: { id: string; success: boolean; error?: string }[] = [];

  for (const message of failedMessages) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const member = message.waitlist_members as any;
    const address = member?.address;
    if (!address) {
      continue;
    }

    try {
      const providerResult = await deliverMessage(
        message.channel as Channel,
        address,
        message.body
      );

      await supabase
        .from("messages")
        .update({
          status: "sent",
          external_message_id: providerResult.externalId,
          sent_at: new Date().toISOString(),
          attempt: (message.attempt ?? 0) + 1,
          metadata: {
            ...(message.metadata as Record<string, unknown> ?? {}),
            provider_response: providerResult.response,
            retried_at: new Date().toISOString(),
          } as Json,
        })
        .eq("id", message.id);

      results.push({ id: message.id, success: true });
    } catch (err) {
      await supabase
        .from("messages")
        .update({
          attempt: (message.attempt ?? 0) + 1,
          error: err instanceof Error ? err.message : String(err),
        })
        .eq("id", message.id);

      results.push({
        id: message.id,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}
