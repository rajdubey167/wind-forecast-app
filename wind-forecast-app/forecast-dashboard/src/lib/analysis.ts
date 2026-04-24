import type { ProcessedData } from "@/lib/wind-data";

export type AnalysisViewModel = {
  exportRows: Array<{
    targetTime: string;
    actual: number;
    forecast: number;
    horizon: number;
    error: number;
  }>;
  kpis: {
    mae: number;
    medae: number;
    p99: number;
    rmse: number;
  };
  biasStats: {
    overCount: number;
    underCount: number;
    overMae: number;
    underMae: number;
    biasPct: number;
  };
  horizonData: Array<{
    horizon: string;
    MAE: number;
    Median: number;
    P99: number;
  }>;
  hourData: Array<{
    hour: string;
    MAE: number;
  }>;
  histogramData: Array<{
    range: string;
    count: number;
  }>;
  capacityStats: {
    mean: number;
    p95: number;
  } | null;
  capacityBars: Array<{
    label: string;
    value: number;
    pct: string;
    color: string;
    width: number;
  }>;
};

type MergedRow = {
  targetTime: string;
  actual: number;
  forecast: number;
  horizon: number;
  error: number;
  absError: number;
};

export function buildAnalysisViewModel(data: ProcessedData): AnalysisViewModel {
  const merged: MergedRow[] = [];
  const errors: number[] = [];
  let overCount = 0;
  let underCount = 0;
  let overAbsSum = 0;
  let underAbsSum = 0;

  for (const f of data.forecasts) {
    const actual = data.actuals[f.targetTime];
    if (actual == null || f.horizon < 0 || f.horizon > 48) continue;
    const err = f.generation - actual;
    merged.push({
      targetTime: f.targetTime,
      actual,
      forecast: f.generation,
      horizon: Math.round(f.horizon),
      error: err,
      absError: Math.abs(err),
    });
    errors.push(err);
    if (err > 0) {
      overCount++;
      overAbsSum += Math.abs(err);
    } else if (err < 0) {
      underCount++;
      underAbsSum += Math.abs(err);
    }
  }

  const absErrors = merged.map((r) => r.absError).sort((a, b) => a - b);
  const kpis = !absErrors.length
    ? { mae: 0, medae: 0, p99: 0, rmse: 0 }
    : {
        mae: absErrors.reduce((s, v) => s + v, 0) / absErrors.length,
        medae:
          absErrors.length % 2 === 0
            ? (absErrors[absErrors.length / 2 - 1] + absErrors[absErrors.length / 2]) / 2
            : absErrors[Math.floor(absErrors.length / 2)],
        p99: absErrors[Math.floor(absErrors.length * 0.99)],
        rmse: Math.sqrt(
          merged.reduce((s, r) => s + r.error * r.error, 0) / merged.length
        ),
      };

  const biasStats = {
    overCount,
    underCount,
    overMae: overCount ? overAbsSum / overCount : 0,
    underMae: underCount ? underAbsSum / underCount : 0,
    biasPct: merged.length ? (overCount / merged.length) * 100 : 0
  };

  const horizonBuckets = new Map<number, { sum: number; count: number; vals: number[] }>();
  for (const r of merged) {
    const h = r.horizon;
    if (!horizonBuckets.has(h)) horizonBuckets.set(h, { sum: 0, count: 0, vals: [] });
    const bucket = horizonBuckets.get(h)!;
    bucket.sum += r.absError;
    bucket.count++;
    bucket.vals.push(r.absError);
  }

  const horizonData = Array.from(horizonBuckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([h, bucket]) => {
      bucket.vals.sort((a, c) => a - c);
      return {
        horizon: `${h}h`,
        MAE: +(bucket.sum / bucket.count).toFixed(1),
        Median: +(
          bucket.vals.length % 2 === 0
            ? (bucket.vals[bucket.vals.length / 2 - 1] + bucket.vals[bucket.vals.length / 2]) / 2
            : bucket.vals[Math.floor(bucket.vals.length / 2)]
        ).toFixed(1),
        P99: +(bucket.vals[Math.floor(bucket.vals.length * 0.99)] ?? 0).toFixed(1),
      };
    });

  const hourBuckets = new Map<number, { sum: number; count: number }>();
  for (const r of merged) {
    const hour = new Date(r.targetTime).getUTCHours();
    if (!hourBuckets.has(hour)) hourBuckets.set(hour, { sum: 0, count: 0 });
    const bucket = hourBuckets.get(hour)!;
    bucket.sum += r.absError;
    bucket.count++;
  }

  const hourData = Array.from(hourBuckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([h, bucket]) => ({
      hour: `${h.toString().padStart(2, "0")}:00`,
      MAE: +(bucket.sum / bucket.count).toFixed(1),
    }));

  const histogramData = (() => {
    if (!merged.length) return [];
    const min = Math.min(...errors);
    const max = Math.max(...errors);
    const binCount = 40;
    const binSize = (max - min) / binCount || 1;
    const counts = new Array<number>(binCount).fill(0);

    for (const e of errors) {
      if (e === max) {
        counts[binCount - 1]++;
        continue;
      }
      const idx = Math.floor((e - min) / binSize);
      const safeIdx = Math.min(Math.max(idx, 0), binCount - 1);
      counts[safeIdx]++;
    }

    return counts.map((count, i) => {
      const lo = min + i * binSize;
      return { range: `${(lo / 1000).toFixed(1)}K`, count };
    });
  })();

  const actualValues = Object.values(data.actuals).sort((a, b) => a - b);
  const capacityStats = actualValues.length
    ? {
        mean: actualValues.reduce((s, v) => s + v, 0) / actualValues.length,
        p90: actualValues[Math.floor(actualValues.length * 0.1)],
        p95: actualValues[Math.floor(actualValues.length * 0.05)],
        p99: actualValues[Math.floor(actualValues.length * 0.01)],
        max: actualValues[actualValues.length - 1],
      }
    : null;

  const capacityBars = capacityStats
    ? [
        { label: "Mean Generation", value: capacityStats.mean, pct: "50%", color: "bg-cyan-500", width: (capacityStats.mean / capacityStats.max) * 100 },
        { label: "P90 Dependable", value: capacityStats.p90, pct: ">=90% of time", color: "bg-emerald-500", width: (capacityStats.p90 / capacityStats.max) * 100 },
        { label: "P95 Dependable", value: capacityStats.p95, pct: ">=95% of time", color: "bg-amber-500", width: (capacityStats.p95 / capacityStats.max) * 100 },
        { label: "P99 Dependable", value: capacityStats.p99, pct: ">=99% of time", color: "bg-red-500", width: (capacityStats.p99 / capacityStats.max) * 100 },
      ]
    : [];

  return {
    exportRows: merged.map((r) => ({
      targetTime: r.targetTime,
      actual: r.actual,
      forecast: r.forecast,
      horizon: r.horizon,
      error: r.error,
    })),
    kpis,
    biasStats,
    horizonData,
    hourData,
    histogramData,
    capacityStats: capacityStats
      ? { mean: capacityStats.mean, p95: capacityStats.p95 }
      : null,
    capacityBars,
  };
}
