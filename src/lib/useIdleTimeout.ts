import { useEffect, useRef, useCallback, useState } from "react";

interface UseIdleTimeoutOptions {
  timeoutMinutes: number; // Minutes before auto-logout
  warningMinutes: number; // Minutes before timeout to show warning (e.g., 2 minutes before)
  onWarning?: () => void; // Called when warning time reached
  onLogout?: () => void; // Called when timeout expires
}

export function useIdleTimeout({
  timeoutMinutes,
  warningMinutes,
  onWarning,
  onLogout,
}: UseIdleTimeoutOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(warningMinutes * 60);

  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setTimeRemaining(warningMinutes * 60);

    // Clear existing timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);

    // Show warning at (timeoutMinutes - warningMinutes)
    const warningTimeMs = (timeoutMinutes - warningMinutes) * 60 * 1000;
    const logoutTimeMs = timeoutMinutes * 60 * 1000;

    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      onWarning?.();

      // Start countdown timer
      let secondsLeft = warningMinutes * 60;
      const countdownInterval = setInterval(() => {
        secondsLeft--;
        setTimeRemaining(secondsLeft);
        if (secondsLeft <= 0) {
          clearInterval(countdownInterval);
        }
      }, 1000);
    }, warningTimeMs);

    timeoutRef.current = setTimeout(() => {
      setShowWarning(false);
      onLogout?.();
    }, logoutTimeMs);
  }, [timeoutMinutes, warningMinutes, onWarning, onLogout]);

  const dismissWarning = useCallback(() => {
    resetIdleTimer();
  }, [resetIdleTimer]);

  useEffect(() => {
    // Initialize on mount
    resetIdleTimer();

    // Track user activity
    const handleActivity = () => {
      if (!showWarning) {
        resetIdleTimer();
      }
    };

    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity, true);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    };
  }, [resetIdleTimer, showWarning]);

  return {
    showWarning,
    timeRemaining,
    dismissWarning,
  };
}
