// Abertura: (1) pausa os loops (fundo que respira, setinha) quando a seção sai da tela e
// (2) efeito ao rolar: o conteúdo sobe mais devagar que a página e vai sumindo (parallax leve + fade).
// Só transform e opacity, com requestAnimationFrame e ouvinte de rolagem passivo (não bloqueia a rolagem).
// Com prefers-reduced-motion: nada disso roda (tudo fica parado e pronto). Sem JavaScript: tudo estático.
const secao = document.querySelector('.abertura');
const conteudo = secao && secao.querySelector('.abertura__centro');
const rolar = secao && secao.querySelector('.abertura__rolar');

if (secao && conteudo) {
  const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visivel = true;
  let altura = secao.offsetHeight;
  let agendado = false;

  const limpar = () => {
    conteudo.style.transform = '';
    conteudo.style.opacity = '';
    conteudo.style.willChange = '';
    if (rolar) rolar.style.opacity = '';
  };

  const aplicar = () => {
    agendado = false;
    if (reduzido.matches || !visivel) return;
    const y = Math.max(0, window.scrollY); // ignora o "elástico" negativo do iOS
    if (y === 0) {
      limpar();
      return;
    }
    // Sobe a ~70% da velocidade da página (desloca para baixo 30% do quanto rolou) e some entre
    // ~12% e ~80% da altura da seção, até a seção 2 assumir.
    const fade = Math.min(1, Math.max(0, (y - altura * 0.12) / (altura * 0.68)));
    conteudo.style.willChange = 'transform, opacity';
    conteudo.style.transform = `translate3d(0, ${(y * 0.3).toFixed(1)}px, 0)`;
    conteudo.style.opacity = (1 - fade).toFixed(3);
    if (rolar) rolar.style.opacity = (1 - Math.min(1, y / (altura * 0.2))).toFixed(3);
  };

  const agendar = () => {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(aplicar);
  };

  // Seção fora da tela: pausa os loops por CSS (classe) e para de calcular.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      ([entrada]) => {
        visivel = entrada.isIntersecting;
        secao.classList.toggle('abertura--fora', !visivel);
        if (visivel) agendar();
      },
      { threshold: 0 },
    ).observe(secao);
  }

  if (!reduzido.matches) {
    window.addEventListener('scroll', agendar, { passive: true });
    window.addEventListener(
      'resize',
      () => {
        altura = secao.offsetHeight;
        agendar();
      },
      { passive: true },
    );
  }

  // Se a pessoa ligar "reduzir movimento" com a página aberta, desfaz tudo.
  reduzido.addEventListener('change', () => {
    if (reduzido.matches) limpar();
    else agendar();
  });

  agendar();
}
