import type { AnalisisFeriados, Feriado } from "@/lib/feriados";
import { TipoBadge } from "./TipoBadge";

const DIAS_SEMANA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function formatearFechaCorta(fecha: string) {
  const [year, month, day] = fecha.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const diaSemana = DIAS_SEMANA[utcDate.getUTCDay()];
  return `${diaSemana} ${day} ${MESES_CORTOS[month - 1]}`;
}

function FeriadoItem({
  feriado,
  todayISO,
  proximoFeriado,
}: {
  feriado: Feriado;
  todayISO: string;
  proximoFeriado: Feriado | null;
}) {
  const yaPaso = feriado.fecha < todayISO;
  const esHoy = feriado.fecha === todayISO;
  const esProximo = proximoFeriado?.fecha === feriado.fecha;

  return (
    <li
      className={`flex items-center justify-between gap-3 py-3 ${
        yaPaso ? "text-neutral-400 line-through decoration-neutral-300 dark:text-neutral-600 dark:decoration-neutral-700" : ""
      } ${esProximo || esHoy ? "rounded-lg bg-neutral-50 px-3 -mx-3 font-medium dark:bg-neutral-900" : ""}`}
    >
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm sm:text-base">{feriado.nombre}</span>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">
          {formatearFechaCorta(feriado.fecha)}
          {esHoy ? " · hoy" : esProximo ? " · próximo" : ""}
        </span>
      </div>
      <TipoBadge tipo={feriado.tipo} />
    </li>
  );
}

export function ListaFeriados({ analisis }: { analisis: AnalisisFeriados }) {
  const { feriadosOrdenados, todayISO, proximoFeriado } = analisis;

  const feriadosDelAnio = feriadosOrdenados.filter((f) => f.fecha.slice(0, 4) === todayISO.slice(0, 4));

  if (feriadosDelAnio.length === 0) {
    return null;
  }

  const pasados = feriadosDelAnio.filter((f) => f.fecha < todayISO);
  const desdeHoy = feriadosDelAnio.filter((f) => f.fecha >= todayISO);

  return (
    <section className="w-full max-w-md">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        Feriados de {todayISO.slice(0, 4)}
      </h2>

      {desdeHoy.length > 0 ? (
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {desdeHoy.map((feriado) => (
            <FeriadoItem
              key={feriado.fecha}
              feriado={feriado}
              todayISO={todayISO}
              proximoFeriado={proximoFeriado}
            />
          ))}
        </ul>
      ) : (
        <p className="py-3 text-sm text-neutral-400 dark:text-neutral-500">
          No quedan más feriados este año.
        </p>
      )}

      {pasados.length > 0 ? (
        <details className="group mt-2">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 py-2 text-sm text-neutral-400 marker:content-none hover:text-neutral-500 dark:text-neutral-500 dark:hover:text-neutral-400">
            <span className="inline-block transition-transform group-open:rotate-90">›</span>
            Ver feriados que ya pasaron ({pasados.length})
          </summary>
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {pasados.map((feriado) => (
              <FeriadoItem
                key={feriado.fecha}
                feriado={feriado}
                todayISO={todayISO}
                proximoFeriado={proximoFeriado}
              />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
