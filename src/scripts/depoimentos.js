// Seção 5, parte 1: troca a lista de vídeos (visível sem JavaScript) pelo carrossel em profundidade.
// Só a carta da frente tem o <video>; as de trás mostram só o pôster. Tocar na carta da frente toca o
// vídeo com som (de novo, pausa); tocar numa carta de trás a traz para a frente; arrastar troca de vídeo.
// Sem giro automático. Só um vídeo toca por vez em toda a página (video-unico.js).
import { criarCarrosselProfundidade } from './carrossel-profundidade.js';
import { quandoPerto } from './quando-perto.js';
import { criarControlesVideo } from './controles-video.js';
import './video-unico.js';
import '../styles/controles-video.css';

const secao = document.querySelector('.depoimentos');
const raiz = secao && secao.querySelector('.depoimentos__carrossel');

const ICONE_PLAY =
  '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';

// ---- PC (≥1024px): vídeo em destaque + playlist (mesmo padrão do "Bate-bola"). O vídeo em destaque usa os controles
// próprios do site (play central menor, barra de progresso, som). Clicar num item da playlist troca o vídeo com um fade
// e começa a tocar (com som); clicar no item que já está em destaque toca/pausa. O item em destaque fica em bordô e uma
// barra fina mostra o progresso do vídeo (--prog). Só um vídeo toca por vez (video-unico.js).
const destaque = secao && secao.querySelector('.depoimentos__destaque');
if (secao && raiz && destaque) {
  const consultaPc = window.matchMedia('(min-width: 64rem)');
  const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
  const quadro = destaque.querySelector('.depoimentos__quadro');
  const video = destaque.querySelector('video');
  const faixas = Array.from(secao.querySelectorAll('.depoimentos__faixa'));
  let dados = [];
  try {
    dados = JSON.parse(raiz.dataset.itens || '[]');
  } catch (erro) {
    dados = [];
  }

  if (quadro && video && faixas.length && dados.length === faixas.length) {
    let atual = 0;
    let controles = null;
    let trocando = false;

    const marcar = () => {
      faixas.forEach((faixa, i) => {
        if (i === atual) faixa.setAttribute('aria-current', 'true');
        else {
          faixa.removeAttribute('aria-current');
          faixa.style.removeProperty('--prog');
        }
      });
    };

    const atualizarProgresso = () => {
      const duracao = video.duration;
      const razao = Number.isFinite(duracao) && duracao > 0 ? Math.min(1, video.currentTime / duracao) : 0;
      faixas[atual].style.setProperty('--prog', razao.toFixed(3));
    };

    const trocar = (i) => {
      if (!controles) return;
      if (i === atual) {
        controles.alternar();
        return;
      }
      if (trocando) return;
      trocando = true;
      const aplicar = () => {
        video.pause();
        atual = i;
        const d = dados[i];
        video.setAttribute('aria-label', d.titulo || d.alt || `Vídeo ${i + 1}`);
        video.poster = d.poster;
        video.src = d.src;
        video.load();
        marcar();
        atualizarProgresso();
        quadro.classList.remove('trocando');
        trocando = false;
        controles.iniciar(); // toca com som
      };
      if (reduzido.matches) aplicar();
      else {
        quadro.classList.add('trocando'); // fade out; o vídeo novo entra com fade in
        window.setTimeout(aplicar, 200);
      }
    };

    const preparar = () => {
      if (controles) return;
      controles = criarControlesVideo(video, quadro, { textoToque: 'Clique para assistir' });
      marcar();
      ['timeupdate', 'seeked', 'loadedmetadata', 'durationchange', 'emptied', 'ended'].forEach((nome) =>
        video.addEventListener(nome, atualizarProgresso),
      );
      faixas.forEach((faixa, i) => faixa.addEventListener('click', () => trocar(i)));
      // Pausa se o vídeo sair da tela ou se a aba ficar em segundo plano.
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
    };

    if (consultaPc.matches) preparar();
    consultaPc.addEventListener('change', () => {
      if (consultaPc.matches) preparar();
      else video.pause();
    });
  }
}

if (secao && raiz) {
  const suportado =
    'ResizeObserver' in window &&
    'IntersectionObserver' in window &&
    window.CSS &&
    window.CSS.supports &&
    window.CSS.supports('transform-style', 'preserve-3d');

  let itens = null;
  try {
    itens = JSON.parse(raiz.dataset.itens || 'null');
  } catch (erro) {
    itens = null;
  }

  if (suportado && itens && itens.length) {
    secao.classList.add('depoimentos--interativo');
    // Só monta quando a seção chega perto da tela (900px): não baixa imagens nem gasta CPU antes da hora.
    const montar = () => {
    try {
      const videos = new Map(); // carta -> <video> (só a carta da frente tem um)
      const largo = window.matchMedia('(min-width: 40rem)');

      const anexar = (i, card) => {
        const item = itens[i];
        const video = document.createElement('video');
        video.className = 'depoimentos__video';
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.preload = 'none'; // só baixa quando a pessoa toca
        video.poster = item.poster;
        video.src = item.src;
        video.setAttribute('aria-label', item.alt || `Vídeo ${i + 1}`);

        const play = document.createElement('span');
        play.className = 'depoimentos__play';
        play.setAttribute('aria-hidden', 'true');
        play.innerHTML = ICONE_PLAY;

        video.addEventListener('play', () => card.classList.add('esta-tocando'));
        video.addEventListener('playing', () => card.classList.remove('carregando'));
        video.addEventListener('pause', () => card.classList.remove('esta-tocando', 'carregando'));
        video.addEventListener('ended', () => {
          video.currentTime = 0;
          card.classList.remove('esta-tocando', 'carregando');
        });

        card.appendChild(video);
        card.appendChild(play);
        videos.set(card, video);
      };

      const remover = (i, card) => {
        const video = videos.get(card);
        if (!video) return;
        video.pause();
        video.removeAttribute('src');
        video.load(); // cancela qualquer download em andamento
        video.remove();
        const play = card.querySelector('.depoimentos__play');
        if (play) play.remove();
        card.classList.remove('esta-tocando', 'carregando');
        videos.delete(card);
      };

      // Toque na carta da frente: toca com som; de novo, pausa.
      const alternar = (i, card) => {
        const video = videos.get(card);
        if (!video) return;
        if (video.paused) {
          video.muted = false;
          video.volume = 1;
          card.classList.add('carregando');
          const promessa = video.play();
          if (promessa && promessa.catch) promessa.catch(() => card.classList.remove('carregando'));
        } else {
          video.pause();
        }
      };

      criarCarrosselProfundidade(raiz, itens, {
        aspectRatio: 9 / 16,
        ariaLabel: raiz.dataset.rotulo || 'Vídeos',
        rotuloIr: (i) => `Ir para o vídeo ${i + 1}`,
        rotuloCartao: (i, n) => `Vídeo ${i + 1} de ${n}`,
        rotuloAnterior: 'Vídeo anterior',
        rotuloProximo: 'Próximo vídeo',
        // Em telas largas o leque abre mais; no celular fica mais fechado.
        depth: (r) => (r.width >= 560 ? 240 : 200),
        spread: (r) => (r.width >= 560 ? 96 : 56),
        // Desfoque leve só no PC (no celular pesa): as de trás escurecem pela camada de sombra.
        blur: () => (largo.matches ? 3 : 0),
        aoFocar: anexar,
        aoDesfocar: remover,
        aoCliqueNoFoco: alternar,
      });

      // Pausa se o carrossel sair da tela ou se a aba ficar em segundo plano.
      const pausarTudo = () => videos.forEach((video) => video.pause());
      new IntersectionObserver(
        ([entrada]) => {
          if (!entrada.isIntersecting) pausarTudo();
        },
        { threshold: 0.2 },
      ).observe(raiz);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) pausarTudo();
      });
    } catch (erro) {
      // Qualquer falha: volta para a lista de vídeos.
      secao.classList.remove('depoimentos--interativo');
      raiz.textContent = '';
      raiz.className = 'depoimentos__carrossel';
    }
    };
    quandoPerto(raiz, 900, montar);
  }
}
