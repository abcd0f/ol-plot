import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    format: ['esm', 'cjs'],
    dts: true,
    external: ['ol'],
    clean: true,
    entry: ['packages/index.ts'],
    outDir: 'dist',
    exports: true,
    treeshake: true,
    unbundle: true,
    minify: true,
  },
  {
    format: ['iife'],
    entry: ['packages/index.ts'],
    outDir: 'dist/browser',
    globalName: 'OlPlot',
    minify: true,
  },
]);
