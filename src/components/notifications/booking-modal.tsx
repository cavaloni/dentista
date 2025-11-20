"use client";

import { X } from "lucide-react";
import { useNotifications } from "./notification-context";

export function BookingModal() {
  const {
    currentBooking,
    isModalOpen,
    confirmBooking,
    rejectBooking,
  } = useNotifications();

  if (!isModalOpen || !currentBooking) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={() => rejectBooking(currentBooking.id)}
        />

        {/* Modal */}
        <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-950/90 p-6 shadow-2xl shadow-slate-950/40 transition-all">
          {/* Close button */}
          <button
            onClick={() => rejectBooking(currentBooking.id)}
            className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Success indicator */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-100">Booking Accepted! 🎉</h2>
            <p className="mt-2 text-slate-400">
              A patient has confirmed their appointment
            </p>
          </div>

          {/* Booking details */}
          <div className="mb-8 space-y-4 rounded-xl border border-slate-800/60 bg-slate-900/50 p-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Patient</p>
                <p className="text-lg font-semibold text-slate-100">{currentBooking.patientName}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Appointment Time</p>
                <p className="text-lg font-semibold text-slate-100">{currentBooking.slotStart}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Duration</p>
                <p className="text-lg font-semibold text-slate-100">{currentBooking.duration} minutes</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Practice</p>
                <p className="text-lg font-semibold text-slate-100">{currentBooking.practiceName}</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => rejectBooking(currentBooking.id)}
              className="flex-1 rounded-lg border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Go to Next Person
            </button>

            <button
              onClick={() => confirmBooking(currentBooking.id)}
              className="flex-1 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 hover:bg-emerald-400 transition-colors cursor-pointer"
            >
              Confirm Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}