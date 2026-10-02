import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
export default defineConfig([
  ...nextVitals, ...nextTypescript,
  { rules: { '@typescript-eslint/no-explicit-any': 'warn', '@typescript-eslint/no-unused-vars': 'warn' } },
  { files: ['**/*.cjs'], rules: { '@typescript-eslint/no-require-imports': 'off', '@next/next/no-assign-module-variable': 'off' } },
  globalIgnores(['.next/**', 'out/**', 'next-env.d.ts']),
]);
