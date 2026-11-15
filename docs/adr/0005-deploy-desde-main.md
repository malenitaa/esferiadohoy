# ADR-0005 · Producción se deploya desde `main`

**Fecha:** 15/11/2026 · **Estado:** aceptado · **Autora:** Malena

## Contexto

En Vercel, la rama de producción era `claude/hoy-es-feriado-app-tggg8n`, que ya no existía en
GitHub. Desde el 01/08/2026 cada push a `main` salía como Preview y producción quedó en
`298d907`: no le llegó ni la actualización de seguridad de Next 16.3.0 de octubre.

## Decisión

**La rama de producción en Vercel es `main`. Cada merge a `main` deploya a producción.**

- Cada PR tiene su deploy de Preview, que hace de entorno de prueba.
- Para volver atrás, Instant Rollback en Vercel.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Producción solo con tag `vX.Y.Z` (como dice `calidad.md`) | Vercel no deploya por tag sin un workflow propio. Para un sitio de una página, el preview del PR alcanza como prueba. |

## Consecuencias

- Mergear es publicar: no hay paso intermedio entre `main` y producción.
- Un tag marca una versión, pero no la deploya.

## Cómo se verifica

`gh api "repos/malenitaa/esferiadohoy/deployments?environment=Production"` lista un deploy por
cada merge a `main`.
