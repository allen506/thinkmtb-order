"use client";

import { useState, useEffect } from "react";

interface PasswordGateProps {
  password: string;
  storageKey: string;
  title?: string;
  children: React.ReactNode;
}

export default function PasswordGate({
  password,
  storageKey,
  title = "Enter Password",
  children,
}: PasswordGateProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if already authenticated this session
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored === "true") {
        setAuthenticated(true);
      }
    } catch {
      // sessionStorage unavailable (e.g. private browsing)
    }
    setChecking(false);
  }, [storageKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === password) {
      try { sessionStorage.setItem(storageKey, "true"); } catch {}
      setAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setInput("");
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (authenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 w-full max-w-sm mx-4">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Enter the password to continue
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError(false);
              }}
              placeholder="Password"
              autoFocus
              className={`w-full px-4 py-3 rounded-lg border ${
                error ? "border-red-400 bg-red-50" : "border-gray-300"
              } text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-center text-lg`}
            />
            {error && (
              <p className="text-red-500 text-sm mt-2 text-center">
                Incorrect password. Try again.
              </p>
            )}
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
