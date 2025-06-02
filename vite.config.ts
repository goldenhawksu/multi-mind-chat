import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  define: {
    'import.meta.env.VITE_PRESET_API_URL': JSON.stringify(process.env.VITE_PRESET_API_URL || ''),
    'import.meta.env.VITE_PRESET_API_KEY': JSON.stringify(process.env.VITE_PRESET_API_KEY || ''),
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      }
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    open: false
  }
});