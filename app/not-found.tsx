import Link from "next/link";
import { connection } from "next/server";

export default async function NotFound() {
  // La CSP lleva un nonce por request: una 404 prerenderizada saldría con scripts sin
  // nonce y el navegador los bloquearía.
  await connection();

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-white dark:bg-neutral-950">
      <main className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-6 py-16 text-center">
        <h1 className="text-xl text-neutral-600 dark:text-neutral-300">
          Esta página no existe.
        </h1>
        <Link
          href="/"
          className="text-neutral-400 underline decoration-dotted underline-offset-2 dark:text-neutral-500"
        >
          ¿Hoy es feriado en Argentina?
        </Link>
      </main>
    </div>
  );
}
