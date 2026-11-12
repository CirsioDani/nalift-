// Seção 7: "Dúvidas". Texto base em conteudo.md.
// Vídeo em destaque ("Bate-bola com a Gabriela") com atalhos por pergunta. O FAQ em texto ("Prefere ler?", 12 perguntas)
// foi REMOVIDO da página por decisão do usuário (11/11/2026); os textos ficam guardados no conteudo.md.
// As dicas de autocuidado continuam FORA da página (aguardando conteúdo).
export const duvidas = {
  titulo: 'Bate-bola com a Gabriela',
  // Linha de apoio (só no PC, abaixo do título, na coluna da direita).
  intro: 'Respondi as dúvidas mais comuns sobre o NaLift. Toque numa pergunta para ir direto à resposta.',
  video: {
    src: '/midia/duvidas/bate-bola.mp4',
    poster: '/midia/duvidas/bate-bola-poster.webp',
    largura: 576,
    altura: 1024,
    rotulo: 'Bate-bola com a Gabriela: ela responde às perguntas mais frequentes sobre o NaLift',
    toque: 'Toque para assistir',
  },
  // Atalhos: ao tocar, o vídeo vai para o momento (t, em segundos) e começa a tocar.
  rotuloChips: 'Ir direto para uma pergunta do vídeo',
  chips: [
    { texto: 'Pra quem é indicado?', t: 5, rotuloTempo: '0:05' },
    { texto: 'Dói?', t: 23, rotuloTempo: '0:23' },
    { texto: 'Quanto tempo dura?', t: 41, rotuloTempo: '0:41' },
    { texto: 'Substitui uma cirurgia?', t: 65, rotuloTempo: '1:05' },
    { texto: 'O resultado é imediato?', t: 86, rotuloTempo: '1:26' },
  ],
  // Fecho: "Ainda com dúvida? Me chama no WhatsApp que eu te explico tudo." (o link está em "Me chama no WhatsApp").
  cta: {
    antes: 'Ainda com dúvida? ',
    link: 'Me chama no WhatsApp',
    depois: ' que eu te explico tudo.',
    href: 'https://wa.me/5511915522240',
  },
};
