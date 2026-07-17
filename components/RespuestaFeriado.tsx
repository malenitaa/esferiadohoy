import type { AnalisisFeriados } from "@/lib/feriados";

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
  const esFeriado = Boolean(feriadoDeHoy);

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p
        className={`text-8xl font-black tracking-tight sm:text-9xl ${
          esFeriado ? "text-emerald-500" : "text-neutral-800 dark:text-neutral-100"
        }`}
      >
        {esFeriado ? "SÍ" : "NO"}
      </p>

      {esFeriado && feriadoDeHoy ? (
        <p className="text-xl text-neutral-600 dark:text-neutral-300 sm:text-2xl">
          Hoy es <span className="font-semibold">{feriadoDeHoy.nombre}</span>
        </p>
      ) : proximoFeriado && diasHastaProximo !== null ? (
        <p className="text-xl text-neutral-600 dark:text-neutral-300 sm:text-2xl">
          Faltan{" "}
          <span className="font-semibold">
            {diasHastaProximo} {diasHastaProximo === 1 ? "día" : "días"}
          </span>{" "}
          para el próximo feriado:{" "}
          <span className="font-semibold">{proximoFeriado.nombre}</span>
          <span className="block text-base text-neutral-400 dark:text-neutral-500">
            {formatearFecha(proximoFeriado.fecha)}
          </span>
        </p>
      ) : (
        <p className="text-xl text-neutral-600 dark:text-neutral-300 sm:text-2xl">
          No hay más feriados cargados por ahora.
        </p>
      )}
    </div>
  );
}
