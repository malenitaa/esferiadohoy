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
    const message =
      error instanceof FeriadosFetchError
        ? error.message
        : "No pudimos cargar los feriados, probá de nuevo en un rato.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
