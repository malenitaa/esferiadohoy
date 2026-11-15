# ADR-0006 · Cómo se trata lo que manda ArgentinaDatos

**Fecha:** 15/11/2026 · **Estado:** aceptado · **Autora:** Malena

## Contexto

En el cierre, los tests de peor caso mostraron que la validación dejaba pasar fechas que no
existen (2026-02-30, mes 13), fechas de otro año, nombres de puros espacios y respuestas HTML
con status 200 (que terminaban en "Ocurrió un error inesperado" y en un 500 de la imagen OG).
La auditoría (M3) mostró que una lista vacía hacía que la página respondiera "NO" también un
día de feriado.

## Decisión

**Lo que no se puede usar se descarta; lo que se puede usar se limpia; y si no queda nada
para el año actual, es un error de la fuente, no un dato.**

- Se descartan: fechas que no existen en el calendario o que no son del año pedido, tipos
  desconocidos, nombres vacíos o de más de 300 caracteres (`parseFeriado`).
- Se limpian: caracteres de control y de dirección (override RTL) del nombre. Un salto de
  línea suelto no esconde un feriado real.
- Son `FeriadosFetchError`: red caída, timeout de 8 s (también leyendo el body), status no
  2xx, cuerpo que no es JSON, algo que no es un array, ningún ítem válido y lista vacía para
  el año actual.
- Si un feriado y un puente caen el mismo día, gana el feriado (SÍ).
- En la imagen OG, el subtítulo saca los caracteres fuera de Latin para que `next/og` no salga
  a jsdelivr o a Google Fonts según el contenido de la fuente, y se acota a 120 caracteres.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Descartar un feriado con caracteres de control | Esconde un feriado real por un detalle de formato. |
| Aceptar la lista vacía | La página dice "NO" un día que es feriado: el peor error posible del sitio. |
| Cachear el resultado validado en vez del fetch (`"use cache"`) | Pide activar Cache Components en todo el sitio. Queda como issue. |

## Consecuencias

- Si ArgentinaDatos publica un año vacío, el sitio muestra "No pudimos cargar los feriados"
  hasta 24 h (el Data Cache guarda la respuesta cruda).

## Cómo se verifica

`lib/feriados.peor-caso.test.ts`, `app/page.peor-caso.test.tsx`,
`app/opengraph-image.peor-caso.test.tsx` y `app/opengraph-image.test.tsx`.
