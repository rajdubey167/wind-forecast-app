import AnalysisClient from "@/components/analysis/analysis-client";
import { buildAnalysisViewModel } from "@/lib/analysis";
import {
  getDefaultLiveRange,
  loadLiveWindData,
  loadStaticWindData,
  validateLiveRange,
} from "@/lib/wind-data";

export const dynamic = "force-dynamic";

let staticViewModelPromise: Promise<ReturnType<typeof buildAnalysisViewModel>> | null = null;

async function getStaticViewModel() {
  if (!staticViewModelPromise) {
    staticViewModelPromise = loadStaticWindData().then((data) => buildAnalysisViewModel(data));
  }
  return staticViewModelPromise;
}

type SearchParams = Promise<{
  source?: string;
  startDate?: string;
  endDate?: string;
  print?: string;
}>;

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDateInput(input: string | undefined, fallback: Date) {
  if (!input) return fallback;
  const parsed = new Date(`${input}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const source = params.source === "live" ? "live" : "static";
  const printMode = params.print === "1";

  const defaultRange = getDefaultLiveRange();
  const requestedStart = parseDateInput(params.startDate, defaultRange.start);
  const requestedEndBase = parseDateInput(params.endDate, defaultRange.end);
  const requestedEnd = new Date(requestedEndBase);
  requestedEnd.setUTCDate(requestedEnd.getUTCDate() + 1);

  let data;
  let startDate = formatDateInput(defaultRange.start);
  let endDate = formatDateInput(defaultRange.end);
  let resolvedSource: "static" | "live" = source;
  let liveError: string | null = null;

  if (source === "live") {
    try {
      validateLiveRange(requestedStart, requestedEnd);
      data = await loadLiveWindData(requestedStart, requestedEnd);
      startDate = formatDateInput(requestedStart);
      endDate = formatDateInput(requestedEndBase);
    } catch (e: unknown) {
      // If live fetch fails, surface it and fall back to static so the page still works.
      // Also reflect the requested dates so users can see their inputs applied.
      liveError = e instanceof Error ? e.message : "Live data unavailable";
      resolvedSource = "static";
      startDate = formatDateInput(requestedStart);
      endDate = formatDateInput(requestedEndBase);
      const viewModel = await getStaticViewModel();
      return (
        <AnalysisClient
          key={`${resolvedSource}|${startDate}|${endDate}|${printMode ? "print" : "screen"}`}
          viewModel={viewModel}
          source={resolvedSource}
          startDate={startDate}
          endDate={endDate}
          printMode={printMode}
          liveError={liveError}
        />
      );
    }
  } else {
    const viewModel = await getStaticViewModel();
    return (
      <AnalysisClient
        key={`${resolvedSource}|${startDate}|${endDate}|${printMode ? "print" : "screen"}`}
        viewModel={viewModel}
        source={resolvedSource}
        startDate={startDate}
        endDate={endDate}
        printMode={printMode}
      />
    );
  }

  const viewModel = buildAnalysisViewModel(data);

  return (
    <AnalysisClient
      key={`${resolvedSource}|${startDate}|${endDate}|${printMode ? "print" : "screen"}`}
      viewModel={viewModel}
      source={resolvedSource}
      startDate={startDate}
      endDate={endDate}
      printMode={printMode}
      liveError={liveError}
    />
  );
}
