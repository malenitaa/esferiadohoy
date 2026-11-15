# Seguridad

## Reportar un problema

Abrí un issue en https://github.com/malenitaa/esferiadohoy/issues. El sitio no tiene cuentas
ni guarda datos de nadie, así que un reporte público no expone a ninguna persona.

Incluí qué encontraste, cómo reproducirlo y la URL. Te contesto dentro de una semana.

## Versiones con soporte

Solo la versión publicada en https://esferiadohoy.vercel.app, que sale de la rama `main`.

## Qué garantiza

Solo está en la tabla lo que tiene test o se verificó a mano.

| Garantía | Dónde | Test |
|---|---|---|
| El nombre de un feriado no puede cerrar el `<script>` del JSON-LD ni inyectar HTML | `app/page.tsx` | `app/page.test.tsx`, `app/page.peor-caso.test.tsx` |
| Los datos de la fuente se validan: fechas que no existen, de otro año, tipos desconocidos y nombres vacíos o de más de 300 caracteres se descartan | `lib/feriados.ts` | `lib/feriados.test.ts`, `lib/feriados.peor-caso.test.ts` |
| Los nombres se limpian de caracteres de control y de dirección (override RTL) | `lib/feriados.ts` | `lib/feriados.peor-caso.test.ts` |
| Si la fuente falla, tarda más de 8 s (incluida la lectura de la respuesta) o responde algo que no es una lista de feriados, la página muestra un mensaje en vez de una respuesta falsa | `lib/feriados.ts`, `app/page.tsx` | `lib/feriados.peor-caso.test.ts`, `app/page.test.tsx` |
| Cada página HTML lleva una Content Security Policy con un nonce nuevo por visita, y solo corren los scripts con ese nonce | `proxy.ts` | `proxy.test.ts`; bloqueo verificado en el navegador (15/11/2026) |
| La imagen para redes no hace pedidos a terceros por el contenido de la fuente (emojis, otros alfabetos) | `app/opengraph-image.tsx` | `app/opengraph-image.test.tsx` |
| Headers: HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, sin `X-Powered-By` | `next.config.ts` | — (verificado con `curl`, 15/11/2026) |
| Las fuentes tipográficas se sirven desde el propio dominio, sin pedidos a Google desde tu navegador | `app/layout.tsx` (`next/font`) | — (verificado en el build, 15/11/2026) |
| Las dependencias entran con lockfile, sin scripts de instalación y una semana después de publicadas; la CI corta con vulnerabilidades altas o críticas de producción | `.npmrc`, `.github/` | — (CI en cada PR) |

## Qué no hace nunca

- Usar cookies, analítica, publicidad o rastreadores.
- Cargar scripts, fuentes o imágenes de otros sitios en tu navegador.
- Pedirte o guardar datos tuyos.

## Alcance y límites

- **El hosting registra los accesos.** Vercel guarda logs de las visitas según su propia
  política. El sitio no los lee ni los procesa.
- **La información sale de ArgentinaDatos.** Si la fuente publica un feriado equivocado, el
  sitio lo muestra igual.
- **No hay límite de visitas propio.** La protección contra abuso es la de Vercel.
