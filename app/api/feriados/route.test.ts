import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Feriado } from "@/lib/feriados";
import { GET } from "./route";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-15T12:00:00-03:00"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GET /api/feriados", () => {
  it("devuelve la fecha de hoy en Argentina y los feriados", async () => {
    const feriados: Feriado[] = [{ fecha: "2026-11-23", tipo: "trasladable", nombre: "Soberanía Nacional" }];
    vi.stubGlobal("fetch", async () => Response.json(feriados));

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ todayISO: "2026-11-15", feriados });
  });

  it("la CDN la cachea hasta la medianoche argentina, con un tope de una hora", async () => {
    vi.stubGlobal("fetch", async () =>
      Response.json([{ fecha: "2026-11-23", tipo: "trasladable", nombre: "Soberanía Nacional" }])
    );

    vi.setSystemTime(new Date("2026-11-15T12:00:00-03:00"));
    expect((await GET()).headers.get("Cache-Control")).toBe("public, s-maxage=3600");

    vi.setSystemTime(new Date("2026-11-15T23:50:00-03:00"));
    expect((await GET()).headers.get("Cache-Control")).toBe("public, s-maxage=600");
  });

  it("un 502 no se cachea", async () => {
    vi.stubGlobal("fetch", async () => new Response("caído", { status: 503 }));

    expect((await GET()).headers.get("Cache-Control")).toBeNull();
  });

  it("si la fuente falla, responde 502 con un mensaje y sin detalles internos", async () => {
    vi.stubGlobal("fetch", async () => new Response("upstream caído", { status: 503 }));

    const response = await GET();

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "No pudimos cargar los feriados, probá de nuevo en un rato.",
    });
  });
});
