import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWasmCopyPlugin } from './scripts/copy-wasm-files.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    createWasmCopyPlugin(
      path.join(__dirname, 'deps', 'ecm', 'wasm', 'build'),
      path.join(__dirname, 'dist', 'deps', 'ecm', 'wasm', 'build'),
      'dist: '
    )
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'RomOrganizer',
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external: [
        'command-line-args', 
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
        'node:zlib'
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
  },
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: {
    exclude: ['deps/ecm/wasm/build/*.js']
  },
  ssr: {
    noExternal: ['deps/ecm/wasm/build/*.js']
  }
}); 