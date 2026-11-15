import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { FeriadosFetchError, analizarHoy, respuestaDeHoy, type RespuestaDeHoy } from "@/lib/feriados";

export const alt = "¿Hoy es feriado en Argentina?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TEXTO = { si: "SÍ", no: "NO", "no-laborable": "NO LABORABLE" } as const;
const COLOR = { si: "#10b981", no: "#262626", "no-laborable": "#d97706" } as const;
// "NO LABORABLE" a 260 px no entra en 1200 px de ancho.
const TAMANIO = { si: 260, no: 260, "no-laborable": 120 } as const;

export default async function Image() {
  // Igual que la página: la imagen se arma por request para que "hoy" sea hoy.
  await connection();

  let respuesta: RespuestaDeHoy = "no";
  let subtitulo = "";

  try {
    const analisis = await analizarHoy();
    respuesta = respuestaDeHoy(analisis);

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
            fontSize: TAMANIO[respuesta],
            fontWeight: 900,
            color: COLOR[respuesta],
            lineHeight: 1,
            marginTop: 8,
          }}
        >
          {TEXTO[respuesta]}
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
