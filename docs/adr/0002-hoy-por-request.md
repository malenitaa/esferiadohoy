# ADR-0002 · "Hoy" se calcula en cada request

**Fecha:** 15/11/2026 · **Estado:** aceptado · **Autora:** Malena

## Contexto

La página y la imagen OG se prerenderizaban con ISR de 24 horas. `getArgentinaTodayISO()`
corría al generar la página, no al servirla: si se regeneraba a la tarde, a la mañana
siguiente seguía mostrando la respuesta de ayer. En producción se veía con
`x-nextjs-prerender: 1` y `x-vercel-cache: HIT`.

## Decisión

**La página (`/`), la imagen OG y la 404 llaman a `connection()` y se arman en cada request.
Solo el fetch a ArgentinaDatos queda cacheado 24 horas, con su propio `revalidate`.**

- `analizarHoy()` (`lib/feriados.ts`) lee el reloj una sola vez y le pasa la fecha a
  `getFeriadosDelPeriodoActual()`, para que la página y el fetch no lean días distintos a las
  23:59:59.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| `export const dynamic = "force-dynamic"` | Según la doc de Next 16.4, equivale a `cache: 'no-store'` en cada fetch: apaga también el caché de la API. |
| ISR con un `revalidate` que no cruce la medianoche | ISR regenera con la primera visita después de vencer, no a una hora fija. Siempre queda una ventana con la respuesta de ayer. |

## Consecuencias

- Un render SSR por visita. Es una lista de unos 20 ítems sin otra I/O que el caché del fetch.
- La CDN de Vercel no cachea la página (`cache-control: private, no-store`).
- Habilita la CSP con nonce (ADR-0003), que necesita render por request.

## Cómo se verifica

- `lib/feriados.test.ts`: "cada día da su respuesta al cruzar la medianoche argentina".
- `npm run build` muestra `ƒ /` y `ƒ /opengraph-image`.
- En producción, `/` sale sin `x-nextjs-prerender`.
