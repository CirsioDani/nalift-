// Gera as "fitas de seda" do fundo da Abertura como imagens WebP transparentes (public/midia/fitas/).
// Uso (na raiz do projeto):  node scripts/gerar-fitas.mjs [pasta-para-previas-em-PNG]
// Não entra no build do site: roda uma vez (ou quando o desenho mudar) e o resultado é publicado como mídia.
// Usa o `sharp`, que já vem com o Astro (nenhuma dependência nova).
//
// Cada fita é uma faixa larga que se torce e se dobra: a largura varia ao longo da curva e a COR acompanha a
// largura (onde a fita "mostra a face" fica clara, como o brilho do cetim; onde vira de lado, fica mais funda,
// em bordô). Bordas totalmente desfocadas (um halo largo + um núcleo mais firme) e translucidez baixa, para o
// resultado ser macio, sem nenhuma linha nítida. Depois de gerar, o site só anima transform e opacity.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SAIDA = 'public/midia/fitas';
const PREVIAS = process.argv[2] || null;

// Cores da paleta do projeto (CLAUDE.md): bordô, marsala, rosé e um brilho quase nude.
// Tons mais quentes que a paleta "crua": o rosé puxa para o rosado/avermelhado (e não para o bege) e o brilho
// é um branco quente, para a seda ficar rosé/avermelhada nas dobras e nas sombras, sem ficar rosa demais.
const COR = {
  bordo: [0x7a, 0x1f, 0x2b],
  marsala: [0x8c, 0x4a, 0x4a],
  rose: [0xe8, 0xb4, 0xb0],
  brilho: [0xff, 0xea, 0xe4],
};
const NUDE = [0xf7, 0xf1, 0xeb];

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
const suave = (x) => x * x * (3 - 2 * x);

const amostrar = (ini, segs, n = 48) => {
  const pts = [];
  let p0 = ini;
  segs.forEach((s, k) => {
    const [x1, y1, x2, y2, x3, y3] = s;
    for (let i = k === 0 ? 0 : 1; i <= n; i++) {
      const t = i / n;
      const u = 1 - t;
      pts.push([
        u * u * u * p0[0] + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
        u * u * u * p0[1] + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
      ]);
    }
    p0 = [x3, y3];
  });
  return pts;
};

// Geometria da fita: pontos da curva, normais e a largura em cada ponto (irregular, com "torções").
const geometria = (f) => {
  const pts = amostrar(f.inicio, f.segs);
  const acum = [0];
  for (let i = 1; i < pts.length; i++) {
    acum.push(acum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const total = acum[acum.length - 1];
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const m = Math.hypot(dx, dy) || 1;
    const t = acum[i] / total;
    // Largura irregular: duas ondas sobrepostas (nada de ritmo regular).
    const u = 0.7 * Math.sin(2 * Math.PI * (f.ciclos * t + f.fase)) + 0.3 * Math.sin(2 * Math.PI * (f.ciclos * 2.3 * t + f.fase * 1.7));
    const k = Math.pow((u + 1) / 2, 1.1); // 0 = fita de lado (fina), 1 = fita mostrando a face (larga)
    return { p, nx: -dy / m, ny: dx / m, t, k, w: (f.wmin + (f.wmax - f.wmin) * k) / 2 };
  });
};

const f1 = (q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`;

// Faixa entre duas posições laterais (relativas à curva) de cada ponto; cor e opacidade por ponto.
const faixa = (geo, de, ate, cor, opac = () => 1) =>
  geo
    .slice(0, -1)
    .map((g, i) => {
      const n = geo[i + 1];
      const pos = (x, lat) => [x.p[0] + x.nx * lat, x.p[1] + x.ny * lat];
      const c = hex(cor(g));
      const o = opac(g).toFixed(2);
      return `<polygon points="${f1(pos(g, de(g)))} ${f1(pos(n, de(n)))} ${f1(pos(n, ate(n)))} ${f1(pos(g, ate(g)))}" fill="${c}" fill-opacity="${o}" stroke="${c}" stroke-opacity="${o}" stroke-width="2" stroke-linejoin="round"/>`;
    })
    .join('');

// Corpo da fita (de fundo a rosé conforme mostra a face) + sombra numa das bordas (dá volume de dobra).
const corpo = (f) => {
  const geo = geometria(f);
  const sombra = mix(f.fundo, [0x3a, 0x0c, 0x14], 0.45);
  return (
    faixa(geo, (g) => -g.w, (g) => g.w, (g) => mix(f.fundo, COR.rose, g.k * 0.6)) +
    faixa(geo, (g) => g.w * 0.35, (g) => g.w, () => sombra, (g) => 0.45 + 0.4 * (1 - g.k))
  );
};

// Veio de brilho (o "sheen" do cetim): um fio claro que corre ao longo da fita, deslocado para um lado e para
// o outro, mais forte onde a fita mostra a face. Desenhado por cima, com desfoque menor.
const brilho = (f) => {
  const geo = geometria(f);
  const centro = (g) => g.w * 0.22 * Math.sin(2 * Math.PI * (f.ciclos * 1.3 * g.t + f.fase * 0.7));
  return faixa(geo, (g) => centro(g) - g.w * 0.16, (g) => centro(g) + g.w * 0.16, () => COR.brilho, (g) => Math.pow(g.k, 1.5) * 0.9);
};

// A imagem é maior que a cena visível: tem uma MARGEM `m` (em unidades do desenho) em volta. No site, o contêiner
// da imagem também ultrapassa a Abertura por todos os lados, então as bordas da imagem nunca aparecem, nem durante
// a flutuação. As coordenadas das fitas seguem sendo as da cena visível (a margem usa coordenadas negativas).
const svgDaFita = (cena, f) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${cena.render[0]}" height="${cena.render[1]}" viewBox="${-cena.m} ${-cena.m} ${cena.vb[0] + 2 * cena.m} ${cena.vb[1] + 2 * cena.m}">
  <defs>
    <filter id="halo" filterUnits="userSpaceOnUse" x="${-cena.m - 200}" y="${-cena.m - 200}" width="${cena.vb[0] + 2 * cena.m + 400}" height="${cena.vb[1] + 2 * cena.m + 400}"><feGaussianBlur stdDeviation="${cena.blur[1]}"/></filter>
    <filter id="nucleo" filterUnits="userSpaceOnUse" x="${-cena.m - 200}" y="${-cena.m - 200}" width="${cena.vb[0] + 2 * cena.m + 400}" height="${cena.vb[1] + 2 * cena.m + 400}"><feGaussianBlur stdDeviation="${cena.blur[0]}"/></filter>
    <!-- Atrás do logo e do título a fita fica quase invisível: ~20% no miolo, 100% nas bordas. -->
    <radialGradient id="centro" gradientUnits="userSpaceOnUse" cx="${cena.vb[0] / 2}" cy="${cena.vb[1] * 0.46}" r="${cena.vb[0] / 2}" gradientTransform="translate(${cena.vb[0] / 2} ${cena.vb[1] * 0.46}) scale(1 ${cena.vb[1] / cena.vb[0]}) translate(${-cena.vb[0] / 2} ${-cena.vb[1] * 0.46})">
      <stop offset="0.3" stop-color="#fff" stop-opacity="0.2"/>
      <stop offset="0.95" stop-color="#fff" stop-opacity="1"/>
    </radialGradient>
    <mask id="mascara" maskUnits="userSpaceOnUse" x="${-cena.m}" y="${-cena.m}" width="${cena.vb[0] + 2 * cena.m}" height="${cena.vb[1] + 2 * cena.m}">
      <rect x="${-cena.m}" y="${-cena.m}" width="${cena.vb[0] + 2 * cena.m}" height="${cena.vb[1] + 2 * cena.m}" fill="url(#centro)"/>
    </mask>
    <filter id="veio" filterUnits="userSpaceOnUse" x="-200" y="-200" width="${cena.vb[0] + 400}" height="${cena.vb[1] + 400}"><feGaussianBlur stdDeviation="${cena.blur[0] * 0.55}"/></filter>
    <g id="fita">${corpo(f)}</g>
    <g id="veio-g">${brilho(f)}</g>
  </defs>
  <g mask="url(#mascara)" opacity="${f.opacidade}">
    <use xlink:href="#fita" filter="url(#halo)" opacity="0.5"/>
    <use xlink:href="#fita" filter="url(#nucleo)"/>
    <use xlink:href="#veio-g" filter="url(#veio)"/>
  </g>
</svg>`;

// Largura em unidades do desenho (viewBox): no celular 1 unidade ≈ 1 px; no PC (viewBox 1600) ≈ 0,8 px.
const CENAS = [
  {
    nome: 'retrato',
    vb: [400, 800],
    m: 70, // margem (unidades) em volta da cena visível
    render: [432, 752], // (400 + 140) x (800 + 140) a 80%: o conteúdo é todo macio, então não precisa de mais
    blur: [7, 18],
    fitas: [
      {
        fundo: COR.bordo, opacidade: 0.22, wmin: 30, wmax: 80, ciclos: 1.5, fase: 0.1,
        inicio: [-120, -70],
        segs: [[90, 100, 0, 260, 70, 380], [140, 500, 90, 600, 190, 660], [290, 720, 380, 750, 480, 810]],
      },
      {
        fundo: mix(COR.bordo, COR.marsala, 0.35), opacidade: 0.2, wmin: 28, wmax: 72, ciclos: 1.3, fase: 0.55,
        inicio: [530, -10],
        segs: [[330, 30, 200, 90, 130, 150], [60, 210, 230, 330, 340, 400], [450, 470, 390, 620, 300, 700], [210, 780, 120, 830, 0, 960]],
      },
    ],
  },
  {
    nome: 'paisagem',
    vb: [1600, 1000],
    m: 80,
    render: [968, 638], // (1600 + 160) x (1000 + 160) a 55%
    blur: [11, 28],
    fitas: [
      {
        fundo: COR.bordo, opacidade: 0.22, wmin: 40, wmax: 105, ciclos: 1.5, fase: 0.1,
        inicio: [-100, 80],
        segs: [[200, 170, 120, 400, 250, 510], [380, 620, 420, 830, 760, 850], [1100, 870, 1400, 880, 1750, 700]],
      },
      {
        fundo: mix(COR.bordo, COR.marsala, 0.35), opacidade: 0.2, wmin: 36, wmax: 100, ciclos: 1.3, fase: 0.55,
        inicio: [1500, -100],
        segs: [[1640, 100, 1640, 260, 1500, 380], [1360, 500, 1320, 620, 1430, 720], [1540, 820, 1480, 960, 1330, 1120]],
      },
      {
        // Volta no canto inferior esquerdo: entra por baixo e sai pela lateral (nada de ponta solta).
        fundo: COR.bordo, opacidade: 0.18, wmin: 34, wmax: 90, ciclos: 1.7, fase: 0.3,
        inicio: [380, 1120],
        segs: [[330, 960, 230, 880, 90, 840], [-50, 800, -90, 760, -160, 700]],
      },
    ],
  },
];

mkdirSync(SAIDA, { recursive: true });
if (PREVIAS) mkdirSync(PREVIAS, { recursive: true });

for (const cena of CENAS) {
  const camadas = [];
  for (let i = 0; i < cena.fitas.length; i++) {
    const svg = svgDaFita(cena, cena.fitas[i]);
    const nome = `${cena.nome}-${i + 1}.webp`;
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    const webp = await sharp(png).webp({ quality: 80, alphaQuality: 85, effort: 5 }).toBuffer();
    writeFileSync(join(SAIDA, nome), webp);
    console.log(nome, cena.render.join('x'), `${(webp.length / 1024).toFixed(1)} KB`);
    camadas.push({ input: png });
  }
  if (PREVIAS) {
    const [w, h] = cena.render;
    // prévia: todas as fitas sobre o nude do site, ampliada 1,5x para enxergar
    const base = await sharp({ create: { width: w, height: h, channels: 3, background: { r: NUDE[0], g: NUDE[1], b: NUDE[2] } } })
      .composite(camadas)
      .png()
      .toBuffer();
    await sharp(base).resize(Math.round(w * 1.5)).toFile(join(PREVIAS, `fitas-${cena.nome}.png`));
  }
}
