# ADR-0003 · Content Security Policy con nonce por request

**Fecha:** 15/11/2026 · **Estado:** aceptado · **Autora:** Malena

## Contexto

Los nombres de los feriados vienen de una API externa y terminan en el HTML, en el JSON-LD y
en la imagen OG. React escapa el HTML y el JSON-LD se escapa a mano, pero no había una segunda
barrera si un escape fallaba. El sitio ya mandaba los demás headers de seguridad
(`next.config.ts`) y le faltaba la CSP.

## Decisión

**`proxy.ts` genera un nonce nuevo por request y manda una CSP con
`script-src 'self' 'nonce-…' 'strict-dynamic'`, sin `'unsafe-inline'`.**

- Next le agrega el nonce a sus propios scripts. Un script inyectado no lo tiene y el
  navegador no lo ejecuta.
- El proxy no corre para `/api`, los estáticos, los íconos, la imagen OG, `robots.txt` ni
  `sitemap.xml`: no son HTML.
- La 404 (`app/not-found.tsx`) se arma por request: prerenderizada salía con scripts sin
  nonce y la CSP los bloqueaba.
- En desarrollo se suman `'unsafe-eval'` y `style-src 'unsafe-inline'`, como pide la guía de
  Next.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| CSP con `'unsafe-inline'` en `next.config.ts` | Deja correr justo el script inyectado que la CSP tiene que frenar. |
| Subresource Integrity (experimental de Next) | Es experimental y no cubre los scripts inline que mete Next. |

## Consecuencias

- Todas las páginas HTML tienen que ser dinámicas. Ya lo eran desde ADR-0002, salvo la 404.
- Si se agrega un script de terceros, hay que pasarle el nonce o romperá.

## Cómo se verifica

- `curl -sI` en `/`: header `content-security-policy` con `nonce-…`, y todos los `<script>`
  del HTML con ese nonce (incluida la 404).
- Una página servida con la CSP exacta de la app bloquea un `<script>` y un `onerror`
  inyectados y deja correr los que tienen nonce (PR #15).
