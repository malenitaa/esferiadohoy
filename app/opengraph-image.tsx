import { ImageResponse } from "next/og";
import {
  FeriadosFetchError,
  analizarFeriados,
  getArgentinaTodayISO,
  getFeriadosDelPeriodoActual,
} from "@/lib/feriados";

export const alt = "¿Hoy es feriado en Argentina?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const todayISO = getArgentinaTodayISO();

  let esFeriado = false;
  let subtitulo = "";

  try {
    const feriados = await getFeriadosDelPeriodoActual();
    const analisis = analizarFeriados(feriados, todayISO);
    esFeriado = Boolean(analisis.feriadoDeHoy);

    if (analisis.feriadoDeHoy) {
      subtitulo = analisis.feriadoDeHoy.nombre;
    } else if (analisis.proximoFeriado && analisis.diasHastaProximo !== null) {
      const dias = analisis.diasHastaProximo;
      subtitulo = `Faltan ${dias} ${dias === 1 ? "día" : "días"} para ${analisis.proximoFeriado.nombre}`;
    }
  } catch (error) {
    if (!(error instanceof FeriadosFetchError)) throw error;
    subtitulo = "";
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        <div style={{ display: "flex", fontSize: 36, color: "#a3a3a3" }}>
          ¿Hoy es feriado en Argentina?
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 260,
            fontWeight: 900,
            color: esFeriado ? "#10b981" : "#262626",
            lineHeight: 1,
            marginTop: 8,
          }}
        >
          {esFeriado ? "SÍ" : "NO"}
        </div>
        {subtitulo ? (
          <div
            style={{
              display: "flex",
              fontSize: 34,
              color: "#525252",
              marginTop: 16,
              maxWidth: 960,
              textAlign: "center",
            }}
          >
            {subtitulo}
          </div>
        ) : null}
      </div>
    ),
    { ...size }
  );
}
