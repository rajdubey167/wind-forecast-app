"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";

type TourStep = {
  selector: string;
  title: string;
  body: string;
};

const TOUR_KEY = "wind_feature_tour_v1_done";

const DASHBOARD_STEPS: TourStep[] = [
  {
    selector: '[data-tour="source-toggle"]',
    title: "Data Source Switch",
    body: "Switch between the bundled static dataset and live BMRS data stream.",
  },
  {
    selector: '[data-tour="time-range"]',
    title: "Time Range Controls",
    body: "Adjust start/end times and presets to control what appears in charts and KPIs.",
  },
  {
    selector: '[data-tour="horizon"]',
    title: "Forecast Horizon",
    body: "Move the horizon slider to compare short vs long lead-time forecast behavior.",
  },
  {
    selector: '[data-tour="analysis-link"]',
    title: "Analysis View",
    body: "Open the Analysis page for deeper error metrics, distributions, and correlation views.",
  },
];

const ANALYSIS_STEPS: TourStep[] = [
  {
    selector: '[data-tour="analysis-source"]',
    title: "Analysis Source",
    body: "Choose static analysis or live BMRS analysis for a specific date window.",
  },
  {
    selector: '[data-tour="analysis-date-form"]',
    title: "Apply Date Window",
    body: "Set a date range and click Apply Dates to recompute KPIs and charts for that window.",
  },
  {
    selector: '[data-tour="analysis-refresh"]',
    title: "Refresh Live",
    body: "Refresh Live reloads the currently applied live date window without changing your draft edits.",
  },
];

export default function FeatureTour() {
  const pathname = usePathname();
  const router = useRouter();
  const isClient = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
  const [dismissed, setDismissed] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [highlight, setHighlight] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [bootComplete, setBootComplete] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("terminal_booted") === "true";
    }
    return false;
  });
  const [readyToShow, setReadyToShow] = useState(false);

  const steps = useMemo(() => {
    if (pathname === "/") return DASHBOARD_STEPS;
    if (pathname === "/analysis") return ANALYSIS_STEPS;
    return [];
  }, [pathname]);

  const isOpen = useMemo(() => {
    if (!isClient || dismissed || !steps.length || !bootComplete || !readyToShow) return false;
    return localStorage.getItem(TOUR_KEY) !== "true";
  }, [dismissed, isClient, steps, bootComplete, readyToShow]);

  const clearOverlay = useCallback(() => {
    setHighlight(null);
    setPanelPos(null);
  }, []);

  useEffect(() => {
    // If we've already booted in this session, still wait 1s for the page to "settle"
    if (bootComplete) {
      const timer = setTimeout(() => setReadyToShow(true), 1000);
      return () => clearTimeout(timer);
    }

    const handleBoot = () => {
      setBootComplete(true);
      setTimeout(() => setReadyToShow(true), 1000); // 1s delay after boot finishes
    };

    window.addEventListener("terminal_boot_complete", handleBoot);
    return () => window.removeEventListener("terminal_boot_complete", handleBoot);
  }, [bootComplete]);

  useEffect(() => {
    const syncMobile = () => setIsMobile(window.innerWidth < 768);
    syncMobile();
    window.addEventListener("resize", syncMobile);
    return () => window.removeEventListener("resize", syncMobile);
  }, []);

  useEffect(() => {
    if (!isOpen || !steps.length) {
      return;
    }
    const step = steps[stepIndex];
    if (!step) return;

    const updateHighlight = () => {
      const el = document.querySelector(step.selector);
      if (!el) {
        setHighlight(null);
        return;
      }
      (el as HTMLElement).scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
      const rect = (el as HTMLElement).getBoundingClientRect();
      const nextHighlight = {
        top: Math.max(8, rect.top - 8),
        left: Math.max(8, rect.left - 8),
        width: rect.width + 16,
        height: rect.height + 16,
      };
      setHighlight(nextHighlight);

      const panelWidth = Math.min(window.innerWidth * 0.92, 380);
      const panelHeight = 210;
      const gap = 14;
      const margin = 12;

      if (isMobile) {
        setPanelPos(null);
      } else {
        let left = rect.right + gap;
        if (left + panelWidth > window.innerWidth - margin) {
          left = rect.left - panelWidth - gap;
        }
        if (left < margin) {
          left = Math.max(margin, window.innerWidth - panelWidth - margin);
        }

        let top = rect.top;
        if (top + panelHeight > window.innerHeight - margin) {
          top = window.innerHeight - panelHeight - margin;
        }
        if (top < margin) {
          top = margin;
        }

        setPanelPos({ top, left });
      }
    };

    updateHighlight();
    window.addEventListener("resize", updateHighlight);
    window.addEventListener("scroll", updateHighlight, true);

    return () => {
      window.removeEventListener("resize", updateHighlight);
      window.removeEventListener("scroll", updateHighlight, true);
    };
  }, [isOpen, stepIndex, steps, isMobile]);

  if (!isOpen || !steps.length) return null;

  const currentStepIndex = Math.min(stepIndex, steps.length - 1);
  const step = steps[currentStepIndex];
  const isLast = currentStepIndex === steps.length - 1;

  const closeTour = () => {
    localStorage.setItem(TOUR_KEY, "true");
    setDismissed(true);
    clearOverlay();
  };

  const goNext = () => {
    if (isLast) {
      closeTour();
      return;
    }
    setStepIndex((s) => s + 1);
  };

  return (
    <>
      {highlight && (
        <div
          className="pointer-events-none fixed z-111 rounded-xl border-2 border-cyan-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
          }}
        />
      )}
      {!highlight && <div className="fixed inset-0 z-110 bg-black/70" />}

      <div
        className="fixed z-112 w-[min(92vw,380px)] rounded-2xl border border-cyan-500/30 bg-[#11151D] p-4 text-slate-200 shadow-2xl"
        style={
          isMobile
            ? { left: "50%", bottom: 12, transform: "translateX(-50%)" }
            : panelPos
            ? { top: panelPos.top, left: panelPos.left }
            : { bottom: 24, right: 24 }
        }
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300 font-mono">
            Feature Tour
          </p>
          <span className="text-[10px] text-slate-400 font-mono">
            {currentStepIndex + 1}/{steps.length}
          </span>
        </div>

        <h3 className="text-base font-semibold text-white">{step.title}</h3>
        <p className="mt-1 text-[12px] text-slate-300 leading-relaxed">{step.body}</p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={closeTour}
            className="px-3 py-2 rounded-lg border border-white/10 text-[11px] font-mono text-slate-300 hover:bg-white/5"
          >
            Skip All Tutorials
          </button>

          <div className="flex gap-2">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
                className="px-3 py-2 rounded-lg border border-white/10 text-[11px] font-mono text-slate-300 hover:bg-white/5"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              className="px-3 py-2 rounded-lg border border-cyan-500/40 bg-cyan-500/15 text-[11px] font-mono text-cyan-200 hover:bg-cyan-500/25"
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>

        {pathname === "/" && isLast && (
          <button
            type="button"
            onClick={() => {
              closeTour();
              router.push("/analysis?source=static");
            }}
            className="mt-2 text-[11px] font-mono text-emerald-300 hover:text-emerald-200"
          >
            Jump to analysis walkthrough
          </button>
        )}
      </div>
    </>
  );
}
