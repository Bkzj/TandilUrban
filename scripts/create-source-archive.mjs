import { resolve } from 'node:path';
import { createSourceZip, REQUIRED } from './source-archive-lib.mjs';

const output = resolve('dist/propea-group-source.zip');
const files = createSourceZip(output);
console.log(`Archivo fuente determinístico: ${output}`);
console.log(`Archivos incluidos: ${files.length}`);
console.log('Manifest de archivos requeridos:');
for (const file of REQUIRED) console.log(`- ${file}`);
console.log('Manifest de migraciones:');
for (const file of files.filter((file) => file.startsWith('database/migrations/'))) {
  console.log(`- ${file}`);
}
