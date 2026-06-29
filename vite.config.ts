import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'FormGuard',
      formats: ['es', 'cjs'],
      fileName: (format) => `form-guard.${format === 'cjs' ? 'cjs' : 'js'}`,
    },
    sourcemap: true,
    minify: 'esbuild',
  },
});
