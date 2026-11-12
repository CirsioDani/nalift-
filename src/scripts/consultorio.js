// Seção 8, vídeo do consultório: decorativo. Sem som, em loop e sem controles; toca sozinho SÓ quando está visível na
// tela (IntersectionObserver) e pausa ao sair. Com prefers-reduced-motion mostra só o poster (nunca toca).
// preload="none": o arquivo só começa a baixar quando o vídeo aparece na tela.
const video = document.querySelector('.consultorio__video');

if (video) {
  const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
  video.muted = true; // autoplay só é permitido sem som
  video.loop = true;
  video.playsInline = true;
  let visivel = false;

  const atualizar = () => {
    if (visivel && !reduzido.matches && !document.hidden) {
      const promessa = video.play();
      if (promessa && promessa.catch) promessa.catch(() => {}); // sem permissão: fica no poster
    } else {
      video.pause();
    }
  };

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      ([entrada]) => {
        visivel = entrada.isIntersecting;
        atualizar();
      },
      { threshold: 0.35 },
    ).observe(video);
  }
  document.addEventListener('visibilitychange', atualizar);
  reduzido.addEventListener('change', atualizar);
}
