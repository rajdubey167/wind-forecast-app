import { NextRequest, NextResponse } from "next/server";
import { loadLiveWindData } from "@/lib/wind-data";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const startStr = searchParams.get("start");
  const endStr = searchParams.get("end");

  if (!startStr || !endStr) {
    return NextResponse.json(
      { error: "Missing 'start' and 'end' query params (ISO dates)" },
      { status: 400 }
    );
  }

  const start = new Date(startStr);
  const end = new Date(endStr);

  try {
    const result = await loadLiveWindData(start, end);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to fetch BMRS data";
    const status = message === "Invalid date range" || message.includes("must not exceed")
      ? 400
      : 502;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
