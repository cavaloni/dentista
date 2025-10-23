"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Secure Real-time Booking Notification Listener
 * 
 * Uses a "notification queue" pattern for multi-tenant security:
 * 1. Subscribes to booking_notifications table (NO RLS - enables Realtime)
 * 2. Receives notification with only reference IDs (company_id, claim_id)
 * 3. Queries RLS-protected tables to fetch actual booking data
 * 4. RLS ensures users only see their own company's data
 * 
 * Security Model:
 * - Notification table has no RLS → Realtime broadcasts work
 * - Notification contains only IDs, no sensitive data
 * - Actual queries are RLS-protected
 * - Malicious users can't query other companies' data
 */
export function useBookingListener(companyId: string) {
  useEffect(() => {
    if (!companyId) return;

    const supabase = createSupabaseBrowserClient();

    // Track notified claim IDs to prevent duplicates
    const notifiedClaims = new Set<string>();

    console.log("[useBookingListener] Setting up notification subscription for company:", companyId);

    // Subscribe to booking_notifications table
    // This works because the table has NO RLS, allowing service role updates to broadcast
    const notificationSubscription = supabase
      .channel(`booking-notifications-${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "booking_notifications",
          filter: `company_id=eq.${companyId}`,
        },
        async (payload) => {
          const claimId = payload.new.claim_id as string;
          
          // Prevent duplicate notifications
          if (notifiedClaims.has(claimId)) {
            console.log("[useBookingListener] Duplicate notification ignored:", claimId);
            return;
          }
          notifiedClaims.add(claimId);

          console.log("[useBookingListener] Booking notification received:", {
            claimId,
            companyId: payload.new.company_id,
            createdAt: payload.new.created_at,
          });

          await handleBookingNotification(claimId);
        }
      )
      .subscribe((status, error) => {
        if (error) {
          console.error("[useBookingListener] Subscription error:", error);
        } else {
          console.log("[useBookingListener] Subscription status:", status);
        }
      });

    // Query booking details using RLS-protected tables
    async function handleBookingNotification(claimId: string) {
      try {
        console.log("[useBookingListener] Fetching booking details for claim:", claimId);

        // This query is RLS-protected - user can only query their own company's data
        const { data: claim, error } = await supabase
          .from("claims")
          .select(`
            id,
            slot_id,
            status,
            company_id,
            waitlist_members!waitlist_member_id(
              full_name
            ),
            slots!slot_id(
              start_at,
              duration_minutes,
              company_id
            )
          `)
          .eq("id", claimId)
          .single();

        // Fetch company details separately to avoid relationship issues
        let companyName = "Practice";
        if (claim && claim.company_id) {
          const { data: company } = await supabase
            .from("companies")
            .select("name")
            .eq("id", claim.company_id)
            .single();
          
          if (company) {
            companyName = company.name;
          }
        }

        if (error) {
          console.error("[useBookingListener] Error fetching claim details:", error);
          return;
        }

        if (!claim) {
          console.warn("[useBookingListener] Claim not found (RLS may have blocked access):", claimId);
          return;
        }

        // Validate we have all required data
        if (
          !claim.waitlist_members ||
          !claim.slots
        ) {
          console.warn("[useBookingListener] Incomplete booking data:", {
            claim,
            hasWaitlistMember: !!claim.waitlist_members,
            hasSlot: !!claim.slots,
          });
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const member = claim.waitlist_members as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const slot = claim.slots as any;

        const bookingData = {
          id: claim.id,
          patientName: member.full_name,
          slotStart: new Date(slot.start_at).toLocaleString(),
          duration: slot.duration_minutes.toString(),
          practiceName: companyName,
          slotId: claim.slot_id,
        };

        console.log("[useBookingListener] Dispatching booking-accepted event:", bookingData);

        // Dispatch custom event for the notification context to handle
        window.dispatchEvent(
          new CustomEvent("booking-accepted", { detail: bookingData })
        );
      } catch (error) {
        console.error("[useBookingListener] Error handling booking notification:", error);
      }
    }

    return () => {
      console.log("[useBookingListener] Cleaning up subscription");
      notificationSubscription.unsubscribe();
    };
  }, [companyId]);
}