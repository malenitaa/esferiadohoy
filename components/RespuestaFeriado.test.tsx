import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { analizarFeriados, respuestaDeHoy, type Feriado } from "@/lib/feriados";
import { RespuestaFeriado } from "./RespuestaFeriado";

const FERIADOS: Feriado[] = [
  { fecha: "2026-12-07", tipo: "puente", nombre: "Día no laborable con fines turísticos" },
  { fecha: "2026-12-08", tipo: "inamovible", nombre: "Inmaculada Concepción de María" },
  { fecha: "2026-11-23", tipo: "trasladable", nombre: "Día de la Soberanía Nacional" },
];

function render(todayISO: string) {
  return renderToStaticMarkup(<RespuestaFeriado analisis={analizarFeriados(FERIADOS, todayISO)} />);
}

describe("respuestaDeHoy", () => {
  it.each([
    ["2026-12-08", "si"],
    ["2026-11-23", "si"],
    ["2026-12-07", "no-laborable"],
    ["2026-12-09", "no"],
  ])("el %s responde %s", (todayISO, esperada) => {
    expect(respuestaDeHoy(analizarFeriados(FERIADOS, todayISO))).toBe(esperada);
  });
});

describe("RespuestaFeriado", () => {
  it("un día puente dice NO LABORABLE y aclara que es optativo", () => {
    const html = render("2026-12-07");
    expect(html).toContain("NO LABORABLE");
    expect(html).not.toContain(">SÍ<");
    expect(html).toContain("Día no laborable con fines turísticos");
    expect(html).toContain("optativo para el sector privado");
  });

  it("dado un día común, cuando se abre la página, entonces dice NO y cuánto falta para el próximo", () => {
    const html = render("2026-12-05");
    expect(html).toContain(">NO<");
    expect(html).toMatch(/Faltan[\s\S]*2[\s\S]*días[\s\S]*para el próximo feriado/);
    // El próximo es el puente del 07/12: "próximo feriado" todavía cuenta los puentes.
    expect(html).toContain("Día no laborable con fines turísticos");
    expect(html).toContain("7 de diciembre");
  });

  it("dado que el próximo feriado es mañana, entonces dice 1 día, en singular", () => {
    const html = render("2026-11-22");
    expect(html).toMatch(/1(<!-- -->)? día</);
  });

  it("un feriado sigue diciendo SÍ, sin la aclaración", () => {
    const html = render("2026-12-08");
    expect(html).toContain(">SÍ<");
    expect(html).not.toContain("optativo");
  });
});
