"use client";

import { useState, useEffect } from "react";
import { useIdleTimeout } from "@/lib/useIdleTimeout";
import SessionWarningModal from "./SessionWarningModal";

interface PasswordGateProps {
  password: string | string[];
  storageKey: string;
  title?: string;
  children: React.ReactNode;
  checkOrderingStatus?: boolean;
  verifyEndpoint?: string; // if provided, verify password via API instead of client-side
}

export default function PasswordGate({
  password,
  storageKey,
  title = "Enter Password",
  children,
  checkOrderingStatus = true,
  verifyEndpoint,
}: PasswordGateProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [checking, setChecking] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [orderingActive, setOrderingActive] = useState(true);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(15);
  const [loadingTimeout, setLoadingTimeout] = useState(true);

  const validPasswords = Array.isArray(password) ? password : [password];

  // Fetch session timeout setting
  useEffect(() => {
    fetch("/api/app-settings")
      .then((res) => res.json())
      .then((data) => {
        const timeout = parseInt(data.session_timeout_minutes || "15", 10);
        setSessionTimeoutMinutes(timeout);
        setLoadingTimeout(false);
      })
      .catch((err) => {
        console.error("Failed to fetch session timeout:", err);
        setLoadingTimeout(false);
      });
  }, []);

  // Idle timeout hook (only active when authenticated)
  const { showWarning, timeRemaining, dismissWarning } = useIdleTimeout({
    timeoutMinutes: sessionTimeoutMinutes,
    warningMinutes: 2, // Show warning 2 minutes before logout
    onLogout: () => {
      handleLogout();
    },
  });

  useEffect(() => {
    // Fetch ordering status
    fetch("/api/orders/status")
      .then((res) => res.json())
      .then((data) => {
        setOrderingActive(data.orderingActive);
      })
      .catch((err) => {
        console.error("Error fetching ordering status:", err);
        setOrderingActive(true);
      });

    // Check if already authenticated this session and not expired
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          parsed && parsed.auth === true &&
          typeof parsed.ts === "number" &&
          Date.now() - parsed.ts < 3600 * 1000 // 1 hour
        ) {
          setAuthenticated(true);
        }
      }
    } catch {
      // sessionStorage unavailable (e.g. private browsing)
    }
    setChecking(false);
  }, [storageKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setErrorMsg("");

    let isValid = false;
    if (verifyEndpoint) {
      try {
        const res = await fetch(verifyEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: input }),
        });
        const data = await res.json();
        isValid = data.valid === true;
        if (!isValid && data.error) {
          setErrorMsg(data.error);
        }
      } catch {
        isValid = false;
        setErrorMsg("Connection error. Please try again.");
      }
    } else {
      isValid = validPasswords.includes(input);
    }

    setVerifying(false);
    if (isValid) {
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({ auth: true, ts: Date.now() })
        );
        // Also set localStorage for role detection in NavBar
        localStorage.setItem(storageKey, JSON.stringify({ auth: true, ts: Date.now() }));
      } catch {}
      setAuthenticated(true);
      setError(false);
      window.dispatchEvent(new Event("auth-changed"));
    } else {
      setError(true);
      if (!errorMsg) {
        setErrorMsg("Incorrect password. Try again.");
      }
      setInput("");
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(storageKey);
      localStorage.removeItem(storageKey);
    } catch {}
    setAuthenticated(false);
    
    // Dispatch custom event for NavBar to detect auth change
    window.dispatchEvent(new Event("auth-changed"));
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show shutdown message first, before checking authentication
  // This allows the message to show even if not authenticated
  // But only if checkOrderingStatus is true (not for admin pages)
  if (checkOrderingStatus && !orderingActive && !authenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-xl shadow-lg border border-orange-300 p-8 w-full max-w-sm mx-4 bg-orange-50">
          <div className="text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-orange-900 mb-3">
              Ordering Has Finished
            </h2>
            <p className="text-orange-800 mb-6">
              Thank you for your interest in ThinkMTB team orders! The ordering period has now closed.
            </p>
            <p className="text-orange-700 font-semibold mb-4">
              To discuss additional orders or special requests, please contact the ThinkMTB admins.
            </p>
            <p className="text-sm text-orange-600">
              We appreciate your support and look forward to seeing you in our gear!
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (authenticated) {
    return (
      <div>
        <SessionWarningModal
          isOpen={showWarning}
          timeRemaining={timeRemaining}
          onStayLoggedIn={dismissWarning}
          onLogout={handleLogout}
        />
        {children}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-10 w-full max-w-xs mx-4">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5 text-xl">🔒</div>
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight">{title}</h2>
          <p className="text-sm text-gray-400 mt-1">Enter the password to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false); }}
            placeholder="Password"
            autoFocus
            autoComplete="current-password"
            className={`w-full px-4 py-3 rounded-xl border ${
              error ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"
            } text-gray-900 text-center text-base leading-tight focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all`}
          />
          {error && <p className="text-red-500 text-xs text-center">{errorMsg || "Incorrect password. Try again."}</p>}
          <button
            type="submit"
            disabled={verifying}
            className="w-full bg-gray-900 text-white py-3 rounded-xl hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
          >
            {verifying ? "Checking…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
