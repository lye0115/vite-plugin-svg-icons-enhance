import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  sourcemap: false,
  clean: true,
  format: ['esm', 'cjs'],
  dts: true,
  outDir: 'dist',
  tsconfig: 'tsconfig.json',
  minify: 'terser',
});
