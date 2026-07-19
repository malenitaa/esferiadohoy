import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";
import {
  FeriadosFetchError,
  analizarFeriados,
  getArgentinaTodayISO,
  getFeriadosDelPeriodoActual,
} from "@/lib/feriados";
import { RespuestaFeriado } from "@/components/RespuestaFeriado";
import { ListaFeriados } from "@/components/ListaFeriados";

export async function generateMetadata(): Promise<Metadata> {
  const year = getArgentinaTodayISO().slice(0, 4);
  const title = `¿Hoy es feriado en Argentina? Feriados ${year}`;
  const description = `¿Hoy es feriado o día no laborable en Argentina? Enterate al instante, mirá cuánto falta para el próximo feriado y consultá el calendario completo de feriados Argentina ${year}.`;

  return {
    title,
    description,
    alternates: { canonical: siteConfig.url },
    openGraph: { title, description, url: siteConfig.url, locale: "es_AR" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Home() {
  const todayISO = getArgentinaTodayISO();

  let analisis;
  let errorMessage: string | null = null;

  try {
    const feriados = await getFeriadosDelPeriodoActual();
    analisis = analizarFeriados(feriados, todayISO);
  } catch (error) {
    errorMessage =
      error instanceof FeriadosFetchError
        ? "No pudimos cargar los feriados, probá de nuevo en un rato."
        : "Ocurrió un error inesperado. Probá de nuevo en un rato.";
  }

  const jsonLd = analisis
    ? {
        "@context": "https://schema.org",
        "@type": "QAPage",
        mainEntity: {
          "@type": "Question",
          name: "¿Hoy es feriado en Argentina?",
          text: "¿Hoy es feriado en Argentina?",
          answerCount: 1,
          acceptedAnswer: {
            "@type": "Answer",
            text: analisis.feriadoDeHoy
              ? `Sí, hoy es ${analisis.feriadoDeHoy.nombre}.`
              : analisis.proximoFeriado
              ? `No. Faltan ${analisis.diasHastaProximo} días para el próximo feriado: ${analisis.proximoFeriado.nombre}.`
              : "No hay más feriados cargados por ahora.",
          },
        },
      }
    : null;

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-white dark:bg-neutral-950">
      <main className="mx-auto flex w-full max-w-md flex-col items-center gap-12 px-6 py-16">
        <h1 className="text-center text-base font-medium text-neutral-400 dark:text-neutral-500">
          ¿Hoy es feriado en Argentina?
        </h1>

        {errorMessage ? (
          <p className="text-center text-lg text-neutral-500 dark:text-neutral-400">
            {errorMessage}
          </p>
        ) : analisis ? (
          <>
            <RespuestaFeriado analisis={analisis} />
            <ListaFeriados analisis={analisis} />
          </>
        ) : null}

        <footer className="text-center text-xs text-neutral-300 dark:text-neutral-600">
          Fuente:{" "}
          <a
            href="https://argentinadatos.com/docs/operations/get-feriados"
            className="underline decoration-dotted underline-offset-2"
          >
            ArgentinaDatos
          </a>
        </footer>

        {jsonLd ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              // Escape <, >, & so a rogue holiday name like "foo</script><script>..."
              // from the upstream API cannot break out of the JSON-LD script block.
              __html: JSON.stringify(jsonLd)
                .replace(/</g, "\\u003c")
                .replace(/>/g, "\\u003e")
                .replace(/&/g, "\\u0026"),
            }}
          />
        ) : null}
      </main>
    </div>
  );
}
