import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
      build: {
      lib: {
        entry: path.resolve(__dirname, 'src/index.ts'),
        name: 'RomOrganizer',
      fileName: 'index',
      formats: ['cjs']
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
        'node:events',
        'node:timers',
        'node:url',
        'node:crypto',
        'node:zlib',
        'fs',
        'path',
        'os',
        'child_process',
        'util',
        'events',
        'url',
        'crypto',
        'zlib',
        'deps/ecm/wasm/wrappers/ecm-wasm',
        'deps/ecm/wasm/types',
        'deps/ecm/wasm/index'
      ],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    outDir: 'dist/package',
    sourcemap: false,
    minify: false
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  esbuild: {
    target: 'ES2022'
  },
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: {
    exclude: ['deps/ecm/wasm/build/*.js']
  }
}); 