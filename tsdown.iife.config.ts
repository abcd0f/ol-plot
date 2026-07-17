import { defineConfig } from 'tsdown';

const olGlobals = (id: string): string => (id === 'ol' ? 'ol' : id.replace(/^ol\//, 'ol.').replace(/\//g, '.'));

export default defineConfig({
  format: ['iife'],
  external: [/^ol(\/|$)/],
  entry: ['packages/index.ts'],
  outDir: 'dist-browser',
  globalName: 'OlPlot',
  minify: true,
  outputOptions: {
    globals: olGlobals,
  },
});
