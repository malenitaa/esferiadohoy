import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FeriadosFetchError,
  analizarFeriados,
  getArgentinaTodayISO,
  getFeriadosDelPeriodoActual,
  type Feriado,
} from "./feriados";

const f = (fecha: string, nombre = "X", tipo: Feriado["tipo"] = "inamovible") => ({ fecha, tipo, nombre });

function stubApiJson(porAnio: Record<number, unknown>) {
  const fetchMock = vi.fn(async (url: string) => {
    const data = porAnio[Number(url.split("/").pop())];
    return data === undefined
      ? new Response("nope", { status: 404 })
      : new Response(JSON.stringify(data), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-06-10T12:00:00-03:00"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("validación de fechas de la API", () => {
  it("descarta fechas imposibles que pasan el regex (2026-02-30)", async () => {
    stubApiJson({ 2026: [f("2026-02-30", "Imposible"), f("2026-06-20", "Real")] });
    const r = await getFeriadosDelPeriodoActual();
    expect(r.map((x) => x.fecha)).toEqual(["2026-06-20"]);
  });

  it("descarta mes 13 y día 00 (2026-13-01, 2026-00-10, 2026-05-00)", async () => {
    stubApiJson({ 2026: [f("2026-13-01"), f("2026-00-10"), f("2026-05-00"), f("2026-06-20")] });
    const r = await getFeriadosDelPeriodoActual();
    expect(r.map((x) => x.fecha)).toEqual(["2026-06-20"]);
  });

  it("descarta 29/02 en año no bisiesto pero conserva 29/02/2028", async () => {
    vi.setSystemTime(new Date("2028-01-10T12:00:00-03:00"));
    stubApiJson({ 2028: [f("2028-02-29", "Bisiesto")] });
    expect((await getFeriadosDelPeriodoActual()).map((x) => x.fecha)).toEqual(["2028-02-29"]);
    stubApiJson({ 2028: [f("2027-02-29", "No existe"), f("2028-03-01")] });
    expect((await getFeriadosDelPeriodoActual()).map((x) => x.fecha)).toEqual(["2028-03-01"]);
  });

  it("descarta feriados de otro año cuando se pidió /2026", async () => {
    stubApiJson({ 2026: [f("2025-12-25", "Navidad vieja"), f("2026-06-20", "Real")] });
    const r = await getFeriadosDelPeriodoActual();
    expect(r.map((x) => x.fecha)).toEqual(["2026-06-20"]);
  });

  it("en diciembre, si /2031 devuelve datos de 2030, no duplica fechas ni mezcla años", async () => {
    vi.setSystemTime(new Date("2030-12-10T12:00:00-03:00"));
    const d2030 = [f("2030-12-08", "Inmaculada"), f("2030-12-25", "Navidad")];
    stubApiJson({ 2030: d2030, 2031: d2030 });
    const r = await getFeriadosDelPeriodoActual();
    expect(r.map((x) => x.fecha)).toEqual(["2030-12-08", "2030-12-25"]);
  });
});

describe("validación del nombre", () => {
  it("rechaza un nombre solo de espacios", async () => {
    stubApiJson({ 2026: [f("2026-06-19", "   \t "), f("2026-06-20", "Real")] });
    const r = await getFeriadosDelPeriodoActual();
    expect(r.map((x) => x.nombre)).toEqual(["Real"]);
  });

  it("acepta 300 caracteres exactos y rechaza 301 (documenta el borde)", async () => {
    stubApiJson({ 2026: [f("2026-06-19", "a".repeat(300)), f("2026-06-20", "a".repeat(301))] });
    const r = await getFeriadosDelPeriodoActual();
    expect(r.map((x) => x.fecha)).toEqual(["2026-06-19"]);
  });

  it("el límite de 300 se mide en unidades UTF-16: 151 emojis (302 unidades) se rechazan (discutible)", async () => {
    stubApiJson({ 2026: [f("2026-06-20", "🎉".repeat(151))] });
    // Si el único ítem es inválido y hay datos, tira error: documenta el comportamiento actual.
    await expect(getFeriadosDelPeriodoActual()).rejects.toBeInstanceOf(FeriadosFetchError);
  });

  // Corregido en el cierre: la expectativa original era descartar el ítem, pero eso esconde un
  // feriado real por un salto de línea suelto. Se limpia el nombre y el feriado se muestra.
  it("limpia saltos de línea, caracteres de control y override RTL del nombre", async () => {
    stubApiJson({
      2026: [
        f("2026-06-18", "Linea1\nLinea2"),
        f("2026-06-19", "‮noitcnuf"),
        f("2026-06-20", "Real"),
      ],
    });
    const r = await getFeriadosDelPeriodoActual();
    expect(r.map((x) => x.nombre)).toEqual(["Linea1 Linea2", "noitcnuf", "Real"]);
  });
});

describe("forma de la respuesta", () => {
  // Corregido en el cierre (auditoría M3): un año sin feriados no existe, así que la lista vacía
  // es la fuente fallando. Antes se aceptaba y la página decía "NO" también un día de feriado.
  it("array vacío para el año actual tira FeriadosFetchError", async () => {
    stubApiJson({ 2026: [] });
    await expect(getFeriadosDelPeriodoActual()).rejects.toBeInstanceOf(FeriadosFetchError);
  });

  it("objeto en vez de array tira FeriadosFetchError", async () => {
    stubApiJson({ 2026: { feriados: [] } });
    await expect(getFeriadosDelPeriodoActual()).rejects.toBeInstanceOf(FeriadosFetchError);
  });

  it("todos los ítems inválidos tira FeriadosFetchError", async () => {
    stubApiJson({ 2026: [{ fecha: 20260101, tipo: "inamovible", nombre: "x" }, null, 3, "x"] });
    await expect(getFeriadosDelPeriodoActual()).rejects.toBeInstanceOf(FeriadosFetchError);
  });

  it("HTML de error con status 200 tira FeriadosFetchError (no SyntaxError)", async () => {
    vi.stubGlobal("fetch", async () => new Response("<html><body>Bad gateway</body></html>", { status: 200 }));
    await expect(getFeriadosDelPeriodoActual()).rejects.toBeInstanceOf(FeriadosFetchError);
  });

  it("JSON inválido tira FeriadosFetchError (no SyntaxError)", async () => {
    vi.stubGlobal("fetch", async () => new Response('[{"fecha":', { status: 200 }));
    await expect(getFeriadosDelPeriodoActual()).rejects.toBeInstanceOf(FeriadosFetchError);
  });

  it("500 y 429 tiran FeriadosFetchError", async () => {
    for (const status of [500, 429]) {
      vi.stubGlobal("fetch", async () => new Response("x", { status }));
      await expect(getFeriadosDelPeriodoActual()).rejects.toBeInstanceOf(FeriadosFetchError);
    }
  });

  it("10.000 feriados válidos se procesan sin romper", async () => {
    const muchos = Array.from({ length: 10_000 }, (_, i) =>
      f(`2026-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`, `F${i}`)
    );
    stubApiJson({ 2026: muchos });
    expect((await getFeriadosDelPeriodoActual()).length).toBe(10_000);
  });

  it("en diciembre, 500 en el año actual aunque el siguiente responda bien tira error", async () => {
    vi.setSystemTime(new Date("2030-12-10T12:00:00-03:00"));
    vi.stubGlobal("fetch", async (url: string) =>
      url.endsWith("/2030")
        ? new Response("x", { status: 500 })
        : new Response(JSON.stringify([f("2031-01-01")]), { status: 200 })
    );
    await expect(getFeriadosDelPeriodoActual()).rejects.toBeInstanceOf(FeriadosFetchError);
  });

  it("en diciembre, si el año siguiente devuelve HTML con 200, se sigue con el actual", async () => {
    vi.setSystemTime(new Date("2030-12-10T12:00:00-03:00"));
    vi.stubGlobal("fetch", async (url: string) =>
      url.endsWith("/2030")
        ? new Response(JSON.stringify([f("2030-12-25")]), { status: 200 })
        : new Response("<html>", { status: 200 })
    );
    expect((await getFeriadosDelPeriodoActual()).map((x) => x.fecha)).toEqual(["2030-12-25"]);
  });
});

describe("timeouts", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.useFakeTimers(); // ahora también setTimeout
    vi.setSystemTime(new Date("2026-06-10T12:00:00-03:00"));
  });

  it("si la API no responde, a los 8 s falla con FeriadosFetchError", async () => {
    vi.stubGlobal(
      "fetch",
      (_u: string, init: RequestInit) =>
        new Promise((_res, rej) => init.signal!.addEventListener("abort", () => rej(new Error("abort"))))
    );
    const p = getFeriadosDelPeriodoActual();
    const asserted = expect(p).rejects.toBeInstanceOf(FeriadosFetchError);
    await vi.advanceTimersByTimeAsync(8_001);
    await asserted;
  });

  it("si llegan los headers pero el body nunca termina, igual corta por timeout", async () => {
    // Corregido en el cierre: el stub original ignoraba el signal, y el fetch real no. Al abortar
    // la señal después de los headers, el fetch real corta también la lectura del body.
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      const body = new ReadableStream({
        start(controller) {
          init?.signal?.addEventListener("abort", () =>
            controller.error(new DOMException("aborted", "AbortError"))
          );
        },
      });
      return new Response(body, { status: 200 });
    });
    let estado = "pendiente";
    getFeriadosDelPeriodoActual().then(
      () => (estado = "resuelta"),
      () => (estado = "rechazada")
    );
    await vi.advanceTimersByTimeAsync(30_000);
    expect(estado).not.toBe("pendiente");
  });
});

describe("bordes de reloj (hora Argentina)", () => {
  it("31/12 23:59 AR sigue siendo 31/12; 00:00 AR ya es 01/01", () => {
    vi.setSystemTime(new Date("2027-01-01T02:59:59Z"));
    expect(getArgentinaTodayISO()).toBe("2026-12-31");
    vi.setSystemTime(new Date("2027-01-01T03:00:00Z"));
    expect(getArgentinaTodayISO()).toBe("2027-01-01");
  });

  it("29/02/2028 existe en hora AR", () => {
    vi.setSystemTime(new Date("2028-02-29T02:59:00Z"));
    expect(getArgentinaTodayISO()).toBe("2028-02-28");
    vi.setSystemTime(new Date("2028-02-29T03:00:00Z"));
    expect(getArgentinaTodayISO()).toBe("2028-02-29");
  });

  it("31/12 23:59 AR en diciembre pide también el año siguiente y el próximo es el 01/01", async () => {
    vi.setSystemTime(new Date("2027-01-01T02:59:00Z"));
    const m = stubApiJson({ 2026: [f("2026-12-25")], 2027: [f("2027-01-01", "Año Nuevo")] });
    const r = await getFeriadosDelPeriodoActual();
    expect(m).toHaveBeenCalledTimes(2);
    const a = analizarFeriados(r, getArgentinaTodayISO());
    expect(a.proximoFeriado?.fecha).toBe("2027-01-01");
    expect(a.diasHastaProximo).toBe(1);
  });

  it("00:00 AR del 01/01 es feriado de hoy", async () => {
    vi.setSystemTime(new Date("2027-01-01T03:00:00Z"));
    stubApiJson({ 2027: [f("2027-01-01", "Año Nuevo")] });
    const a = analizarFeriados(await getFeriadosDelPeriodoActual(), getArgentinaTodayISO());
    expect(a.feriadoDeHoy?.nombre).toBe("Año Nuevo");
  });
});

describe("analizarFeriados", () => {
  it("dos feriados el mismo día: próximo y días hasta próximo son coherentes", () => {
    const a = analizarFeriados([f("2026-06-20", "A"), f("2026-06-20", "B"), f("2026-07-09")], "2026-06-18");
    expect(a.diasHastaProximo).toBe(2);
    expect(a.proximoFeriado?.fecha).toBe("2026-06-20");
  });

  it("el mismo día con un inamovible y un puente: hoy responde 'si', no 'no-laborable' (discutible)", () => {
    const a = analizarFeriados([f("2026-06-20", "Puente", "puente"), f("2026-06-20", "Belgrano", "inamovible")], "2026-06-20");
    expect(a.feriadoDeHoy?.tipo).toBe("inamovible");
  });

  it("cruza año con diferencia de días correcta (31/12 -> 01/01 bisiesto 2028-02-28 -> 03-01 = 2)", () => {
    expect(analizarFeriados([f("2028-03-01")], "2028-02-28").diasHastaProximo).toBe(2);
  });

  it("sin feriados no hay próximo ni días", () => {
    const a = analizarFeriados([], "2026-06-18");
    expect(a.proximoFeriado).toBeNull();
    expect(a.diasHastaProximo).toBeNull();
  });
});
