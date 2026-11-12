// Gera public/og-nalift.png (1200x630), a imagem que aparece quando o link do site é compartilhado (WhatsApp etc.).
// Fotografa scripts/og-modelo.html com o Edge ou o Chrome sem interface, então usa as fontes reais do site.
// Uso (na raiz do projeto):  node scripts/gerar-og.mjs
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const NAVEGADORES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];
const navegador = NAVEGADORES.find((c) => existsSync(c));
if (!navegador) {
  console.error('Nenhum Edge/Chrome encontrado para gerar a imagem.');
  process.exit(1);
}

const saida = resolve('public/og-nalift.png');
const entrada = pathToFileURL(resolve('scripts/og-modelo.html')).href;
const r = spawnSync(
  navegador,
  ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--force-device-scale-factor=1', '--window-size=1200,630', '--virtual-time-budget=4000', `--screenshot=${saida}`, entrada],
  { stdio: 'inherit' },
);
console.log(r.status === 0 ? `Imagem gerada: ${saida}` : `Falhou (código ${r.status})`);
process.exit(r.status ?? 1);
