// Gera public/_routes.json: diz ao Cloudflare Pages em quais caminhos a função functions/midia/[[caminho]].js roda.
// Só os VÍDEOS (caminhos exatos), para a função não ser chamada para imagens, fontes e páginas (o plano gratuito
// tem limite de chamadas de função). Roda sozinho antes de cada build (script "prebuild" do package.json), então
// um vídeo novo em public/midia entra na lista sem ninguém lembrar de atualizar nada.
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const RAIZ = 'public';
const PASTA = join(RAIZ, 'midia');
const EXTENSOES = new Set(['.mp4', '.mov', '.m4v', '.webm']);

const achar = (pasta) =>
  readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return achar(caminho);
    const ponto = nome.lastIndexOf('.');
    return ponto >= 0 && EXTENSOES.has(nome.slice(ponto).toLowerCase()) ? [caminho] : [];
  });

// Sem a pasta de mídia (por exemplo, no repositório público, que não inclui as fotos e vídeos dos clientes): lista vazia.
const videos = (existsSync(PASTA) ? achar(PASTA) : [])
  .map((caminho) => '/' + relative(RAIZ, caminho).split(sep).join('/'))
  .sort();

if (videos.length > 100) {
  console.error(`gerar-rotas: ${videos.length} vídeos, mas o Cloudflare aceita no máximo 100 regras em _routes.json.`);
  process.exit(1);
}

writeFileSync(join(RAIZ, '_routes.json'), JSON.stringify({ version: 1, include: videos, exclude: [] }, null, 2) + '\n');
console.log(`gerar-rotas: ${videos.length} vídeos em public/_routes.json`);
