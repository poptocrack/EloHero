import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { preloadResources } from './vite-plugin-preload';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), preloadResources()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3002,
    open: true
  },
  build: {
    outDir: 'dist',
    cssCodeSplit: true,
    minify: 'esbuild',
    target: 'es2015',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'i18n-vendor': ['i18next', 'react-i18next', 'i18next-browser-languagedetector']
        },
        // Optimize asset file names for better caching
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    },
    // Optimize chunk size warnings threshold
    chunkSizeWarningLimit: 1000
  }
});
