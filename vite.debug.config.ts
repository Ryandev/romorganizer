import { defineConfig, mergeConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWasmCopyPlugin } from './scripts/copy-wasm-files.js';
import { baseConfig } from './vite.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wasmSourceDir = path.join(__dirname, 'deps', 'ecm', 'wasm', 'build');
const wasmDestDir = path.join(__dirname, 'dist', 'deps', 'ecm', 'wasm', 'build');

/* Debug-specific configuration overrides */
const debugConfig = {
  plugins: [
    createWasmCopyPlugin(
      wasmSourceDir,
      wasmDestDir,
      'dist: '
    )
  ],
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: false
  },
  define: {
    __DEV__: true,
    'process.env.DEBUG': '"1"'
  },
  ssr: {
    noExternal: ['deps/ecm/wasm/build/*.js']
  }
};

/* Merge base config with debug-specific overrides */
export default defineConfig(mergeConfig(baseConfig, debugConfig)); 