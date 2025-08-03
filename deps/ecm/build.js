#!/usr/bin/env node
/* eslint-env node */

import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ecmRoot = __dirname;
const projectRoot = join(ecmRoot, '..', '..');

console.log('Building ECM WASM modules...');

/* Setup Emscripten environment */
const emsdkPath = join(ecmRoot, 'emsdk');
const emccPath = join(emsdkPath, 'upstream', 'emscripten', 'emcc');

/* Check if Emscripten is available */
try {
  execSync(`"${emccPath}" --version`, {
    stdio: 'pipe',
    env: { ...process.env, EMSDK_PYTHON: process.env.EMSDK_PYTHON || 'python3' }
  });
} catch {
  console.error('❌ Emscripten is not available in the local emsdk installation.');
  console.error(`   Expected path: ${emccPath}`);
  console.error('   Please ensure the emsdk is properly installed in deps/ecm/emsdk/');
  throw new Error('Emscripten is not available in the local emsdk installation');
}

const wasmBuildDir = join(ecmRoot, 'wasm', 'build');
const ecmSrcDir = join(ecmRoot, 'src', 'src');

/* Ensure build directory exists */
try {
  execSync(`mkdir -p "${wasmBuildDir}"`, { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to create build directory:', error instanceof Error ? error.message : String(error));
  throw new Error('Failed to create build directory');
}

/* Build ecm.wasm */
console.log('Building ecm.wasm...');
try {
  const ecmCommand = `"${emccPath}" "${join(ecmSrcDir, 'ecm.c')}" -o "${join(wasmBuildDir, 'ecm.js')}" \
    -s MODULARIZE=1 \
    -s EXPORT_NAME="createECMModule" \
    -s EXPORTED_FUNCTIONS="['_ecmify']" \
    -s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap', 'getValue', 'setValue', 'FS']" \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s INITIAL_MEMORY=67108864 \
    -s MAXIMUM_MEMORY=1073741824 \
    -s FILESYSTEM=1 \
    -s EXPORT_ES6=1 \
    -s USE_ES6_IMPORT_META=1 \
    -s LEGACY_VM_SUPPORT=1 \
    -O3`;

  execSync(ecmCommand, {
    stdio: 'inherit',
    cwd: projectRoot,
    env: { ...process.env, EMSDK_PYTHON: process.env.EMSDK_PYTHON || 'python3' }
  });
  console.log('✅ ecm.wasm built successfully');
} catch (error) {
  console.error('❌ Failed to build ecm.wasm:', error.message);
  throw new Error('Failed to build ecm.wasm');
}

/* Build unecm.wasm */
console.log('Building unecm.wasm...');
try {
  const unecmCommand = `"${emccPath}" "${join(ecmSrcDir, 'unecm.c')}" -o "${join(wasmBuildDir, 'unecm.js')}" \
    -I"${join(ecmRoot, 'src', 'include')}" \
    -s MODULARIZE=1 \
    -s EXPORT_NAME="createUNECMModule" \
    -s EXPORTED_FUNCTIONS="['_unecmify']" \
    -s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap', 'getValue', 'setValue', 'FS']" \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s INITIAL_MEMORY=67108864 \
    -s MAXIMUM_MEMORY=1073741824 \
    -s FILESYSTEM=1 \
    -s EXPORT_ES6=1 \
    -s USE_ES6_IMPORT_META=1 \
    -s LEGACY_VM_SUPPORT=1 \
    -O3`;

  execSync(unecmCommand, {
    stdio: 'inherit',
    cwd: projectRoot,
    env: { ...process.env, EMSDK_PYTHON: process.env.EMSDK_PYTHON || 'python3' }
  });
  console.log('✅ unecm.wasm built successfully');
} catch (error) {
  console.error('❌ Failed to build unecm.wasm:', error.message);
  throw new Error('Failed to build unecm.wasm');
}

console.log('✅ ECM WASM modules built successfully');
console.log(`Output directory: ${wasmBuildDir}`); 