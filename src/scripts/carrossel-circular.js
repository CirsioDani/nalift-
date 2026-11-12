// Carrossel circular 3D em JavaScript puro.
// Porte fiel do componente <CircularCarousel /> do React Bits (versão JS + CSS), sem React.
// O motor (física, intro, arraste com inércia, snap, parallax, tiles curvos) é o mesmo;
// só a montagem do HTML, que no React era JSX, foi reescrita com o DOM.
// Fora do porte: a troca animada de lista (prop `items` mudando), que só existe para listas dinâmicas.

const PRESETS = {
  cylinder: { axis: 'y', tilt: -5, perspective: 2500, curve: 1, spread: 1, inward: false, billboard: false, backfaces: true, window: 0 },
  orbit: { axis: 'y', tilt: -16, perspective: 1500, curve: 0, spread: 1.45, inward: false, billboard: true, backfaces: false, window: 0 },
  wheel: { axis: 'x', tilt: 0, perspective: 1800, curve: 0, spread: 1, inward: false, billboard: false, backfaces: true, window: 1.7 },
  panorama: { axis: 'y', tilt: 0, perspective: 0, curve: 1, spread: 1, inward: true, billboard: false, backfaces: false, window: 0 },
};

const INTRO_LENGTH = { assemble: 1500, rise: 1400, spin: 1800, none: 0 };
const TILES = 8;
const OVERLAP = 2.5;
const DRAG_THRESHOLD = 5;
const DRAG_THRESHOLD_TOQUE = 12;
const SPRING = 118;
const SETTLE_SPEED = 9;
const CAPTION_SPACE = 76;
const TO_RAD = Math.PI / 180;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const wrap = (deg) => ((((deg + 180) % 360) + 360) % 360) - 180;
const easeOut = (t) => 1 - Math.pow(1 - t, 4);
const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);

const rotateX = (p, deg) => {
  const r = deg * TO_RAD;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
};

const rotateY = (p, deg) => {
  const r = deg * TO_RAD;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
};

const el = (tag, className, attrs) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (attrs) for (const k of Object.keys(attrs)) node.setAttribute(k, attrs[k]);
  return node;
};

/**
 * @param {HTMLElement} raiz  elemento que vira o carrossel (precisa ter altura definida pelo CSS)
 * @param {Array<{src:string, srcset?:string, alt?:string, title?:string, subtitle?:string}>} itens
 * @param {object} opcoes  mesmas props do React Bits (preset, intro, cardWidth, aspectRatio, gap...)
 *                         `cardWidth` pode ser uma função (retânguloDaRaiz) => px.
 */
export function criarCarrosselCircular(raiz, itens, opcoes = {}) {
  const o = {
    preset: 'cylinder',
    intro: 'rise',
    cardWidth: 220,
    aspectRatio: 1,
    gap: 25,
    curve: undefined,
    tilt: undefined,
    perspective: undefined,
    autoplay: 'drift',
    speed: 14,
    interval: 3,
    direction: 'left',
    draggable: true,
    momentum: 0.6,
    tiles: TILES, // fatias por cartão curvo: menos fatias = menos elementos para animar (mais fluido)
    // Arraste mais calmo (usado na seção 4): dragGain < 1 faz o anel andar menos que o dedo; limitarGesto
    // faz cada gesto avançar no máximo 1 foto, e só se o dedo passar de ~35% do cartão (ou for um toque firme).
    dragGain: 1,
    limitarGesto: false,
    snap: true,
    pauseOnHover: true,
    focusOnClick: true,
    parallax: 0.3,
    stretch: 0.5,
    depthFade: 0.55,
    fadeColor: null, // null: usa o --cc-fade definido no CSS
    innerShade: 0.6,
    cornerRadius: 12,
    captions: false,
    // Vizinhas (usado no PC, seção 4): as fotos ao lado da que está na frente ficam um pouco menores, apagadas e com
    // leve desfoque, e as que estão mais longe somem por completo (sem faixas finas nas bordas).
    // { escala, opacidade, desfoque (px), alcance (em passos do anel: a partir daí a foto some) }
    vizinhas: null,
    // Quando a lista repete as mesmas imagens (para o anel ficar menos curvo), a legenda conta só as originais:
    iniciarQuandoVisivel: false, // só mostra e começa a introdução quando ~15% do carrossel aparece na tela
    captionTotal: null, // total mostrado em "01 / 03" (padrão: quantidade de itens)
    captionIndex: null, // (índiceDoCartão) => índice da imagem original
    ariaLabel: 'Carrossel de imagens',
    onChange: null,
    onItemClick: null,
    ...opcoes,
  };

  const lista = itens;
  const count = lista.length;
  if (!count) return null;
  const rotuloTotal = o.captionTotal || count;
  const indiceRotulo = (i) => (o.captionIndex ? o.captionIndex(i) : i);

  const query = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduced = Boolean(query && query.matches);

  // ---------- Configuração derivada (recalculada quando a largura do cartão muda) ----------
  let s = null;
  let tiles = [];

  const shape = PRESETS[o.preset] ? o.preset : 'cylinder';
  const layout = PRESETS[shape];
  const axis = layout.axis;
  const tiltValue = o.tilt ?? layout.tilt;
  const curveValue = layout.billboard ? 0 : clamp(o.curve ?? layout.curve, 0, 1);
  const step = 360 / count;
  const directionSign = (o.direction === 'right' ? 1 : -1) * (layout.inward ? -1 : 1);

  // `cardWidth` pode ser um número ou uma função que recebe o retângulo do contêiner ({ width, height }).
  const larguraPedida = () => (typeof o.cardWidth === 'function' ? o.cardWidth(raiz.getBoundingClientRect()) : o.cardWidth);

  const configurar = () => {
    const pedida = larguraPedida();
    const cardW = Math.max(40, pedida);
    const cardH = cardW / clamp(o.aspectRatio, 0.2, 5);
    const along = axis === 'x' ? cardH : cardW;

    const n = Math.max(count, 3);
    const pitch = (along + o.gap) * layout.spread;
    const chord = pitch / (2 * Math.sin(Math.PI / n));
    const arc = (n * pitch) / (2 * Math.PI);
    const radius = Math.max(chord + (arc - chord) * curveValue, along * 0.6);

    const total = curveValue > 0.001 ? Math.max(2, Math.round(o.tiles)) : 1;
    const length = along / total;
    const bend = curveValue > 0.001 ? radius / curveValue : 0;
    tiles = Array.from({ length: total }, (_, index) => {
      const start = index * length - (index > 0 ? OVERLAP / 2 : 0);
      const end = (index + 1) * length + (index < total - 1 ? OVERLAP / 2 : 0);
      const center = (start + end) / 2 - along / 2;
      const alpha = bend ? center / bend : 0;
      const shift = bend ? bend * Math.sin(alpha) : center;
      const sink = bend ? bend * (1 - Math.cos(alpha)) : 0;
      const depth = layout.inward ? sink : -sink;
      const turn = ((layout.inward ? -alpha : alpha) * 180) / Math.PI;
      const move =
        axis === 'x'
          ? `translate3d(0px, ${shift}px, ${depth}px) rotateX(${-turn}deg)`
          : `translate3d(${shift}px, 0px, ${depth}px) rotateY(${turn}deg)`;
      return { index, total, start, end, size: end - start, move };
    });

    s = {
      count,
      step,
      radius,
      layout,
      axis,
      tilt: tiltValue,
      perspective: layout.inward ? radius : o.perspective ?? layout.perspective,
      cardW,
      cardH,
      along,
      intro: reduced ? 'none' : o.intro in INTRO_LENGTH ? o.intro : 'rise',
      autoplay: reduced ? 'off' : o.autoplay,
      speed: o.speed,
      interval: Math.max(0.5, o.interval),
      draggable: o.draggable,
      momentum: clamp(o.momentum, 0, 1),
      dragGain: clamp(o.dragGain, 0.2, 1.5),
      limitarGesto: o.limitarGesto,
      snap: o.snap,
      pauseOnHover: o.pauseOnHover,
      parallax: reduced ? 0 : clamp(o.parallax, 0, 1),
      stretch: reduced ? 0 : clamp(o.stretch, 0, 1),
      depthFade: clamp(o.depthFade, 0, 1),
      captions: o.captions,
      vizinhas: o.vizinhas || null,
      reduced,
    };
  };

  // ---------- Estado ----------
  const state = {
    angle: 0,
    velocity: 0,
    target: null,
    dir: directionSign,
    press: null,
    drag: false,
    hover: false,
    pointer: { inside: false, x: 0, y: 0 },
    yaw: 0,
    pitch: 0,
    intro: null,
    introDone: false,
    holdUntil: 0,
    stepAt: 0,
    suppressClick: false,
    wheelTimer: 0,
    fit: 1,
    shift: 0,
    drop: 0,
    last: 0,
  };
  let ready = false;
  let active = 0;
  let raf = 0;
  let visible = true;
  const cardRefs = [];

  // ---------- DOM ----------
  raiz.classList.add('circular-carousel');
  raiz.setAttribute('role', 'region');
  raiz.setAttribute('aria-roledescription', 'carousel');
  raiz.setAttribute('aria-label', o.ariaLabel);
  raiz.tabIndex = 0;
  raiz.dataset.axis = axis;
  raiz.dataset.shape = shape;
  if (o.draggable) raiz.dataset.draggable = '';
  if (o.vizinhas) raiz.dataset.vizinhas = '';
  if (o.fadeColor) raiz.style.setProperty('--cc-fade', o.fadeColor);
  raiz.style.setProperty('--cc-radius', `${Math.max(0, o.cornerRadius)}px`);
  raiz.style.setProperty('--cc-inner', (1 - clamp(o.innerShade, 0, 1)).toFixed(3));

  const view = el('div', 'circular-carousel__view');
  const stage = el('div', 'circular-carousel__stage');
  const camera = el('div', 'circular-carousel__camera');
  const ring = el('div', 'circular-carousel__ring');
  camera.appendChild(ring);
  stage.appendChild(camera);
  view.appendChild(stage);
  raiz.appendChild(view);

  let caption = null;
  let captionTitleHost = null;
  let reels = [];
  if (o.captions) {
    caption = el('div', 'circular-carousel__caption', { 'aria-hidden': 'true' });
    captionTitleHost = el('span', 'circular-carousel__title');
    const countEl = el('span', 'circular-carousel__count');
    const digits = el('span', 'circular-carousel__digits');
    for (let i = 0; i < 2; i++) {
      const digit = el('span', 'circular-carousel__digit');
      const reel = el('span', 'circular-carousel__reel');
      for (let n = 0; n < 10; n++) reel.appendChild(Object.assign(el('span'), { textContent: String(n) }));
      digit.appendChild(reel);
      digits.appendChild(digit);
      reels.push(reel);
    }
    const slash = el('span', 'circular-carousel__slash');
    slash.textContent = '/';
    const total = el('span');
    total.textContent = String(rotuloTotal).padStart(2, '0');
    countEl.append(digits, slash, total);
    caption.append(captionTitleHost, countEl);
    raiz.appendChild(caption);
  }

  const live = el('div', 'circular-carousel__live', { 'aria-live': 'polite', 'aria-atomic': 'true' });
  raiz.appendChild(live);

  const criarImagem = (item, classe, estilo) => {
    const img = el('img', classe);
    img.alt = '';
    img.draggable = false;
    img.decoding = 'async';
    Object.assign(img.style, estilo);
    if (item.srcset) {
      img.sizes = `${Math.round(s.cardW)}px`;
      img.srcset = item.srcset;
    }
    img.src = item.src;
    return img;
  };

  const criarTile = (item, tile, back) => {
    const strip = back ? tile.total - 1 - tile.index : tile.index;
    const first = strip === 0;
    const last = strip === tile.total - 1;
    const r = 'var(--cc-radius)';
    const frameRadius =
      axis === 'x'
        ? `${first ? r : 0} ${first ? r : 0} ${last ? r : 0} ${last ? r : 0}`
        : `${first ? r : 0} ${last ? r : 0} ${last ? r : 0} ${first ? r : 0}`;
    const offset = back ? s.along - tile.end : tile.start;
    const size = tile.size;
    const box =
      axis === 'x'
        ? { left: `${-s.cardW / 2}px`, top: `${-size / 2}px`, width: `${s.cardW}px`, height: `${size}px` }
        : { left: `${-size / 2}px`, top: `${-s.cardH / 2}px`, width: `${size}px`, height: `${s.cardH}px` };
    const photoStyle =
      axis === 'x'
        ? { left: '0px', top: `${-offset}px`, width: `${s.cardW}px`, height: `${s.cardH}px` }
        : { left: `${-offset}px`, top: '0px', width: `${s.cardW}px`, height: `${s.cardH}px` };
    const flip = axis === 'x' ? ' rotateX(180deg)' : ' rotateY(180deg)';

    const tileEl = el('div', 'circular-carousel__tile', { 'aria-hidden': 'true' });
    Object.assign(tileEl.style, box);
    tileEl.style.transform = tile.move + (back ? flip : '');

    const frame = el('div', 'circular-carousel__frame');
    frame.style.height = axis === 'x' ? `${size}px` : `${s.cardH}px`;
    frame.style.borderRadius = frameRadius;
    frame.appendChild(criarImagem(item, 'circular-carousel__photo', photoStyle));
    if (back) frame.appendChild(el('div', 'circular-carousel__inner'));
    frame.appendChild(el('div', 'circular-carousel__shade'));
    tileEl.appendChild(frame);
    return tileEl;
  };

  const montarCartoes = () => {
    ring.textContent = '';
    cardRefs.length = 0;
    lista.forEach((item, index) => {
      const card = el('div', 'circular-carousel__card', {
        'data-cc-index': String(index),
        role: 'group',
        'aria-roledescription': 'slide',
        'aria-label': `${item.title || item.alt || `Imagem ${indiceRotulo(index) + 1}`}, ${indiceRotulo(index) + 1} de ${rotuloTotal}`,
      });
      tiles.forEach((tile) => card.appendChild(criarTile(item, tile, false)));
      if (layout.backfaces) tiles.forEach((tile) => card.appendChild(criarTile(item, tile, true)));
      ring.appendChild(card);
      cardRefs[index] = card;
    });
  };

  const atualizarLegenda = (index) => {
    const item = lista[index] || lista[0];
    const posicao = indiceRotulo(index);
    const rotulo = item.title || item.alt || `Imagem ${posicao + 1}`;
    live.textContent = `${rotulo}, ${posicao + 1} de ${rotuloTotal}`;
    if (!caption) return;
    // recria o título para reiniciar a animação de entrada
    const novo = el('span', 'circular-carousel__title');
    if (item.title || item.alt) novo.appendChild(document.createTextNode(item.title || ''));
    if (item.subtitle) {
      const sub = el('span', 'circular-carousel__subtitle');
      sub.textContent = item.subtitle;
      novo.appendChild(sub);
    }
    captionTitleHost.replaceWith(novo);
    captionTitleHost = novo;
    const texto = String(posicao + 1).padStart(2, '0');
    reels.forEach((reel, i) => {
      reel.style.transform = `translateY(${-Number(texto[i]) * 10}%)`;
    });
  };

  // ---------- Medida (escala para caber no contêiner) ----------
  const nearest = (angle) => Math.round(angle / s.step) * s.step;

  const measure = () => {
    const rect = raiz.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const room = s.captions ? CAPTION_SPACE : 0;
    const width = rect.width * 0.94;
    const height = (rect.height - room) * 0.92;
    const P = s.perspective;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    if (s.layout.inward) {
      minX = -width / 2;
      maxX = width / 2;
      minY = -s.cardH / 2;
      maxY = s.cardH / 2;
    } else {
      const corners = [
        [-s.cardW / 2, -s.cardH / 2],
        [s.cardW / 2, -s.cardH / 2],
        [-s.cardW / 2, s.cardH / 2],
        [s.cardW / 2, s.cardH / 2],
      ];
      const limit = s.layout.window ? s.layout.window * s.step : 180;
      for (let a = -limit; a <= limit; a += limit / 24) {
        for (const [cx, cy] of corners) {
          let p;
          if (s.axis === 'x') {
            p = rotateY(rotateX([cx, cy, s.radius], -a), s.tilt);
          } else if (s.layout.billboard) {
            const c = rotateY([0, 0, s.radius], a);
            p = rotateX([c[0] + cx, cy, c[2]], s.tilt);
          } else {
            p = rotateX(rotateY([cx, cy, s.radius], a), s.tilt);
          }
          p = [p[0], p[1], p[2] - s.radius];
          if (p[2] >= P * 0.95) continue;
          const k = P / (P - p[2]);
          minX = Math.min(minX, p[0] * k);
          maxX = Math.max(maxX, p[0] * k);
          minY = Math.min(minY, p[1] * k);
          maxY = Math.max(maxY, p[1] * k);
        }
      }
    }
    const spanX = Math.max(maxX - minX, 1);
    const spanY = Math.max(maxY - minY, 1);
    const fit = Math.min(1, width / spanX, height / spanY);
    state.fit = fit;
    state.shift = -((minY + maxY) / 2) * fit - room / 2;
    state.drop = s.axis === 'x' ? (rect.width / fit) * 0.55 + s.cardW : (rect.height / fit) * 0.55 + s.cardH;
    stage.style.perspective = `${P}px`;
    stage.style.transform = `translate3d(0, ${state.shift}px, 0) scale(${fit})`;
  };

  // ---------- Introdução ----------
  const introCard = (elapsed, landing) => {
    if (!state.intro) return { radius: 1, lift: 0 };
    const type = state.intro.type;
    const reach = Math.abs(wrap(landing + state.angle));
    if (type === 'assemble') {
      const delay = (reach / 180) * 420;
      const p = easeOut(clamp((elapsed - delay) / 1080, 0, 1));
      return { radius: 1 + 0.6 * (1 - p), lift: 0 };
    }
    if (type === 'rise') {
      const delay = (reach / 180) * 480;
      const p = easeOutQuint(clamp((elapsed - delay) / 900, 0, 1));
      return { radius: 1, lift: (1 - p) * state.drop };
    }
    if (type === 'spin') {
      const p = easeOut(clamp(elapsed / INTRO_LENGTH.spin, 0, 1));
      return { radius: 1 + 0.28 * (1 - p), lift: 0 };
    }
    return { radius: 1, lift: 0 };
  };

  // ---------- Física ----------
  const advance = (dt, now) => {
    if (!state.introDone && ready) {
      if (!state.intro) {
        if (s.intro === 'none') state.introDone = true;
        else state.intro = { type: s.intro, start: now };
      }
      if (state.intro && now - state.intro.start >= INTRO_LENGTH[state.intro.type]) {
        state.intro = null;
        state.introDone = true;
      }
    }

    const paused = (s.pauseOnHover && state.hover) || state.drag || now < state.holdUntil;
    const cruise = s.autoplay === 'drift' && !paused && !state.intro ? s.speed * state.dir : 0;
    let busy = Boolean(state.intro) || state.drag;

    if (state.drag || state.intro) {
      state.velocity = state.drag ? state.velocity : 0;
    } else if (state.target !== null) {
      let remaining = dt;
      const damping = 2 * Math.sqrt(SPRING);
      while (remaining > 0) {
        const h = Math.min(remaining, 1 / 240);
        const accel = SPRING * (state.target - state.angle) - damping * state.velocity;
        state.velocity += accel * h;
        state.angle += state.velocity * h;
        remaining -= h;
      }
      if (Math.abs(state.target - state.angle) < 0.004 && Math.abs(state.velocity) < 0.03) {
        state.angle = state.target;
        state.velocity = 0;
        state.target = null;
      }
      busy = true;
    } else {
      const tau = 0.18 + s.momentum * 1.5;
      state.velocity += (cruise - state.velocity) * (1 - Math.exp(-dt / tau));
      state.angle += state.velocity * dt;
      if (cruise === 0 && s.snap && Math.abs(state.velocity) < SETTLE_SPEED) {
        state.target = nearest(state.angle);
      }
      busy = busy || cruise !== 0 || Math.abs(state.velocity) > 0.01 || state.target !== null;
    }

    if (s.autoplay === 'step' && !paused && !state.intro && state.introDone) {
      if (!state.stepAt) state.stepAt = now + s.interval * 1000;
      if (now >= state.stepAt) {
        state.target = (state.target ?? nearest(state.angle)) + s.step * state.dir;
        state.stepAt = now + s.interval * 1000;
      }
      busy = true;
    } else {
      state.stepAt = 0;
    }

    if (now < state.holdUntil) busy = true;

    const ease = 1 - Math.exp(-dt / 0.35);
    const aimYaw = state.pointer.inside ? state.pointer.x * s.parallax * 9 : 0;
    const aimPitch = state.pointer.inside ? -state.pointer.y * s.parallax * 6 : 0;
    state.yaw += (aimYaw - state.yaw) * ease;
    state.pitch += (aimPitch - state.pitch) * ease;
    if (Math.abs(aimYaw - state.yaw) > 0.01 || Math.abs(aimPitch - state.pitch) > 0.01) busy = true;

    return busy;
  };

  // ---------- Desenho ----------
  const render = (now) => {
    const elapsed = state.intro ? now - state.intro.start : 0;
    const swell = 1 + s.stretch * 0.12 * Math.min(1, Math.abs(state.velocity) / 420);
    let spinOffset = 0;
    if (state.intro && state.intro.type === 'spin') {
      const p = easeOut(clamp(elapsed / INTRO_LENGTH.spin, 0, 1));
      spinOffset = -300 * state.dir * (1 - p);
    } else if (state.intro && state.intro.type === 'assemble') {
      const p = easeOut(clamp(elapsed / INTRO_LENGTH.assemble, 0, 1));
      spinOffset = -32 * state.dir * (1 - p);
    }
    const angle = state.angle + spinOffset;
    const R = s.radius * swell;

    if (s.axis === 'x') {
      camera.style.transform = `translate3d(0, 0, ${-R}px) rotateY(${s.tilt + state.yaw}deg) rotateX(${state.pitch}deg)`;
      ring.style.transform = `rotateX(${-angle}deg)`;
    } else if (s.layout.inward) {
      camera.style.transform = `translate3d(0, 0, ${s.perspective - 1}px) rotateX(${s.tilt + state.pitch}deg) rotateY(${state.yaw}deg)`;
      ring.style.transform = `rotateY(${angle}deg)`;
    } else {
      camera.style.transform = `translate3d(0, 0, ${-R}px) rotateX(${s.tilt + state.pitch}deg) rotateY(${state.yaw}deg)`;
      ring.style.transform = `rotateY(${angle}deg)`;
    }

    for (let index = 0; index < s.count; index++) {
      const card = cardRefs[index];
      if (!card) continue;
      const base = index * s.step;
      const world = wrap(base + angle);
      const mod = introCard(elapsed, base);
      const r = R * mod.radius;
      let transform;
      if (s.axis === 'x') {
        transform = `rotateX(${-base}deg) translateZ(${r}px)`;
      } else if (s.layout.inward) {
        transform = `rotateY(${base}deg) translateZ(${-r}px)`;
      } else {
        transform = `rotateY(${base}deg) translateZ(${r}px)`;
        if (s.layout.billboard) transform += ` rotateY(${-(base + angle)}deg)`;
      }
      if (mod.lift) transform += s.axis === 'x' ? ` translateX(${mod.lift}px)` : ` translateY(${mod.lift}px)`;

      const facing = Math.cos(world * TO_RAD);
      if (s.layout.inward) card.style.visibility = Math.abs(world) > 86 ? 'hidden' : '';
      let fade = s.depthFade * Math.pow((1 - facing) / 2, 1.25);
      const v = s.vizinhas;
      if (v) {
        // t = distância até a foto da frente, em passos do anel (0 = na frente, 1 = vizinha, mais = mais longe).
        const t = Math.abs(world) / s.step;
        const suave = (x) => x * x * (3 - 2 * x);
        const perto = suave(clamp(t, 0, 1));
        const longe = suave(clamp((t - 1) / Math.max(v.alcance - 1, 0.01), 0, 1));
        const opacidade = (1 - (1 - v.opacidade) * perto) * (1 - longe);
        // A "opacidade" é feita escurecendo/clareando para a cor do fundo (a camada .circular-carousel__shade): opacity
        // no cartão achataria as fatias 3D e desmontaria a curva.
        fade = Math.max(fade, 1 - opacidade);
        if (t >= v.alcance) card.style.visibility = 'hidden';
        else if (s.layout.inward && Math.abs(world) <= 86) card.style.visibility = '';
        card.style.setProperty('--cc-blur', `${(Math.round(v.desfoque * perto * 2) / 2).toFixed(1)}px`);
        const vizinha = t > 0.5;
        if (card._vizinha !== vizinha) {
          card._vizinha = vizinha;
          card.style.cursor = vizinha ? 'pointer' : '';
        }
        transform += ` scale(${(1 - (1 - v.escala) * perto).toFixed(4)})`;
      }
      card.style.transform = transform;
      card.style.setProperty('--cc-depth', fade.toFixed(3));
    }

    const index = ((Math.round(-state.angle / s.step) % s.count) + s.count) % s.count || 0;
    if (index !== active) {
      active = index;
      atualizarLegenda(index);
      if (o.onChange) o.onChange(index);
    }
  };

  const frame = (now) => {
    raf = 0;
    const dt = state.last ? Math.min((now - state.last) / 1000, 0.05) : 1 / 60;
    state.last = now;
    const busy = advance(dt, now);
    render(now);
    if (busy && visible && !document.hidden) raf = requestAnimationFrame(frame);
    else state.last = 0;
  };

  const wake = () => {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  };

  // ---------- Ações ----------
  const focusIndex = (index) => {
    let target = -index * s.step;
    target += 360 * Math.round((state.angle - target) / 360);
    state.target = target;
    state.holdUntil = performance.now() + 2800;
    wake();
  };

  const stepBy = (delta) => {
    const base = state.target ?? Math.round(state.angle / s.step) * s.step;
    state.target = base - delta * s.step * (s.layout.inward ? -1 : 1);
    state.holdUntil = performance.now() + 2800;
    wake();
  };

  // ---------- Eventos ----------
  const onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
      state.last = 0;
    } else wake();
  };

  // Rolagem horizontal do trackpad gira o anel (só quando o gesto é mais horizontal que vertical,
  // então a rolagem vertical da página nunca é bloqueada).
  const onWheel = (event) => {
    if (!s.draggable) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : 0;
    if (!delta) return;
    event.preventDefault();
    const perPixel = 180 / (Math.PI * s.radius * state.fit);
    state.target = null;
    state.angle -= delta * perPixel * (s.layout.inward ? -1 : 1);
    state.velocity = -delta * perPixel * (s.layout.inward ? -1 : 1) * 30;
    state.holdUntil = performance.now() + 1600;
    clearTimeout(state.wheelTimer);
    state.wheelTimer = setTimeout(() => {
      if (s.snap) state.target = nearest(state.angle + state.velocity * 0.12);
      wake();
    }, 140);
    wake();
  };

  const updatePointer = (event) => {
    const rect = raiz.getBoundingClientRect();
    state.pointer.x = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    state.pointer.y = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
  };

  const onPointerDown = (event) => {
    state.suppressClick = false;
    if (!o.draggable || event.button !== 0) return;
    state.press = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      angle: state.angle,
      base: state.target ?? nearest(state.angle), // cartão de onde o gesto partiu
      moved: false,
      origin: 0,
      samples: [{ time: performance.now(), angle: state.angle }],
    };
  };

  const onPointerMove = (event) => {
    if (event.pointerType === 'mouse') {
      state.pointer.inside = true;
      updatePointer(event);
    }
    const press = state.press;
    if (!press || press.id !== event.pointerId) {
      wake();
      return;
    }
    const delta = s.axis === 'x' ? event.clientY - press.y : event.clientX - press.x;
    const cross = s.axis === 'x' ? event.clientX - press.x : event.clientY - press.y;
    if (!press.moved) {
      // No toque, um movimento pequeno (dedo apoiado, tremor) não vira arraste.
      if (Math.abs(delta) < (s.limitarGesto && event.pointerType !== 'mouse' ? DRAG_THRESHOLD_TOQUE : DRAG_THRESHOLD)) return;
      // Gesto mais vertical que horizontal no toque: não captura, a página rola normalmente.
      if (Math.abs(cross) > Math.abs(delta) * 1.2 && event.pointerType !== 'mouse') {
        state.press = null;
        return;
      }
      press.moved = true;
      press.origin = delta;
      state.drag = true;
      state.target = null;
      state.velocity = 0;
      raiz.dataset.dragging = '';
      try {
        raiz.setPointerCapture(event.pointerId);
      } catch (erro) {
        /* sem captura: segue sem */
      }
    }
    const perPixel = (180 / (Math.PI * s.radius * state.fit)) * s.dragGain;
    state.angle = press.angle + (delta - press.origin) * perPixel * (s.layout.inward ? -1 : 1);
    const now = performance.now();
    press.samples.push({ time: now, angle: state.angle });
    while (press.samples.length > 2 && now - press.samples[0].time > 110) press.samples.shift();
    wake();
  };

  const releasePointer = (event) => {
    const press = state.press;
    if (!press || press.id !== event.pointerId) return;
    state.press = null;
    if (!press.moved) return;
    state.drag = false;
    delete raiz.dataset.dragging;
    state.suppressClick = true;
    const first = press.samples[0];
    const last = press.samples[press.samples.length - 1];
    const span = (last.time - first.time) / 1000;
    const velocity = span > 0.008 ? clamp((last.angle - first.angle) / span, -1400, 1400) : 0;
    state.velocity = velocity;
    if (Math.abs(velocity) > 60) state.dir = Math.sign(velocity);
    const coasting = s.autoplay === 'drift' && !(s.pauseOnHover && state.hover && event.pointerType === 'mouse');
    if (s.snap && !coasting) {
      if (s.limitarGesto) {
        // Um gesto avança no máximo 1 foto: só se o dedo passou de ~35% do cartão, contando uma pequena
        // projeção da velocidade (um toque firme e curto também vale). Senão, volta para o cartão de partida.
        const projetado = state.angle - press.base + velocity * 0.1;
        const passos = Math.abs(projetado) > s.step * 0.35 ? Math.sign(projetado) : 0;
        state.target = press.base + passos * s.step;
      } else {
        const tau = 0.18 + s.momentum * 1.5;
        state.target = Math.round((state.angle + velocity * tau * 0.55) / s.step) * s.step;
      }
    }
    wake();
  };

  const onPointerEnter = (event) => {
    if (event.pointerType !== 'mouse') return;
    state.hover = true;
    wake();
  };

  const onPointerLeave = (event) => {
    if (event.pointerType === 'mouse') {
      state.hover = false;
      state.pointer.inside = false;
    }
    wake();
  };

  const onClick = (event) => {
    if (state.suppressClick) {
      state.suppressClick = false;
      return;
    }
    const card = event.target.closest && event.target.closest('[data-cc-index]');
    if (!card) return;
    const index = Number(card.getAttribute('data-cc-index'));
    if (o.focusOnClick) focusIndex(index);
    if (o.onItemClick) o.onItemClick(lista[index], index);
  };

  const onKeyDown = (event) => {
    const forward = axis === 'x' ? 'ArrowDown' : 'ArrowRight';
    const backward = axis === 'x' ? 'ArrowUp' : 'ArrowLeft';
    if (event.key === forward) stepBy(1);
    else if (event.key === backward) stepBy(-1);
    else if (event.key === 'Home') focusIndex(0);
    else if (event.key === 'End') focusIndex(count - 1);
    else if ((event.key === 'Enter' || event.key === ' ') && o.onItemClick) o.onItemClick(lista[active], active);
    else return;
    event.preventDefault();
  };

  raiz.addEventListener('pointerdown', onPointerDown);
  raiz.addEventListener('pointermove', onPointerMove);
  raiz.addEventListener('pointerup', releasePointer);
  raiz.addEventListener('pointercancel', releasePointer);
  raiz.addEventListener('pointerenter', onPointerEnter);
  raiz.addEventListener('pointerleave', onPointerLeave);
  raiz.addEventListener('click', onClick);
  raiz.addEventListener('keydown', onKeyDown);
  raiz.addEventListener('wheel', onWheel, { passive: false });
  document.addEventListener('visibilitychange', onVisibility);

  // ---------- Observadores ----------
  let resizeTimer = 0;
  const resize = new ResizeObserver(() => {
    // Se a largura do cartão depende do contêiner, remonta os cartões (sem repetir a introdução).
    const antes = s.cardW;
    if (Math.abs(Math.max(40, larguraPedida()) - antes) > 6) {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        configurar();
        montarCartoes();
        measure();
        render(performance.now());
        wake();
      }, 80);
    }
    measure();
    wake();
  });

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
    else {
      cancelAnimationFrame(raf);
      raf = 0;
      state.last = 0;
    }
  });

  // ---------- Início ----------
  configurar();
  montarCartoes();
  atualizarLegenda(0);
  measure();
  render(performance.now());
  resize.observe(raiz);
  io.observe(raiz);

  // Espera as imagens (com limite de 2,4 s) antes de mostrar e começar a introdução.
  let cancelado = false;
  const carregar = (item) =>
    new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => (img.decode ? img.decode().then(resolve, resolve) : resolve());
      img.onerror = resolve;
      if (item.srcset) {
        img.sizes = `${Math.round(s.cardW)}px`;
        img.srcset = item.srcset;
      }
      img.src = item.src;
    });
  const limite = new Promise((resolve) => setTimeout(resolve, 2400));
  // A entrada própria do carrossel (introdução) só deve rodar quando a pessoa chega nele, e não ao carregar a
  // página (quando ele ainda está fora da tela e ninguém veria). Por isso espera ficar visível uma vez.
  const quandoVisivel = o.iniciarQuandoVisivel
    ? new Promise((resolve) => {
        const alvo = new IntersectionObserver(
          ([entrada]) => {
            if (entrada.isIntersecting && entrada.intersectionRatio >= 0.14) {
              alvo.disconnect();
              resolve();
            }
          },
          { threshold: 0.15 },
        );
        alvo.observe(raiz);
      })
    : Promise.resolve();
  Promise.race([Promise.all(lista.slice(0, 16).map(carregar)), limite]).then(() => quandoVisivel).then(() => {
    if (cancelado) return;
    state.introDone = false;
    state.intro = null;
    ready = true;
    raiz.dataset.ready = '';
    wake();
  });
  wake();

  return {
    destroy() {
      cancelado = true;
      cancelAnimationFrame(raf);
      resize.disconnect();
      io.disconnect();
      clearTimeout(state.wheelTimer);
      clearTimeout(resizeTimer);
      raiz.removeEventListener('pointerdown', onPointerDown);
      raiz.removeEventListener('pointermove', onPointerMove);
      raiz.removeEventListener('pointerup', releasePointer);
      raiz.removeEventListener('pointercancel', releasePointer);
      raiz.removeEventListener('pointerenter', onPointerEnter);
      raiz.removeEventListener('pointerleave', onPointerLeave);
      raiz.removeEventListener('click', onClick);
      raiz.removeEventListener('keydown', onKeyDown);
      raiz.removeEventListener('wheel', onWheel);
      document.removeEventListener('visibilitychange', onVisibility);
    },
    focusIndex,
    stepBy,
  };
}
