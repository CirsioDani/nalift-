// Menu de atalhos do topo:
//  - só aparece depois que a pessoa passa da Abertura;
//  - some ao rolar para baixo e reaparece ao rolar para cima;
//  - destaca em bordô (aria-current) o atalho da seção atual (a última cujo topo já passou de ~35% da altura da tela);
//  - tocar num atalho rola suavemente até a seção (CSS scroll-behavior: smooth, rolagem nativa).
// Ouvinte de rolagem passivo com requestAnimationFrame (não bloqueia a rolagem).
const menu = document.querySelector('.menu');
const abertura = document.querySelector('.abertura');

if (menu && abertura) {
  const links = Array.from(menu.querySelectorAll('.menu__link'));
  const grupos = links.map((link) =>
    (link.dataset.grupo || '')
      .split(' ')
      .map((id) => document.getElementById(id))
      .filter(Boolean),
  );

  let ultimoY = window.scrollY;
  let subindo = false;
  let agendado = false;
  // Depois de tocar num atalho, o menu recolhe e fica recolhido durante a rolagem até a seção (se rolasse para cima,
  // ele reapareceria e cobriria o título da seção). Volta ao normal quando a rolagem para de se mover.
  let rolandoPeloMenu = false;
  let fimDaRolagem = 0;

  const atualizar = () => {
    agendado = false;
    const y = window.scrollY;
    const delta = y - ultimoY;
    if (Math.abs(delta) > 6) {
      subindo = delta < 0;
      ultimoY = y;
    }

    if (rolandoPeloMenu) {
      clearTimeout(fimDaRolagem);
      fimDaRolagem = setTimeout(() => {
        rolandoPeloMenu = false;
        ultimoY = window.scrollY;
        subindo = false;
      }, 180);
    }

    const passouDaAbertura = abertura.getBoundingClientRect().bottom <= 48;
    const mostrar = passouDaAbertura && subindo && !rolandoPeloMenu;
    menu.classList.toggle('menu--visivel', mostrar);

    // Seção atual: percorre os atalhos em ordem; o último cujo grupo já passou da linha de referência vence.
    const linha = window.innerHeight * 0.35;
    let atual = -1;
    grupos.forEach((secoes, i) => {
      if (secoes.some((secao) => secao.getBoundingClientRect().top <= linha)) atual = i;
    });
    links.forEach((link, i) => {
      if (i === atual) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  };

  const agendar = () => {
    if (agendado) return;
    agendado = true;
    window.requestAnimationFrame(atualizar);
  };

  // Tocar num atalho: rola até o bloco da seção e o CENTRALIZA na tela (se couber; se for mais alto que a tela, alinha o
  // topo dele com uma folga). Sem isso o navegador alinharia o topo da seção, onde há respiro e a emenda de cor, e o
  // conteúdo ficaria baixo demais. Sem JavaScript, o link comum (#id) continua levando à seção.
  const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
  links.forEach((link) => {
    link.addEventListener('click', (evento) => {
      if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey || evento.button > 0) return;
      const alvo = document.querySelector(link.dataset.centro || '') || document.querySelector(link.getAttribute('href'));
      if (!alvo) return;
      evento.preventDefault();
      rolandoPeloMenu = true;
      menu.classList.remove('menu--visivel');
      link.blur(); // o foco no atalho reabriria o menu (focusin)
      clearTimeout(fimDaRolagem);
      fimDaRolagem = setTimeout(() => (rolandoPeloMenu = false), 1500); // segurança: se a rolagem nem começar
      const caixa = alvo.getBoundingClientRect();
      const folga = 24;
      const alturaTela = window.innerHeight;
      const topo = caixa.height <= alturaTela - folga * 2 ? caixa.top - (alturaTela - caixa.height) / 2 : caixa.top - folga;
      window.scrollTo({ top: Math.max(0, window.scrollY + topo), behavior: reduzido.matches ? 'auto' : 'smooth' });
    });
  });

  window.addEventListener('scroll', agendar, { passive: true });
  window.addEventListener('resize', agendar, { passive: true });
  // Quem navega pelo teclado e foca num atalho precisa ver o menu.
  menu.addEventListener('focusin', () => {
    if (!rolandoPeloMenu) menu.classList.add('menu--visivel');
  });
  atualizar();
}
