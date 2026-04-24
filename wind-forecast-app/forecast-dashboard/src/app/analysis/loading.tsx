export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 bg-[#0B0D11] text-slate-300 font-sans overflow-hidden">
      <div className="h-full w-full flex items-start justify-center pt-[14vh] p-6">
        <div className="w-[min(560px,94%)] rounded-2xl border border-cyan-500/25 bg-[#11151D] p-6 shadow-[0_0_24px_rgba(6,182,212,0.12)]">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-4">
                <span className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80 font-mono">Forecast Analysis</span>
                <span className="text-[10px] uppercase text-cyan-400/80 font-mono">Booting</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full border-2 border-cyan-400/30 border-t-cyan-300 animate-spin" />
                <p className="text-lg text-cyan-100 font-mono">Loading wind analysis dashboard...</p>
              </div>
              <p className="mt-2 text-[11px] text-slate-400 font-mono">Calibrating metrics and chart rendering.</p>
              <div className="mt-5 h-2.5 w-full rounded-full bg-white/5 overflow-hidden">
                <div className="analysis-progress h-full w-1/2 rounded-full bg-linear-to-r from-cyan-500/70 via-emerald-400/70 to-cyan-500/70" />
              </div>
            </div>
        </div>
    </div>
  );
}
