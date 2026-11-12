// Adia um trabalho pesado (montar um carrossel 3D, por exemplo) até o elemento estar perto da tela. Ajuda o carregamento
// da página: o que fica lá embaixo não baixa imagens nem gasta CPU antes da hora (importante na internet fraca de
// evento e em celular simples). O contêiner já tem altura fixa pelo CSS, então nada pula quando o conteúdo entra.
// Sem IntersectionObserver, faz na hora.
export function quandoPerto(elemento, margemPx, fazer) {
  if (!('IntersectionObserver' in window)) {
    fazer();
    return;
  }
  const observador = new IntersectionObserver(
    ([entrada]) => {
      if (!entrada.isIntersecting) return;
      observador.disconnect();
      fazer();
    },
    { rootMargin: `${margemPx}px 0px` },
  );
  observador.observe(elemento);
}
