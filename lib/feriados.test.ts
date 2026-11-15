import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeriadosFetchError, getFeriadosDelPeriodoActual, type Feriado } from "./feriados";

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
