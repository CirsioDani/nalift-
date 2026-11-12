import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  // O CSS vai dentro do HTML (em vez de um arquivo separado que bloqueia a primeira pintura): em 4G ruim, uma
  // requisição a menos antes de aparecer qualquer coisa. O site é uma página só, então não há CSS repetido.
  build: { inlineStylesheets: 'always' },
});
