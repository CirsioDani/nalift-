// Seção 8: "Consultório e contato" (última seção) + rodapé. Texto base em conteudo.md.
// Parte 1: o consultório (vídeo ambiente + 2 fotos). Parte 2: contato (botões + cartão de informações + fechamento).
// ATENÇÃO (decisão do usuário): das fotos da inauguração, SÓ a 01 e a 13 podem aparecer no site. As outras têm convidados
// que não autorizaram. Não usar nenhuma outra.
const mensagemWhatsApp = 'Olá, Gabriela! Conheci o NaLift pelo site e gostaria de agendar uma avaliação.';

export const contato = {
  consultorio: {
    titulo: 'Meu espaço em Itirapina',
    texto: 'Um lugar pensado para você se sentir acolhida e segura do começo ao fim.',
    video: {
      src: '/midia/consultorio/consultorio.mp4',
      poster: '/midia/consultorio/consultorio-poster.webp',
      largura: 576,
      altura: 1024,
      rotulo: 'Vídeo do consultório da Gabriela em Itirapina',
    },
    // Só estas duas (3:4, inteiras, sem corte).
    fotos: [
      { base: '/midia/inauguracao/inauguracao-01', largura: 1080, altura: 1440, alt: 'O consultório da Gabriela em Itirapina: maca, lustre e a parede com o monograma GW' },
      { base: '/midia/inauguracao/inauguracao-13', largura: 1080, altura: 1440, alt: 'A recepção do consultório da Gabriela, com bancada, nichos iluminados e o monograma GW na parede' },
    ],
  },
  contato: {
    titulo: 'Vamos cuidar de você?',
    texto: 'O primeiro passo é uma avaliação, para eu conhecer o seu rosto e a sua história.',
    whatsapp: {
      rotulo: 'Agendar pelo WhatsApp',
      href: `https://wa.me/5511915522240?text=${encodeURIComponent(mensagemWhatsApp)}`,
    },
    instagram: {
      rotulo: 'Acompanhe no Instagram',
      href: 'https://www.instagram.com/gabriela.nalin/',
      usuario: '@gabriela.nalin',
    },
    // Cartão de informações: 2 colunas iguais. "principais" em tamanho normal, "detalhe" menor logo abaixo.
    // "Onde atendo": cada local tem o nome (linha principal), o endereço (menor) e, se houver, uma referência (ainda menor,
    // em itálico). Só texto: sem links do Google Maps (removidos a pedido do usuário em 12/11/2026).
    cartao: {
      onde: {
        rotulo: 'Onde atendo',
        locais: [
          {
            nome: 'Itirapina/SP',
            endereco: 'Avenida 9A, 35 · Centro',
            referencia: 'Atrás do mercado Supermax',
          },
          {
            nome: 'São Paulo/SP · Brooklin',
            endereco: 'Rua Enxovia, 472 · Sala 1207',
            referencia: '',
          },
        ],
      },
      horario: { rotulo: 'Horário', principais: ['Atendimento com hora marcada'], detalhe: 'Consulte disponibilidade' },
    },
    fechamento: 'NaLift: cuidar, sustentar e rejuvenescer, sem deixar de ser você.',
  },
  // Selo de fechamento da página: o monograma GW pequeno, depois do slogan.
  selo: { src: '/midia/logo/logo-gw.svg', largura: 1328, altura: 1008 },
  rodape: {
    // Cada parte não quebra no meio (no celular, "COREN-SP 556296" ficava partido no hífen); entre elas vai " · ".
    partes: ['Gabriela Nalin', 'Enfermeira Esteta', 'COREN-SP 556296'],
    link: { rotulo: 'nalinbeauty.com.br', href: 'https://nalinbeauty.com.br/' },
  },
};
