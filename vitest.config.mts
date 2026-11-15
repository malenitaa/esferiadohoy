import { defineConfig } from "vitest/config";

export default defineConfig({
  // Para que los tests resuelvan los imports "@/..." igual que Next.
  resolve: { tsconfigPaths: true },
});
