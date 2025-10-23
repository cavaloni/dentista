"use client";

import { create } from "zustand";

export type BookingNotification = {
  id: string;
  patientName: string;
  slotStart: string;
  duration: string;
  practiceName: string;
  slotId: string;
};

export type NotificationSettings = {
  enableBrowserNotifications: boolean;
  enableSoundNotifications: boolean;
  autoConfirmBookings: boolean;
};

type NotificationState = {
  settings: NotificationSettings;
  currentBooking: BookingNotification | null;
  isModalOpen: boolean;
  isToastOpen: boolean;
  soundUnlocked: boolean;
  setSettings: (settings: Partial<NotificationSettings>) => void;
  setCurrentBooking: (booking: BookingNotification | null) => void;
  showModal: (booking: BookingNotification) => void;
  showToast: (booking: BookingNotification) => void;
  closeModal: () => void;
  closeToast: () => void;
  setSoundUnlocked: (value: boolean) => void;
  handleBookingNotification: (booking: BookingNotification) => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  settings: {
    enableBrowserNotifications: true,
    enableSoundNotifications: true,
    autoConfirmBookings: false,
  },
  currentBooking: null,
  isModalOpen: false,
  isToastOpen: false,
  soundUnlocked: false,
  setSettings: (settings) =>
    set((state) => ({ settings: { ...state.settings, ...settings } })),
  setCurrentBooking: (booking) => set({ currentBooking: booking }),
  showModal: (booking) => set({ currentBooking: booking, isModalOpen: true, isToastOpen: false }),
  showToast: (booking) => set({ currentBooking: booking, isToastOpen: true, isModalOpen: false }),
  closeModal: () => set({ isModalOpen: false, currentBooking: null }),
  closeToast: () => set({ isToastOpen: false, currentBooking: null }),
  setSoundUnlocked: (value) => set({ soundUnlocked: value }),
  handleBookingNotification: (booking) =>
    set((state) => {
      const nextState: Partial<NotificationState> = {
        currentBooking: booking,
      };

      if (state.settings.autoConfirmBookings) {
        nextState.isToastOpen = true;
        nextState.isModalOpen = false;
      } else {
        nextState.isModalOpen = true;
        nextState.isToastOpen = false;
      }

      return nextState;
    }),
}));

export const selectSettings = (state: NotificationState) => state.settings;
export const selectCurrentBooking = (state: NotificationState) => state.currentBooking;
export const selectModalState = (state: NotificationState) => ({
  currentBooking: state.currentBooking,
  isModalOpen: state.isModalOpen,
});
export const selectToastState = (state: NotificationState) => ({
  currentBooking: state.currentBooking,
  isToastOpen: state.isToastOpen,
});
export const selectSoundUnlocked = (state: NotificationState) => state.soundUnlocked;
