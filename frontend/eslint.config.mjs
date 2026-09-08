import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'node:url';

const compat = new FlatCompat({
  baseDirectory: fileURLToPath(new URL('.', import.meta.url)),
});
const config = [
  {
    ignores: [
      '.next/**',
      '.pages-preview/**',
      'out/**',
      'node_modules/**',
      'test-results/**',
      'playwright-report/**',
      'next-env.d.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
];
export default config;
