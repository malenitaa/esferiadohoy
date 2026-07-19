const ARGENTINA_TIMEZONE = "America/Argentina/Buenos_Aires";
const ARGENTINADATOS_BASE_URL = "https://api.argentinadatos.com/v1/feriados";
const FETCH_TIMEOUT_MS = 8_000;

// Cada tanto la fuente publica el decreto del año siguiente; refrescar 1 vez por día alcanza.
const REVALIDATE_SECONDS = 60 * 60 * 24;

export type TipoFeriado = "inamovible" | "trasladable" | "puente";

export interface Feriado {
  fecha: string; // YYYY-MM-DD
  tipo: TipoFeriado;
  nombre: string;
}

export class FeriadosFetchError extends Error {}

const VALID_TIPOS: readonly TipoFeriado[] = ["inamovible", "trasladable", "puente"];

function isValidFeriado(item: unknown): item is Feriado {
  if (typeof item !== "object" || item === null) return false;
  const f = item as Record<string, unknown>;
  return (
    typeof f.fecha === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(f.fecha) &&
    typeof f.nombre === "string" &&
    f.nombre.length > 0 &&
    f.nombre.length <= 300 &&
    VALID_TIPOS.includes(f.tipo as TipoFeriado)
  );
}

/** Fecha de hoy en horario de Argentina, como YYYY-MM-DD (evita corrimientos por UTC). */
export function getArgentinaTodayISO(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARGENTINA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

export function getArgentinaYear(todayISO: string): number {
  return Number(todayISO.slice(0, 4));
}

export function getArgentinaMonth(todayISO: string): number {
  return Number(todayISO.slice(5, 7));
}

async function fetchFeriadosForYear(year: number): Promise<Feriado[]> {
  let response: Response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    response = await fetch(`${ARGENTINADATOS_BASE_URL}/${year}`, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: controller.signal,
    });
  } catch {
    throw new FeriadosFetchError(
      `No se pudo conectar con la fuente de feriados. Probá de nuevo en un rato.`
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new FeriadosFetchError(
      `No pudimos obtener los feriados. Probá de nuevo en un rato.`
    );
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new FeriadosFetchError("La fuente de feriados devolvió un formato inesperado.");
  }

  const valid = data.filter(isValidFeriado);
  if (valid.length === 0 && data.length > 0) {
    throw new FeriadosFetchError("La fuente de feriados devolvió un formato inesperado.");
  }

  return valid;
}

/**
 * Trae los feriados del año actual (hora Argentina). En diciembre también trae el
 * año siguiente, para poder calcular bien el "próximo feriado" al cruzar de año.
 */
export async function getFeriadosDelPeriodoActual(): Promise<Feriado[]> {
  const todayISO = getArgentinaTodayISO();
  const year = getArgentinaYear(todayISO);
  const month = getArgentinaMonth(todayISO);

  const years = month === 12 ? [year, year + 1] : [year];
  const results = await Promise.all(years.map(fetchFeriadosForYear));

  return results.flat().sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function diasEntre(desdeISO: string, hastaISO: string): number {
  const desde = Date.UTC(
    Number(desdeISO.slice(0, 4)),
    Number(desdeISO.slice(5, 7)) - 1,
    Number(desdeISO.slice(8, 10))
  );
  const hasta = Date.UTC(
    Number(hastaISO.slice(0, 4)),
    Number(hastaISO.slice(5, 7)) - 1,
    Number(hastaISO.slice(8, 10))
  );
  return Math.round((hasta - desde) / 86_400_000);
}

export interface AnalisisFeriados {
  todayISO: string;
  feriadoDeHoy: Feriado | null;
  proximoFeriado: Feriado | null;
  diasHastaProximo: number | null;
  feriadosOrdenados: Feriado[];
}

export function analizarFeriados(feriados: Feriado[], todayISO: string): AnalisisFeriados {
  const feriadosOrdenados = [...feriados].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const feriadoDeHoy = feriadosOrdenados.find((f) => f.fecha === todayISO) ?? null;
  const proximoFeriado = feriadosOrdenados.find((f) => f.fecha > todayISO) ?? null;
  const diasHastaProximo = proximoFeriado ? diasEntre(todayISO, proximoFeriado.fecha) : null;

  return { todayISO, feriadoDeHoy, proximoFeriado, diasHastaProximo, feriadosOrdenados };
}
