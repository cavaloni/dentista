"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface NotificationSettings {
  enableBrowserNotifications: boolean;
  enableSoundNotifications: boolean;
  autoConfirmBookings: boolean;
}

export interface BookingNotification {
  id: string;
  patientName: string;
  slotStart: string;
  duration: string;
  practiceName: string;
  slotId: string;
}

interface NotificationContextType {
  settings: NotificationSettings;
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
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<NotificationSettings>({
    enableBrowserNotifications: true,
    enableSoundNotifications: true,
    autoConfirmBookings: false,
  });
  const [currentBooking, setCurrentBooking] = useState<BookingNotification | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isToastOpen, setIsToastOpen] = useState(false);

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

  const playNotificationSound = () => {
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
  };

  const showBrowserNotification = (booking: BookingNotification) => {
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
  };

  const showBookingModal = (booking: BookingNotification) => {
    setCurrentBooking(booking);
    setIsModalOpen(true);
  };

  const showBookingToast = (booking: BookingNotification) => {
    setCurrentBooking(booking);
    setIsToastOpen(true);
  };

  const confirmBooking = (bookingId: string) => {
    // Here you would typically make an API call to confirm the booking
    console.log("Booking confirmed:", bookingId);
    setIsModalOpen(false);
    setCurrentBooking(null);
  };

  const rejectBooking = (bookingId: string) => {
    // Here you would typically make an API call to reject the booking
    console.log("Booking rejected:", bookingId);
    setIsModalOpen(false);
    setCurrentBooking(null);
  };

  const dismissToast = () => {
    setIsToastOpen(false);
    setCurrentBooking(null);
  };

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

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
      if (settings.autoConfirmBookings) {
        showBookingToast(booking);
      } else {
        showBookingModal(booking);
      }
    };

    window.addEventListener("booking-accepted", handleBookingAcceptedEvent as EventListener);
    return () => {
      window.removeEventListener("booking-accepted", handleBookingAcceptedEvent as EventListener);
    };
  }, [settings, playNotificationSound, showBrowserNotification, showBookingToast, showBookingModal]);

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