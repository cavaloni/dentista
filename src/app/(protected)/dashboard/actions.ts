'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formatInTimeZone, zonedTimeToUtc } from "date-fns-tz";
import { z } from "zod";

import { ensureCompanyForUser } from "@/lib/practice";
import {
  buildInviteMessage,
  queueOutboundMessage,
} from "@/lib/messaging";
import { normalizeAddress } from "@/lib/messaging/providers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { ReleaseSlotState } from "./types";

const releaseSchema = z.object({
  start_at: z.string().min(1),
  duration_minutes: z.coerce.number().int().positive(),
  notes: z.string().max(500).optional(),
});

const resendSchema = z.object({
  slot_id: z.string().uuid(),
});

const cancelSchema = z.object({
  slot_id: z.string().uuid(),
});

export async function releaseSlotAction(
  _prevState: ReleaseSlotState,
  formData: FormData
): Promise<ReleaseSlotState> {
  const parsed = releaseSchema.safeParse({
    start_at: formData.get("start_at"),
    duration_minutes: formData.get("duration_minutes"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the slot inputs and try again.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const service = createSupabaseServiceClient();
  const companyId = await ensureCompanyForUser(user.id);

  const { data: company, error: companyError } = await service
    .from("companies")
    .select(
      "id, name, timezone, claim_window_minutes, recipients_per_wave, default_duration_minutes, invite_template"
    )
    .eq("id", companyId)
    .single();

  if (companyError || !company) {
    console.error("[releaseSlotAction] Failed to load company:", companyError);
    return {
      status: "error",
      message: `Unable to load company preferences: ${companyError?.message ?? 'Company not found'}`,
    };
  }

  const startLocal = `${parsed.data.start_at}`;
  const startUtc = zonedTimeToUtc(startLocal, company.timezone);

  const { data: releaseResult, error } = await service.rpc("release_slot", {
    _company_id: company.id,
    _start_at: startUtc.toISOString(),
    _duration_minutes: parsed.data.duration_minutes,
    _notes: parsed.data.notes ?? '',
    _claim_window_minutes: company.claim_window_minutes,
    _wave_size: company.recipients_per_wave,
    _released_by: user.id,
    _timezone: company.timezone,
  });

  if (error) {
    console.error("[releaseSlotAction] release_slot RPC error:", error);
    return {
      status: "error",
      message: `Could not release the slot: ${(error as { message?: string })?.message ?? 'Unknown error'}`,
    };
  }

  const slotId = (releaseResult as Array<{ slot_id?: string; claim_id?: string }>)?.[0]?.slot_id;

  if (!slotId) {
    return {
      status: "error",
      message: "Slot creation failed.",
    };
  }

  const claimIds = (releaseResult as Array<{ slot_id?: string; claim_id?: string }>)
    ?.map((row: { claim_id?: string }) => row.claim_id)
    .filter((value): value is string => Boolean(value)) ?? [];

  if (claimIds.length > 0) {
    const { data: claims, error: claimError } = await service
      .from("claims")
      .select(
        "id, wave_number, waitlist_members(id, full_name, channel, address), slot:slots(start_at, duration_minutes, claim_window_minutes)"
      )
      .in("id", claimIds);

    if (!claimError && claims) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invitePromises = claims.map(async (claim: any) => {
        if (!claim.waitlist_members || !claim.slot) {
          return;
        }

        const inviteBody = buildInviteMessage(company.invite_template, {
          practiceName: company.name,
          patientName: claim.waitlist_members.full_name,
          slotStart: formatInTimeZone(
            claim.slot.start_at,
            company.timezone,
            "EEE d MMM • HH:mm"
          ),
          duration: `${claim.slot.duration_minutes}`,
          claimWindow: `${claim.slot.claim_window_minutes}`,
        });

        await queueOutboundMessage({
          practiceId: company.id,
          slotId,
          claimId: claim.id,
          waitlistMemberId: claim.waitlist_members.id,
          channel: claim.waitlist_members.channel,
          templateKey: "slot_invite",
          body: inviteBody,
          to: normalizeAddress(
            claim.waitlist_members.channel,
            claim.waitlist_members.address
          ),
          idempotencyKey: `invite:${claim.id}`,
          metadata: {
            wave_number: claim.wave_number,
            slot_start: claim.slot.start_at,
          },
        });
      });

      await Promise.all(invitePromises);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/logs");

  if (claimIds.length === 0) {
    return {
      status: "warning",
      message: "Slot opened but the waitlist is empty.",
    };
  }

  return {
    status: "success",
    message: "Slot released and invitations sent.",
  };
}

export async function resendNextWaveAction(
  _prevState: ReleaseSlotState,
  formData: FormData
): Promise<ReleaseSlotState> {
  const parsed = resendSchema.safeParse({
    slot_id: formData.get("slot_id"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Invalid slot reference.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const service = createSupabaseServiceClient();
  const companyId = await ensureCompanyForUser(user.id);

  const { data: company, error: companyError } = await service
    .from("companies")
    .select(
      "id, name, timezone, claim_window_minutes, recipients_per_wave, invite_template"
    )
    .eq("id", companyId)
    .single();

  if (companyError || !company) {
    console.error("[resendNextWaveAction] Failed to load company:", companyError);
    return {
      status: "error",
      message: `Unable to load company preferences: ${companyError?.message ?? 'Company not found'}`,
    };
  }

  const { data: slot, error: slotError } = await service
    .from("slots")
    .select(
      "id, status, wave_number, claim_window_minutes, start_at, duration_minutes, expires_at"
    )
    .eq("id", parsed.data.slot_id)
    .eq("company_id", company.id)
    .single();

  if (slotError || !slot) {
    console.error("[resendNextWaveAction] Failed to load slot:", slotError);
    return {
      status: "error",
      message: `Slot no longer exists: ${slotError?.message ?? 'Not found'}`,
    };
  }

  if (slot.status !== "open") {
    return {
      status: "error",
      message: "Only open slots can be resent.",
    };
  }

  const { data: existingClaims } = await service
    .from("claims")
    .select("waitlist_member_id")
    .eq("slot_id", slot.id);

  const excludeIds = (existingClaims ?? [])
    .map((claim) => claim.waitlist_member_id)
    .filter(Boolean);

  let waitlistQuery = service
    .from("waitlist_members")
    .select("id, full_name, channel, address")
    .eq("company_id", company.id)
    .eq("active", true)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(company.recipients_per_wave);

  if (excludeIds.length > 0) {
    waitlistQuery = waitlistQuery.not(
      "id",
      "in",
      `(${excludeIds.map((id) => `"${id}"`).join(",")})`
    );
  }

  const { data: nextMembers, error: nextError } = await waitlistQuery;

  if (nextError) {
    console.error("[resendNextWaveAction] Failed to fetch waitlist:", nextError);
    return {
      status: "error",
      message: `Unable to fetch waitlist members: ${nextError.message}`,
    };
  }

  if (!nextMembers || nextMembers.length === 0) {
    return {
      status: "warning",
      message: "Everyone on the waitlist has already been notified.",
    };
  }

  const waveNumber = slot.wave_number + 1;
  const nowIso = new Date().toISOString();

  const { data: newClaims, error: insertError } = await service
    .from("claims")
    .insert(
      nextMembers.map((member) => ({
        company_id: company.id,
        slot_id: slot.id,
        waitlist_member_id: member.id,
        status: "pending" as const,
        wave_number: waveNumber,
        notified_at: nowIso,
      }))
    )
    .select("id, waitlist_member_id, wave_number");

  if (insertError || !newClaims) {
    console.error("[resendNextWaveAction] Failed to insert claims:", insertError);
    return {
      status: "error",
      message: `Could not create the next wave: ${insertError?.message ?? 'Insert failed'}`,
    };
  }

  await service
    .from("waitlist_members")
    .update({ last_notified_at: nowIso })
    .in(
      "id",
      newClaims.map((claim) => claim.waitlist_member_id)
    );

  const newExpiry = new Date(
    Date.now() + company.claim_window_minutes * 60 * 1000
  ).toISOString();

  await service
    .from("slots")
    .update({ wave_number: waveNumber, expires_at: newExpiry })
    .eq("id", slot.id);

  const messagePromises = newClaims.map(async (claim) => {
    const member = nextMembers.find((m) => m.id === claim.waitlist_member_id);
    if (!member) return;

    const inviteBody = buildInviteMessage(company.invite_template, {
      practiceName: company.name,
      patientName: member.full_name,
      slotStart: formatInTimeZone(
        slot.start_at,
        company.timezone,
        "EEE d MMM • HH:mm"
      ),
      duration: `${slot.duration_minutes}`,
      claimWindow: `${company.claim_window_minutes}`,
    });

    await queueOutboundMessage({
      practiceId: company.id,
      slotId: slot.id,
      claimId: claim.id,
      waitlistMemberId: member.id,
      channel: member.channel,
      templateKey: "slot_invite",
      body: inviteBody,
      to: normalizeAddress(member.channel, member.address),
      idempotencyKey: `invite:${claim.id}`,
      metadata: {
        wave_number: claim.wave_number,
        slot_start: slot.start_at,
      },
    });
  });

  await Promise.all(messagePromises);

  revalidatePath("/dashboard");
  revalidatePath("/logs");

  return {
    status: "success",
    message: "Next cohort notified.",
  };
}

export async function cancelSlotAction(
  _prevState: ReleaseSlotState,
  formData: FormData
): Promise<ReleaseSlotState> {
  const parsed = cancelSchema.safeParse({
    slot_id: formData.get("slot_id"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Invalid slot reference.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const service = createSupabaseServiceClient();
  const companyId = await ensureCompanyForUser(user.id);

  const { data: slot, error: slotError } = await service
    .from("slots")
    .select("id, status")
    .eq("id", parsed.data.slot_id)
    .eq("company_id", companyId)
    .single();

  if (slotError || !slot) {
    console.error("[cancelSlotAction] Failed to load slot:", slotError);
    return {
      status: "error",
      message: `Slot no longer exists: ${slotError?.message ?? 'Not found'}`,
    };
  }

  if (slot.status !== "open") {
    return {
      status: "error",
      message: "Only open broadcasts can be cancelled.",
    };
  }

  const { error: cancelError } = await service.rpc("cancel_slot", {
    _company_id: companyId,
    _slot_id: slot.id,
  });

  if (cancelError) {
    console.error("[cancelSlotAction] cancel_slot RPC error:", cancelError);
    return {
      status: "error",
      message: `Could not cancel the broadcast: ${cancelError.message}`,
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/logs");

  return {
    status: "success",
    message: "Broadcast cancelled.",
  };
}
