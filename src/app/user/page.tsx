"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PasswordGate from "@/components/PasswordGate";

function Dashboard({ userName, pin, onChangeName }: { userName: string; pin: string; onChangeName: () => void }) {
  return (
    <div>
      <div className="mb-10">
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Team Portal</p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Good to see you, {userName.split(" ")[0]}.</h1>
          <button onClick={onChangeName} className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors shrink-0">
            Not you?
          </button>
        </div>
        <p className="text-sm text-gray-400 mt-1">PIN: {pin}</p>
      </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Link href="/user/order" className="group bg-white rounded-2xl p-7 hover:shadow-xl transition-all duration-300 border border-gray-100 hover:-translate-y-1 flex flex-col">
            <div className="flex-1">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center mb-5 text-xl group-hover:bg-blue-100 transition-colors">📝</div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Place Order</h2>
              <p className="text-sm text-gray-400 leading-relaxed">Select your design, size, and quantity to place a new order</p>
            </div>
            <div className="mt-5 text-sm font-medium text-blue-600 flex items-center gap-1">Start Ordering →</div>
          </Link>

          <Link href="/user/my-orders" className="group bg-white rounded-2xl p-7 hover:shadow-xl transition-all duration-300 border border-gray-100 hover:-translate-y-1 flex flex-col">
            <div className="flex-1">
              <div className="w-11 h-11 rounded-2xl bg-green-50 flex items-center justify-center mb-5 text-xl group-hover:bg-green-100 transition-colors">📦</div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">My Orders</h2>
              <p className="text-sm text-gray-400 leading-relaxed">View and manage your orders, check status, and edit items</p>
            </div>
            <div className="mt-5 text-sm font-medium text-green-600 flex items-center gap-1">View Orders →</div>
          </Link>

          <Link href="/user/pricing" className="group bg-white rounded-2xl p-7 hover:shadow-xl transition-all duration-300 border border-gray-100 hover:-translate-y-1 flex flex-col">
            <div className="flex-1">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center mb-5 text-xl group-hover:bg-amber-100 transition-colors">💰</div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Pricing</h2>
              <p className="text-sm text-gray-400 leading-relaxed">Check pricing tiers based on quantity for each product</p>
            </div>
            <div className="mt-5 text-sm font-medium text-amber-600 flex items-center gap-1">View Pricing →</div>
          </Link>
        </div>

        <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-gray-400 text-sm text-center">
            Prices update live as more team orders come in — the more riders order, the better the price.
          </p>
        </div>
      </div>
  );
}

type IdentityMode = "choose" | "create" | "lookup" | "reset";

function IdentityGate({ onIdentified }: { onIdentified: (name: string, pin: string) => void }) {
  const [mode, setMode] = useState<IdentityMode>("choose");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const [lookupPin, setLookupPin] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [looking, setLooking] = useState(false);

  // Reset PIN state
  const [resetName, setResetName] = useState("");
  const [resetPin, setResetPin] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetting, setResetting] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    if (resetPin !== resetConfirm) { setResetError("PINs do not match"); return; }
    setResetting(true);
    const res = await fetch("/api/user/reset-pin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: resetName.trim(), newPin: resetPin }),
    });
    const data = await res.json();
    setResetting(false);
    if (!res.ok) { setResetError(data.error || "Failed"); return; }
    onIdentified(data.fullName, data.pin);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (newPin !== confirmPin) { setCreateError("PINs do not match"); return; }
    setCreating(true);
    const res = await fetch("/api/user/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: newPin, fullName: `${firstName.trim()} ${lastName.trim()}` }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { setCreateError(data.error || "Failed to create profile"); return; }
    onIdentified(data.fullName, data.pin);
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError("");
    setLooking(true);
    const res = await fetch(`/api/user/profile?pin=${encodeURIComponent(lookupPin)}`);
    const data = await res.json();
    setLooking(false);
    if (!res.ok) {
      setLookupError(res.status === 404 ? "PIN not found — check your PIN or create a new identity" : (data.error || "Error"));
      return;
    }
    onIdentified(data.fullName, data.pin);
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-10 max-w-xs w-full">

        {mode === "choose" && (
          <>
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5 text-xl">👋</div>
              <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Welcome to ThinkMTB</h2>
              <p className="text-sm text-gray-400 mt-1">How would you like to continue?</p>
            </div>
            <div className="space-y-3">
              <button onClick={() => setMode("create")}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors">
                First time here
              </button>
              <button onClick={() => setMode("lookup")}
                className="w-full py-3 bg-white text-gray-800 rounded-xl font-medium hover:bg-gray-50 transition-colors border border-gray-200">
                I have a PIN
              </button>
            </div>
          </>
        )}

        {mode === "create" && (
          <>
            <div className="mb-7">
              <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Create your identity</h2>
              <p className="text-gray-400 text-xs mt-1">Your PIN works on any device — phone, PC, or tablet.</p>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">First Name</label>
                  <input type="text" required autoFocus value={firstName} onChange={e => setFirstName(e.target.value)}
                    placeholder="Allen"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Last Name</label>
                  <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)}
                    placeholder="Morales"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Choose a 4-digit PIN</label>
                <input type="tel" inputMode="numeric" pattern="\d{4}" maxLength={4} required
                  value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="— — — —"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm tracking-widest text-center" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Confirm PIN</label>
                <input type="tel" inputMode="numeric" pattern="\d{4}" maxLength={4} required
                  value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="— — — —"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm tracking-widest text-center" />
              </div>
              {createError && <p className="text-red-500 text-xs">{createError}</p>}
              <button type="submit" disabled={creating || !firstName.trim() || !lastName.trim() || newPin.length !== 4 || confirmPin.length !== 4}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {creating ? "Creating…" : "Create Identity"}
              </button>
              <button type="button" onClick={() => setMode("choose")} className="w-full text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">← Back</button>
            </form>
          </>
        )}

        {mode === "lookup" && (
          <>
            <div className="mb-7">
              <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Enter your PIN</h2>
              <p className="text-gray-400 text-xs mt-1">Works on any device.</p>
            </div>
            <form onSubmit={handleLookup} className="space-y-3">
              <input type="tel" inputMode="numeric" pattern="\d{4}" maxLength={4} required autoFocus
                value={lookupPin} onChange={e => setLookupPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="0000"
                className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none tracking-[0.5em] text-center text-2xl font-light" />
              {lookupError && <p className="text-red-500 text-xs">{lookupError}</p>}
              <button type="submit" disabled={looking || lookupPin.length !== 4}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {looking ? "Looking up…" : "Sign In"}
              </button>
              <button type="button" onClick={() => { setMode("create"); setLookupError(""); }}
                className="w-full text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">
                Don&apos;t have a PIN? Create one
              </button>
              <button type="button" onClick={() => { setMode("reset"); setLookupError(""); }}
                className="w-full text-xs text-gray-300 hover:text-gray-500 underline underline-offset-2">
                Forgot PIN? Reset it
              </button>
              <button type="button" onClick={() => setMode("choose")} className="w-full text-xs text-gray-300 hover:text-gray-500 underline underline-offset-2">← Back</button>
            </form>
          </>
        )}
        {mode === "reset" && (
          <>
            <div className="mb-7">
              <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Reset your PIN</h2>
              <p className="text-gray-400 text-xs mt-1">Enter the name you registered with to set a new PIN.</p>
            </div>
            <form onSubmit={handleReset} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                <input type="text" required value={resetName} onChange={e => setResetName(e.target.value)}
                  placeholder="e.g. Allen Morales" autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">New 4-digit PIN</label>
                <input type="tel" inputMode="numeric" pattern="\d{4}" maxLength={4} required
                  value={resetPin} onChange={e => setResetPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="— — — —"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm tracking-widest text-center" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Confirm New PIN</label>
                <input type="tel" inputMode="numeric" pattern="\d{4}" maxLength={4} required
                  value={resetConfirm} onChange={e => setResetConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="— — — —"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm tracking-widest text-center" />
              </div>
              {resetError && <p className="text-red-500 text-xs">{resetError}</p>}
              <button type="submit" disabled={resetting || !resetName.trim() || resetPin.length !== 4 || resetConfirm.length !== 4}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {resetting ? "Updating…" : "Reset PIN"}
              </button>
              <button type="button" onClick={() => { setMode("lookup"); setResetError(""); }}
                className="w-full text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">← Back to sign in</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function UserPortal() {
  const [userName, setUserName] = useState<string | null>(null);
  const [userPin, setUserPin] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setUserName(localStorage.getItem("thinkmtb-user-name"));
    setUserPin(localStorage.getItem("thinkmtb-user-pin"));
    setLoaded(true);
  }, []);

  const handleIdentified = (name: string, pin: string) => {
    localStorage.setItem("thinkmtb-user-name", name);
    localStorage.setItem("thinkmtb-user-pin", pin);
    setUserName(name);
    setUserPin(pin);
  };

  const handleSwitch = () => {
    localStorage.removeItem("thinkmtb-user-name");
    localStorage.removeItem("thinkmtb-user-pin");
    setUserName(null);
    setUserPin(null);
  };

  return (
    <PasswordGate password={["thinkmtb-go", "thinkmtb123"]} storageKey="auth-user" title="ThinkMTB User Portal" checkOrderingStatus={true}>
      {!loaded ? null : !userName || !userPin ? (
        <IdentityGate onIdentified={handleIdentified} />
      ) : (
        <Dashboard userName={userName} pin={userPin} onChangeName={handleSwitch} />
      )}
    </PasswordGate>
  );
}
