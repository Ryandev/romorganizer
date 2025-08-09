import { defineConfig, mergeConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWasmCopyPlugin } from './scripts/copy-wasm-files.js';
import { baseConfig } from './vite.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wasmSourceDir = path.join(__dirname, 'deps', 'ecm', 'wasm', 'build');
const wasmDestDir = path.join(__dirname, 'dist', 'package', 'deps', 'ecm', 'wasm', 'build');

/* Package-specific configuration overrides */
const packageConfig = {
  plugins: [
    createWasmCopyPlugin(
      wasmSourceDir,
      wasmDestDir,
      'dist/package: '
    )
  ],
  build: {
    /* CJS format is inherited from baseConfig for yao-pkg compatibility */
    outDir: 'dist/package',
    sourcemap: false,
    minify: false
  },
};

/* Merge base config with package-specific overrides */
export default defineConfig(mergeConfig(baseConfig, packageConfig)); 