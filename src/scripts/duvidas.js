// Seção 7, "Dúvidas": vídeo "Bate-bola com a Gabriela" com controles próprios (controles-video.js) e atalhos por
// pergunta (chips). Ao tocar num chip, o vídeo vai para o momento da pergunta e começa a tocar: se o vídeo ainda não
// foi carregado (preload="none"), o controle pede os metadados, ESPERA o loadedmetadata, define o instante e só então
// dá play; se já está carregado, pula direto (controles.iniciarEm). O chip da pergunta que está passando fica
// destacado (aria-current). Só um vídeo toca por vez na página (video-unico.js) e o vídeo pausa quando sai da tela.
// (O FAQ em texto foi removido da página por decisão do usuário.)
import './video-unico.js';
import { criarControlesVideo } from './controles-video.js';

const secao = document.querySelector('.duvidas');
const video = secao && secao.querySelector('.duvidas__video');
const quadro = secao && secao.querySelector('.duvidas__quadro');
const faixa = secao && secao.querySelector('.duvidas__chips');
const chips = secao ? Array.from(secao.querySelectorAll('.duvidas__chip')) : [];

if (secao && video && quadro && faixa && chips.length) {
  const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
  const controles = criarControlesVideo(video, quadro, {
    rotulo: video.getAttribute('aria-label') || 'vídeo',
    textoToque: secao.dataset.toque || 'Toque para assistir',
  });
  secao.classList.add('duvidas--ativo'); // mostra os chips
  const instantes = chips.map((chip) => Number(chip.dataset.t) || 0);

  let ativo = -1;
  const marcar = (i) => {
    if (i === ativo) return;
    ativo = i;
    chips.forEach((chip, k) => {
      if (k === i) chip.setAttribute('aria-current', 'true');
      else chip.removeAttribute('aria-current');
    });
    // No celular os chips deslizam: traz o destacado para o meio da fileira (só rola a fileira, nunca a página).
    if (i >= 0 && faixa.scrollWidth > faixa.clientWidth + 1) {
      const chip = chips[i];
      const alvo = chip.offsetLeft - (faixa.clientWidth - chip.offsetWidth) / 2;
      faixa.scrollTo({ left: Math.max(0, alvo), behavior: reduzido.matches ? 'auto' : 'smooth' });
    }
  };

  // Depois de tocar num chip, o vídeo ainda pode informar o tempo "antigo" até o pulo terminar: durante esse tempo
  // o destaque fica no chip tocado (e não pisca para outro).
  let travadoAte = 0;

  // A pergunta "que está passando" é a última cujo instante já chegou (com 0,3 s de tolerância na busca).
  // Também calcula o progresso DAQUELE capítulo (do instante dele até o do próximo, ou até o fim do vídeo): a variável
  // --prog (0 a 1) alimenta a barra fina do índice do PC.
  const atualizar = () => {
    if (performance.now() < travadoAte) return;
    const agora = video.currentTime || 0;
    let atual = -1;
    instantes.forEach((t, i) => {
      if (agora >= t - 0.3) atual = i;
    });
    marcar(atual);
    chips.forEach((chip, i) => {
      if (i !== atual) {
        chip.style.removeProperty('--prog');
        return;
      }
      const inicio = instantes[i];
      const fim = i + 1 < instantes.length ? instantes[i + 1] : Number.isFinite(video.duration) ? video.duration : inicio;
      const razao = fim > inicio ? Math.min(1, Math.max(0, (agora - inicio) / (fim - inicio))) : 0;
      chip.style.setProperty('--prog', razao.toFixed(3));
    });
  };
  ['timeupdate', 'seeked', 'loadedmetadata', 'ended', 'emptied'].forEach((nome) => video.addEventListener(nome, atualizar));
  video.addEventListener('seeked', () => {
    travadoAte = 0; // o pulo terminou: o tempo do vídeo volta a mandar no destaque
  });

  chips.forEach((chip, i) => {
    chip.addEventListener('click', () => {
      marcar(i);
      travadoAte = performance.now() + 4000; // dá tempo de carregar os metadados e pular
      controles.iniciarEm(instantes[i]); // pula para o instante (esperando os metadados, se preciso) e toca com som
    });
  });

  // Pausa quando o vídeo sai da tela ou a aba fica em segundo plano.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) video.pause();
      },
      { threshold: 0.2 },
    ).observe(quadro);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause();
  });
}
