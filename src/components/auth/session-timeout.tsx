'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/env';

const EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

interface SessionTimeoutProps {
  /** Session timeout in minutes (default: 30) */
  timeoutMinutes?: number;
  /** Warning shown before timeout in minutes (default: 5) */
  warningMinutes?: number;
}

export function SessionTimeout({ 
  timeoutMinutes = 30, 
  warningMinutes = 5 
}: SessionTimeoutProps) {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = warningMinutes * 60 * 1000;

  const logout = useCallback(async () => {
    const supabase = createClient(
      publicEnv.NEXT_PUBLIC_SUPABASE_URL,
      publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    await supabase.auth.signOut();
    router.push('/login?reason=session_expired');
  }, [router]);

  const resetTimer = useCallback(() => {
    setShowWarning(false);
    localStorage.setItem('lastActivity', Date.now().toString());
  }, []);

  const extendSession = useCallback(() => {
    resetTimer();
    setShowWarning(false);
  }, [resetTimer]);

  useEffect(() => {
    // Initialize last activity
    if (!localStorage.getItem('lastActivity')) {
      localStorage.setItem('lastActivity', Date.now().toString());
    }

    // Check timeout on interval
    const checkTimeout = () => {
      const lastActivity = parseInt(localStorage.getItem('lastActivity') ?? Date.now().toString(), 10);
      const elapsed = Date.now() - lastActivity;

      if (elapsed >= timeoutMs) {
        // Session expired
        logout();
      } else if (elapsed >= timeoutMs - warningMs) {
        // Show warning
        setShowWarning(true);
        setRemainingSeconds(Math.floor((timeoutMs - elapsed) / 1000));
      }
    };

    // Check every second when warning is shown, otherwise every 30 seconds
    const interval = setInterval(checkTimeout, showWarning ? 1000 : 30000);

    // Reset timer on user activity
    const handleActivity = () => {
      if (!showWarning) {
        resetTimer();
      }
    };

    EVENTS.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial check
    checkTimeout();

    return () => {
      clearInterval(interval);
      EVENTS.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [timeoutMs, warningMs, showWarning, logout, resetTimer]);

  if (!showWarning) {
    return null;
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <svg 
              className="h-8 w-8 text-amber-600 dark:text-amber-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-slate-100">
            Session Expiring
          </h2>
          <p className="mb-4 text-slate-600 dark:text-slate-400">
            Your session will expire in{' '}
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </p>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-500">
            For security, you&apos;ll be logged out after inactivity.
          </p>
          <div className="flex gap-3">
            <button
              onClick={logout}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Log Out Now
            </button>
            <button
              onClick={extendSession}
              className="flex-1 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
            >
              Stay Logged In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
