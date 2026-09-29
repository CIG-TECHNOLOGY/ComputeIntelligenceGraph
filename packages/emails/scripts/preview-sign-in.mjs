import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = dirname(new URL(import.meta.url).pathname);
const templatePath = resolve(root, '../src/templates/sign-in.html');
const outDir = resolve(root, '../.preview');
const outFile = resolve(outDir, 'sign-in.html');

mkdirSync(outDir, { recursive: true });

const html = readFileSync(templatePath, 'utf8')
  .replaceAll('{{ .Token }}', '123456')
  .replaceAll('{{ .ConfirmationURL }}', 'https://app.cig.lat/auth/callback#demo');

writeFileSync(outFile, html, 'utf8');
console.log(`Wrote preview to ${outFile}`);
