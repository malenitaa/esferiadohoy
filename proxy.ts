import { NextRequest, NextResponse } from "next/server";

// CSP con un nonce nuevo por request: el navegador solo ejecuta los scripts que lo traen,
// y Next se lo agrega solo a los suyos. Un script inyectado (por ejemplo, desde el nombre
// de un feriado que viene de la API externa) no lo tiene y no corre.
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  // En desarrollo React usa eval para los stacks de error y Next mete estilos inline.
  const isDev = process.env.NODE_ENV === "development";

  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`};
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Solo páginas HTML: la API, los estáticos y las imágenes e índices generados no la necesitan.
      // Anclado: /apiario o /iconos son páginas (404) y sí llevan CSP.
      source:
        "/((?!(?:api|_next/static|_next/image)(?:/|$)|(?:icon|apple-icon|opengraph-image|robots\\.txt|sitemap\\.xml)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
