import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { analizarFeriados, type Feriado } from "@/lib/feriados";
import { ListaFeriados } from "./ListaFeriados";

const FERIADOS: Feriado[] = [
  { fecha: "2026-01-01", tipo: "inamovible", nombre: "Año nuevo" },
  { fecha: "2026-05-25", tipo: "inamovible", nombre: "Revolución de Mayo" },
  { fecha: "2026-11-23", tipo: "trasladable", nombre: "Soberanía Nacional" },
  { fecha: "2026-12-07", tipo: "puente", nombre: "Puente turístico" },
  { fecha: "2027-01-01", tipo: "inamovible", nombre: "Año nuevo 2027" },
];

function render(todayISO: string) {
  return renderToStaticMarkup(<ListaFeriados analisis={analizarFeriados(FERIADOS, todayISO)} />);
}

/** Lo que queda antes y después del <details> de "ya pasaron". */
function partes(html: string) {
  const i = html.indexOf("<details");
  return { proximos: i === -1 ? html : html.slice(0, i), pasados: i === -1 ? "" : html.slice(i) };
}

describe("ListaFeriados", () => {
  it("dado un día de noviembre, entonces lista los que vienen arriba y pliega los pasados", () => {
    const { proximos, pasados } = partes(render("2026-11-15"));

    expect(proximos).toContain("Feriados de 2026");
    expect(proximos).toContain("Soberanía Nacional");
    expect(proximos).toContain("Puente turístico");
    expect(proximos).not.toContain("Revolución de Mayo");
    expect(pasados).toContain("Ver feriados que ya pasaron (2)");
    expect(pasados).toContain("Revolución de Mayo");
  });

  it("marca el próximo feriado", () => {
    expect(render("2026-11-15")).toMatch(/Soberanía Nacional[\s\S]*· próximo/);
  });

  it("dado que hoy es feriado, entonces lo marca como hoy y no como pasado", () => {
    const { proximos } = partes(render("2026-05-25"));
    expect(proximos).toMatch(/Revolución de Mayo[\s\S]*· hoy/);
  });

  it("no muestra los feriados del año siguiente aunque estén cargados", () => {
    expect(render("2026-12-10")).not.toContain("Año nuevo 2027");
  });

  it("dado que ya pasaron todos, entonces dice que no quedan más este año", () => {
    expect(render("2026-12-31")).toContain("No quedan más feriados este año.");
  });
});
