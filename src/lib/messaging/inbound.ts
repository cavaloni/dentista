import { formatInTimeZone } from "date-fns-tz";

import {
  buildConfirmationMessage,
  buildTakenMessage,
  queueOutboundMessage,
  recordInboundMessage,
} from "@/lib/messaging";
import { normalizeAddress } from "@/lib/messaging/providers";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type InboundPayload = {
  body: string;
  from: string;
  channel: "whatsapp" | "sms" | "email";
  externalId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function processInboundMessage(payload: InboundPayload) {
  const normalizedAddress = normalizeAddress(payload.channel, payload.from);
  const supabase = createSupabaseServiceClient();

  console.log("[processInboundMessage] Looking up member:", {
    channel: payload.channel,
    from: payload.from,
    normalizedAddress,
  });

  const { data: member } = await supabase
    .from("waitlist_members")
    .select("id, practice_id, full_name, channel, address")
    .eq("address", normalizedAddress)
    .maybeSingle();

  if (!member || !member.practice_id) {
    console.log("[processInboundMessage] Member not found for address:", normalizedAddress);
    return null;
  }

  console.log("[processInboundMessage] Found member:", {
    id: member.id,
    name: member.full_name,
    practiceId: member.practice_id,
  });

  const practiceId = member.practice_id;

  await recordInboundMessage({
    practiceId,
    waitlistMemberId: member.id,
    channel: payload.channel,
    body: payload.body,
    externalId: payload.externalId ?? null,
    metadata: payload.metadata,
  });

  const reply = payload.body.trim().toUpperCase();
  const isAffirmative = reply === "YES" || reply === "Y";

  console.log("[processInboundMessage] Message body:", payload.body, "| isAffirmative:", isAffirmative);

  const { data: claim } = await supabase
    .from("claims")
    .select(
      "id, status, slot_id, wave_number, slot:slots(id, status, start_at, duration_minutes, claim_window_minutes, practice_id, expires_at, notes), waitlist_members(full_name)"
    )
    .eq("practice_id", practiceId)
    .eq("waitlist_member_id", member.id)
    .in("status", ["pending", "won"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log("[processInboundMessage] Found claim:", claim ? {
    id: claim.id,
    status: claim.status,
    slotStatus: claim.slot?.status,
  } : "none");

  if (!claim || !claim.slot) {
    console.log("[processInboundMessage] No active claim found for member");
    return practiceId;
  }

  const { data: practice } = await supabase
    .from("practices")
    .select(
      "id, name, timezone, claim_window_minutes, invite_template, confirmation_template, taken_template"
    )
    .eq("id", practiceId)
    .single();

  if (!practice) {
    return practiceId;
  }

  const slotStartLabel = formatInTimeZone(
    claim.slot.start_at,
    practice.timezone,
    "EEE d MMM • HH:mm"
  );

  const inviteContext = {
    practiceName: practice.name,
    patientName: member.full_name,
    slotStart: slotStartLabel,
    duration: `${claim.slot.duration_minutes}`,
    claimWindow: `${practice.claim_window_minutes}`,
  };

  if (!isAffirmative) {
    console.log("[processInboundMessage] Not an affirmative response, ignoring");
    return practiceId;
  }

  console.log("[processInboundMessage] Affirmative response received, attempting claim...");

  const now = Date.now();
  const expired = new Date(claim.slot.expires_at).getTime() < now;

  console.log("[processInboundMessage] Slot check:", {
    expired,
    slotStatus: claim.slot.status,
    expiresAt: claim.slot.expires_at,
  });

  if (expired || claim.slot.status !== "open") {
    console.log("[processInboundMessage] Slot expired or not open, sending taken message");
    await queueOutboundMessage({
      practiceId,
      slotId: claim.slot.id,
      claimId: claim.id,
      waitlistMemberId: member.id,
      channel: member.channel,
      templateKey: "slot_taken",
      body: buildTakenMessage(practice.taken_template, inviteContext),
      to: normalizedAddress,
      idempotencyKey: `taken:${claim.id}`,
      metadata: { reason: "late" },
    });
    return practiceId;
  }

  const { data: results, error: claimError } = await supabase.rpc("attempt_claim", {
    _practice_id: practiceId,
    _slot_id: claim.slot.id,
    _claim_id: claim.id,
    _response: payload.body,
  });

  console.log("[processInboundMessage] attempt_claim result:", { results, error: claimError });

  const won = Array.isArray(results) ? results.some((row) => row.won) : false;

  console.log("[processInboundMessage] Claim outcome:", won ? "WON" : "LOST");

  if (won) {
    console.log("[processInboundMessage] Sending confirmation message");
    await queueOutboundMessage({
      practiceId,
      slotId: claim.slot.id,
      claimId: claim.id,
      waitlistMemberId: member.id,
      channel: member.channel,
      templateKey: "slot_confirmed",
      body: buildConfirmationMessage(
        practice.confirmation_template,
        inviteContext
      ),
      to: normalizedAddress,
      idempotencyKey: `confirm:${claim.id}`,
      metadata: { claim_status: "won" },
    });

    await supabase
      .from("slots")
      .update({ status: "booked" })
      .eq("id", claim.slot.id);

    const { data: others } = await supabase
      .from("claims")
      .select("id, waitlist_member_id, waitlist_members(channel, address, full_name)")
      .eq("slot_id", claim.slot.id)
      .neq("id", claim.id);

    if (others) {
      await Promise.all(
        others.map(async (other) => {
          if (!other.waitlist_members) return;
          await queueOutboundMessage({
            practiceId,
            slotId: claim.slot.id,
            claimId: other.id,
            waitlistMemberId: other.waitlist_member_id,
            channel: other.waitlist_members.channel,
            templateKey: "slot_taken",
            body: buildTakenMessage(practice.taken_template, {
              ...inviteContext,
              patientName: other.waitlist_members.full_name,
            }),
            to: normalizeAddress(
              other.waitlist_members.channel,
              other.waitlist_members.address
            ),
            idempotencyKey: `taken:${other.id}`,
            metadata: { reason: "winner_selected" },
          });
        })
      );
    }
  } else {
    await queueOutboundMessage({
      practiceId,
      slotId: claim.slot.id,
      claimId: claim.id,
      waitlistMemberId: member.id,
      channel: member.channel,
      templateKey: "slot_taken",
      body: buildTakenMessage(practice.taken_template, inviteContext),
      to: normalizedAddress,
      idempotencyKey: `taken:${claim.id}`,
      metadata: { reason: "already_claimed" },
    });
  }

  return practiceId;
}
