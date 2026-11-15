# ADR-0004 · Cómo entran las dependencias

**Fecha:** 15/11/2026 · **Estado:** aceptado · **Autora:** Malena

## Contexto

Next 16.3.0 tenía 1 advisory crítico y 7 altos. No había Dependabot, ni CI, ni bloqueo de
scripts de instalación. El riesgo mayor es una versión maliciosa de un paquete conocido,
publicada hoy.

## Decisión

**Las dependencias entran con lockfile, sin scripts de instalación, con una semana de espera y
pasando por la CI.**

- `.npmrc` con `ignore-scripts=true`. El único paquete con script (`unrs-resolver`) funciona
  sin él.
- `.github/dependabot.yml`: npm y github-actions, semanal, `cooldown` de 7 días, menores y
  parches agrupados en un PR. Las versiones mayores de `typescript` se ignoran porque
  `typescript-eslint` (dentro de `eslint-config-next`) no soporta TypeScript 7.
- `.github/workflows/ci.yml` en cada PR y push a `main`: lint, typecheck, tests, build y
  `npm audit --omit=dev --audit-level=high`. Acciones fijadas por SHA.
- vitest es el runner de tests: liviano, sin configuración para TypeScript.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Renovate | Más control, más configuración. Para un repo, Dependabot alcanza. |
| Que el audit corte con moderadas | Las moderadas que hay son de desarrollo (`typescript-eslint` → `minimatch`) y no tienen arreglo publicado: frenarían todos los PRs. |

## Consecuencias

- Una versión nueva tarda una semana en llegar. Las alertas de seguridad de Dependabot no
  esperan el cooldown.
- Sacar la regla de `typescript` cuando `eslint-config-next` soporte TypeScript 7.

## Cómo se verifica

`npm audit --package-lock-only --omit=dev` da 0 y la CI corre en cada PR.
