import { defineConfig } from 'tsdown';

export default defineConfig({
  format: ['iife'],
  external: ['ol'],
  entry: ['packages/index.ts'],
  outDir: 'dist-browser',
  globalName: 'OlPlot',
  minify: true,
});
