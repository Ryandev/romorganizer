#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function removeJsExtensions(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
            removeJsExtensions(filePath);
        } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
            let content = fs.readFileSync(filePath, 'utf8');
            
            // Remove .js extensions from relative imports
            content = content.replace(
                /from\s+['"](\.{1,2}\/[^'"]+)\.js['"]/g,
                "from '$1'"
            );
            
            fs.writeFileSync(filePath, content);
            console.log(`Updated: ${filePath}`);
        }
    }
}

const srcDir = path.join(__dirname, '..', 'src');
removeJsExtensions(srcDir);
console.log('Finished removing .js extensions from imports'); 