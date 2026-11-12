// Seção 6: "Sobre a Gabriela". Texto base em conteudo.md (estrutura da apresentação do site atual, nalinbeauty.com.br).
// Não mencionar canetas emagrecedoras nesta seção. A Gabriela não criou o NaLift: ela se aperfeiçoou no método
// (nunca dizer que criou). O nome NaLift vem de Nalin + Lift (confirmado pela Gabriela): a anotação no "Na" do nome
// mostra isso. Alternativa, se a anotação não funcionar: trocar `ligacao` por "Foi com esse olhar que me aperfeiçoei
// no NaLift, o método que leva o meu nome."
export const sobre = {
  rotulo: 'Sobre',
  titulo: 'Beleza com a segurança de quem é enfermeira.',
  // O nome é dividido para o "Na" de "Nalin" ficar em bordô e receber a anotação manuscrita (traço + "NaLift").
  nome: { antes: 'Gabriela ', na: 'Na', depois: 'lin' },
  nota: 'NaLift',
  notaLeitor: 'O nome NaLift vem de Nalin',
  cargo: 'Enfermeira Esteta',
  paragrafos: [
    'Sou enfermeira com título de especialização em Enfermagem Estética e mentora de outros profissionais da área.',
    'Uno técnica, conhecimento clínico e um olhar atento à harmonia natural do rosto para entregar resultados seguros, discretos e que valorizam a sua beleza, sem exageros.',
  ],
  ligacao: 'Foi com esse olhar que me aperfeiçoei no NaLift.',
  // Texto completo: "COREN-SP 556296 · Especialista em Enfermagem Estética". No celular, quebra em duas linhas (sem o ponto);
  // a partir do tablet, fica numa linha só, com o ponto.
  rodape: { registro: 'COREN-SP 556296', titulo: 'Especialista em Enfermagem Estética' },
  // [PROVISÓRIO] Foto provisória: será trocada por um retrato profissional.
  foto: {
    base: '/midia/sobre/gabriela',
    largura: 1080,
    altura: 1440,
    alt: 'Gabriela Nalin, enfermeira esteta',
  },
  selo: { titulo: 'Enfermeira', subtitulo: 'Esteta' },
};
