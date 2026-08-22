import { getDb } from "@/lib/db";

const API_URL = "https://tipodecambio.paginasweb.cr/api";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export interface ExchangeRate {
  compra: number;
  venta: number;
  fecha: string;
  cachedAt: string;
  isFallback?: boolean;
}

/** Fallback rate used if the external API is unreachable */
export const FALLBACK_RATE = 464.54;

/** Convert CRC to USD using the compra (buy) rate */
export function crcToUsd(crc: number, rate: number): number {
  return Math.round((crc / rate) * 100) / 100;
}

/**
 * Returns the current CRC→USD exchange rate.
 * Caches in the DB exchange_rates table; refreshes when cache is older than 6 hours.
 * Falls back to the last known rate (or FALLBACK_RATE) if the API is unreachable.
 */
export async function getExchangeRate(): Promise<ExchangeRate> {
  const db = getDb();

  // Check cache
  const cached = db
    .prepare(
      "SELECT crc_to_usd, updated_at FROM exchange_rates ORDER BY id DESC LIMIT 1"
    )
    .get() as { crc_to_usd: number; updated_at: string } | undefined;

  if (cached) {
    const ageMs = Date.now() - new Date(cached.updated_at + "Z").getTime();
    if (ageMs < CACHE_TTL_MS) {
      return {
        compra: cached.crc_to_usd,
        venta: cached.crc_to_usd,
        fecha: cached.updated_at.slice(0, 10),
        cachedAt: cached.updated_at,
      };
    }
  }

  // Fetch fresh from BCCR proxy
  try {
    const res = await fetch(API_URL, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "thinkmtb-order/1.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: { compra: number; venta: number; fecha: string } =
      await res.json();
    const compra = Number(data.compra);
    if (!isFinite(compra) || compra <= 0) throw new Error("Invalid rate");

    db.prepare("INSERT INTO exchange_rates (crc_to_usd) VALUES (?)").run(
      compra
    );
    // Keep only last 100 records
    db.prepare(
      "DELETE FROM exchange_rates WHERE id NOT IN (SELECT id FROM exchange_rates ORDER BY id DESC LIMIT 100)"
    ).run();

    return {
      compra,
      venta: Number(data.venta),
      fecha: data.fecha,
      cachedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[exchange-rate] fetch failed, using cached/fallback:", err);
    const fallbackRate = cached?.crc_to_usd ?? FALLBACK_RATE;
    return {
      compra: fallbackRate,
      venta: fallbackRate,
      fecha: "",
      cachedAt: cached?.updated_at ?? "",
      isFallback: true,
    };
  }
}
