import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Copies WASM files from source to destination directory
 * @param {string} sourceDir - Source directory containing WASM files
 * @param {string} destDir - Destination directory to copy WASM files to
 * @param {string} logPrefix - Prefix for console log messages
 */
export function copyWasmFiles(sourceDir, destDir, logPrefix = '') {
  /* Create destination directory */
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }
  
  /* Copy WASM files */
  const files = ['ecm.js', 'ecm.wasm', 'unecm.js', 'unecm.wasm'];
  files.forEach(file => {
    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(destDir, file);
    if (existsSync(sourcePath)) {
      copyFileSync(sourcePath, destPath);
      console.log(`${logPrefix}Copied ${file} to ${destDir}`);
    }
  });
}

/**
 * Creates a Vite plugin for copying WASM files
 * @param {string} sourceDir - Source directory containing WASM files
 * @param {string} destDir - Destination directory to copy WASM files to
 * @param {string} logPrefix - Prefix for console log messages
 * @returns {Object} Vite plugin object
 */
export function createWasmCopyPlugin(sourceDir, destDir, logPrefix = '') {
  return {
    name: 'copy-wasm-files',
    writeBundle() {
      copyWasmFiles(sourceDir, destDir, logPrefix);
    }
  };
} 