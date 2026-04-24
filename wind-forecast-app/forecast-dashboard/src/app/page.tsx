"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from "recharts";
import { Slider } from "@/components/ui/slider";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Zap, BarChart3, Clock, TrendingUp, RefreshCcw, Layers, BarChart2, Database, Wifi, Download, AlertCircle } from "lucide-react";

type TestWindow = Window & {
  __E2E?: boolean;
  __lastCsvDownload?: string;
};

/* ── Animated count-up hook ───────────────────────────────── */
function useCountUp(target: number, duration = 850) {
  const [val, setVal] = useState(0);
  const raf = useRef<number | null>(null);
  const prev = useRef(0);
  useEffect(() => {
    if (!Number.isFinite(target)) return;
    const from = prev.current;
    const t0 = performance.now();
    if (raf.current) cancelAnimationFrame(raf.current);
    const run = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(from + (target - from) * eased);
      if (p < 1) { raf.current = requestAnimationFrame(run); }
      else { prev.current = target; }
    };
    raf.current = requestAnimationFrame(run);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);
  return val;
}

type DashKpi = {
  label: string; rawValue: number; prefix?: string; suffix: string; decimals?: number;
  icon: React.ElementType; color: string; accentFrom: string; accentTo: string;
  trendPct?: number | null; hasDot?: boolean;
};

function AnimatedDashKpi({ kpi, delay }: { kpi: DashKpi; delay: number }) {
  const animated = useCountUp(kpi.rawValue);
  const formatted = (kpi.decimals ?? 0) > 0
    ? animated.toFixed(kpi.decimals)
    : Math.round(animated).toLocaleString();

  const trendText =
    typeof kpi.trendPct === "number" && Number.isFinite(kpi.trendPct)
      ? `${kpi.trendPct >= 0 ? "+" : ""}${kpi.trendPct.toFixed(1)}%`
      : null;

  return (
    <div
      style={{ animation: `fadeSlideUp 0.5s ease-out both`, animationDelay: `${delay}ms` }}
      className="bg-[#14171C]/80 border border-white/5 rounded-[12px] px-4 py-3 hover:border-white/10 transition-all shadow-lg flex flex-col gap-2 lg:justify-between lg:gap-0 h-auto lg:h-[86px] relative overflow-hidden group"
    >
      <div className={`absolute top-0 left-0 w-[3px] h-full bg-gradient-to-b ${kpi.accentFrom} ${kpi.accentTo} opacity-60 group-hover:opacity-100 transition-opacity`} />
      <div className="flex items-center justify-between">
        <div className="bg-[#0B0D11] p-1.5 rounded-lg border border-white/5">
          <kpi.icon size={14} className={kpi.color} />
        </div>
        {trendText && (
          <div
            className={`text-[10px] font-mono font-medium flex items-center gap-0.5 ${
              (kpi.trendPct ?? 0) >= 0 ? "text-emerald-500" : "text-rose-400"
            }`}
          >
            <TrendingUp size={10} />
            {trendText}
          </div>
        )}
        {kpi.hasDot && (
          <div className="flex flex-col gap-[3px]">
            <div className="w-[3px] h-[3px] bg-slate-500 rounded-full" />
            <div className="w-[3px] h-[3px] bg-slate-500 rounded-full" />
            <div className="w-[3px] h-[3px] bg-slate-500 rounded-full" />
          </div>
        )}
      </div>
      <div>
        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-0.5 truncate">{kpi.label}</div>
        <div className={`text-lg font-mono tracking-tight font-bold ${kpi.color} truncate`}>
          {kpi.prefix ?? ""}{formatted}{kpi.suffix}
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton placeholders ───────────────────────────────── */
const DASH_SKELETON_BARS = [60, 75, 50, 85, 45, 70, 90, 55, 80, 40, 65, 78, 52, 88, 62, 48, 72, 58, 83, 44];

function SkeletonDashKpi({ delay }: { delay: number }) {
  return (
    <div
      style={{ animation: `fadeSlideUp 0.45s ease-out both`, animationDelay: `${delay}ms` }}
      className="bg-[#14171C]/80 border border-white/5 rounded-[12px] px-4 py-3 shadow-lg flex flex-col gap-3 h-auto lg:h-[86px]"
    >
      <div className="flex items-center justify-between">
        <div className="skeleton w-7 h-7 rounded-lg" />
      </div>
      <div className="skeleton h-2.5 w-20 rounded" />
      <div className="skeleton h-5 w-28 rounded" />
    </div>
  );
}

function SkeletonChartArea() {
  return (
    <div
      style={{ animation: `fadeSlideUp 0.55s ease-out both`, animationDelay: `200ms` }}
      className="lg:flex-1 lg:min-h-0 bg-[#14171C]/40 border border-white/5 rounded-2xl p-4 lg:p-6 shadow-2xl flex flex-col gap-4"
    >
      {/* fake header */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-5 w-56 rounded" />
          <div className="skeleton h-2.5 w-40 rounded" />
        </div>
        <div className="skeleton h-8 w-20 rounded-xl" />
      </div>
      {/* fake chart body — fixed heights, no Math.random() to avoid hydration mismatch */}
      <div className="flex-1 min-h-[280px] flex flex-col justify-end gap-2 pt-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-[2px] w-full rounded opacity-40" />
        ))}
        <div className="flex items-end gap-1 h-[200px]">
          {DASH_SKELETON_BARS.map((h, i) => (
            <div
              key={i}
              className="skeleton flex-1 rounded-t"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type ProcessedData = {
  actuals: Record<string, number>;
  forecasts: Array<{
    targetTime: string;
    publishTime: string;
    horizon: number;
    generation: number;
  }>;
};

function toDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getDefaultLiveWindow() {
  const end = new Date();
  end.setMinutes(0, 0, 0);
  const start = new Date(end);
  start.setHours(start.getHours() - 24);
  return {
    start: toDateTimeLocalValue(start),
    end: toDateTimeLocalValue(end),
  };
}

function getLivePresetWindow(label: string) {
  // Live mode presets should be relative to "now".
  const end = new Date();
  end.setMinutes(0, 0, 0);
  const start = new Date(end);

  if (label === "24h") start.setHours(start.getHours() - 24);
  else if (label === "3 Days") start.setDate(start.getDate() - 3);
  else if (label === "1 Week") start.setDate(start.getDate() - 7);
  else if (label === "Full Month") start.setDate(start.getDate() - 31); // max allowed by API validation
  else start.setHours(start.getHours() - 24);

  return {
    start: toDateTimeLocalValue(start),
    end: toDateTimeLocalValue(end),
  };
}

function getDefaultStaticWindow() {
  // Keep static mode inside the bundled Jan 2024 dataset window.
  // Use the first preset (24h) so the chart renders immediately.
  return {
    start: PRESETS[0]!.startOffset,
    end: PRESETS[0]!.end,
  };
}

/* ── Date Presets ─────────────────────────────────────── */
const PRESETS = [
  { label: "24h", startOffset: "2024-01-25T00:00", end: "2024-01-26T00:00" },
  { label: "3 Days", startOffset: "2024-01-24T00:00", end: "2024-01-27T00:00" },
  { label: "1 Week", startOffset: "2024-01-20T00:00", end: "2024-01-27T00:00" },
  { label: "Full Month", startOffset: "2024-01-01T00:00", end: "2024-02-01T00:00" },
];

/* ── Multi-horizon colors ────────────────────────────── */
const HORIZON_LINES = [
  { h: 1, color: "#22D3EE", label: "1h" },
  { h: 4, color: "#10B981", label: "4h" },
  { h: 12, color: "#F59E0B", label: "12h" },
  { h: 24, color: "#A78BFA", label: "24h" },
  { h: 48, color: "#F43F5E", label: "48h" },
];

/* ── Custom Tooltip ──────────────────────────────────── */
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const actualPoint = payload.find((p) => p.dataKey === "actual");
  const forecastPoint = payload.find((p) => p.dataKey === "forecast");
  const actual = actualPoint?.value;
  const forecast = forecastPoint?.value;
  const dev = actual != null && forecast != null ? forecast - actual : null;
  const devPct = actual != null && actual !== 0 && dev != null ? (dev / actual) * 100 : null;
  const devPctText = Number.isFinite(devPct as number) ? `${(devPct as number).toFixed(1)}%` : "N/A";

  return (
    <div className="bg-[#14171C] border border-white/10 rounded-xl p-3 shadow-2xl min-w-[180px]">
      <div className="text-[11px] font-mono text-slate-400 mb-2 border-b border-white/5 pb-2">{label}</div>
      <div className="flex justify-between gap-4 py-0.5">
        <span className="text-[10px] font-mono" style={{ color: actualPoint?.color ?? "#06B6D4" }}>Actual</span>
        <span className="text-[11px] font-mono text-white font-bold">
          {actual != null ? `${actual.toLocaleString()} MW` : "N/A"}
        </span>
      </div>
      <div className="flex justify-between gap-4 py-0.5">
        <span className="text-[10px] font-mono" style={{ color: forecastPoint?.color ?? "#10B981" }}>Forecast</span>
        <span className="text-[11px] font-mono text-white font-bold">
          {forecast != null ? `${forecast.toLocaleString()} MW` : "N/A"}
        </span>
      </div>
      {dev != null && (
        <div className="border-t border-white/5 mt-1.5 pt-1.5 flex justify-between gap-4">
          <span className="text-[10px] font-mono text-slate-500">Deviation</span>
          <span className={`text-[11px] font-mono font-bold ${dev > 0 ? "text-amber-400" : "text-emerald-400"}`}>
            {dev > 0 ? "+" : ""}{dev.toFixed(0)} MW ({devPctText})
          </span>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<ProcessedData | null>(null);
  const [horizon, setHorizon] = useState<number>(4);
  const [debouncedHorizon, setDebouncedHorizon] = useState<number>(4);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [startDateStr, setStartDateStr] = useState<string>("2024-01-24T00:00");
  const [endDateStr, setEndDateStr] = useState<string>("2024-01-26T00:00");
  const [compareMode, setCompareMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [useApi, setUseApi] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [alertThresholdMw, setAlertThresholdMw] = useState<number | string>(1000);
  const [error, setError] = useState<string | null>(null);
  const [hideAlert, setHideAlert] = useState(false);

  const compareLines = useMemo(() => {
    if (!compareMode) return HORIZON_LINES;
    // In compare mode, make the horizon slider control which lines are shown.
    // Example: horizon=12 => show 1h, 4h, 12h. horizon=48 => show all.
    const h = Math.max(1, Math.round(horizon));
    const eligible = HORIZON_LINES.filter((l) => l.h <= h);
    return eligible.length ? eligible : [HORIZON_LINES[0]!];
  }, [compareMode, horizon]);

  /* ── Debounce horizon for chart computation ───────────── */
  const handleHorizonChange = useCallback((val: number) => {
    setHorizon(val); // update slider display instantly
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedHorizon(val), 150);
  }, []);

  const staticDataFetched = useRef(false);
  const requestIdRef = useRef(0);

  const switchDataSource = useCallback(
    (nextUseApi: boolean) => {
      staticDataFetched.current = false;
      requestIdRef.current += 1;
      setData(null);
      setLoading(true);
      setError(null);
      setHideAlert(false);
      if (nextUseApi) {
        const liveWindow = getDefaultLiveWindow();
        setStartDateStr(liveWindow.start);
        setEndDateStr(liveWindow.end);
      } else {
        const staticWindow = getDefaultStaticWindow();
        setStartDateStr(staticWindow.start);
        setEndDateStr(staticWindow.end);
      }
      setUseApi(nextUseApi);
      setAutoRefresh(false);
    },
    []
  );

  /* ── Data fetching ─────────────────────────────────── */
  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const requestedUseApi = useApi;
    if (!useApi && staticDataFetched.current) return;
    setLoading(true);
    setError(null);
    setHideAlert(false); // Reset hidden alert on new data fetch
    try {
      if (useApi) {
        const start = new Date(startDateStr).toISOString();
        const end = new Date(endDateStr).toISOString();
        const res = await fetch(`/api/wind-data?start=${start}&end=${end}`);
        const d = await res.json();
        if (d.error) throw new Error(d.error);
        if (requestId !== requestIdRef.current || requestedUseApi !== useApi) return;
        setData(d);
      } else {
        const res = await fetch("/data/processed_wind_data.json");
        const staticData = await res.json();
        if (requestId !== requestIdRef.current || requestedUseApi !== useApi) return;
        setData(staticData);
        staticDataFetched.current = true;
      }
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current || requestedUseApi !== useApi) return;
      console.error("Error loading data", err);
      setError(err instanceof Error ? err.message : "Failed to load data. Please try again.");
    } finally {
      if (requestId !== requestIdRef.current || requestedUseApi !== useApi) return;
      setLoading(false);
    }
  }, [useApi, startDateStr, endDateStr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Auto Refresh ──────────────────────────────────── */
  useEffect(() => {
    if (!useApi || !autoRefresh) return;
    const interval = setInterval(() => {
      fetchData();
    }, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [useApi, autoRefresh, fetchData]);

  /* ── Chart data ────────────────────────────────────── */
  const chartData = useMemo(() => {
    if (!data) return [];
    
    // Pre-group forecasts by target time to prevent O(N*M) lookups and eliminate lag
    const forecastsByTime = new Map<string, typeof data.forecasts>();
    for (const f of data.forecasts) {
      const arr = forecastsByTime.get(f.targetTime) || [];
      arr.push(f);
      forecastsByTime.set(f.targetTime, arr);
    }
    
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    const allTimes = new Set([
      ...Object.keys(data.actuals),
      ...forecastsByTime.keys(),
    ]);
    const sortedTimes = Array.from(allTimes)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .filter((t) => {
        const d = parseISO(t);
        return d.getTime() >= startDate.getTime() && d.getTime() <= endDate.getTime();
      });

    return sortedTimes.map((timeStr) => {
      const actualValue = data.actuals[timeStr] ?? null;
      const forecastsForTime = forecastsByTime.get(timeStr) || [];

      // Single horizon forecast:
      // prefer strict ">= selected horizon", then gracefully fall back
      // to the largest available horizon so points don't render as actual-only.
      const sortedByHorizon = [...forecastsForTime].sort((a, b) => a.horizon - b.horizon);
      const strictMatch = sortedByHorizon.find((f) => f.horizon >= debouncedHorizon);
      const fallbackMatch =
        strictMatch ?? (sortedByHorizon.length ? sortedByHorizon[sortedByHorizon.length - 1] : null);
      const forecastValue = fallbackMatch ? fallbackMatch.generation : null;

      // Multi-horizon forecasts
      const multiHorizon: Record<string, number | null> = {};
      if (compareMode) {
        for (const hl of compareLines) {
          const elig = forecastsForTime.filter(
            (f) => f.horizon >= hl.h
          );
          elig.sort((a, b) => a.horizon - b.horizon);
          multiHorizon[`h${hl.h}`] = elig.length > 0 ? elig[0].generation : null;
        }
      }

      return {
        time: timeStr,
        formattedTime: format(parseISO(timeStr), "dd/MM HH:mm"),
        actual: actualValue,
        forecast: compareMode ? null : forecastValue,
        band: !compareMode && actualValue != null && forecastValue != null
          ? [actualValue, forecastValue] : null,
        deviation: !compareMode && actualValue != null && forecastValue != null
          ? Math.abs(forecastValue - actualValue) : 0,
        ...multiHorizon,
      };
    });
  }, [data, startDateStr, endDateStr, debouncedHorizon, compareMode, compareLines]);

  /* ── KPI metrics ───────────────────────────────────── */
  const { currentOutput, currentOutputTrendPct, peakForecast, avgDevPct, latestDevMw, latestDevPct } = useMemo(() => {
    const validDataPoints = chartData.filter(d => d.actual != null && d.forecast != null);
    const latestValid = validDataPoints.length > 0 ? validDataPoints[validDataPoints.length - 1] : null;
    const latestDevMw = latestValid ? Math.abs((latestValid.forecast || 0) - (latestValid.actual || 0)) : 0;
    const latestDevPct = latestValid && latestValid.actual ? (latestDevMw / latestValid.actual) * 100 : 0;

    const validActuals = chartData.filter(d => d.actual != null).map(d => d.actual as number);
    const co = validActuals.length > 0 ? validActuals[validActuals.length - 1] : 0;
    const prev = validActuals.length > 1 ? validActuals[validActuals.length - 2] : null;
    const currentOutputTrendPct =
      prev != null && prev !== 0 ? ((co - prev) / prev) * 100 : null;
    const pf = Math.max(...chartData.map(d => d.forecast || 0), 0);
    const devs = chartData
      .filter(d => d.actual != null && d.forecast != null)
      .map(d => Math.abs((d.forecast || 0) - (d.actual || 0)));
    const avgDev = devs.length > 0 ? devs.reduce((a, b) => a + b, 0) / devs.length : 0;
    const meanActual = validActuals.length > 0 ? validActuals.reduce((a, b) => a + b, 0) / validActuals.length : 1;
    return { currentOutput: co, currentOutputTrendPct, peakForecast: pf, avgDevPct: (avgDev / meanActual) * 100, latestDevMw, latestDevPct };
  }, [chartData]);

  const latestActualTime = useMemo(() => {
    const validActuals = chartData.filter(d => d.actual != null);
    if (!validActuals.length) return null;
    return validActuals[validActuals.length - 1].time;
  }, [chartData]);

  const kpis: DashKpi[] = [
    { label: "Current Output", rawValue: currentOutput, suffix: " MW",   icon: Zap,       color: "text-cyan-400",    accentFrom: "from-cyan-500",    accentTo: "to-cyan-500/0",    trendPct: currentOutputTrendPct },
    { label: "Peak Forecast",  rawValue: peakForecast,  suffix: " MW",   icon: TrendingUp, color: "text-amber-400",   accentFrom: "from-amber-500",   accentTo: "to-amber-500/0",   hasDot: true },
    { label: "Avg Deviation",  rawValue: avgDevPct,     suffix: " %", prefix: "± ", decimals: 1, icon: BarChart3,  color: "text-emerald-400", accentFrom: "from-emerald-500", accentTo: "to-emerald-500/0" },
    { label: "Horizon",        rawValue: horizon,       suffix: " hours", icon: Clock,     color: "text-violet-400",  accentFrom: "from-violet-500",  accentTo: "to-violet-500/0",  hasDot: true },
  ];

  const analysisHref = useMemo(() => {
    if (!useApi) return "/analysis?source=static";

    const params = new URLSearchParams({
      source: "live",
      startDate: startDateStr.slice(0, 10),
      endDate: endDateStr.slice(0, 10),
    });

    return `/analysis?${params.toString()}`;
  }, [useApi, startDateStr, endDateStr]);

  useEffect(() => {
    router.prefetch(analysisHref);
  }, [analysisHref, router]);

  /* no full-screen blocking spinner — skeleton inline */

  return (
    <div id="dashboard-content" className="min-h-screen overflow-y-auto lg:h-screen lg:overflow-hidden bg-[#0B0D11] text-slate-300 font-sans p-4 lg:p-6 flex flex-col">
      <div className="max-w-[1700px] mx-auto w-full flex flex-col gap-4 lg:flex-1 lg:min-h-0">

        {/* HEADER */}
        <header style={{ animation: 'fadeSlideUp 0.4s ease-out both' }} className="px-2 flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tighter text-white">
              Wind Power Control Terminal
            </h1>
            <p className="text-slate-500 font-sans text-[11px] mt-1">
              UK Wind Power Forecast Dashboard | Energy Monitoring &amp; Analysis
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              data-tour="source-toggle"
              className="flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 p-1"
              title="Switch between bundled static dataset and live BMRS API"
            >
              <button
                type="button"
                onClick={() => switchDataSource(false)}
                data-testid="source-static"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-mono uppercase tracking-wider transition-all border ${
                  !useApi
                    ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-200"
                    : "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <Database size={14} />
                Static
              </button>
              <button
                type="button"
                onClick={() => switchDataSource(true)}
                data-testid="source-live"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-mono uppercase tracking-wider transition-all border ${
                  useApi
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-200"
                    : "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <Wifi size={14} />
                Live
              </button>
            </div>
            {useApi && latestActualTime && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] uppercase" title="Time of most recent actual generation reading">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                Live Data: {format(parseISO(latestActualTime), "dd/MM HH:mm")}
              </div>
            )}
            <Link
              data-tour="analysis-link"
              href={analysisHref}
              prefetch
              onMouseEnter={() => router.prefetch(analysisHref)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 hover:border-cyan-500/30 transition-all font-mono"
            >
              <BarChart2 size={14} /> Analysis
            </Link>
          </div>
        </header>

        {/* ERROR BANNER */}
        {error && (
          <div style={{ animation: 'fadeSlideUp 0.3s ease-out both' }} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 font-mono text-[11px]">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 transition-colors text-xs">✕</button>
          </div>
        )}

        {/* LOADING MESSAGE */}
        {loading && data && (
          <div style={{ animation: 'fadeSlideUp 0.2s ease-out both' }} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] mb-1">
            <RefreshCcw size={14} className="animate-spin flex-shrink-0" />
            <span className="flex-1">
              <strong>Processing:</strong> Switching to {useApi ? "Live Data Stream" : "Static Dataset"}...
            </span>
          </div>
        )}
        {loading && useApi && !data && (
          <div style={{ animation: 'fadeSlideUp 0.2s ease-out both' }} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] mb-1">
            <RefreshCcw size={14} className="animate-spin shrink-0" />
            <span className="flex-1">
              <strong>Live:</strong> Loading current live window...
            </span>
          </div>
        )}

        {/* DEVIATION ALERT BANNER */}
        {latestDevMw > (Number(alertThresholdMw) || 0) && !compareMode && !hideAlert && (
          <div style={{ animation: 'fadeSlideUp 0.3s ease-out both' }} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px] mb-1">
            <AlertCircle size={14} className="flex-shrink-0 animate-pulse" />
            <span className="flex-1">
              <strong>High Deviation Alert:</strong> The most recent actual generation deviates from the {horizon}h forecast by {latestDevMw.toFixed(0)} MW ({latestDevPct.toFixed(1)}%).
            </span>
            <button onClick={() => setHideAlert(true)} className="text-amber-400 hover:text-amber-200 transition-colors text-xs ml-2 p-1 rounded hover:bg-amber-500/20" title="Hide Alert">✕</button>
          </div>
        )}

        {/* MAIN LAYOUT */}
        <div className="flex flex-col lg:flex-row gap-4 lg:flex-1 lg:min-h-0">

          {/* SIDEBAR */}
          <div className="w-full lg:w-[280px] flex-shrink-0 flex flex-col gap-4 lg:overflow-y-auto lg:min-h-0 lg:pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">

            {/* Time Range */}
            <div data-tour="time-range" style={{ animation: 'fadeSlideUp 0.5s ease-out both', animationDelay: '0ms' }} className="flex-shrink-0 bg-[#14171C] border border-white/5 rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/50 group-hover:bg-cyan-400 transition-colors"></div>
              <h2 className="text-sm font-semibold text-white tracking-wide mb-3">Time Range</h2>

              {/* Presets */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => {
                      if (useApi) {
                        const w = getLivePresetWindow(p.label);
                        setStartDateStr(w.start);
                        setEndDateStr(w.end);
                      } else {
                        setStartDateStr(p.startOffset);
                        setEndDateStr(p.end);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all border ${
                      !useApi && startDateStr === p.startOffset && endDateStr === p.end
                        ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                        : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {useApi && (
                <div className="text-[10px] font-mono text-slate-500 mb-4">
                  Live mode presets are relative to now (max 31 days).
                </div>
              )}

              <div className="flex flex-col gap-4 pr-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">START TIME:</span>
                  <Input type="datetime-local" value={startDateStr}
                    onChange={(e) => setStartDateStr(e.target.value)}
                    className="bg-white/10 border-white/10 text-slate-200 h-9 font-mono text-[12px] px-3 rounded-md w-full"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">END TIME:</span>
                  <Input type="datetime-local" value={endDateStr}
                    onChange={(e) => setEndDateStr(e.target.value)}
                    className="bg-white/10 border-white/10 text-slate-200 h-9 font-mono text-[12px] px-3 rounded-md w-full"
                  />
                </div>
              </div>
            </div>

            {/* Horizon */}
            <div data-tour="horizon" style={{ animation: 'fadeSlideUp 0.5s ease-out both', animationDelay: '80ms' }} className="flex-shrink-0 bg-[#14171C] border border-white/5 rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
              <h2 className="text-sm font-semibold text-white tracking-wide mb-1">Horizon</h2>
              <p className="text-[11px] text-slate-400 mb-4 leading-relaxed pr-4">
                Shows the latest forecast made at least {horizon} hours before target.
              </p>
              <div className="pt-6 pb-1 px-2 relative">
                <div className="absolute -top-[10px] pointer-events-none z-10"
                  style={{ left: `calc(${(horizon / 48) * 100}% - 12px)` }}>
                  <span className="bg-cyan-500/20 text-cyan-300 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.3)]">
                    {horizon}h
                  </span>
                </div>
                <div className="absolute top-[20px] w-6 h-6 rounded-full bg-cyan-400/20 blur-md pointer-events-none"
                  style={{ left: `calc(${(horizon / 48) * 100}% - 4px)` }} />
                <Slider value={[horizon]} max={48} min={0} step={1}
                  onValueChange={(val: number[]) => handleHorizonChange(val[0])}
                  className="[&_.relative]:bg-white/10 [&_[data-slot=slider-range]]:bg-cyan-500 [&_[data-slot=slider-thumb]]:bg-cyan-200 [&_[data-slot=slider-thumb]]:border-4 [&_[data-slot=slider-thumb]]:border-cyan-500 [&_[data-slot=slider-thumb]]:w-4 [&_[data-slot=slider-thumb]]:h-4"
                />
                <div className="flex justify-between mt-4 text-[10px] font-mono text-slate-500 px-1 relative">
                  <span>0h</span>
                  <span className="absolute left-1/4 -translate-x-1/2">12h</span>
                  <span className="absolute left-1/2 -translate-x-1/2">24h</span>
                  <span className="absolute left-3/4 -translate-x-1/2">36h</span>
                  <span>48h</span>
                </div>
              </div>
            </div>

            {/* Alert Settings */}
            <div style={{ animation: 'fadeSlideUp 0.5s ease-out both', animationDelay: '120ms' }} className="flex-shrink-0 bg-[#14171C] border border-white/5 rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
              <h2 className="text-sm font-semibold text-white tracking-wide mb-3">Alert Settings</h2>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">DEVIATION THRESHOLD (MW):</span>
                <Input type="number" value={alertThresholdMw}
                  onChange={(e) => setAlertThresholdMw(e.target.value === "" ? "" : Number(e.target.value))}
                  className="bg-white/10 border-white/10 text-slate-200 h-9 font-mono text-[12px] px-3 rounded-md w-full"
                />
              </div>
            </div>

            {/* Compare Horizons Toggle */}
            <button
              onClick={() => setCompareMode(!compareMode)}
              style={{ animation: 'fadeSlideUp 0.5s ease-out both', animationDelay: '160ms' }}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-mono transition-all border ${
                compareMode
                  ? "bg-violet-500/15 border-violet-500/30 text-violet-300"
                  : "bg-[#14171C] border-white/5 text-slate-400 hover:border-white/10"
              }`}
            >
              <Layers size={16} />
              <span className="text-[11px] uppercase tracking-wider font-semibold">
                {compareMode ? "Comparing Horizons" : "Compare Horizons"}
              </span>
            </button>

            {/* Live Controls */}
            {useApi && (
              <div style={{ animation: 'fadeSlideUp 0.5s ease-out both', animationDelay: '240ms' }} className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    title={autoRefresh ? "Disable automatic 5-minute background refresh" : "Enable automatic background refresh (polls every 5 minutes)"}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] uppercase tracking-widest font-mono transition-all border ${
                      autoRefresh
                        ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-300"
                        : "bg-[#14171C] border-white/5 text-slate-400 hover:border-white/10"
                    }`}
                  >
                    <RefreshCcw size={12} className={autoRefresh ? "animate-[spin_3s_linear_infinite]" : ""} />
                    {autoRefresh ? "Auto On" : "Auto Off"}
                  </button>
                  <button
                    onClick={() => fetchData()}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] uppercase tracking-widest font-mono transition-all border bg-[#14171C] border-white/5 text-slate-400 hover:border-white/10 hover:text-white disabled:opacity-50"
                  >
                    <Download size={12} />
                    {loading ? "..." : "Refresh"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT CONTENT */}
          <div className="flex-grow flex flex-col gap-4 lg:min-h-0">

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
              {loading && !data
                ? kpis.map((_, i) => <SkeletonDashKpi key={i} delay={i * 80} />)
                : kpis.map((kpi, i) => <AnimatedDashKpi key={i} kpi={kpi} delay={i * 90} />)
              }
            </div>

            {/* Chart Card — skeleton while first load */}
            {loading && !data ? <SkeletonChartArea /> : null}
            <Card
              style={{
                animation: 'contentReveal 0.55s ease-out both',
                animationDelay: '160ms',
                display: loading && !data ? 'none' : undefined,
              }}
              className="lg:flex-1 lg:min-h-0 bg-[#14171C]/40 border-white/5 rounded-2xl p-4 lg:p-6 shadow-2xl relative overflow-hidden flex flex-col"
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>

              {/* Chart header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 flex-shrink-0">
                <div>
                  <CardTitle className="text-base sm:text-xl text-white tracking-tight flex flex-wrap items-center gap-2">
                    Wind Power Forecast (MW)
                    <span className="inline-flex items-center rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-400 border border-cyan-500/20 uppercase tracking-widest">
                      {compareMode ? "Multi-Horizon" : "Real-time Stream"}
                    </span>
                    {loading && <RefreshCcw className="animate-spin text-cyan-500" size={14} />}
                  </CardTitle>
                  <div className="text-[10px] font-mono text-slate-500 mt-1 uppercase">Generation (MW) vs Settlement Window</div>
                </div>
                <div className="flex items-center gap-4 px-3 py-2 bg-[#0B0D11]/50 rounded-xl border border-white/5 flex-shrink-0 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-cyan-500 rounded-sm"></div>
                    <span className="text-[10px] font-mono uppercase text-slate-400">Actual</span>
                  </div>
                  {compareMode ? (
                    compareLines.map((hl) => (
                      <div key={hl.h} className="flex items-center gap-1.5">
                        <div className="w-3 h-[2px]" style={{ backgroundColor: hl.color }}></div>
                        <span className="text-[10px] font-mono uppercase text-slate-400">{hl.label}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-[2px] bg-emerald-500"></div>
                      <span className="text-[10px] font-mono uppercase text-slate-400">Forecast</span>
                    </div>
                  )}
                  {/* Download CSV */}
                  <button
                    onClick={() => {
                      const headers = ["time", "actual", "forecast"];
                      const rows = chartData.map(d => [d.time, d.actual ?? "", d.forecast ?? ""].join(","));
                      const csv = [headers.join(","), ...rows].join("\n");

                      // Test harness: capture the CSV string for Playwright assertions.
                      const testWindow = window as TestWindow;
                      if (process.env.NODE_ENV === "test" || testWindow.__E2E) {
                        testWindow.__lastCsvDownload = csv;
                      }

                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href = url;
                      a.download = `wind_forecast_${startDateStr.slice(0,10)}_${endDateStr.slice(0,10)}.csv`;
                      a.click(); URL.revokeObjectURL(url);
                    }}
                    data-testid="download-csv"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30 transition-all"
                    title="Download CSV"
                  >
                    <Download size={11} />
                    <span className="text-[10px] font-mono uppercase">CSV</span>
                  </button>
                </div>
              </div>

              <div className="h-[280px] sm:h-[360px] lg:flex-1 lg:min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="1 1" vertical={true} stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="formattedTime" minTickGap={60}
                      tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'var(--font-mono)' }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'var(--font-mono)' }}
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}K`}
                      axisLine={false} tickLine={false} domain={['auto', 'auto']} dx={-6} width={30} />
                    <Tooltip content={compareMode ? undefined : <CustomTooltip />}
                      contentStyle={compareMode ? {
                        backgroundColor: '#14171C', borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)', padding: '10px', fontSize: '11px',
                      } : undefined}
                      cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                    <Area name="Actual" type="monotone" dataKey="actual" stroke="#06B6D4" strokeWidth={3}
                      fillOpacity={1} fill="url(#colorActual)"
                      isAnimationActive animationDuration={700} animationEasing="ease-out"
                      activeDot={{ r: 4, strokeWidth: 0, fill: '#fff' }} />
                    {compareMode ? (
                      compareLines.map((hl) => (
                        <Line key={hl.h} name={`Forecast ${hl.label}`} type="monotone"
                          dataKey={`h${hl.h}`} stroke={hl.color} strokeWidth={1.5}
                          strokeDasharray="4 4" dot={false} connectNulls
                          isAnimationActive animationDuration={700 + hl.h * 8} animationEasing="ease-out"
                          activeDot={{ r: 3, strokeWidth: 0, fill: hl.color }} />
                      ))
                    ) : (
                      <Line name="Forecasted" type="monotone" dataKey="forecast" stroke="#10B981"
                        strokeWidth={2} strokeDasharray="6 6" dot={false} connectNulls
                        isAnimationActive animationDuration={750} animationEasing="ease-out"
                        activeDot={{ r: 4, strokeWidth: 0, fill: '#10B981' }} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="text-[8px] font-mono text-slate-700 uppercase tracking-widest mt-2 text-center sm:text-right lg:absolute lg:bottom-4 lg:right-8">
                Secure Transmission Link: Operational | Elexon BMRS Insights v2.0
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
