"use client";

import { useState, useEffect } from "react";

export default function SubmittedPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "rejected">("all");
  const [noting, setNoting] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = () => {
    setLoading(true);
    fetch("/api/payments").then(r => r.json()).then(d => { setPayments(d.payments || []); setLoading(false); });
  };

  const updateStatus = async (id: number, status: string, notes?: string) => {
    await fetch(`/api/payments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, adminNotes: notes ?? undefined }) });
    setNoting(null);
    fetchPayments();
  };

  const filtered = filter === "all" ? payments : payments.filter(p => p.status === filter);
  const methodLabel: Record<string, string> = { zelle: "Zelle", venmo: "Venmo", paypal: "PayPal", cash: "Cash" };
  const statusStyle: Record<string, string> = { pending: "bg-yellow-100 text-yellow-700", confirmed: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-600" };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">Submitted Payments</h3>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(["all", "pending", "confirmed", "rejected"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${ filter === f ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-800" }`}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-12">No payments {filter !== "all" ? `with status "${filter}"` : "yet"}</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {filtered.map((p) => (
            <div key={p.id} className="px-6 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{p.user_name}</span>
                    {p.order_number && <span className="text-xs text-gray-400">#{p.order_number}</span>}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[p.status] || "bg-gray-100 text-gray-600"}`}>{p.status}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{methodLabel[p.method] || p.method}</span>
                  </div>
                  {p.reference && <p className="text-sm text-gray-600 mt-0.5">Ref: {p.reference}</p>}
                  {(p.amount_usd || p.amount_crc) && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {p.amount_usd ? `$${Number(p.amount_usd).toFixed(2)}` : ""}{p.amount_usd && p.amount_crc ? " · " : ""}{p.amount_crc ? `₡${Number(p.amount_crc).toLocaleString()}` : ""}
                    </p>
                  )}
                  {p.admin_notes && <p className="text-xs text-gray-400 mt-1 italic">Note: {p.admin_notes}</p>}
                  <p className="text-xs text-gray-300 mt-1">{new Date(p.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {p.status === "pending" && (
                    <>
                      <button onClick={() => updateStatus(p.id, "confirmed")} className="px-3 py-1.5 rounded-xl text-xs font-medium bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 transition-colors">✓ Confirm</button>
                      <button onClick={() => updateStatus(p.id, "rejected")} className="px-3 py-1.5 rounded-xl text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors">✗ Reject</button>
                    </>
                  )}
                  {p.status !== "pending" && (
                    <button onClick={() => updateStatus(p.id, "pending")} className="px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">Reopen</button>
                  )}
                  <button onClick={() => { setNoting(p.id); setNoteText(p.admin_notes || ""); }} className="px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">Add Note</button>
                </div>
              </div>
              {noting === p.id && (
                <div className="mt-3 flex gap-2">
                  <input type="text" value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Admin note…"
                    className="flex-1 px-3 py-2 border border-gray-200 bg-gray-50 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  <button onClick={() => updateStatus(p.id, p.status, noteText)} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors">Save</button>
                  <button onClick={() => setNoting(null)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
