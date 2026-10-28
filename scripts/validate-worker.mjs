import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
await access(resolve(root, 'dist/server/index.js'));
const manifest = JSON.parse(await readFile(resolve(root, 'dist/.openai/hosting.json'), 'utf8'));
if (!manifest.project_id) throw new Error('hosting.json project_id missing');
if (manifest.static) throw new Error('Worker hosting manifest must not include static.directory');
console.log('worker artifact valid');
