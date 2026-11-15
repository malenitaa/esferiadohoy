# ADR-0007 · La CDN cachea hasta la medianoche argentina

**Fecha:** 15/11/2026 · **Estado:** aceptado · **Autora:** Malena

## Contexto

Después de ADR-0002, `/`, `/opengraph-image` y `/api/feriados` se arman en cada request y
ninguna mandaba `s-maxage`: cada request, incluido un loop de `curl`, ejecutaba una función en
Vercel (auditoría, M1).

## Decisión

**`/api/feriados` y `/opengraph-image` mandan `Cache-Control: public, s-maxage=N`, con N los
segundos que faltan para la medianoche argentina y un tope de 3600.**

- `segundosDeCacheHastaMedianoche()` (`lib/feriados.ts`) calcula N con la hora de
  `America/Argentina/Buenos_Aires`.
- Sin `stale-while-revalidate`: serviría la respuesta de ayer después de medianoche.
- Un 502 no se cachea.
- `/` no se cachea: el nonce de la CSP (ADR-0003) cambia en cada request.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| `s-maxage` fijo de una hora | Entre las 23:00 y las 00:00 serviría la respuesta de ayer. |
| Borrar `/api/feriados` porque el sitio no la usa | Es un contrato público (`GET /api/feriados`). Con caché cuesta poco. |

## Consecuencias

- El abuso de `/` queda en manos del Firewall y el tope de gasto de Vercel (issue).

## Cómo se verifica

`app/api/feriados/route.test.ts` y `app/opengraph-image.test.tsx` ("la CDN la cachea…").
