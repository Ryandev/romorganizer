import { defineConfig, UserConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWasmCopyPlugin } from './scripts/copy-wasm-files.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wasmSourceDir = path.join(__dirname, 'deps', 'ecm', 'wasm', 'build');
const wasmDestDir = path.join(__dirname, 'dist', 'build', 'deps', 'ecm', 'wasm', 'build');

/* Base configuration that can be extended by other config files */
export const baseConfig: UserConfig = {
  plugins: [
    createWasmCopyPlugin(
      wasmSourceDir,
      wasmDestDir,
      'dist/build: '
    )
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'RomOrganizer',
      fileName: 'index',
      /* Use CJS format for compatibility with yao-pkg bundling */
      formats: ['cjs']
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
        'node:zlib',
        /* These are required by adm-zip */
        'fs',
        'path',
        'zlib',
        'crypto'
      ],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    outDir: 'dist/build',
    sourcemap: true,
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
};

/* Default configuration for standard build */
export default defineConfig(baseConfig); 