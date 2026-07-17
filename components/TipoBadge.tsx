import type { TipoFeriado } from "@/lib/feriados";

const LABELS: Record<TipoFeriado, string> = {
  inamovible: "inamovible",
  trasladable: "trasladable",
  puente: "puente",
};

// "puente" es el tipo menos oficial de los tres, así que se muestra más apagado.
const STYLES: Record<TipoFeriado, string> = {
  inamovible:
    "bg-neutral-800 text-neutral-100 dark:bg-neutral-200 dark:text-neutral-900",
  trasladable:
    "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200",
  puente:
    "border border-dashed border-neutral-300 text-neutral-400 dark:border-neutral-700 dark:text-neutral-500",
};

export function TipoBadge({ tipo }: { tipo: TipoFeriado }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide ${STYLES[tipo]}`}
    >
      {LABELS[tipo]}
    </span>
  );
}
