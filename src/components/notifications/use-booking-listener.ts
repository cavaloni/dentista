"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";


export function useBookingListener(practiceId: string) {
  useEffect(() => {
    if (!practiceId) return;

    const supabase = createSupabaseBrowserClient();

    // Track notified events to prevent duplicates
    const notifiedEvents = new Set<string>();

    // Listen for changes on the slots table
    const slotsSubscription = supabase
      .channel(`slots-${practiceId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "slots",
          filter: `practice_id=eq.${practiceId}`,
        },
        async (payload) => {
          const newStatus = payload.new.status;
          const oldStatus = payload.old.status;
          const eventKey = `${payload.new.id}-${newStatus}`;

          // Trigger when slot status changes to either 'claimed' or 'booked'
          // 'claimed' happens when database function runs (real booking acceptance)
          // 'booked' happens when inbound message processing completes
          if (
            (newStatus === "claimed" && oldStatus !== "claimed") ||
            (newStatus === "booked" && oldStatus !== "booked")
          ) {
            // Prevent duplicate notifications
            if (notifiedEvents.has(eventKey)) {
              return;
            }
            notifiedEvents.add(eventKey);

            console.log("Booking accepted event (slots table):", {
              slotId: payload.new.id,
              status: newStatus,
              oldStatus: oldStatus,
              claimedClaimId: payload.new.claimed_claim_id,
            });

            await handleBookingNotification(payload.new.id, newStatus, payload.new.claimed_claim_id);
          }
        }
      )
      .subscribe();

    // Also listen for claim status changes as a fallback
    const claimsSubscription = supabase
      .channel(`claims-${practiceId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "claims",
          filter: `practice_id=eq.${practiceId}`,
        },
        async (payload) => {
          const newStatus = payload.new.status;
          const oldStatus = payload.old.status;
          const eventKey = `${payload.new.slot_id}-${payload.new.id}`;

          // Trigger when claim status changes to 'won'
          if (newStatus === "won" && oldStatus !== "won") {
            // Prevent duplicate notifications
            if (notifiedEvents.has(eventKey)) {
              return;
            }
            notifiedEvents.add(eventKey);

            console.log("Booking accepted event (claims table):", {
              claimId: payload.new.id,
              slotId: payload.new.slot_id,
              status: newStatus,
              oldStatus: oldStatus,
            });

            await handleBookingNotification(payload.new.slot_id, "won", payload.new.id);
          }
        }
      )
      .subscribe();

    // Helper function to handle booking notification logic
    async function handleBookingNotification(slotId: string, source: string, claimId?: string) {
      try {
        // Get the claim details to find the patient information
        const claimQuery = supabase
          .from("claims")
          .select(`
            *,
            waitlist_members(full_name),
            slots(
              start_at,
              duration_minutes,
              practices(name, timezone)
            )
          `)
          .eq("slot_id", slotId);

        // Use the claim ID if we have it, otherwise find the 'won' claim
        if (claimId) {
          claimQuery.eq("id", claimId);
        } else {
          claimQuery.eq("status", "won");
        }

        const { data: claim } = await claimQuery.single();

        if (claim && claim.waitlist_members && claim.slots && claim.slots.practices) {
          const bookingData = {
            id: claim.id,
            patientName: claim.waitlist_members.full_name,
            slotStart: new Date(claim.slots.start_at).toLocaleString(),
            duration: claim.slots.duration_minutes.toString(),
            practiceName: claim.slots.practices.name,
            slotId: claim.slot_id,
          };

          console.log("Dispatching booking-accepted event:", bookingData);

          // Dispatch custom event for the notification context to handle
          window.dispatchEvent(
            new CustomEvent("booking-accepted", { detail: bookingData })
          );
        } else {
          console.warn("Could not find complete booking details:", {
            claim,
            hasWaitlistMember: !!claim?.waitlist_members,
            hasSlot: !!claim?.slots,
            hasPractice: !!claim?.slots?.practices,
          });
        }
      } catch (error) {
        console.error("Error fetching booking details:", error);
      }
    }

    return () => {
      slotsSubscription.unsubscribe();
      claimsSubscription.unsubscribe();
    };
  }, [practiceId]);
}