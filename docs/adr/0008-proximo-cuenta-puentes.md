# ADR-0008 · "Próximo feriado" cuenta los puentes y los marca

**Fecha:** 20/11/2026 · **Estado:** aceptado · **Autora:** Malena

## Contexto

ADR-0001 hizo que los días puente respondan "NO LABORABLE", pero "próximo feriado" los seguía
contando sin distinguirlos: el 05/12/2026 la página iba a decir "Faltan 2 días para el próximo
feriado: Puente turístico no laborable". Issue #21.

## Decisión

**El próximo se cuenta aunque sea un puente, y en ese caso se marca como día no laborable.**
Quién se toma el puente depende de cada persona y de su empleador, así que esconderlo
también estaría mal.

- Si el próximo es un puente, la página dice "Faltan N días para el próximo día no laborable:
  <nombre>" y abajo aclara que es optativo para el sector privado. Si es un feriado, dice
  "próximo feriado" como antes.
- El JSON-LD dice lo mismo y suma la aclaración.
- La lógica vive en `nombreDelProximo()` (`lib/feriados.ts`), que usan la página y el JSON-LD.
- La imagen OG no cambia: dice "Faltan N días para <nombre>", sin la palabra "feriado".

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| B. Saltear el puente y mencionarlo en una línea aparte | Para quien sí se toma el puente, el próximo día libre es el puente. |
| C. Saltear el puente sin mencionarlo | Esconde un día que mucha gente no trabaja. |

## Consecuencias

- Reemplaza la consecuencia de ADR-0001 que decía que "próximo feriado" no cambiaba.
- Si el puente y el feriado van seguidos (07/12 y 08/12), la página muestra primero el puente;
  el feriado aparece en la lista.

## Cómo se verifica

`npm test`: `components/RespuestaFeriado.test.tsx` renderiza el 05/12/2026 (el próximo es un
puente) y el 20/11/2026 (el próximo es un feriado). `app/page.test.tsx` prueba el JSON-LD con
un próximo que es puente.
