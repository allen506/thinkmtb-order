"use client";

import { useState, useEffect } from "react";

export default function PaymentsAdmin() {
  // Payment settings — club_name is shown in user payment reference
  const defaultSettings = { club_name: "", payment_zelle: "", payment_venmo: "", payment_paypal: "", payment_cash: "" };
  const [settings, setSettings] = useState(defaultSettings);
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState(defaultSettings);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetch("/api/admin/payment-settings").then(r => r.json()).then(d => { setSettings(d); setSettingsDraft(d); });
  }, []);

  const saveSettings = async () => {
    setSavingSettings(true);
    await fetch("/api/admin/payment-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settingsDraft) });
    setSettings(settingsDraft);
    setEditingSettings(false);
    setSavingSettings(false);
  };

  return (
    <div className="space-y-6">
      {/* Payment method settings */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Payment Info for Users</h3>
          {editingSettings ? (
            <div className="flex gap-2">
              <button onClick={saveSettings} disabled={savingSettings} className="px-4 py-1.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors">{savingSettings ? "Saving…" : "Save"}</button>
              <button onClick={() => { setEditingSettings(false); setSettingsDraft(settings); }} className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setEditingSettings(true)} className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">Edit</button>
          )}
        </div>
        {editingSettings ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Club / Organization Name</label>
              <input type="text" value={settingsDraft.club_name ?? ""} onChange={e => setSettingsDraft(d => ({ ...d, club_name: e.target.value }))}
                placeholder="e.g. ThinkMTB"
                className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              <p className="text-xs text-gray-400 mt-1">Shown in the payment reference, e.g. <strong>thnk-100 {"\u2014"} {settingsDraft.club_name || "ThinkMTB"}</strong></p>
            </div>
            {([["payment_zelle", "Zelle (phone or email)"], ["payment_venmo", "Venmo (@handle)"], ["payment_paypal", "PayPal (email or link)"], ["payment_cash", "Cash instructions"]] as const).map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <input type="text" value={settingsDraft[key]} onChange={e => setSettingsDraft(d => ({ ...d, [key]: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {settings.club_name && <div className="text-sm sm:col-span-2"><span className="text-gray-400 text-xs uppercase tracking-wide block">Club Name</span><span className="text-gray-900 font-medium">{settings.club_name}</span></div>}
            {settings.payment_zelle && <div className="text-sm"><span className="text-gray-400 text-xs uppercase tracking-wide block">Zelle</span><span className="text-gray-900">{settings.payment_zelle}</span></div>}
            {settings.payment_venmo && <div className="text-sm"><span className="text-gray-400 text-xs uppercase tracking-wide block">Venmo</span><span className="text-gray-900">{settings.payment_venmo}</span></div>}
            {settings.payment_paypal && <div className="text-sm"><span className="text-gray-400 text-xs uppercase tracking-wide block">PayPal</span><span className="text-gray-900">{settings.payment_paypal}</span></div>}
            {settings.payment_cash && <div className="text-sm"><span className="text-gray-400 text-xs uppercase tracking-wide block">Cash</span><span className="text-gray-900">{settings.payment_cash}</span></div>}
            {!settings.payment_zelle && !settings.payment_venmo && !settings.payment_paypal && (
              <p className="text-gray-400 text-sm col-span-2">No payment info configured yet. Click Edit to add.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
