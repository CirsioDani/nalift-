// Seção 3. Com JavaScript:
// - PC: lista numerada, um ponto ativo por vez; o rosto acende a região do ponto ativo.
//   No PC todos os <details> ficam "abertos" (o texto sempre renderizado) e só o ponto ativo
//   (atributo data-ativo) expande: assim o CSS anima a altura do texto ao abrir e ao fechar.
// - Celular (< 1024px): painel de uma tela com 4 botões redondos; também troca deslizando o texto.
//   Aqui só o ponto ativo fica aberto (open), como antes.
// Sem este script, os 4 pontos ficam abertos (conteúdo todo visível) e o rosto mostra o ponto 1.
const secao = document.querySelector('.metodo');

if (secao) {
  const pontos = Array.from(secao.querySelectorAll('details.ponto'));
  const botoes = Array.from(secao.querySelectorAll('.metodo__botao'));
  const resumos = Array.from(secao.querySelectorAll('details.ponto summary'));
  const legenda = secao.querySelector('.metodo__legenda');
  const texto = secao.querySelector('.metodo__pontos');
  const celular = window.matchMedia('(max-width: 63.999rem)');
  let atual = 0;

  const indiceAtivo = () => pontos.findIndex((p) => p.hasAttribute('data-ativo'));

  const atualizar = () => {
    const ativo = indiceAtivo();
    secao.dataset.ativa = ativo >= 0 ? String(ativo + 1) : '';
    if (ativo >= 0) atual = ativo;

    if (legenda) {
      const titulo = ativo >= 0 ? pontos[ativo].querySelector('.ponto__titulo') : null;
      legenda.textContent = titulo ? `0${ativo + 1} · ${titulo.textContent}` : '';
    }

    botoes.forEach((b, i) => {
      b.setAttribute('aria-pressed', i === ativo ? 'true' : 'false');
    });
    resumos.forEach((s, i) => {
      s.setAttribute('aria-expanded', i === ativo ? 'true' : 'false');
    });
  };

  // Define o ponto ativo (sempre um) e ajusta o DOM conforme o modo:
  // celular: só o ativo fica `open`; PC: todos ficam `open` e só o ativo tem `data-ativo`.
  const definirAtivo = (i) => {
    pontos.forEach((p, k) => {
      if (k === i) p.setAttribute('data-ativo', '');
      else p.removeAttribute('data-ativo');
      p.open = celular.matches ? k === i : true;
    });
    atualizar();
  };

  // Celular: troca de ponto (botões e deslize), com a direção da animação de entrada.
  const ir = (i, direcao) => {
    if (i < 0 || i >= pontos.length || i === atual) return;
    secao.dataset.direcao = direcao || (i > atual ? 'prox' : 'ant');
    definirAtivo(i);
  };

  // Reserva a altura do MAIOR caso, medida de verdade com clones invisíveis na largura real:
  // - Celular: a área do texto tem a altura do maior dos 4 textos (o painel não muda de tamanho
  //   nem deixa vazio embaixo).
  // - PC: a lista tem a altura que teria com o ponto de texto mais longo aberto. Assim, ao trocar de
  //   ponto, a área de duas colunas não muda de altura e nada abaixo dela se move.
  const medirTexto = () => {
    if (!texto) return;
    texto.style.height = '';
    texto.style.minHeight = '';

    const largura = texto.clientWidth;
    const medir = (montar) => {
      const caixa = texto.cloneNode(true);
      caixa.removeAttribute('id');
      caixa.setAttribute('aria-hidden', 'true');
      caixa.style.cssText = `position:absolute;left:-9999px;top:0;visibility:hidden;pointer-events:none;height:auto;width:${largura}px`;
      montar(caixa);
      secao.appendChild(caixa);
      const altura = caixa.offsetHeight;
      caixa.remove();
      return altura;
    };
    const copias = (caixa) => Array.from(caixa.querySelectorAll('details.ponto'));

    if (celular.matches) {
      // O painel mostra um ponto por vez (cada clone aberto sozinho, como no painel).
      const caixa = texto.cloneNode(false);
      caixa.removeAttribute('id');
      caixa.setAttribute('aria-hidden', 'true');
      caixa.style.cssText = `position:absolute;left:-9999px;top:0;visibility:hidden;pointer-events:none;height:auto;width:${largura}px`;
      pontos.forEach((p) => {
        const copia = p.cloneNode(true);
        copia.setAttribute('open', '');
        caixa.appendChild(copia);
      });
      secao.appendChild(caixa);
      const maior = Math.max(...Array.from(caixa.children, (c) => c.offsetHeight));
      caixa.remove();
      if (maior > 0) texto.style.height = `${Math.ceil(maior)}px`;
      return;
    }

    // PC: mede a lista inteira com cada ponto ativo (os outros recolhidos) e guarda a maior.
    const maior = Math.max(
      ...pontos.map((_, ativo) =>
        medir((caixa) => {
          copias(caixa).forEach((copia, k) => {
            copia.setAttribute('open', '');
            if (k === ativo) copia.setAttribute('data-ativo', '');
            else copia.removeAttribute('data-ativo');
          });
        }),
      ),
    );
    if (maior > 0) texto.style.minHeight = `${Math.ceil(maior)}px`;
  };

  secao.classList.add('metodo--interativo');
  pontos[0].setAttribute('data-ativo', ''); // começa no ponto 01

  // Clique no título do ponto.
  // - Celular: o título é só um cabeçalho (os botões trocam o ponto); tocar nele não faz nada.
  // - PC: ativa o ponto. Tocar no que já está aberto não o fecha: sempre há um ponto aberto.
  //   Nunca deixa o <details> alternar sozinho, para o texto continuar renderizado e a altura animar.
  secao.addEventListener('click', (e) => {
    const resumo = e.target.closest && e.target.closest('details.ponto summary');
    if (!resumo) return;
    e.preventDefault();
    if (celular.matches) return;
    const i = resumos.indexOf(resumo);
    if (i !== indiceAtivo()) definirAtivo(i);
  });

  // Botões 01 a 04 (celular), com setas do teclado.
  botoes.forEach((b, i) => {
    b.addEventListener('click', () => ir(i));
    b.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const prox = e.key === 'ArrowRight' ? i + 1 : i - 1;
        if (botoes[prox]) {
          ir(prox);
          botoes[prox].focus();
          e.preventDefault();
        }
      }
    });
  });

  // Deslizar para os lados sobre o texto troca de ponto (celular). Só ouvintes passivos, sem
  // preventDefault: se o gesto for mais vertical que horizontal, a página rola normalmente
  // (o CSS da área tem touch-action: pan-y).
  if (texto) {
    let x0 = null;
    let y0 = null;
    texto.addEventListener(
      'touchstart',
      (e) => {
        const t = e.changedTouches[0];
        x0 = t.clientX;
        y0 = t.clientY;
      },
      { passive: true },
    );
    texto.addEventListener(
      'touchcancel',
      () => {
        x0 = null;
      },
      { passive: true },
    );
    texto.addEventListener(
      'touchend',
      (e) => {
        if (x0 === null || !celular.matches) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - x0;
        const dy = t.clientY - y0;
        x0 = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          ir(atual + (dx < 0 ? 1 : -1), dx < 0 ? 'prox' : 'ant');
        }
      },
      { passive: true },
    );
  }

  // A medida (com clones invisíveis) força o layout da página inteira: só roda quando a seção está perto da tela
  // (1200px) e, se algo mudar antes disso (tela girada, fontes carregadas), fica pendente para quando chegar.
  let perto = !('IntersectionObserver' in window);
  let pendente = true;
  const agendarMedida = () => {
    if (perto) {
      pendente = false;
      medirTexto();
    } else {
      pendente = true;
    }
  };
  if (!perto) {
    new IntersectionObserver(
      ([entrada]) => {
        perto = entrada.isIntersecting;
        if (perto && pendente) agendarMedida();
      },
      { rootMargin: '1200px 0px' },
    ).observe(secao);
  }

  // Ao mudar entre celular e PC (girar a tela, redimensionar): ajusta foco, estado e altura.
  const ajustarModo = () => {
    resumos.forEach((s) => {
      s.tabIndex = celular.matches ? -1 : 0;
    });
    const i = indiceAtivo();
    // Em qualquer modo sempre há um ponto ativo.
    definirAtivo(i >= 0 ? i : atual);
    agendarMedida();
  };
  celular.addEventListener('change', ajustarModo);

  // Mede de novo quando a largura muda ou as fontes terminam de carregar.
  let larguraAnterior = window.innerWidth;
  window.addEventListener(
    'resize',
    () => {
      if (window.innerWidth !== larguraAnterior) {
        larguraAnterior = window.innerWidth;
        agendarMedida();
      }
    },
    { passive: true },
  );
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(agendarMedida);

  ajustarModo();
}
