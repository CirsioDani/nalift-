// Seção 4: "Resultados". Texto base em conteudo.md.
// Os casos em destaque, escolhidos pela Gabriela, nesta ordem. As fotos são montagens
// antes|depois e aparecem inteiras, sem corte.
// 4º caso: IMG_2844 (Moça N6) e 5º caso: IMG_0186 (Moça N8, pasta caso-08), ambas montagens quadradas.
// Foram encaixadas num quadro 4:5 SEM cortar a foto (extensão desfocada em cima e embaixo), por
// scripts/ajustar-foto-4x5.mjs.
const casosEmDestaque = [
  { base: '/midia/resultados/caso-04/foto-1', largura: 1080, altura: 1352, legenda: '' },
  { base: '/midia/resultados/caso-02/foto-1', largura: 1080, altura: 1351, legenda: '' },
  { base: '/midia/resultados/caso-01/foto-2', largura: 1080, altura: 1352, legenda: '' },
  { base: '/midia/resultados/caso-06/foto-2-4x5', largura: 1080, altura: 1350, legenda: '' },
  { base: '/midia/resultados/caso-08/img-0186-4x5', largura: 1080, altura: 1350, legenda: '' },
];

export const resultados = {
  titulo: 'Continua sendo você',
  texto: 'Quero que você se olhe no espelho e continue se reconhecendo.',
  rotuloCarrossel: `Antes e depois, ${casosEmDestaque.length} casos`,
  casos: casosEmDestaque.map((c, i, todos) => ({
    ...c,
    titulo: 'Antes e depois',
    alt: `Antes e depois de uma cliente, lado a lado (caso ${i + 1} de ${todos.length})`,
    srcset: `${c.base}-640.webp 640w, ${c.base}-1080.webp 1080w, ${c.base}-1600.webp 1600w`,
    jpg: `${c.base}-1080.jpg`,
    webp: `${c.base}-1080.webp`,
  })),
};
