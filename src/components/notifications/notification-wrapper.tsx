"use client";
import { NotificationProvider } from "./notification-context";
import { BookingModal } from "./booking-modal";
import { BookingToast } from "./booking-toast";
import { useBookingListener } from "./use-booking-listener";
import { usePractice } from "@/components/practice-context";

function NotificationComponents() {
  const practice = usePractice();
  useBookingListener(practice.id);

  return (
    <>
      <BookingModal />
      <BookingToast />
    </>
  );
}

export function NotificationWrapper({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      {children}
      <NotificationComponents />
    </NotificationProvider>
  );
}