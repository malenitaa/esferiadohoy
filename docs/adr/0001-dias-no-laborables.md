# ADR-0001 · Los días no laborables tienen respuesta propia

**Fecha:** 15/11/2026 · **Estado:** aceptado · **Autora:** Malena

## Contexto

La API de ArgentinaDatos marca con `tipo: "puente"` los días no laborables con fines turísticos.
La página los trataba como cualquier feriado y respondía "SÍ" en verde. El 07/12/2026 iba a
decir que es feriado, aunque para el sector privado el día no laborable es optativo: decide
cada empleador.

Quien pregunta "¿hoy es feriado?" quiere saber si trabaja. Para un día puente la respuesta
honesta es "depende".

## Decisión

**Los días puente responden "NO LABORABLE", en ámbar, con una línea que aclara que es
optativo para el sector privado.**

- La página muestra "NO LABORABLE", el nombre del día y "Es optativo para el sector privado:
  depende de tu empleador."
- La imagen OG muestra "NO LABORABLE" en ámbar y más chico (120 px en vez de 260 px, para que
  entre en 1200 px de ancho).
- El JSON-LD responde "Hoy es día no laborable: <nombre>. Es optativo para el sector privado:
  depende de tu empleador."
- La lógica vive en `respuestaDeHoy()` (`lib/feriados.ts`), que devuelve `"si"`, `"no"` o
  `"no-laborable"`. La página, la imagen y el JSON-LD la usan, así no se desincronizan.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| A. Dejarlo en "SÍ" | Para el sector privado es falso: mucha gente trabaja ese día. |
| C. "NO" con una nota | Para el sector público y para quien tiene el día libre es falso, y la nota queda debajo de un "NO" grande que se lee primero. |

## Consecuencias

- La respuesta tiene tres estados en vez de dos. Cualquier lugar nuevo que muestre la
  respuesta tiene que usar `respuestaDeHoy()`.
- "Próximo feriado" sigue contando los días puente: si el próximo es uno, la página dice
  "Faltan N días para el próximo feriado: Día no laborable con fines turísticos". No se cambió
  en esta decisión.
- La lista de feriados no cambia: ya marcaba los puentes con su etiqueta "puente".

## Cómo se verifica

`npm test`: `components/RespuestaFeriado.test.tsx` renderiza el componente el 07/12/2026
(puente) y el 08/12/2026 (inamovible), y prueba `respuestaDeHoy()` con los tres tipos.
