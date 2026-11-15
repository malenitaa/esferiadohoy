import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FeriadosFetchError,
  analizarHoy,
  getFeriadosDelPeriodoActual,
  type Feriado,
} from "./feriados";

const FERIADOS_2030: Feriado[] = [
  { fecha: "2030-12-25", tipo: "inamovible", nombre: "Navidad" },
  { fecha: "2030-12-08", tipo: "inamovible", nombre: "Inmaculada Concepción de María" },
];
const FERIADOS_2031: Feriado[] = [{ fecha: "2031-01-01", tipo: "inamovible", nombre: "Año nuevo" }];

/** Simula la API: responde 200 con los años que conoce y 404 con el resto. */
function stubApi(porAnio: Record<number, Feriado[]>) {
  const fetchMock = vi.fn(async (url: string) => {
    const year = Number(url.split("/").pop());
    const data = porAnio[year];
    return data
      ? new Response(JSON.stringify(data), { status: 200 })
      : new Response("Not found", { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  // Solo se simula Date: setTimeout queda real para el timeout del fetch.
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("getFeriadosDelPeriodoActual", () => {
  it("en diciembre, si el año siguiente da 404, devuelve los del año actual", async () => {
    vi.setSystemTime(new Date("2030-12-10T15:00:00-03:00"));
    const fetchMock = stubApi({ 2030: FERIADOS_2030 });

    const feriados = await getFeriadosDelPeriodoActual();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(feriados.map((f) => f.fecha)).toEqual(["2030-12-08", "2030-12-25"]);
  });

  it("en diciembre, si el año siguiente está publicado, suma los dos años ordenados", async () => {
    vi.setSystemTime(new Date("2030-12-10T15:00:00-03:00"));
    stubApi({ 2030: FERIADOS_2030, 2031: FERIADOS_2031 });

    const feriados = await getFeriadosDelPeriodoActual();

    expect(feriados.map((f) => f.fecha)).toEqual(["2030-12-08", "2030-12-25", "2031-01-01"]);
  });

  it("si falla el año actual, sigue tirando el error", async () => {
    vi.setSystemTime(new Date("2030-12-10T15:00:00-03:00"));
    stubApi({ 2031: FERIADOS_2031 });

    await expect(getFeriadosDelPeriodoActual()).rejects.toBeInstanceOf(FeriadosFetchError);
  });

  it("fuera de diciembre pide solo el año actual", async () => {
    vi.setSystemTime(new Date("2030-11-10T15:00:00-03:00"));
    const fetchMock = stubApi({ 2030: FERIADOS_2030 });

    await getFeriadosDelPeriodoActual();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/2030$/);
  });
});

describe("analizarHoy", () => {
  const FERIADOS_2026: Feriado[] = [
    { fecha: "2026-05-25", tipo: "inamovible", nombre: "Día de la Revolución de Mayo" },
    { fecha: "2026-06-20", tipo: "inamovible", nombre: "Paso a la Inmortalidad del General Manuel Belgrano" },
  ];

  it("con el fetch cacheado, cada día da su respuesta al cruzar la medianoche argentina", async () => {
    // Simula el Data Cache de Next: la API se consulta una vez y después se sirve la copia.
    const api = stubApi({ 2026: FERIADOS_2026 });
    const cache = new Map<string, string>();
    vi.stubGlobal("fetch", async (url: string) => {
      if (!cache.has(url)) cache.set(url, await (await api(url)).text());
      return new Response(cache.get(url), { status: 200 });
    });

    // 24/05 23:30 en Argentina (02:30 UTC del 25).
    vi.setSystemTime(new Date("2026-05-25T02:30:00Z"));
    const ayer = await analizarHoy();

    // Una hora después ya es 25/05 en Argentina.
    vi.setSystemTime(new Date("2026-05-25T03:30:00Z"));
    const hoy = await analizarHoy();

    expect(api).toHaveBeenCalledTimes(1);
    expect(ayer.todayISO).toBe("2026-05-24");
    expect(ayer.feriadoDeHoy).toBeNull();
    expect(ayer.proximoFeriado?.fecha).toBe("2026-05-25");
    expect(ayer.diasHastaProximo).toBe(1);
    expect(hoy.todayISO).toBe("2026-05-25");
    expect(hoy.feriadoDeHoy?.nombre).toBe("Día de la Revolución de Mayo");
    expect(hoy.proximoFeriado?.fecha).toBe("2026-06-20");
  });
});
