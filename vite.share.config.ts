import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

/** Build a single self-contained HTML file for offline client sharing. */
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'import.meta.env.VITE_HASH_ROUTER': JSON.stringify('true'),
  },
  build: {
    outDir: 'share',
    emptyOutDir: true,
  },
});
