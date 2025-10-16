"use client";

import { CheckCircle, X } from "lucide-react";
import { useNotifications } from "./notification-context";

export function BookingToast() {
  const {
    currentBooking,
    isToastOpen,
    dismissToast,
  } = useNotifications();

  if (!isToastOpen || !currentBooking) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm transform transition-all duration-300 ease-in-out">
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 shadow-2xl shadow-emerald-500/20 backdrop-blur-sm">
        {/* Toast content */}
        <div className="flex items-start gap-3">
          {/* Success icon */}
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
            <CheckCircle className="h-4 w-4" />
          </div>

          {/* Content */}
          <div className="flex-1">
            <h4 className="font-semibold text-emerald-100">Booking Auto-Confirmed</h4>
            <p className="mt-1 text-sm text-emerald-200">
              {currentBooking.patientName} has been booked for {currentBooking.slotStart}
            </p>
            <p className="mt-1 text-xs text-emerald-300">
              Duration: {currentBooking.duration} minutes
            </p>
          </div>

          {/* Dismiss button */}
          <button
            onClick={dismissToast}
            className="rounded-lg p-1 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Manual acknowledgment indicator */}
        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-300">
          <div className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse"></div>
          <span>Click to acknowledge</span>
        </div>
      </div>
    </div>
  );
}