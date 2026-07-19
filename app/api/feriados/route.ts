import { NextResponse } from "next/server";
import {
  FeriadosFetchError,
  getArgentinaTodayISO,
  getFeriadosDelPeriodoActual,
} from "@/lib/feriados";

export async function GET() {
  try {
    const feriados = await getFeriadosDelPeriodoActual();
    return NextResponse.json({ todayISO: getArgentinaTodayISO(), feriados });
  } catch (error) {
    if (!(error instanceof FeriadosFetchError)) {
      console.error("[feriados] unexpected error:", error);
    }
    return NextResponse.json(
      { error: "No pudimos cargar los feriados, probá de nuevo en un rato." },
      { status: 502 },
    );
  }
}
