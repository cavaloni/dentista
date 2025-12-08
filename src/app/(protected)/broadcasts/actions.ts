'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formatInTimeZone, zonedTimeToUtc } from "date-fns-tz";
import { z } from "zod";

import { ensureCompanyForUser } from "@/lib/practice";
import { buildInviteMessage, queueOutboundMessage } from "@/lib/messaging";
import { normalizeAddress } from "@/lib/messaging/providers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type {
  Broadcast,
  BroadcastDetail,
  BroadcastPatient,
  BroadcastActionState,
  WaitlistMember,
} from "@/app/(protected)/waitlist/shared";

const createBroadcastSchema = z.object({
  start_at: z.string().min(1),
  duration_minutes: z.coerce.number().int().positive(),
  notes: z.string().max(500).optional(),
});

async function getContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const companyId = await ensureCompanyForUser(user.id);
  const service = createSupabaseServiceClient();

  return { supabase, service, companyId, userId: user.id } as const;
}

/**
 * Create a new broadcast in draft status
 * Does NOT auto-assign patients or send invites
 */
export async function createBroadcastAction(
  _prev: BroadcastActionState,
  formData: FormData
): Promise<BroadcastActionState> {
  const parsed = createBroadcastSchema.safeParse({
    start_at: formData.get("start_at"),
    duration_minutes: formData.get("duration_minutes"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the form fields.",
    };
  }

  const { service, companyId, userId } = await getContext();

  const { data: company, error: companyError } = await service
    .from("companies")
    .select("id, timezone, claim_window_minutes")
    .eq("id", companyId)
    .single();

  if (companyError || !company) {
    return {
      status: "error",
      message: "Unable to load company settings.",
    };
  }

  const startLocal = `${parsed.data.start_at}`;
  const startUtc = zonedTimeToUtc(startLocal, company.timezone);

  // For drafts, set expires_at to the slot start time (won't be used until broadcast starts)
  const draftExpiresAt = startUtc.toISOString();

  const { data: slot, error } = await service
    .from("slots")
    .insert({
      company_id: companyId,
      start_at: startUtc.toISOString(),
      duration_minutes: parsed.data.duration_minutes,
      notes: parsed.data.notes ?? null,
      status: "draft",
      wave_number: 0,
      claim_window_minutes: company.claim_window_minutes,
      expires_at: draftExpiresAt,
      released_by: userId,
    })
    .select("id, start_at, duration_minutes, status, notes, wave_number, claim_window_minutes, created_at")
    .single();

  if (error || !slot) {
    console.error("[createBroadcastAction] Failed to create broadcast:", error);
    return {
      status: "error",
      message: `Unable to create broadcast: ${error?.message ?? "Unknown error"}`,
    };
  }

  revalidatePath("/broadcasts");
  return {
    status: "success",
    message: "Broadcast created in draft mode.",
    broadcast: {
      ...slot,
      expires_at: draftExpiresAt,
      assigned_count: 0,
      notified_count: 0,
      pending_count: 0,
      winner_name: null,
      winner_id: null,
    } as Broadcast,
  };
}

/**
 * Get all broadcasts with assignment counts and winner information
 */
export async function getAllBroadcastsAction(): Promise<Broadcast[]> {
  const { supabase, companyId } = await getContext();

  const { data: slots } = await supabase
    .from("slots")
    .select(`
      id,
      start_at,
      duration_minutes,
      status,
      notes,
      wave_number,
      expires_at,
      claim_window_minutes,
      created_at,
      winner_claims:claims(
        status,
        waitlist_members(
          id,
          full_name
        )
      )
    `)
    .eq("company_id", companyId)
    .in("status", ["draft", "open", "claimed", "expired", "booked", "cancelled"])
    .order("start_at", { ascending: true });

  if (!slots) return [];

  // Get assignment counts for each broadcast
  const slotsWithCounts = await Promise.all(
    slots.map(async (slot) => {
      const { count: assignedCount } = await supabase
        .from("broadcast_assignments")
        .select("*", { count: "exact", head: true })
        .eq("slot_id", slot.id)
        .is("removed_at", null);

      const { count: notifiedCount } = await supabase
        .from("claims")
        .select("*", { count: "exact", head: true })
        .eq("slot_id", slot.id);

      const { count: pendingCount } = await supabase
        .from("claims")
        .select("*", { count: "exact", head: true })
        .eq("slot_id", slot.id)
        .eq("status", "pending");

      // Extract winner information for booked broadcasts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const winnerClaims = (slot as any).winner_claims;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const winningClaim = winnerClaims?.find((claim: any) =>
        claim.status === 'won' && claim.waitlist_members
      );
      const winner = winningClaim?.waitlist_members;

      return {
        ...slot,
        winner_name: winner?.full_name || null,
        winner_id: winner?.id || null,
        assigned_count: assignedCount ?? 0,
        notified_count: notifiedCount ?? 0,
        pending_count: pendingCount ?? 0,
      } as Broadcast;
    })
  );

  return slotsWithCounts;
}

/**
 * Get detailed information about a specific broadcast
 */
export async function getBroadcastDetailAction(
  broadcastId: string
): Promise<BroadcastDetail | null> {
  const { supabase, companyId } = await getContext();

  const { data: slot, error } = await supabase
    .from("slots")
    .select(`
      id,
      start_at,
      duration_minutes,
      status,
      notes,
      wave_number,
      expires_at,
      claim_window_minutes,
      created_at
    `)
    .eq("id", broadcastId)
    .eq("company_id", companyId)
    .single();

  if (error || !slot) {
    console.error("[getBroadcastDetailAction] Broadcast not found:", error);
    return null;
  }

  // Get assigned patients with their claim status
  const { data: assignments } = await supabase
    .from("broadcast_assignments")
    .select(`
      assigned_at,
      waitlist_members (
        id,
        full_name,
        channel,
        address,
        priority
      )
    `)
    .eq("slot_id", broadcastId)
    .is("removed_at", null)
    .order("assigned_at", { ascending: true });

  if (!assignments) {
    return {
      ...slot,
      assigned_count: 0,
      notified_count: 0,
      pending_count: 0,
      patients: [],
      winner_name: null,
      winner_id: null,
    };
  }

  // Get claim information for each patient
  const patients: BroadcastPatient[] = await Promise.all(
    assignments.map(async (assignment) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const member = (assignment as any).waitlist_members;

      const { data: claim } = await supabase
        .from("claims")
        .select("status, wave_number, notified_at")
        .eq("slot_id", broadcastId)
        .eq("waitlist_member_id", member.id)
        .maybeSingle();

      return {
        id: member.id,
        full_name: member.full_name,
        channel: member.channel,
        address: member.address,
        priority: member.priority,
        assigned_at: assignment.assigned_at,
        notified_at: claim?.notified_at ?? null,
        claim_status: claim?.status ?? null,
        wave_number: claim?.wave_number ?? null,
      };
    })
  );

  const notifiedCount = patients.filter((p) => p.notified_at !== null).length;
  const pendingCount = patients.filter((p) => p.claim_status === "pending").length;

  return {
    ...slot,
    assigned_count: patients.length,
    notified_count: notifiedCount,
    pending_count: pendingCount,
    patients,
    winner_name: null,
    winner_id: null,
  };
}

/**
 * Assign patients to a broadcast
 */
export async function assignPatientsToBroadcastAction(
  broadcastId: string,
  patientIds: string[]
): Promise<{ success: boolean; message: string; assigned: number }> {
  const { service, companyId, userId } = await getContext();

  if (patientIds.length === 0) {
    return { success: false, message: "No patients selected", assigned: 0 };
  }

  // Verify broadcast exists and is in draft or open status
  const { data: slot, error: slotError } = await service
    .from("slots")
    .select("id, status")
    .eq("id", broadcastId)
    .eq("company_id", companyId)
    .single();

  if (slotError || !slot) {
    return { success: false, message: "Broadcast not found", assigned: 0 };
  }

  if (!["draft", "open"].includes(slot.status)) {
    return {
      success: false,
      message: "Can only assign patients to draft or active broadcasts",
      assigned: 0,
    };
  }

  // Insert assignments (will skip duplicates due to unique constraint)
  const assignments = patientIds.map((patientId) => ({
    company_id: companyId,
    slot_id: broadcastId,
    waitlist_member_id: patientId,
    assigned_by: userId,
  }));

  const { data, error } = await service
    .from("broadcast_assignments")
    .upsert(assignments, { onConflict: "slot_id,waitlist_member_id" })
    .select("id");

  if (error) {
    console.error("[assignPatientsToBroadcastAction] Failed:", error);
    return {
      success: false,
      message: `Failed to assign patients: ${error.message}`,
      assigned: 0,
    };
  }

  revalidatePath("/broadcasts");
  revalidatePath("/waitlist");

  return {
    success: true,
    message: `${data?.length ?? 0} patient(s) assigned`,
    assigned: data?.length ?? 0,
  };
}

/**
 * Remove a patient from a broadcast (soft delete)
 */
export async function removePatientFromBroadcastAction(
  broadcastId: string,
  patientId: string
): Promise<{ success: boolean; message: string }> {
  const { service, companyId } = await getContext();

  const { error } = await service
    .from("broadcast_assignments")
    .update({ removed_at: new Date().toISOString() })
    .eq("slot_id", broadcastId)
    .eq("waitlist_member_id", patientId)
    .eq("company_id", companyId)
    .is("removed_at", null);

  if (error) {
    console.error("[removePatientFromBroadcastAction] Failed:", error);
    return { success: false, message: "Failed to remove patient" };
  }

  revalidatePath("/broadcasts");
  revalidatePath("/waitlist");

  return { success: true, message: "Patient removed from broadcast" };
}

/**
 * Start a broadcast (draft → open) and send invites to assigned patients
 */
export async function startBroadcastAction(
  broadcastId: string
): Promise<BroadcastActionState> {
  const { service, companyId } = await getContext();

  // Get broadcast details
  const { data: slot, error: slotError } = await service
    .from("slots")
    .select("id, status, start_at, duration_minutes, claim_window_minutes")
    .eq("id", broadcastId)
    .eq("company_id", companyId)
    .single();

  if (slotError || !slot) {
    return { status: "error", message: "Broadcast not found" };
  }

  if (slot.status !== "draft") {
    return { status: "error", message: "Only draft broadcasts can be started" };
  }

  // Get assigned patients
  const { data: assignments } = await service
    .from("broadcast_assignments")
    .select(`
      waitlist_member_id,
      waitlist_members (
        id,
        full_name,
        channel,
        address
      )
    `)
    .eq("slot_id", broadcastId)
    .is("removed_at", null);

  if (!assignments || assignments.length === 0) {
    return {
      status: "warning",
      message: "Cannot start broadcast with no assigned patients",
    };
  }

  // Get company info for messaging
  const { data: company } = await service
    .from("companies")
    .select("id, name, timezone, invite_template")
    .eq("id", companyId)
    .single();

  if (!company) {
    return { status: "error", message: "Company settings not found" };
  }

  // Update slot to open status
  const expiresAt = new Date(
    Date.now() + slot.claim_window_minutes * 60 * 1000
  ).toISOString();

  const { error: updateError } = await service
    .from("slots")
    .update({
      status: "open",
      wave_number: 1,
      expires_at: expiresAt,
    })
    .eq("id", broadcastId);

  if (updateError) {
    console.error("[startBroadcastAction] Failed to update slot:", updateError);
    return { status: "error", message: "Failed to start broadcast" };
  }

  // Create claims for all assigned patients
  const nowIso = new Date().toISOString();
  const claims = assignments.map((assignment) => ({
    company_id: companyId,
    slot_id: broadcastId,
    waitlist_member_id: assignment.waitlist_member_id,
    status: "pending" as const,
    wave_number: 1,
    notified_at: nowIso,
  }));

  const { data: createdClaims, error: claimError } = await service
    .from("claims")
    .insert(claims)
    .select("id, waitlist_member_id");

  if (claimError || !createdClaims) {
    console.error("[startBroadcastAction] Failed to create claims:", claimError);
    return { status: "error", message: "Failed to create invitations" };
  }

  // Update last_notified_at for patients
  await service
    .from("waitlist_members")
    .update({ last_notified_at: nowIso })
    .in(
      "id",
      assignments.map((a) => a.waitlist_member_id)
    );

  // Send invites
  const invitePromises = createdClaims.map(async (claim) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assignment = assignments.find((a) => a.waitlist_member_id === claim.waitlist_member_id) as any;
    const member = assignment?.waitlist_members;

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
      claimWindow: `${slot.claim_window_minutes}`,
    });

    await queueOutboundMessage({
      practiceId: companyId,
      slotId: broadcastId,
      claimId: claim.id,
      waitlistMemberId: member.id,
      channel: member.channel,
      templateKey: "slot_invite",
      body: inviteBody,
      to: normalizeAddress(member.channel, member.address),
      idempotencyKey: `invite:${claim.id}`,
      metadata: {
        wave_number: 1,
        slot_start: slot.start_at,
      },
    });
  });

  await Promise.all(invitePromises);

  revalidatePath("/broadcasts");
  revalidatePath("/dashboard");

  return {
    status: "success",
    message: `Broadcast started. ${createdClaims.length} invitation(s) sent.`,
  };
}

/**
 * Delete a draft broadcast
 */
export async function deleteBroadcastAction(
  broadcastId: string
): Promise<{ success: boolean; message: string }> {
  const { service, companyId } = await getContext();

  const { data: slot, error: slotError } = await service
    .from("slots")
    .select("id, status")
    .eq("id", broadcastId)
    .eq("company_id", companyId)
    .single();

  if (slotError || !slot) {
    return { success: false, message: "Broadcast not found" };
  }

  if (slot.status !== "draft") {
    return { success: false, message: "Only draft broadcasts can be deleted" };
  }

  const { error } = await service
    .from("slots")
    .delete()
    .eq("id", broadcastId)
    .eq("company_id", companyId);

  if (error) {
    console.error("[deleteBroadcastAction] Failed:", error);
    return { success: false, message: "Failed to delete broadcast" };
  }

  revalidatePath("/broadcasts");

  return { success: true, message: "Broadcast deleted" };
}

/**
 * Cancel an active broadcast
 * Sets status to cancelled and cancels all pending claims
 */
export async function cancelBroadcastAction(
  broadcastId: string
): Promise<{ success: boolean; message: string }> {
  const { service, companyId } = await getContext();

  const { data: slot, error: slotError } = await service
    .from("slots")
    .select("id, status")
    .eq("id", broadcastId)
    .eq("company_id", companyId)
    .single();

  if (slotError || !slot) {
    return { success: false, message: "Broadcast not found" };
  }

  if (!["open", "claimed"].includes(slot.status)) {
    return {
      success: false,
      message: "Only active broadcasts can be cancelled"
    };
  }

  // Cancel all pending claims for this broadcast
  const { error: claimsError } = await service
    .from("claims")
    .update({ status: "cancelled" })
    .eq("slot_id", broadcastId)
    .eq("status", "pending");

  if (claimsError) {
    console.error("[cancelBroadcastAction] Failed to cancel claims:", claimsError);
    return { success: false, message: "Failed to cancel pending claims" };
  }

  // Update broadcast status to cancelled
  const { error: updateError } = await service
    .from("slots")
    .update({ status: "cancelled" })
    .eq("id", broadcastId)
    .eq("company_id", companyId);

  if (updateError) {
    console.error("[cancelBroadcastAction] Failed to cancel broadcast:", updateError);
    return { success: false, message: "Failed to cancel broadcast" };
  }

  revalidatePath("/broadcasts");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: "Broadcast cancelled. All pending claims have been cancelled."
  };
}

/**
 * Duplicate an existing broadcast
 * Creates a new draft with the same patients and settings
 */
export async function duplicateBroadcastAction(
  sourceBroadcastId: string
): Promise<BroadcastActionState> {
  const { service, companyId, userId } = await getContext();

  // Get source broadcast details
  const { data: sourceBroadcast, error: sourceError } = await service
    .from("slots")
    .select("id, duration_minutes, notes, claim_window_minutes")
    .eq("id", sourceBroadcastId)
    .eq("company_id", companyId)
    .single();

  if (sourceError || !sourceBroadcast) {
    return {
      status: "error",
      message: "Source broadcast not found",
    };
  }

  // Get assigned patients from source broadcast
  const { data: sourceAssignments } = await service
    .from("broadcast_assignments")
    .select("waitlist_member_id")
    .eq("slot_id", sourceBroadcastId)
    .is("removed_at", null);

  const patientIds = sourceAssignments?.map((a) => a.waitlist_member_id) ?? [];

  // Create new draft broadcast with placeholder start time (user will set this)
  const draftStartTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Tomorrow

  const { data: newBroadcast, error: createError } = await service
    .from("slots")
    .insert({
      company_id: companyId,
      start_at: draftStartTime,
      duration_minutes: sourceBroadcast.duration_minutes,
      notes: sourceBroadcast.notes,
      status: "draft",
      wave_number: 0,
      claim_window_minutes: sourceBroadcast.claim_window_minutes,
      expires_at: draftStartTime,
      released_by: userId,
    })
    .select("id, start_at, duration_minutes, status, notes, wave_number, claim_window_minutes, created_at")
    .single();

  if (createError || !newBroadcast) {
    console.error("[duplicateBroadcastAction] Failed to create broadcast:", createError);
    return {
      status: "error",
      message: `Unable to duplicate broadcast: ${createError?.message ?? "Unknown error"}`,
    };
  }

  // Copy patient assignments if there were any
  if (patientIds.length > 0) {
    const assignments = patientIds.map((patientId) => ({
      company_id: companyId,
      slot_id: newBroadcast.id,
      waitlist_member_id: patientId,
      assigned_by: userId,
    }));

    const { error: assignError } = await service
      .from("broadcast_assignments")
      .insert(assignments);

    if (assignError) {
      console.error("[duplicateBroadcastAction] Failed to assign patients:", assignError);
      // Continue anyway - broadcast was created, just without assignments
    }
  }

  revalidatePath("/broadcasts");

  return {
    status: "success",
    message: `Broadcast duplicated with ${patientIds.length} patient(s). Update the start time and click Start when ready.`,
    broadcast: {
      ...newBroadcast,
      expires_at: draftStartTime,
      assigned_count: patientIds.length,
      notified_count: 0,
      pending_count: 0,
      winner_name: null,
      winner_id: null,
    } as Broadcast,
  };
}

/**
 * Get patients available for assignment to a broadcast
 * Returns all waitlist members NOT currently assigned to this broadcast
 */
export async function getAvailablePatientsAction(
  broadcastId: string
): Promise<WaitlistMember[]> {
  const { supabase, companyId } = await getContext();

  // Get all waitlist members
  const { data: allMembers } = await supabase
    .from("waitlist_members")
    .select("id, full_name, channel, address, priority, active, notes, last_notified_at")
    .eq("company_id", companyId)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  if (!allMembers) return [];

  // Get currently assigned patient IDs for this broadcast
  const { data: assignments } = await supabase
    .from("broadcast_assignments")
    .select("waitlist_member_id")
    .eq("slot_id", broadcastId)
    .is("removed_at", null);

  const assignedIds = new Set(
    assignments?.map((a) => a.waitlist_member_id) ?? []
  );

  // Filter out already assigned patients
  return (allMembers as WaitlistMember[]).filter(
    (member) => !assignedIds.has(member.id)
  );
}
