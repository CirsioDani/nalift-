// Botão flutuante do WhatsApp: aparece (fade) depois da Abertura e some quando a seção 8 (Contato) ou o rodapé
// estão visíveis. IntersectionObserver (sem ouvinte de rolagem).
const botao = document.querySelector('.zap');
const abertura = document.querySelector('.abertura');
const contato = document.getElementById('contato');
const rodape = document.querySelector('.rodape');

if (botao && abertura && 'IntersectionObserver' in window) {
  let aberturaAcima = false; // já passou da Abertura (ela ficou para cima da tela)
  let contatoVisivel = false;
  let rodapeVisivel = false;

  const atualizar = () => {
    const mostrar = aberturaAcima && !contatoVisivel && !rodapeVisivel;
    botao.classList.toggle('zap--visivel', mostrar);
    if (mostrar) botao.removeAttribute('tabindex');
    else botao.setAttribute('tabindex', '-1'); // escondido: fora da ordem do teclado
    botao.setAttribute('aria-hidden', mostrar ? 'false' : 'true');
  };

  new IntersectionObserver(
    ([entrada]) => {
      aberturaAcima = !entrada.isIntersecting && entrada.boundingClientRect.bottom <= 0;
      atualizar();
    },
    { threshold: 0 },
  ).observe(abertura);

  if (contato) {
    new IntersectionObserver(
      ([entrada]) => {
        contatoVisivel = entrada.isIntersecting;
        atualizar();
      },
      { threshold: 0 },
    ).observe(contato);
  }

  if (rodape) {
    new IntersectionObserver(
      ([entrada]) => {
        rodapeVisivel = entrada.isIntersecting;
        atualizar();
      },
      { threshold: 0 },
    ).observe(rodape);
  }

  atualizar();
}
