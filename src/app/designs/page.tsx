"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import PasswordGate from "@/components/PasswordGate";

const CATEGORY_LABELS: Record<string, string> = { jersey: "Jerseys", "enduro-short": "Enduro Short Sleeve", "enduro-long": "Enduro Long Sleeve", bib: "Bibs", vest: "Vests", gloves: "Gloves", shorts: "Shorts" };
const CATEGORY_ICONS: Record<string, string> = { jersey: "🚴", "enduro-short": "👕", "enduro-long": "🏔️", bib: "🩱", vest: "🧥", gloves: "🧤", shorts: "🩳" };
const CAT_ORDER = ["jersey", "enduro-short", "enduro-long", "bib", "vest"];

function groupByPrimaryCategory(designs: FinalDesign[]) {
  const grouped: Record<string, FinalDesign[]> = {};
  for (const d of designs) {
    let cats: string[] = [];
    try { cats = JSON.parse(d.designed_for || "[]"); } catch { cats = []; }
    const primary = cats[0] || "other";
    if (!grouped[primary]) grouped[primary] = [];
    grouped[primary].push(d);
  }
  const categories = [...CAT_ORDER.filter(c => grouped[c]), ...Object.keys(grouped).filter(c => !CAT_ORDER.includes(c)).sort()];
  return { grouped, categories };
}

interface FinalDesign {
  id: string;
  name: string;
  description: string | null;
  image_url: string;
  sort_order: number;
  designed_for: string | null;
  created_at: string;
}

function DesignCard({
  design,
  onImageClick,
}: {
  design: FinalDesign;
  onImageClick: (design: FinalDesign) => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
      <button
        className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden group focus:outline-none"
        onClick={() => onImageClick(design)}
        aria-label={`View ${design.name} full size`}
      >
        <Image
          src={`/api/designs/${design.id}/image`}
          alt={design.name}
          fill
          className="object-contain p-2 group-hover:scale-105 transition-transform duration-200"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
          <span className="bg-white/90 text-gray-800 text-sm font-medium px-3 py-1.5 rounded-full shadow">
            🔍 View Full Size
          </span>
        </span>
      </button>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-gray-900 text-base">{design.name}</h3>
        {design.description && (
          <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{design.description}</p>
        )}
      </div>
    </div>
  );
}

function Lightbox({
  design,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  design: FinalDesign;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full max-h-[90vh] flex flex-col bg-white rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div>
            <h2 className="font-semibold text-gray-900">{design.name}</h2>
            {design.description && (
              <p className="text-sm text-gray-500 mt-0.5">{design.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors text-2xl leading-none ml-4 flex-shrink-0"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {/* Image */}
        <div className="relative flex-1 min-h-0 bg-gray-50" style={{ minHeight: "50vh" }}>
          <img
            src={`/api/designs/${design.id}/image`}
            alt={design.name}
            className="w-full h-full object-contain p-4"
            loading="lazy"
          />
        </div>
        {/* Prev / Next */}
        {(hasPrev || hasNext) && (
          <div className="flex justify-between px-5 py-3 border-t border-gray-200">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-30 transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-30 transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminPanel({
  designs,
  onRefresh,
}: {
  designs: FinalDesign[];
  onRefresh: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name.trim()) return;
    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", name.trim());
      fd.append("description", description.trim());
      fd.append("active", "true");
      fd.append("sort_order", "999");
      fd.append("designed_for", "[]");
      const res = await fetch("/api/admin/designs", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed");
      } else {
        setName("");
        setDescription("");
        setFile(null);
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        onRefresh();
      }
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (d: FinalDesign) => {
    setEditingId(d.id);
    setEditName(d.name);
    setEditDescription(d.description ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setSavingId(id);
    try {
      await fetch(`/api/admin/designs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, description: editDescription }),
      });
      cancelEdit();
      onRefresh();
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this design? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/admin/designs/${id}`, { method: "DELETE" });
      onRefresh();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mt-10 space-y-8">
      <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-5">📤 Upload New Design</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Design Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Race Green – Jersey Front"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes about this design…"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image File <span className="text-red-500">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              required
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP or GIF — max 10 MB</p>
          </div>
          {preview && (
            <div className="relative w-40 h-28 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              <Image src={preview} alt="Preview" fill className="object-contain p-1" />
            </div>
          )}
          {uploadError && (
            <p className="text-sm text-red-600">{uploadError}</p>
          )}
          <button
            type="submit"
            disabled={uploading || !file || !name.trim()}
            className="px-6 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm disabled:opacity-50 transition-colors"
          >
            {uploading ? "Uploading…" : "Upload Design"}
          </button>
        </form>
      </div>

      {designs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="font-semibold text-gray-800">Manage Uploaded Designs</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {designs.map((d) => (
              <li key={d.id} className="px-6 py-4 flex gap-4 items-start">
                <div className="relative w-20 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
                  <Image src={d.image_url} alt={d.name} fill className="object-contain p-1" />
                </div>
                <div className="flex-1 min-w-0">
                  {editingId === d.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(d.id)}
                          disabled={savingId === d.id}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition-colors"
                        >
                          {savingId === d.id ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-gray-900 text-sm truncate">{d.name}</p>
                      {d.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{d.description}</p>
                      )}
                    </>
                  )}
                </div>
                {editingId !== d.id && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => startEdit(d)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(d.id)}
                      disabled={deletingId === d.id}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 hover:bg-red-100 text-red-600 disabled:opacity-50 transition-colors"
                    >
                      {deletingId === d.id ? "…" : "Delete"}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function DesignsPage() {
  const [designs, setDesigns] = useState<FinalDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const fetchDesigns = () => {
    fetch("/api/admin/designs")
      .then((r) => r.json())
      .then((d) => {
        setDesigns(Array.isArray(d.designs) ? d.designs : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchDesigns();
  }, []);

  const openLightbox = (design: FinalDesign) => {
    const idx = designs.findIndex((d) => d.id === design.id);
    setLightboxIndex(idx);
  };

  return (
    <PasswordGate password="" storageKey="auth-admin" verifyEndpoint="/api/admin/verify-password" title="Admin – Manage Designs" checkOrderingStatus={true}>
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Designs</h1>
        <p className="text-gray-400 text-sm mt-1">Design catalog — shared with ordering and management</p>
      </div>

      {/* Gallery */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        </div>
      ) : designs.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-3">🖼️</p>
          <p className="text-lg font-medium text-gray-700">No designs uploaded yet</p>
          <p className="text-sm mt-1">Check back soon!</p>
        </div>
      ) : (
        (() => {
          const { grouped, categories } = groupByPrimaryCategory(designs);
          return (
            <div className="space-y-10">
              {categories.map(cat => (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-base">{CATEGORY_ICONS[cat] || "🖴"}</span>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      {CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </h2>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {grouped[cat].map((d) => (
                      <DesignCard key={d.id} design={d} onImageClick={openLightbox} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && designs[lightboxIndex] && (
        <Lightbox
          design={designs[lightboxIndex]}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => (i !== null ? i - 1 : null))}
          onNext={() => setLightboxIndex((i) => (i !== null ? i + 1 : null))}
          hasPrev={lightboxIndex > 0}
          hasNext={lightboxIndex < designs.length - 1}
        />
      )}

      <div className="mt-10 pt-8 border-t border-gray-100 text-center">
        <p className="text-sm text-gray-400">To upload or manage designs, go to <a href="/products" className="text-blue-600 hover:underline">Products → Designs</a>.</p>
      </div>
    </div>
    </PasswordGate>
  );
}
