// Carrossel em profundidade (cartas empilhadas em perspectiva) em JavaScript puro.
// Referência visual: componente <DepthCarousel /> do React Bits (recriado sem React e sem GSAP:
// a animação usa requestAnimationFrame com a curva "power3.out").
// Adaptações para o site:
// - sem captura da rodinha do mouse (a página rola normalmente com o mouse sobre o carrossel);
// - o conjunto de cartas é centralizado no quadro (no original o leque ficava deslocado para um lado);
// - setas e pontinhos ficam numa linha abaixo das cartas (não cobrem o vídeo), com áreas de toque de 44px;
// - cartas sem filtro de brilho (o escurecimento vem da camada `tint`); desfoque só se pedido;
// - ganchos aoFocar / aoDesfocar / aoCliqueNoFoco para o vídeo viver só na carta da frente;
// - clique logo após arrastar não conta como toque.

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const el = (tag, className, attrs) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (attrs) for (const k of Object.keys(attrs)) node.setAttribute(k, attrs[k]);
  return node;
};

/**
 * @param {HTMLElement} raiz
 * @param {Array<{poster:string, alt?:string}>} itens  cada carta mostra o `poster`
 * @param {object} opcoes
 *   Numéricos aceitam função (retânguloDoQuadro) => número: cardWidth, spread, depth, visibleCards, blur.
 */
export function criarCarrosselProfundidade(raiz, itens, opcoes = {}) {
  const o = {
    aspectRatio: 9 / 16, // largura / altura da carta
    cardWidth: null, // padrão: preenche a altura do quadro
    radius: 18,
    depth: 200,
    spread: 56,
    tilt: 18,
    tiltDirection: 'right',
    perspective: 1400,
    visibleCards: 3,
    falloff: 0.22,
    blur: 0,
    duration: 700,
    loop: true,
    showControls: true,
    showIndicators: true,
    ariaLabel: 'Carrossel',
    rotuloAnterior: 'Anterior',
    rotuloProximo: 'Próximo',
    rotuloIr: (i) => `Ir para o item ${i + 1}`,
    rotuloCartao: (i, n) => `${i + 1} de ${n}`,
    onChange: null,
    aoFocar: null,
    aoDesfocar: null,
    aoCliqueNoFoco: null,
    ...opcoes,
  };

  const lista = itens;
  const count = lista.length;
  if (!count) return null;
  const reduzido = Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const num = (v, rect) => (typeof v === 'function' ? v(rect) : v);
  const dir = o.tiltDirection === 'left' ? -1 : 1;

  // ---------- DOM ----------
  raiz.classList.add('depth-carousel');
  raiz.setAttribute('role', 'group');
  raiz.setAttribute('aria-roledescription', 'carousel');
  raiz.setAttribute('aria-label', o.ariaLabel);
  raiz.tabIndex = 0;
  raiz.style.setProperty('--dc-perspective', `${o.perspective}px`);
  raiz.style.setProperty('--dc-radius', `${o.radius}px`);

  const viewport = el('div', 'depth-carousel__viewport');
  const stage = el('div', 'depth-carousel__stage');
  viewport.appendChild(stage);
  raiz.appendChild(viewport);

  const cards = lista.map((item, i) => {
    const card = el('div', 'depth-carousel__card', {
      'aria-roledescription': 'slide',
      'aria-label': o.rotuloCartao(i, count),
      'data-dc-index': String(i),
    });
    const img = el('img', 'depth-carousel__img');
    img.src = item.poster;
    img.alt = item.alt || '';
    img.draggable = false;
    img.decoding = 'async';
    card.appendChild(img);
    card.appendChild(el('span', 'depth-carousel__tint'));
    stage.appendChild(card);
    return card;
  });

  const tints = cards.map((c) => c.querySelector('.depth-carousel__tint'));

  let btnAnterior = null;
  let btnProximo = null;
  let dots = [];
  if ((o.showControls || o.showIndicators) && count > 1) {
    const controles = el('div', 'depth-carousel__controls');
    if (o.showControls) {
      btnAnterior = el('button', 'depth-carousel__arrow', { type: 'button', 'aria-label': o.rotuloAnterior });
      btnAnterior.innerHTML =
        '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      controles.appendChild(btnAnterior);
    }
    if (o.showIndicators) {
      const grupo = el('div', 'depth-carousel__dots', { role: 'tablist', 'aria-label': o.ariaLabel });
      dots = lista.map((_, i) => {
        const b = el('button', 'depth-carousel__dot', {
          type: 'button',
          role: 'tab',
          'aria-selected': i === 0 ? 'true' : 'false',
          'aria-label': o.rotuloIr(i),
        });
        grupo.appendChild(b);
        return b;
      });
      controles.appendChild(grupo);
    }
    if (o.showControls) {
      btnProximo = el('button', 'depth-carousel__arrow', { type: 'button', 'aria-label': o.rotuloProximo });
      btnProximo.innerHTML =
        '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      controles.appendChild(btnProximo);
    }
    raiz.appendChild(controles);
  }

  // ---------- Estado e configuração ----------
  let pos = 0;
  let foco = 0;
  let anim = null;
  let escala = 1;
  let deslocamento = 0;
  let cfg = { depth: o.depth, spread: o.spread, visible: o.visibleCards, blur: o.blur, cardW: 200, cardH: 355 };
  let arrasto = null;
  let suprimirClique = false;

  const configurar = () => {
    const rect = viewport.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const depth = num(o.depth, rect);
    const spread = num(o.spread, rect);
    const visible = num(o.visibleCards, rect);
    const blur = num(o.blur, rect);
    const pedida = o.cardWidth != null ? num(o.cardWidth, rect) : rect.height * 0.96 * o.aspectRatio;
    const cardW = Math.max(60, pedida);
    const cardH = cardW / o.aspectRatio;
    // Quantos passos para trás aparecem em repouso. Com poucas cartas em volta (loop), a mais distante que de
    // fato aparece fica em floor(n/2) passos. A carta seguinte (alcance + 1) é o "vaga" escondida: é por
    // onde as cartas entram na fila (aparecendo aos poucos) e saem dela.
    const alcance = Math.min(visible, o.loop ? Math.floor(count / 2) : count - 1);
    cfg = { depth, spread, visible, blur, cardW, cardH, alcance };

    // Extensões do conjunto (cartas de trás ficam menores pela perspectiva): serve para centralizar e caber.
    const P = o.perspective;
    let direita = cardW / 2;
    for (let d = 0; d <= alcance; d += 0.5) {
      const k = P / (P + depth * d);
      direita = Math.max(direita, (spread * d + cardW / 2) * k);
    }
    const esquerda = cardW / 2;
    escala = clamp((rect.width * 0.94) / (direita + esquerda), 0.4, 1);
    deslocamento = -dir * ((direita - esquerda) / 2);


    cards.forEach((c) => {
      c.style.width = `${cardW}px`;
      c.style.height = `${cardH}px`;
    });
    return true;
  };

  // ---------- Posicionamento das cartas ----------
  const layout = (p) => {
    const n = count;
    for (let i = 0; i < n; i++) {
      const card = cards[i];
      let d = i - p;
      if (o.loop && n > 1) {
        d = ((d % n) + n) % n;
        // O ponto em que a carta "vira" de lado fica na vaga escondida (alcance + 1), onde a opacidade é 0:
        // assim ela some por um lado e reaparece no fundo da fila sem nenhum salto visível.
        if (d > cfg.alcance + 1) d -= n;
      }
      const atras = Math.max(0, d);
      const tz = -cfg.depth * d;
      const tx = dir * cfg.spread * d + deslocamento;
      const ry = dir * o.tilt * clamp(d, 0, 1);

      // Saindo (d < 0): apaga indo para a frente. Entrando no fundo (d além do alcance): aparece aos poucos.
      let opacidade = 1;
      if (d < 0) opacidade = Math.max(0, 1 + d);
      else if (d > cfg.alcance) opacidade = Math.max(0, cfg.alcance + 1 - d);
      const visivel = opacidade > 0.001;
      // Só recebem toque as cartas na fila (a que está saindo ou entrando não pega o toque).
      const naFila = d >= -0.05 && d <= cfg.alcance + 0.05;

      card.style.transform = `translate(-50%, -50%) scale(${escala}) translateX(${tx.toFixed(2)}px) translateZ(${tz.toFixed(2)}px) rotateY(${ry.toFixed(3)}deg)`;
      card.style.opacity = opacidade.toFixed(3);
      card.style.zIndex = String(Math.round(2000 - d * 20));
      card.style.pointerEvents = naFila && opacidade > 0.05 ? 'auto' : 'none';

      const desfoque = cfg.blur > 0 ? Math.min(cfg.blur, (atras / Math.max(1, cfg.visible)) * cfg.blur) : 0;
      card.style.filter = desfoque > 0.05 ? `blur(${desfoque.toFixed(2)}px)` : '';

      tints[i].style.opacity = clamp(atras * o.falloff * 1.25, 0, 0.86).toFixed(3);
    }
  };

  const normalizar = () => {
    pos = ((pos % count) + count) % count;
  };

  const animarPara = (alvo, animar) => {
    if (anim) cancelAnimationFrame(anim.raf);
    anim = null;
    const duracao = animar && !reduzido ? o.duration : 0;
    if (duracao === 0) {
      pos = alvo;
      normalizar();
      layout(pos);
      return;
    }
    const de = pos;
    const inicio = performance.now();
    anim = { raf: 0 };
    const passo = (agora) => {
      const t = clamp((agora - inicio) / duracao, 0, 1);
      const e = 1 - Math.pow(1 - t, 3); // power3.out
      pos = de + (alvo - de) * e;
      layout(pos);
      if (t < 1) {
        anim.raf = requestAnimationFrame(passo);
      } else {
        normalizar();
        layout(pos);
        anim = null;
      }
    };
    anim.raf = requestAnimationFrame(passo);
  };

  // ---------- Foco ----------
  const marcarFoco = (idx, anterior) => {
    cards.forEach((c, i) => c.setAttribute('aria-hidden', i === idx ? 'false' : 'true'));
    dots.forEach((b, i) => {
      b.setAttribute('aria-selected', i === idx ? 'true' : 'false');
      b.classList.toggle('is-active', i === idx);
    });
    if (anterior !== idx && anterior != null && o.aoDesfocar) o.aoDesfocar(anterior, cards[anterior]);
    if (anterior !== idx && o.aoFocar) o.aoFocar(idx, cards[idx]);
    if (anterior !== idx && o.onChange) o.onChange(idx, lista[idx]);
  };

  const irPara = (indiceBruto, animar = true) => {
    const n = count;
    const idx = o.loop ? ((indiceBruto % n) + n) % n : clamp(indiceBruto, 0, n - 1);
    let delta = idx - pos;
    if (o.loop && n > 1) {
      delta = ((delta % n) + n) % n;
      if (delta > n / 2) delta -= n;
    }
    animarPara(pos + delta, animar);
    if (idx !== foco) {
      const anterior = foco;
      foco = idx;
      marcarFoco(idx, anterior);
    }
  };

  const andar = (passo) => irPara(foco + passo, true);

  // ---------- Eventos ----------
  const passoPx = () => Math.max(cfg.cardW * 0.55 * escala, 40);

  const onPointerDown = (e) => {
    if (count < 2 || e.button > 0) return;
    if (e.target.closest && e.target.closest('button')) return;
    suprimirClique = false;
    // Não cancela a animação aqui: um simples toque (por exemplo, para dar play logo depois de trocar de
    // vídeo) não pode parar o carrossel no meio do caminho. A animação só é interrompida se virar arraste.
    arrasto = { x: e.clientX, inicio: pos, ultimoX: e.clientX, ultimoT: performance.now(), v: 0, moveu: false, id: e.pointerId };
  };

  const onPointerMove = (e) => {
    if (!arrasto || arrasto.id !== e.pointerId) return;
    const dx = e.clientX - arrasto.x;
    if (!arrasto.moveu && Math.abs(dx) > 4) {
      arrasto.moveu = true;
      // Virou arraste: agora sim interrompe a animação e segue o dedo a partir de onde as cartas estão.
      if (anim) {
        cancelAnimationFrame(anim.raf);
        anim = null;
      }
      arrasto.inicio = pos;
      arrasto.x = e.clientX;
      arrasto.ultimoX = e.clientX;
      arrasto.ultimoT = performance.now();
      try {
        raiz.setPointerCapture(arrasto.id);
      } catch (erro) {
        /* sem captura: segue */
      }
    }
    if (!arrasto.moveu) return;
    const agora = performance.now();
    const dt = Math.max(agora - arrasto.ultimoT, 1);
    arrasto.v = (e.clientX - arrasto.ultimoX) / dt;
    arrasto.ultimoX = e.clientX;
    arrasto.ultimoT = agora;
    pos = arrasto.inicio - (e.clientX - arrasto.x) / passoPx();
    layout(pos);
  };

  const onPointerEnd = (e) => {
    const a = arrasto;
    if (!a || a.id !== e.pointerId) return;
    arrasto = null;
    if (!a.moveu) return;
    suprimirClique = true;
    // Um arraste troca no máximo um vídeo para cada lado, por mais rápido que seja.
    const projetado = pos - (a.v * 180) / passoPx();
    irPara(Math.round(clamp(projetado, a.inicio - 1, a.inicio + 1)), true);
  };

  const onClick = (e) => {
    if (suprimirClique) {
      suprimirClique = false;
      return;
    }
    const card = e.target.closest && e.target.closest('.depth-carousel__card');
    if (!card || !viewport.contains(card)) return;
    const i = Number(card.getAttribute('data-dc-index'));
    if (i === foco) {
      if (o.aoCliqueNoFoco) o.aoCliqueNoFoco(i, card);
    } else {
      irPara(i, true);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') andar(-1);
    else if (e.key === 'ArrowRight') andar(1);
    else if ((e.key === 'Enter' || e.key === ' ') && e.target === raiz && o.aoCliqueNoFoco) o.aoCliqueNoFoco(foco, cards[foco]);
    else return;
    e.preventDefault();
  };

  raiz.addEventListener('pointerdown', onPointerDown);
  raiz.addEventListener('pointermove', onPointerMove);
  raiz.addEventListener('pointerup', onPointerEnd);
  raiz.addEventListener('pointercancel', onPointerEnd);
  raiz.addEventListener('click', onClick);
  raiz.addEventListener('keydown', onKeyDown);
  if (btnAnterior) btnAnterior.addEventListener('click', () => andar(-1));
  if (btnProximo) btnProximo.addEventListener('click', () => andar(1));
  dots.forEach((b, i) => b.addEventListener('click', () => irPara(i, true)));

  const resize = new ResizeObserver(() => {
    if (configurar()) layout(pos);
  });
  resize.observe(viewport);

  // ---------- Início ----------
  configurar();
  layout(pos);
  marcarFoco(0, null); // já chama aoFocar e onChange para a primeira carta

  return {
    destroy() {
      if (anim) cancelAnimationFrame(anim.raf);
      resize.disconnect();
      raiz.removeEventListener('pointerdown', onPointerDown);
      raiz.removeEventListener('pointermove', onPointerMove);
      raiz.removeEventListener('pointerup', onPointerEnd);
      raiz.removeEventListener('pointercancel', onPointerEnd);
      raiz.removeEventListener('click', onClick);
      raiz.removeEventListener('keydown', onKeyDown);
    },
    irPara,
    andar,
    indiceFoco: () => foco,
    cartas: () => cards,
  };
}
