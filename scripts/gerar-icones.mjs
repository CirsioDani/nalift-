// Gera os ícones do site a partir do monograma GW (public/midia/logo/logo-gw.svg):
//   public/favicon.svg          (SVG quadrado, monograma vermelho em fundo transparente)
//   public/favicon-32.png       (PNG 32x32, fundo transparente)
//   public/apple-touch-icon.png (PNG 180x180, com FUNDO NUDE: o iOS não aceita transparência)
// Uso (na raiz do projeto):  node scripts/gerar-icones.mjs   (usa o `sharp`, que já vem com o Astro)
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const NUDE = '#F7F1EB'; // --cor-fundo
const original = readFileSync('public/midia/logo/logo-gw.svg', 'utf8');
const grupo = original.slice(original.indexOf('<g '), original.lastIndexOf('</g>') + 4);

// O logo é largo (1328 x 1008). Para o ícone ele ganha um quadrado de 1448 x 1448 com o desenho centralizado.
const quadrado = (largura) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${largura}" viewBox="-60 -220 1448 1448">${grupo}</svg>`;

writeFileSync('public/favicon.svg', quadrado(64) + '\n');
await sharp(Buffer.from(quadrado(256))).resize(32, 32).png().toFile('public/favicon-32.png');

// Ícone da Apple: fundo nude, monograma ocupando ~78% do quadrado.
const logo = await sharp(Buffer.from(quadrado(512))).resize(140, 140).png().toBuffer();
await sharp({ create: { width: 180, height: 180, channels: 4, background: NUDE } })
  .composite([{ input: logo, gravity: 'center' }])
  .removeAlpha() // sem canal alfa: o iOS pinta transparência de preto
  .png()
  .toFile('public/apple-touch-icon.png');

console.log('favicon.svg, favicon-32.png e apple-touch-icon.png gerados em public/');
