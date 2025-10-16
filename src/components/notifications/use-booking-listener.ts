"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";


export function useBookingListener(practiceId: string) {
  useEffect(() => {
    if (!practiceId) return;

    const supabase = createSupabaseBrowserClient();

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

          // Only trigger when slot status changes to 'booked' from something else
          if (newStatus === "booked" && oldStatus !== "booked") {
            console.log("Booking accepted event:", payload);

            try {
              // Get the claim details to find the patient information
              const { data: claim } = await supabase
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
                .eq("slot_id", payload.new.id)
                .eq("status", "won")
                .single();

              if (claim && claim.waitlist_members && claim.slots && claim.slots.practices) {
                const bookingData = {
                  id: claim.id,
                  patientName: claim.waitlist_members.full_name,
                  slotStart: new Date(claim.slots.start_at).toLocaleString(),
                  duration: claim.slots.duration_minutes.toString(),
                  practiceName: claim.slots.practices.name,
                  slotId: claim.slot_id,
                };

                // Dispatch custom event for the notification context to handle
                window.dispatchEvent(
                  new CustomEvent("booking-accepted", { detail: bookingData })
                );
              }
            } catch (error) {
              console.error("Error fetching booking details:", error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      slotsSubscription.unsubscribe();
    };
  }, [practiceId]);
}