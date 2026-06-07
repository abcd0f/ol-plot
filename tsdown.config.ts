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

export default defineConfig([
  {
    format: ['esm', 'cjs'],
    dts: true,
    external: ['ol'],
    clean: true,
    entry: ['packages/index.ts'],
    outDir: 'dist',
    exports: true,
  },
]);
