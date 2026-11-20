import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Feriado } from "@/lib/feriados";

// connection() solo tiene sentido dentro de una request de Next; acá no hace nada.
vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  connection: async () => {},
}));

const { default: Home } = await import("./page");

async function renderHome() {
  return renderToStaticMarkup(await Home());
}

function jsonLd(html: string) {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  return match?.[1] ?? null;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-15T12:00:00-03:00"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("página principal", () => {
  it("dado que la API falla, cuando se abre la página, entonces muestra el mensaje y no se cae", async () => {
    vi.stubGlobal("fetch", async () => new Response("error", { status: 500 }));

    const html = await renderHome();

    expect(html).toContain("No pudimos cargar los feriados, probá de nuevo en un rato.");
    expect(jsonLd(html)).toBeNull();
  });

  it("el JSON-LD responde la pregunta del día", async () => {
    const feriados: Feriado[] = [{ fecha: "2026-11-23", tipo: "trasladable", nombre: "Soberanía Nacional" }];
    vi.stubGlobal("fetch", async () => Response.json(feriados));

    const data = JSON.parse(jsonLd(await renderHome()) ?? "null");

    expect(data.mainEntity.acceptedAnswer.text).toBe(
      "No. Faltan 8 días para el próximo feriado: Soberanía Nacional."
    );
  });

  it("el JSON-LD marca como día no laborable un próximo que es puente", async () => {
    const feriados: Feriado[] = [
      { fecha: "2026-11-16", tipo: "puente", nombre: "Puente turístico" },
      { fecha: "2026-11-23", tipo: "trasladable", nombre: "Soberanía Nacional" },
    ];
    vi.stubGlobal("fetch", async () => Response.json(feriados));

    const data = JSON.parse(jsonLd(await renderHome()) ?? "null");

    expect(data.mainEntity.acceptedAnswer.text).toBe(
      "No. Faltan 1 día para el próximo día no laborable: Puente turístico. Es optativo para el sector privado: depende de tu empleador."
    );
  });

  it("el JSON-LD escapa un nombre con </script> y no cierra el bloque", async () => {
    const malicioso = 'X</script><script>alert(1)</script>"&';
    const feriados: Feriado[] = [{ fecha: "2026-11-15", tipo: "inamovible", nombre: malicioso }];
    vi.stubGlobal("fetch", async () => Response.json(feriados));

    const html = await renderHome();
    const bloque = jsonLd(html);

    expect(bloque).not.toBeNull();
    expect(bloque).not.toMatch(/[<>]/);
    // Escapado sigue siendo JSON válido con el nombre original adentro.
    expect(JSON.parse(bloque!).mainEntity.acceptedAnswer.text).toBe(`Sí, hoy es ${malicioso}.`);
    expect(html).not.toContain("<script>alert(1)</script>");
  });
});
