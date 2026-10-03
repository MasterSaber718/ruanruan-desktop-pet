import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/dist/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(dir, 'src/main.js'),
      output: { entryFileNames: 'main.js', format: 'es' },
    },
  },
});