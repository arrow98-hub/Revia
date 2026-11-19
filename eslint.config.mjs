import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Estos componentes leen APIs del navegador al montar (permisos, service worker,
    // zona horaria, localStorage): sincronizar estado desde un sistema externo es el uso válido de un effect.
    files: [
      "src/components/pwa/**",
      "src/components/dashboard/setup-card.tsx",
      "src/app/(auth)/**",
    ],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
