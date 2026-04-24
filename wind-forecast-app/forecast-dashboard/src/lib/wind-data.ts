import { promises as fs } from "node:fs";
import path from "node:path";

export type ProcessedData = {
  actuals: Record<string, number>;
  forecasts: Array<{
    targetTime: string;
    publishTime: string;
    horizon: number;
    generation: number;
  }>;
};

type CacheEntry = { data: ProcessedData; expiresAt: number };

const BMRS_BASE = "https://data.elexon.co.uk/bmrs/api/v1/datasets";
const CACHE_TTL_MS = 10 * 60 * 1000;
const liveCache = new Map<string, CacheEntry>();
let staticDataPromise: Promise<ProcessedData> | null = null;

function getCached(key: string) {
  const entry = liveCache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  liveCache.delete(key);
  return null;
}

function setCache(key: string, data: ProcessedData) {
  liveCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

function addDays(d: Date, days: number) {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + days);
  return r;
}

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function fmtISO(d: Date) {
  return d.toISOString().replace(".000Z", "Z");
}

async function fetchJSON(url: string) {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`BMRS ${res.status}: ${res.statusText}`);
  return res.json();
}

async function fetchActuals(start: Date, end: Date) {
  const actuals: Record<string, number> = {};
  let cur = new Date(start);

  while (cur < end) {
    const next = new Date(Math.min(addDays(cur, 3).getTime(), end.getTime()));
    const params = new URLSearchParams({
      settlementDateFrom: fmtDate(cur),
      settlementDateTo: fmtDate(addDays(next, -1)),
      fuelType: "WIND",
      format: "json",
    });

    try {
      const data = await fetchJSON(`${BMRS_BASE}/FUELHH?${params}`);
      const items = data?.data ?? data;
      if (Array.isArray(items)) {
        for (const rec of items) {
          if (rec.fuelType === "WIND" && rec.startTime && rec.generation != null) {
            actuals[rec.startTime] = rec.generation;
          }
        }
      }
    } catch (e) {
      console.error(`FUELHH fetch error (${fmtDate(cur)}):`, e);
    }

    cur = next;
  }

  return actuals;
}

async function fetchForecasts(start: Date, end: Date) {
  const forecasts: ProcessedData["forecasts"] = [];
  let cur = new Date(start);

  while (cur < end) {
    const next = new Date(Math.min(addDays(cur, 2).getTime(), end.getTime()));
    const params = new URLSearchParams({
      publishDateTimeFrom: fmtISO(cur),
      publishDateTimeTo: fmtISO(next),
      format: "json",
    });

    try {
      const data = await fetchJSON(`${BMRS_BASE}/WINDFOR?${params}`);
      const items = data?.data ?? data;
      if (Array.isArray(items)) {
        for (const rec of items) {
          if (rec.startTime && rec.publishTime && rec.generation != null) {
            const startMs = new Date(rec.startTime).getTime();
            const pubMs = new Date(rec.publishTime).getTime();
            const horizonHours = (startMs - pubMs) / 3_600_000;
            if (horizonHours >= 0 && horizonHours <= 48) {
              forecasts.push({
                targetTime: rec.startTime,
                publishTime: rec.publishTime,
                horizon: horizonHours,
                generation: rec.generation,
              });
            }
          }
        }
      }
    } catch (e) {
      console.error(`WINDFOR fetch error (${fmtISO(cur)}):`, e);
    }

    cur = next;
  }

  return forecasts;
}

export function validateLiveRange(start: Date, end: Date) {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    throw new Error("Invalid date range");
  }

  const maxMs = 31 * 24 * 60 * 60 * 1000;
  if (end.getTime() - start.getTime() > maxMs) {
    throw new Error("Date range must not exceed 31 days");
  }
}

export async function loadStaticWindData() {
  if (!staticDataPromise) {
    staticDataPromise = (async () => {
      const filePath = path.join(process.cwd(), "public", "data", "processed_wind_data.json");
      const raw = await fs.readFile(filePath, "utf8");
      return JSON.parse(raw) as ProcessedData;
    })();
  }

  return staticDataPromise;
}

export async function loadLiveWindData(start: Date, end: Date) {
  validateLiveRange(start, end);
  const cacheKey = `${start.toISOString()}|${end.toISOString()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const [actuals, forecasts] = await Promise.all([
    fetchActuals(start, end),
    fetchForecasts(start, end),
  ]);

  const result = { actuals, forecasts };
  setCache(cacheKey, result);
  return result;
}

export function getDefaultLiveRange() {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7);
  return { start, end };
}
