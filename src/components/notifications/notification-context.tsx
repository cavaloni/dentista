"use client";

import { createContext, useContext, useEffect, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";

import {
  type BookingNotification,
  selectSettings,
  useNotificationStore,
} from "@/stores/notifications";

interface NotificationContextType {
  settings: ReturnType<typeof selectSettings>;
  requestNotificationPermission: () => Promise<boolean>;
  playNotificationSound: () => void;
  showBookingModal: (booking: BookingNotification) => void;
  showBookingToast: (booking: BookingNotification) => void;
  currentBooking: BookingNotification | null;
  isModalOpen: boolean;
  isToastOpen: boolean;
  confirmBooking: (bookingId: string) => void;
  rejectBooking: (bookingId: string) => void;
  dismissToast: () => void;
  updateSettings: (newSettings: Partial<ReturnType<typeof selectSettings>>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const settings = useNotificationStore(selectSettings);
  const currentBooking = useNotificationStore((state) => state.currentBooking);
  const isModalOpen = useNotificationStore((state) => state.isModalOpen);
  const isToastOpen = useNotificationStore((state) => state.isToastOpen);
  const setSettings = useNotificationStore((state) => state.setSettings);
  const showModal = useNotificationStore((state) => state.showModal);
  const showToast = useNotificationStore((state) => state.showToast);
  const closeModal = useNotificationStore((state) => state.closeModal);
  const closeToast = useNotificationStore((state) => state.closeToast);
  const handleBookingNotification = useNotificationStore((state) => state.handleBookingNotification);

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  };

  const playNotificationSound = useCallback(() => {
    if (!settings.enableSoundNotifications) return;

    try {
      const audio = new Audio("/sounds/notification.mp3");
      audio.volume = 0.5;
      audio.play().catch((error) => {
        console.warn("Failed to play notification sound:", error);
      });
    } catch (error) {
      console.warn("Failed to create audio element:", error);
    }
  }, [settings.enableSoundNotifications]);

  const showBookingModal = useCallback(
    (booking: BookingNotification) => {
      showModal(booking);
    },
    [showModal]
  );

  const showBookingToast = useCallback(
    (booking: BookingNotification) => {
      showToast(booking);
    },
    [showToast]
  );

  const showBrowserNotification = useCallback(
    (booking: BookingNotification) => {
      if (!settings.enableBrowserNotifications) return;

      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        const notification = new Notification("Booking Accepted! 🎉", {
          body: `${booking.patientName} has accepted the appointment at ${booking.slotStart}`,
          icon: "/icons/notification-icon.png",
          badge: "/icons/notification-badge.png",
          tag: booking.id,
          requireInteraction: true,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
          showBookingModal(booking);
        };

        // Auto-close after 10 seconds
        setTimeout(() => {
          notification.close();
        }, 10000);
      }
    },
    [settings.enableBrowserNotifications, showBookingModal]
  );

  const confirmBooking = async (bookingId: string) => {
    console.log("[NotificationContext] Confirming booking:", bookingId);

    try {
      const response = await fetch("/api/bookings/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId: bookingId }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("[NotificationContext] Failed to confirm booking:", error);
        // TODO: Show error toast to user
        return;
      }

      const result = await response.json();
      console.log("[NotificationContext] Booking confirmed successfully:", result);

      // Close modal
      closeModal();
      
      // Refresh dashboard to show updated slot status and recent activity
      console.log("[NotificationContext] Refreshing dashboard...");
      router.refresh();
      
      // TODO: Show success toast
    } catch (error) {
      console.error("[NotificationContext] Error confirming booking:", error);
      // TODO: Show error toast to user
    }
  };

  const rejectBooking = async (bookingId: string) => {
    console.log("[NotificationContext] Rejecting booking:", bookingId);

    try {
      const response = await fetch("/api/bookings/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId: bookingId }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("[NotificationContext] Failed to reject booking:", error);
        // TODO: Show error toast to user
        return;
      }

      const result = await response.json();
      console.log("[NotificationContext] Booking rejected successfully:", result);

      // Close modal
      closeModal();
      
      // Refresh dashboard to show updated slot status and recent activity
      console.log("[NotificationContext] Refreshing dashboard...");
      router.refresh();
      
      // TODO: Show info toast about moving to next person
    } catch (error) {
      console.error("[NotificationContext] Error rejecting booking:", error);
      // TODO: Show error toast to user
    }
  };

  const dismissToast = useCallback(() => {
    closeToast();
  }, [closeToast]);

  const updateSettings = useCallback(
    (newSettings: Partial<ReturnType<typeof selectSettings>>) => {
      setSettings(newSettings);
    },
    [setSettings]
  );

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      requestNotificationPermission();
    }
  }, []);

  // Listen for booking accepted events
  useEffect(() => {
    const handleBookingAcceptedEvent = (event: CustomEvent) => {
      const booking = event.detail as BookingNotification;

      // Play sound regardless of notification type
      playNotificationSound();

      // Show browser notification
      showBrowserNotification(booking);

      // Show either modal or toast based on auto-confirm setting
      handleBookingNotification(booking);
    };

    window.addEventListener("booking-accepted", handleBookingAcceptedEvent as EventListener);
    return () => {
      window.removeEventListener("booking-accepted", handleBookingAcceptedEvent as EventListener);
    };
  }, [handleBookingNotification, playNotificationSound, showBrowserNotification]);

  const value: NotificationContextType = {
    settings,
    requestNotificationPermission,
    playNotificationSound,
    showBookingModal,
    showBookingToast,
    currentBooking,
    isModalOpen,
    isToastOpen,
    confirmBooking,
    rejectBooking,
    dismissToast,
    updateSettings,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}