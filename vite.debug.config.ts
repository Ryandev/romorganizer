import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: '7zTools',
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external: [
        'command-line-args', 
        'archiver', 
        'extract-zip', 
        'zx',
        'node:fs',
        'node:fs/promises',
        'node:path',
        'node:os',
        'node:child_process',
        'node:util',
        'node:zlib',
        'node:timers',
        'zlib',
        'crypto',
        'node:events',
        'fs',
        'path',
        'os',
        'child_process',
        'util',
        'events',
        'timers'
      ],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    outDir: 'dist',
    sourcemap: true,
    minify: false
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  esbuild: {
    target: 'ES2022'
  },
  define: {
    __DEV__: true
  }
}); 