import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import { config } from "./proxy";

const corre = (url: string) => unstable_doesMiddlewareMatch({ config, url });

describe("matcher del proxy (CSP)", () => {
  it.each(["/", "/no-existe", "/apiario", "/iconos", "/opengraph-imagexyz", "/robots.txtfoo"])(
    "las páginas HTML llevan CSP: %s",
    (url) => {
      expect(corre(url)).toBe(true);
    }
  );

  it.each([
    "/api/feriados",
    "/_next/static/chunks/main.js",
    "/_next/image",
    "/icon",
    "/apple-icon",
    "/opengraph-image",
    "/robots.txt",
    "/sitemap.xml",
  ])("lo que no es HTML no pasa por el proxy: %s", (url) => {
    expect(corre(url)).toBe(false);
  });
});
