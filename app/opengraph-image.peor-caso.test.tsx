import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: async () => {} }));
// ImageResponse necesita el runtime de Next: se captura el árbol JSX que recibe.
vi.mock("next/og", () => ({
  ImageResponse: class {
    constructor(public element: unknown) {}
  },
}));

import Image from "./opengraph-image";

function textos(node: unknown): string[] {
  if (node == null || typeof node === "boolean") return [];
  if (typeof node === "string" || typeof node === "number") return [String(node)];
  if (Array.isArray(node)) return node.flatMap(textos);
  const el = node as { props?: { children?: unknown } };
  return textos(el.props?.children);
}

async function og() {
  const r = (await Image()) as unknown as { element: unknown };
  return textos(r.element);
}

function stubApi(data: unknown, status = 200) {
  vi.stubGlobal("fetch", async () =>
    typeof data === "string" ? new Response(data, { status }) : new Response(JSON.stringify(data), { status })
  );
}

beforeEach(() => vi.useFakeTimers({ toFake: ["Date"] }));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("imagen OG", () => {
  it("nombre con <script> y comillas va como texto plano (JSX lo escapa; no es HTML)", async () => {
    vi.setSystemTime(new Date("2026-06-20T12:00:00-03:00"));
    stubApi([{ fecha: "2026-06-20", tipo: "inamovible", nombre: `</script>"x" & <b>` }]);
    expect(await og()).toContain(`</script>"x" & <b>`);
  });

  it("falta 1 día: usa singular", async () => {
    vi.setSystemTime(new Date("2026-06-19T12:00:00-03:00"));
    stubApi([{ fecha: "2026-06-20", tipo: "inamovible", nombre: "Belgrano" }]);
    expect((await og()).join(" ")).toContain("Falta 1 día para");
  });

  it("API caída (500): devuelve imagen igual", async () => {
    vi.setSystemTime(new Date("2026-06-19T12:00:00-03:00"));
    stubApi("x", 500);
    await expect(Image()).resolves.toBeTruthy();
  });

  it("HTML con 200: devuelve imagen igual, no revienta con 500", async () => {
    vi.setSystemTime(new Date("2026-06-19T12:00:00-03:00"));
    stubApi("<html>");
    await expect(Image()).resolves.toBeTruthy();
  });

  it("nombre de 300 caracteres: el subtítulo se acota para entrar en la imagen de 630 px (discutible: 120)", async () => {
    vi.setSystemTime(new Date("2026-06-20T12:00:00-03:00"));
    stubApi([{ fecha: "2026-06-20", tipo: "inamovible", nombre: "Palabra ".repeat(37).trim() }]);
    const sub = (await og()).find((t) => t.startsWith("Palabra"))!;
    expect(sub.length).toBeLessThanOrEqual(120);
  });
});
