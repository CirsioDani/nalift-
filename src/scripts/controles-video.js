// Controles de vídeo próprios do site (substituem os controles nativos, que ficam cortados em vídeos estreitos 9:16).
// Tudo dentro do quadro do vídeo (que tem cantos arredondados e overflow escondido), com a paleta do site:
//  - botão de play/pause grande e redondo no centro; some suavemente enquanto o vídeo toca e volta ao tocar no vídeo
//    ou ao pausar (antes do primeiro play mostra também "Toque para assistir");
//  - barra de progresso fina embaixo (bordô sobre rosé claro), com área de toque de 44px: tocar num ponto pula para
//    ele; arrastar avança ou volta, com uma bolinha na posição atual enquanto arrasta (pointer events: toque e mouse);
//    também funciona pelo teclado;
//  - botão de som (liga/desliga) pequeno no canto superior direito.
//
// Pular no vídeo com preload="none": os metadados (duração) só existem depois de carregados. Quando a pessoa toca num
// atalho ou na barra com o vídeo ainda não carregado, o controle pede os metadados (preload = "metadata" + load()),
// ESPERA o evento loadedmetadata, só então define currentTime e (no caso dos atalhos) dá play. Se já está carregado,
// pula direto. IMPORTANTE: pular para um ponto ainda não baixado exige que o servidor aceite trechos (HTTP Range,
// resposta 206): o Cloudflare Pages não aceita sozinho, por isso existe functions/midia/[[caminho]].js.
//
// Uso: criarControlesVideo(video, quadro, { rotulo, textoToque }) devolve { iniciar, iniciarEm, alternar, tocando }.
// Estilos: src/styles/controles-video.css.
const ICONES = {
  play: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
  pause:
    '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false"><path d="M7.5 5.5h3.5v13H7.5zM13 5.5h3.5v13H13z" fill="currentColor"/></svg>',
  som: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  mudo: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
};
const TEMPO_VISIVEL = 2600; // ms que o botão central fica à mostra, depois de tocar no vídeo que está tocando
const PASSO = 5; // s por seta do teclado na barra
const INTERVALO_SALTO = 90; // ms: ao arrastar a barra, o vídeo acompanha no máximo a cada tanto (e na soltura)
const ESPERA_SALTO = 700; // ms: depois de pular, ignora o tempo "antigo" que o vídeo ainda pode informar

const formatar = (s) => {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

const criar = (tag, classe, atributos = {}) => {
  const elemento = document.createElement(tag);
  elemento.className = classe;
  Object.entries(atributos).forEach(([chave, valor]) => elemento.setAttribute(chave, valor));
  return elemento;
};

export function criarControlesVideo(video, quadro, opcoes = {}) {
  // Sem `rotulo` nas opções, acompanha o aria-label do vídeo (que pode mudar, como na playlist dos depoimentos no PC).
  const rotuloAtual = () => opcoes.rotulo || video.getAttribute('aria-label') || 'vídeo';
  const textoToque = opcoes.textoToque || 'Toque para assistir';

  video.controls = false;
  video.removeAttribute('controls');
  quadro.classList.add('cv');

  // Camada que recebe o toque no vídeo (não entra na ordem do teclado: o botão central faz o mesmo).
  const area = criar('button', 'cv__area', { type: 'button', tabindex: '-1', 'aria-hidden': 'true' });

  const play = criar('button', 'cv__play', { type: 'button' });
  const playIcone = criar('span', 'cv__play-icone');
  const playTexto = criar('span', 'cv__play-texto');
  playTexto.textContent = textoToque;
  play.append(playIcone, playTexto);

  const som = criar('button', 'cv__som', { type: 'button' });
  const somIcone = criar('span', 'cv__som-icone');
  som.appendChild(somIcone);

  const barra = criar('div', 'cv__barra', {
    role: 'slider',
    tabindex: '0',
    'aria-label': 'Progresso do vídeo',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    'aria-valuenow': '0',
    'aria-valuetext': '0:00',
  });
  // A faixa é a parte visível (fina); a barra inteira (44px de altura) é a área de toque.
  const faixa = criar('span', 'cv__faixa');
  const trilho = criar('span', 'cv__trilho');
  const preenchimento = criar('span', 'cv__preenchimento');
  trilho.appendChild(preenchimento);
  const bolinha = criar('span', 'cv__bolinha');
  faixa.append(trilho, bolinha);
  barra.appendChild(faixa);

  quadro.append(area, play, som, barra);

  let jaIniciou = false;
  let timer = 0;
  let arrastando = false;
  let razaoPendente = null; // pulo pedido na barra antes de existirem os metadados
  let tempoPendente = null; // pulo pedido por um atalho antes de existirem os metadados
  let esperandoMetadados = false;
  let ignorarAte = 0; // timestamp: até lá, o tempo informado pelo vídeo pode ser o "antigo"
  let ultimoSalto = 0;

  const tocando = () => !video.paused && !video.ended;
  const duracaoConhecida = () => Number.isFinite(video.duration) && video.duration > 0;

  const atualizarPlay = () => {
    const ativo = tocando();
    quadro.classList.toggle('tocando', ativo);
    playIcone.innerHTML = ativo ? ICONES.pause : ICONES.play;
    play.setAttribute('aria-label', ativo ? 'Pausar' : jaIniciou ? 'Reproduzir' : `Assistir: ${rotuloAtual()}`);
  };

  const atualizarSom = () => {
    somIcone.innerHTML = video.muted ? ICONES.mudo : ICONES.som;
    som.setAttribute('aria-label', video.muted ? 'Ativar som' : 'Desativar som');
  };

  // Mostra a posição (0 a 1): preenchimento, bolinha (por --cv-pos) e atributos de acessibilidade.
  const mostrarPosicao = (razao, tempo) => {
    preenchimento.style.transform = `scaleX(${razao})`;
    barra.style.setProperty('--cv-pos', String(razao));
    barra.setAttribute('aria-valuenow', String(Math.round(razao * 100)));
    barra.setAttribute('aria-valuetext', `${formatar(tempo)} de ${formatar(video.duration)}`);
  };

  const atualizarProgresso = () => {
    if (arrastando || performance.now() < ignorarAte) return; // não briga com o dedo nem com um pulo em andamento
    const duracao = video.duration;
    const atual = video.currentTime;
    const razao = duracaoConhecida() ? Math.min(1, atual / duracao) : 0;
    mostrarPosicao(razao, atual);
  };

  // Botão central visível por um instante (enquanto o vídeo toca); some de novo sozinho.
  const mostrarControles = () => {
    quadro.classList.add('cv-ativo');
    window.clearTimeout(timer);
    if (tocando()) timer = window.setTimeout(() => quadro.classList.remove('cv-ativo'), TEMPO_VISIVEL);
  };

  const definirTempo = (segundos) => {
    try {
      video.currentTime = Math.max(0, segundos);
    } catch (erro) {
      /* sem metadados: o pulo pendente será refeito quando chegarem */
    }
  };

  const tocar = () => {
    const promessa = video.play();
    if (promessa && promessa.catch) {
      promessa.catch(() => {
        if (!jaIniciou) quadro.classList.remove('iniciado'); // não conseguiu tocar: volta ao estado inicial
      });
    }
  };

  // Aplica os pulos que estavam esperando os metadados (atalho: salta e toca; barra: só salta).
  const aoTerMetadados = () => {
    esperandoMetadados = false;
    if (razaoPendente !== null && duracaoConhecida()) {
      ignorarAte = performance.now() + ESPERA_SALTO;
      definirTempo(razaoPendente * video.duration);
      razaoPendente = null;
    }
    if (tempoPendente !== null) {
      const alvo = tempoPendente;
      tempoPendente = null;
      ignorarAte = performance.now() + ESPERA_SALTO;
      definirTempo(alvo);
      tocar(); // só dá play DEPOIS de definir o instante
    }
  };

  // Pede os metadados (com preload="none" nada foi baixado ainda) e espera o loadedmetadata.
  const pedirMetadados = () => {
    if (esperandoMetadados) return;
    esperandoMetadados = true;
    video.addEventListener('loadedmetadata', aoTerMetadados, { once: true });
    video.preload = 'metadata';
    video.load();
  };

  const iniciar = () => {
    video.volume = 1;
    quadro.classList.add('iniciado');
    tocar();
  };

  // Vai para o instante e toca. Com o vídeo ainda não carregado: pede os metadados, espera, define o instante e só
  // então dá play. Já carregado: pula direto.
  const iniciarEm = (segundos) => {
    video.volume = 1;
    quadro.classList.add('iniciado');
    if (video.readyState >= 1) {
      ignorarAte = performance.now() + ESPERA_SALTO;
      definirTempo(segundos);
      tocar();
    } else {
      tempoPendente = segundos;
      pedirMetadados();
    }
  };

  const alternar = () => {
    if (tocando()) video.pause();
    else iniciar();
  };

  video.addEventListener('playing', () => {
    jaIniciou = true;
  });
  video.addEventListener('play', () => {
    window.clearTimeout(timer);
    quadro.classList.remove('cv-ativo');
    atualizarPlay();
  });
  video.addEventListener('pause', () => {
    window.clearTimeout(timer);
    quadro.classList.remove('cv-ativo');
    atualizarPlay();
  });
  video.addEventListener('ended', () => {
    video.currentTime = 0;
    atualizarPlay();
    atualizarProgresso();
  });
  video.addEventListener('seeked', () => {
    ignorarAte = 0; // o pulo terminou: o tempo informado volta a valer
    atualizarProgresso();
  });
  video.addEventListener('error', () => {
    if (!jaIniciou) quadro.classList.remove('iniciado');
  });
  ['timeupdate', 'loadedmetadata', 'durationchange'].forEach((nome) => video.addEventListener(nome, atualizarProgresso));
  video.addEventListener('volumechange', atualizarSom);

  // Toque no vídeo: se está parado, toca; se está tocando, mostra o botão central (e um novo toque pausa).
  area.addEventListener('click', () => {
    if (!tocando()) iniciar();
    else if (quadro.classList.contains('cv-ativo')) video.pause();
    else mostrarControles();
  });
  play.addEventListener('click', alternar);
  som.addEventListener('click', () => {
    video.muted = !video.muted;
  });

  // ---- Barra de progresso: tocar num ponto pula; arrastar avança ou volta (pointer events: toque e mouse).
  // touch-action: none (CSS) impede que o gesto role a faixa de vídeos ou a página.
  const razaoDoPonteiro = (clientX) => {
    const caixa = faixa.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - caixa.left) / caixa.width));
  };

  const pular = (razao, final) => {
    if (!duracaoConhecida()) {
      // Ainda sem duração (vídeo não carregado): guarda o pedido e carrega os metadados.
      razaoPendente = razao;
      mostrarPosicao(razao, 0);
      pedirMetadados();
      return;
    }
    const alvo = razao * video.duration;
    mostrarPosicao(razao, alvo); // a bolinha acompanha o dedo na hora, sem esperar o vídeo
    const agora = performance.now();
    if (final || agora - ultimoSalto >= INTERVALO_SALTO) {
      ultimoSalto = agora;
      ignorarAte = agora + ESPERA_SALTO;
      definirTempo(alvo);
    }
  };

  let razaoAtual = 0;
  barra.addEventListener('pointerdown', (evento) => {
    if (!evento.isPrimary || (evento.pointerType === 'mouse' && evento.button !== 0)) return;
    arrastando = true;
    quadro.classList.add('cv--arrastando');
    try {
      barra.setPointerCapture(evento.pointerId);
    } catch (erro) {
      /* sem captura: o gesto segue pelo próprio elemento */
    }
    razaoAtual = razaoDoPonteiro(evento.clientX);
    pular(razaoAtual, true); // tocar num ponto já pula para ele
  });
  barra.addEventListener('pointermove', (evento) => {
    if (!arrastando) return;
    razaoAtual = razaoDoPonteiro(evento.clientX);
    pular(razaoAtual, false);
  });
  const soltar = (evento) => {
    if (!arrastando) return;
    arrastando = false;
    quadro.classList.remove('cv--arrastando');
    if (evento && evento.type === 'pointerup') {
      razaoAtual = razaoDoPonteiro(evento.clientX);
      pular(razaoAtual, true); // posição final exata
    }
  };
  barra.addEventListener('pointerup', soltar);
  barra.addEventListener('pointercancel', soltar);
  barra.addEventListener('keydown', (evento) => {
    if (!duracaoConhecida()) return;
    const duracao = video.duration;
    let alvo = null;
    if (evento.key === 'ArrowRight') alvo = video.currentTime + PASSO;
    else if (evento.key === 'ArrowLeft') alvo = video.currentTime - PASSO;
    else if (evento.key === 'Home') alvo = 0;
    else if (evento.key === 'End') alvo = duracao;
    if (alvo === null) return;
    evento.preventDefault();
    alvo = Math.min(duracao, Math.max(0, alvo));
    ignorarAte = performance.now() + ESPERA_SALTO;
    definirTempo(alvo);
    mostrarPosicao(alvo / duracao, alvo);
  });

  atualizarPlay();
  atualizarSom();
  atualizarProgresso();

  // Para quem usa os controles de fora (por exemplo, os atalhos por pergunta da seção Dúvidas): tocar com som,
  // pular para um instante e tocar, alternar play/pause e saber se está tocando.
  return { iniciar, iniciarEm, alternar, tocando };
}
