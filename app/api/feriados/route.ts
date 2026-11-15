import { NextResponse } from "next/server";
import {
  FeriadosFetchError,
  getArgentinaTodayISO,
  getFeriadosDelPeriodoActual,
  segundosDeCacheHastaMedianoche,
} from "@/lib/feriados";

export async function GET() {
  try {
    const feriados = await getFeriadosDelPeriodoActual();
    // La CDN la sirve hasta la medianoche argentina: no gasta una función por request y la
    // respuesta nunca cruza de un día al otro.
    return NextResponse.json(
      { todayISO: getArgentinaTodayISO(), feriados },
      { headers: { "Cache-Control": `public, s-maxage=${segundosDeCacheHastaMedianoche()}` } }
    );
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
