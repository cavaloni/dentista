"use client";

import { Bell, Volume2, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useNotifications } from "./notification-context";

export function NotificationSettings() {
  const {
    settings,
    updateSettings,
    requestNotificationPermission,
  } = useNotifications();

  const [isClient, setIsClient] = useState(false);
  const [notificationDenied, setNotificationDenied] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setNotificationDenied(
      "Notification" in window && Notification.permission === "denied"
    );
  }, []);

  const handleBrowserNotificationToggle = async (enabled: boolean) => {
    if (enabled && "Notification" in window) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        // If permission denied, keep the setting disabled
        updateSettings({ enableBrowserNotifications: false });
        setNotificationDenied(true);
        return;
      }
    }
    updateSettings({ enableBrowserNotifications: enabled });
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100">
          Notification Settings
        </h3>
        <p className="text-sm text-slate-400">
          Configure how you&apos;re notified when patients accept bookings.
        </p>
      </div>

      {/* Browser Notifications */}
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-800/60 bg-slate-950/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-cyan-500/10 p-2">
                <Bell className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h4 className="font-medium text-slate-100">Browser Notifications</h4>
                <p className="text-sm text-slate-400">
                  Show desktop notifications when a booking is accepted
                </p>
                {isClient && notificationDenied && (
                  <p className="mt-1 text-xs text-rose-400">
                    Browser notifications are blocked in your browser settings
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => handleBrowserNotificationToggle(!settings.enableBrowserNotifications)}
              disabled={notificationDenied}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-950 cursor-pointer ${
                settings.enableBrowserNotifications
                  ? "bg-cyan-500"
                  : "bg-slate-700"
              } ${notificationDenied ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.enableBrowserNotifications ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Sound Notifications */}
        <div className="rounded-xl border border-slate-800/60 bg-slate-950/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <Volume2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-medium text-slate-100">Sound Notifications</h4>
                <p className="text-sm text-slate-400">
                  Play a sound when a booking is accepted
                </p>
              </div>
            </div>
            <button
              onClick={() => updateSettings({ enableSoundNotifications: !settings.enableSoundNotifications })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950 cursor-pointer ${
                settings.enableSoundNotifications
                  ? "bg-emerald-500"
                  : "bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.enableSoundNotifications ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Auto-Confirm */}
        <div className="rounded-xl border border-slate-800/60 bg-slate-950/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-purple-500/10 p-2">
                <CheckCircle className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium text-slate-100">Auto-Confirm Bookings</h4>
                <p className="text-sm text-slate-400">
                  Automatically confirm bookings and show a toast instead of a modal
                </p>
              </div>
            </div>
            <button
              onClick={() => updateSettings({ autoConfirmBookings: !settings.autoConfirmBookings })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-950 cursor-pointer ${
                settings.autoConfirmBookings
                  ? "bg-purple-500"
                  : "bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.autoConfirmBookings ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Test notification button */}
      <div className="rounded-xl border border-slate-800/60 bg-slate-950/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-slate-100">Test Notifications</h4>
            <p className="text-sm text-slate-400">
              Trigger a test notification to see how it works
            </p>
          </div>
          {isClient && (
            <button
              onClick={() => {
                const testBooking = {
                  id: "test-" + Date.now(),
                  patientName: "Test Patient",
                  slotStart: new Date(Date.now() + 3600000).toLocaleString(),
                  duration: "30",
                  practiceName: "Test Practice",
                  slotId: "test-slot",
                } as const;

                window.dispatchEvent(
                  new CustomEvent("booking-accepted", { detail: testBooking })
                );
              }}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Test Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}