// Seção 5, parte 2: "Veja de perto". O botão "Ver mais" abre um <dialog> nativo: gaveta que sobe de baixo
// no celular, janela centralizada no PC. Dentro: 3 vídeos 9:16 inteiros, um por vez (scroll-snap), com pontinhos.
// Fecha por X, toque fora, Esc e botão/gesto de voltar. Ao fechar, os vídeos pausam e a página fica onde estava.
// Sem JavaScript, o link "Ver mais" leva à lista de vídeos que fica na própria página.
import './video-unico.js';
import { criarControlesVideo } from './controles-video.js';

const ICONE_FECHAR =
  '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const ICONE_ANTERIOR =
  '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICONE_PROXIMO =
  '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const DURACAO = 320; // maior que a maior transição de saída do CSS (280ms)

const raiz = document.querySelector('.casos');
const suportaDialog =
  typeof HTMLDialogElement === 'function' && typeof HTMLDialogElement.prototype.showModal === 'function';

if (raiz && suportaDialog) {
  const botaoAbrir = raiz.querySelector('.casos__botao--abrir');
  const conteudo = raiz.querySelector('.casos__conteudo');
  const lista = conteudo && conteudo.querySelector('.casos__lista');

  if (botaoAbrir && conteudo && lista) {
    const html = document.documentElement;
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
    const titulo = conteudo.querySelector('.casos__titulo');
    const itens = Array.from(lista.children);
    const videos = Array.from(lista.querySelectorAll('video'));

    // ---- Vídeos: começam no pôster, com "Toque para assistir"; ao tocar, tocam com som. Controles próprios
    // (play/pause central, barra de progresso, som), porque os nativos ficam cortados em vídeos estreitos. ----
    videos.forEach((video) => {
      const quadro = video.closest('.casos__quadro');
      if (!quadro) return;
      criarControlesVideo(video, quadro, {
        rotulo: video.getAttribute('aria-label') || 'vídeo',
        textoToque: raiz.dataset.toque || 'Toque para assistir',
      });
    });

    // ---- Pontinhos (ativo alongado em bordô) ----
    const pontos = document.createElement('div');
    pontos.className = 'casos__pontos';
    pontos.setAttribute('role', 'group');
    pontos.setAttribute('aria-label', 'Escolher vídeo');
    const botoesPonto = itens.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'casos__ponto';
      b.setAttribute('aria-label', `Ir para o vídeo ${i + 1}`);
      b.addEventListener('click', () => irPara(i));
      pontos.appendChild(b);
      return b;
    });

    // ---- Setas anterior/próximo nas laterais do vídeo (no PC são o principal; no celular o deslizar continua) ----
    const palco = document.createElement('div');
    palco.className = 'casos__palco';
    lista.replaceWith(palco);
    palco.appendChild(lista);
    const criarSeta = (classe, rotulo, icone, passo) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `casos__seta ${classe}`;
      b.setAttribute('aria-label', rotulo);
      b.innerHTML = icone;
      b.addEventListener('click', () => irPara(atual + passo));
      palco.appendChild(b);
      return b;
    };
    const setaAnterior = criarSeta('casos__seta--anterior', 'Vídeo anterior', ICONE_ANTERIOR, -1);
    const setaProximo = criarSeta('casos__seta--proximo', 'Próximo vídeo', ICONE_PROXIMO, 1);

    let atual = -1;
    const marcar = (i) => {
      if (i === atual) return;
      botoesPonto.forEach((b, k) => {
        b.classList.toggle('ativo', k === i);
        if (k === i) b.setAttribute('aria-current', 'true');
        else b.removeAttribute('aria-current');
      });
      videos.forEach((v, k) => {
        if (k !== i) v.pause(); // trocou de vídeo: o anterior pausa
      });
      setaAnterior.disabled = i <= 0;
      setaProximo.disabled = i >= itens.length - 1;
      atual = i;
    };
    const irPara = (i) => {
      const alvo = Math.max(0, Math.min(itens.length - 1, i));
      videos.forEach((v, k) => {
        if (k !== alvo) v.pause(); // o anterior pausa já ao tocar na seta, sem esperar a rolagem terminar
      });
      lista.scrollTo({ left: alvo * lista.clientWidth, behavior: reduzido.matches ? 'auto' : 'smooth' });
    };
    let conferindo = false;
    lista.addEventListener(
      'scroll',
      () => {
        if (conferindo) return;
        conferindo = true;
        window.requestAnimationFrame(() => {
          conferindo = false;
          const largura = lista.clientWidth;
          if (!largura) return;
          marcar(Math.max(0, Math.min(itens.length - 1, Math.round(lista.scrollLeft / largura))));
        });
      },
      { passive: true },
    );
    marcar(0);

    // ---- Gaveta (<dialog>) ----
    const dialogo = document.createElement('dialog');
    dialogo.className = 'casos__dialogo';
    if (titulo && titulo.id) dialogo.setAttribute('aria-labelledby', titulo.id);
    const painel = document.createElement('div');
    painel.className = 'casos__painel';
    const botaoFechar = document.createElement('button');
    botaoFechar.type = 'button';
    botaoFechar.className = 'casos__fechar';
    botaoFechar.setAttribute('aria-label', 'Fechar');
    botaoFechar.innerHTML = ICONE_FECHAR;
    // Alça de arrastar (só no celular): a faixa do topo, com o puxador e o título, fecha a gaveta ao puxar para baixo.
    const alca = document.createElement('div');
    alca.className = 'casos__alca';
    alca.setAttribute('aria-hidden', 'true');
    painel.appendChild(alca);
    painel.appendChild(botaoFechar);
    painel.appendChild(conteudo); // o bloco sai da página e passa a viver na gaveta
    painel.tabIndex = -1; // o foco inicial fica no painel (e não no X, que ganharia um anel de foco ao abrir)
    conteudo.appendChild(pontos);
    dialogo.appendChild(painel);
    document.body.appendChild(dialogo);
    raiz.classList.add('casos--ativo'); // mostra o botão e esconde o link

    let aberto = false;
    let timer = 0;
    let timerTrava = 0;

    const pausarTudo = () => videos.forEach((v) => v.pause());

    // Prepara a abertura: quando o botão chega perto da tela, baixa e decodifica os pôsteres dos 3 vídeos. Sem
    // isso, eles seriam baixados e decodificados justo nos primeiros quadros da subida da gaveta (e travavam).
    const posteres = [];
    const prepararPosteres = () => {
      videos.forEach((v) => {
        if (!v.poster) return;
        const imagem = new Image();
        imagem.decoding = 'async';
        imagem.src = v.poster;
        if (imagem.decode) imagem.decode().catch(() => {});
        posteres.push(imagem); // mantém a referência (a imagem decodificada fica em cache)
      });
    };
    if ('IntersectionObserver' in window) {
      const observador = new IntersectionObserver(
        ([entrada]) => {
          if (!entrada.isIntersecting) return;
          prepararPosteres();
          observador.disconnect();
        },
        { rootMargin: '400px 0px' },
      );
      observador.observe(botaoAbrir);
    } else {
      prepararPosteres();
    }

    // A página de trás não rola. Trava DEPOIS da subida da gaveta (e não junto): mudar o overflow da raiz recalcula
    // o layout da página inteira, e fazer isso nos primeiros quadros da animação a deixava travada. Compensa a barra
    // de rolagem para nada pular no PC.
    const travarPagina = () => {
      if (!aberto) return;
      const barra = window.innerWidth - html.clientWidth;
      html.style.paddingRight = barra > 0 ? `${barra}px` : '';
      html.classList.add('casos-aberto');
    };

    const abrir = () => {
      if (aberto) return;
      aberto = true;
      window.clearTimeout(timer);
      window.clearTimeout(timerTrava);
      // Só um vídeo por vez na seção: pausa os depoimentos antes de abrir.
      document.querySelectorAll('video').forEach((v) => v.pause());
      if (reduzido.matches) travarPagina();
      else timerTrava = window.setTimeout(travarPagina, 520);
      try {
        history.pushState({ casos: true }, ''); // o botão/gesto de voltar fecha a gaveta
      } catch (erro) {
        /* sem histórico: fecha pelos outros meios */
      }
      painel.style.transform = ''; // limpa o que um arraste anterior possa ter deixado
      painel.style.transition = '';
      if (!dialogo.open) dialogo.showModal();
      painel.focus({ preventScroll: true });
      botaoAbrir.setAttribute('aria-expanded', 'true');
      if (reduzido.matches) {
        void painel.offsetWidth;
        dialogo.classList.add('aberto');
      } else {
        // Espera 2 quadros: a gaveta já está na tela (quase invisível, com a camada pronta) e só então começa a
        // animar, em vez de rasterizar durante os primeiros quadros da entrada.
        // O temporizador é a rede de segurança: se os quadros não vierem (aba em segundo plano, aparelho muito
        // carregado), a gaveta abre do mesmo jeito em 120ms e nunca fica invisível.
        let iniciada = false;
        const iniciar = () => {
          if (iniciada) return;
          iniciada = true;
          if (aberto) dialogo.classList.add('aberto');
        };
        window.requestAnimationFrame(() => window.requestAnimationFrame(iniciar));
        window.setTimeout(iniciar, 120);
      }
    };

    const fecharVisual = () => {
      if (!aberto) return;
      aberto = false;
      window.clearTimeout(timerTrava);
      pausarTudo();
      dialogo.classList.remove('aberto');
      const terminar = () => {
        if (aberto) return;
        if (dialogo.open) dialogo.close();
        painel.style.transform = '';
        html.classList.remove('casos-aberto');
        html.style.paddingRight = '';
        botaoAbrir.setAttribute('aria-expanded', 'false');
      };
      window.clearTimeout(timer);
      if (reduzido.matches) terminar();
      else timer = window.setTimeout(terminar, DURACAO + 30);
    };

    const fechar = () => {
      if (!aberto) return;
      const comHistorico = history.state && history.state.casos;
      fecharVisual();
      if (comHistorico) history.back(); // desfaz a entrada criada ao abrir; o popstate resultante é ignorado
    };

    // ---- Arrastar para baixo para fechar (celular). A gaveta acompanha o dedo; passando de ~1/6 da altura
    // (ou com um gesto rápido) fecha; senão, volta. Só a alça do topo escuta o gesto: os vídeos seguem deslizando
    // para o lado e a rolagem vertical do resto não é afetada. ----
    let arraste = null;
    const limparArraste = () => {
      painel.style.transition = '';
      painel.style.transform = '';
      dialogo.style.removeProperty('--arraste');
    };
    alca.addEventListener('pointerdown', (evento) => {
      if (!aberto || !evento.isPrimary || (evento.pointerType === 'mouse' && evento.button !== 0)) return;
      arraste = { id: evento.pointerId, y0: evento.clientY, dy: 0, t0: evento.timeStamp, altura: painel.offsetHeight };
      painel.style.transition = 'none';
      try {
        alca.setPointerCapture(evento.pointerId);
      } catch (erro) {
        /* sem captura: o gesto segue pelo próprio elemento */
      }
    });
    alca.addEventListener('pointermove', (evento) => {
      if (!arraste || evento.pointerId !== arraste.id) return;
      arraste.dy = Math.max(0, evento.clientY - arraste.y0); // só para baixo
      painel.style.transform = `translateY(${arraste.dy}px)`;
      dialogo.style.setProperty('--arraste', String(Math.min(1, arraste.dy / arraste.altura)));
    });
    const soltar = (evento) => {
      if (!arraste || evento.pointerId !== arraste.id) return;
      const { dy, t0, altura } = arraste;
      arraste = null;
      const veloz = dy > 30 && dy / Math.max(1, evento.timeStamp - t0) > 0.6; // px por ms
      const fecha = evento.type === 'pointerup' && (dy > altura / 6 || veloz);
      limparArraste(); // a transição leva da posição atual até a de destino
      if (fecha) {
        painel.style.transform = 'translateY(100%)'; // continua descendo a partir de onde o dedo largou
        fechar();
      }
    };
    alca.addEventListener('pointerup', soltar);
    alca.addEventListener('pointercancel', soltar);

    botaoAbrir.addEventListener('click', abrir);
    botaoFechar.addEventListener('click', fechar);
    dialogo.addEventListener('click', (evento) => {
      if (evento.target === dialogo) fechar(); // toque fora da gaveta
    });
    // Setas do teclado (← →) trocam de vídeo enquanto a gaveta está aberta (na barra de progresso, com foco, as
    // setas continuam avançando e voltando o vídeo, como em qualquer controle deslizante).
    dialogo.addEventListener('keydown', (evento) => {
      if (!aberto || (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight')) return;
      if (evento.target instanceof Element && evento.target.closest('[role="slider"]')) return;
      evento.preventDefault();
      irPara(atual + (evento.key === 'ArrowRight' ? 1 : -1));
    });
    dialogo.addEventListener('cancel', (evento) => {
      evento.preventDefault(); // Esc: fecha com a nossa animação
      fechar();
    });
    window.addEventListener('popstate', () => {
      if (aberto) fecharVisual(); // botão/gesto de voltar
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pausarTudo();
    });
  }
}
