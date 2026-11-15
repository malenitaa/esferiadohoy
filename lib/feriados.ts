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

// Caracteres de control y de dirección (override RTL y similares): no tienen nada que hacer en el
// nombre de un feriado y pueden desordenar cómo se ve el texto.
const CARACTERES_INVISIBLES = /[\u0000-\u001F\u007F-\u009F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

/** true si "YYYY-MM-DD" existe en el calendario (descarta 2026-02-30 o 2026-13-01). */
function esFechaReal(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [year, month, day] = fecha.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/**
 * Valida un ítem de la API y limpia su nombre. Devuelve null si no sirve: fecha que no existe o
 * de otro año que el pedido, tipo desconocido, nombre vacío o de más de 300 caracteres.
 */
function parseFeriado(item: unknown, year: number): Feriado | null {
  if (typeof item !== "object" || item === null) return null;
  const f = item as Record<string, unknown>;
  if (typeof f.fecha !== "string" || !esFechaReal(f.fecha) || !f.fecha.startsWith(`${year}-`)) {
    return null;
  }
  if (!VALID_TIPOS.includes(f.tipo as TipoFeriado) || typeof f.nombre !== "string") return null;

  const nombre = f.nombre.replace(CARACTERES_INVISIBLES, " ").replace(/\s+/g, " ").trim();
  if (nombre.length === 0 || nombre.length > 300) return null;

  return { fecha: f.fecha, tipo: f.tipo as TipoFeriado, nombre };
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

/**
 * Cuánto puede cachear la CDN algo que depende de "hoy": hasta la medianoche argentina, con un
 * tope de una hora. Así una respuesta nunca cruza de un día al otro.
 */
export function segundosDeCacheHastaMedianoche(ahora: Date = new Date()): number {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: ARGENTINA_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(ahora);
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  const transcurridos = valor("hour") * 3600 + valor("minute") * 60 + valor("second");
  return Math.max(0, Math.min(3600, 86_400 - transcurridos));
}

export function getArgentinaYear(todayISO: string): number {
  return Number(todayISO.slice(0, 4));
}

export function getArgentinaMonth(todayISO: string): number {
  return Number(todayISO.slice(5, 7));
}

async function fetchFeriadosForYear(year: number): Promise<Feriado[]> {
  const controller = new AbortController();
  // El timeout cubre también la lectura del body: una respuesta que manda los headers y después
  // se cuelga no puede trabar la página.
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let data: unknown;
  try {
    let response: Response;
    try {
      response = await fetch(`${ARGENTINADATOS_BASE_URL}/${year}`, {
        next: { revalidate: REVALIDATE_SECONDS },
        signal: controller.signal,
      });
    } catch {
      throw new FeriadosFetchError(
        `No se pudo conectar con la fuente de feriados. Probá de nuevo en un rato.`
      );
    }

    if (!response.ok) {
      throw new FeriadosFetchError(
        `No pudimos obtener los feriados. Probá de nuevo en un rato.`
      );
    }

    try {
      data = await response.json();
    } catch {
      // HTML de error con status 200, JSON cortado o body que no terminó a tiempo.
      throw new FeriadosFetchError("La fuente de feriados devolvió un formato inesperado.");
    }
  } finally {
    clearTimeout(timer);
  }

  if (!Array.isArray(data)) {
    throw new FeriadosFetchError("La fuente de feriados devolvió un formato inesperado.");
  }

  const valid = data
    .map((item) => parseFeriado(item, year))
    .filter((f): f is Feriado => f !== null);
  if (valid.length === 0 && data.length > 0) {
    throw new FeriadosFetchError("La fuente de feriados devolvió un formato inesperado.");
  }

  return valid;
}

/**
 * Trae los feriados del año actual (hora Argentina). En diciembre también trae el
 * año siguiente, para poder calcular bien el "próximo feriado" al cruzar de año.
 * Si el año siguiente todavía no está publicado (o falla), se sigue con el actual.
 */
export async function getFeriadosDelPeriodoActual(
  todayISO: string = getArgentinaTodayISO()
): Promise<Feriado[]> {
  const year = getArgentinaYear(todayISO);
  const month = getArgentinaMonth(todayISO);

  const [actual, siguiente] = await Promise.allSettled([
    fetchFeriadosForYear(year),
    month === 12 ? fetchFeriadosForYear(year + 1) : Promise.resolve([]),
  ]);
  if (actual.status === "rejected") throw actual.reason;
  // Un año sin feriados no existe: una lista vacía es la fuente fallando, no un dato. Sin esto la
  // página respondería "NO" también un día que es feriado.
  if (actual.value.length === 0) {
    throw new FeriadosFetchError("La fuente de feriados no tiene datos para este año.");
  }

  const feriados = siguiente.status === "fulfilled" ? [...actual.value, ...siguiente.value] : actual.value;
  return feriados.sort((a, b) => a.fecha.localeCompare(b.fecha));
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

/**
 * Qué responde la página a "¿hoy es feriado?". Los días "puente" (no laborables con
 * fines turísticos) tienen respuesta propia: son optativos para el sector privado.
 */
export type RespuestaDeHoy = "si" | "no" | "no-laborable";

export function respuestaDeHoy({ feriadoDeHoy }: Pick<AnalisisFeriados, "feriadoDeHoy">): RespuestaDeHoy {
  if (!feriadoDeHoy) return "no";
  return feriadoDeHoy.tipo === "puente" ? "no-laborable" : "si";
}

export const ACLARACION_NO_LABORABLE =
  "Es optativo para el sector privado: depende de tu empleador.";

export function analizarFeriados(feriados: Feriado[], todayISO: string): AnalisisFeriados {
  const feriadosOrdenados = [...feriados].sort((a, b) => a.fecha.localeCompare(b.fecha));
  // Si un feriado y un puente cayeran el mismo día, gana el feriado: es la respuesta más fuerte.
  const deHoy = feriadosOrdenados.filter((f) => f.fecha === todayISO);
  const feriadoDeHoy = deHoy.find((f) => f.tipo !== "puente") ?? deHoy[0] ?? null;
  const proximoFeriado = feriadosOrdenados.find((f) => f.fecha > todayISO) ?? null;
  const diasHastaProximo = proximoFeriado ? diasEntre(todayISO, proximoFeriado.fecha) : null;

  return { todayISO, feriadoDeHoy, proximoFeriado, diasHastaProximo, feriadosOrdenados };
}

/** La respuesta para hoy (hora Argentina), leyendo el reloj una sola vez. */
export async function analizarHoy(): Promise<AnalisisFeriados> {
  const todayISO = getArgentinaTodayISO();
  const feriados = await getFeriadosDelPeriodoActual(todayISO);
  return analizarFeriados(feriados, todayISO);
}
