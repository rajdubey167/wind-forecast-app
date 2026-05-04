"use client";

import { useEffect, useRef, useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Database,
  RefreshCcw,
  Target,
  TrendingDown,
  Wifi,
  Download,
} from "lucide-react";
import type { AnalysisViewModel } from "@/lib/analysis";

import {
  HorizonChartCard,
  HourChartCard,
  HistogramChartCard,
  ScatterChartCard,
  RegimeChartCard,
} from "@/components/analysis/chart-cards";

type DashKpi = {
  label: string; rawValue: number; prefix?: string; suffix: string; decimals?: number;
  icon: React.ElementType; color: string; accentFrom: string; accentTo: string;
  trend?: boolean; hasDot?: boolean;
};

const MAX_SCATTER_POINTS = 500;

function downsampleScatter<T>(rows: T[], maxPoints: number) {
  if (rows.length <= maxPoints) return rows;
  const step = rows.length / maxPoints;
  const sampled: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    sampled.push(rows[Math.floor(i * step)]);
  }
  return sampled;
}

function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(target);
  const raf = useRef<number | null>(null);
  const prev = useRef(target);

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
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, duration]);

  return val;
}

function HydrationLoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 bg-[#0B0D11] text-slate-300 font-sans overflow-hidden">
      <div className="h-full w-full flex items-start justify-center pt-[14vh] p-6">
        <div className="w-[min(560px,94%)] rounded-2xl border border-cyan-500/25 bg-[#11151D] p-6 shadow-[0_0_24px_rgba(6,182,212,0.12)]">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-4">
            <span className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80 font-mono">Forecast Analysis</span>
            <span className="text-[10px] uppercase text-cyan-400/80 font-mono">Loading</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-full border-2 border-cyan-400/30 border-t-cyan-300 animate-spin" />
            <p className="text-lg text-cyan-100 font-mono">Initializing analysis view...</p>
          </div>
          <p className="mt-2 text-[11px] text-slate-400 font-mono">Waiting for charts and interactions to become ready.</p>
          <div className="mt-5 h-2.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div className="analysis-progress h-full w-1/2 rounded-full bg-linear-to-r from-cyan-500/70 via-emerald-400/70 to-cyan-500/70" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AnimatedDashKpi({ kpi, delay }: { kpi: DashKpi; delay: number }) {
  const animated = useCountUp(kpi.rawValue);
  const formatted = (kpi.decimals ?? 0) > 0
    ? animated.toFixed(kpi.decimals)
    : Math.round(animated).toLocaleString();

  return (
    <div
      style={{ animation: `fadeSlideUp 0.55s ease-out both`, animationDelay: `${delay}ms` }}
      className="bg-[#14171C]/80 border border-white/5 rounded-[12px] px-4 py-3 hover:border-white/10 transition-all shadow-lg flex flex-col gap-2 lg:justify-between lg:gap-0 h-auto lg:h-[86px] relative overflow-hidden group"
    >
      <div className={`absolute top-0 left-0 w-[3px] h-full bg-linear-to-b ${kpi.accentFrom} ${kpi.accentTo} opacity-60 group-hover:opacity-100 transition-opacity`} />
      <div className="flex items-center justify-between">
        <div className="bg-[#0B0D11] p-1.5 rounded-lg border border-white/5">
          <kpi.icon size={14} className={kpi.color} />
        </div>
        {kpi.trend && <div className="text-[10px] text-emerald-500 font-mono font-medium flex items-center gap-0.5"><TrendingDown size={10} />-1.2%</div>}
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

export default function AnalysisClient({
  viewModel,
  source,
  startDate,
  endDate,
  printMode = false,
  liveError,
}: {
  viewModel: AnalysisViewModel;
  source: "static" | "live";
  startDate: string;
  endDate: string;
  printMode?: boolean;
  liveError?: string | null;
}) {
  const [bootComplete, setBootComplete] = useState(false);
  const [liveStartDate, setLiveStartDate] = useState(startDate);
  const [liveEndDate, setLiveEndDate] = useState(endDate);

  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingMsg, setLoadingMsg] = useState<string | null>(null);

  useEffect(() => {
    setLiveStartDate(startDate);
    setLiveEndDate(endDate);
  }, [startDate, endDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => setBootComplete(true), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  const buildLiveAnalysisHref = (nextStartDate: string, nextEndDate: string) => {
    const params = new URLSearchParams({
      source: "live",
      startDate: nextStartDate,
      endDate: nextEndDate,
    });
    return `/analysis?${params.toString()}`;
  };

  const kpiCards: DashKpi[] = [
    { label: "Mean Error (MAE)",       rawValue: viewModel.kpis.mae,          suffix: " MW", decimals: 0, icon: Activity,      color: "text-cyan-400",   accentFrom: "from-cyan-500",   accentTo: "to-cyan-500/0" },
    { label: "Typical Error (MedAE)",  rawValue: viewModel.kpis.medae,        suffix: " MW", decimals: 0, icon: Target,        color: "text-emerald-400", accentFrom: "from-emerald-500", accentTo: "to-emerald-500/0" },
    { label: "Worst 1% Error (P99)",   rawValue: viewModel.kpis.p99,          suffix: " MW", decimals: 0, icon: AlertTriangle, color: "text-amber-400",  accentFrom: "from-amber-500",  accentTo: "to-amber-500/0" },
    { label: "Forecast RMSE",          rawValue: viewModel.kpis.rmse,         suffix: " MW", decimals: 0, icon: TrendingDown,  color: "text-violet-400", accentFrom: "from-violet-500", accentTo: "to-violet-500/0" },
    { label: "Over-forecast Rate",     rawValue: viewModel.biasStats.biasPct, suffix: " %",  decimals: 1, icon: Target,        color: "text-rose-400",   accentFrom: "from-rose-500",   accentTo: "to-rose-500/0" },
  ];

  const scatterData = useMemo(() => {
    const points = viewModel.exportRows
      .filter((r) => r.actual != null && r.forecast != null)
      .map((r) => ({
        actual: r.actual!,
        forecast: r.forecast!,
        errorAbs: Math.abs(r.error),
        targetTime: r.targetTime,
      }));
    return downsampleScatter(points, MAX_SCATTER_POINTS);
  }, [viewModel.exportRows]);

  if (!bootComplete) {
    return <HydrationLoadingScreen />;
  }

  return (
    <div
      key={`${source}|${startDate}|${endDate}|${printMode ? "print" : "screen"}`}
      id="analysis-content"
      className="min-h-screen bg-[#0B0D11] text-slate-300 font-sans p-4 lg:p-6"
    >
      <div className="max-w-[1700px] mx-auto w-full flex flex-col gap-5">
        {liveError && (
          <div
            style={{ animation: "fadeSlideUp 0.2s ease-out both" }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 font-mono text-[11px]"
          >
            <AlertTriangle size={14} className="shrink-0" />
            <span className="flex-1">
              <strong>Live fetch failed:</strong> {liveError}. Showing static dataset instead.
            </span>
          </div>
        )}
        {printMode && (
          <section className="print-only rounded-2xl border border-white/10 bg-[#0B0D11] p-5">
            <div className="text-white font-extrabold tracking-tighter text-2xl">
              Forecast Error Analysis — Summary
            </div>
            <div className="mt-2 text-[11px] font-mono text-slate-300/90 leading-relaxed">
              <div>Source: {source === "live" ? "Live BMRS API" : "Static January 2024 Dataset"}</div>
              <div>Window: {startDate} → {endDate}</div>
              <div className="mt-2 text-slate-400">
                MAE {viewModel.kpis.mae.toFixed(0)} MW · MedAE {viewModel.kpis.medae.toFixed(0)} MW ·
                P99 {viewModel.kpis.p99.toFixed(0)} MW · RMSE {viewModel.kpis.rmse.toFixed(0)} MW ·
                Bias {viewModel.biasStats.biasPct.toFixed(1)}%
              </div>
            </div>
            <div className="print-page-break" />
          </section>
        )}
        <header
          style={{ animation: "fadeSlideUp 0.65s ease-out both" }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        >
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tighter text-white">
              Forecast Error Analysis
            </h1>
            <p className="text-slate-500 font-sans text-[11px] mt-1">
              Error Characteristics · Where & why the forecast misses
            </p>
          </div>
          <div className="flex items-center gap-2 no-print">
            {source === "live" && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] uppercase" title="Live data connection active">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                Live
              </div>
            )}
            <button
              onClick={() => {
                const headers = ["Target Time", "Actual", "Forecast", "Horizon", "Error"];
                const rows = viewModel.exportRows.map(r => [r.targetTime, r.actual, r.forecast, r.horizon, r.error.toFixed(2)].join(","));
                const csv = [headers.join(","), ...rows].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url;
                a.download = `analysis_export_${startDate}_to_${endDate}.csv`;
                a.click(); URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 hover:border-cyan-500/30 transition-all font-mono"
              title={source === "live" ? "Export live analysis data to CSV" : "Export static analysis data to CSV"}
            >
              <Download size={14} /> {source === "live" ? "CSV" : "CSV"}
            </button>
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 hover:border-cyan-500/30 transition-all font-mono"
            >
              <ArrowLeft size={14} /> Back to Dashboard (Inputs)
            </Link>
          </div>
        </header>

        {/* LOADING MESSAGE */}
        {isPending && loadingMsg && (
          <div style={{ animation: 'fadeSlideUp 0.2s ease-out both' }} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[11px]">
            <RefreshCcw size={14} className="animate-spin shrink-0" />
            <span className="flex-1">
              <strong>Processing:</strong> {loadingMsg}
            </span>
          </div>
        )}

        <div
          data-tour="analysis-source"
          style={{ animation: "fadeSlideUp 0.65s ease-out both", animationDelay: "120ms" }}
          className="bg-[#14171C] border border-white/5 rounded-2xl p-4 shadow-2xl flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-white tracking-wide">Analysis Source</h2>
            <p className="text-[11px] text-slate-400">
              Choose the bundled January dataset or run the analysis on a live BMRS date window.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  setLoadingMsg("Loading Static Dataset...");
                  startTransition(() => router.push("/analysis?source=static"));
                }}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-mono transition-all border ${
                  source === "static"
                    ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-300"
                    : "bg-[#0B0D11] border-white/5 text-slate-400 hover:border-white/10"
                }`}
              >
                <Database size={16} />
                <span className="text-[11px] uppercase tracking-wider font-semibold">Static Analysis</span>
              </button>
              <button
                onClick={() => {
                  setLoadingMsg("Fetching Live BMRS Data...");
                  startTransition(() =>
                    router.push(buildLiveAnalysisHref(liveStartDate, liveEndDate))
                  );
                }}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-mono transition-all border ${
                  source === "live"
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                    : "bg-[#0B0D11] border-white/5 text-slate-400 hover:border-white/10"
                }`}
              >
                <Wifi size={16} />
                <span className="text-[11px] uppercase tracking-wider font-semibold">Live BMRS Analysis</span>
              </button>
            </div>

            {source === "live" && (
              <form 
                data-tour="analysis-date-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  setLoadingMsg("Fetching Live BMRS Data...");
                  startTransition(() => {
                    router.push(buildLiveAnalysisHref(liveStartDate, liveEndDate));
                    router.refresh();
                  });
                }}
                key={`${startDate}|${endDate}|${source}`}
                className="flex flex-col sm:flex-row gap-3 lg:items-end"
              >
                <input type="hidden" name="source" value="live" />
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Start Date</span>
                  <Input
                    type="date"
                    name="startDate"
                    value={liveStartDate}
                    onChange={(e) => setLiveStartDate(e.target.value)}
                    className="bg-white/10 border-white/10 text-slate-200 h-9 font-mono text-[12px] px-3 rounded-md"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">End Date</span>
                  <Input
                    type="date"
                    name="endDate"
                    value={liveEndDate}
                    onChange={(e) => setLiveEndDate(e.target.value)}
                    className="bg-white/10 border-white/10 text-slate-200 h-9 font-mono text-[12px] px-3 rounded-md"
                  />
                </label>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 px-4 h-9 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 hover:border-emerald-500/30 transition-all font-mono"
                >
                  <RefreshCcw size={12} />
                  <span className="text-[11px] uppercase tracking-wider font-semibold">Apply Dates</span>
                </button>
                <button
                  data-tour="analysis-refresh"
                  type="button"
                  onClick={() => {
                    setLoadingMsg("Refreshing current live window...");
                    startTransition(() => {
                      router.push(buildLiveAnalysisHref(liveStartDate, liveEndDate));
                      router.refresh();
                    });
                  }}
                  className="flex items-center justify-center gap-2 px-4 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-sm text-emerald-200 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all font-mono"
                  title="Refresh current applied live date window"
                >
                  <RefreshCcw size={12} />
                  <span className="text-[11px] uppercase tracking-wider font-semibold">Refresh Live</span>
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 shrink-0">
          {kpiCards.map((kpi, index) => <AnimatedDashKpi key={kpi.label} kpi={kpi} delay={120 + index * 70} />)}
        </div>

        {/* BIAS NARRATIVE */}
        <div
          style={{ animation: "fadeSlideUp 0.65s ease-out both", animationDelay: "230ms" }}
          className="bg-[#14171C]/60 border border-white/5 rounded-xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 shrink-0"
        >
          <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest shrink-0 pt-0.5">Forecast Behaviour</span>
          <p className="text-[12px] text-slate-300 leading-relaxed">
            {viewModel.biasStats.biasPct >= 50
              ? <>The model <strong className="text-amber-400">over-forecast {viewModel.biasStats.biasPct.toFixed(0)}%</strong> of the time</>
              : <>The model <strong className="text-emerald-400">under-forecast {(100 - viewModel.biasStats.biasPct).toFixed(0)}%</strong> of the time</>}
            {" "}with a mean bias of{" "}
            <strong className={viewModel.biasStats.biasMw >= 0 ? "text-amber-400" : "text-emerald-400"}>
              {viewModel.biasStats.biasMw >= 0 ? "+" : ""}{viewModel.biasStats.biasMw.toFixed(0)} MW
            </strong>
            {viewModel.biasStats.biasMw >= 0
              ? " — the model systematically over-estimates generation."
              : " — the model systematically under-estimates generation."}{" "}
            The charts below break this down by lead time and hour of day.
          </p>
        </div>

        <div className="relative">
          <div className="transition-all duration-700 opacity-100 blur-0 scale-100">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
          <Card style={{ animation: `fadeSlideUp 0.65s ease-out both`, animationDelay: "260ms" }} className="reveal-smooth bg-[#14171C]/40 border-white/5 rounded-2xl p-5 shadow-2xl">
            <CardTitle className="text-base text-white tracking-tight mb-1">
              Error vs Forecast Horizon
            </CardTitle>
            <p className="text-[10px] font-mono text-slate-500 uppercase mb-4">
              How error increases with lead time (0-48h)
            </p>
            <HorizonChartCard data={viewModel.horizonData} isAnimationActive={!printMode} animationBegin={320} />
          </Card>

          <Card style={{ animation: `fadeSlideUp 0.65s ease-out both`, animationDelay: "320ms" }} className="reveal-smooth bg-[#14171C]/40 border-white/5 rounded-2xl p-5 shadow-2xl">
            <CardTitle className="text-base text-white tracking-tight mb-1">
              Error by Time of Day
            </CardTitle>
            <p className="text-[10px] font-mono text-slate-500 uppercase mb-4">
              Mean Absolute Error by UTC hour of target time
            </p>
            <HourChartCard data={viewModel.hourData} isAnimationActive={!printMode} animationBegin={380} />
          </Card>

          <Card style={{ animation: `fadeSlideUp 0.65s ease-out both`, animationDelay: "380ms" }} className="reveal-smooth bg-[#14171C]/40 border-white/5 rounded-2xl p-5 shadow-2xl">
            <CardTitle className="text-base text-white tracking-tight mb-1">
              Error by Wind Regime
            </CardTitle>
            <p className="text-[10px] font-mono text-slate-500 uppercase mb-4">
              Simulated offshore vs onshore characteristics
            </p>
            <RegimeChartCard data={viewModel.regimeData} isAnimationActive={!printMode} animationBegin={440} />
          </Card>

          <Card style={{ animation: `fadeSlideUp 0.65s ease-out both`, animationDelay: "440ms" }} className="reveal-smooth bg-[#14171C]/40 border-white/5 rounded-2xl p-5 shadow-2xl">
            <CardTitle className="text-base text-white tracking-tight mb-1">
              Error Distribution
            </CardTitle>
            <p className="text-[10px] font-mono text-slate-500 uppercase mb-4">
              Histogram of (Forecast - Actual) errors
            </p>
            <HistogramChartCard data={viewModel.histogramData} isAnimationActive={!printMode} animationBegin={500} />
          </Card>

          <Card style={{ animation: `fadeSlideUp 0.65s ease-out both`, animationDelay: "500ms" }} className="reveal-smooth bg-[#14171C]/40 border-white/5 rounded-2xl p-5 shadow-2xl flex flex-col lg:col-span-2">
            <CardTitle className="text-base text-white tracking-tight mb-1">
              Forecast vs Actual Correlation
            </CardTitle>
            <p className="text-[10px] font-mono text-slate-500 uppercase mb-4">
              Scatter plot of target predictions vs true generation
            </p>
            <ScatterChartCard data={scatterData} isAnimationActive={false} animationBegin={0} />
          </Card>

          <Card style={{ animation: `fadeSlideUp 0.65s ease-out both`, animationDelay: "560ms" }} className="reveal-smooth bg-[#14171C]/40 border-white/5 rounded-2xl p-5 shadow-2xl flex flex-col">
            <CardTitle className="text-base text-white tracking-tight mb-1">
              Reliable Wind Capacity
            </CardTitle>
            <p className="text-[10px] font-mono text-slate-500 uppercase mb-4">
              Dependable generation based on Jan 2024 actuals
            </p>
            {viewModel.capacityStats && (
              <div className="flex-1 flex flex-col gap-3">
                  {viewModel.capacityBars.map((item, index) => (
                    <div key={item.label} className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-400">{item.label}</span>
                        <span className="text-white font-bold">
                          {item.value.toFixed(0)} MW{" "}
                          <span className="text-slate-500 font-normal">({item.pct})</span>
                        </span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full`}
                          style={{
                            width: `${Math.max(item.width, 2)}%`,
                            transitionProperty: "width",
                            transitionDuration: "1.8s",
                            transitionTimingFunction: "cubic-bezier(0.25, 1, 0.5, 1)",
                            transitionDelay: `${620 + index * 140}ms`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="mt-auto pt-3 border-t border-white/5">
                    <p className="text-[10px] font-mono text-slate-500 leading-relaxed">
                      <span className="text-amber-400 font-bold">Recommendation:</span>{" "}
                      For 95% reliability, plan for{" "}
                      <span className="text-white font-bold">{viewModel.capacityStats.p95.toFixed(0)} MW</span>{" "}
                      dependable wind capacity. Mean generation ({viewModel.capacityStats.mean.toFixed(0)} MW) is
                      unreliable - actual output falls below it about 50% of the time.
                    </p>
                  </div>
              </div>
            )}
          </Card>
            </div>
          </div>
        </div>
        <div className="text-[8px] font-mono text-slate-700 uppercase tracking-widest text-center py-2">
          {source === "live"
            ? `Data Source: Live Elexon BMRS API | Window ${startDate} to ${endDate}`
            : "Data Source: Static January 2024 Dataset | Wind Power Forecast Analysis"}
        </div>
      </div>
    </div>
  );
}
