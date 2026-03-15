"use client";

import { useState, useEffect } from "react";
import { format, parseISO, isAfter, isBefore } from "date-fns";
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
import { Zap, BarChart3, Clock, TrendingUp, RefreshCcw } from "lucide-react";

type ProcessedData = {
  actuals: Record<string, number>;
  forecasts: Array<{
    targetTime: string;
    publishTime: string;
    horizon: number;
    generation: number;
  }>;
};

export default function Dashboard() {
  const [data, setData] = useState<ProcessedData | null>(null);
  const [horizon, setHorizon] = useState<number>(4);
  const [startDateStr, setStartDateStr] = useState<string>("2024-01-24T00:00");
  const [endDateStr, setEndDateStr] = useState<string>("2024-01-26T00:00");

  useEffect(() => {
    fetch("/data/processed_wind_data.json")
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((err) => console.error("Error loading data", err));
  }, []);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0D11] text-cyan-500 font-mono">
        <RefreshCcw className="animate-spin mb-4" size={48} />
        <div className="text-xl tracking-widest uppercase">Initializing Terminal...</div>
      </div>
    );
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  const allTargetTimes = new Set([
    ...Object.keys(data.actuals),
    ...data.forecasts.map(f => f.targetTime)
  ]);

  const sortedTimes = Array.from(allTargetTimes)
    .sort()
    .filter((timeStr) => {
      const date = parseISO(timeStr);
      return isAfter(date, startDate) && isBefore(date, endDate);
    });

  const chartData = sortedTimes.map((timeStr) => {
    const actualValue = data.actuals[timeStr] || null;
    const eligibleForecasts = data.forecasts.filter(
      (f) => f.targetTime === timeStr && f.horizon >= horizon
    );
    eligibleForecasts.sort((a, b) => a.horizon - b.horizon);
    const forecastValue = eligibleForecasts.length > 0 ? eligibleForecasts[0].generation : null;
    return {
      time: timeStr,
      formattedTime: format(parseISO(timeStr), "dd/MM HH:mm"),
      actual: actualValue,
      forecast: forecastValue,
      band: (actualValue !== null && forecastValue !== null) ? [actualValue, forecastValue] : null,
      deviation: (actualValue !== null && forecastValue !== null) ? Math.abs(forecastValue - actualValue) : 0
    };
  });

  const validActuals = chartData.filter(d => d.actual !== null).map(d => d.actual as number);
  const currentOutput = validActuals.length > 0 ? validActuals[validActuals.length - 1] : 0;
  const peakForecast = Math.max(...chartData.map(d => d.forecast || 0));
  const deviations = chartData
    .filter(d => d.actual !== null && d.forecast !== null)
    .map(d => Math.abs((d.forecast || 0) - (d.actual || 0)));
  const avgDeviation = deviations.length > 0 ? deviations.reduce((a, b) => a + b, 0) / deviations.length : 0;
  const avgDevPct = validActuals.reduce((a, b) => a + b, 0) > 0
    ? (avgDeviation / (validActuals.reduce((a, b) => a + b, 0) / validActuals.length)) * 100
    : 0;

  const kpis = [
    { label: "Current Output", value: `${currentOutput.toLocaleString()} MW`, icon: Zap, color: "text-cyan-400", accentFrom: "from-cyan-500", accentTo: "to-cyan-500/0", sub: "", trend: true },
    { label: "Peak Forecast", value: `${peakForecast.toLocaleString()} MW`, icon: TrendingUp, color: "text-amber-400", accentFrom: "from-amber-500", accentTo: "to-amber-500/0", sub: "25/01 14:30", hasDot: true },
    { label: "Avg Deviation", value: `± ${avgDevPct.toFixed(1)} %`, icon: BarChart3, color: "text-emerald-400", accentFrom: "from-emerald-500", accentTo: "to-emerald-500/0", sub: "+450 MW | -120 MW" },
    { label: "Horizon", value: `${horizon} hours`, icon: Clock, color: "text-violet-400", accentFrom: "from-violet-500", accentTo: "to-violet-500/0", sub: "Next Update in 00:02:34", hasDot: true },
  ];

  return (
    /*
     * Desktop: h-screen overflow-hidden — classic no-scroll terminal look
     * Mobile:  min-h-screen overflow-y-auto — content scrolls naturally
     */
    <div className="min-h-screen overflow-y-auto lg:h-screen lg:overflow-hidden bg-[#0B0D11] text-slate-300 font-sans p-4 lg:p-6 flex flex-col">
      <div className="max-w-[1700px] mx-auto w-full flex flex-col gap-4 lg:flex-1 lg:min-h-0">

        {/* HEADER */}
        <header className="px-2 flex-shrink-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tighter text-white">
            Wind Power Control Terminal
          </h1>
          <p className="text-slate-500 font-sans text-[11px] mt-1">
            UK Wind Power Forecast Dashboard | Energy Monitoring &amp; Analysis
          </p>
        </header>

        {/* MAIN LAYOUT */}
        <div className="flex flex-col lg:flex-row gap-4 lg:flex-1 lg:min-h-0">

          {/* SIDEBAR */}
          <div className="w-full lg:w-[280px] flex-shrink-0 flex flex-col gap-4">

            {/* Time Range */}
            <div className="bg-[#14171C] border border-white/5 rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/50 group-hover:bg-cyan-400 transition-colors"></div>
              <h2 className="text-sm font-semibold text-white tracking-wide mb-4">Time Range</h2>
              <div className="flex flex-col gap-4 pr-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">START TIME:</span>
                  <Input
                    type="datetime-local"
                    value={startDateStr}
                    onChange={(e) => setStartDateStr(e.target.value)}
                    className="bg-white/10 border-white/10 text-slate-200 h-9 font-mono text-[12px] px-3 rounded-md w-full"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">END TIME:</span>
                  <Input
                    type="datetime-local"
                    value={endDateStr}
                    onChange={(e) => setEndDateStr(e.target.value)}
                    className="bg-white/10 border-white/10 text-slate-200 h-9 font-mono text-[12px] px-3 rounded-md w-full"
                  />
                </div>
              </div>
            </div>

            {/* Horizon */}
            <div className="bg-[#14171C] border border-white/5 rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
              <h2 className="text-sm font-semibold text-white tracking-wide mb-1">Horizon</h2>
              <p className="text-[11px] text-slate-400 mb-4 leading-relaxed pr-4">
                Shows the latest forecast made at least {horizon} hours before target.
              </p>
              <div className="pt-6 pb-1 px-2 relative">
                <div
                  className="absolute -top-[10px] pointer-events-none z-10"
                  style={{ left: `calc(${(horizon / 48) * 100}% - 12px)` }}
                >
                  <span className="bg-cyan-500/20 text-cyan-300 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.3)]">
                    {horizon}h
                  </span>
                </div>
                <div
                  className="absolute top-[20px] w-6 h-6 rounded-full bg-cyan-400/20 blur-md pointer-events-none"
                  style={{ left: `calc(${(horizon / 48) * 100}% - 4px)` }}
                />
                <Slider
                  value={[horizon]}
                  max={48}
                  min={0}
                  step={1}
                  onValueChange={(val: any) => setHorizon(val[0])}
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
          </div>

          {/* RIGHT CONTENT */}
          <div className="flex-grow flex flex-col gap-4 lg:min-h-0">

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
              {kpis.map((kpi, i) => (
                <div key={i} className="bg-[#14171C]/80 border border-white/5 rounded-[12px] px-4 py-3 hover:border-white/10 transition-all shadow-lg flex flex-col gap-2 lg:justify-between lg:gap-0 h-auto lg:h-[86px] relative overflow-hidden group">
                  <div className={`absolute top-0 left-0 w-[3px] h-full bg-gradient-to-b ${kpi.accentFrom} ${kpi.accentTo} opacity-60 group-hover:opacity-100 transition-opacity`}></div>
                  <div className="flex items-center justify-between">
                    <div className="bg-[#0B0D11] p-1.5 rounded-lg border border-white/5">
                      <kpi.icon size={14} className={kpi.color} />
                    </div>
                    {kpi.trend && <div className="text-[10px] text-emerald-500 font-mono font-medium flex items-center gap-0.5"><TrendingUp size={10} />+2.4%</div>}
                    {kpi.hasDot && (
                      <div className="flex flex-col gap-[3px]">
                        <div className="w-[3px] h-[3px] bg-slate-500 rounded-full"></div>
                        <div className="w-[3px] h-[3px] bg-slate-500 rounded-full"></div>
                        <div className="w-[3px] h-[3px] bg-slate-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-0.5 truncate">{kpi.label}</div>
                    <div className="flex items-baseline gap-2 overflow-hidden">
                      <div className={`text-lg font-mono tracking-tight font-bold ${kpi.color} truncate`}>{kpi.value}</div>
                      {kpi.sub && <div className="text-[9px] font-mono text-slate-600 truncate flex-shrink-0 hidden sm:block lg:hidden xl:block">{kpi.sub}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Chart Card */}
            {/*
             * Desktop: flex-1 min-h-0 — fills remaining vertical space, no scroll
             * Mobile:  auto height with explicit chart div height below
             */}
            <Card className="lg:flex-1 lg:min-h-0 bg-[#14171C]/40 border-white/5 rounded-2xl p-4 lg:p-6 shadow-2xl relative overflow-hidden flex flex-col">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>

              {/* Chart header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 flex-shrink-0">
                <div>
                  <CardTitle className="text-base sm:text-xl text-white tracking-tight flex flex-wrap items-center gap-2">
                    Wind Power Forecast (MW)
                    <span className="inline-flex items-center rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-400 border border-cyan-500/20 uppercase tracking-widest">
                      Real-time Stream
                    </span>
                  </CardTitle>
                  <div className="text-[10px] font-mono text-slate-500 mt-1 uppercase">Generation (MW) vs Settlement Window</div>
                </div>
                <div className="flex items-center gap-4 px-3 py-2 bg-[#0B0D11]/50 rounded-xl border border-white/5 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-cyan-500 rounded-sm"></div>
                    <span className="text-[10px] font-mono uppercase text-slate-400">Actual</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-[2px] bg-emerald-500"></div>
                    <span className="text-[10px] font-mono uppercase text-slate-400">Forecast</span>
                  </div>
                </div>
              </div>

              {/*
               * Desktop: flex-1 min-h-0 fills the card's remaining height
               * Mobile: fixed pixel height so ResponsiveContainer has a concrete size
               */}
              <div className="h-[280px] sm:h-[360px] lg:flex-1 lg:min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorBand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F8FAFC" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="#F8FAFC" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="1 1" vertical={true} stroke="rgba(255,255,255,0.03)" />
                    <XAxis
                      dataKey="formattedTime"
                      minTickGap={60}
                      tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'var(--font-mono)' }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'var(--font-mono)' }}
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}K`}
                      axisLine={false}
                      tickLine={false}
                      domain={['auto', 'auto']}
                      dx={-6}
                      width={30}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#14171C',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)',
                        padding: '12px'
                      }}
                      labelStyle={{ fontWeight: 'bold', color: '#F8FAFC', marginBottom: '8px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                      itemStyle={{ fontSize: '11px', fontFamily: 'var(--font-mono)', padding: '2px 0' }}
                      cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                    />
                    <Area type="monotone" dataKey="band" stroke="none" fill="url(#colorBand)" connectNulls />
                    <Area name="Actual" type="monotone" dataKey="actual" stroke="#06B6D4" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" activeDot={{ r: 4, strokeWidth: 0, fill: '#fff' }} />
                    <Line name="Forecasted" type="monotone" dataKey="forecast" stroke="#10B981" strokeWidth={2} strokeDasharray="6 6" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#10B981' }} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="text-[8px] font-mono text-slate-700 uppercase tracking-widest mt-2 text-center sm:text-right lg:absolute lg:bottom-4 lg:right-8">
                Secure Transmission Link: Operational | Elexon BMRS Insights v1.2
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
