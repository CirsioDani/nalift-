# Método NaLift

Site one-page do **Método NaLift**, de **Gabriela Nalin**, enfermeira esteta (Nalin Beauty). Foi feito para ser mostrado num evento de networking e acessado pelo celular, por QR code: precisa encantar em poucos segundos, mesmo com internet fraca.

**Site no ar:** https://metodo-nalift.pages.dev

## Destaques

- **Mobile first.** Cada componente nasce em 375 px e só depois é adaptado para tablet e desktop; o PC tem layouts próprios (vídeo + playlist, blocos em duas colunas), não apenas uma versão esticada.
- **Design autoral.** Paleta bordô e nude, títulos em EB Garamond e textos em Inter (auto-hospedadas, sem Google Fonts), tom elegante e sóbrio. Nada de visual de template.
- **Logo animado como desenho.** O monograma GW é embutido como SVG: o contorno é traçado com `stroke-dashoffset` e, em seguida, o preenchimento aparece. O mesmo efeito reaparece no fechamento da página, disparado quando entra na tela.
- **Fundo de seda.** Fitas em WebP transparente, já desfocadas, que flutuam devagar na abertura. Só `transform` e `opacity` são animados, e a animação pausa fora da tela.
- **Carrosséis em CSS e JavaScript puros, sem React.** Carrossel circular 3D (anel de fotos com arraste, inércia e snap) e carrossel em profundidade (cartas empilhadas em perspectiva), ambos recriados do zero.
- **Vídeos com controles próprios.** Play, barra de progresso arrastável, som e atalhos por capítulo (clicar numa pergunta do vídeo pula para o trecho). Uma Cloudflare Pages Function (`functions/midia/`) devolve respostas parciais (`206`/`Range`), sem as quais o navegador não consegue pular para um ponto ainda não baixado. Só um vídeo toca por vez.
- **Sistema de entrada ao rolar.** Um único mecanismo (`data-reveal`) para todas as seções: mesmo ritmo, uma vez só, só `transform` e `opacity`.
- **Emendas suaves entre as seções.** O fundo alterna entre nude e bege com degradês, sem linhas de corte.
- **Acessibilidade.** Respeita `prefers-reduced-motion`; todo o conteúdo fica visível sem JavaScript; contraste AA; áreas de toque de pelo menos 44 px; navegação por teclado.
- **Performance.** Componentes pesados só são montados quando chegam perto da tela, CSS embutido no HTML e fontes da primeira tela pré-carregadas. Em modo mobile do Lighthouse: Performance 96 a 99, Acessibilidade 100, Boas práticas 100.
- **Mídia otimizada.** De 410 MB para 49 MB: vídeos HEVC convertidos para H.264 com `+faststart` e poster, e fotos em WebP com vários tamanhos.

## Tecnologias

- [Astro](https://astro.build/) (site estático)
- CSS puro, com variáveis
- JavaScript puro, só onde há interação
- [Cloudflare Pages](https://pages.cloudflare.com/) (hospedagem e Pages Function)

## Estrutura de pastas

```
.
├── functions/midia/     Pages Function que atende vídeos com HTTP Range (206)
├── public/              favicon, imagem de compartilhamento, robots.txt, _headers
│   └── midia/           só logo/ e fitas/ (a mídia dos clientes não está no repositório)
├── scripts/             geração de fitas de seda, ícones, imagem Open Graph e rotas
└── src/
    ├── components/      uma seção por componente (Abertura, Método, Resultados, ...)
    ├── content/         textos e dados, separados dos componentes
    ├── layouts/         Base.astro (cabeçalho, fontes, metadados)
    ├── pages/           index.astro (a página única do site)
    ├── scripts/         carrosséis, controles de vídeo, menu, entrada ao rolar
    └── styles/          CSS global e dos carrosséis e controles de vídeo
```

## Como rodar localmente

Requer Node.js 22 ou superior.

```bash
npm install
npm run dev
```

O site abre em `http://localhost:4321`. Para gerar a versão de produção: `npm run build` (a saída vai para `dist/`).

> **Observação sobre a mídia:** a pasta `public/midia/` não está no repositório (exceto o logo e as fitas de seda), porque contém fotos e vídeos de clientes. O site roda e o build funciona, mas as fotos e os vídeos de antes e depois, depoimentos e do consultório não aparecem.

## Créditos

- Desenvolvimento: Daniel
- Cliente: Gabriela Nalin (Nalin Beauty)
