import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ListaFeriados } from "./ListaFeriados";
import { RespuestaFeriado } from "./RespuestaFeriado";
import { analizarFeriados, getFeriadosDelPeriodoActual, type Feriado } from "@/lib/feriados";

const f = (fecha: string, nombre: string, tipo: Feriado["tipo"] = "inamovible"): Feriado => ({ fecha, tipo, nombre });

afterEach(() => vi.restoreAllMocks());

describe("ListaFeriados con datos feos", () => {
  it("dos feriados con la misma fecha no generan keys duplicadas de React", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const a = analizarFeriados([f("2026-06-20", "A"), f("2026-06-20", "B")], "2026-06-10");
    renderToStaticMarkup(<ListaFeriados analisis={a} />);
    const avisos = spy.mock.calls.map((c) => String(c[0]) + String(c[1] ?? ""));
    expect(avisos.filter((m) => /same key|unique "key"|duplicate/i.test(m))).toEqual([]);
  });

  it("un nombre con <script> sale escapado en el markup", () => {
    const a = analizarFeriados([f("2026-06-20", "</script><script>alert(1)</script>")], "2026-06-10");
    const html = renderToStaticMarkup(<ListaFeriados analisis={a} />) + renderToStaticMarkup(<RespuestaFeriado analisis={a} />);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;/script&gt;");
  });

  // Corregido en el cierre: antes le pasaba la fecha imposible directo a la UI. Ahora la capa de
  // datos la descarta, así que el test entra por donde entran los datos reales.
  it("una fecha imposible de la API no llega a la UI ni renderiza 'undefined' o 'NaN'", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-10T12:00:00-03:00"));
    vi.stubGlobal("fetch", async () =>
      Response.json([f("2026-13-01", "Mes 13"), f("2026-05-25", "Revolución de Mayo")])
    );
    const a = analizarFeriados(await getFeriadosDelPeriodoActual(), "2026-01-10");
    vi.useRealTimers();
    vi.unstubAllGlobals();
    expect(a.feriadosOrdenados.map((x) => x.nombre)).toEqual(["Revolución de Mayo"]);
    const html = renderToStaticMarkup(<ListaFeriados analisis={a} />) + renderToStaticMarkup(<RespuestaFeriado analisis={a} />);
    expect(html).not.toMatch(/undefined|NaN/);
  });
});

describe("nombre largo sin espacios (300 caracteres) en RespuestaFeriado", () => {
  it("el contenedor del nombre permite cortar palabras (break-words / overflow-wrap) para no desbordar 375 px", () => {
    const nombre = "A".repeat(300);
    const a = analizarFeriados([f("2026-06-20", nombre)], "2026-06-20");
    const html = renderToStaticMarkup(<RespuestaFeriado analisis={a} />);
    expect(html).toMatch(/break-words|break-all|overflow-wrap|\[overflow-wrap/);
  });

  it("en la lista el nombre largo se trunca con ellipsis (documenta)", () => {
    const a = analizarFeriados([f("2026-06-20", "A".repeat(300))], "2026-06-10");
    expect(renderToStaticMarkup(<ListaFeriados analisis={a} />)).toContain("truncate");
  });
});

describe("RespuestaFeriado con '1 día'", () => {
  it("singular cuando falta 1 día", () => {
    const a = analizarFeriados([f("2026-06-20", "X")], "2026-06-19");
    expect(renderToStaticMarkup(<RespuestaFeriado analisis={a} />)).toContain("1 día<");
  });
});
