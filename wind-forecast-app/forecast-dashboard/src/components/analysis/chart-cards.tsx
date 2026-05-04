"use client";

import { memo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Scatter,
} from "recharts";

type ChartTooltipPayload = {
  name: string;
  color: string;
  value: number | string;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-[#14171C] border border-white/10 rounded-xl p-3 shadow-2xl text-xs font-mono">
      <div className="text-slate-400 mb-2">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-6">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="text-white font-bold">
            {typeof p.value === "number" ? p.value.toFixed(1) : p.value} MW
          </span>
        </div>
      ))}
    </div>
  );
}

type HorizonDatum = {
  horizon: string;
  MAE: number;
  Median: number;
  P99: number;
};

type HourDatum = {
  hour: string;
  MAE: number;
};

type HistogramDatum = {
  range: string;
  count: number;
};

export const HorizonChartCard = memo(function HorizonChartCard({
  data,
  animationBegin = 0,
  isAnimationActive = true,
}: {
  data: HorizonDatum[];
  animationBegin?: number;
  isAnimationActive?: boolean;
}) {
  return (
    <div className="relative h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%" debounce={0}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="1 1" stroke="rgba(255,255,255,0.03)" />
          <XAxis dataKey="horizon" tick={{ fontSize: 9, fill: "#64748b", fontFamily: "var(--font-mono)" }} axisLine={{ stroke: "rgba(255,255,255,0.05)" }} tickLine={false} />
          <YAxis tick={{ fontSize: 9, fill: "#64748b", fontFamily: "var(--font-mono)" }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}K`} axisLine={false} tickLine={false} width={35} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: "10px", fontFamily: "var(--font-mono)" }} />
          <Line name="MAE" type="monotone" dataKey="MAE" stroke="#06B6D4" strokeWidth={2} dot={false} isAnimationActive={isAnimationActive} animationBegin={animationBegin} animationDuration={600} animationEasing="ease-out" />
          <Line name="Median" type="monotone" dataKey="Median" stroke="#10B981" strokeWidth={2} dot={false} isAnimationActive={isAnimationActive} animationBegin={animationBegin} animationDuration={600} animationEasing="ease-out" />
          <Line name="P99" type="monotone" dataKey="P99" stroke="#F59E0B" strokeWidth={2} strokeDasharray="6 3" dot={false} isAnimationActive={isAnimationActive} animationBegin={animationBegin} animationDuration={600} animationEasing="ease-out" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});

export const HourChartCard = memo(function HourChartCard({
  data,
  animationBegin = 0,
  isAnimationActive = true,
}: {
  data: HourDatum[];
  animationBegin?: number;
  isAnimationActive?: boolean;
}) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%" debounce={0}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="1 1" stroke="rgba(255,255,255,0.03)" />
          <XAxis dataKey="hour" tick={{ fontSize: 8, fill: "#64748b", fontFamily: "var(--font-mono)" }} axisLine={{ stroke: "rgba(255,255,255,0.05)" }} tickLine={false} />
          <YAxis tick={{ fontSize: 9, fill: "#64748b", fontFamily: "var(--font-mono)" }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}K`} axisLine={false} tickLine={false} width={35} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="MAE" fill="#06B6D4" radius={[4, 4, 0, 0]} opacity={0.8} isAnimationActive={isAnimationActive} animationBegin={animationBegin} animationDuration={600} animationEasing="ease-out" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export type RegimeDatum = {
  regime: string;
  MAE: number;
  Bias: number;
};

export const RegimeChartCard = memo(function RegimeChartCard({
  data,
  animationBegin = 0,
  isAnimationActive = true,
}: {
  data: RegimeDatum[];
  animationBegin?: number;
  isAnimationActive?: boolean;
}) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%" debounce={0}>
        <BarChart data={data} margin={{ top: 20, right: 30, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="1 1" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis dataKey="regime" tick={{ fontSize: 10, fill: "#64748b", fontFamily: "var(--font-mono)" }} axisLine={{ stroke: "rgba(255,255,255,0.05)" }} tickLine={false} />
          <YAxis tick={{ fontSize: 9, fill: "#64748b", fontFamily: "var(--font-mono)" }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}K`} axisLine={false} tickLine={false} width={35} />
          <Tooltip cursor={{ fill: "rgba(255,255,255,0.02)" }} content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: "10px", fontFamily: "var(--font-mono)" }} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
          <Bar name="Mean Abs Error (MAE)" dataKey="MAE" fill="#06B6D4" radius={[4, 4, 0, 0]} barSize={40} isAnimationActive={isAnimationActive} animationBegin={animationBegin} animationDuration={600} animationEasing="ease-out" />
          <Bar name="Mean Bias (Over/Under)" dataKey="Bias" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={40} isAnimationActive={isAnimationActive} animationBegin={animationBegin} animationDuration={600} animationEasing="ease-out" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export const HistogramChartCard = memo(function HistogramChartCard({
  data,
  animationBegin = 0,
  isAnimationActive = true,
}: {
  data: HistogramDatum[];
  animationBegin?: number;
  isAnimationActive?: boolean;
}) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%" debounce={0}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="1 1" stroke="rgba(255,255,255,0.03)" />
          <XAxis dataKey="range" tick={{ fontSize: 8, fill: "#64748b", fontFamily: "var(--font-mono)" }} axisLine={{ stroke: "rgba(255,255,255,0.05)" }} tickLine={false} interval={4} />
          <YAxis tick={{ fontSize: 9, fill: "#64748b", fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} width={35} />
          <Tooltip contentStyle={{ backgroundColor: "#14171C", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", padding: "10px", fontSize: "11px", fontFamily: "var(--font-mono)" }} labelStyle={{ color: "#94A3B8" }} />
          <Bar dataKey="count" fill="#8B5CF6" radius={[3, 3, 0, 0]} opacity={0.8} isAnimationActive={isAnimationActive} animationBegin={animationBegin} animationDuration={600} animationEasing="ease-out" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export type ScatterDatum = {
  actual: number;
  forecast: number;
  errorAbs?: number;
  targetTime?: string;
};

function ScatterTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ScatterDatum }>;
}) {
  if (!active || !payload?.length) return <div />;
  const point = payload[0]?.payload;
  if (!point) return <div />;

  return (
    <div className="bg-[#14171C] border border-white/10 rounded-xl p-3 shadow-2xl text-xs font-mono min-w-[220px]">
      <div className="text-slate-400 mb-2 border-b border-white/10 pb-1">
        {point.targetTime ? new Date(point.targetTime).toUTCString() : "Point"}
      </div>
      <div className="flex justify-between gap-6">
        <span className="text-cyan-400">Actual</span>
        <span className="text-white font-bold">{point.actual.toFixed(0)} MW</span>
      </div>
      <div className="flex justify-between gap-6">
        <span className="text-emerald-400">Forecast</span>
        <span className="text-white font-bold">{point.forecast.toFixed(0)} MW</span>
      </div>
      <div className="flex justify-between gap-6 border-t border-white/10 mt-2 pt-1">
        <span className="text-slate-400">Abs Error</span>
        <span className="text-amber-400 font-bold">{Math.abs(point.forecast - point.actual).toFixed(0)} MW</span>
      </div>
    </div>
  );
}

export const ScatterChartCard = memo(function ScatterChartCard({
  data,
  animationBegin = 0,
  isAnimationActive = true,
}: {
  data: ScatterDatum[];
  animationBegin?: number;
  isAnimationActive?: boolean;
}) {
  if (!data.length) {
    return (
      <div className="h-[320px] w-full flex items-center justify-center text-xs font-mono text-slate-500">
        No correlation points available for this range.
      </div>
    );
  }

  const maxXY = data.reduce((max, p) => Math.max(max, p.actual, p.forecast), 0);
  const axisMax = Math.ceil(maxXY / 1000) * 1000;
  const meanX = data.reduce((sum, p) => sum + p.actual, 0) / data.length;
  const meanY = data.reduce((sum, p) => sum + p.forecast, 0) / data.length;
  const cov = data.reduce((sum, p) => sum + (p.actual - meanX) * (p.forecast - meanY), 0) / data.length;
  const stdX = Math.sqrt(
    data.reduce((sum, p) => sum + Math.pow(p.actual - meanX, 2), 0) / data.length
  );
  const stdY = Math.sqrt(
    data.reduce((sum, p) => sum + Math.pow(p.forecast - meanY, 2), 0) / data.length
  );
  const corr = stdX && stdY ? cov / (stdX * stdY) : 0;
  const r2 = corr * corr;
  const slope = stdX ? cov / (stdX * stdX) : 1;
  const intercept = meanY - slope * meanX;
  const fitStart = Math.max(0, intercept);
  const fitEnd = Math.min(axisMax, slope * axisMax + intercept);

  return (
    <div className="relative h-[320px] w-full">
      <div className="absolute right-3 top-2 z-10 rounded-md border border-white/10 bg-[#0B0D11]/85 px-2 py-1 text-[10px] font-mono text-slate-300">
        <div className="font-semibold">R² = {r2.toFixed(3)}</div>
        <div className="text-slate-400">r = {corr.toFixed(3)}</div>
      </div>
      <div className="h-[286px] pt-8">
        <ResponsiveContainer width="100%" height="100%" debounce={0}>
          <ComposedChart data={data} margin={{ top: 10, right: 14, bottom: 20, left: 14 }}>
          <CartesianGrid strokeDasharray="1 1" stroke="rgba(255,255,255,0.03)" />
          <XAxis type="number" dataKey="actual" name="Observed (Actual)" label={{ value: "Observed / Actual (MW)", position: "insideBottom", offset: -10, style: { fill: "#64748b", fontSize: 10, fontFamily: "var(--font-mono)" } }} tick={{ fontSize: 9, fill: "#64748b", fontFamily: "var(--font-mono)" }} axisLine={{ stroke: "rgba(255,255,255,0.05)" }} tickLine={false} domain={[0, axisMax]} tickFormatter={(v) => `${(v / 1000).toFixed(1)}K`} />
          <YAxis type="number" dataKey="forecast" name="Predicted (Forecast)" tick={{ fontSize: 9, fill: "#64748b", fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} width={40} domain={[0, axisMax]} tickFormatter={(v) => `${(v / 1000).toFixed(1)}K`} />
          <ReferenceLine segment={[{ x: 0, y: 0 }, { x: axisMax, y: axisMax }]} stroke="#94A3B8" strokeDasharray="5 5" ifOverflow="extendDomain" />
          <ReferenceLine segment={[{ x: 0, y: fitStart }, { x: axisMax, y: fitEnd }]} stroke="#38BDF8" strokeDasharray="3 3" ifOverflow="extendDomain" />
          <Tooltip cursor={false} content={<ScatterTooltip />} />
          <Scatter name={`Forecast vs Actual (r=${corr.toFixed(2)})`} data={data} opacity={0.82} isAnimationActive={isAnimationActive} animationBegin={animationBegin} animationDuration={600} animationEasing="ease-out">
            {data.map((p, idx) => {
              const absErr = p.errorAbs ?? Math.abs(p.forecast - p.actual);
              const fill = absErr > 3000 ? "#F59E0B" : absErr > 1500 ? "#22D3EE" : "#34D399";
              return <Cell key={`cell-${idx}`} fill={fill} />;
            })}
          </Scatter>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="pointer-events-none absolute left-3 top-2 flex items-center gap-3 text-[10px] font-mono text-slate-400">
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3 rounded-sm bg-slate-400/80" /> y=x</span>
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3 rounded-sm bg-sky-400" /> fit</span>
      </div>
      <div className="pointer-events-none absolute left-3 bottom-1.5 flex items-center gap-3 text-[10px] font-mono text-slate-400">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> low</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-cyan-400" /> medium</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> high</span>
      </div>
    </div>
  );
});
