// Encaixa uma foto que NÃO é 4:5 (por exemplo, uma montagem quadrada) num quadro 4:5, SEM cortar a foto:
// a foto fica inteira no centro e o espaço que sobra (em cima e embaixo) é preenchido com uma extensão desfocada
// da própria imagem, para a transição ficar suave. O carrossel de resultados usa quadros 4:5 (as outras montagens
// já são ~4:5) e corta com object-fit: cover, então fotos de outras proporções passam por aqui antes.
// Uso (na raiz do projeto):  node scripts/ajustar-foto-4x5.mjs <foto-de-entrada> <base-da-saida>
// Exemplo:  node scripts/ajustar-foto-4x5.mjs public/midia/resultados/caso-06/foto-2-1600.webp public/midia/resultados/caso-06/foto-2-4x5
// Gera <base>-640.webp, <base>-1080.webp, <base>-1600.webp e <base>-1080.jpg. Usa o `sharp` que já vem com o Astro.
import sharp from 'sharp';

const [entrada, base] = process.argv.slice(2);
if (!entrada || !base) {
  console.log('uso: node scripts/ajustar-foto-4x5.mjs <foto-de-entrada> <base-da-saida>');
  process.exit(1);
}

const gerar = async (largura) => {
  const altura = Math.round(largura * 1.25);
  const original = sharp(entrada);
  const meta = await original.metadata();
  // a foto inteira, na largura do quadro
  let foto = await sharp(entrada).resize({ width: largura, height: altura, fit: 'inside' }).toBuffer();
  // Esfumado curto (3,5% da altura) nas bordas de cima e de baixo da foto, para a emenda com o fundo desfocado
  // não aparecer como uma linha dura. Só mexe na faixa de ~3,5% da borda, longe dos rostos.
  const fm = await sharp(foto).metadata();
  if (fm.height < altura) {
    const faixa = 0.035;
    const mascara = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${fm.width}" height="${fm.height}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
        `<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="${faixa / 2}" stop-color="#fff" stop-opacity="0.35"/>` +
        `<stop offset="${faixa}" stop-color="#fff" stop-opacity="1"/><stop offset="${1 - faixa}" stop-color="#fff" stop-opacity="1"/>` +
        `<stop offset="${1 - faixa / 2}" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>` +
        `</linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
    );
    foto = await sharp(foto).ensureAlpha().composite([{ input: mascara, blend: 'dest-in' }]).png().toBuffer();
  }
  // o fundo: a própria foto ampliada para cobrir o quadro, bem desfocada
  const fundo = await sharp(entrada)
    .resize(largura, altura, { fit: 'cover' })
    .blur(Math.max(20, largura / 16))
    .toBuffer();
  return { quadro: sharp(fundo).composite([{ input: foto, gravity: 'center' }]), largura, altura, meta };
};

for (const largura of [640, 1080, 1600]) {
  const { quadro, altura } = await gerar(largura);
  const webp = await quadro.clone().webp({ quality: 80 }).toBuffer();
  await sharp(webp).toFile(`${base}-${largura}.webp`);
  console.log(`${base}-${largura}.webp`, `${largura}x${altura}`, `${(webp.length / 1024).toFixed(0)} KB`);
  if (largura === 1080) {
    await quadro.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(`${base}-1080.jpg`);
    console.log(`${base}-1080.jpg`);
  }
}
