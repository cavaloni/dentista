import { formatInTimeZone } from "date-fns-tz";

import {
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
    .select("id, company_id, full_name, channel, address")
    .eq("address", normalizedAddress)
    .maybeSingle();

  if (!member || !member.company_id) {
    console.log("[processInboundMessage] Member not found for address:", normalizedAddress);
    return null;
  }

  console.log("[processInboundMessage] Found member:", {
    id: member.id,
    name: member.full_name,
    companyId: member.company_id,
  });

  const companyId = member.company_id;

  await recordInboundMessage({
    practiceId: companyId,
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
      "id, status, slot_id, wave_number, slot:slots(id, status, start_at, duration_minutes, claim_window_minutes, company_id, expires_at, notes), waitlist_members(full_name)"
    )
    .eq("company_id", companyId)
    .eq("waitlist_member_id", member.id)
    .in("status", ["pending", "won"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slot = claim?.slot as any;
  console.log("[processInboundMessage] Found claim:", claim ? {
    id: claim.id,
    status: claim.status,
    slotStatus: slot?.status,
  } : "none");

  if (!claim || !slot) {
    console.log("[processInboundMessage] No active claim found for member");
    return companyId;
  }

  const { data: company } = await supabase
    .from("companies")
    .select(
      "id, name, timezone, claim_window_minutes, invite_template, confirmation_template, taken_template"
    )
    .eq("id", companyId)
    .single();

  if (!company) {
    return companyId;
  }

  const slotStartLabel = formatInTimeZone(
    slot.start_at,
    company.timezone,
    "EEE d MMM • HH:mm"
  );

  const inviteContext = {
    practiceName: company.name,
    patientName: member.full_name,
    slotStart: slotStartLabel,
    duration: `${slot.duration_minutes}`,
    claimWindow: `${company.claim_window_minutes}`,
  };

  if (!isAffirmative) {
    console.log("[processInboundMessage] Not an affirmative response, ignoring");
    return companyId;
  }

  console.log("[processInboundMessage] Affirmative response received, attempting claim...");

  const now = Date.now();
  const expired = new Date(slot.expires_at).getTime() < now;

  console.log("[processInboundMessage] Slot check:", {
    expired,
    slotStatus: slot.status,
    expiresAt: slot.expires_at,
  });

  if (expired || slot.status !== "open") {
    console.log("[processInboundMessage] Slot expired or not open, sending taken message");
    await queueOutboundMessage({
      practiceId: companyId,
      slotId: slot.id,
      claimId: claim.id,
      waitlistMemberId: member.id,
      channel: member.channel,
      templateKey: "slot_taken",
      body: buildTakenMessage(company.taken_template, inviteContext),
      to: normalizedAddress,
      idempotencyKey: `taken:${claim.id}`,
      metadata: { reason: "late" },
    });
    return companyId;
  }

  const { data: results, error: claimError } = await supabase.rpc("attempt_claim", {
    _company_id: companyId,
    _slot_id: slot.id,
    _claim_id: claim.id,
    _response: payload.body,
  });

  console.log("[processInboundMessage] attempt_claim result:", { results, error: claimError });

  const won = Array.isArray(results) ? results.some((row) => row.won) : false;

  console.log("[processInboundMessage] Claim outcome:", won ? "WON" : "LOST");

  if (won) {
    console.log("[processInboundMessage] Claim won! Waiting for user confirmation in modal...");
    
    // Update slot status to 'claimed' (not 'booked' yet - waiting for user confirmation)
    await supabase
      .from("slots")
      .update({ status: "claimed" })
      .eq("id", slot.id);

    // Insert notification for real-time updates
    // This table has NO RLS, so the insert will trigger Realtime broadcasts
    // The frontend modal will appear, and user must click "Confirm Booking"
    const { error: notificationError } = await supabase
      .from("booking_notifications")
      .insert({
        company_id: companyId,
        claim_id: claim.id,
      });

    if (notificationError) {
      console.error("[processInboundMessage] Failed to insert booking notification:", notificationError);
    } else {
      console.log("[processInboundMessage] Booking notification inserted successfully");
      console.log("[processInboundMessage] User must confirm booking in modal before messages are sent");
    }

    // NOTE: Confirmation message and "taken" messages are now sent via
    // the /api/bookings/confirm endpoint when user clicks "Confirm Booking"
  } else {
    await queueOutboundMessage({
      practiceId: companyId,
      slotId: slot.id,
      claimId: claim.id,
      waitlistMemberId: member.id,
      channel: member.channel,
      templateKey: "slot_taken",
      body: buildTakenMessage(company.taken_template, inviteContext),
      to: normalizedAddress,
      idempotencyKey: `taken:${claim.id}`,
      metadata: { reason: "already_claimed" },
    });
  }

  return companyId;
}
