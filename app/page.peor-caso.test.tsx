import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/server", () => ({ connection: async () => {} }));

import Home from "./page";

const MALO = `</script><script>alert("x")</script> & <!-- "comillas" 'simples'   ‮ مرحبا 🎉 é`;
// Corregido en el cierre: la capa de datos limpia caracteres de dirección (el override RTL de
// MALO) y junta espacios. El contrato de seguridad no cambia; el texto esperado es el limpio.
const MALO_LIMPIO = MALO.replace(/\u202E/g, " ").replace(/\s+/g, " ").trim();

function stubApi(data: unknown, status = 200) {
  vi.stubGlobal("fetch", async () =>
    typeof data === "string" ? new Response(data, { status }) : new Response(JSON.stringify(data), { status })
  );
}

async function render() {
  return renderToStaticMarkup(await Home());
}

function jsonLd(html: string) {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  return m ? m[1] : null;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("JSON-LD de la home con nombres maliciosos", () => {
  it("hoy feriado: no se puede salir del <script> y el JSON parsea con el nombre intacto", async () => {
    vi.setSystemTime(new Date("2026-06-20T12:00:00-03:00"));
    stubApi([{ fecha: "2026-06-20", tipo: "inamovible", nombre: MALO }]);
    const html = await render();
    const raw = jsonLd(html)!;
    expect(raw).not.toBeNull();
    expect(raw.toLowerCase()).not.toContain("</script");
    expect(raw).not.toContain("<");
    expect(JSON.parse(raw).mainEntity.acceptedAnswer.text).toBe(`Sí, hoy es ${MALO_LIMPIO}.`);
    expect(html.match(/<script/g)?.length).toBe(1);
  });

  it("próximo feriado malicioso: mismo contrato", async () => {
    vi.setSystemTime(new Date("2026-06-10T12:00:00-03:00"));
    stubApi([{ fecha: "2026-06-20", tipo: "puente", nombre: MALO }]);
    const raw = jsonLd(await render())!;
    expect(raw).not.toContain("<");
    expect(JSON.parse(raw).mainEntity.acceptedAnswer.text).toContain(MALO_LIMPIO);
  });

  it("puente hoy: el JSON-LD dice 'día no laborable'", async () => {
    vi.setSystemTime(new Date("2026-06-20T12:00:00-03:00"));
    stubApi([{ fecha: "2026-06-20", tipo: "puente", nombre: "Puente" }]);
    expect(JSON.parse(jsonLd(await render())!).mainEntity.acceptedAnswer.text).toMatch(/^Hoy es día no laborable: Puente/);
  });

  it("falta 1 día: el JSON-LD dice '1 día', no '1 días'", async () => {
    vi.setSystemTime(new Date("2026-06-19T12:00:00-03:00"));
    stubApi([{ fecha: "2026-06-20", tipo: "inamovible", nombre: "Belgrano" }]);
    const text = JSON.parse(jsonLd(await render())!).mainEntity.acceptedAnswer.text;
    expect(text).not.toContain("1 días");
  });

  it("sin feriados cargados: texto de 'no hay más' y sin 'null'/'undefined'", async () => {
    // Corregido en el cierre (auditoría M3): una lista vacía ahora es un error de la fuente. El
    // "no hay más" real es el 31/12, con el año ya terminado y el siguiente sin publicar (stubApi
    // devuelve los datos de 2026 también para /2027, y la capa de datos los descarta por año).
    vi.setSystemTime(new Date("2026-12-31T12:00:00-03:00"));
    stubApi([{ fecha: "2026-12-25", tipo: "inamovible", nombre: "Navidad" }]);
    const text = JSON.parse(jsonLd(await render())!).mainEntity.acceptedAnswer.text;
    expect(text).toBe("No hay más feriados cargados por ahora.");
  });
});

describe("home cuando la API falla de formas raras", () => {
  it("500: mensaje de 'no pudimos cargar' y sin JSON-LD", async () => {
    vi.setSystemTime(new Date("2026-06-19T12:00:00-03:00"));
    stubApi("x", 500);
    const html = await render();
    expect(html).toContain("No pudimos cargar los feriados");
    expect(jsonLd(html)).toBeNull();
  });

  it("HTML con 200: el usuario ve 'No pudimos cargar', no 'error inesperado'", async () => {
    vi.setSystemTime(new Date("2026-06-19T12:00:00-03:00"));
    stubApi("<html>Cloudflare</html>");
    expect(await render()).toContain("No pudimos cargar los feriados");
  });

  it("JSON inválido: lo mismo", async () => {
    vi.setSystemTime(new Date("2026-06-19T12:00:00-03:00"));
    stubApi("[{");
    expect(await render()).toContain("No pudimos cargar los feriados");
  });
});
