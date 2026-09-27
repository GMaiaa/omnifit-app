import { defineConfig, minimalPreset } from '@vite-pwa/assets-generator/config'

// A fonte (public/favicon.svg) já tem a margem certa embutida (a marca
// ocupa ~72% do quadrado) — sem isso, a ferramenta soma mais 30% de
// preenchimento BRANCO por cima nos ícones maskable/apple, criando uma
// borda branca visível ao redor do fundo escuro do ícone.
export default defineConfig({
  preset: {
    ...minimalPreset,
    maskable: {
      sizes: [512],
      padding: 0,
      resizeOptions: { fit: 'contain', background: 'transparent' },
    },
    apple: {
      sizes: [180],
      padding: 0,
      resizeOptions: { fit: 'contain', background: 'transparent' },
    },
  },
  images: ['public/favicon.svg'],
})
