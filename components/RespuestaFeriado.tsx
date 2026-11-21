import {
  ACLARACION_NO_LABORABLE,
  nombreDelProximo,
  respuestaDeHoy,
  type AnalisisFeriados,
} from "@/lib/feriados";

const TEXTO = { si: "SÍ", no: "NO", "no-laborable": "NO LABORABLE" } as const;

const ESTILO = {
  si: "text-8xl sm:text-9xl text-emerald-500",
  no: "text-8xl sm:text-9xl text-neutral-800 dark:text-neutral-100",
  // Más chico para que entre en una línea en un celular de 375 px, y en ámbar: no es ni el SÍ ni el NO.
  "no-laborable": "text-4xl sm:text-5xl text-amber-600 dark:text-amber-400",
} as const;

function formatearFecha(fecha: string) {
  const [, month, day] = fecha.split("-").map(Number);
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return `${day} de ${meses[month - 1]}`;
}

export function RespuestaFeriado({ analisis }: { analisis: AnalisisFeriados }) {
  const { feriadoDeHoy, proximoFeriado, diasHastaProximo } = analisis;
  const respuesta = respuestaDeHoy(analisis);

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className={`font-black tracking-tight ${ESTILO[respuesta]}`}>{TEXTO[respuesta]}</p>

      {feriadoDeHoy ? (
        <p className="break-words text-xl text-neutral-600 dark:text-neutral-300 sm:text-2xl">
          Hoy es <span className="font-semibold">{feriadoDeHoy.nombre}</span>
          {respuesta === "no-laborable" ? (
            <span className="mt-1 block text-base text-neutral-400 dark:text-neutral-500">
              {ACLARACION_NO_LABORABLE}
            </span>
          ) : null}
        </p>
      ) : proximoFeriado && diasHastaProximo !== null ? (
        <p className="break-words text-xl text-neutral-600 dark:text-neutral-300 sm:text-2xl">
          {diasHastaProximo === 1 ? "Falta" : "Faltan"}{" "}
          <span className="font-semibold">
            {diasHastaProximo} {diasHastaProximo === 1 ? "día" : "días"}
          </span>{" "}
          para {nombreDelProximo(proximoFeriado)}:{" "}
          <span className="font-semibold">{proximoFeriado.nombre}</span>
          <span className="block text-base text-neutral-400 dark:text-neutral-500">
            {formatearFecha(proximoFeriado.fecha)}
          </span>
          {proximoFeriado.tipo === "puente" ? (
            <span className="mt-1 block text-base text-neutral-400 dark:text-neutral-500">
              {ACLARACION_NO_LABORABLE}
            </span>
          ) : null}
        </p>
      ) : (
        <p className="break-words text-xl text-neutral-600 dark:text-neutral-300 sm:text-2xl">
          No hay más feriados cargados por ahora.
        </p>
      )}
    </div>
  );
}
