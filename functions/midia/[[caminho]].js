// Cloudflare Pages Function: suporte a TRECHOS (HTTP Range) para os vídeos de /midia.
//
// Por quê: o Cloudflare Pages serve os arquivos estáticos ignorando o cabeçalho "Range" (responde sempre 200 com o
// arquivo inteiro e sem "Accept-Ranges"). Sem trechos, o navegador não consegue pular para um ponto do vídeo que
// ainda não baixou (os atalhos por pergunta caíam no início e a barra de progresso não avançava) e o Safari do
// iPhone pode nem reproduzir o vídeo. Esta função responde 206 (Partial Content) quando há "Range".
//
// Só é chamada para os vídeos: public/_routes.json é gerado em cada build por scripts/gerar-rotas.mjs, com os
// caminhos exatos de todos os arquivos de vídeo de public/midia (imagens e o resto continuam estáticos, sem função).
// Os vídeos têm no máximo ~7 MB: a função lê o arquivo do armazenamento de assets e devolve só a fatia pedida.
export async function onRequest({ request, env }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return env.ASSETS.fetch(request);
  }

  // Pede o arquivo inteiro aos assets (sem o Range, que eles ignoram).
  const original = await env.ASSETS.fetch(new Request(request.url, { method: 'GET' }));
  if (!original.ok) return original;

  const cabecalhos = new Headers(original.headers);
  cabecalhos.set('Accept-Ranges', 'bytes');
  cabecalhos.set('Cache-Control', 'public, max-age=3600'); // trechos repetidos vêm do cache do navegador

  const pedido = request.headers.get('Range');
  const corpo = await original.arrayBuffer();
  const total = corpo.byteLength;

  // Sem Range: devolve tudo (já anunciando que aceita trechos).
  const m = pedido && /^bytes=(\d*)-(\d*)$/.exec(pedido.trim());
  if (!m || (m[1] === '' && m[2] === '')) {
    cabecalhos.set('Content-Length', String(total));
    return new Response(request.method === 'HEAD' ? null : corpo, { status: 200, headers: cabecalhos });
  }

  let inicio;
  let fim;
  if (m[1] === '') {
    // "bytes=-N": os últimos N bytes
    inicio = Math.max(0, total - Number(m[2]));
    fim = total - 1;
  } else {
    inicio = Number(m[1]);
    fim = m[2] === '' ? total - 1 : Math.min(Number(m[2]), total - 1);
  }

  if (!(inicio < total) || inicio > fim) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${total}`, 'Accept-Ranges': 'bytes' } });
  }

  cabecalhos.set('Content-Range', `bytes ${inicio}-${fim}/${total}`);
  cabecalhos.set('Content-Length', String(fim - inicio + 1));
  return new Response(request.method === 'HEAD' ? null : corpo.slice(inicio, fim + 1), { status: 206, headers: cabecalhos });
}
