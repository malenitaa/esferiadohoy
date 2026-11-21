import { ImageResponse } from "next/og";
import { connection } from "next/server";
import {
  FeriadosFetchError,
  analizarHoy,
  faltanDias,
  respuestaDeHoy,
  segundosDeCacheHastaMedianoche,
  type RespuestaDeHoy,
} from "@/lib/feriados";

export const alt = "¿Hoy es feriado en Argentina?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Con más de 120 caracteres el subtítulo no entra debajo de la respuesta en 630 px de alto.
const MAX_SUBTITULO = 120;

// next/og baja de jsdelivr o de Google Fonts los emojis y los alfabetos que su fuente no trae. El
// nombre viene de la API externa: sin esto, la fuente decide a qué hosts sale el servidor.
const FUERA_DE_LATIN = /[^\u0020-\u024F]/g;

function prepararSubtitulo(texto: string): string {
  const limpio = texto.replace(FUERA_DE_LATIN, "").replace(/\s+/g, " ").trim();
  return limpio.length <= MAX_SUBTITULO
    ? limpio
    : `${limpio.slice(0, MAX_SUBTITULO - 1).trimEnd()}…`;
}

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
      subtitulo = `${faltanDias(analisis.diasHastaProximo)} para ${analisis.proximoFeriado.nombre}`;
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
            {prepararSubtitulo(subtitulo)}
          </div>
        ) : null}
      </div>
    ),
    {
      ...size,
      // La CDN sirve la imagen hasta la medianoche argentina: no gasta una función por request.
      headers: { "Cache-Control": `public, s-maxage=${segundosDeCacheHastaMedianoche()}` },
    }
  );
}
