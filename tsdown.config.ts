// import { defineConfig } from 'tsdown';

// export default defineConfig([
//   {
//     entry: {
//       index: 'src/index.ts',

//       core: 'packages/core/index.ts',
//       interact: 'packages/interact/index.ts',
//       constants: 'packages/constants/index.ts',
//       types: 'packages/types/index.ts',
//     },
//     outDir: 'dist',
//     format: ['esm', 'cjs'],
//     dts: true,
//     clean: true,
//     sourcemap: false,
//     treeshake: true,
//     external: ['ol'],
//   },
// ]);

import { defineConfig } from 'tsdown';

const shared = {
  format: ['esm', 'cjs'],
  dts: true,
  external: ['ol'],
  clean: true,
} as any;

export default defineConfig([
  {
    ...shared,
    entry: ['src/index.ts'],
    outDir: 'dist',
    exports: true,
  },

  {
    ...shared,
    entry: ['packages/core/index.ts'],
    outDir: 'dist/core',
  },

  {
    ...shared,
    entry: ['packages/interact/index.ts'],
    outDir: 'dist/interact',
  },

  {
    ...shared,
    entry: ['packages/constants/index.ts'],
    outDir: 'dist/constants',
  },

  {
    ...shared,
    entry: ['packages/types/index.ts'],
    outDir: 'dist/types',
  },
]);
