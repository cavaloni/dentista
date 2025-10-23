import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { formatInTimeZone } from "date-fns-tz";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildTakenMessage, queueOutboundMessage } from "@/lib/messaging";
import { normalizeAddress } from "@/lib/messaging/providers";

/**
 * POST /api/bookings/reject
 * 
 * Rejects a booking when user clicks "Go to Next Person" in the modal.
 * This moves to the next person in the waitlist wave.
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
      console.error("[Reject Booking] Claim not found:", claimError);
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Get company details for message templates
    const { data: company } = await supabase
      .from("companies")
      .select("name, timezone, taken_template")
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
      claimWindow: "10",
    };

    const normalizedAddress = normalizeAddress(member.channel, member.address);

    // Update claim status to 'cancelled'
    await supabase
      .from("claims")
      .update({ status: "cancelled" })
      .eq("id", claim.id);

    // Send "taken" message to the rejected claimant
    console.log("[Reject Booking] Sending rejection message to:", member.full_name);
    await queueOutboundMessage({
      practiceId: companyId,
      slotId: slot.id,
      claimId: claim.id,
      waitlistMemberId: member.id,
      channel: member.channel,
      templateKey: "slot_taken",
      body: buildTakenMessage(company.taken_template, inviteContext),
      to: normalizedAddress,
      idempotencyKey: `rejected:${claim.id}`,
      metadata: { reason: "rejected_by_user" },
    });

    // TODO: Optionally, move to next person in the waitlist
    // This would require calling the release_slot function with wave_number + 1

    console.log("[Reject Booking] Booking rejected successfully:", claim.id);

    // Revalidate dashboard to show updated data
    revalidatePath("/dashboard");

    return NextResponse.json({
      success: true,
      claimId: claim.id,
      slotId: slot.id,
    });
  } catch (error) {
    console.error("[Reject Booking] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
