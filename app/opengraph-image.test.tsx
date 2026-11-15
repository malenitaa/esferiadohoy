import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: async () => {} }));
// ImageResponse necesita el runtime de Next: se captura lo que recibe.
vi.mock("next/og", () => ({
  ImageResponse: class {
    constructor(
      public element: unknown,
      public options: { headers?: Record<string, string> }
    ) {}
  },
}));

const { default: Image } = await import("./opengraph-image");

type Capturado = { element: unknown; options: { headers?: Record<string, string> } };

function textos(node: unknown): string[] {
  if (node == null || typeof node === "boolean") return [];
  if (typeof node === "string" || typeof node === "number") return [String(node)];
  if (Array.isArray(node)) return node.flatMap(textos);
  return textos((node as { props?: { children?: unknown } }).props?.children);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("imagen OG", () => {
  it("dado un nombre con emojis o alfabetos no latinos, entonces el subtítulo los saca", async () => {
    // Sin esto next/og sale a jsdelivr (emojis) o a Google Fonts (CJK) según lo que mande la API.
    vi.setSystemTime(new Date("2026-06-20T12:00:00-03:00"));
    vi.stubGlobal("fetch", async () =>
      Response.json([{ fecha: "2026-06-20", tipo: "inamovible", nombre: "Día de la Bandera 🇦🇷 春节" }])
    );

    const r = (await Image()) as unknown as Capturado;

    expect(textos(r.element)).toContain("Día de la Bandera");
  });

  it("la CDN la cachea hasta la medianoche argentina", async () => {
    vi.setSystemTime(new Date("2026-06-20T23:40:00-03:00"));
    vi.stubGlobal("fetch", async () =>
      Response.json([{ fecha: "2026-06-20", tipo: "inamovible", nombre: "Día de la Bandera" }])
    );

    const r = (await Image()) as unknown as Capturado;

    expect(r.options.headers?.["Cache-Control"]).toBe("public, s-maxage=1200");
  });
});
