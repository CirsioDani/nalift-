// Sistema único de entrada ao rolar (data-reveal). Veja os atributos e o ritmo em src/styles/global.css.
//   subir | zoom      : o próprio elemento anima.
//   escalonado        : no contêiner; cada filho direto entra com 80ms de diferença (índice em --i).
//   gatilho           : só marca .revelado (para efeitos próprios), sem animar.
// Cada elemento entra uma única vez, quando ~15% dele aparece na tela. Só transform e opacity (CSS).
// Sem JavaScript, com prefers-reduced-motion ou se este script não carregar: tudo já aparece visível.
const TEMPO = 600; // = --reveal-tempo
const ESCALONADO = 80; // = --reveal-escalonado
const LIMIAR = 0.15;

document.documentElement.classList.add('js-ok'); // avisa o Base.astro que o script carregou

const itens = Array.from(document.querySelectorAll('[data-reveal]'));
const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Índice de cada filho, para o atraso do "escalonado".
itens.forEach((el) => {
  if (el.dataset.reveal === 'escalonado') {
    Array.from(el.children).forEach((filho, i) => filho.style.setProperty('--i', String(i)));
  }
});

if (semMovimento || !('IntersectionObserver' in window)) {
  itens.forEach((el) => el.classList.add('revelado'));
} else {
  // Depois que a entrada termina, o elemento deixa de ser "reveal": volta a ter só os estilos e as
  // transições próprios (por exemplo, o hover de um card).
  const finalizar = (el) => {
    if (el.dataset.reveal === 'gatilho') return;
    const filhos = el.dataset.reveal === 'escalonado' ? el.children.length : 1;
    const espera = TEMPO + Math.max(0, filhos - 1) * ESCALONADO + 120;
    window.setTimeout(() => {
      el.removeAttribute('data-reveal');
      el.removeAttribute('data-reveal-efeito');
    }, espera);
  };

  // Um observador por limiar: elementos muito altos (mais de ~6 telas) nunca chegariam a 15% visíveis.
  const observadores = new Map();
  const observadorPara = (limiar) => {
    if (!observadores.has(limiar)) {
      const obs = new IntersectionObserver(
        (entradas) => {
          entradas.forEach((entrada) => {
            // A primeira chamada informa o estado atual, mesmo abaixo do limiar: só vale a partir dele.
            if (!entrada.isIntersecting || entrada.intersectionRatio < limiar - 0.01) return;
            const el = entrada.target;
            el.classList.add('revelado');
            obs.unobserve(el);
            finalizar(el);
          });
        },
        { threshold: limiar },
      );
      observadores.set(limiar, obs);
    }
    return observadores.get(limiar);
  };

  // Modo "filhos" (data-reveal="escalonado" + data-reveal-observar="filhos"): cada filho é observado sozinho.
  // Serve para carrosséis de cards deslizáveis: o próximo card entra (sobe com fade) quando aparece na tela;
  // os que aparecem juntos entram com 80ms de diferença (índice dentro do grupo que entrou junto).
  // data-reveal-limiar no contêiner ajusta quanto do card precisa aparecer (ex.: 0.01 revela o card que
  // só espia pela borda, mantendo a dica de que dá para deslizar).
  const observarFilhos = (contenedor) => {
    const filhos = Array.from(contenedor.children);
    const limiar = parseFloat(contenedor.dataset.revealLimiar) || LIMIAR;
    let pendentes = filhos.length;
    let obs = null;

    // Revela os filhos indicados (já em ordem de documento), com 80ms de diferença entre os que entram juntos.
    const revelar = (lista) => {
      lista.forEach((filho, i) => {
        if (filho.classList.contains('revelado')) return;
        filho.style.setProperty('--i', String(i)); // atraso só entre os que entram juntos
        filho.classList.add('revelado');
        if (obs) obs.unobserve(filho);
        window.setTimeout(
          () => {
            pendentes -= 1;
            if (pendentes === 0) {
              contenedor.removeAttribute('data-reveal');
              contenedor.removeAttribute('data-reveal-observar');
              contenedor.removeAttribute('data-reveal-limiar');
              contenedor.removeAttribute('data-reveal-efeito');
            }
          },
          TEMPO + i * ESCALONADO + 120,
        );
      });
    };

    obs = new IntersectionObserver(
      (entradas) => {
        const entrando = entradas
          .filter((e) => e.isIntersecting && e.intersectionRatio >= limiar - 0.01)
          .sort((a, b) => (a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
          .map((e) => e.target);
        revelar(entrando);
      },
      { threshold: [0, limiar] },
    );
    filhos.forEach((filho) => obs.observe(filho));

    // Reserva: ao deslizar, confere também pela posição quais cards já aparecem na área visível do carrossel,
    // para nunca sobrar um card escondido caso o observador não avise (por exemplo, o último do carrossel).
    let conferindo = false;
    const conferir = () => {
      conferindo = false;
      const area = contenedor.getBoundingClientRect();
      const esq = Math.max(area.left, 0);
      const dir = Math.min(area.right, window.innerWidth);
      const visiveis = filhos.filter((filho) => {
        if (filho.classList.contains('revelado')) return false;
        const r = filho.getBoundingClientRect();
        const largura = Math.min(r.right, dir) - Math.max(r.left, esq);
        return largura > 0 && largura / r.width >= Math.max(limiar, 0.01);
      });
      revelar(visiveis);
    };
    contenedor.addEventListener(
      'scroll',
      () => {
        if (conferindo) return;
        conferindo = true;
        window.requestAnimationFrame(conferir);
      },
      { passive: true },
    );
  };

  itens.forEach((el) => {
    if (el.dataset.reveal === 'escalonado' && el.dataset.revealObservar === 'filhos') {
      observarFilhos(el);
      return;
    }
    const alto = el.offsetHeight > (window.innerHeight / LIMIAR) * 0.9;
    observadorPara(alto ? 0.02 : LIMIAR).observe(el);
  });
}
