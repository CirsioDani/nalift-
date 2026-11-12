// Seção 5: "Depoimentos". Texto base em conteudo.md.
// PARTE 1 ("Quem já viveu o NaLift"): vídeos de reação e antes/depois, nesta ordem.
// Os vídeos já têm legenda embutida. Sem nomes de clientes: só entram dados do material.
export const depoimentos = {
  titulo: 'Quem já viveu o NaLift',
  instrucao: 'Toque para ouvir · deslize para ver mais',
  // No PC (≥1024px) os 4 vídeos ficam lado a lado (sem carrossel): o texto de ajuda é outro.
  instrucaoPc: 'Clique num depoimento para assistir.',
  rotuloCarrossel: 'Vídeos de depoimentos',
  videos: [
    // titulo: frase do próprio vídeo (playlist do PC). duracao: em segundos (lida do arquivo; atualizar se o vídeo mudar).
    { base: '/midia/resultados/caso-06/video-1', titulo: 'Preparada pra ver o seu antes e depois?', duracao: 69 },
    { base: '/midia/resultados/caso-07/video-1', titulo: 'E você está saindo daqui assim', duracao: 32 },
    { base: '/midia/resultados/caso-08/video-1', titulo: 'Preparada?', duracao: 40 },
    { base: '/midia/resultados/caso-04/video-1', titulo: 'Isso é Método NaLift', duracao: 23 },
  ].map((v, i, todos) => ({
    ...v,
    rotuloDuracao: `${Math.floor(v.duracao / 60)}:${String(v.duracao % 60).padStart(2, '0')}`,
    src: `${v.base}.mp4`,
    poster: `${v.base}-poster.webp`,
    largura: 720,
    altura: 1280,
    alt: `Vídeo ${i + 1} de ${todos.length}`,
  })),
};

// PARTE 2 ("Veja de perto"): extra que abre por botão ("Ver mais"), numa gaveta (celular) ou janela (PC).
// Três vídeos 9:16 inteiros, um por vez, nesta ordem, com legenda curta.
export const casosComentados = {
  botao: 'Ver mais',
  titulo: 'Veja de perto',
  toque: 'Toque para assistir',
  videos: [
    { base: '/midia/resultados/caso-05/video-1', legenda: 'Caso pós-bariátrica, comentado pela Gabriela' },
    { base: '/midia/resultados/caso-04/video-2', legenda: 'Resultado comentado pela Gabriela' },
    { base: '/midia/resultados/caso-01/video-1', legenda: 'Antes e depois' },
  ].map((v) => ({
    ...v,
    src: `${v.base}.mp4`,
    poster: `${v.base}-poster.webp`,
    largura: 720,
    altura: 1280,
  })),
};
