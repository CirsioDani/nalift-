// Regra do site: só um vídeo toca por vez. Ao começar a tocar, qualquer outro vídeo da página pausa.
// O evento `play` não borbulha, então escutamos na fase de captura do documento (uma única vez).
// EXCEÇÃO: vídeos ambiente (atributo data-ambiente: sem som, em loop, decorativos, como o do consultório) não entram
// na regra: nem pausam os outros ao tocar nem são pausados por eles (quem controla é o próprio script deles, que só
// os toca quando estão visíveis). Sem isso, o vídeo ambiente interromperia um vídeo que a pessoa está assistindo.
if (!window.__videoUnico) {
  window.__videoUnico = true;
  document.addEventListener(
    'play',
    (evento) => {
      const atual = evento.target;
      if (!(atual instanceof HTMLVideoElement) || atual.hasAttribute('data-ambiente')) return;
      document.querySelectorAll('video').forEach((video) => {
        if (video !== atual && !video.paused && !video.hasAttribute('data-ambiente')) video.pause();
      });
    },
    true,
  );
}
