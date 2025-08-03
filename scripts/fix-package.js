#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { copyWasmFiles } from './copy-wasm-files.js';

/* Read the package.json from dist/package */
const packagePath = path.join(process.cwd(), 'dist', 'package', 'package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

/* Remove the type: module to make it CommonJS */
delete packageJson.type;

/* Write back the modified package.json */
writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

/* Fix the __filename issue in the generated JavaScript */
const jsPath = path.join(process.cwd(), 'dist', 'package', 'index.js');
let jsContent = readFileSync(jsPath, 'utf8');

/* Replace __filename with import.meta.url equivalent */
jsContent = jsContent.replace(/__filename/g, 'import.meta.url');

writeFileSync(jsPath, jsContent);

/* Copy WASM files from dist/build to dist/package */
const wasmSourceDir = path.join(process.cwd(), 'dist', 'build', 'deps', 'ecm', 'wasm', 'build');
const wasmDestDir = path.join(process.cwd(), 'dist', 'package', 'deps', 'ecm', 'wasm', 'build');

copyWasmFiles(wasmSourceDir, wasmDestDir, 'dist/package: ');

console.log('✅ Fixed package.json for CommonJS compatibility');
console.log('✅ Fixed __filename references for ES module compatibility');
console.log('✅ Copied WASM files to package directory'); 