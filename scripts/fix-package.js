#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Read the package.json from dist-package
const packagePath = join(process.cwd(), 'dist-package', 'package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

// Remove the type: module to make it CommonJS
delete packageJson.type;

// Write back the modified package.json
writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

// Fix the __filename issue in the generated JavaScript
const jsPath = join(process.cwd(), 'dist-package', 'index.js');
let jsContent = readFileSync(jsPath, 'utf8');

// Replace __filename with import.meta.url equivalent
jsContent = jsContent.replace(/__filename/g, 'import.meta.url');

writeFileSync(jsPath, jsContent);

console.log('✅ Fixed package.json for CommonJS compatibility');
console.log('✅ Fixed __filename references for ES module compatibility'); 