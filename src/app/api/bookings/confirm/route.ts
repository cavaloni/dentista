import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { formatInTimeZone } from "date-fns-tz";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildConfirmationMessage,
  buildTakenMessage,
  queueOutboundMessage,
} from "@/lib/messaging";
import { normalizeAddress } from "@/lib/messaging/providers";

/**
 * POST /api/bookings/confirm
 * 
 * Confirms a booking after user approval in the modal.
 * This sends the confirmation message to the patient and "taken" messages to others.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's company
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: "No company found" }, { status: 403 });
    }

    const companyId = profile.company_id;

    // Parse request body
    const { claimId } = await request.json();
    if (!claimId) {
      return NextResponse.json({ error: "Missing claimId" }, { status: 400 });
    }

    // Fetch claim with all related data
    const { data: claim, error: claimError } = await supabase
      .from("claims")
      .select(`
        id,
        status,
        slot_id,
        company_id,
        waitlist_members!claims_waitlist_member_id_fkey(
          id,
          full_name,
          channel,
          address
        ),
        slots!claims_slot_id_fkey(
          id,
          start_at,
          duration_minutes,
          status,
          company_id
        )
      `)
      .eq("id", claimId)
      .eq("company_id", companyId)
      .single();

    if (claimError || !claim) {
      console.error("[Confirm Booking] Claim not found:", claimError);
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Verify claim is in 'won' status
    if (claim.status !== "won") {
      return NextResponse.json(
        { error: `Claim is not in 'won' status (current: ${claim.status})` },
        { status: 400 }
      );
    }

    // Get company details for message templates
    const { data: company } = await supabase
      .from("companies")
      .select("name, timezone, confirmation_template, taken_template")
      .eq("id", companyId)
      .single();

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const member = claim.waitlist_members as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const slot = claim.slots as any;

    // Format slot time
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
      claimWindow: "10", // Default, not critical for confirmation
    };

    const normalizedAddress = normalizeAddress(member.channel, member.address);

    // Send confirmation message to the winner
    console.log("[Confirm Booking] Sending confirmation message to:", member.full_name);
    await queueOutboundMessage({
      practiceId: companyId,
      slotId: slot.id,
      claimId: claim.id,
      waitlistMemberId: member.id,
      channel: member.channel,
      templateKey: "slot_confirmed",
      body: buildConfirmationMessage(company.confirmation_template, inviteContext),
      to: normalizedAddress,
      idempotencyKey: `confirm:${claim.id}`,
      metadata: { claim_status: "won", confirmed_by_user: true },
    });

    // Update slot status to 'booked'
    await supabase
      .from("slots")
      .update({ status: "booked" })
      .eq("id", slot.id);

    // Send "taken" messages to other claimants
    const { data: others } = await supabase
      .from("claims")
      .select("id, waitlist_member_id, waitlist_members(id, channel, address, full_name)")
      .neq("id", claim.id);

    if (others && others.length > 0) {
      console.log(`[Confirm Booking] Sending "taken" messages to ${others.length} other claimants`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await Promise.all((others as any[]).map(async (other: any) => {
          if (!other?.waitlist_members) return;
          await queueOutboundMessage({
            practiceId: companyId,
            slotId: slot.id,
            claimId: other.id,
            waitlistMemberId: other.waitlist_member_id,
            channel: other.waitlist_members.channel,
            templateKey: "slot_taken",
            body: buildTakenMessage(company.taken_template, {
              ...inviteContext,
              patientName: other.waitlist_members.full_name,
            }),
            to: normalizeAddress(
              other.waitlist_members.channel,
              other.waitlist_members.address
            ),
            idempotencyKey: `taken:${other.id}`,
            metadata: { reason: "winner_confirmed" },
          });
        })
      );
    }

    console.log("[Confirm Booking] Booking confirmed successfully:", claim.id);

    // Revalidate dashboard to show updated data
    revalidatePath("/dashboard");

    return NextResponse.json({
      success: true,
      claimId: claim.id,
      slotId: slot.id,
    });
  } catch (error) {
    console.error("[Confirm Booking] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
