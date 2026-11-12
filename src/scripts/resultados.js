// Seção 4: troca a lista de fotos (visível sem JavaScript) pelo carrossel circular 3D.
// Se o navegador não suportar o necessário ou algo falhar, a lista continua visível.
import { criarCarrosselCircular } from './carrossel-circular.js';
import { quandoPerto } from './quando-perto.js';

// O anel precisa de pelo menos CARTOES_MIN cartões para a curva ficar suave: com poucas fotos elas se repetem;
// com 5 ou mais, cada foto aparece uma vez (mais cartões = mais fatias 3D para animar = menos fluido).
// A legenda conta só as fotos originais ("01 / 05").
// No PC (≥1024px) o anel tem 10 cartões (as fotos se repetem do lado de trás do anel, onde ninguém vê): com passos de
// 36° em vez de 72°, as fotos vizinhas ficam ao lado da que está na frente, pouco esticadas, em vez de virarem
// faixas finas nas bordas. O celular continua com 5 cartões.
const CONSULTA_PC = window.matchMedia('(min-width: 64rem)');
const CARTOES_MIN_CELULAR = 5;
const CARTOES_MIN_PC = 10;
const TILES = 6; // fatias por cartão curvo (o padrão do motor é 8): menos elementos, rolagem mais fluida
const GAP = 25; // mesmo vão padrão do carrossel
const CURVA = 0.62; // 1 = totalmente curvo (padrão do panorama); menos que 1 deixa cada cartão mais plano
const ESPACO_LEGENDA = 76; // mesmo valor usado pelo carrossel para reservar a legenda

const secao = document.querySelector('.resultados');
const raiz = secao && secao.querySelector('.resultados__carrossel');

if (secao && raiz) {
  const suportado =
    'IntersectionObserver' in window &&
    'ResizeObserver' in window &&
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
    secao.classList.add('resultados--interativo');
    // Só monta quando a seção chega perto da tela (900px): não baixa imagens nem gasta CPU antes da hora.
    let instancia = null;
    const montar = () => {
    try {
      const PC = CONSULTA_PC.matches;
      const CARTOES_MIN = PC ? CARTOES_MIN_PC : CARTOES_MIN_CELULAR;
      const originais = itens.length;
      // Ordem do anel: foto 1 e depois as outras em ordem INVERSA. No panorama (câmera dentro do anel) o cartão que
      // aparece à direita é o de índice anterior, então, para arrastar o dedo da direita para a esquerda ir de
      // 1/5 para 2/5, 3/5..., o anel é montado de trás para a frente. O contador volta ao número da foto original.
      const ordem = [0];
      for (let i = originais - 1; i >= 1; i--) ordem.push(i);
      const repeticoes = Math.max(1, Math.ceil(CARTOES_MIN / originais));
      const lista = [];
      for (let r = 0; r < repeticoes; r++) ordem.forEach((i) => lista.push(itens[i]));
      const total = lista.length;

      const proporcao = Number(raiz.dataset.proporcao) || 0.8;
      const preset = raiz.dataset.preset || 'panorama';

      // No panorama a câmera fica dentro do anel e as bordas do cartão ficam maiores que o centro.
      // Esse fator depende do raio, que depende da largura do cartão, então resolvemos por aproximações
      // sucessivas para as bordas caberem na altura (mesmas fórmulas do motor, com a curvatura CURVA).
      const fatorDaBorda = (cardW) => {
        const pitch = cardW + GAP;
        const corda = pitch / (2 * Math.sin(Math.PI / Math.max(total, 3)));
        const arco = (Math.max(total, 3) * pitch) / (2 * Math.PI);
        const raio = Math.max(corda + (arco - corda) * CURVA, cardW * 0.6);
        const dobra = raio / CURVA;
        const alfa = Math.min(cardW / (2 * dobra), 1.3);
        return raio / (raio - dobra * (1 - Math.cos(alfa)));
      };

      const larguraDoCartao = (r) => {
        if (preset === 'panorama') {
          const alturaUtil = (r.height - ESPACO_LEGENDA) * 0.92;
          let cardW = alturaUtil * proporcao;
          for (let i = 0; i < 5; i++) cardW = (alturaUtil / fatorDaBorda(cardW)) * proporcao;
          // até 78% da largura: as bordas do cartão ficam dentro da área que a máscara não apaga
          return Math.round(Math.max(180, Math.min(cardW, r.width * 0.78, 420)));
        }
        return Math.round(Math.max(200, Math.min(r.width * 0.86, (r.height - 90) * proporcao, 380)));
      };

      instancia = criarCarrosselCircular(raiz, lista, {
        preset,
        intro: raiz.dataset.intro || 'rise',
        aspectRatio: proporcao,
        curve: CURVA,
        autoplay: raiz.dataset.autoplay || 'step',
        interval: 4,
        captions: true,
        dragGain: 0.8, // o anel anda um pouco menos que o dedo: arraste mais calmo
        limitarGesto: true, // cada gesto avança no máximo 1 foto, e só com um movimento intencional
        iniciarQuandoVisivel: true, // a introdução própria roda quando a pessoa chega nele
        captionTotal: originais,
        captionIndex: (i) => ordem[i % ordem.length],
        tiles: TILES,
        vizinhas: PC ? { escala: 0.72, opacidade: 0.5, desfoque: 2, alcance: 1.5 } : null,
        ariaLabel: raiz.dataset.rotulo || 'Antes e depois',
        cardWidth: larguraDoCartao,
      });
    } catch (erro) {
      // Qualquer falha: volta para a lista de fotos.
      secao.classList.remove('resultados--interativo');
      raiz.textContent = '';
      raiz.className = 'resultados__carrossel';
    }
    };
    quandoPerto(raiz, 900, montar);

    // Se a janela cruzar os 1024px (PC <-> tablet/celular) com o carrossel já montado, refaz o anel na configuração certa
    // (o CSS também muda a largura do quadro nesse ponto).
    const desmontar = () => {
      if (instancia) instancia.destroy();
      instancia = null;
      raiz.textContent = '';
      raiz.className = 'resultados__carrossel';
      ['role', 'aria-roledescription', 'aria-label', 'tabindex', 'data-axis', 'data-shape', 'data-draggable', 'data-vizinhas', 'data-ready', 'data-dragging', 'style'].forEach((a) => raiz.removeAttribute(a));
    };
    CONSULTA_PC.addEventListener('change', () => {
      if (!instancia) return;
      desmontar();
      montar();
    });
  }
}
